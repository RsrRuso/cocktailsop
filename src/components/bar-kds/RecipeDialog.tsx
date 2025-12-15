import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Check, Wine, Loader2 } from "lucide-react";

interface RecipeIngredient {
  id: string;
  qty: number;
  unit: string;
  inventory_item?: {
    name: string;
  };
}

interface Recipe {
  id: string;
  instructions: string | null;
  yield_qty: number;
  yield_unit: string;
  ingredients: RecipeIngredient[];
}

interface RecipeDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  menuItemId: string;
  qty: number;
  orderId: string;
  onComplete: () => void;
}

export function RecipeDialog({
  open,
  onClose,
  itemId,
  itemName,
  menuItemId,
  qty,
  orderId,
  onComplete
}: RecipeDialogProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && menuItemId) {
      fetchRecipe();
    }
  }, [open, menuItemId]);

  const fetchRecipe = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("lab_ops_recipes")
        .select(`
          id, instructions, yield_qty, yield_unit,
          lab_ops_recipe_ingredients(
            id, qty, unit,
            lab_ops_inventory_items(name)
          )
        `)
        .eq("menu_item_id", menuItemId)
        .eq("is_active", true)
        .single();

      if (data) {
        setRecipe({
          id: data.id,
          instructions: data.instructions,
          yield_qty: Number(data.yield_qty) || 1,
          yield_unit: data.yield_unit || 'portion',
          ingredients: (data.lab_ops_recipe_ingredients || []).map((ing: any) => ({
            id: ing.id,
            qty: Number(ing.qty),
            unit: ing.unit,
            inventory_item: ing.lab_ops_inventory_items
          }))
        });
      } else {
        setRecipe(null);
      }
    } catch (error) {
      console.error("Error fetching recipe:", error);
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  // Calculate scaled quantities based on order qty
  const getScaledQty = (ingredientQty: number) => {
    if (!recipe) return ingredientQty;
    const scaleFactor = qty / recipe.yield_qty;
    return (ingredientQty * scaleFactor).toFixed(2);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Wine className="h-5 w-5 text-amber-400" />
            <span className="text-amber-400 font-bold">{qty}×</span> {itemName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          </div>
        ) : recipe ? (
          <div className="space-y-4">
            {/* Ingredients */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Ingredients {qty > 1 && `(× ${qty})`}
              </h3>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {recipe.ingredients.map((ing) => (
                    <div 
                      key={ing.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <span className="text-white font-medium">
                        {ing.inventory_item?.name || "Unknown"}
                      </span>
                      <Badge className="bg-amber-600 text-white">
                        {getScaledQty(ing.qty)} {ing.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Instructions */}
            {recipe.instructions && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                  Method
                </h3>
                <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">
                    {recipe.instructions}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <Wine className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No recipe found for this item</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          className="w-full mt-4 bg-green-600 hover:bg-green-700"
          onClick={handleComplete}
        >
          <Check className="h-4 w-4 mr-2" />
          Complete
        </Button>
      </DialogContent>
    </Dialog>
  );
}
