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

interface DailySummary {
  date: string;
  received: number;
  sold: number;
  adjustments: number;
  net_change: number;
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

  // Calculate item summaries
  const itemSummaries = useMemo<ItemSummary[]>(() => {
    return items.map((item) => {
      const itemMovements = movements.filter(
        (m) => m.item_name === item.name
      );
      const itemSales = sales.filter(
        (s) => s.item_name.toLowerCase() === item.name.toLowerCase()
      );

      const totalReceived = itemMovements
        .filter((m) => m.movement_type === "purchase" || m.movement_type === "adjustment" && m.qty > 0)
        .reduce((sum, m) => sum + Math.abs(m.qty), 0);

      const totalSold = itemSales.reduce((sum, s) => sum + s.quantity, 0);

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
        total_sold: totalSold,
        current_stock: currentStock,
        last_movement: lastMovement
      };
    });
  }, [items, movements, sales]);

  // Calculate daily summaries
  const dailySummaries = useMemo<DailySummary[]>(() => {
    const byDate = new Map<string, DailySummary>();

    movements.forEach((m) => {
      const date = format(new Date(m.created_at), "yyyy-MM-dd");
      const existing = byDate.get(date) || {
        date,
        received: 0,
        sold: 0,
        adjustments: 0,
        net_change: 0
      };

      if (m.movement_type === "purchase") {
        existing.received += Math.abs(m.qty);
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
      const existing = byDate.get(date) || {
        date,
        received: 0,
        sold: 0,
        adjustments: 0,
        net_change: 0
      };
      existing.sold += s.quantity;
      existing.net_change = existing.received - existing.sold + existing.adjustments;
      byDate.set(date, existing);
    });

    return Array.from(byDate.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [movements, sales]);

  // Summary metrics
  const totalReceived = itemSummaries.reduce((sum, i) => sum + i.total_received, 0);
  const totalSold = itemSummaries.reduce((sum, i) => sum + i.total_sold, 0);
  const totalStock = itemSummaries.reduce((sum, i) => sum + i.current_stock, 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.total_price, 0);

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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Received</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{totalReceived}</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Sold</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{totalSold}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Current Stock</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalStock}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(totalRevenue)}</p>
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
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
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
                        <p className="text-xs text-muted-foreground">
                          {item.sku || "No SKU"} • {item.base_unit}
                        </p>
                      </div>
                      <Badge 
                        variant={item.current_stock > 0 ? "secondary" : "destructive"}
                        className="text-sm font-bold px-2 shrink-0"
                      >
                        {item.current_stock} {item.base_unit}
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">In:</span>
                        <span className="font-medium text-green-600">{item.total_received}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                        <span className="text-muted-foreground">Out:</span>
                        <span className="font-medium text-red-600">{item.total_sold}</span>
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
          </ScrollArea>
        </TabsContent>

        {/* Movement Log View */}
        <TabsContent value="movements" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No movements recorded</p>
              ) : (
                movements.slice(0, 50).map((m) => {
                  // Determine if this is a spirit serving (fractional deduction)
                  const isSpiritServing = m.movement_type === 'sale' && Math.abs(m.qty) < 1;
                  const servingMl = isSpiritServing ? Math.round(Math.abs(m.qty) * 700 * 10) / 10 : null;
                  
                  const getMovementLabel = () => {
                    switch (m.movement_type) {
                      case 'purchase': return 'Received';
                      case 'sale': return isSpiritServing ? 'Spirit serving' : 'Sale';
                      case 'adjustment': return 'Adjustment';
                      case 'transfer': return 'Transfer';
                      case 'spillage': return 'Spillage';
                      default: return m.movement_type;
                    }
                  };

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-muted/40 border border-border/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{m.item_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(m.created_at), "MMM d, HH:mm")}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getMovementLabel()}
                            {servingMl && <span className="ml-1">({servingMl}ml)</span>}
                          </p>
                        </div>
                        <Badge
                          variant={m.movement_type === "purchase" ? "default" : m.movement_type === "sale" ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {m.movement_type === "purchase" ? "+" : m.movement_type === "sale" ? "-" : ""}
                          {Math.abs(m.qty).toFixed(2)}
                        </Badge>
                      </div>
                      {m.notes && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">{m.notes}</p>
                      )}
                      {m.to_location_name && (
                        <p className="text-xs text-muted-foreground mt-1">→ {m.to_location_name}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Daily Summary View */}
        <TabsContent value="daily" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
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
                    <div className="grid grid-cols-3 gap-2 text-sm">
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
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
