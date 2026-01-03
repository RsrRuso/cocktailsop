import { useMemo } from 'react';
import { detectBottleSizeMl } from '@/lib/bottleSize';
export interface RecipeIngredient {
  inventory_item_id: string;
  qty: number;
  unit: string;
  bottle_size?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  base_unit: string;
  unit_cost?: number;
  bottle_size_ml?: number;
  lab_ops_inventory_item_costs?: Array<{ unit_cost: number }>;
  totalStock?: number;
}

export interface CostBreakdown {
  ingredientName: string;
  qty: number;
  unit: string;
  bottleSize: number;
  costPerMl: number;
  ingredientCost: number;
  percentOfTotal: number;
  servesPerBottle: number;
}

export interface RecipeCostSummary {
  totalCost: number;
  costPerServe: number;
  breakdown: CostBreakdown[];
  suggestedPrice: number;
  suggestedPriceWithMarkup: (markupPercent: number) => number;
  foodCostPercent: (sellingPrice: number) => number;
  profitMargin: (sellingPrice: number) => number;
  profitAmount: (sellingPrice: number) => number;
  totalVolumeMl: number;
  servesPerBatch: number;
}

const UNIT_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  cl: 10,
  oz: 29.5735,
  dash: 0.9,
  drop: 0.05,
  tsp: 4.929,
  tbsp: 14.787,
  g: 1, // Approximation for solids
  kg: 1000,
  piece: 0, // Special handling
};

export function useRecipeCostCalculator(
  ingredients: RecipeIngredient[],
  inventoryItems: InventoryItem[],
  yieldQty: number = 1,
  defaultBottleSize: number = 750
): RecipeCostSummary {
  return useMemo(() => {
    let totalCost = 0;
    let totalVolumeMl = 0;
    const breakdown: CostBreakdown[] = [];

    for (const ing of ingredients) {
      if (!ing.inventory_item_id) continue;

      const invItem = inventoryItems.find(i => i.id === ing.inventory_item_id);
      if (!invItem) continue;

      const bottleSize =
        ing.bottle_size ||
        invItem.bottle_size_ml ||
        detectBottleSizeMl(invItem.name) ||
        defaultBottleSize;

      // Prefer inventory item unit_cost; fall back to related cost record
      const unitCostRaw =
        Number(invItem.unit_cost ?? 0) ||
        Number(invItem.lab_ops_inventory_item_costs?.[0]?.unit_cost ?? 0) ||
        0;

      // Convert unit_cost to per-ml cost:
      // - If base_unit is a measurable unit (ml/L/cl/etc), unit_cost is per base_unit
      // - Otherwise, treat unit_cost as per bottle and divide by bottle size
      const baseUnitKey = String(invItem.base_unit || '').toLowerCase();
      const baseUnitToMl = UNIT_TO_ML[baseUnitKey] || 0;
      const costPerMl = baseUnitToMl > 0 ? unitCostRaw / baseUnitToMl : (bottleSize > 0 ? unitCostRaw / bottleSize : 0);

      // Convert ingredient qty to ml
      const unitKey = String(ing.unit || '').toLowerCase();
      const unitMultiplier = UNIT_TO_ML[unitKey] || 1;
      const qtyInMl = unitKey === 'piece' ? 0 : ing.qty * unitMultiplier;

      // Calculate ingredient cost
      let ingredientCost = 0;
      if (unitKey === 'piece') {
        ingredientCost = unitCostRaw * ing.qty;
      } else {
        ingredientCost = qtyInMl * costPerMl;
      }

      // Calculate serves per bottle
      const servesPerBottle = qtyInMl > 0 ? Math.floor(bottleSize / qtyInMl) : 0;

      totalCost += ingredientCost;
      if (ing.unit !== 'piece') {
        totalVolumeMl += qtyInMl;
      }

      breakdown.push({
        ingredientName: invItem.name,
        qty: ing.qty,
        unit: ing.unit,
        bottleSize,
        costPerMl,
        ingredientCost,
        percentOfTotal: 0, // Will calculate after total is known
        servesPerBottle,
      });
    }

    // Calculate percentage of total for each ingredient
    for (const item of breakdown) {
      item.percentOfTotal = totalCost > 0 ? (item.ingredientCost / totalCost) * 100 : 0;
    }

    const costPerServe = yieldQty > 0 ? totalCost / yieldQty : totalCost;
    
    // Standard target food cost is 25-30% for beverages
    const targetFoodCostPercent = 0.28;
    const suggestedPrice = costPerServe / targetFoodCostPercent;

    return {
      totalCost,
      costPerServe,
      breakdown,
      suggestedPrice,
      suggestedPriceWithMarkup: (markupPercent: number) => costPerServe * (1 + markupPercent / 100),
      foodCostPercent: (sellingPrice: number) => sellingPrice > 0 ? (costPerServe / sellingPrice) * 100 : 0,
      profitMargin: (sellingPrice: number) => sellingPrice > 0 ? ((sellingPrice - costPerServe) / sellingPrice) * 100 : 0,
      profitAmount: (sellingPrice: number) => sellingPrice - costPerServe,
      totalVolumeMl,
      servesPerBatch: yieldQty,
    };
  }, [ingredients, inventoryItems, yieldQty, defaultBottleSize]);
}

// Helper to format currency consistently
export function formatCost(value: number, currency: string = 'AED'): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Calculate depletion from inventory based on recipe
export function calculateDepletion(
  recipeIngredients: RecipeIngredient[],
  inventoryItems: InventoryItem[],
  servesToProduce: number
): Array<{
  itemId: string;
  itemName: string;
  currentStock: number;
  requiredAmount: number;
  unit: string;
  isStockSufficient: boolean;
  remainingAfter: number;
}> {
  return recipeIngredients.map(ing => {
    const invItem = inventoryItems.find(i => i.id === ing.inventory_item_id);
    const currentStock = invItem?.totalStock || 0;
    const requiredAmount = ing.qty * servesToProduce;
    
    return {
      itemId: ing.inventory_item_id,
      itemName: invItem?.name || 'Unknown',
      currentStock,
      requiredAmount,
      unit: ing.unit,
      isStockSufficient: currentStock >= requiredAmount,
      remainingAfter: currentStock - requiredAmount,
    };
  });
}
