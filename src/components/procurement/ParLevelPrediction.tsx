import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Package, 
  Calendar, 
  Search,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

interface ParLevelPredictionProps {
  workspaceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemOrderHistory {
  item_name: string;
  item_code: string | null;
  total_orders: number;
  total_quantity: number;
  first_order_date: string;
  last_order_date: string;
  avg_quantity_per_order: number;
  orders_per_week: number;
  daily_average: number;
  par_3_days: number;
  par_week: number;
  par_2_weeks: number;
  par_month: number;
  trend: 'up' | 'down' | 'stable';
}

const ParLevelPrediction = ({ workspaceId, open, onOpenChange }: ParLevelPredictionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'3days' | 'week' | '2weeks' | 'month'>('week');

  // Fetch purchase order items with order dates
  const { data: orderHistory, isLoading } = useQuery({
    queryKey: ['par-level-prediction', workspaceId],
    queryFn: async () => {
      // Get all purchase order items with their order dates
      const { data: items, error } = await supabase
        .from('purchase_order_items')
        .select(`
          item_name,
          item_code,
          quantity,
          purchase_orders!inner (
            order_date,
            workspace_id,
            status
          )
        `)
        .eq('purchase_orders.workspace_id', workspaceId)
        .not('purchase_orders.order_date', 'is', null);

      if (error) throw error;
      return items || [];
    },
    enabled: open && !!workspaceId,
  });

  // Calculate par levels for each item
  const parLevelData = useMemo(() => {
    if (!orderHistory || orderHistory.length === 0) return [];

    // Group by item name
    const itemMap = new Map<string, {
      item_code: string | null;
      orders: { date: string; quantity: number }[];
    }>();

    orderHistory.forEach((item: any) => {
      const orderDate = item.purchase_orders?.order_date;
      if (!orderDate) return;

      const key = item.item_name.toLowerCase().trim();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item_code: item.item_code,
          orders: []
        });
      }
      itemMap.get(key)!.orders.push({
        date: orderDate,
        quantity: Number(item.quantity) || 0
      });
    });

    const today = new Date();
    const results: ItemOrderHistory[] = [];

    itemMap.forEach((data, itemName) => {
      const orders = data.orders.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (orders.length === 0) return;

      const firstOrderDate = orders[0].date;
      const lastOrderDate = orders[orders.length - 1].date;
      const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
      const totalOrders = orders.length;

      // Calculate the date range for analysis
      const daysCovered = Math.max(
        differenceInDays(new Date(lastOrderDate), new Date(firstOrderDate)),
        1
      );

      // Daily average consumption
      const dailyAverage = totalQuantity / daysCovered;

      // Orders per week
      const weeksCovered = daysCovered / 7;
      const ordersPerWeek = weeksCovered > 0 ? totalOrders / weeksCovered : totalOrders;

      // Calculate trend (compare recent orders vs older orders)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (orders.length >= 4) {
        const midpoint = Math.floor(orders.length / 2);
        const olderAvg = orders.slice(0, midpoint).reduce((s, o) => s + o.quantity, 0) / midpoint;
        const newerAvg = orders.slice(midpoint).reduce((s, o) => s + o.quantity, 0) / (orders.length - midpoint);
        
        if (newerAvg > olderAvg * 1.15) trend = 'up';
        else if (newerAvg < olderAvg * 0.85) trend = 'down';
      }

      results.push({
        item_name: itemName.charAt(0).toUpperCase() + itemName.slice(1),
        item_code: data.item_code,
        total_orders: totalOrders,
        total_quantity: totalQuantity,
        first_order_date: firstOrderDate,
        last_order_date: lastOrderDate,
        avg_quantity_per_order: totalQuantity / totalOrders,
        orders_per_week: ordersPerWeek,
        daily_average: dailyAverage,
        par_3_days: Math.ceil(dailyAverage * 3),
        par_week: Math.ceil(dailyAverage * 7),
        par_2_weeks: Math.ceil(dailyAverage * 14),
        par_month: Math.ceil(dailyAverage * 30),
        trend
      });
    });

    return results.sort((a, b) => b.daily_average - a.daily_average);
  }, [orderHistory]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchQuery) return parLevelData;
    const query = searchQuery.toLowerCase();
    return parLevelData.filter(item => 
      item.item_name.toLowerCase().includes(query) ||
      item.item_code?.toLowerCase().includes(query)
    );
  }, [parLevelData, searchQuery]);

  // Get par value based on selected period
  const getParValue = (item: ItemOrderHistory) => {
    switch (selectedPeriod) {
      case '3days': return item.par_3_days;
      case 'week': return item.par_week;
      case '2weeks': return item.par_2_weeks;
      case 'month': return item.par_month;
      default: return item.par_week;
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '3days': return '3 Days';
      case 'week': return '1 Week';
      case '2weeks': return '2 Weeks';
      case 'month': return '1 Month';
      default: return '1 Week';
    }
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    if (parLevelData.length === 0) return null;

    return {
      totalItems: parLevelData.length,
      avgDailyItems: parLevelData.reduce((s, i) => s + i.daily_average, 0),
      highDemandItems: parLevelData.filter(i => i.trend === 'up').length,
      lowDemandItems: parLevelData.filter(i => i.trend === 'down').length
    };
  }, [parLevelData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Par Level Prediction
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Summary Cards */}
          {summaryStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Items Tracked</span>
                </div>
                <p className="text-xl font-bold mt-1">{summaryStats.totalItems}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Daily Avg Units</span>
                </div>
                <p className="text-xl font-bold mt-1">{summaryStats.avgDailyItems.toFixed(1)}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Rising Demand</span>
                </div>
                <p className="text-xl font-bold mt-1 text-green-500">{summaryStats.highDemandItems}</p>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Declining</span>
                </div>
                <p className="text-xl font-bold mt-1 text-amber-500">{summaryStats.lowDemandItems}</p>
              </Card>
            </div>
          )}

          {/* Period Selection */}
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="3days" className="text-xs">3 Days</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">1 Week</TabsTrigger>
              <TabsTrigger value="2weeks" className="text-xs">2 Weeks</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">1 Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Par Level Table */}
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Analyzing order history...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No order history found</p>
              <p className="text-xs mt-1">Upload purchase orders to generate predictions</p>
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-center">Daily Avg</TableHead>
                    <TableHead className="text-center">
                      Par ({getPeriodLabel()})
                    </TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{item.item_name}</p>
                            {item.item_code && (
                              <p className="text-xs text-muted-foreground">{item.item_code}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div>
                          <p className="font-semibold">{item.total_orders}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.orders_per_week.toFixed(1)}/wk
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {item.daily_average.toFixed(1)}/day
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-base font-bold">
                          {getParValue(item)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.trend === 'up' && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            Rising
                          </Badge>
                        )}
                        {item.trend === 'down' && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                            Declining
                          </Badge>
                        )}
                        {item.trend === 'stable' && (
                          <Badge variant="outline">
                            Stable
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Methodology Note */}
          <Card className="p-3 bg-muted/50">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">How Par Levels are Calculated</p>
                <p className="mt-1">
                  Based on your purchase order history, we calculate the average daily 
                  consumption rate for each item, then project the required stock for 
                  different time periods. Trend indicators show if demand is increasing 
                  or decreasing compared to historical averages.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParLevelPrediction;
