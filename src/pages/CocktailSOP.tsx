import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Eye, Save, Download, Library } from "lucide-react";
import RecipeEditor from "@/components/sop/RecipeEditor";
import RecipeView from "@/components/sop/RecipeView";
import { CocktailRecipe } from "@/types/cocktail-recipe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { exportToPDF } from "@/components/sop/PDFExport";

const CocktailSOP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [view, setView] = useState<"editor" | "view">("editor");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [recipe, setRecipe] = useState<CocktailRecipe>({
    drinkName: "Negroni",
    brandName: "",
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
    textureProfile: {
      body: 0,
      foam: 0,
      bubbles: 0,
      oiliness: 0,
      creaminess: 0,
      astringency: 0,
    },
    ratio: "",
    ph: "",
    brix: "",
    allergens: "",
    pdfOptions: {
      showBrandName: true,
      showAmount: true,
      showUnit: true,
      showType: true,
      showABV: true,
      showNotes: true,
    },
  });

  // Load recipe from location state if editing
  useEffect(() => {
    const editRecipe = location.state?.editRecipe;
    if (editRecipe) {
      setEditingId(editRecipe.id);
      setRecipe({
        drinkName: editRecipe.drink_name,
        brandName: "",
        glass: editRecipe.glass,
        ice: editRecipe.ice,
        garnish: editRecipe.garnish,
        technique: editRecipe.technique,
        mainImage: editRecipe.main_image,
        ingredients: editRecipe.recipe || [],
        methodSOP: editRecipe.method_sop,
        serviceNotes: editRecipe.service_notes || "",
        tasteProfile: editRecipe.taste_profile || {
          sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0
        },
        textureProfile: editRecipe.texture_profile || {
          body: 0, foam: 0, bubbles: 0, oiliness: 0, creaminess: 0, astringency: 0
        },
        ratio: editRecipe.ratio || "",
        ph: editRecipe.ph?.toString() || "",
        brix: editRecipe.brix?.toString() || "",
        allergens: editRecipe.allergens || "",
        pdfOptions: {
          showBrandName: true,
          showAmount: true,
          showUnit: true,
          showType: true,
          showABV: true,
          showNotes: true,
        },
      });
    }
  }, [location.state]);

  const handleSave = async () => {
    if (!user) {
      toast.error("Please sign in to save recipes");
      navigate("/auth");
      return;
    }

    if (!recipe.drinkName.trim()) {
      toast.error("Please enter a drink name");
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
      const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);

      const recipeData = {
        user_id: user.id,
        drink_name: recipe.drinkName,
        glass: recipe.glass,
        ice: recipe.ice,
        garnish: recipe.garnish,
        technique: recipe.technique,
        main_image: recipe.mainImage,
        recipe: recipe.ingredients as any,
        method_sop: recipe.methodSOP,
        service_notes: recipe.serviceNotes,
        taste_profile: recipe.tasteProfile as any,
        texture_profile: recipe.textureProfile as any,
        allergens: recipe.allergens,
        total_ml: totalVolume,
        abv_percentage: abvPercentage,
        kcal: estimatedCalories,
        ratio: recipe.ratio,
        ph: recipe.ph ? parseFloat(recipe.ph) : null,
        brix: recipe.brix ? parseFloat(recipe.brix) : null,
      };

      let error;
      
      if (editingId) {
        // Update existing recipe
        const result = await supabase
          .from("cocktail_sops")
          .update(recipeData)
          .eq("id", editingId);
        error = result.error;
      } else {
        // Insert new recipe
        const result = await supabase
          .from("cocktail_sops")
          .insert([recipeData]);
        error = result.error;
      }

      if (error) throw error;

      toast.success(editingId ? "Recipe updated successfully!" : "Recipe saved successfully!");
      navigate("/cocktail-sop-library");
    } catch (error: any) {
      console.error("Error saving recipe:", error);
      toast.error(error.message || "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    if (!recipe.drinkName.trim()) {
      toast.error("Please enter a drink name first");
      return;
    }
    exportToPDF(recipe);
    toast.success("PDF downloaded!");
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ops-tools")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-semibold">Cocktail SOP</h1>
            <Button variant="ghost" size="icon" onClick={() => navigate("/cocktail-sop-library")}>
              <Library className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={view === "editor" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("editor")}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={view === "view" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("view")}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button 
              onClick={handleExportPDF} 
              size="sm" 
              variant="secondary"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              size="sm"
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "..." : editingId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
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
