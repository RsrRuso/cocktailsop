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
  Minus,
  FileText,
  Calendar
} from "lucide-react";
import { differenceInDays, format } from "date-fns";

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
  days_tracked: number;
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

  // Fetch ALL purchase order items from ALL documents
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
            id,
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

  // Calculate par levels based on ALL historical data
  const { parLevelData, totalDocuments, dateRange } = useMemo(() => {
    if (!orderHistory || orderHistory.length === 0) {
      return { parLevelData: [], totalDocuments: 0, dateRange: null };
    }

    // Count unique PO documents
    const uniquePOIds = new Set<string>();
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    // Group by item name
    const itemMap = new Map<string, {
      item_code: string | null;
      orders: { date: string; quantity: number; poId: string }[];
    }>();

    orderHistory.forEach((item: any) => {
      const orderDate = item.purchase_orders?.order_date;
      const poId = item.purchase_orders?.id;
      if (!orderDate || !poId) return;

      uniquePOIds.add(poId);
      
      const itemDate = new Date(orderDate);
      if (!earliestDate || itemDate < earliestDate) earliestDate = itemDate;
      if (!latestDate || itemDate > latestDate) latestDate = itemDate;

      const key = item.item_name.toLowerCase().trim();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item_code: item.item_code,
          orders: []
        });
      }
      itemMap.get(key)!.orders.push({
        date: orderDate,
        quantity: Number(item.quantity) || 0,
        poId
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
      
      // Total quantity from ALL orders ever
      const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
      const totalOrders = orders.length;
      const uniquePOs = new Set(orders.map(o => o.poId)).size;

      // Days from first order to today
      const daysCovered = Math.max(
        differenceInDays(today, new Date(firstOrderDate)),
        7 // Minimum 7 days
      );

      // Daily average = Total qty ever ordered / Total days tracked
      const dailyAverage = totalQuantity / daysCovered;
      const weeksCovered = Math.max(daysCovered / 7, 1);
      const ordersPerWeek = totalOrders / weeksCovered;

      // Trend analysis
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
        days_tracked: daysCovered,
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

    return {
      parLevelData: results.sort((a, b) => b.daily_average - a.daily_average),
      totalDocuments: uniquePOIds.size,
      dateRange: earliestDate && latestDate ? {
        from: earliestDate,
        to: latestDate
      } : null
    };
  }, [orderHistory]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return parLevelData;
    const query = searchQuery.toLowerCase();
    return parLevelData.filter(item => 
      item.item_name.toLowerCase().includes(query) ||
      item.item_code?.toLowerCase().includes(query)
    );
  }, [parLevelData, searchQuery]);

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
      case '3days': return '3D';
      case 'week': return '1W';
      case '2weeks': return '2W';
      case 'month': return '1M';
      default: return '1W';
    }
  };

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
      <DialogContent className="w-[95vw] max-w-lg h-[85vh] max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="p-3 pb-2 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Par Level Prediction
          </DialogTitle>
          {/* Data Source Info */}
          {totalDocuments > 0 && dateRange && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {totalDocuments} PO{totalDocuments > 1 ? 's' : ''} analyzed
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-3 pt-2 gap-2">
          {/* Summary Cards */}
          {summaryStats && (
            <div className="grid grid-cols-4 gap-1.5 shrink-0">
              <Card className="p-2 text-center">
                <Package className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                <p className="text-lg font-bold">{summaryStats.totalItems}</p>
                <p className="text-[9px] text-muted-foreground">Items</p>
              </Card>
              <Card className="p-2 text-center">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                <p className="text-lg font-bold">{summaryStats.avgDailyItems.toFixed(0)}</p>
                <p className="text-[9px] text-muted-foreground">Daily Avg</p>
              </Card>
              <Card className="p-2 text-center">
                <ArrowUpRight className="h-3.5 w-3.5 text-green-500 mx-auto" />
                <p className="text-lg font-bold text-green-500">{summaryStats.highDemandItems}</p>
                <p className="text-[9px] text-muted-foreground">Rising</p>
              </Card>
              <Card className="p-2 text-center">
                <ArrowDownRight className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                <p className="text-lg font-bold text-amber-500">{summaryStats.lowDemandItems}</p>
                <p className="text-[9px] text-muted-foreground">Declining</p>
              </Card>
            </div>
          )}

          {/* Period Selection */}
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)} className="shrink-0">
            <TabsList className="grid grid-cols-4 h-8">
              <TabsTrigger value="3days" className="text-[10px] px-1">3 Days</TabsTrigger>
              <TabsTrigger value="week" className="text-[10px] px-1">Week</TabsTrigger>
              <TabsTrigger value="2weeks" className="text-[10px] px-1">2 Weeks</TabsTrigger>
              <TabsTrigger value="month" className="text-[10px] px-1">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>

          {/* Items List */}
          <ScrollArea className="flex-1 -mx-3 px-3">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Analyzing all order history...
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
                    {/* Item Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm leading-tight">{item.item_name}</p>
                          {item.item_code && (
                            <p className="text-[10px] text-muted-foreground">{item.item_code}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Trend */}
                      {item.trend === 'up' && (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-5">
                          <ArrowUpRight className="h-3 w-3 mr-0.5" />
                          Rising
                        </Badge>
                      )}
                      {item.trend === 'down' && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] h-5">
                          <ArrowDownRight className="h-3 w-3 mr-0.5" />
                          Down
                        </Badge>
                      )}
                      {item.trend === 'stable' && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          <Minus className="h-3 w-3 mr-0.5" />
                          Stable
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-5 gap-1 text-xs">
                      <div className="bg-muted/50 rounded p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Total Qty</p>
                        <p className="font-bold text-sm">{item.total_quantity}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Orders</p>
                        <p className="font-bold text-sm">{item.total_orders}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Days</p>
                        <p className="font-bold text-sm">{item.days_tracked}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Avg/Day</p>
                        <p className="font-bold text-sm">{item.daily_average.toFixed(1)}</p>
                      </div>
                      <div className="bg-primary/10 rounded p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Par {getPeriodLabel()}</p>
                        <p className="font-bold text-sm text-primary">{getParValue(item)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Methodology Note */}
          <Card className="p-2 bg-muted/50 shrink-0">
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-medium">Formula:</span> Daily Avg = Total Qty (all POs) ÷ Days since first order. 
                Par = Daily Avg × Period days.
              </p>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParLevelPrediction;
