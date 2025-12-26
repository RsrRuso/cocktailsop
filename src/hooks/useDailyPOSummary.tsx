import { useMemo } from 'react';
import { format, startOfDay } from 'date-fns';

export interface POSummaryItem {
  item_code: string;
  item_name: string;
  unit: string;
  quantity: number;
  price_per_unit: number;
  price_total: number;
  category: 'market' | 'material' | 'spirits' | 'unknown';
  source_docs: string[];
}

export interface DailyPOSummary {
  date: string;
  market_items: POSummaryItem[];
  material_items: POSummaryItem[];
  all_items: POSummaryItem[];
  total_market_value: number;
  total_material_value: number;
  total_value: number;
}

// Normalize item code for matching
export const normalizeItemCode = (code: string): string => {
  return String(code || '')
    .normalize('NFKD')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
};

// Normalize item name for matching
export const normalizeItemName = (name: string): string => {
  return String(name || '')
    .normalize('NFKC')
    .replace(/\u00A0/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Detect document type from code (ML = market, RQ = material, TR = transfer/spirits)
export const detectDocType = (docCode: string): 'market' | 'material' | 'spirits' | 'unknown' => {
  const upper = String(docCode || '').toUpperCase();
  if (upper.startsWith('ML') || upper.includes('-ML')) return 'market';
  if (upper.startsWith('RQ') || upper.includes('-RQ')) return 'material';
  if (upper.startsWith('TR') || upper.includes('-TR')) return 'spirits';
  return 'unknown';
};

// Get unique item key (prefer code, fallback to name)
export const getItemKey = (item: { item_code?: string; item_name?: string }): string => {
  const code = normalizeItemCode(item.item_code || '');
  if (code) return `code:${code}`;
  return `name:${normalizeItemName(item.item_name || '')}`;
};

// Check if two items match (by code OR name)
export const itemsMatch = (
  item1: { item_code?: string; item_name?: string },
  item2: { item_code?: string; item_name?: string }
): boolean => {
  // Match by code if both have codes
  const code1 = normalizeItemCode(item1.item_code || '');
  const code2 = normalizeItemCode(item2.item_code || '');
  if (code1 && code2 && code1 === code2) return true;
  
  // Match by name
  const name1 = normalizeItemName(item1.item_name || '');
  const name2 = normalizeItemName(item2.item_name || '');
  if (name1 && name2 && name1 === name2) return true;
  
  // Fuzzy name match (one contains the other, min 5 chars)
  if (name1.length >= 5 && name2.length >= 5) {
    if (name1.includes(name2) || name2.includes(name1)) return true;
  }
  
  return false;
};

/**
 * Hook to summarize purchase orders by date
 * Groups ML orders as 'market' and RQ orders as 'material'
 */
export const useDailyPOSummary = (
  purchaseOrders: any[] | undefined,
  purchaseOrderItems: any[] | undefined
) => {
  const dailySummary = useMemo(() => {
    if (!purchaseOrders || !purchaseOrderItems) return new Map<string, DailyPOSummary>();
    
    const summaryMap = new Map<string, DailyPOSummary>();
    
    // Build a map of PO id -> order info
    const poMap = new Map<string, { date: string; order_number: string; category: 'market' | 'material' | 'spirits' | 'unknown' }>();
    purchaseOrders.forEach(po => {
      const orderDate = po.order_date ? format(new Date(po.order_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const category = detectDocType(po.order_number || '');
      poMap.set(po.id, { date: orderDate, order_number: po.order_number || '', category });
    });
    
    // Process all items and group by date + category
    purchaseOrderItems.forEach(item => {
      const poInfo = poMap.get(item.purchase_order_id);
      if (!poInfo) return;
      
      const dateKey = poInfo.date;
      
      // Initialize or get daily summary
      if (!summaryMap.has(dateKey)) {
        summaryMap.set(dateKey, {
          date: dateKey,
          market_items: [],
          material_items: [],
          all_items: [],
          total_market_value: 0,
          total_material_value: 0,
          total_value: 0
        });
      }
      
      const summary = summaryMap.get(dateKey)!;
      const itemKey = getItemKey(item);
      
      // Check if item already exists in the summary (sum quantities)
      const existingIndex = summary.all_items.findIndex(existing => 
        getItemKey(existing) === itemKey
      );
      
      if (existingIndex >= 0) {
        // Sum quantities and recalculate totals
        const existing = summary.all_items[existingIndex];
        existing.quantity += item.quantity || 0;
        existing.price_total += item.price_total || 0;
        existing.source_docs.push(poInfo.order_number);
      } else {
        // Add new item
        const newItem: POSummaryItem = {
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          unit: item.unit || 'EA',
          quantity: item.quantity || 0,
          price_per_unit: item.price_per_unit || 0,
          price_total: item.price_total || 0,
          category: poInfo.category,
          source_docs: [poInfo.order_number]
        };
        
        summary.all_items.push(newItem);
        
        if (poInfo.category === 'market') {
          summary.market_items.push(newItem);
          summary.total_market_value += newItem.price_total;
        } else if (poInfo.category === 'material') {
          summary.material_items.push(newItem);
          summary.total_material_value += newItem.price_total;
        }
        
        summary.total_value += newItem.price_total;
      }
    });
    
    return summaryMap;
  }, [purchaseOrders, purchaseOrderItems]);
  
  // Get summary for a specific date
  const getSummaryForDate = (date: Date | string): DailyPOSummary | undefined => {
    const dateKey = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
    return dailySummary.get(dateKey);
  };
  
  // Get all items from all dates (flattened for matching)
  const allSummarizedItems = useMemo(() => {
    const items: POSummaryItem[] = [];
    dailySummary.forEach(summary => {
      items.push(...summary.all_items);
    });
    return items;
  }, [dailySummary]);
  
  // Find matching PO item for a received item
  const findMatchingPOItem = (receivedItem: { item_code?: string; item_name?: string }): POSummaryItem | null => {
    for (const item of allSummarizedItems) {
      if (itemsMatch(item, receivedItem)) {
        return item;
      }
    }
    return null;
  };
  
  return {
    dailySummary,
    getSummaryForDate,
    allSummarizedItems,
    findMatchingPOItem
  };
};

export default useDailyPOSummary;
