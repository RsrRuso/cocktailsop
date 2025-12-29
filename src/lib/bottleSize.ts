export function detectBottleSizeMl(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = String(text).toLowerCase();

  // Match patterns like 700ml, 75cl, 1l, 1.5l, etc.
  const re = /(\d+(?:\.\d+)?)\s*(ml|cl|l|lt|ltr|liter|litre)\b/gi;
  let best: number | null = null;
  let m: RegExpExecArray | null;

  while ((m = re.exec(s))) {
    const value = Number(m[1]);
    const unit = m[2];
    if (!Number.isFinite(value)) continue;

    let ml = 0;
    if (unit === 'ml') ml = value;
    else if (unit === 'cl') ml = value * 10;
    else ml = value * 1000; // l, lt, ltr, liter, litre

    // Prefer the largest plausible bottle volume found
    if (!best || ml > best) best = ml;
  }

  // Common shorthand like 70CL without space is already captured by regex.
  if (!best) return null;

  // Clamp to sensible range and round
  const rounded = Math.round(best);
  if (rounded < 50 || rounded > 5000) return null;
  return rounded;
}
