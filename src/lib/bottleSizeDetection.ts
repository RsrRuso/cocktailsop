/**
 * Bottle Size Detection Utility
 * Auto-detects bottle size in ml from product names
 * Used for spirit serving calculations (30ml per serving)
 */

export const STANDARD_POUR_ML = 30;

// Common bottle size patterns
const BOTTLE_SIZE_PATTERNS: { pattern: RegExp; ml: number }[] = [
  // Explicit ml patterns
  { pattern: /\b(\d{3,4})\s*ml\b/i, ml: 0 }, // Dynamic: extracts number
  { pattern: /\b50\s*ml\b/i, ml: 50 },
  { pattern: /\b100\s*ml\b/i, ml: 100 },
  { pattern: /\b200\s*ml\b/i, ml: 200 },
  { pattern: /\b350\s*ml\b/i, ml: 350 },
  { pattern: /\b375\s*ml\b/i, ml: 375 },
  { pattern: /\b500\s*ml\b/i, ml: 500 },
  { pattern: /\b700\s*ml\b/i, ml: 700 },
  { pattern: /\b750\s*ml\b/i, ml: 750 },
  { pattern: /\b1000\s*ml\b/i, ml: 1000 },
  { pattern: /\b1500\s*ml\b/i, ml: 1500 },
  { pattern: /\b1750\s*ml\b/i, ml: 1750 },
  
  // CL patterns (centiliters)
  { pattern: /\b35\s*cl\b/i, ml: 350 },
  { pattern: /\b50\s*cl\b/i, ml: 500 },
  { pattern: /\b70\s*cl\b/i, ml: 700 },
  { pattern: /\b75\s*cl\b/i, ml: 750 },
  { pattern: /\b100\s*cl\b/i, ml: 1000 },
  
  // Liter patterns
  { pattern: /\b1\.5\s*L\b/i, ml: 1500 },
  { pattern: /\b1\.75\s*L\b/i, ml: 1750 },
  { pattern: /\b1\s*L\b/i, ml: 1000 },
  { pattern: /\b0\.5\s*L\b/i, ml: 500 },
  { pattern: /\b0\.7\s*L\b/i, ml: 700 },
  { pattern: /\b0\.75\s*L\b/i, ml: 750 },
  
  // Alternative formats
  { pattern: /\b1LTR?\b/i, ml: 1000 },
  { pattern: /\b1 Liter\b/i, ml: 1000 },
  { pattern: /\b1 Litre\b/i, ml: 1000 },
];

// Spirit category keywords
const SPIRIT_KEYWORDS = [
  'vodka', 'gin', 'rum', 'whisky', 'whiskey', 'tequila', 'mezcal',
  'brandy', 'cognac', 'bourbon', 'scotch', 'rye', 'vermouth',
  'liqueur', 'liquor', 'absinthe', 'schnapps', 'amaretto',
  'campari', 'aperol', 'cointreau', 'triple sec', 'kahlua',
  'baileys', 'sambuca', 'grappa', 'pisco', 'cachaca', 'soju',
  'sake', 'wine', 'champagne', 'prosecco', 'sherry', 'port',
  'beer', 'cider', 'cordial', 'bitters', 'angostura'
];

/**
 * Detects bottle size from product name
 * @param name Product name to analyze
 * @returns Detected bottle size in ml, or null if not detectable
 */
export function detectBottleSizeFromName(name: string): number | null {
  if (!name) return null;
  
  // First, try to extract explicit ml value
  const mlMatch = name.match(/\b(\d{2,4})\s*ml\b/i);
  if (mlMatch) {
    const ml = parseInt(mlMatch[1], 10);
    if (ml >= 50 && ml <= 3000) {
      return ml;
    }
  }
  
  // Try CL match
  const clMatch = name.match(/\b(\d{2,3})\s*cl\b/i);
  if (clMatch) {
    const cl = parseInt(clMatch[1], 10);
    if (cl >= 5 && cl <= 300) {
      return cl * 10; // Convert cl to ml
    }
  }
  
  // Try liter patterns
  for (const { pattern, ml } of BOTTLE_SIZE_PATTERNS) {
    if (pattern.test(name) && ml > 0) {
      return ml;
    }
  }
  
  return null;
}

/**
 * Checks if a product is likely a spirit based on name/category
 */
export function isLikelySpirit(name: string, category?: string | null): boolean {
  const lowerName = name.toLowerCase();
  const lowerCategory = (category || '').toLowerCase();
  
  // Check category first
  if (lowerCategory.includes('spirit') || lowerCategory.includes('liquor') || 
      lowerCategory.includes('alcohol') || lowerCategory.includes('beverage')) {
    return true;
  }
  
  // Check name for spirit keywords
  return SPIRIT_KEYWORDS.some(keyword => lowerName.includes(keyword));
}

/**
 * Calculate servings from bottle quantity and size
 * @param bottles Number of bottles
 * @param bottleSizeMl Bottle size in ml
 * @param pourMl Pour size per serving (default 30ml)
 */
export function calculateServings(bottles: number, bottleSizeMl: number, pourMl = STANDARD_POUR_ML): number {
  if (!bottles || !bottleSizeMl || bottleSizeMl <= 0) return 0;
  const totalMl = bottles * bottleSizeMl;
  return Math.floor(totalMl / pourMl);
}

/**
 * Calculate total ml from bottles and bottle size
 */
export function bottlesToMl(bottles: number, bottleSizeMl: number): number {
  return bottles * bottleSizeMl;
}

/**
 * Calculate bottles from total ml
 */
export function mlToBottles(totalMl: number, bottleSizeMl: number): number {
  if (!bottleSizeMl || bottleSizeMl <= 0) return 0;
  return totalMl / bottleSizeMl;
}

/**
 * Format bottle size for display
 */
export function formatBottleSize(ml: number | null | undefined): string {
  if (!ml) return '-';
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1)}L`;
  }
  return `${ml}ml`;
}
