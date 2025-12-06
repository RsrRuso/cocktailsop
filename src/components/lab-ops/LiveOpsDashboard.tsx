import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, CheckCircle, AlertTriangle, TrendingUp, 
  Activity, Timer, Zap, BarChart3, Users, ChefHat,
  Wine, ArrowUp, ArrowDown, Circle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveOpsDashboardProps {
  outletId: string;
  outletName: string;
}

interface OrderStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  delayedOrders: number;
  avgTimePerItem: number;
  avgTimePerOrder: number;
  fastestItem: number;
  slowestItem: number;
}

interface LiveOrderItem {
  id: string;
  name: string;
  tableName: string;
  status: string;
  sentAt: string;
  startedAt: string | null;
  readyAt: string | null;
  waitTime: number;
  isDelayed: boolean;
}

const DELAY_THRESHOLD_MINUTES = 10;

export default function LiveOpsDashboard({ outletId, outletName }: LiveOpsDashboardProps) {
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    delayedOrders: 0,
    avgTimePerItem: 0,
    avgTimePerOrder: 0,
    fastestItem: 0,
    slowestItem: 0
  });
  const [liveItems, setLiveItems] = useState<LiveOrderItem[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<LiveOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's orders
    const { data: orders } = await supabase
      .from("lab_ops_orders")
      .select("id, status, created_at, closed_at")
      .eq("outlet_id", outletId)
      .gte("created_at", today.toISOString());

    // Fetch order items with timing
    const { data: items } = await supabase
      .from("lab_ops_order_items")
      .select(`
        id, status, sent_at, ready_at, qty,
        lab_ops_menu_items(name),
        lab_ops_orders!inner(outlet_id, table_id, lab_ops_tables(name))
      `)
      .eq("lab_ops_orders.outlet_id", outletId)
      .gte("sent_at", today.toISOString())
      .order("sent_at", { ascending: false });

    const now = new Date();
    
    // Type assertion for items
    const typedItems = (items || []) as Array<{
      id: string;
      status: string;
      sent_at: string;
      ready_at: string | null;
      qty: number;
      lab_ops_menu_items: { name: string } | null;
      lab_ops_orders: { outlet_id: string; table_id: string; lab_ops_tables: { name: string } | null } | null;
    }>;
    
    // Calculate stats using typed items
    const completedItems = typedItems.filter(i => i.status === "ready" && i.ready_at);
    const pendingItems = typedItems.filter(i => i.status === "sent" || i.status === "in_progress");
    
    // Calculate timing stats
    const itemTimes = completedItems
      .filter(i => i.sent_at && i.ready_at)
      .map(i => {
        const sent = new Date(i.sent_at).getTime();
        const ready = new Date(i.ready_at!).getTime();
        return (ready - sent) / 1000 / 60; // minutes
      });

    const avgTimePerItem = itemTimes.length > 0 
      ? itemTimes.reduce((a, b) => a + b, 0) / itemTimes.length 
      : 0;

    // Calculate delayed items (waiting more than threshold)
    const delayedItems = pendingItems.filter(i => {
      const sentTime = new Date(i.sent_at).getTime();
      const waitMinutes = (now.getTime() - sentTime) / 1000 / 60;
      return waitMinutes > DELAY_THRESHOLD_MINUTES;
    });

    // Live items for display
    const liveOrderItems: LiveOrderItem[] = pendingItems.map(i => {
      const sentTime = new Date(i.sent_at).getTime();
      const waitMinutes = (now.getTime() - sentTime) / 1000 / 60;
      return {
        id: i.id,
        name: i.lab_ops_menu_items?.name || "Unknown",
        tableName: i.lab_ops_orders?.lab_ops_tables?.name || "Unknown",
        status: i.status,
        sentAt: i.sent_at,
        startedAt: null,
        readyAt: i.ready_at,
        waitTime: waitMinutes,
        isDelayed: waitMinutes > DELAY_THRESHOLD_MINUTES
      };
    });

    // Recent completed for display
    const recentCompletedItems: LiveOrderItem[] = completedItems.slice(0, 10).map(i => {
      const sentTime = new Date(i.sent_at).getTime();
      const readyTime = new Date(i.ready_at!).getTime();
      const totalMinutes = (readyTime - sentTime) / 1000 / 60;
      return {
        id: i.id,
        name: i.lab_ops_menu_items?.name || "Unknown",
        tableName: i.lab_ops_orders?.lab_ops_tables?.name || "Unknown",
        status: i.status,
        sentAt: i.sent_at,
        startedAt: null,
        readyAt: i.ready_at,
        waitTime: totalMinutes,
        isDelayed: totalMinutes > DELAY_THRESHOLD_MINUTES
      };
    });

    setStats({
      totalOrders: orders?.length || 0,
      completedOrders: orders?.filter(o => o.status === "closed").length || 0,
      pendingOrders: pendingItems.length,
      delayedOrders: delayedItems.length,
      avgTimePerItem: Math.round(avgTimePerItem * 10) / 10,
      avgTimePerOrder: 0,
      fastestItem: itemTimes.length > 0 ? Math.round(Math.min(...itemTimes) * 10) / 10 : 0,
      slowestItem: itemTimes.length > 0 ? Math.round(Math.max(...itemTimes) * 10) / 10 : 0
    });

    setLiveItems(liveOrderItems);
    setRecentCompleted(recentCompletedItems);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription
    const channel = supabase
      .channel('lab-ops-live-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_ops_order_items'
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_ops_orders'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Refresh every 30 seconds for wait time updates
    const interval = setInterval(fetchData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [outletId]);

  const formatTime = (minutes: number) => {
    if (minutes < 1) return "<1m";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-500";
      case "in_progress": return "bg-yellow-500";
      case "ready": return "bg-green-500";
      default: return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-semibold">Live Operations</h2>
          <Badge variant="outline" className="text-xs">
            {outletName}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
          Updated {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pendingOrders}</p>
              </div>
              <Timer className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${stats.delayedOrders > 0 ? 'from-red-500/10 to-red-500/5' : 'from-muted/50 to-muted/25'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delayed</p>
                <p className={`text-2xl font-bold ${stats.delayedOrders > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {stats.delayedOrders}
                </p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${stats.delayedOrders > 0 ? 'text-red-500/50 animate-pulse' : 'text-muted/50'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Time</p>
                <p className="text-2xl font-bold text-primary">{formatTime(stats.avgTimePerItem)}</p>
              </div>
              <Clock className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Pending Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-500" />
              Pending Items
              <Badge variant="secondary" className="ml-auto">{liveItems.filter(i => i.status === "sent").length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {liveItems.filter(i => i.status === "sent").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending items</p>
                ) : (
                  liveItems.filter(i => i.status === "sent").map(item => (
                    <div 
                      key={item.id} 
                      className={`p-2 rounded-lg border ${item.isDelayed ? 'border-red-500 bg-red-500/5' : 'border-border'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <Badge variant={item.isDelayed ? "destructive" : "outline"} className="text-xs">
                          {formatTime(item.waitTime)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.tableName}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Column 2: In Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              In Progress
              <Badge variant="secondary" className="ml-auto">{liveItems.filter(i => i.status === "in_progress").length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {liveItems.filter(i => i.status === "in_progress").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No items in progress</p>
                ) : (
                  liveItems.filter(i => i.status === "in_progress").map(item => (
                    <div 
                      key={item.id} 
                      className={`p-2 rounded-lg border border-yellow-500/50 bg-yellow-500/5`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <Badge variant="secondary" className="text-xs bg-yellow-500/20">
                          {formatTime(item.waitTime)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.tableName}</p>
                      <Progress 
                        value={Math.min((item.waitTime / DELAY_THRESHOLD_MINUTES) * 100, 100)} 
                        className="h-1 mt-2"
                      />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Column 3: Recent Completed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Recent Completed
              <Badge variant="secondary" className="ml-auto">{recentCompleted.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="p-3 space-y-2">
                {recentCompleted.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No completed items yet</p>
                ) : (
                  recentCompleted.map(item => (
                    <div 
                      key={item.id} 
                      className="p-2 rounded-lg border border-green-500/30 bg-green-500/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <Badge variant="outline" className="text-xs text-green-600">
                          {formatTime(item.waitTime)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.tableName}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Fastest</p>
                <p className="font-semibold">{formatTime(stats.fastestItem)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Slowest</p>
                <p className="font-semibold">{formatTime(stats.slowestItem)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="font-semibold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="font-semibold">
                  {stats.totalOrders > 0 
                    ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}