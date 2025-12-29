import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, X } from "lucide-react";
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
  lab_ops_inventory_item_costs?: Array<{ unit_cost: number | null }> | null;
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

function isBottleUnit(unit?: string | null) {
  const u = (unit || "").toLowerCase();
  return u.includes("bottle") || u === "bot" || u === "btl" || u === "btls" || u === "bottles";
}

export function RecipeIngredientEditorRow({
  ing,
  idx,
  inventoryItems,
  onChange,
  onRemove,
  onSaveUnitCostPerMl,
  savingCostItemId,
}: {
  ing: RecipeIngredientDraft;
  idx: number;
  inventoryItems: InventoryItem[];
  onChange: (index: number, field: keyof RecipeIngredientDraft, value: any) => void;
  onRemove: (index: number) => void;
  onSaveUnitCostPerMl: (inventoryItemId: string, unitCostPerMl: number) => Promise<void>;
  savingCostItemId: string | null;
}) {
  const { formatPrice } = useCurrency();
  const invItem = useMemo(() => inventoryItems.find((i) => i.id === ing.itemId), [inventoryItems, ing.itemId]);

  const existingUnitCostPerMl = Number(invItem?.lab_ops_inventory_item_costs?.[0]?.unit_cost || 0);

  const [costInput, setCostInput] = useState<string>(existingUnitCostPerMl ? String(existingUnitCostPerMl) : "");

  useEffect(() => {
    const next = Number(invItem?.lab_ops_inventory_item_costs?.[0]?.unit_cost || 0);
    setCostInput(next ? String(next) : "");
  }, [invItem?.id]);

  const bottleSize = Number(ing.bottle_size || 750);
  const unitMultiplier = UNIT_TO_ML[ing.unit] || 1;
  const qtyInMl = ing.unit === "piece" ? 0 : Number(ing.qty || 0) * unitMultiplier;

  const ingredientCost = ing.unit === "piece" ? 0 : qtyInMl * (existingUnitCostPerMl || 0);
  const servesPerBottle = qtyInMl > 0 ? Math.floor(bottleSize / qtyInMl) : 0;

  const stock = Number(invItem?.totalStock || 0);
  const totalServes = useMemo(() => {
    if (!invItem || !stock) return 0;

    if (ing.unit === "piece") {
      const perServe = Number(ing.qty || 0) > 0 ? Number(ing.qty) : 1;
      return Math.floor(stock / perServe);
    }

    if (qtyInMl <= 0) return 0;

    // If stock is tracked as bottles (common when base_unit is bottle), convert to ml using bottle size.
    if (isBottleUnit(invItem.base_unit)) {
      return Math.floor((stock * bottleSize) / qtyInMl);
    }

    // Otherwise assume stock is stored in ml already.
    return Math.floor(stock / qtyInMl);
  }, [invItem, stock, ing.unit, ing.qty, qtyInMl, bottleSize]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Select value={ing.itemId} onValueChange={(v) => onChange(idx, "itemId", v)}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Select from stock" /></SelectTrigger>
          <SelectContent>
            {inventoryItems.map((inv) => (
              <SelectItem key={inv.id} value={inv.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span>{inv.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {inv.lab_ops_inventory_item_costs?.[0]?.unit_cost
                      ? `${Number(inv.lab_ops_inventory_item_costs?.[0]?.unit_cost).toFixed(4)}/ml`
                      : "No unit cost"}
                  </span>
                </div>
              </SelectItem>
            ))}
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
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="kg">kg</SelectItem>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="L">L</SelectItem>
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

      {/* Unit price + costing */}
      {ing.itemId && ing.unit !== "piece" && (
        <div className="rounded-lg border bg-muted/20 p-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={existingUnitCostPerMl > 0 ? "secondary" : "destructive"}>
                Unit price: {existingUnitCostPerMl > 0 ? `${existingUnitCostPerMl.toFixed(4)}/ml` : "missing"}
              </Badge>
              {servesPerBottle > 0 && <span className="text-xs text-muted-foreground">{servesPerBottle} servings/bottle</span>}
              {totalServes > 0 && <span className="text-xs text-muted-foreground">{totalServes} total servings</span>}
            </div>
            <div className="text-sm font-semibold">Cost: {formatPrice(ingredientCost)}</div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              step="0.0001"
              inputMode="decimal"
              placeholder="Set unit price per ml"
              className="w-48"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!ing.itemId || !(parseFloat(costInput) > 0) || savingCostItemId === ing.itemId}
              onClick={async () => {
                const val = parseFloat(costInput);
                if (!ing.itemId || !(val > 0)) return;
                await onSaveUnitCostPerMl(ing.itemId, val);
              }}
            >
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      )}

      {/* If piece: still allow cost per unit to be set via ml field? keep simple */}
      {ing.itemId && ing.unit === "piece" && (
        <div className="text-xs text-muted-foreground">
          Piece-based items are not costed in ml here. If you need piece costing, tell me and I’ll enable it.
        </div>
      )}
    </div>
  );
}
