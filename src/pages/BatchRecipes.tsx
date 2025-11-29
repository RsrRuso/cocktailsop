import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Save, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { useBatchRecipes } from "@/hooks/useBatchRecipes";
import { supabase } from "@/integrations/supabase/client";
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

const BatchRecipes = () => {
  const navigate = useNavigate();
  const [recipeName, setRecipeName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml" }
  ]);
  const [currentServes, setCurrentServes] = useState("1");
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  const { recipes, createRecipe, updateRecipe, deleteRecipe } = useBatchRecipes();

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

  const handleSaveRecipe = async () => {
    if (!recipeName || ingredients.length === 0) {
      toast.error("Please provide recipe name and ingredients");
      return;
    }

    if (editingRecipeId) {
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

    // Reset form
    setRecipeName("");
    setBatchDescription("");
    setCurrentServes("1");
    setIngredients([{ id: "1", name: "", amount: "", unit: "ml" }]);
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
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      deleteRecipe(recipeId);
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setRecipeName("");
    setBatchDescription("");
    setCurrentServes("1");
    setIngredients([{ id: "1", name: "", amount: "", unit: "ml" }]);
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

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/batch-calculator")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Batch Recipes</h1>
            <p className="text-sm text-muted-foreground">Create and manage your recipes</p>
          </div>
        </div>

        {/* Recipe Creation Form */}
        <Card className="glass p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingRecipeId ? "Edit Recipe" : "Create New Recipe"}
            </h3>
            {editingRecipeId && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipe Name *</Label>
              <Input
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="e.g., Mojito Batch"
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                placeholder="Optional description"
                className="glass min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Base Serving Size</Label>
              <Input
                type="number"
                value={currentServes}
                onChange={(e) => setCurrentServes(e.target.value)}
                placeholder="1"
                className="glass"
              />
              <p className="text-xs text-muted-foreground">
                Number of servings this recipe makes
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ingredients *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAISuggestions}
                  disabled={isAILoading || !recipeName}
                  className="glass-hover"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isAILoading ? "Getting AI..." : "AI Suggest"}
                </Button>
              </div>

              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="flex gap-2">
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(ingredient.id, "name", e.target.value)}
                    className="glass flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={ingredient.amount}
                    onChange={(e) => updateIngredient(ingredient.id, "amount", e.target.value)}
                    className="glass w-24"
                  />
                  <Select
                    value={ingredient.unit}
                    onValueChange={(value) => updateIngredient(ingredient.id, "unit", value)}
                  >
                    <SelectTrigger className="glass w-24 bg-background/80 backdrop-blur-sm z-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-sm z-[100]">
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="dash">dash</SelectItem>
                      <SelectItem value="piece">piece</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
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

              <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full glass-hover"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            <Button onClick={handleSaveRecipe} className="w-full" size="lg">
              <Save className="w-5 h-5 mr-2" />
              {editingRecipeId ? "Update Recipe" : "Save Recipe"}
            </Button>
          </div>
        </Card>

        {/* Saved Recipes */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Saved Recipes</h3>
          {recipes && recipes.length > 0 ? (
            <div className="grid gap-4">
              {recipes.map((recipe) => (
                <Card key={recipe.id} className="glass p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{recipe.recipe_name}</h4>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Base: {recipe.current_serves} serving(s) • {Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0} ingredients
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRecipe(recipe)}
                        className="glass-hover"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="glass-hover text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass p-8 text-center">
              <p className="text-muted-foreground">No recipes saved yet</p>
            </Card>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default BatchRecipes;
