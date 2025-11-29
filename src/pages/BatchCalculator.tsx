import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Save, History, Users, QrCode, BarChart3, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBatchRecipes } from "@/hooks/useBatchRecipes";
import { useBatchProductions } from "@/hooks/useBatchProductions";
import { useMixologistGroups } from "@/hooks/useMixologistGroups";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

const BatchCalculator = () => {
  const navigate = useNavigate();
  const [recipeName, setRecipeName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml" }
  ]);
  const [targetBatchSize, setTargetBatchSize] = useState("");
  const [targetLiters, setTargetLiters] = useState("");
  const [currentServes, setCurrentServes] = useState("1");
  const [producedByName, setProducedByName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("calculator");
  const [isAILoading, setIsAILoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const { recipes, createRecipe } = useBatchRecipes();
  const { productions, createProduction } = useBatchProductions(selectedRecipeId || undefined);
  const { groups, createGroup } = useMixologistGroups();

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), name: "", amount: "", unit: "ml" }
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const calculateBatch = () => {
    if (!recipeName || (!targetBatchSize && !targetLiters) || !currentServes) {
      return null;
    }

    const multiplier = targetBatchSize 
      ? parseFloat(targetBatchSize) / parseFloat(currentServes)
      : parseFloat(targetLiters) * 1000 / ingredients.reduce((sum, ing) => sum + parseFloat(ing.amount || "0"), 0);

    const scaledIngredients = ingredients.map(ing => ({
      ...ing,
      scaledAmount: (parseFloat(ing.amount) * multiplier).toFixed(2)
    }));

    return { scaledIngredients, multiplier };
  };

  const handleSaveRecipe = async () => {
    if (!recipeName || ingredients.length === 0) {
      toast.error("Please provide recipe name and ingredients");
      return;
    }

    createRecipe({
      recipe_name: recipeName,
      description: batchDescription,
      current_serves: parseFloat(currentServes),
      ingredients: ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit
      }))
    });
  };

  const handleSubmitBatch = async () => {
    const calculation = calculateBatch();
    if (!calculation) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!producedByName) {
      toast.error("Please enter your name");
      return;
    }

    const totalLiters = targetLiters 
      ? parseFloat(targetLiters)
      : calculation.scaledIngredients.reduce((sum, ing) => sum + parseFloat(ing.scaledAmount), 0) / 1000;

    // Generate QR code data
    const qrData = JSON.stringify({
      batchName: recipeName,
      date: new Date().toISOString(),
      liters: totalLiters.toFixed(2),
      producedBy: producedByName,
      ingredients: calculation.scaledIngredients
    });

    const recipeId = selectedRecipeId || `temp-${Date.now()}`;

    createProduction({
      production: {
        recipe_id: recipeId,
        batch_name: recipeName,
        target_serves: parseFloat(targetBatchSize || "0"),
        target_liters: totalLiters,
        production_date: new Date().toISOString(),
        produced_by_name: producedByName,
        qr_code_data: qrData,
        notes: notes
      },
      ingredients: calculation.scaledIngredients.map(ing => ({
        ingredient_name: ing.name,
        original_amount: parseFloat(ing.amount),
        scaled_amount: parseFloat(ing.scaledAmount),
        unit: ing.unit
      }))
    });

    // Reset form after submission
    setProducedByName("");
    setNotes("");
    setTargetBatchSize("");
    setTargetLiters("");
  };

  const handleAISuggestions = async () => {
    if (!recipeName) {
      toast.error("Please enter a recipe name first");
      return;
    }

    setIsAILoading(true);
    try {
      const response = await supabase.functions.invoke('batch-ai-assistant', {
        body: {
          action: 'suggest_ingredients',
          data: { recipeName }
        }
      });

      if (response.data?.result) {
        toast.success("AI suggestions loaded!");
        try {
          const suggested = JSON.parse(response.data.result);
          if (Array.isArray(suggested)) {
            setIngredients(suggested.map((ing: any, idx: number) => ({
              id: `${Date.now()}-${idx}`,
              name: ing.name || "",
              amount: String(ing.amount || ""),
              unit: ing.unit || "ml"
            })));
          }
        } catch (e) {
          toast.error("Could not parse AI suggestions");
        }
      }
    } catch (error) {
      toast.error("Failed to get AI suggestions");
      console.error(error);
    } finally {
      setIsAILoading(false);
    }
  };

  const downloadBatchPDF = async (production: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Batch Production Report", 20, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Batch: ${production.batch_name}`, 20, 35);
    doc.text(`Date: ${new Date(production.production_date).toLocaleDateString()}`, 20, 45);
    doc.text(`Liters Produced: ${production.target_liters} L`, 20, 55);
    doc.text(`Serves: ${production.target_serves}`, 20, 65);
    doc.text(`Produced By: ${production.produced_by_name || 'N/A'}`, 20, 75);
    
    if (production.qr_code_data) {
      const qrCodeDataUrl = await QRCode.toDataURL(production.qr_code_data);
      doc.addImage(qrCodeDataUrl, 'PNG', 20, 85, 50, 50);
      
      doc.setFontSize(10);
      doc.text("Scan QR code for batch details", 20, 140);
    }

    if (production.notes) {
      doc.setFontSize(12);
      doc.text("Notes:", 20, 155);
      doc.setFontSize(10);
      const splitNotes = doc.splitTextToSize(production.notes, 170);
      doc.text(splitNotes, 20, 165);
    }
    
    doc.save(`batch-${production.batch_name}-${Date.now()}.pdf`);
    toast.success("PDF downloaded!");
  };

  const handleCreateGroup = () => {
    if (!newGroupName) {
      toast.error("Please enter a group name");
      return;
    }

    createGroup({
      name: newGroupName,
      description: newGroupDesc
    });

    setNewGroupName("");
    setNewGroupDesc("");
  };

  const batchResults = calculateBatch();
  const totalLiters = batchResults
    ? batchResults.scaledIngredients.reduce((sum, ing) => sum + parseFloat(ing.scaledAmount), 0) / 1000
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Batch Calculator Pro</h1>
            <p className="text-sm text-muted-foreground">AI-powered batch management & forecasting</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <Card className="glass p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recipe Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAISuggestions}
                  disabled={isAILoading}
                  className="glass-hover"
                >
                  {isAILoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  AI Suggest
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Recipe Name *</Label>
                <Input
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g., Negroni, Margarita"
                  className="glass"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="Optional batch description..."
                  className="glass"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Current Serves *</Label>
                  <Input
                    type="number"
                    value={currentServes}
                    onChange={(e) => setCurrentServes(e.target.value)}
                    placeholder="1"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Serves</Label>
                  <Input
                    type="number"
                    value={targetBatchSize}
                    onChange={(e) => setTargetBatchSize(e.target.value)}
                    placeholder="10"
                    className="glass"
                    disabled={!!targetLiters}
                  />
                </div>

                <div className="space-y-2">
                  <Label>OR Target Liters</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={targetLiters}
                    onChange={(e) => setTargetLiters(e.target.value)}
                    placeholder="1.5"
                    className="glass"
                    disabled={!!targetBatchSize}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ingredients *</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addIngredient}
                    className="glass-hover"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex gap-2">
                    <Input
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(ingredient.id, "name", e.target.value)}
                      placeholder="Ingredient name"
                      className="glass flex-1"
                    />
                    <Input
                      type="number"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(ingredient.id, "amount", e.target.value)}
                      placeholder="Amount"
                      className="glass w-24"
                    />
                    <select
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(ingredient.id, "unit", e.target.value)}
                      className="glass rounded-md border border-input bg-background px-3 py-2 text-sm w-24"
                    >
                      <option value="ml">ml</option>
                      <option value="oz">oz</option>
                      <option value="cl">cl</option>
                      <option value="dash">dash</option>
                      <option value="barspoon">tsp</option>
                      <option value="L">L</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(ingredient.id)}
                      disabled={ingredients.length === 1}
                      className="glass-hover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveRecipe} variant="outline" className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Recipe
                </Button>
              </div>
            </Card>

            {batchResults && (
              <Card className="glass p-6 space-y-4">
                <h3 className="font-bold text-lg">Batch Results</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="glass p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-2xl font-bold text-primary">{totalLiters.toFixed(2)} L</p>
                  </div>
                  <div className="glass p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Servings</p>
                    <p className="text-2xl font-bold text-primary">{targetBatchSize || Math.round(totalLiters * 10)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {batchResults.scaledIngredients.map((ing) => (
                    <div key={ing.id} className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="font-medium">{ing.name || "Unnamed"}</span>
                      <span className="text-primary font-bold">
                        {ing.scaledAmount} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 mt-6 pt-6 border-t border-border">
                  <div className="space-y-2">
                    <Label>Produced By (Your Name) *</Label>
                    <Input
                      value={producedByName}
                      onChange={(e) => setProducedByName(e.target.value)}
                      placeholder="Enter your name"
                      className="glass"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Production Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special notes about this batch..."
                      className="glass"
                    />
                  </div>

                  <Button onClick={handleSubmitBatch} className="w-full" size="lg">
                    <QrCode className="w-5 h-5 mr-2" />
                    Submit Batch Production
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="glass p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Production History
                </h3>
              </div>
              
              {!productions || productions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No batch productions recorded yet. Start batching!
                </p>
              ) : (
                <div className="space-y-4">
                  {productions.map((production) => (
                    <Card key={production.id} className="p-4 glass hover:bg-accent/10 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg">{production.batch_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(production.production_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBatchPDF(production)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Liters</p>
                          <p className="font-semibold">{production.target_liters} L</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Serves</p>
                          <p className="font-semibold">{production.target_serves}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Produced By</p>
                          <p className="font-semibold">{production.produced_by_name || 'Unknown'}</p>
                        </div>
                      </div>

                      {production.notes && (
                        <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/20 rounded">
                          {production.notes}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="glass p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Production Analytics & Forecasting</h3>
              </div>
              
              {!productions || productions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Record some batch productions to see analytics and forecasts!
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Batches</p>
                      <p className="text-3xl font-bold text-primary">{productions.length}</p>
                    </div>
                    <div className="glass p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Liters</p>
                      <p className="text-3xl font-bold text-primary">
                        {productions.reduce((sum, p) => sum + p.target_liters, 0).toFixed(1)} L
                      </p>
                    </div>
                  </div>

                  <div className="glass p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Popular Recipes</h4>
                    <div className="space-y-2">
                      {Object.entries(
                        productions.reduce((acc, prod) => {
                          acc[prod.batch_name] = (acc[prod.batch_name] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center">
                          <span className="font-medium">{name}</span>
                          <span className="text-primary">{count} batches</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <Card className="glass p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Mixologist Groups</h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Main Bar Team"
                    className="glass"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Optional group description..."
                    className="glass"
                  />
                </div>

                <Button onClick={handleCreateGroup} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </div>

              {(!groups || groups.length === 0) ? (
                <p className="text-muted-foreground text-center py-4">
                  No groups yet. Create one to collaborate with your team!
                </p>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold">Your Groups</h4>
                  {groups.map((group) => (
                    <Card key={group.id} className="p-4 glass">
                      <h5 className="font-bold">{group.name}</h5>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Users className="w-4 h-4 mr-2" />
                          Manage Members
                        </Button>
                        <Button size="sm" variant="outline">
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default BatchCalculator;