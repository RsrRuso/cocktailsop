import type { PurchaseOrderItemInput } from './types';

function toNumber(v: string): number {
  const n = Number(String(v).trim().replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function splitLine(line: string): string[] {
  // Try tab first (common in spreadsheet copy), else CSV-ish, else multiple spaces.
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim()).filter(Boolean);
  if (line.includes(',')) return line.split(',').map((s) => s.trim()).filter(Boolean);
  return line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Parses freeform text into PO items.
 *
 * Supported formats per line:
 * - "Item name<TAB>qty<TAB>unit price"
 * - "Item name, qty, unit price"
 * - "Item name  qty  unit price" (2+ spaces)
 *
 * If only 1 column is found, it becomes item_name with qty=1, price=0.
 */
export function parsePurchaseOrderItems(text: string): PurchaseOrderItemInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: PurchaseOrderItemInput[] = [];
  for (const line of lines) {
    const cols = splitLine(line);
    if (cols.length === 0) continue;
    if (cols.length === 1) {
      out.push({ item_name: cols[0], item_code: '', quantity: 1, price_per_unit: 0 });
      continue;
    }

    // Heuristic: first col is name; last two are qty/price (or price/qty)
    const name = cols[0];
    const a = cols[cols.length - 2];
    const b = cols[cols.length - 1];
    const na = toNumber(a);
    const nb = toNumber(b);

    // If one looks like an integer-ish qty and the other looks like money, guess qty then price.
    const aIsQty = Number.isFinite(na) && na > 0 && Math.abs(na - Math.round(na)) < 1e-9;
    const bIsQty = Number.isFinite(nb) && nb > 0 && Math.abs(nb - Math.round(nb)) < 1e-9;

    let qty = 1;
    let price = 0;
    if (aIsQty && !bIsQty) {
      qty = na;
      price = nb;
    } else if (bIsQty && !aIsQty) {
      qty = nb;
      price = na;
    } else {
      qty = na || 1;
      price = nb || 0;
    }

    out.push({
      item_name: name,
      item_code: '',
      quantity: qty,
      price_per_unit: price,
    });
  }

  return out.filter((i) => i.item_name.trim().length > 0);
}

