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
  Layers,
  ListOrdered
} from "lucide-react";
import { toast } from "sonner";
import { useSubRecipes, SubRecipeIngredient, SubRecipe, SubRecipePrepStep } from "@/hooks/useSubRecipes";
import { useMixologistGroups } from "@/hooks/useMixologistGroups";
import { useMasterSpirits } from "@/hooks/useMasterSpirits";
import { motion, AnimatePresence } from "framer-motion";
import { PrepStepsEditor, PrepStepsDisplay, PrepStep } from "@/components/batch/PrepStepsEditor";
import { IngredientCombobox } from "@/components/yield/IngredientCombobox";

const SubRecipes = () => {
  const navigate = useNavigate();
  const { groups } = useMixologistGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { subRecipes, depletions, isLoading, createSubRecipe, updateSubRecipe, deleteSubRecipe, calculateBreakdown, getTotalDepletion } = useSubRecipes(selectedGroupId);
  const { spirits } = useMasterSpirits();
  
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
  const [prepSteps, setPrepSteps] = useState<PrepStep[]>([]);

  const filteredRecipes = subRecipes?.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const resetForm = () => {
    setFormData({ name: "", description: "", total_yield_ml: 1000 });
    setIngredients([{ id: "1", name: "", amount: 0, unit: "ml" }]);
    setPrepSteps([]);
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
      setPrepSteps(recipe.prep_steps || []);
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

    const validSteps = prepSteps.filter(step => step.description.trim());

    const recipeData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      total_yield_ml: formData.total_yield_ml,
      ingredients: validIngredients,
      prep_steps: validSteps,
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

      <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/batch-calculator")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gradient-primary flex items-center gap-2 truncate">
                <Layers className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                Sub-Recipes
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Create pre-made mixes to use as ingredients
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-1.5 shrink-0 text-xs sm:text-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Sub-Recipe</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Group Selector */}
        {groups && groups.length > 0 && (
          <Select value={selectedGroupId || "personal"} onValueChange={(v) => setSelectedGroupId(v === "personal" ? null : v)}>
            <SelectTrigger className="w-full max-w-xs text-sm">
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
            className="pl-10 text-sm"
          />
        </div>

        {/* Calculator Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Proportion Calculator
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Calculate ingredient breakdown for any amount of sub-recipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Select Sub-Recipe</Label>
                <Select value={calculatorRecipeId || ""} onValueChange={setCalculatorRecipeId}>
                  <SelectTrigger className="text-sm">
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
                <Label className="text-xs sm:text-sm">Amount Needed (ml)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={calculatorAmount}
                  onChange={(e) => setCalculatorAmount(e.target.value)}
                  className="text-sm"
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
                  <div className="p-3 sm:p-4 bg-card rounded-lg border">
                    <div className="flex justify-between items-center mb-3 gap-2">
                      <span className="font-medium text-sm sm:text-base truncate">{calculatorRecipe.name}</span>
                      <Badge variant="outline" className="shrink-0 text-xs">{calculatorAmount}ml needed</Badge>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      {calculatorResult.map((ing, i) => (
                        <div key={i} className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground truncate">{ing.name}</span>
                          <span className="font-medium shrink-0 ml-2">{ing.scaled_amount} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Prep Steps Display */}
                    {calculatorRecipe.prep_steps && calculatorRecipe.prep_steps.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ListOrdered className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">Preparation Steps:</span>
                        </div>
                        <div className="space-y-2">
                          {calculatorRecipe.prep_steps.map((step) => (
                            <div key={step.id} className="flex gap-2 items-start text-xs sm:text-sm">
                              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                {step.step_number}
                              </span>
                              <p className="text-muted-foreground flex-1">{step.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t text-[10px] sm:text-xs text-muted-foreground">
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
            {filteredRecipes.map((recipe) => {
              const totalUsed = getTotalDepletion(recipe.id);
              const usagePercent = totalUsed > 0 ? Math.min((totalUsed / recipe.total_yield_ml) * 100, 100) : 0;
              const getUsageStatus = () => {
                if (usagePercent >= 75) return { color: 'text-red-500', label: 'High Usage', bg: 'bg-red-500/10', border: 'border-red-500/20' };
                if (usagePercent >= 40) return { color: 'text-yellow-500', label: 'Medium', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
                return { color: 'text-green-500', label: 'Available', bg: 'bg-green-500/10', border: 'border-green-500/20' };
              };
              const status = getUsageStatus();
              
              return (
                <Card key={recipe.id} className={`glass border ${status.border}`}>
                  <CardContent className="pt-4 sm:pt-6">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Beaker className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          </div>
                          <h4 className="font-semibold text-base sm:text-lg truncate">{recipe.name}</h4>
                          <Badge variant="outline" className="text-xs shrink-0">
                            Sub-Recipe
                          </Badge>
                        </div>
                        {recipe.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                            {recipe.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xl sm:text-2xl font-bold ${status.color}`}>
                          {recipe.total_yield_ml}ml
                        </div>
                        <span className="text-xs text-muted-foreground">Total Yield</span>
                      </div>
                    </div>

                    {/* Ingredients List */}
                    <div className="bg-muted/30 rounded-lg p-2 sm:p-3 space-y-1 mb-3">
                      <span className="text-xs font-medium text-muted-foreground">Ingredients ({recipe.ingredients.length}):</span>
                      {recipe.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex justify-between text-xs sm:text-sm py-0.5">
                          <span className="truncate">{ing.name}</span>
                          <span className="font-medium shrink-0 ml-2">{ing.amount} {ing.unit}</span>
                        </div>
                      ))}
                    </div>

                    {/* Prep Steps Preview */}
                    {recipe.prep_steps && recipe.prep_steps.length > 0 && (
                      <div className="bg-primary/5 rounded-lg p-2 sm:p-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ListOrdered className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {recipe.prep_steps.length} Prep Step{recipe.prep_steps.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {recipe.prep_steps[0]?.description}
                          {recipe.prep_steps.length > 1 && ` (+${recipe.prep_steps.length - 1} more)`}
                        </div>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-muted-foreground">Ingredients:</span>
                        <div className="font-medium">{recipe.ingredients.length} items</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Per Ingredient:</span>
                        <div className="font-medium">
                          ~{(recipe.total_yield_ml / Math.max(recipe.ingredients.length, 1)).toFixed(0)}ml avg
                        </div>
                      </div>
                    </div>

                    {/* Usage Tracking */}
                    {totalUsed > 0 && (
                      <div className="pt-2 sm:pt-3 border-t border-border/50 mt-2 sm:mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium">Usage Tracking:</span>
                          <span className="text-xs sm:text-sm font-bold text-orange-500">
                            {totalUsed.toFixed(0)}ml used
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-orange-500 h-1.5 rounded-full transition-all" 
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          {usagePercent.toFixed(0)}% of total yield used in batch productions
                        </p>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${status.bg} mt-2`}>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 sm:pt-3 mt-2 border-t border-border/50">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1.5 text-xs sm:text-sm"
                        onClick={() => {
                          setCalculatorRecipeId(recipe.id);
                          setCalculatorAmount(recipe.total_yield_ml.toString());
                        }}
                      >
                        <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Calculate</span>
                        <span className="sm:hidden">Calc</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1.5 text-xs sm:text-sm"
                        onClick={() => handleOpenDialog(recipe)}
                      >
                        <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleDelete(recipe.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog - Mobile Optimized */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] p-4 sm:p-6 overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">
              {editingId ? "Edit Sub-Recipe" : "Create Sub-Recipe"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Create a pre-made mix for cocktails
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Recipe Name */}
            <div className="space-y-1">
              <Label className="text-sm">Recipe Name *</Label>
              <Input
                placeholder="e.g., Bloody Mary Mix"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Total Yield */}
            <div className="space-y-1">
              <Label className="text-sm">Total Yield (ml)</Label>
              <Input
                type="number"
                placeholder="1000"
                value={formData.total_yield_ml}
                onChange={(e) => setFormData({ ...formData, total_yield_ml: parseFloat(e.target.value) || 0 })}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                The total volume this recipe produces
              </p>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addIngredient} className="h-8 px-3">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {ingredients.map((ing) => (
                <div key={ing.id} className="bg-muted/30 rounded-lg p-3 space-y-2">
                  {/* Ingredient Name - Full Width */}
                  <div className="w-full">
                    <IngredientCombobox
                      spirits={spirits}
                      value={ing.name}
                      onValueChange={(value) => updateIngredient(ing.id, "name", value)}
                    />
                  </div>
                  {/* Amount & Unit Row */}
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={ing.amount || ""}
                        onChange={(e) => updateIngredient(ing.id, "amount", parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div className="w-20">
                      <Select value={ing.unit} onValueChange={(v) => updateIngredient(ing.id, "unit", v)}>
                        <SelectTrigger className="h-9">
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
                      className="h-9 w-9 shrink-0"
                      onClick={() => removeIngredient(ing.id)}
                      disabled={ingredients.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Prep Steps Section */}
            <PrepStepsEditor
              steps={prepSteps}
              onStepsChange={setPrepSteps}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t mt-2">
            <Button 
              onClick={handleSave} 
              className="w-full sm:w-auto order-1 sm:order-2 bg-primary hover:bg-primary/90"
            >
              {editingId ? "Update" : "Create"} Sub-Recipe
            </Button>
            <Button 
              variant="outline" 
              onClick={resetForm}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SubRecipes;
