import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit2, 
  Beaker, 
  Calculator, 
  Search,
  ChevronDown,
  ChevronUp,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { useSubRecipes, SubRecipeIngredient, SubRecipe } from "@/hooks/useSubRecipes";
import { useMixologistGroups } from "@/hooks/useMixologistGroups";
import { motion, AnimatePresence } from "framer-motion";

const SubRecipes = () => {
  const navigate = useNavigate();
  const { groups } = useMixologistGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { subRecipes, isLoading, createSubRecipe, updateSubRecipe, deleteSubRecipe, calculateBreakdown } = useSubRecipes(selectedGroupId);
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [calculatorRecipeId, setCalculatorRecipeId] = useState<string | null>(null);
  const [calculatorAmount, setCalculatorAmount] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_yield_ml: 1000,
  });
  const [ingredients, setIngredients] = useState<SubRecipeIngredient[]>([
    { id: "1", name: "", amount: 0, unit: "ml" }
  ]);

  const filteredRecipes = subRecipes?.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const resetForm = () => {
    setFormData({ name: "", description: "", total_yield_ml: 1000 });
    setIngredients([{ id: "1", name: "", amount: 0, unit: "ml" }]);
    setEditingId(null);
    setShowDialog(false);
  };

  const handleOpenDialog = (recipe?: SubRecipe) => {
    if (recipe) {
      setEditingId(recipe.id);
      setFormData({
        name: recipe.name,
        description: recipe.description || "",
        total_yield_ml: recipe.total_yield_ml,
      });
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ id: "1", name: "", amount: 0, unit: "ml" }]);
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Date.now().toString(), name: "", amount: 0, unit: "ml" }]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof SubRecipeIngredient, value: any) => {
    setIngredients(ingredients.map(ing =>
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a recipe name");
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.name.trim() && ing.amount > 0);
    if (validIngredients.length === 0) {
      toast.error("Please add at least one ingredient with amount");
      return;
    }

    const recipeData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      total_yield_ml: formData.total_yield_ml,
      ingredients: validIngredients,
      group_id: selectedGroupId,
    };

    if (editingId) {
      updateSubRecipe({ id: editingId, updates: recipeData });
    } else {
      createSubRecipe(recipeData);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this sub-recipe?")) {
      deleteSubRecipe(id);
    }
  };

  const getCalculatorResult = () => {
    if (!calculatorRecipeId || !calculatorAmount) return null;
    const recipe = subRecipes?.find(r => r.id === calculatorRecipeId);
    if (!recipe) return null;
    return calculateBreakdown(recipe, parseFloat(calculatorAmount));
  };

  const calculatorResult = getCalculatorResult();
  const calculatorRecipe = subRecipes?.find(r => r.id === calculatorRecipeId);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/batch-calculator")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary flex items-center gap-2">
                <Layers className="h-6 w-6" />
                Sub-Recipes
              </h1>
              <p className="text-sm text-muted-foreground">
                Create pre-made mixes to use as ingredients
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            New Sub-Recipe
          </Button>
        </div>

        {/* Group Selector */}
        {groups && groups.length > 0 && (
          <Select value={selectedGroupId || "personal"} onValueChange={(v) => setSelectedGroupId(v === "personal" ? null : v)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">Personal Recipes</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sub-recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Calculator Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Proportion Calculator
            </CardTitle>
            <CardDescription>
              Calculate ingredient breakdown for any amount of sub-recipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Select Sub-Recipe</Label>
                <Select value={calculatorRecipeId || ""} onValueChange={setCalculatorRecipeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose recipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {subRecipes?.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount Needed (ml)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={calculatorAmount}
                  onChange={(e) => setCalculatorAmount(e.target.value)}
                />
              </div>
            </div>

            <AnimatePresence>
              {calculatorResult && calculatorRecipe && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="p-4 bg-card rounded-lg border">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium">{calculatorRecipe.name}</span>
                      <Badge variant="outline">{calculatorAmount}ml needed</Badge>
                    </div>
                    <div className="space-y-2">
                      {calculatorResult.map((ing, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{ing.name}</span>
                          <span className="font-medium">{ing.scaled_amount} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      Based on {calculatorRecipe.total_yield_ml}ml total yield
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Recipes List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading sub-recipes...
          </div>
        ) : filteredRecipes.length === 0 ? (
          <Card className="p-8 text-center">
            <Beaker className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Sub-Recipes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create pre-made mixes like Bloody Mary Mix, Syrups, or Infusions
            </p>
            <Button onClick={() => handleOpenDialog()} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create First Sub-Recipe
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden">
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Beaker className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{recipe.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {recipe.ingredients.length} ingredients • {recipe.total_yield_ml}ml yield
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); handleOpenDialog(recipe); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {expandedId === recipe.id ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === recipe.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t bg-muted/30"
                    >
                      <div className="p-4 space-y-2">
                        {recipe.description && (
                          <p className="text-sm text-muted-foreground mb-3">{recipe.description}</p>
                        )}
                        <div className="text-sm font-medium mb-2">Ingredients:</div>
                        {recipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex justify-between text-sm py-1">
                            <span>{ing.name}</span>
                            <span className="font-medium">{ing.amount} {ing.unit}</span>
                          </div>
                        ))}
                        <div className="pt-3 mt-3 border-t flex justify-between">
                          <span className="font-medium">Total Yield</span>
                          <span className="font-bold text-primary">{recipe.total_yield_ml} ml</span>
                        </div>
                        <Badge variant="secondary" className="mt-2">
                          Added to Master Spirits
                        </Badge>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Sub-Recipe" : "Create Sub-Recipe"}
            </DialogTitle>
            <DialogDescription>
              Create a pre-made mix that can be used as an ingredient in cocktails
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Recipe Name *</Label>
              <Input
                placeholder="e.g., Bloody Mary Mix"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label>Total Yield (ml)</Label>
              <Input
                type="number"
                placeholder="1000"
                value={formData.total_yield_ml}
                onChange={(e) => setFormData({ ...formData, total_yield_ml: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The total volume this recipe produces
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {ingredients.map((ing, index) => (
                <div key={ing.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Amt"
                      value={ing.amount || ""}
                      onChange={(e) => updateIngredient(ing.id, "amount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-20">
                    <Select value={ing.unit} onValueChange={(v) => updateIngredient(ing.id, "unit", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="dash">dash</SelectItem>
                        <SelectItem value="drops">drops</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(ing.id)}
                    disabled={ingredients.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Update" : "Create"} Sub-Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SubRecipes;
