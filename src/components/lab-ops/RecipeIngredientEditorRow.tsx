import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export type RecipeIngredientDraft = {
  itemId: string;
  qty: number;
  unit: string;
  bottle_size?: number;
};

type InventoryItem = {
  id: string;
  name: string;
  base_unit?: string | null;
  totalStock?: number | null;
  unit_cost?: number | null; // Per bottle price from receiving PO
  bottle_size_ml?: number | null;
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

export function RecipeIngredientEditorRow({
  ing,
  idx,
  inventoryItems,
  onChange,
  onRemove,
}: {
  ing: RecipeIngredientDraft;
  idx: number;
  inventoryItems: InventoryItem[];
  onChange: (index: number, field: keyof RecipeIngredientDraft, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const { formatPrice } = useCurrency();
  const invItem = useMemo(() => inventoryItems.find((i) => i.id === ing.itemId), [inventoryItems, ing.itemId]);

  // Unit cost per bottle from receiving PO / inventory
  const unitCostPerBottle = Number(invItem?.unit_cost || 0);
  const bottleSize = Number(ing.bottle_size || invItem?.bottle_size_ml || 750);
  
  // Cost per ml = bottle price / bottle size
  const costPerMl = bottleSize > 0 ? unitCostPerBottle / bottleSize : 0;

  const unitMultiplier = UNIT_TO_ML[ing.unit] || 1;
  const qtyInMl = ing.unit === "piece" ? 0 : Number(ing.qty || 0) * unitMultiplier;

  const ingredientCost = ing.unit === "piece" ? 0 : qtyInMl * costPerMl;
  const servesPerBottle = qtyInMl > 0 ? Math.floor(bottleSize / qtyInMl) : 0;

  const stock = Number(invItem?.totalStock || 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Select value={ing.itemId} onValueChange={(v) => onChange(idx, "itemId", v)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select from stock" />
          </SelectTrigger>
          <SelectContent>
            {inventoryItems.map((inv) => {
              const invBottleSize = Number(inv.bottle_size_ml || 750);
              const invUnitCost = Number(inv.unit_cost || 0);
              const perMl = invBottleSize > 0 ? invUnitCost / invBottleSize : 0;
              
              return (
                <SelectItem key={inv.id} value={inv.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span>{inv.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {invUnitCost > 0 ? `${formatPrice(invUnitCost)}/bottle` : "No price"}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Input
          type="number"
          step="0.01"
          placeholder="Qty"
          className="w-20"
          value={ing.qty}
          onChange={(e) => onChange(idx, "qty", parseFloat(e.target.value) || 0)}
        />

        <Select value={ing.unit} onValueChange={(v) => onChange(idx, "unit", v)}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="piece">pc</SelectItem>
            <SelectItem value="dash">dash</SelectItem>
          </SelectContent>
        </Select>

        {ing.unit !== "piece" && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="1"
              placeholder="750"
              className="w-20"
              value={bottleSize}
              onChange={(e) => onChange(idx, "bottle_size", parseFloat(e.target.value) || 750)}
            />
            <span className="text-xs text-muted-foreground">ml</span>
          </div>
        )}

        <Button size="icon" variant="ghost" onClick={() => onRemove(idx)} aria-label="Remove ingredient">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Unit price + costing summary */}
      {ing.itemId && ing.unit !== "piece" && (
        <div className="rounded-lg border bg-muted/20 p-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={unitCostPerBottle > 0 ? "secondary" : "destructive"}>
                Unit cost: {unitCostPerBottle > 0 ? formatPrice(unitCostPerBottle) : "missing"}
              </Badge>
              <span className="text-amber-500 text-xs font-medium">{servesPerBottle} servings/bottle</span>
            </div>
            <div className="text-sm font-semibold">
              Cost: <span className="text-primary">{formatPrice(ingredientCost)}</span>
            </div>
          </div>
          {stock > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Stock: {stock} {invItem?.base_unit || "units"}
            </p>
          )}
        </div>
      )}

      {ing.itemId && ing.unit === "piece" && (
        <div className="text-xs text-muted-foreground">
          Piece-based items use fixed unit cost if available.
        </div>
      )}
    </div>
  );
}
