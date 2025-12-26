import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Edit2, Trash2, ChevronDown, ChevronRight, Beaker } from "lucide-react";
import { BatchProduction } from "@/hooks/useBatchProductions";
import { supabase } from "@/integrations/supabase/client";

interface SubRecipeBreakdownItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  scaled_amount: number;
}

interface SubRecipeDepletion {
  id: string;
  sub_recipe_id: string;
  amount_used_ml: number;
  ingredient_breakdown: SubRecipeBreakdownItem[];
}

interface ProductionCardProps {
  production: BatchProduction;
  canEditDelete: boolean;
  producerProfile: { avatar_url?: string; full_name?: string; username?: string } | null;
  spirits: Array<{ name: string; bottle_size_ml: number; source_type?: string }> | null;
  onDownloadPDF: (production: BatchProduction) => void;
  onEdit: (production: BatchProduction) => void;
  onDelete: (productionId: string) => void;
  getProductionIngredients: (productionId: string) => Promise<any[]>;
}

// Helper function to find matching spirit with fuzzy matching
const findMatchingSpirit = (ingredientName: string, spirits: Array<{ name: string; bottle_size_ml: number }>) => {
  const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedIngredient = normalizeName(ingredientName);
  
  return spirits.find(spirit => {
    const normalizedSpirit = normalizeName(spirit.name);
    return normalizedSpirit === normalizedIngredient || 
           normalizedSpirit.includes(normalizedIngredient) || 
           normalizedIngredient.includes(normalizedSpirit);
  });
};

export const ProductionCard = ({
  production,
  canEditDelete,
  producerProfile,
  spirits,
  onDownloadPDF,
  onEdit,
  onDelete,
  getProductionIngredients,
}: ProductionCardProps) => {
  const [ingredientsData, setIngredientsData] = useState<{
    ingredients: Array<{ 
      name: string; 
      ml: number; 
      bottles: number; 
      leftoverMl: number;
      isSubRecipe?: boolean;
      subRecipeBreakdown?: SubRecipeBreakdownItem[];
    }>;
    totalMl: number;
    totalBottles: number;
    totalLeftoverMl: number;
  } | null>(null);
  const [subRecipeDepletions, setSubRecipeDepletions] = useState<SubRecipeDepletion[]>([]);
  const [expandedSubRecipes, setExpandedSubRecipes] = useState<Set<string>>(new Set());

  // Fetch sub-recipe depletions for this production
  useEffect(() => {
    const fetchSubRecipeDepletions = async () => {
      const { data, error } = await supabase
        .from('sub_recipe_depletions')
        .select('*')
        .eq('production_id', production.id);
      
      if (!error && data) {
        setSubRecipeDepletions(data.map((d: any) => ({
          ...d,
          ingredient_breakdown: d.ingredient_breakdown as SubRecipeBreakdownItem[]
        })));
      }
    };

    fetchSubRecipeDepletions();
  }, [production.id]);

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const ingredients = await getProductionIngredients(production.id);
        if (!ingredients || ingredients.length === 0) {
          setIngredientsData(null);
          return;
        }

        let totalMl = 0;
        let totalBottles = 0;
        let totalLeftoverMl = 0;
        const ingredientDetails: any[] = [];

        ingredients.forEach((ing: any) => {
          const scaledMl = parseFloat(ing.scaled_amount || 0);
          totalMl += scaledMl;

          // Check if this ingredient is a sub-recipe
          const matchingSpirit = spirits ? findMatchingSpirit(ing.ingredient_name, spirits) : null;
          const isSubRecipe = matchingSpirit && (matchingSpirit as any).source_type === 'sub_recipe';
          
          // Find sub-recipe depletion for breakdown
          const depletion = subRecipeDepletions.find(d => {
            // Match by checking if there's a depletion with similar amount
            return Math.abs(d.amount_used_ml - scaledMl) < 1;
          });

          let bottles = 0;
          let leftoverMl = 0;

          if (matchingSpirit && matchingSpirit.bottle_size_ml && !isSubRecipe) {
            bottles = Math.floor(scaledMl / matchingSpirit.bottle_size_ml);
            leftoverMl = scaledMl % matchingSpirit.bottle_size_ml;
            totalBottles += bottles;

            // "Extra ML" is only the remainder beyond at least one full bottle.
            if (bottles > 0) totalLeftoverMl += leftoverMl;
          }

          ingredientDetails.push({
            name: ing.ingredient_name,
            ml: scaledMl,
            bottles,
            leftoverMl,
            isSubRecipe,
            subRecipeBreakdown: depletion?.ingredient_breakdown || [],
          });
        });

        setIngredientsData({
          ingredients: ingredientDetails,
          totalMl,
          totalBottles,
          totalLeftoverMl,
        });
      } catch (error) {
        console.error("Error loading ingredients:", error);
        setIngredientsData(null);
      }
    };

    loadIngredients();
  }, [production.id, getProductionIngredients, spirits, subRecipeDepletions]);

  const toggleSubRecipe = (name: string) => {
    const newExpanded = new Set(expandedSubRecipes);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedSubRecipes(newExpanded);
  };

  return (
    <Card className="p-3 sm:p-4 glass hover:bg-accent/10 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-base sm:text-lg">{production.batch_name}</h4>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {new Date(production.production_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownloadPDF(production)}
            className="flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          {canEditDelete && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(production)}
                className="glass-hover"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(production.id)}
                className="glass-hover text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm mb-3">
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
          {producerProfile ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={producerProfile.avatar_url || ""} />
                <AvatarFallback>
                  {(producerProfile.full_name || producerProfile.username || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold">
                {producerProfile.full_name || producerProfile.username}
              </span>
            </div>
          ) : (
            <p className="font-semibold">{production.produced_by_name || "Unknown"}</p>
          )}
        </div>
      </div>

      {ingredientsData && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <h5 className="text-xs font-semibold text-muted-foreground mb-2">
            Ingredient Consumption
          </h5>
          <div className="space-y-2 mb-3">
            {ingredientsData.ingredients.map((ing, idx) => (
              <div key={idx}>
                {ing.isSubRecipe && ing.subRecipeBreakdown && ing.subRecipeBreakdown.length > 0 ? (
                  <Collapsible 
                    open={expandedSubRecipes.has(ing.name)}
                    onOpenChange={() => toggleSubRecipe(ing.name)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex justify-between items-center text-xs bg-purple-500/20 p-2 rounded cursor-pointer hover:bg-purple-500/30 transition-colors">
                        <div className="flex items-center gap-2">
                          {expandedSubRecipes.has(ing.name) ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <Beaker className="w-3 h-3 text-purple-400" />
                          <span className="font-medium truncate">{ing.name}</span>
                          <Badge variant="secondary" className="text-[10px] bg-purple-500/30">Sub-Recipe</Badge>
                        </div>
                        <span className="text-primary font-bold">{ing.ml.toFixed(0)} ml</span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-purple-500/30 pl-3">
                        {ing.subRecipeBreakdown.map((subIng, subIdx) => (
                          <div
                            key={subIdx}
                            className="flex justify-between items-center text-xs bg-muted/30 p-1.5 rounded"
                          >
                            <span className="text-muted-foreground truncate flex-1">{subIng.name}</span>
                            <span className="text-primary/80 font-medium">
                              {(subIng.scaled_amount || subIng.amount).toFixed(1)} {subIng.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded">
                    <span className="font-medium truncate flex-1">{ing.name}</span>
                    <div className="flex gap-3 text-right">
                      <span className="text-primary font-bold">{ing.ml.toFixed(0)} ml</span>
                      {ing.bottles > 0 && (
                        <>
                          <span className="text-emerald-600 font-bold">{ing.bottles} btl</span>
                          {ing.leftoverMl > 0 && (
                            <span className="text-amber-600">+{ing.leftoverMl.toFixed(0)} ml</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {ingredientsData.totalBottles > 0 ? (
            <div className="grid grid-cols-3 gap-2 text-xs bg-primary/10 p-2 rounded">
              <div className="text-center">
                <p className="text-muted-foreground mb-1">Total ML</p>
                <p className="font-bold text-primary">{ingredientsData.totalMl.toFixed(0)}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground mb-1">Bottles</p>
                <p className="font-bold text-emerald-600">{ingredientsData.totalBottles}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground mb-1">Extra ML</p>
                <p className="font-bold text-amber-600">
                  {ingredientsData.totalLeftoverMl.toFixed(0)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs bg-primary/10 p-2 rounded text-center">
              <p className="text-muted-foreground mb-1">Total ML</p>
              <p className="font-bold text-primary">{ingredientsData.totalMl.toFixed(0)}</p>
            </div>
          )}
        </div>
      )}

      {production.notes && (
        <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/20 rounded">
          {production.notes}
        </p>
      )}
    </Card>
  );
};
