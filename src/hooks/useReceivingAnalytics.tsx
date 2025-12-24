import { useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subDays, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface ReceivedRecord {
  id: string;
  supplier_name: string | null;
  document_number: string | null;
  received_date: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  status: string;
  created_at: string;
  received_by_name: string | null;
}

interface ReceivedItem {
  id?: string;
  record_id?: string;
  item_name: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
  received_date: string;
  document_number?: string;
}

export interface ReceivingItemDateOccurrence {
  date: string;
  quantity: number;
  amount: number;
  document_number: string | null;
  supplier: string | null;
}

export interface ReceivingDateItemDetail {
  item_name: string;
  quantity: number;
  amount: number;
  unit?: string;
  category: 'market' | 'material' | 'unknown';
}

export interface ReceivingItemSummary {
  item_name: string;
  totalQuantity: number;
  totalAmount: number;
  avgPrice: number;
  receiptCount: number;
  receivingDays: number;
  unit?: string;
  category: 'market' | 'material' | 'unknown';
  dateOccurrences: ReceivingItemDateOccurrence[];
  firstReceivingDate: string | null;
  lastReceivingDate: string | null;
}

export interface ReceivingAnalyticsSummary {
  totalReceipts: number;
  totalAmount: number;
  avgReceiptValue: number;
  totalItems: number;
  uniqueItems: number;
  marketItems: { count: number; amount: number; items: ReceivingItemSummary[] };
  materialItems: { count: number; amount: number; items: ReceivingItemSummary[] };
  receiptsByDate: { date: string; count: number; amount: number; items: ReceivingDateItemDetail[] }[];
  receiptsBySupplier: { supplier: string; count: number; amount: number }[];
  topItems: ReceivingItemSummary[];
  dailyAverage: number;
  weeklyTrend: number;
  monthlyComparison: { current: number; previous: number; change: number };
  itemsByCategory: { category: string; items: ReceivingItemSummary[] }[];
}

// Keywords to identify market (fresh produce) vs material items
const MARKET_KEYWORDS = [
  'vegetable', 'fruit', 'meat', 'fish', 'chicken', 'beef', 'pork', 'lamb', 'seafood',
  'prawn', 'shrimp', 'salmon', 'tuna', 'cod', 'lettuce', 'tomato', 'onion', 'garlic',
  'potato', 'carrot', 'broccoli', 'spinach', 'cabbage', 'pepper', 'cucumber', 'lemon',
  'lime', 'orange', 'apple', 'banana', 'mango', 'berry', 'strawberry', 'herb', 'basil',
  'parsley', 'cilantro', 'mint', 'thyme', 'rosemary', 'egg', 'dairy', 'milk', 'cream',
  'cheese', 'butter', 'yogurt', 'fresh', 'produce', 'organic', 'farm', 'mushroom',
  'avocado', 'ginger', 'chili', 'celery', 'asparagus', 'bean', 'pea', 'corn', 'olive',
  'juice', 'water', 'sparkling', 'tonic', 'syrup', 'puree', 'citrus'
];

const MATERIAL_KEYWORDS = [
  'paper', 'napkin', 'tissue', 'plastic', 'container', 'box', 'bag', 'wrap', 'foil',
  'chemical', 'cleaner', 'detergent', 'sanitizer', 'soap', 'glove', 'apron', 'uniform',
  'equipment', 'tool', 'utensil', 'knife', 'pan', 'pot', 'tray', 'rack', 'shelf',
  'filter', 'cartridge', 'bulb', 'battery', 'cord', 'cable', 'plug', 'wire', 'tape',
  'label', 'sticker', 'marker', 'pen', 'clip', 'staple', 'folder', 'binder', 'office',
  'packaging', 'disposable', 'cup', 'plate', 'cutlery', 'straw', 'lid', 'aluminium',
  'can', 'bottle', 'jar', 'pump', 'spray', 'mop', 'broom', 'bucket', 'brush'
];

const categorizeItem = (itemName: string): 'market' | 'material' | 'unknown' => {
  const lowerName = itemName.toLowerCase();
  
  if (MARKET_KEYWORDS.some(kw => lowerName.includes(kw))) {
    return 'market';
  }
  if (MATERIAL_KEYWORDS.some(kw => lowerName.includes(kw))) {
    return 'material';
  }
  return 'unknown';
};

export const useReceivingAnalytics = (
  records: ReceivedRecord[] | undefined,
  items: ReceivedItem[] | undefined
): ReceivingAnalyticsSummary => {
  return useMemo(() => {
    const safeRecords = records || [];
    const safeItems = items || [];
    
    // Create record lookup map
    const recordMap = new Map<string, ReceivedRecord>();
    safeRecords.forEach(record => {
      recordMap.set(record.id, record);
    });
    
    // Basic metrics
    const totalReceipts = safeRecords.length;
    const totalAmount = safeRecords.reduce((sum, r) => sum + Number(r.total_value || 0), 0);
    const avgReceiptValue = totalReceipts > 0 ? totalAmount / totalReceipts : 0;
    const totalItems = safeItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    
    // Group items by name for analysis
    const itemMap = new Map<string, ReceivingItemSummary>();
    safeItems.forEach(item => {
      const key = item.item_name.toLowerCase().trim();
      const existing = itemMap.get(key);
      const category = categorizeItem(item.item_name);
      
      const receivingDate = item.received_date?.split('T')[0] || null;
      
      const dateOccurrence: ReceivingItemDateOccurrence = {
        date: receivingDate || 'Unknown',
        quantity: Number(item.quantity || 0),
        amount: Number(item.total_price || 0),
        document_number: item.document_number || null,
        supplier: null
      };
      
      if (existing) {
        existing.totalQuantity += Number(item.quantity || 0);
        existing.totalAmount += Number(item.total_price || 0);
        existing.receiptCount += 1;
        existing.avgPrice = existing.totalAmount / existing.totalQuantity;
        existing.dateOccurrences.push(dateOccurrence);
        
        const uniqueDates = new Set(existing.dateOccurrences.map(d => d.date));
        existing.receivingDays = uniqueDates.size;
        
        if (receivingDate) {
          if (!existing.firstReceivingDate || receivingDate < existing.firstReceivingDate) {
            existing.firstReceivingDate = receivingDate;
          }
          if (!existing.lastReceivingDate || receivingDate > existing.lastReceivingDate) {
            existing.lastReceivingDate = receivingDate;
          }
        }
      } else {
        itemMap.set(key, {
          item_name: item.item_name,
          totalQuantity: Number(item.quantity || 0),
          totalAmount: Number(item.total_price || 0),
          avgPrice: Number(item.unit_price || 0),
          receiptCount: 1,
          receivingDays: receivingDate ? 1 : 0,
          unit: item.unit,
          category,
          dateOccurrences: [dateOccurrence],
          firstReceivingDate: receivingDate,
          lastReceivingDate: receivingDate
        });
      }
    });
    
    const allItemSummaries = Array.from(itemMap.values());
    const uniqueItems = allItemSummaries.length;
    
    // Separate market and material items
    const marketItemsList = allItemSummaries.filter(i => i.category === 'market');
    const materialItemsList = allItemSummaries.filter(i => i.category === 'material');
    
    const marketItems = {
      count: marketItemsList.length,
      amount: marketItemsList.reduce((sum, i) => sum + i.totalAmount, 0),
      items: marketItemsList.sort((a, b) => b.totalAmount - a.totalAmount)
    };
    
    const materialItems = {
      count: materialItemsList.length,
      amount: materialItemsList.reduce((sum, i) => sum + i.totalAmount, 0),
      items: materialItemsList.sort((a, b) => b.totalAmount - a.totalAmount)
    };
    
    // Top items by spend
    const topItems = allItemSummaries
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 20);
    
    // Receipts by date with item details
    const receiptsByDateMap = new Map<string, { count: number; amount: number; items: ReceivingDateItemDetail[] }>();
    
    safeRecords.forEach(record => {
      const dateKey = record.received_date.split('T')[0];
      if (!receiptsByDateMap.has(dateKey)) {
        receiptsByDateMap.set(dateKey, { count: 0, amount: 0, items: [] });
      }
      const existing = receiptsByDateMap.get(dateKey)!;
      existing.count += 1;
      existing.amount += Number(record.total_value || 0);
    });
    
    safeItems.forEach(item => {
      const dateKey = item.received_date?.split('T')[0];
      if (dateKey) {
        const dateData = receiptsByDateMap.get(dateKey);
        if (dateData) {
          dateData.items.push({
            item_name: item.item_name,
            quantity: Number(item.quantity || 0),
            amount: Number(item.total_price || 0),
            unit: item.unit,
            category: categorizeItem(item.item_name)
          });
        }
      }
    });
    
    const receiptsByDate = Array.from(receiptsByDateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Receipts by supplier
    const receiptsBySupplierMap = new Map<string, { count: number; amount: number }>();
    safeRecords.forEach(record => {
      const supplier = record.supplier_name || 'Unknown Supplier';
      const existing = receiptsBySupplierMap.get(supplier);
      if (existing) {
        existing.count += 1;
        existing.amount += Number(record.total_value || 0);
      } else {
        receiptsBySupplierMap.set(supplier, {
          count: 1,
          amount: Number(record.total_value || 0)
        });
      }
    });
    
    const receiptsBySupplier = Array.from(receiptsBySupplierMap.entries())
      .map(([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.amount - a.amount);
    
    // Daily average (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const recentRecords = safeRecords.filter(r => {
      const receiveDate = parseISO(r.received_date);
      return isWithinInterval(receiveDate, { start: thirtyDaysAgo, end: now });
    });
    const dailyAverage = recentRecords.length > 0 
      ? recentRecords.reduce((sum, r) => sum + Number(r.total_value || 0), 0) / 30 
      : 0;
    
    // Weekly trend
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);
    
    const thisWeekAmount = safeRecords
      .filter(r => isWithinInterval(parseISO(r.received_date), { start: thisWeekStart, end: thisWeekEnd }))
      .reduce((sum, r) => sum + Number(r.total_value || 0), 0);
    
    const lastWeekAmount = safeRecords
      .filter(r => isWithinInterval(parseISO(r.received_date), { start: lastWeekStart, end: lastWeekEnd }))
      .reduce((sum, r) => sum + Number(r.total_value || 0), 0);
    
    const weeklyTrend = lastWeekAmount > 0 
      ? ((thisWeekAmount - lastWeekAmount) / lastWeekAmount) * 100 
      : 0;
    
    // Monthly comparison
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    
    const currentMonthAmount = safeRecords
      .filter(r => isWithinInterval(parseISO(r.received_date), { start: currentMonthStart, end: currentMonthEnd }))
      .reduce((sum, r) => sum + Number(r.total_value || 0), 0);
    
    const prevMonthAmount = safeRecords
      .filter(r => isWithinInterval(parseISO(r.received_date), { start: prevMonthStart, end: prevMonthEnd }))
      .reduce((sum, r) => sum + Number(r.total_value || 0), 0);
    
    const monthlyChange = prevMonthAmount > 0 
      ? ((currentMonthAmount - prevMonthAmount) / prevMonthAmount) * 100 
      : 0;
    
    // Items by category
    const categoryMap = new Map<string, ReceivingItemSummary[]>();
    allItemSummaries.forEach(item => {
      const cat = item.category === 'market' ? 'Market / Fresh' 
                : item.category === 'material' ? 'Materials / Supplies' 
                : 'Other Items';
      const existing = categoryMap.get(cat) || [];
      existing.push(item);
      categoryMap.set(cat, existing);
    });
    
    const itemsByCategory = Array.from(categoryMap.entries())
      .map(([category, items]) => ({ category, items: items.sort((a, b) => b.totalAmount - a.totalAmount) }));
    
    return {
      totalReceipts,
      totalAmount,
      avgReceiptValue,
      totalItems,
      uniqueItems,
      marketItems,
      materialItems,
      receiptsByDate,
      receiptsBySupplier,
      topItems,
      dailyAverage,
      weeklyTrend,
      monthlyComparison: {
        current: currentMonthAmount,
        previous: prevMonthAmount,
        change: monthlyChange
      },
      itemsByCategory
    };
  }, [records, items]);
};
