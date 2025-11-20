import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, BookOpen, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CocktailEditor from "@/components/cocktail-sop/CocktailEditor";
import CocktailBible from "@/components/cocktail-sop/CocktailBible";
import { CocktailData, Ingredient } from "@/types/cocktail";

const CocktailSOP = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<"editor" | "bible">("editor");
  const [isSaving, setIsSaving] = useState(false);

  // Cocktail state
  const [cocktailData, setCocktailData] = useState<CocktailData>({
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
      toast.error("Please login to save");
      navigate("/auth");
      return;
    }

    if (!cocktailData.drinkName.trim()) {
      toast.error("Please enter a drink name");
      return;
    }

    setIsSaving(true);

    try {
      // Calculate metrics
      const totalVolume = cocktailData.ingredients.reduce(
        (sum, ing) => sum + (parseFloat(ing.amount) || 0),
        0
      );
      const pureAlcohol = cocktailData.ingredients.reduce(
        (sum, ing) =>
          sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100),
        0
      );
      const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
      const standardDrinks = pureAlcohol / 14;
      const estimatedCalories = pureAlcohol * 7 + totalVolume * 0.5;

      const { error } = await supabase.from("cocktail_sops").insert({
        user_id: user.id,
        drink_name: cocktailData.drinkName,
        glass: cocktailData.glass,
        ice: cocktailData.ice,
        garnish: cocktailData.garnish,
        technique: cocktailData.technique,
        main_image: cocktailData.mainImage,
        recipe: cocktailData.ingredients,
        method_sop: cocktailData.methodSOP,
        service_notes: cocktailData.serviceNotes,
        taste_profile: cocktailData.tasteProfile,
        total_ml: totalVolume,
        abv_percentage: abvPercentage,
        kcal: estimatedCalories,
      });

      if (error) throw error;

      toast.success("Cocktail SOP saved successfully!");
      setCurrentView("bible");
    } catch (error) {
      console.error("Error saving cocktail:", error);
      toast.error("Failed to save cocktail");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops-tools")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            <Button
              variant={currentView === "editor" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentView("editor")}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editor
            </Button>
            <Button
              variant={currentView === "bible" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentView("bible")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Bible
            </Button>
          </div>

          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {currentView === "editor" ? (
          <CocktailEditor data={cocktailData} onChange={setCocktailData} />
        ) : (
          <CocktailBible data={cocktailData} />
        )}
      </div>
    </div>
  );
};

export default CocktailSOP;
