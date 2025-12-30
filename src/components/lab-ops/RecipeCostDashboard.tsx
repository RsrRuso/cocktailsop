import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { detectBottleSizeMl } from "@/lib/bottleSize";

type InventoryItem = {
  id: string;
  name: string;
  bottle_size_ml?: number | null;
  base_unit?: string | null;
  totalStock?: number | null;
  unit_cost?: number | null; // Per bottle price from receiving PO
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

export function RecipeCostDashboard({
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
  const { formatPrice, currency } = useCurrency();
  
  // Pricing config state
  const [markupPct, setMarkupPct] = useState(400);
  const [vatPct, setVatPct] = useState(5);
  const [servicePct, setServicePct] = useState(15);
  const [manualPrice, setManualPrice] = useState<string>("");

  const yieldQty = Number(recipe.yield_qty || 1);

  // Calculate ingredient costs using unit_cost from inventory (per bottle) and bottle_size_ml
  const { totalCost, breakdown } = useMemo(() => {
    const ingredients = recipe.lab_ops_recipe_ingredients || [];
    let total = 0;
    const bd: Array<{
      name: string;
      qty: number;
      unit: string;
      bottleSize: number;
      unitCostPerBottle: number;
      costPerMl: number;
      ingredientCost: number;
      servingsPerBottle: number;
      totalStock: number;
      stockUnit: string;
    }> = [];

    for (const ing of ingredients) {
      if (!ing.inventory_item_id) continue;

      const invItem = inventoryItems.find((i) => i.id === ing.inventory_item_id);
      if (!invItem) continue;

      const qty = Number(ing.qty || 0);
      const unit = ing.unit || "ml";
      const unitMult = UNIT_TO_ML[unit] || 1;
      const qtyMl = unit === "piece" ? 0 : qty * unitMult;
      // Bottle size: auto-detect from item name or inventory value (not editable)
      const detected = detectBottleSizeMl(invItem.name);
      const bottleSize = Number(invItem.bottle_size_ml || detected || 750);

      // Unit cost is per bottle from receiving PO / inventory
      const unitCostPerBottle = Number(invItem.unit_cost || 0);

      // Calculate cost per ml
      const costPerMl = bottleSize > 0 ? unitCostPerBottle / bottleSize : 0;

      // Ingredient cost for this recipe serve
      const ingredientCost = unit === "piece" ? 0 : qtyMl * costPerMl;

      // Servings per bottle
      const servingsPerBottle = qtyMl > 0 ? Math.floor(bottleSize / qtyMl) : 0;

      total += ingredientCost;

      bd.push({
        name: invItem.name,
        qty,
        unit,
        bottleSize,
        unitCostPerBottle,
        costPerMl,
        ingredientCost,
        servingsPerBottle,
        totalStock: Number(invItem.totalStock || 0),
        stockUnit: invItem.base_unit || "btl",
      });
    }

    return { totalCost: total, breakdown: bd };
  }, [recipe.lab_ops_recipe_ingredients, inventoryItems]);

  const costPerServe = yieldQty > 0 ? totalCost / yieldQty : totalCost;

  // Calculate suggested selling price
  const markupAmount = costPerServe * (markupPct / 100);
  const subtotal = costPerServe + markupAmount;
  const vatAmount = subtotal * (vatPct / 100);
  const serviceAmount = subtotal * (servicePct / 100);
  const suggestedPrice = subtotal + vatAmount + serviceAmount;

  const finalPrice = manualPrice ? parseFloat(manualPrice) : suggestedPrice;
  const profit = finalPrice - costPerServe;
  const foodCostPct = finalPrice > 0 ? (costPerServe / finalPrice) * 100 : 0;

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{recipe.menu_item?.name || "Unnamed recipe"}</h3>
            <p className="text-sm text-muted-foreground">
              Version {recipe.version_number || 1} • Yield: {yieldQty}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ingredients breakdown */}
        {breakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Ingredients:</p>
            {breakdown.map((b, idx) => {
              const totalServings = Math.floor(b.totalStock * b.servingsPerBottle);
              return (
                <div key={idx} className="rounded-lg border bg-card/50 p-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{b.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {b.totalStock.toFixed(2)} {b.stockUnit}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.qty} {b.unit} @ {b.bottleSize}ml bottle
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary">{formatPrice(b.ingredientCost)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>Unit cost: {formatPrice(b.unitCostPerBottle)}</span>
                    <span className="text-amber-500 font-medium">{b.servingsPerBottle} servings/bottle</span>
                  </div>
                  {/* Total servings = bottles × servings/bottle */}
                  <div className="text-xs font-semibold text-emerald-500">
                    Total: {totalServings} servings ({b.totalStock.toFixed(2)} btl × {b.servingsPerBottle})
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cost calculation dashboard - matching reference design */}
        <div className="rounded-xl border-2 border-destructive/30 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Self Cost</span>
            <span className="text-xl font-bold text-destructive">{formatPrice(costPerServe)}</span>
          </div>

          {/* Markup / VAT / Service inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Markup %</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">VAT %</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={vatPct}
                  onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Service %</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={servicePct}
                  onChange={(e) => setServicePct(parseFloat(e.target.value) || 0)}
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Markup ({markupPct}%)</span>
              <span>{formatPrice(markupAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({vatPct}%)</span>
              <span>{formatPrice(vatAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service ({servicePct}%)</span>
              <span>{formatPrice(serviceAmount)}</span>
            </div>
          </div>

          {/* Suggested selling price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold">Suggested Selling Price</span>
            <span className="text-xl font-bold text-emerald-500">{formatPrice(suggestedPrice)}</span>
          </div>

          {/* Manual override */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Manual Selling Price (Optional)
            </Label>
            <p className="text-[10px] text-muted-foreground mb-1">Override the suggested price with your own</p>
            <Input
              type="number"
              step="0.01"
              placeholder={suggestedPrice.toFixed(2)}
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {/* Bottom summary bar */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Cost</p>
            <p className="text-sm font-semibold">{formatPrice(costPerServe)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Price</p>
            <p className="text-sm font-semibold">{formatPrice(finalPrice)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Profit</p>
            <p className={`text-sm font-semibold ${profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {formatPrice(profit)}
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Food %</p>
            <p className={`text-sm font-semibold ${foodCostPct > 35 ? "text-destructive" : "text-emerald-500"}`}>
              {foodCostPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
