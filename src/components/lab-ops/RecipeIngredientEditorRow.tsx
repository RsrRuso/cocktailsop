import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { detectBottleSizeMl } from "@/lib/bottleSize";
import { costPerMlFromUnitCost, qtyToMl } from "@/lib/labOpsCosting";

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
  unit_cost?: number | null;
  bottle_size_ml?: number | null;
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

  // Bottle size: auto-detect from item name or use inventory value
  const bottleSize = useMemo(() => {
    if (!invItem) return 750;
    const detected = detectBottleSizeMl(invItem.name);
    return Number(invItem.bottle_size_ml || detected || 750);
  }, [invItem]);

  const unitCostPerUnit = Number(invItem?.unit_cost || 0);

  const qtyInMl = qtyToMl(Number(ing.qty || 0), ing.unit);
  const costPerMl = costPerMlFromUnitCost({
    unitCost: unitCostPerUnit,
    baseUnit: invItem?.base_unit,
    bottleSizeMl: bottleSize,
  });

  const ingredientCost = ing.unit === "piece" ? unitCostPerUnit * Number(ing.qty || 0) : qtyInMl * costPerMl;
  const servesPerBottle = qtyInMl > 0 ? Math.floor(bottleSize / qtyInMl) : 0;

  const stock = Number(invItem?.totalStock || 0);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center flex-wrap">
        {/* Item selector */}
        <Select value={ing.itemId} onValueChange={(v) => onChange(idx, "itemId", v)}>
          <SelectTrigger className="flex-1 min-w-[120px]">
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent>
            {inventoryItems.map((inv) => (
              <SelectItem key={inv.id} value={inv.id}>
                {inv.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Stock badge */}
        {ing.itemId && (
          <Badge variant={stock > 0 ? "secondary" : "destructive"} className="text-xs shrink-0">
            ({stock} {invItem?.base_unit || "BOT"})
          </Badge>
        )}

        {/* Quantity input */}
        <Input
          type="number"
          step="0.01"
          placeholder="Qty"
          className="w-16"
          value={ing.qty}
          onChange={(e) => onChange(idx, "qty", parseFloat(e.target.value) || 0)}
        />

        {/* Unit selector */}
        <Select value={ing.unit} onValueChange={(v) => onChange(idx, "unit", v)}>
          <SelectTrigger className="w-16">
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

        {/* Auto-detected bottle size (read-only display) */}
        {ing.unit !== "piece" && ing.itemId && (
          <span className="text-xs text-muted-foreground shrink-0">{bottleSize}ml</span>
        )}

        <Button size="icon" variant="ghost" onClick={() => onRemove(idx)} aria-label="Remove ingredient">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Unit price + costing summary */}
      {ing.itemId && ing.unit !== "piece" && (
        <div className="flex flex-wrap items-center gap-2 justify-between text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">
              Unit cost: {unitCostPerUnit > 0 ? formatPrice(unitCostPerUnit) : <span className="text-destructive">missing</span>}
            </span>
            <span className="text-amber-500 font-medium">{servesPerBottle} servings/bottle</span>
           </div>
           <span className="font-semibold">
             Cost: <span className="text-primary">{formatPrice(ingredientCost)}</span>
           </span>
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
