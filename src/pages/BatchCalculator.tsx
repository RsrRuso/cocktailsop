import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Save, History, Users, QrCode, BarChart3, Download, Loader2, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { useBatchRecipes } from "@/hooks/useBatchRecipes";
import { useBatchProductions } from "@/hooks/useBatchProductions";
import { useMixologistGroups } from "@/hooks/useMixologistGroups";
import { MixologistGroupMembersDialog } from "@/components/MixologistGroupMembersDialog";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

const BatchCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipeName, setRecipeName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml" }
  ]);
  const [targetBatchSize, setTargetBatchSize] = useState("");
  const [targetLiters, setTargetLiters] = useState("");
  const [currentServes, setCurrentServes] = useState("1");
  const [producedByName, setProducedByName] = useState("");
  const [producedByUserId, setProducedByUserId] = useState<string>(user?.id || "");
  const [notes, setNotes] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("calculator");
  const [isAILoading, setIsAILoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [producerProfiles, setProducerProfiles] = useState<Map<string, any>>(new Map());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [managingGroup, setManagingGroup] = useState<any>(null);

  const { recipes, createRecipe, updateRecipe, deleteRecipe } = useBatchRecipes();
  const { productions, createProduction } = useBatchProductions(selectedRecipeId || undefined);
  const { groups, createGroup } = useMixologistGroups();

  // Set default producer to current user
  useEffect(() => {
    if (user?.id && !producedByUserId) {
      setProducedByUserId(user.id);
    }
  }, [user]);

  // Fetch registered users (followers/followings for selection)
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .order('username');

      if (data && !error) {
        setRegisteredUsers(data);
      }
    };

    fetchUsers();
  }, []);

  // Fetch producer profiles for display
  useEffect(() => {
    if (!productions || productions.length === 0) return;

    const fetchProducerProfiles = async () => {
      const userIds = productions
        .map(p => p.produced_by_user_id)
        .filter(Boolean);

      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (data && !error) {
        const profileMap = new Map();
        data.forEach(profile => {
          profileMap.set(profile.id, profile);
        });
        setProducerProfiles(profileMap);
      }
    };

    fetchProducerProfiles();
  }, [productions]);

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

    if (editingRecipeId) {
      // Update existing recipe
      updateRecipe({
        id: editingRecipeId,
        updates: {
          recipe_name: recipeName,
          description: batchDescription,
          current_serves: parseFloat(currentServes),
          ingredients: ingredients.map(ing => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit
          }))
        }
      });
      setEditingRecipeId(null);
    } else {
      // Create new recipe
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
    }
  };

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(recipe.recipe_name);
    setBatchDescription(recipe.description || "");
    setCurrentServes(String(recipe.current_serves));
    setIngredients(Array.isArray(recipe.ingredients) 
      ? recipe.ingredients.map((ing: any) => ({
          id: ing.id || `${Date.now()}-${Math.random()}`,
          name: ing.name || "",
          amount: String(ing.amount || ""),
          unit: ing.unit || "ml"
        }))
      : [{ id: "1", name: "", amount: "", unit: "ml" }]
    );
    setActiveTab("calculator");
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipe(recipeId);
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setRecipeName("");
    setBatchDescription("");
    setCurrentServes("1");
    setIngredients([{ id: "1", name: "", amount: "", unit: "ml" }]);
  };

  const handleSubmitBatch = async () => {
    const calculation = calculateBatch();
    if (!calculation) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!producedByUserId) {
      toast.error("Please select who produced this batch");
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

    const selectedUser = registeredUsers.find(u => u.id === producedByUserId);

    createProduction({
      production: {
        recipe_id: recipeId,
        batch_name: recipeName,
        target_serves: parseFloat(targetBatchSize || "0"),
        target_liters: totalLiters,
        production_date: new Date().toISOString(),
        produced_by_name: selectedUser ? selectedUser.full_name || selectedUser.username : producedByName,
        produced_by_email: selectedUser ? null : null,
        produced_by_user_id: producedByUserId,
        qr_code_data: qrData,
        notes: notes,
        group_id: selectedGroupId
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
    setProducedByUserId("");
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
        try {
          // Extract JSON from AI response (handles markdown code blocks)
          let jsonText = response.data.result;
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
          
          const suggested = JSON.parse(jsonText);
          if (Array.isArray(suggested) && suggested.length > 0) {
            setIngredients(suggested.map((ing: any, idx: number) => ({
              id: `${Date.now()}-${idx}`,
              name: ing.name || "",
              amount: String(ing.amount || ""),
              unit: ing.unit || "ml"
            })));
            toast.success("AI suggestions loaded!");
          } else {
            toast.error("No ingredients suggested");
          }
        } catch (e) {
          console.error("Parse error:", e, "Response:", response.data.result);
          toast.error("Could not parse AI suggestions");
        }
      } else if (response.error) {
        toast.error(response.error.message || "Failed to get AI suggestions");
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

  const handleCreateGroup = async () => {
    if (!newGroupName) {
      toast.error("Please enter a group name");
      return;
    }

    // Generate QR code for batch submissions
    const groupData = {
      name: newGroupName,
      description: newGroupDesc,
      action: 'submit_batch'
    };
    const submissionQRCode = await QRCode.toDataURL(JSON.stringify(groupData));

    createGroup({
      name: newGroupName,
      description: newGroupDesc
    });

    setNewGroupName("");
    setNewGroupDesc("");
  };

  const generateGroupQRCode = async (group: any) => {
    const qrData = JSON.stringify({
      groupId: group.id,
      groupName: group.name,
      action: 'submit_batch'
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    
    // Download QR code
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `${group.name}-submission-qr.png`;
    link.click();
    toast.success("QR code downloaded!");
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
                <h3 className="text-lg font-semibold">Quick Production</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/batch-recipes")}
                  className="glass-hover"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Recipe
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Saved Recipe *</Label>
                  <Select 
                    value={selectedRecipeId || ""} 
                    onValueChange={(value) => {
                      setSelectedRecipeId(value);
                      const recipe = recipes?.find(r => r.id === value);
                      if (recipe) {
                        setRecipeName(recipe.recipe_name);
                        setBatchDescription(recipe.description || "");
                        setCurrentServes(String(recipe.current_serves));
                        setIngredients(Array.isArray(recipe.ingredients) 
                          ? recipe.ingredients.map((ing: any) => ({
                              id: ing.id || `${Date.now()}-${Math.random()}`,
                              name: ing.name || "",
                              amount: String(ing.amount || ""),
                              unit: ing.unit || "ml"
                            }))
                          : [{ id: "1", name: "", amount: "", unit: "ml" }]
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="glass bg-background/80 backdrop-blur-sm">
                      <SelectValue placeholder="Choose a saved recipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-sm z-[100]">
                      {recipes && recipes.length > 0 ? (
                        recipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.recipe_name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          No recipes yet. Create one first!
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRecipeId && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Target Liters *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={targetLiters}
                          onChange={(e) => {
                            setTargetLiters(e.target.value);
                            setTargetBatchSize("");
                          }}
                          placeholder="e.g., 1.5"
                          className="glass"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter desired liters to produce
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Produced By *</Label>
                        <Select value={producedByUserId} onValueChange={setProducedByUserId}>
                          <SelectTrigger className="glass bg-background/80 backdrop-blur-sm z-50">
                            <SelectValue placeholder="Select producer" />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-sm z-[100]">
                            {registeredUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  {user.full_name || user.username}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {batchResults && targetLiters && (
                      <div className="glass p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Multiplied Ingredients</h4>
                          <span className="text-sm text-primary font-bold">
                            {totalLiters.toFixed(2)} L total
                          </span>
                        </div>
                        <div className="space-y-2">
                          {batchResults.scaledIngredients.map((ing) => (
                            <div key={ing.id} className="flex justify-between items-center py-2 border-b border-border/50">
                              <span className="font-medium">{ing.name}</span>
                              <span className="text-primary font-bold">
                                {ing.scaledAmount} {ing.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add production notes..."
                         className="glass"
                      />
                    </div>

                    <Button 
                      onClick={handleSubmitBatch} 
                      className="w-full"
                      size="lg"
                      disabled={!targetLiters || !producedByUserId}
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      Submit & Generate QR Code
                    </Button>
                  </>
                )}
              </div>
            </Card>
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
                          {production.produced_by_user_id && producerProfiles.has(production.produced_by_user_id) ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={producerProfiles.get(production.produced_by_user_id).avatar_url || ''} />
                                <AvatarFallback>
                                  {(producerProfiles.get(production.produced_by_user_id).full_name || 
                                    producerProfiles.get(production.produced_by_user_id).username || '?')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold">
                                {producerProfiles.get(production.produced_by_user_id).full_name || 
                                 producerProfiles.get(production.produced_by_user_id).username}
                              </span>
                            </div>
                          ) : (
                            <p className="font-semibold">{production.produced_by_name || 'Unknown'}</p>
                          )}
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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-bold">{group.name}</h5>
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setManagingGroup(group);
                              setShowMembersDialog(true);
                            }}
                            className="glass-hover"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                          onClick={() => setSelectedGroupId(group.id)}
                            className={selectedGroupId === group.id ? "bg-primary text-primary-foreground" : "glass-hover"}
                          >
                            {selectedGroupId === group.id ? "Selected" : "Select"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {managingGroup && (
        <MixologistGroupMembersDialog
          open={showMembersDialog}
          onOpenChange={setShowMembersDialog}
          groupId={managingGroup.id}
          groupName={managingGroup.name}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default BatchCalculator;