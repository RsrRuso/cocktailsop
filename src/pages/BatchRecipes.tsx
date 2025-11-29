import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Save, Edit2, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { useBatchRecipes } from "@/hooks/useBatchRecipes";
import { useMasterSpirits } from "@/hooks/useMasterSpirits";
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
  bottle_size_ml?: number;
}

const BatchRecipes = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recipeName, setRecipeName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml" },
  ]);
  const [currentServes, setCurrentServes] = useState("1");
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [masterList, setMasterList] = useState("");
  const [showMasterList, setShowMasterList] = useState(false);

  const { recipes, createRecipe, updateRecipe, deleteRecipe } = useBatchRecipes();
  const { spirits, calculateBottles } = useMasterSpirits();

  const parseMasterList = (text: string) => {
    // Parse 3-column format: Item Name | Category | Package(measure)
    const lines = text.split('\n').filter(line => line.trim());
    const parsedIngredients: Ingredient[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Split by tab or multiple spaces (common in table copy-paste)
      const parts = trimmed.split(/\t+|\s{2,}/).map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 2) {
        // Looking for bottle size in the last column
        const name = parts[0];
        const lastPart = parts[parts.length - 1];
        
        // Extract bottle size from the last column
        const sizeMatch = lastPart.match(/(\d+\.?\d*)\s*(ml|l|ltr|litre|liter|cl)/i);
        
        if (sizeMatch) {
          const amount = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toLowerCase();
          let amountInMl: number;
          
          if (unit === 'cl') {
            amountInMl = amount * 10;
          } else if (unit.startsWith('l')) {
            amountInMl = amount * 1000;
          } else {
            amountInMl = amount;
          }
          
          parsedIngredients.push({
            id: `parsed-${Date.now()}-${index}`,
            name: name,
            amount: "",
            unit: "ml",
            bottle_size_ml: amountInMl
          });
        } else {
          // No bottle size found
          parsedIngredients.push({
            id: `parsed-${Date.now()}-${index}`,
            name: name,
            amount: "",
            unit: "ml"
          });
        }
      } else {
        parsedIngredients.push({
          id: `parsed-${Date.now()}-${index}`,
          name: parts[0] || trimmed,
          amount: "",
          unit: "ml"
        });
      }
    });
    
    return parsedIngredients;
  };

  const handleParseMasterList = async () => {
    try {
      console.log("Parse button clicked");
      
      if (!masterList.trim()) {
        toast.error("Please enter ingredients to parse");
        return;
      }
      
      console.log("Parsing master list...");
      const parsed = parseMasterList(masterList);
      console.log("Parsed ingredients:", parsed);
      
      // Save to master spirits database
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user?.id);
      
      if (user) {
        for (const ingredient of parsed) {
          if (ingredient.name && ingredient.bottle_size_ml) {
            console.log("Processing ingredient:", ingredient.name);
            
            // Check if spirit already exists
            const { data: existing, error: checkError } = await supabase
              .from('master_spirits')
              .select('id')
              .eq('name', ingredient.name)
              .eq('user_id', user.id)
              .maybeSingle();
            
            if (checkError) {
              console.error("Error checking existing spirit:", checkError);
              continue;
            }
            
            if (!existing) {
              console.log("Inserting new spirit:", ingredient.name);
              const { error: insertError } = await supabase.from('master_spirits').insert({
                name: ingredient.name,
                bottle_size_ml: ingredient.bottle_size_ml,
                user_id: user.id,
              });
              
              if (insertError) {
                console.error("Error inserting spirit:", insertError);
              } else {
                console.log("Successfully inserted:", ingredient.name);
              }
            } else {
              console.log("Spirit already exists:", ingredient.name);
            }
          }
        }
      }
      
      setIngredients(parsed);
      toast.success(`Added ${parsed.length} ingredients and saved to master list!`);
      setShowMasterList(false);
      setMasterList("");
      await queryClient.invalidateQueries({ queryKey: ["master-spirits"] });
      console.log("Parse completed successfully");
    } catch (error) {
      console.error("Error in handleParseMasterList:", error);
      toast.error("Failed to parse ingredients: " + (error as Error).message);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), name: "", amount: "", unit: "ml" },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) => {
        if (ing.id === id) {
          const updated = { ...ing, [field]: value };
          
          // If name changed and it's a spirit from master list, auto-fill bottle size
          if (field === 'name' && spirits) {
            const selectedSpirit = spirits.find(s => s.name === value);
            if (selectedSpirit) {
              updated.bottle_size_ml = selectedSpirit.bottle_size_ml;
            }
          }
          
          return updated;
        }
        return ing;
      }),
    );
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
          ingredients: ingredients.map((ing) => ({
            id: ing.id,
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          })),
        },
      });
      setEditingRecipeId(null);
    } else {
      createRecipe({
        recipe_name: recipeName,
        description: batchDescription,
        current_serves: parseFloat(currentServes),
        ingredients: ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        })),
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
    setIngredients(
      Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((ing: any) => ({
            id: ing.id || `${Date.now()}-${Math.random()}`,
            name: ing.name || "",
            amount: String(ing.amount || ""),
            unit: ing.unit || "ml",
          }))
        : [{ id: "1", name: "", amount: "", unit: "ml" }],
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
      const response = await supabase.functions.invoke("batch-ai-assistant", {
        body: {
          action: "suggest_ingredients",
          data: { recipeName },
        },
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
            setIngredients(
              suggested.map((ing: any, idx: number) => ({
                id: `${Date.now()}-${idx}`,
                name: ing.name || "",
                amount: String(ing.amount || ""),
                unit: ing.unit || "ml",
              })),
            );
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
            <p className="text-sm text-muted-foreground">
              Create and manage your recipes
            </p>
          </div>
        </div>

        {/* Recipe Creation Form */}
        <Card className="glass p-4 sm:p-6 space-y-4 sm:space-y-6">
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
              <div className="flex items-center justify-between gap-2">
                <Label>Ingredients *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMasterList(!showMasterList)}
                    className="glass-hover"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Paste List
                  </Button>
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
              </div>

              {showMasterList && (
                <Card className="p-4 glass border-primary/50">
                  <div className="space-y-3">
                    <div>
                      <Label>Paste 3-Column Table Data</Label>
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        Copy-paste from spreadsheet: Item Name | Category | Package
                      </p>
                      <Textarea
                        value={masterList}
                        onChange={(e) => setMasterList(e.target.value)}
                        placeholder="Vodka		Premium		750ml&#10;Gin		London Dry		1L&#10;Rum		Dark		700ml&#10;Tequila		Blanco		750ml"
                        className="glass min-h-[120px] font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleParseMasterList}
                        size="sm"
                        className="flex-1"
                      >
                        Parse & Add
                      </Button>
                      <Button
                        onClick={() => {
                          setShowMasterList(false);
                          setMasterList("");
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {ingredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="flex flex-wrap gap-2"
                >
                  <Select
                    value={ingredient.name}
                    onValueChange={(value) =>
                      updateIngredient(ingredient.id, "name", value)
                    }
                  >
                    <SelectTrigger className="glass flex-1 min-w-[160px] bg-background/80 backdrop-blur-sm">
                      <SelectValue placeholder="Select spirit" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-sm z-[100] max-h-[300px]">
                      {spirits && spirits.length > 0 ? (
                        spirits.map((spirit) => (
                          <SelectItem key={spirit.id} value={spirit.name}>
                            <div className="flex flex-col">
                              <span>{spirit.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {spirit.brand && `${spirit.brand} • `}
                                {spirit.bottle_size_ml}ml btl
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          No master spirits yet
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={ingredient.amount}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "amount", e.target.value)
                    }
                    className="glass w-24 sm:w-24 flex-none"
                  />
                  <Select
                    value={ingredient.unit}
                    onValueChange={(value) =>
                      updateIngredient(ingredient.id, "unit", value)
                    }
                  >
                    <SelectTrigger className="glass w-24 flex-none bg-background/80 backdrop-blur-sm z-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 backdrop-blur-sm z-[100]">
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="dash">dash</SelectItem>
                      <SelectItem value="piece">piece</SelectItem>
                    </SelectContent>
                  </Select>
                  {ingredient.bottle_size_ml && ingredient.amount && (
                    <div className="flex items-center px-3 py-2 glass rounded-md text-sm font-medium text-primary">
                      ≈ {calculateBottles(parseFloat(ingredient.amount) / 1000, ingredient.bottle_size_ml)} btl
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(ingredient.id)}
                    disabled={ingredients.length === 1}
                    className="glass-hover flex-none shrink-0"
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
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{recipe.recipe_name}</h4>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Base: {recipe.current_serves} serving(s) •{" "}
                        {Array.isArray(recipe.ingredients)
                          ? recipe.ingredients.length
                          : 0}{" "}
                        ingredients
                      </p>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0 sm:ml-4 self-stretch sm:self-auto">
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
