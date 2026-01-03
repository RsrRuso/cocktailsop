// Centralized Lab Ops recipe costing helpers
// Keeps unit conversion + unit cost interpretation consistent across UI.

export const UNIT_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  cl: 10,
  oz: 29.5735,
  dash: 0.9,
  drop: 0.05,
  tsp: 4.929,
  tbsp: 14.787,
  g: 1, // approximation for solids
  kg: 1000,
  piece: 0,
  pc: 0,
};

export function qtyToMl(qty: number, unit: string): number {
  const u = String(unit || "").toLowerCase();
  const mult = UNIT_TO_ML[u] ?? 1;
  if (u === "piece" || u === "pc") return 0;
  return (Number(qty) || 0) * mult;
}

/**
 * Converts an inventory unit_cost into per-ml cost.
 * - If base_unit is a liquid unit (ml/L/cl/oz/etc) we treat unit_cost as "per base_unit".
 * - Otherwise (BOT/bottle/unit/empty) we treat unit_cost as "per bottle" and divide by bottle size.
 */
export function costPerMlFromUnitCost(args: {
  unitCost: number;
  baseUnit?: string | null;
  bottleSizeMl: number;
}): number {
  const unitCost = Number(args.unitCost) || 0;
  if (unitCost <= 0) return 0;

  const base = String(args.baseUnit || "").toLowerCase();
  const bottleSizeMl = Number(args.bottleSizeMl) || 0;

  // Base unit is a convertible volume/weight unit -> interpret unit_cost as per base unit.
  if (base && UNIT_TO_ML[base] && UNIT_TO_ML[base] > 0) {
    return unitCost / UNIT_TO_ML[base];
  }

  // Otherwise interpret unit_cost as per bottle/unit.
  return bottleSizeMl > 0 ? unitCost / bottleSizeMl : 0;
}
