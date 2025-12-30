import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { 
  DollarSign, Users, TrendingUp, ShoppingCart, Clock, User, 
  Award, BarChart3, RefreshCw
} from "lucide-react";

interface SalesAnalyticsDashboardProps {
  outletId: string;
}

interface OrderData {
  id: string;
  table_id: string;
  table_number?: string;
  server_id: string;
  server_name?: string;
  covers: number;
  total_amount: number;
  closed_at: string;
}

interface StaffPerformance {
  staff_id: string;
  staff_name: string;
  orders_count: number;
  total_revenue: number;
  avg_check: number;
  items_sold: number;
}

interface TopSeller {
  item_name: string;
  quantity: number;
  revenue: number;
}

interface TablePerformance {
  table_id: string;
  table_number: string;
  orders_count: number;
  total_revenue: number;
  avg_check: number;
  total_covers: number;
}

export function SalesAnalyticsDashboard({ outletId }: SalesAnalyticsDashboardProps) {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"overview" | "staff" | "items" | "tables">("overview");
  
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [tables, setTables] = useState<Map<string, string>>(new Map());

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch closed orders
      const { data: ordersData } = await supabase
        .from("lab_ops_orders")
        .select("id, table_id, server_id, covers, total_amount, closed_at")
        .eq("outlet_id", outletId)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(500);

      // Fetch sales records
      const { data: salesData } = await supabase
        .from("lab_ops_sales")
        .select("id, item_name, quantity, total_price, sold_at, sold_by")
        .eq("outlet_id", outletId)
        .order("sold_at", { ascending: false })
        .limit(500);

      // Fetch tables
      const { data: tablesData } = await supabase
        .from("lab_ops_tables")
        .select("id, table_number")
        .eq("outlet_id", outletId);

      // Collect user IDs
      const userIds = new Set<string>();
      ordersData?.forEach((o: any) => o.server_id && userIds.add(o.server_id));
      salesData?.forEach((s: any) => s.sold_by && userIds.add(s.sold_by));

      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", Array.from(userIds));

        const profileMap = new Map<string, string>();
        profilesData?.forEach((p: any) => {
          profileMap.set(p.id, p.full_name || p.username || "Unknown");
        });
        setProfiles(profileMap);
      }

      const tableMap = new Map<string, string>();
      tablesData?.forEach((t: any) => {
        tableMap.set(t.id, t.table_number?.toString() || "Unknown");
      });
      setTables(tableMap);

      // Transform orders
      const formattedOrders: OrderData[] = (ordersData || []).map((o: any) => ({
        id: o.id,
        table_id: o.table_id,
        table_number: tableMap.get(o.table_id) || "Unknown",
        server_id: o.server_id,
        server_name: profiles.get(o.server_id),
        covers: o.covers || 1,
        total_amount: Number(o.total_amount) || 0,
        closed_at: o.closed_at
      }));
      setOrders(formattedOrders);
      setSales(salesData || []);

    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (outletId) fetchData();
  }, [outletId]);

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalCovers = orders.reduce((sum, o) => sum + o.covers, 0);
  const avgCheckPerCover = totalCovers > 0 ? totalRevenue / totalCovers : 0;
  const avgCheckPerOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Staff performance
  const staffPerformance = useMemo<StaffPerformance[]>(() => {
    const byStaff = new Map<string, StaffPerformance>();

    orders.forEach((o) => {
      if (!o.server_id) return;
      const existing = byStaff.get(o.server_id) || {
        staff_id: o.server_id,
        staff_name: profiles.get(o.server_id) || "Unknown",
        orders_count: 0,
        total_revenue: 0,
        avg_check: 0,
        items_sold: 0
      };
      existing.orders_count++;
      existing.total_revenue += o.total_amount;
      byStaff.set(o.server_id, existing);
    });

    sales.forEach((s: any) => {
      if (!s.sold_by) return;
      const existing = byStaff.get(s.sold_by);
      if (existing) {
        existing.items_sold += s.quantity || 1;
      }
    });

    byStaff.forEach((staff) => {
      staff.avg_check = staff.orders_count > 0 
        ? staff.total_revenue / staff.orders_count 
        : 0;
    });

    return Array.from(byStaff.values()).sort((a, b) => b.total_revenue - a.total_revenue);
  }, [orders, sales, profiles]);

  // Top sellers
  const topSellers = useMemo<TopSeller[]>(() => {
    const byItem = new Map<string, TopSeller>();

    sales.forEach((s: any) => {
      const existing = byItem.get(s.item_name) || {
        item_name: s.item_name,
        quantity: 0,
        revenue: 0
      };
      existing.quantity += s.quantity || 1;
      existing.revenue += Number(s.total_price) || 0;
      byItem.set(s.item_name, existing);
    });

    return Array.from(byItem.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);
  }, [sales]);

  // Table performance
  const tablePerformance = useMemo<TablePerformance[]>(() => {
    const byTable = new Map<string, TablePerformance>();

    orders.forEach((o) => {
      if (!o.table_id) return;
      const existing = byTable.get(o.table_id) || {
        table_id: o.table_id,
        table_number: tables.get(o.table_id) || o.table_number || "Unknown",
        orders_count: 0,
        total_revenue: 0,
        avg_check: 0,
        total_covers: 0
      };
      existing.orders_count++;
      existing.total_revenue += o.total_amount;
      existing.total_covers += o.covers;
      byTable.set(o.table_id, existing);
    });

    byTable.forEach((table) => {
      table.avg_check = table.total_covers > 0 
        ? table.total_revenue / table.total_covers 
        : 0;
    });

    return Array.from(byTable.values()).sort((a, b) => b.total_revenue - a.total_revenue);
  }, [orders, tables]);

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
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatPrice(totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Covers</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalCovers}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg/Cover</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{formatPrice(avgCheckPerCover)}</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Avg/Order</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatPrice(avgCheckPerOrder)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">By Staff</TabsTrigger>
          <TabsTrigger value="items">Top Items</TabsTrigger>
          <TabsTrigger value="tables">By Table</TabsTrigger>
        </TabsList>

        {/* Overview - Recent Orders */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {orders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No closed orders yet</p>
                  ) : (
                    orders.slice(0, 30).map((o) => (
                      <div key={o.id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Table {o.table_number}</Badge>
                              <span className="text-sm text-muted-foreground">{o.covers} covers</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(o.closed_at), "MMM d, HH:mm")}
                              {o.server_name && (
                                <>
                                  <span>•</span>
                                  <User className="h-3 w-3" />
                                  {o.server_name}
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-lg font-bold">{formatPrice(o.total_amount)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Performance */}
        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Staff Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {staffPerformance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No staff data</p>
                  ) : (
                    staffPerformance.map((staff, idx) => (
                      <div key={staff.staff_id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={idx < 3 ? "default" : "outline"}>#{idx + 1}</Badge>
                            <span className="font-semibold">{staff.staff_name}</span>
                          </div>
                          <p className="text-lg font-bold">{formatPrice(staff.total_revenue)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>{staff.orders_count} orders</div>
                          <div>{staff.items_sold} items</div>
                          <div>Avg: {formatPrice(staff.avg_check)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Items */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {topSellers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No sales data</p>
                  ) : (
                    topSellers.map((item, idx) => (
                      <div key={item.item_name} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={idx < 3 ? "default" : "outline"}>#{idx + 1}</Badge>
                            <span className="font-medium truncate">{item.item_name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold">{item.quantity} sold</p>
                            <p className="text-xs text-muted-foreground">{formatPrice(item.revenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table Performance */}
        <TabsContent value="tables" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Table Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {tablePerformance.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No table data</p>
                  ) : (
                    tablePerformance.map((table) => (
                      <div key={table.table_id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-base">Table {table.table_number}</Badge>
                          <p className="text-lg font-bold">{formatPrice(table.total_revenue)}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>{table.orders_count} orders</div>
                          <div>{table.total_covers} covers</div>
                          <div>Avg/cover: {formatPrice(table.avg_check)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
