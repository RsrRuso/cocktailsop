import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useRecipeCostCalculator, type RecipeIngredient } from "@/hooks/useRecipeCostCalculator";

type InventoryItem = {
  id: string;
  name: string;
  bottle_size_ml?: number | null;
  base_unit?: string | null;
  totalStock?: number | null;
  lab_ops_inventory_item_costs?: Array<{ unit_cost: number | null }> | null;
};

type RecipeIngredientRow = {
  id: string;
  inventory_item_id: string;
  qty: number | null;
  unit: string | null;
  bottle_size?: number | null;
};

type RecipeRow = {
  id: string;
  version_number?: number | null;
  yield_qty?: number | null;
  menu_item?: { id: string; name: string; base_price: number | null } | null;
  lab_ops_recipe_ingredients?: RecipeIngredientRow[] | null;
};

const UNIT_TO_ML: Record<string, number> = {
  ml: 1,
  L: 1000,
  cl: 10,
  oz: 29.5735,
  dash: 0.9,
  drop: 0.05,
  tsp: 4.929,
  tbsp: 14.787,
  g: 1,
  kg: 1000,
  piece: 0,
};

function getTotalServesFromStock(
  ing: { qty: number; unit: string },
  invItem: InventoryItem | undefined,
  bottleSize: number
) {
  const stock = Number(invItem?.totalStock || 0);
  if (!stock) return 0;

  const baseUnit = (invItem?.base_unit || "").toLowerCase();
  const stockIsBottles = baseUnit.includes("bottle") || baseUnit === "bot" || baseUnit === "btl" || baseUnit === "btls";

  if (ing.unit === "piece") {
    const perServe = ing.qty > 0 ? ing.qty : 1;
    return Math.floor(stock / perServe);
  }

  const unitMultiplier = UNIT_TO_ML[ing.unit] || 1;
  const qtyMl = ing.qty * unitMultiplier;
  if (qtyMl <= 0) return 0;

  // If stock is recorded as bottles, convert to ml using bottle size.
  if (stockIsBottles) {
    return Math.floor((stock * bottleSize) / qtyMl);
  }

  // Otherwise assume stock is stored in ml.
  return Math.floor(stock / qtyMl);
}

export function RecipeCostCard({
  recipe,
  inventoryItems,
  onEdit,
  onDelete,
}: {
  recipe: RecipeRow;
  inventoryItems: InventoryItem[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { formatPrice } = useCurrency();

  const ingredients: RecipeIngredient[] = useMemo(() => {
    return (recipe.lab_ops_recipe_ingredients || [])
      .filter((i) => !!i.inventory_item_id)
      .map((i) => ({
        inventory_item_id: i.inventory_item_id,
        qty: Number(i.qty || 0),
        unit: i.unit || "ml",
        bottle_size: i.bottle_size ? Number(i.bottle_size) : undefined,
      }));
  }, [recipe.lab_ops_recipe_ingredients]);

  const yieldQty = Number(recipe.yield_qty || 1);
  const costSummary = useRecipeCostCalculator(ingredients, inventoryItems as any, yieldQty, 750);

  const sellingPrice = Number(recipe.menu_item?.base_price || 0);
  const profit = sellingPrice - costSummary.costPerServe;
  const foodCostPct = costSummary.foodCostPercent(sellingPrice);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{recipe.menu_item?.name || "Unnamed recipe"}</h3>
            <p className="text-sm text-muted-foreground">
              Version {recipe.version_number || 1} • Yield: {yieldQty}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Badge
              variant={foodCostPct > 35 ? "destructive" : "default"}
              className="shrink-0"
              title="Food cost %"
            >
              {Number.isFinite(foodCostPct) ? foodCostPct.toFixed(1) : "0.0"}%
            </Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="Edit recipe">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={onDelete}
              aria-label="Delete recipe"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Cost / serve</p>
            <p className="font-semibold">{formatPrice(costSummary.costPerServe)}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-semibold">{formatPrice(sellingPrice)}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">Profit</p>
            <p className={`font-semibold ${profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatPrice(profit)}
            </p>
          </div>
        </div>

        {costSummary.breakdown.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Ingredients (unit price & cost):</p>
            <div className="space-y-2">
              {costSummary.breakdown
                .slice()
                .sort((a, b) => b.ingredientCost - a.ingredientCost)
                .map((b, idx) => {
                  const invItem = inventoryItems.find((i) => i.name === b.ingredientName);

                  // total servings uses current stock divided by recipe usage
                  const totalServes = getTotalServesFromStock(
                    { qty: b.qty, unit: b.unit },
                    invItem,
                    b.bottleSize
                  );

                  const unitBottleCost = invItem?.lab_ops_inventory_item_costs?.[0]?.unit_cost || 0;

                  return (
                    <div key={`${b.ingredientName}-${idx}`} className="rounded-lg border bg-muted/20 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{b.ingredientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.qty} {b.unit} • {formatPrice(b.costPerMl)}/ml
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatPrice(b.ingredientCost)}</p>
                          <p className="text-[11px] text-muted-foreground">{b.percentOfTotal.toFixed(0)}%</p>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Unit price: {formatPrice(Number(unitBottleCost) || 0)}/ml</span>
                        {b.servesPerBottle > 0 && <span>{b.servesPerBottle} servings/bottle</span>}
                        {totalServes > 0 && <span>{totalServes} total servings</span>}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
