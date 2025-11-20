import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CocktailRecipe } from "@/types/cocktail-recipe";
import { exportToPDF } from "@/components/sop/PDFExport";
import jsPDF from "jspdf";

interface SavedRecipe {
  id: string;
  drink_name: string;
  created_at: string;
  recipe: any;
  glass: string;
  ice: string;
  garnish: string;
  technique: string;
  method_sop: string;
  service_notes: string | null;
  taste_profile: any;
  main_image: string | null;
  ratio: string | null;
  ph: number | null;
  brix: number | null;
  total_ml: number;
  abv_percentage: number;
  kcal: number;
}

const CocktailSOPLibrary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (user) {
      loadRecipes();
    }
  }, [user]);

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("cocktail_sops")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error: any) {
      console.error("Error loading recipes:", error);
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      const { error } = await supabase
        .from("cocktail_sops")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setRecipes(recipes.filter(r => r.id !== id));
      toast.success("Recipe deleted");
    } catch (error: any) {
      console.error("Error deleting recipe:", error);
      toast.error("Failed to delete recipe");
    }
  };

  const downloadSinglePDF = (recipe: SavedRecipe) => {
    const cocktailRecipe: CocktailRecipe = {
      drinkName: recipe.drink_name,
      glass: recipe.glass,
      ice: recipe.ice,
      garnish: recipe.garnish,
      technique: recipe.technique,
      mainImage: recipe.main_image,
      ingredients: recipe.recipe || [],
      methodSOP: recipe.method_sop,
      serviceNotes: recipe.service_notes || "",
      tasteProfile: recipe.taste_profile || {
        sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0
      },
      textureProfile: {
        body: 0, foam: 0, bubbles: 0, oiliness: 0, creaminess: 0, astringency: 0
      },
      ratio: recipe.ratio || "",
      ph: recipe.ph?.toString() || "",
      brix: recipe.brix?.toString() || "",
      allergens: ""
    };
    
    exportToPDF(cocktailRecipe);
    toast.success("PDF downloaded!");
  };

  const downloadAllPDFs = async () => {
    if (recipes.length === 0) {
      toast.error("No recipes to download");
      return;
    }

    setDownloading(true);
    toast.loading("Generating PDFs...");

    try {
      const doc = new jsPDF();
      
      recipes.forEach((recipe, index) => {
        if (index > 0) doc.addPage();
        
        const cocktailRecipe: CocktailRecipe = {
          drinkName: recipe.drink_name,
          glass: recipe.glass,
          ice: recipe.ice,
          garnish: recipe.garnish,
          technique: recipe.technique,
          mainImage: recipe.main_image,
          ingredients: recipe.recipe || [],
          methodSOP: recipe.method_sop,
          serviceNotes: recipe.service_notes || "",
          tasteProfile: recipe.taste_profile || {
            sweet: 0, sour: 0, bitter: 0, salty: 0, umami: 0
          },
          textureProfile: {
            body: 0, foam: 0, bubbles: 0, oiliness: 0, creaminess: 0, astringency: 0
          },
          ratio: recipe.ratio || "",
          ph: recipe.ph?.toString() || "",
          brix: recipe.brix?.toString() || "",
          allergens: ""
        };
        
    // Generate each recipe page directly
    generateRecipePage(doc, cocktailRecipe, index + 1, recipes.length);
      });

      doc.save("Cocktail_SOPs_Collection.pdf");
      toast.success(`Downloaded ${recipes.length} recipes!`);
    } catch (error) {
      console.error("Error generating PDFs:", error);
      toast.error("Failed to generate PDFs");
    } finally {
      setDownloading(false);
    }
  };

  const generateRecipePage = (doc: jsPDF, recipe: CocktailRecipe, pageNum: number, totalPages: number) => {
    const darkerBg: [number, number, number] = [30, 35, 45];
    const lightText: [number, number, number] = [236, 240, 241];
    
    doc.setFillColor(darkerBg[0], darkerBg[1], darkerBg[2]);
    doc.rect(0, 0, 210, 28, 'F');
    
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.setFontSize(9);
    doc.text(`Recipe ${pageNum} of ${totalPages}`, 15, 10);
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(recipe.drinkName.toUpperCase(), 15, 22);
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/ops-tools")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Cocktail SOP Library</h1>
                <p className="text-sm text-muted-foreground">{recipes.length} saved recipes</p>
              </div>
            </div>
            <Button
              onClick={downloadAllPDFs}
              disabled={recipes.length === 0 || downloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download All PDFs
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No recipes yet</p>
            <p className="text-muted-foreground mb-4">Create your first cocktail SOP to get started</p>
            <Button onClick={() => navigate("/cocktail-sop")}>
              Create Recipe
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{recipe.drink_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(recipe.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Glass:</span>
                    <span className="font-medium">{recipe.glass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Technique:</span>
                    <span className="font-medium">{recipe.technique}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ABV:</span>
                    <span className="font-medium">{recipe.abv_percentage.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadSinglePDF(recipe)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteRecipe(recipe.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CocktailSOPLibrary;
