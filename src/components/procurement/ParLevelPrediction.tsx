import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  Package, 
  Search,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { differenceInDays, subDays } from "date-fns";

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

      // Calculate the date range - use 7 days minimum for daily average calculation
      const daysCovered = Math.max(
        differenceInDays(today, new Date(firstOrderDate)),
        7 // Minimum 7 days for weekly calculation
      );

      // Daily average = total quantity purchased / period days
      // E.g., 70 pcs ordered once in a week = 70 / 7 = 10 per day
      const dailyAverage = totalQuantity / daysCovered;

      // Orders per week
      const weeksCovered = Math.max(daysCovered / 7, 1);
      const ordersPerWeek = totalOrders / weeksCovered;

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
      <DialogContent className="w-[95vw] max-w-2xl h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Par Level Prediction
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 pt-3 gap-3">
          {/* Summary Cards - Mobile Optimized */}
          {summaryStats && (
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <Card className="p-2.5">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Items</span>
                </div>
                <p className="text-lg font-bold">{summaryStats.totalItems}</p>
              </Card>
              <Card className="p-2.5">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Daily Avg</span>
                </div>
                <p className="text-lg font-bold">{summaryStats.avgDailyItems.toFixed(1)}</p>
              </Card>
              <Card className="p-2.5">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-[10px] text-muted-foreground">Rising</span>
                </div>
                <p className="text-lg font-bold text-green-500">{summaryStats.highDemandItems}</p>
              </Card>
              <Card className="p-2.5">
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[10px] text-muted-foreground">Declining</span>
                </div>
                <p className="text-lg font-bold text-amber-500">{summaryStats.lowDemandItems}</p>
              </Card>
            </div>
          )}

          {/* Period Selection - Mobile Tabs */}
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)} className="shrink-0">
            <TabsList className="grid grid-cols-4 h-9">
              <TabsTrigger value="3days" className="text-[11px] px-1">3 Days</TabsTrigger>
              <TabsTrigger value="week" className="text-[11px] px-1">Week</TabsTrigger>
              <TabsTrigger value="2weeks" className="text-[11px] px-1">2 Weeks</TabsTrigger>
              <TabsTrigger value="month" className="text-[11px] px-1">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Items List - Mobile Card Layout */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Analyzing order history...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No order history found</p>
                <p className="text-xs mt-1">Upload purchase orders to generate predictions</p>
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                {filteredItems.map((item, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-medium text-sm truncate">{item.item_name}</p>
                        </div>
                        {item.item_code && (
                          <p className="text-[10px] text-muted-foreground ml-6">{item.item_code}</p>
                        )}
                      </div>
                      
                      {/* Trend Badge */}
                      <div className="shrink-0">
                        {item.trend === 'up' && (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        )}
                        {item.trend === 'down' && (
                          <ArrowDownRight className="h-4 w-4 text-amber-500" />
                        )}
                        {item.trend === 'stable' && (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Total Qty: </span>
                          <span className="font-medium">{item.total_quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Orders: </span>
                          <span className="font-medium">{item.total_orders}</span>
                        </div>
                      </div>
                      
                      <Badge variant="outline" className="text-[10px]">
                        {item.daily_average.toFixed(1)}/day
                      </Badge>
                    </div>
                    
                    {/* Par Level Display */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        Par Level ({getPeriodLabel()})
                      </span>
                      <Badge variant="secondary" className="text-sm font-bold px-3">
                        {getParValue(item)} units
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Methodology Note */}
          <Card className="p-2.5 bg-muted/50 shrink-0">
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-medium">How it works:</span> Daily avg = Total qty purchased ÷ Days tracked. 
                Par levels are projections based on this daily consumption rate.
              </p>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParLevelPrediction;
