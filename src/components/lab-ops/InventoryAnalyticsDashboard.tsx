import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import {
  Package,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  RefreshCw,
  DollarSign,
  Clock,
  User,
} from "lucide-react";

interface InventoryAnalyticsDashboardProps {
  outletId: string;
}

interface MovementLog {
  id: string;
  inventory_item_id: string;
  item_name: string;
  movement_type: string;
  qty: number;
  created_at: string;
  created_by_name?: string;
  notes?: string;
  to_location_name?: string;
}

interface SaleRecord {
  id: string;
  item_name: string;
  quantity: number;
  total_price: number;
  sold_at: string;
  sold_by_name?: string;
  table_number?: string;
}

interface OrderRecord {
  id: string;
  total_amount: number;
  closed_at: string;
}

interface ReceivedCost {
  id: string;
  total_price: number;
}

interface DailySummary {
  date: string;
  received: number;
  sold: number;
  adjustments: number;
  net_change: number;
  // UI detail
  received_items: { name: string; qty: number }[];
  received_items_count: number;
}

interface ItemSummary {
  item_id: string;
  item_name: string;
  sku: string;
  base_unit: string;
  total_received: number;
  total_sold: number;
  current_stock: number;
  last_movement?: string;
}

function normalizeName(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");
}

function namesLooselyMatch(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function inferBottleMlFromName(name: string): number | null {
  const s = name.toLowerCase();
  // Common formats: 70cl, 750ml, 1l, 1.5l
  const ml = s.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (ml?.[1]) return Math.round(Number(ml[1]));

  const cl = s.match(/(\d+(?:\.\d+)?)\s*cl\b/i);
  if (cl?.[1]) return Math.round(Number(cl[1]) * 10);

  const l = s.match(/(\d+(?:\.\d+)?)\s*l\b/i);
  if (l?.[1]) return Math.round(Number(l[1]) * 1000);

  // Fallback for "70CL" without space is already covered, keep safe default unknown
  return null;
}

function formatQtyCompact(qty: number) {
  const abs = Math.abs(qty);
  if (abs === 0) return "0";
  if (abs >= 1) return Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  // show up to 3 decimals for small fractional movements
  return abs
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export function InventoryAnalyticsDashboard({ outletId }: InventoryAnalyticsDashboardProps) {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<"summary" | "movements" | "daily">(
    "summary",
  );

  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [closedOrders, setClosedOrders] = useState<OrderRecord[]>([]);
  const [receivedCosts, setReceivedCosts] = useState<ReceivedCost[]>([]);

  const refreshTimeoutRef = useRef<number | null>(null);
  const scheduleRefresh = () => {
    if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => {
      fetchData();
    }, 350);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch inventory items with stock levels
      const { data: itemsData } = await supabase
        .from("lab_ops_inventory_items")
        .select(
          `
          id, name, sku, base_unit, category,
          lab_ops_stock_levels(id, location_id, quantity)
        `,
        )
        .eq("outlet_id", outletId);

      // Fetch stock movements
      const { data: movementsData } = await supabase
        .from("lab_ops_stock_movements")
        .select(
          `
          id, inventory_item_id, movement_type, qty, notes, created_at, created_by, to_location_id,
          lab_ops_inventory_items(name),
          lab_ops_locations!lab_ops_stock_movements_to_location_id_fkey(name)
        `,
        )
        .eq("lab_ops_inventory_items.outlet_id", outletId)
        .order("created_at", { ascending: false })
        .limit(200);

      // Fetch sales records
      const { data: salesData } = await supabase
        .from("lab_ops_sales")
        .select("id, item_name, quantity, total_price, sold_at, sold_by")
        .eq("outlet_id", outletId)
        .order("sold_at", { ascending: false })
        .limit(200);

      // Fetch closed orders for revenue calculation
      const { data: ordersData } = await supabase
        .from("lab_ops_orders")
        .select("id, total_amount, closed_at")
        .eq("outlet_id", outletId)
        .eq("status", "closed");

      // Fetch approved received items for cost calculation
      const { data: receivedData } = await supabase
        .from("lab_ops_pending_received_items")
        .select("id, total_price")
        .eq("outlet_id", outletId)
        .eq("status", "approved");

      // Collect unique user IDs for profile lookup
      const userIds = new Set<string>();
      movementsData?.forEach((m: any) => m.created_by && userIds.add(m.created_by));
      salesData?.forEach((s: any) => s.sold_by && userIds.add(s.sold_by));

      const profileMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", Array.from(userIds));

        profilesData?.forEach((p: any) => {
          profileMap.set(p.id, p.full_name || p.username || "Unknown");
        });
      }

      setItems(itemsData || []);

      // Transform movements
      const formattedMovements: MovementLog[] = (movementsData || []).map((m: any) => ({
        id: m.id,
        inventory_item_id: m.inventory_item_id,
        item_name: m.lab_ops_inventory_items?.name || "Unknown",
        movement_type: m.movement_type,
        qty: Number(m.qty) || 0,
        created_at: m.created_at,
        created_by_name: m.created_by ? profileMap.get(m.created_by) : undefined,
        notes: m.notes,
        to_location_name: m.lab_ops_locations?.name,
      }));
      setMovements(formattedMovements);

      // Transform sales
      const formattedSales: SaleRecord[] = (salesData || []).map((s: any) => ({
        id: s.id,
        item_name: s.item_name,
        quantity: s.quantity || 1,
        total_price: Number(s.total_price) || 0,
        sold_at: s.sold_at,
        sold_by_name: s.sold_by ? profileMap.get(s.sold_by) : undefined,
      }));
      setSales(formattedSales);

      // Set closed orders for revenue
      setClosedOrders((ordersData || []).map((o: any) => ({
        id: o.id,
        total_amount: Number(o.total_amount) || 0,
        closed_at: o.closed_at,
      })));

      // Set received costs
      setReceivedCosts((receivedData || []).map((r: any) => ({
        id: r.id,
        total_price: Number(r.total_price) || 0,
      })));
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!outletId) return;

    fetchData();

    const channel = supabase
      .channel(`inventory-analytics-${outletId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lab_ops_sales",
          filter: `outlet_id=eq.${outletId}`,
        },
        scheduleRefresh,
      )
      // Stock movements may not always include outlet_id, so we listen broadly and refresh.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lab_ops_stock_movements" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lab_ops_stock_levels" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) window.clearTimeout(refreshTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [outletId]);

  // Calculate item summaries - use loose matching AND count from both sales table and sale movements
  // Sales qty is converted to bottle parts for spirits (e.g., 3 sold × 0.04 = 0.12 bottles)
  const itemSummaries = useMemo<ItemSummary[]>(() => {
    const SERVING_ML = 30; // Standard pour size
    const DEFAULT_BOTTLE_ML = 700; // Default bottle size for spirits
    
    return items.map((item) => {
      const itemMovements = movements.filter(
        (m) => namesLooselyMatch(m.item_name, item.name)
      );

      // Match sales using loose name matching
      const itemSales = sales.filter(
        (s) => namesLooselyMatch(s.item_name, item.name)
      );

      const totalReceived = itemMovements
        .filter((m) => m.movement_type === "purchase" || (m.movement_type === "adjustment" && m.qty > 0))
        .reduce((sum, m) => sum + Math.abs(m.qty), 0);

      // Get raw sales count from sales table
      const rawSalesQty = itemSales.reduce((sum, s) => sum + s.quantity, 0);
      
      // ONLY apply fractional conversion for spirits category or spirit keywords
      // Soft drinks, food, etc. should NOT be converted - they sell as 1:1 units
      const bottleMl = inferBottleMlFromName(item.name) || DEFAULT_BOTTLE_ML;
      const categoryLower = item.category?.toLowerCase() || '';
      const nameLower = item.name?.toLowerCase() || '';
      
      // Strict spirit detection - category 'spirits' or explicit spirit keywords
      const isSpirit = categoryLower === 'spirits' || 
                       nameLower.includes('whisky') ||
                       nameLower.includes('whiskey') ||
                       nameLower.includes('vodka') ||
                       nameLower.includes('rum') ||
                       nameLower.includes('tequila') ||
                       nameLower.includes('brandy') ||
                       nameLower.includes('cognac') ||
                       nameLower.includes('mezcal') ||
                       nameLower.includes('bourbon') ||
                       nameLower.includes('scotch') ||
                       nameLower.includes('gin') ||
                       nameLower.includes('jagermeister') ||
                       nameLower.includes('liqueur') ||
                       nameLower.includes('liquer') ||
                       nameLower.includes('black label') ||
                       nameLower.includes('red label') ||
                       nameLower.includes('blue label') ||
                       nameLower.includes('hennessy') ||
                       nameLower.includes('baileys') ||
                       nameLower.includes('aperol') ||
                       nameLower.includes('campari') ||
                       nameLower.includes('amaretto') ||
                       nameLower.includes('kahlua');
      
      // Exclude soft drinks, mixers, food explicitly
      const isNonSpirit = categoryLower.includes('soft') || 
                          categoryLower.includes('mixer') ||
                          categoryLower.includes('food') ||
                          categoryLower.includes('beverage') ||
                          nameLower.includes('ginger beer') ||
                          nameLower.includes('tonic') ||
                          nameLower.includes('soda') ||
                          nameLower.includes('juice') ||
                          nameLower.includes('cola') ||
                          nameLower.includes('water') ||
                          nameLower.includes('be wtr');
      
      // Final spirit check: must be spirit AND not explicitly non-spirit
      const applyFractionalConversion = isSpirit && !isNonSpirit;
      
      // Convert sales qty to bottle parts ONLY for spirits (qty × 30ml / bottle_ml)
      // E.g., 3 drinks sold from 700ml spirit bottle = 3 × (30/700) = 0.128 bottles
      // Non-spirits (soft drinks, food, etc.) use 1:1 ratio - no conversion
      const fractionPerServing = applyFractionalConversion ? (SERVING_ML / bottleMl) : 1;
      const soldInBottleParts = rawSalesQty * fractionPerServing;
      
      // Also check sale movements (which are already in bottle parts)
      const soldFromMovements = itemMovements
        .filter((m) => m.movement_type === "sale")
        .reduce((sum, m) => sum + Math.abs(m.qty), 0);
      
      // Trust movement data first if it exists (already fractional), otherwise use sales conversion
      // Movement data is the source of truth for actual stock deductions
      const totalSold = soldFromMovements > 0 ? soldFromMovements : soldInBottleParts;

      const currentStock = (item.lab_ops_stock_levels || []).reduce(
        (sum: number, sl: any) => sum + (Number(sl.quantity) || 0),
        0
      );

      const lastMovement = itemMovements[0]?.created_at;

      return {
        item_id: item.id,
        item_name: item.name,
        sku: item.sku || "",
        base_unit: item.base_unit || "unit",
        total_received: totalReceived,
        total_sold: totalSold, // Now in bottle parts for spirits
        current_stock: currentStock,
        last_movement: lastMovement
      };
    });
  }, [items, movements, sales]);

  // Calculate daily summaries
  const dailySummaries = useMemo<DailySummary[]>(() => {
    const byDate = new Map<string, DailySummary>();

    const emptyDay = (date: string): DailySummary => ({
      date,
      received: 0,
      sold: 0,
      adjustments: 0,
      net_change: 0,
      received_items: [],
      received_items_count: 0,
    });

    const addReceivedItem = (day: DailySummary, name: string, qty: number) => {
      const key = (name || "Unknown").trim() || "Unknown";
      const existing = day.received_items.find((i) => i.name === key);
      if (existing) existing.qty += qty;
      else day.received_items.push({ name: key, qty });
      day.received_items_count = day.received_items.length;
    };

    movements.forEach((m) => {
      const date = format(new Date(m.created_at), "yyyy-MM-dd");
      const existing = byDate.get(date) || emptyDay(date);

      if (m.movement_type === "purchase") {
        const qty = Math.abs(m.qty);
        existing.received += qty;
        addReceivedItem(existing, m.item_name, qty);
      } else if (m.movement_type === "sale") {
        existing.sold += Math.abs(m.qty);
      } else {
        existing.adjustments += m.qty;
      }

      existing.net_change = existing.received - existing.sold + existing.adjustments;
      byDate.set(date, existing);
    });

    sales.forEach((s) => {
      const date = format(new Date(s.sold_at), "yyyy-MM-dd");
      const existing = byDate.get(date) || emptyDay(date);
      existing.sold += s.quantity;
      existing.net_change = existing.received - existing.sold + existing.adjustments;
      byDate.set(date, existing);
    });

    return Array.from(byDate.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [movements, sales]);


  // Summary metrics
  const totalReceived = itemSummaries.reduce((sum, i) => sum + i.total_received, 0);
  const totalSold = itemSummaries.reduce((sum, i) => sum + i.total_sold, 0);
  const totalStock = itemSummaries.reduce((sum, i) => sum + i.current_stock, 0);
  
  // Revenue from closed orders (primary source) or fall back to sales table
  const totalRevenue = useMemo(() => {
    const ordersRevenue = closedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    if (ordersRevenue > 0) return ordersRevenue;
    return sales.reduce((sum, s) => sum + s.total_price, 0);
  }, [closedOrders, sales]);
  
  // Total cost from approved received items
  const totalCost = useMemo(() => {
    return receivedCosts.reduce((sum, r) => sum + r.total_price, 0);
  }, [receivedCosts]);
  
  const netProfit = totalRevenue - totalCost;

  const filteredItems = itemSummaries.filter(
    (item) =>
      !searchTerm ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - Mobile responsive with horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-thin py-1 pb-3 px-2 sm:px-3">
        <Card className="bg-green-500/10 border-green-500/30 min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Received</span>
            </div>
            <p className="text-xl font-bold text-green-600">{totalReceived}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30 min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Sold</span>
            </div>
            <p className="text-xl font-bold text-red-600">{totalSold}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30 min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Stock</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{totalStock}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/30 min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/30 min-w-[140px] flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Cost</span>
            </div>
            <p className="text-xl font-bold text-orange-600">{formatPrice(totalCost)}</p>
          </CardContent>
        </Card>

        <Card className={`min-w-[140px] flex-shrink-0 ${netProfit >= 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-purple-500' : 'text-red-500'}`} />
              <span className="text-xs text-muted-foreground">Net Profit</span>
            </div>
            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
              {formatPrice(netProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Tabs */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="summary">Item Summary</TabsTrigger>
          <TabsTrigger value="movements">Movement Log</TabsTrigger>
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
        </TabsList>

        {/* Item Summary View */}
        <TabsContent value="summary" className="mt-4">
          <div className="h-[400px] overflow-y-auto scrollbar-thin pr-[max(1.25rem,env(safe-area-inset-right))]">
            <div className="space-y-2 p-1 pr-6">
              {filteredItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items found</p>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.item_id}
                    className="p-3 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.sku || "No SKU"} • {item.base_unit}
                        </p>
                      </div>
                      <Badge
                        variant={item.current_stock > 0 ? "secondary" : "destructive"}
                        className="text-sm font-bold px-2 shrink-0 whitespace-nowrap"
                      >
                        {formatQtyCompact(item.current_stock)} {item.base_unit}
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">In:</span>
                        <span className="font-medium text-green-600">{formatQtyCompact(item.total_received)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                        <span className="text-muted-foreground">Out:</span>
                        <span className="font-medium text-red-600">{formatQtyCompact(item.total_sold)}</span>
                      </div>
                      {item.last_movement && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {format(new Date(item.last_movement), "MMM d")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Movement Log View */}
        <TabsContent value="movements" className="mt-4">
          <div className="h-[400px] overflow-y-auto scrollbar-thin pr-[max(1.25rem,env(safe-area-inset-right))]">
            <div className="space-y-2 p-1 pr-6">
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No movements recorded</p>
              ) : (
                movements.slice(0, 50).map((m) => {
                  // Determine bottle size from item name for accurate ml calculation
                  const bottleMl = inferBottleMlFromName(m.item_name) || 700;
                  const isSpiritServing = m.movement_type === "sale" && Math.abs(m.qty) < 1;
                  const servingMl = isSpiritServing ? Math.round(Math.abs(m.qty) * bottleMl) : null;
                  
                  const getMovementLabel = () => {
                    switch (m.movement_type) {
                      case 'purchase': return 'Stock received from purchase';
                      case 'sale': return isSpiritServing ? `Spirit serving (${servingMl}ml pour)` : 'Item sold';
                      case 'adjustment': return m.qty > 0 ? 'Stock adjusted (added)' : 'Stock adjusted (removed)';
                      case 'transfer': return 'Transferred between locations';
                      case 'spillage': return 'Spillage/wastage recorded';
                      default: return m.movement_type;
                    }
                  };

                  const getMovementDescription = () => {
                    switch (m.movement_type) {
                      case 'purchase': return 'Added to inventory from PO';
                      case 'sale': return isSpiritServing 
                        ? `${servingMl}ml poured = ${formatQtyCompact(Math.abs(m.qty))} bottle` 
                        : `${Math.abs(m.qty)} unit(s) sold`;
                      case 'adjustment': return 'Manual stock count correction';
                      case 'transfer': return m.to_location_name ? `Moved to ${m.to_location_name}` : 'Location transfer';
                      case 'spillage': return 'Loss recorded';
                      default: return '';
                    }
                  };

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-muted/40 border border-border/50"
                    >
                      {/* Mobile-friendly stacked layout */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-tight break-words flex-1">{m.item_name}</p>
                          <Badge
                            variant={m.movement_type === "purchase" ? "default" : m.movement_type === "sale" ? "destructive" : "secondary"}
                            className="shrink-0 text-xs"
                          >
                            {m.movement_type === "purchase" ? "+" : m.movement_type === "sale" ? "-" : ""}
                            {formatQtyCompact(Math.abs(m.qty))}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground/80">{getMovementLabel()}</p>
                          <p className="text-xs text-muted-foreground">{getMovementDescription()}</p>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(m.created_at), "MMM d, h:mm a")}</span>
                          </div>
                          {m.created_by_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{m.created_by_name}</span>
                            </div>
                          )}
                        </div>

                        {m.notes && (
                          <p className="text-xs text-muted-foreground italic break-words">"{m.notes}"</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* Daily Summary View */}
        <TabsContent value="daily" className="mt-4">
          <div className="h-[400px] overflow-y-auto scrollbar-thin pr-[max(1.25rem,env(safe-area-inset-right))]">
            <div className="space-y-2 p-1 pr-6">
              {dailySummaries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No daily data available</p>
              ) : (
                dailySummaries.slice(0, 30).map((day) => (
                  <div
                    key={day.date}
                    className="p-3 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">
                        {format(new Date(day.date), "EEE, MMM d")}
                      </p>
                      <Badge
                        variant={day.net_change >= 0 ? "default" : "destructive"}
                      >
                        {day.net_change >= 0 ? "+" : ""}{day.net_change} net
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
                      <div className="flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-medium">{day.received}</span>
                        <span className="text-muted-foreground text-xs">in</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 font-medium">{day.sold}</span>
                        <span className="text-muted-foreground text-xs">out</span>
                      </div>
                      {day.adjustments !== 0 && (
                        <div className="flex items-center gap-1">
                          <span className={day.adjustments > 0 ? "text-blue-600" : "text-orange-600"}>
                            {day.adjustments > 0 ? "+" : ""}{day.adjustments}
                          </span>
                          <span className="text-muted-foreground text-xs">adj</span>
                        </div>
                      )}
                    </div>

                    {/* Products Received Detail */}
                    {day.received_items.length > 0 && (
                      <div className="pt-2 border-t border-border/30">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Products Received:</p>
                        <div className="flex flex-wrap gap-1">
                          {day.received_items.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs font-normal bg-green-500/10 border-green-500/30 text-green-700">
                              {item.name} ({item.qty})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
