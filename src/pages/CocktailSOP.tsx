import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, BookOpen, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RecipeEditor from "@/components/sop/RecipeEditor";
import RecipeView from "@/components/sop/RecipeView";
import { CocktailRecipe } from "@/types/cocktail-recipe";

const CocktailSOP = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<"editor" | "view">("editor");
  const [saving, setSaving] = useState(false);

  const [recipe, setRecipe] = useState<CocktailRecipe>({
    drinkName: "",
    glass: "",
    ice: "",
    garnish: "",
    technique: "",
    mainImage: null,
    ingredients: [],
    methodSOP: "",
    serviceNotes: "",
    tasteProfile: {
      sweet: 0,
      sour: 0,
      bitter: 0,
      salty: 0,
      umami: 0,
    },
  });

  const handleSave = async () => {
    if (!user) {
      toast.error("Please login");
      navigate("/auth");
      return;
    }

    if (!recipe.drinkName.trim()) {
      toast.error("Enter drink name");
      return;
    }

    setSaving(true);

    try {
      const totalVolume = recipe.ingredients.reduce(
        (sum, ing) => sum + (parseFloat(ing.amount) || 0),
        0
      );
      const pureAlcohol = recipe.ingredients.reduce(
        (sum, ing) =>
          sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100),
        0
      );
      const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
      const estimatedCalories = pureAlcohol * 7 + totalVolume * 0.5;

      const { error } = await supabase.from("cocktail_sops").insert([{
        user_id: user.id,
        drink_name: recipe.drinkName,
        glass: recipe.glass,
        ice: recipe.ice,
        garnish: recipe.garnish,
        technique: recipe.technique,
        main_image: recipe.mainImage,
        recipe: recipe.ingredients as any,
        method_sop: recipe.methodSOP,
        service_notes: recipe.serviceNotes || null,
        taste_profile: recipe.tasteProfile as any,
        total_ml: totalVolume,
        abv_percentage: abvPercentage,
        kcal: estimatedCalories,
      }]);

      if (error) throw error;

      toast.success("Recipe saved!");
      setView("view");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops-tools")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            <Button
              variant={view === "editor" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("editor")}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={view === "view" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("view")}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {view === "editor" ? (
          <RecipeEditor recipe={recipe} onChange={setRecipe} />
        ) : (
          <RecipeView recipe={recipe} />
        )}
      </div>
    </div>
  );
};

export default CocktailSOP;
