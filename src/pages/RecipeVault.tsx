import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, BookOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Recipe {
  id: string;
  name: string;
  ingredients: any;
  instructions: string;
  created_at: string;
}

const RecipeVault = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setRecipes(data);
  };

  const handleSaveRecipe = async () => {
    if (!recipeName || !ingredients) {
      toast.error("Please fill in recipe name and ingredients");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name: recipeName,
        ingredients: ingredients.split("\n").map(i => i.trim()).filter(Boolean),
        instructions: instructions
      });

    if (error) {
      toast.error("Failed to save recipe");
    } else {
      toast.success("Recipe saved!");
      setRecipeName("");
      setIngredients("");
      setInstructions("");
      setIsOpen(false);
      fetchRecipes();
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete recipe");
    } else {
      toast.success("Recipe deleted");
      fetchRecipes();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold">Recipe Vault</h1>
              <p className="text-sm text-muted-foreground">Secure recipe storage</p>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="glass-hover">
                <Plus className="w-4 h-4 mr-2" />
                New Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="glass max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Recipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Recipe Name</Label>
                  <Input
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="e.g., Signature Negroni"
                    className="glass"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ingredients (one per line)</Label>
                  <Textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="30ml Gin&#10;30ml Campari&#10;30ml Sweet Vermouth&#10;Orange peel"
                    className="glass min-h-32"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Stir all ingredients with ice. Strain into rocks glass over ice. Garnish with orange peel."
                    className="glass min-h-24"
                  />
                </div>
                <Button onClick={handleSaveRecipe} className="w-full">
                  Save Recipe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {recipes.length === 0 ? (
          <Card className="glass p-12 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No Recipes Yet</h3>
              <p className="text-muted-foreground text-sm">
                Start building your recipe collection
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="glass p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold">{recipe.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    className="glass-hover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ingredients:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {Array.isArray(recipe.ingredients) ? 
                      recipe.ingredients.map((ing: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">{ing}</li>
                      )) : null
                    }
                  </ul>
                </div>
                {recipe.instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Instructions:</h4>
                    <p className="text-sm text-muted-foreground">{recipe.instructions}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RecipeVault;
