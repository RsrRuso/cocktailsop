export type ServingRatioInput = {
  serving_ratio_ml?: number | null;
  bottle_ratio_ml?: number | null;
};

export function formatQty(qty: number): string {
  if (!Number.isFinite(qty)) return "0";
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}

function isBottleUnit(unit?: string | null): boolean {
  const u = String(unit || "").trim().toLowerCase();
  return ["bottle", "bot", "btl", "bottles"].includes(u);
}

function inferBottleMlFromLabel(label?: string | null): number | null {
  const s = String(label || "");

  // 700ML, 750 ml, 1000mL
  const ml = s.match(/(\d{2,4})\s*ml\b/i);
  if (ml?.[1]) return Number(ml[1]);

  // Some labels end up like "700L" where "ML" is truncated; treat big "L" numbers as ml.
  const bigL = s.match(/(\d{2,4})\s*l\b/i);
  if (bigL?.[1]) return Number(bigL[1]);

  // 70CL, 75 cl -> ml
  const cl = s.match(/(\d{1,3})\s*cl\b/i);
  if (cl?.[1]) return Number(cl[1]) * 10;

  // 1L, 1.0 L -> ml
  const l = s.match(/(\d+(?:\.\d+)?)\s*l\b/i);
  if (l?.[1]) {
    const liters = Number(l[1]);
    if (Number.isFinite(liters) && liters > 0 && liters <= 5) return Math.round(liters * 1000);
  }

  return null;
}

// Helper to detect if an item name suggests it's a spirit
export function isSpiritItem(label?: string | null): boolean {
  const s = String(label || "").toLowerCase();
  
  // Common spirit keywords
  const spiritKeywords = [
    'whisky', 'whiskey', 'vodka', 'gin', 'rum', 'tequila', 'brandy', 
    'cognac', 'bourbon', 'scotch', 'mezcal', 'liqueur', 'liquor',
    'vermouth', 'aperol', 'campari', 'amaretto', 'kahlua', 'baileys',
    'jagermeister', 'absinthe', 'sambuca', 'grappa', 'pisco',
    'chivas', 'johnnie walker', 'jw ', 'grey goose', 'absolut',
    'smirnoff', 'bacardi', 'captain morgan', 'havana club',
    'hendrick', 'tanqueray', 'bombay', 'beefeater', 'gordon',
    'patron', 'don julio', 'jose cuervo', 'hennessy', 'remy martin',
    'courvoisier', 'martell', 'jack daniel', 'jim beam', 'maker\'s mark',
    'wild turkey', 'woodford', 'bulleit', 'jameson', 'bushmills',
    'glenfiddich', 'glenlivet', 'macallan', 'laphroaig', 'ardbeg',
    'highland park', 'dalmore', 'oban', 'talisker', 'lagavulin'
  ];
  
  return spiritKeywords.some(keyword => s.includes(keyword));
}

export function getServingsDisplay(opts: {
  quantity: number;
  unit?: string | null;
  label?: string | null;
  ratio?: ServingRatioInput | null;
  defaultServingMl?: number;
  defaultBottleMl?: number;
  isSpirit?: boolean; // Explicit override - if provided, uses this; otherwise auto-detects
}): {
  displayQty: number;
  displayUnit: string;
  converted: boolean;
  servingsPerBottle?: number;
} {
  const quantity = Number(opts.quantity || 0);
  const unit = String(opts.unit || "");

  if (!isBottleUnit(unit)) {
    return { displayQty: quantity, displayUnit: unit || "unit", converted: false };
  }

  // Determine if this is a spirit item
  // If isSpirit is explicitly set, use that; otherwise auto-detect from label
  const treatAsSpirit = opts.isSpirit !== undefined 
    ? opts.isSpirit 
    : isSpiritItem(opts.label);

  // Only convert bottle to servings for spirit items
  if (!treatAsSpirit) {
    return { displayQty: quantity, displayUnit: unit || "unit", converted: false };
  }

  const servingMl = Number(opts.ratio?.serving_ratio_ml || opts.defaultServingMl || 30);
  const inferredBottleMl = inferBottleMlFromLabel(opts.label);
  const bottleMl = Number(opts.ratio?.bottle_ratio_ml || inferredBottleMl || opts.defaultBottleMl || 750);

  if (!Number.isFinite(servingMl) || servingMl <= 0 || !Number.isFinite(bottleMl) || bottleMl <= 0) {
    return { displayQty: quantity, displayUnit: unit || "unit", converted: false };
  }

  const servingsPerBottle = Math.floor(bottleMl / servingMl);
  if (servingsPerBottle <= 0) {
    return { displayQty: quantity, displayUnit: unit || "unit", converted: false };
  }

  const convertedQty = Number.isInteger(quantity)
    ? quantity * servingsPerBottle
    : Number((quantity * servingsPerBottle).toFixed(2));

  return {
    displayQty: convertedQty,
    displayUnit: "servings",
    converted: true,
    servingsPerBottle,
  };
}
