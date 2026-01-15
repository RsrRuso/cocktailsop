// Centralized unit utilities for consistent display and conversion across the app

export const AVAILABLE_UNITS = [
  { value: "ml", label: "ml", fullLabel: "milliliters" },
  { value: "L", label: "L", fullLabel: "liters" },
  { value: "cl", label: "cl", fullLabel: "centiliters" },
  { value: "oz", label: "oz", fullLabel: "fluid ounces" },
  { value: "g", label: "g", fullLabel: "grams" },
  { value: "kg", label: "kg", fullLabel: "kilograms" },
  { value: "piece", label: "pc", fullLabel: "pieces" },
  { value: "each", label: "ea", fullLabel: "each" },
] as const;

export type UnitValue = typeof AVAILABLE_UNITS[number]["value"];

// Conversion factors to base unit (ml for liquids, g for solids)
export const UNIT_TO_BASE: Record<string, number> = {
  ml: 1,
  l: 1000,
  L: 1000,
  cl: 10,
  oz: 29.5735,
  g: 1,
  kg: 1000,
  piece: 0,
  pc: 0,
  each: 0,
  ea: 0,
  dash: 0.9,
  drop: 0.05,
  tsp: 4.929,
  tbsp: 14.787,
};

/**
 * Format a size value with its unit for display
 */
export function formatSizeWithUnit(size: number, unit?: string | null): string {
  const u = unit || "ml";
  return `${size}${u}`;
}

/**
 * Convert a quantity from one unit to ml (or g for weight units)
 */
export function convertToBase(qty: number, unit: string): number {
  const u = String(unit || "ml").toLowerCase();
  const mult = UNIT_TO_BASE[u] ?? 1;
  if (u === "piece" || u === "pc" || u === "each" || u === "ea") return 0;
  return (Number(qty) || 0) * mult;
}

/**
 * Get the display label for a unit
 */
export function getUnitLabel(unit?: string | null): string {
  const found = AVAILABLE_UNITS.find(u => u.value.toLowerCase() === (unit || "ml").toLowerCase());
  return found?.label || unit || "ml";
}

/**
 * Check if a unit is a weight unit
 */
export function isWeightUnit(unit?: string | null): boolean {
  const u = (unit || "").toLowerCase();
  return u === "g" || u === "kg";
}

/**
 * Check if a unit is a volume unit
 */
export function isVolumeUnit(unit?: string | null): boolean {
  const u = (unit || "").toLowerCase();
  return u === "ml" || u === "l" || u === "cl" || u === "oz";
}

/**
 * Check if a unit is a countable unit
 */
export function isCountableUnit(unit?: string | null): boolean {
  const u = (unit || "").toLowerCase();
  return u === "piece" || u === "pc" || u === "each" || u === "ea";
}
