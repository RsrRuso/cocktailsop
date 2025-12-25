import { useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subDays, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface PurchaseOrder {
  id: string;
  order_number: string | null;
  supplier_name: string | null;
  order_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface PurchaseOrderItem {
  id?: string;
  purchase_order_id?: string;
  item_code: string;
  item_name: string;
  unit?: string;
  quantity: number;
  price_per_unit: number;
  price_total: number;
}

export interface ItemDateOccurrence {
  date: string;
  quantity: number;
  amount: number;
  order_number: string | null;
  supplier: string | null;
}

export interface DateItemDetail {
  item_name: string;
  item_code: string;
  quantity: number;
  amount: number;
  unit?: string;
  category: 'market' | 'material' | 'unknown';
}

export interface ItemSummary {
  item_name: string;
  item_code: string;
  totalQuantity: number;
  totalAmount: number;
  avgPrice: number;
  orderCount: number;
  purchaseDays: number;
  unit?: string;
  category: 'market' | 'material' | 'unknown';
  dateOccurrences: ItemDateOccurrence[];
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalAmount: number;
  avgOrderValue: number;
  totalItems: number;
  uniqueItems: number;
  marketItems: { count: number; amount: number; items: ItemSummary[] };
  materialItems: { count: number; amount: number; items: ItemSummary[] };
  ordersByDate: { date: string; count: number; amount: number; items: DateItemDetail[] }[];
  ordersBySupplier: { supplier: string; count: number; amount: number }[];
  topItems: ItemSummary[];
  dailyAverage: number;
  weeklyTrend: number;
  monthlyComparison: { current: number; previous: number; change: number };
  itemsByCategory: { category: string; items: ItemSummary[] }[];
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
  'amarena', 'cherry', 'honey', 'juice', 'water', 'sparkling', 'tonic', 'syrup', 'puree', 'citrus'
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

export const usePurchaseOrderAnalytics = (
  orders: PurchaseOrder[] | undefined,
  items: PurchaseOrderItem[] | undefined
): AnalyticsSummary => {
  return useMemo(() => {
    const safeOrders = orders || [];
    const safeItems = items || [];
    
    // Create order lookup map
    const orderMap = new Map<string, PurchaseOrder>();
    safeOrders.forEach(order => {
      orderMap.set(order.id, order);
    });
    
    // Basic metrics
    const totalOrders = safeOrders.length;
    const totalAmount = safeOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;
    const totalItems = safeItems.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
    
    // Group items by name for analysis - include date tracking
    const itemMap = new Map<string, ItemSummary>();
    safeItems.forEach(item => {
      const key = item.item_name.toLowerCase().trim();
      const existing = itemMap.get(key);
      const category = categorizeItem(item.item_name);
      
      // Get order date for this item
      const order = item.purchase_order_id ? orderMap.get(item.purchase_order_id) : null;
      const orderDate = order?.order_date?.split('T')[0] || null;
      
      const dateOccurrence: ItemDateOccurrence = {
        date: orderDate || 'Unknown',
        quantity: Number(item.quantity || 0),
        amount: Number(item.price_total || 0),
        order_number: order?.order_number || null,
        supplier: order?.supplier_name || null
      };
      
      if (existing) {
        existing.totalQuantity += Number(item.quantity || 0);
        existing.totalAmount += Number(item.price_total || 0);
        existing.orderCount += 1;
        existing.avgPrice = existing.totalAmount / existing.totalQuantity;
        existing.dateOccurrences.push(dateOccurrence);
        
        // Update purchase days count
        const uniqueDates = new Set(existing.dateOccurrences.map(d => d.date));
        existing.purchaseDays = uniqueDates.size;
        
        // Update first/last purchase dates
        if (orderDate) {
          if (!existing.firstPurchaseDate || orderDate < existing.firstPurchaseDate) {
            existing.firstPurchaseDate = orderDate;
          }
          if (!existing.lastPurchaseDate || orderDate > existing.lastPurchaseDate) {
            existing.lastPurchaseDate = orderDate;
          }
        }
      } else {
        itemMap.set(key, {
          item_name: item.item_name,
          item_code: item.item_code || '',
          totalQuantity: Number(item.quantity || 0),
          totalAmount: Number(item.price_total || 0),
          avgPrice: Number(item.price_per_unit || 0),
          orderCount: 1,
          purchaseDays: orderDate ? 1 : 0,
          unit: item.unit,
          category,
          dateOccurrences: [dateOccurrence],
          firstPurchaseDate: orderDate,
          lastPurchaseDate: orderDate
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
    
    // Orders by date with item details
    const ordersByDateMap = new Map<string, { count: number; amount: number; items: DateItemDetail[] }>();
    
    // First, process orders
    safeOrders.forEach(order => {
      const dateKey = order.order_date.split('T')[0];
      if (!ordersByDateMap.has(dateKey)) {
        ordersByDateMap.set(dateKey, {
          count: 0,
          amount: 0,
          items: []
        });
      }
      const existing = ordersByDateMap.get(dateKey)!;
      existing.count += 1;
      existing.amount += Number(order.total_amount || 0);
    });
    
    // Then, add item details per date
    safeItems.forEach(item => {
      const order = item.purchase_order_id ? orderMap.get(item.purchase_order_id) : null;
      if (order) {
        const dateKey = order.order_date.split('T')[0];
        const dateData = ordersByDateMap.get(dateKey);
        if (dateData) {
          dateData.items.push({
            item_name: item.item_name,
            item_code: item.item_code || '',
            quantity: Number(item.quantity || 0),
            amount: Number(item.price_total || 0),
            unit: item.unit,
            category: categorizeItem(item.item_name)
          });
        }
      }
    });
    
    const ordersByDate = Array.from(ordersByDateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Orders by supplier
    const ordersBySupplierMap = new Map<string, { count: number; amount: number }>();
    safeOrders.forEach(order => {
      const supplier = order.supplier_name || 'Unknown Supplier';
      const existing = ordersBySupplierMap.get(supplier);
      if (existing) {
        existing.count += 1;
        existing.amount += Number(order.total_amount || 0);
      } else {
        ordersBySupplierMap.set(supplier, {
          count: 1,
          amount: Number(order.total_amount || 0)
        });
      }
    });
    
    const ordersBySupplier = Array.from(ordersBySupplierMap.entries())
      .map(([supplier, data]) => ({ supplier, ...data }))
      .sort((a, b) => b.amount - a.amount);
    
    // Daily average (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const recentOrders = safeOrders.filter(o => {
      const orderDate = parseISO(o.order_date);
      return isWithinInterval(orderDate, { start: thirtyDaysAgo, end: now });
    });
    const dailyAverage = recentOrders.length > 0 
      ? recentOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) / 30 
      : 0;
    
    // Weekly trend (this week vs last week)
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);
    
    const thisWeekAmount = safeOrders
      .filter(o => isWithinInterval(parseISO(o.order_date), { start: thisWeekStart, end: thisWeekEnd }))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const lastWeekAmount = safeOrders
      .filter(o => isWithinInterval(parseISO(o.order_date), { start: lastWeekStart, end: lastWeekEnd }))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const weeklyTrend = lastWeekAmount > 0 
      ? ((thisWeekAmount - lastWeekAmount) / lastWeekAmount) * 100 
      : 0;
    
    // Monthly comparison
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    
    const currentMonthAmount = safeOrders
      .filter(o => isWithinInterval(parseISO(o.order_date), { start: currentMonthStart, end: currentMonthEnd }))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const prevMonthAmount = safeOrders
      .filter(o => isWithinInterval(parseISO(o.order_date), { start: prevMonthStart, end: prevMonthEnd }))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const monthlyChange = prevMonthAmount > 0 
      ? ((currentMonthAmount - prevMonthAmount) / prevMonthAmount) * 100 
      : 0;
    
    // Items by category
    const categoryMap = new Map<string, ItemSummary[]>();
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
      totalOrders,
      totalAmount,
      avgOrderValue,
      totalItems,
      uniqueItems,
      marketItems,
      materialItems,
      ordersByDate,
      ordersBySupplier,
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
  }, [orders, items]);
};