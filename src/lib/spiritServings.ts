/**
 * Spirit Servings Calculator
 * 
 * Simple flow:
 * 1. PO Receiving stores items as BOTTLES (e.g., 6 bottles)
 * 2. Inventory: Spirit items → bottles × bottle_ml ÷ 30 = servings
 * 3. Staff POS: Show servings, deduct from stock on sale
 */

// Standard bottle sizes in ml
export const BOTTLE_SIZES = {
  SMALL: 500,
  STANDARD: 700,
  WINE: 750,
  LITRE: 1000,
} as const;

// Standard pour size in ml
export const POUR_SIZE_ML = 30;

/**
 * Detect bottle size from item name/label
 * Looks for patterns like: 750ml, 750ML, 70CL, 1L, etc.
 */
export function detectBottleSizeMl(itemName: string): number {
  const name = String(itemName || '').toLowerCase();
  
  // Match "1000ml" or "1000 ml"
  const ml1000 = name.match(/1000\s*ml/i);
  if (ml1000) return 1000;
  
  // Match "750ml" or "750 ml" or "75cl"
  const ml750 = name.match(/750\s*ml/i) || name.match(/75\s*cl/i);
  if (ml750) return 750;
  
  // Match "700ml" or "700 ml" or "70cl"
  const ml700 = name.match(/700\s*ml/i) || name.match(/70\s*cl/i);
  if (ml700) return 700;
  
  // Match "500ml" or "500 ml" or "50cl"
  const ml500 = name.match(/500\s*ml/i) || name.match(/50\s*cl/i);
  if (ml500) return 500;
  
  // Match "1L" or "1 L" or "1l"
  const litre = name.match(/\b1\s*l\b/i);
  if (litre) return 1000;
  
  // Default to 750ml (most common spirit bottle)
  return 750;
}

/**
 * Calculate total servings from bottles
 * Formula: bottles × bottle_ml ÷ 30ml = servings
 */
export function bottlesToServings(
  bottleQty: number,
  bottleSizeMl: number = 750,
  pourSizeMl: number = POUR_SIZE_ML
): number {
  if (!Number.isFinite(bottleQty) || bottleQty <= 0) return 0;
  if (!Number.isFinite(bottleSizeMl) || bottleSizeMl <= 0) return 0;
  if (!Number.isFinite(pourSizeMl) || pourSizeMl <= 0) return 0;
  
  const totalMl = bottleQty * bottleSizeMl;
  return Math.floor(totalMl / pourSizeMl);
}

/**
 * Calculate bottle fraction to deduct for one serving
 * Formula: pour_ml ÷ bottle_ml = bottles to deduct
 */
export function servingsToBottles(
  servings: number,
  bottleSizeMl: number = 750,
  pourSizeMl: number = POUR_SIZE_ML
): number {
  if (!Number.isFinite(servings) || servings <= 0) return 0;
  if (!Number.isFinite(bottleSizeMl) || bottleSizeMl <= 0) return 0;
  if (!Number.isFinite(pourSizeMl) || pourSizeMl <= 0) return 0;
  
  // Each serving uses pourSizeMl from the bottle
  const mlUsed = servings * pourSizeMl;
  return mlUsed / bottleSizeMl;
}

/**
 * Check if category name indicates a spirit
 */
export function isSpiritCategory(categoryName: string | null | undefined): boolean {
  const name = String(categoryName || '').toLowerCase().trim();
  return name === 'spirits' || name === 'spirit';
}

/**
 * Format servings display for UI
 * Shows: "25 servings" or "OUT" if 0
 */
export function formatServingsDisplay(servings: number): { text: string; color: 'green' | 'amber' | 'red' } {
  if (!Number.isFinite(servings) || servings <= 0) {
    return { text: 'OUT', color: 'red' };
  }
  if (servings <= 5) {
    return { text: `${servings}`, color: 'amber' };
  }
  return { text: `${servings}`, color: 'green' };
}
