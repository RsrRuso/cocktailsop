import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Wine, Check, ArrowLeft, RefreshCw, 
  Volume2, VolumeX, Timer, AlertTriangle,
  Settings, TrendingUp, Beaker, User
} from "lucide-react";
import { differenceInMinutes, format } from "date-fns";
import { RecipeDialog } from "@/components/bar-kds/RecipeDialog";
import { StationManagement } from "@/components/bar-kds/StationManagement";
import { BartenderPerformance } from "@/components/bar-kds/BartenderPerformance";
import { StationConsumption } from "@/components/bar-kds/StationConsumption";
import { useAuth } from "@/contexts/AuthContext";

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  unit_price: number;
  note: string | null;
  status: string;
  station_id?: string;
  bartender_id?: string;
  started_at?: string;
  menu_item?: {
    name: string;
    category?: {
      name: string;
      id: string;
    };
  };
}

interface Order {
  id: string;
  table_id: string;
  table_number?: number | null;
  status: string;
  created_at: string;
  table?: {
    name: string;
    table_number?: number | null;
  };
  items: OrderItem[];
}

interface Station {
  id: string;
  name: string;
  assigned_bartender_id: string | null;
  category_filter: string[];
  assigned_tables: number[];
  current_load: number;
  bartender?: { full_name: string };
}

export default function BarKDS() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'completed'>('new');
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    menuItemId: string;
    qty: number;
    orderId: string;
  } | null>(null);
  
  // New state for dialogs
  const [stationManagementOpen, setStationManagementOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [consumptionOpen, setConsumptionOpen] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [myStationId, setMyStationId] = useState<string | null>(null);

  useEffect(() => {
    const outletId = localStorage.getItem('lab_ops_outlet_id');
    if (outletId) {
      setSelectedOutlet(outletId);
      fetchOrders(outletId);
      fetchStations(outletId);
    } else {
      fetchFirstOutlet();
    }
  }, []);

  // Auto-select station for logged-in bartender
  useEffect(() => {
    if (user && stations.length > 0) {
      const myStation = stations.find(s => s.assigned_bartender_id === user.id);
      if (myStation) {
        setMyStationId(myStation.id);
        setSelectedStation(myStation.id);
      }
    }
  }, [user, stations]);

  const fetchStations = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_stations")
      .select("id, name, assigned_bartender_id, category_filter, assigned_tables, current_load, bartender:lab_ops_staff(full_name)")
      .eq("outlet_id", outletId)
      .eq("type", "BAR")
      .eq("is_active", true);
    
    setStations((data || []).map(s => ({
      ...s,
      category_filter: Array.isArray(s.category_filter) ? s.category_filter as string[] : [],
      assigned_tables: Array.isArray(s.assigned_tables) ? s.assigned_tables as number[] : []
    })));
  };

  useEffect(() => {
    if (!selectedOutlet) return;

    const channel = supabase
      .channel('bar-kds-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_ops_orders',
          filter: `outlet_id=eq.${selectedOutlet}`
        },
        () => {
          fetchOrders(selectedOutlet);
          if (soundEnabled) {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedOutlet, soundEnabled]);

  const fetchFirstOutlet = async () => {
    const { data } = await supabase
      .from("lab_ops_outlets")
      .select("id")
      .limit(1)
      .single();
    
    if (data) {
      setSelectedOutlet(data.id);
      localStorage.setItem('lab_ops_outlet_id', data.id);
      fetchOrders(data.id);
      fetchStations(data.id);
    }
    setIsLoading(false);
  };

  const recordPerformance = async (itemId: string, menuItemId: string, stationId: string | null, startedAt: string) => {
    if (!selectedOutlet) return;
    const station = stations.find(s => s.id === stationId);
    
    await supabase.from("lab_ops_bartender_item_performance").insert({
      outlet_id: selectedOutlet,
      station_id: stationId,
      bartender_id: station?.assigned_bartender_id,
      order_item_id: itemId,
      menu_item_id: menuItemId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      time_seconds: Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
      shift_date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const fetchOrders = async (outletId: string) => {
    try {
      // Fetch active orders with table_number
      const { data: activeOrdersData, error: activeError } = await supabase
        .from("lab_ops_orders")
        .select(`
          id, table_id, status, created_at,
          table:lab_ops_tables(name, table_number)
        `)
        .eq("outlet_id", outletId)
        .in("status", ["open", "in_progress", "sent"])
        .order("created_at", { ascending: true });

      if (activeError) throw activeError;

      // Fetch recently completed orders (last 30 mins)
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: completedOrdersData, error: completedError } = await supabase
        .from("lab_ops_orders")
        .select(`
          id, table_id, status, created_at,
          table:lab_ops_tables(name, table_number)
        `)
        .eq("outlet_id", outletId)
        .in("status", ["ready", "closed"])
        .gte("updated_at", thirtyMinsAgo)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (completedError) throw completedError;

      // Process all orders and separate based on item status
      const activeWithItems: Order[] = [];
      const readyOrders: Order[] = [];
      
      for (const order of activeOrdersData || []) {
        const { data: items } = await supabase
          .from("lab_ops_order_items")
          .select(`
            id, order_id, menu_item_id, qty, unit_price, note, status,
            menu_item:lab_ops_menu_items(
              name,
              category:lab_ops_categories(name, type, id)
            )
          `)
          .eq("order_id", order.id);

        // Filter items by category type = 'drink' for bar
        const barItems = (items || []).filter(item => 
          (item.menu_item as any)?.category?.type === 'drink'
        );

        if (barItems.length > 0) {
          const tableData = order.table as any;
          const orderData: Order = {
            id: order.id,
            table_id: order.table_id,
            table_number: tableData?.table_number,
            status: order.status,
            created_at: order.created_at,
            table: tableData,
            items: barItems as unknown as OrderItem[]
          };

          // Check if ALL bar items are ready
          const allItemsReady = barItems.every(item => item.status === 'ready');
          
          if (allItemsReady) {
            readyOrders.push(orderData);
          } else {
            activeWithItems.push(orderData);
          }
        }
      }

      // Process closed/ready orders from DB
      const completedWithItems: Order[] = [];
      for (const order of completedOrdersData || []) {
        const { data: items } = await supabase
          .from("lab_ops_order_items")
          .select(`
            id, order_id, menu_item_id, qty, unit_price, note, status,
            menu_item:lab_ops_menu_items(
              name,
              category:lab_ops_categories(name, type, id)
            )
          `)
          .eq("order_id", order.id);

        // Filter items by category type = 'drink' for bar
        const barItems = (items || []).filter(item => 
          (item.menu_item as any)?.category?.type === 'drink'
        );

        if (barItems.length > 0) {
          const tableData = order.table as any;
          completedWithItems.push({
            id: order.id,
            table_id: order.table_id,
            table_number: tableData?.table_number,
            status: order.status,
            created_at: order.created_at,
            table: tableData,
            items: barItems as unknown as OrderItem[]
          });
        }
      }

      setOrders(activeWithItems);
      // Combine ready orders with completed orders
      setCompletedOrders([...readyOrders, ...completedWithItems]);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter orders based on selected station
  const getFilteredOrders = (allOrders: Order[]) => {
    if (selectedStation === "all") return allOrders;
    
    const station = stations.find(s => s.id === selectedStation);
    if (!station) return allOrders;

    return allOrders.filter(order => {
      // Filter by assigned tables if configured
      if (station.assigned_tables.length > 0) {
        const tableNum = order.table_number || order.table?.table_number;
        if (tableNum && !station.assigned_tables.includes(tableNum)) {
          return false;
        }
        // If order has no table number and station has table filter, exclude it
        if (!tableNum) return false;
      }

      // Filter by category if configured
      if (station.category_filter.length > 0) {
        const hasMatchingItem = order.items.some(item => {
          const categoryId = (item.menu_item as any)?.category?.id;
          return categoryId && station.category_filter.includes(categoryId);
        });
        if (!hasMatchingItem) return false;
      }

      return true;
    });
  };

  const filteredOrders = getFilteredOrders(orders);
  const filteredCompletedOrders = getFilteredOrders(completedOrders);

  const playNotificationSound = () => {
    const audio = new Audio('/notification.wav');
    audio.play().catch(() => {});
  };

  const startItem = async (item: OrderItem, orderId: string) => {
    try {
      await supabase
        .from("lab_ops_order_items")
        .update({ status: "in_progress" })
        .eq("id", item.id);

      // Notify server that item is being prepared
      await notifyServerStarted(orderId, item.id);

      // Open recipe dialog
      setSelectedItem({
        id: item.id,
        name: item.menu_item?.name || "Unknown",
        menuItemId: item.menu_item_id,
        qty: item.qty,
        orderId
      });
      setRecipeDialogOpen(true);

      toast({ title: "Started preparing item - Server notified!" });
      if (selectedOutlet) fetchOrders(selectedOutlet);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const notifyServerStarted = async (orderId: string, itemId: string) => {
    try {
      // Get order details to find server
      const { data: order } = await supabase
        .from("lab_ops_orders")
        .select("id, server_id, outlet_id, table:lab_ops_tables(name)")
        .eq("id", orderId)
        .single();
      
      if (!order?.server_id) return;
      
      const tableName = (order.table as any)?.name || "Unknown";
      
      // Get item name
      const { data: item } = await supabase
        .from("lab_ops_order_items")
        .select("menu_item:lab_ops_menu_items(name)")
        .eq("id", itemId)
        .single();
      
      const itemName = (item?.menu_item as any)?.name || "Item";
      
      await supabase
        .from("lab_ops_order_notifications")
        .insert({
          outlet_id: order.outlet_id,
          order_id: orderId,
          order_item_id: itemId,
          server_id: order.server_id,
          notification_type: "item_started",
          message: `🔥 ${itemName} for ${tableName} is being prepared!`,
        });
    } catch (error) {
      console.error("Error notifying server:", error);
    }
  };

  const notifyServer = async (orderId: string, itemId?: string) => {
    try {
      // Get order details to find server
      const { data: order } = await supabase
        .from("lab_ops_orders")
        .select("id, server_id, outlet_id, table:lab_ops_tables(name)")
        .eq("id", orderId)
        .single();
      
      if (!order?.server_id) return;
      
      const tableName = (order.table as any)?.name || "Unknown";
      
      await supabase
        .from("lab_ops_order_notifications")
        .insert({
          outlet_id: order.outlet_id,
          order_id: orderId,
          order_item_id: itemId || null,
          server_id: order.server_id,
          notification_type: itemId ? "item_ready" : "order_ready",
          message: itemId 
            ? `Item ready for ${tableName}` 
            : `All items ready for ${tableName}`,
        });
    } catch (error) {
      console.error("Error notifying server:", error);
    }
  };

  const markItemComplete = async (itemId: string, orderId: string) => {
    try {
      await supabase
        .from("lab_ops_order_items")
        .update({ status: "ready", server_notified: true, notified_at: new Date().toISOString() })
        .eq("id", itemId);

      // Notify server
      await notifyServer(orderId, itemId);

      toast({ title: "Item marked as ready - Server notified!" });
      if (selectedOutlet) fetchOrders(selectedOutlet);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const markOrderComplete = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        for (const item of order.items) {
          await supabase
            .from("lab_ops_order_items")
            .update({ status: "ready", server_notified: true, notified_at: new Date().toISOString() })
            .eq("id", item.id);
        }
      }

      // Notify server that whole order is ready
      await notifyServer(orderId);

      toast({ title: "All bar items ready - Server notified!" });
      if (selectedOutlet) fetchOrders(selectedOutlet);
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const getOrderAge = (createdAt: string) => {
    return differenceInMinutes(new Date(), new Date(createdAt));
  };

  const getAgeColor = (minutes: number) => {
    if (minutes < 5) return "bg-green-500";
    if (minutes < 10) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 p-3 sm:p-4 sticky top-0 z-10">
        {/* Top Row - Title and Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.location.href = '/lab-ops'}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Wine className="h-6 w-6 text-amber-300" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Bar KDS</h1>
              <p className="text-amber-200 text-xs">
                {orders.length} new • {completedOrders.length} done
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => selectedOutlet && fetchOrders(selectedOutlet)}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Station Selector */}
        <div className="mt-3">
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger className="bg-black/30 border-amber-600/50 text-white h-9">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  {selectedStation === "all" 
                    ? "All Stations" 
                    : stations.find(s => s.id === selectedStation)?.name || "Select Station"
                  }
                  {myStationId === selectedStation && selectedStation !== "all" && (
                    <Badge className="bg-green-600 text-xs px-1 py-0">You</Badge>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Stations</SelectItem>
              {stations.map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  <div className="flex items-center gap-2">
                    {station.name}
                    {station.assigned_bartender_id && (
                      <span className="text-gray-400 text-xs">
                        ({station.bartender?.full_name || "Assigned"})
                      </span>
                    )}
                    {myStationId === station.id && (
                      <Badge className="bg-green-600 text-xs px-1 py-0 ml-1">You</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Management Buttons Row */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStationManagementOpen(true)}
            className="text-white hover:bg-white/20 text-xs px-2.5 py-1.5 h-8 whitespace-nowrap"
          >
            <Settings className="h-3.5 w-3.5 mr-1" /> Stations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPerformanceOpen(true)}
            className="text-white hover:bg-white/20 text-xs px-2.5 py-1.5 h-8 whitespace-nowrap"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> Performance
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConsumptionOpen(true)}
            className="text-white hover:bg-white/20 text-xs px-2.5 py-1.5 h-8 whitespace-nowrap"
          >
            <Beaker className="h-3.5 w-3.5 mr-1" /> Consumption
          </Button>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('new')}
            size="sm"
            className={`flex-1 text-xs sm:text-sm ${activeTab === 'new' 
              ? 'bg-amber-600 hover:bg-amber-700' 
              : 'text-white hover:bg-white/20'
            }`}
          >
            New Orders ({filteredOrders.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('completed')}
            size="sm"
            className={`flex-1 text-xs sm:text-sm ${activeTab === 'completed' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'text-white hover:bg-white/20'
            }`}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Completed ({filteredCompletedOrders.length})
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="p-4">
        {activeTab === 'new' ? (
          filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <Wine className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-xl">No pending bar orders</p>
              {selectedStation !== "all" && orders.length > 0 && (
                <p className="text-sm mt-2">({orders.length} orders at other stations)</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOrders.map((order, index) => {
                const ageMinutes = getOrderAge(order.created_at);
                return (
                  <Card 
                    key={order.id} 
                    className="bg-gray-900 border-gray-700 overflow-hidden"
                  >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                          #{index + 1}
                          <Badge variant="outline" className="text-amber-400 border-amber-400">
                            {order.table?.name || "Table"}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${getAgeColor(ageMinutes)}`} />
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {ageMinutes}m ago
                          </span>
                          {ageMinutes >= 10 && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div 
                              key={item.id}
                              className={`p-3 rounded-lg border ${
                                item.status === 'ready' 
                                  ? 'bg-green-900/30 border-green-700' 
                                  : item.status === 'in_progress'
                                  ? 'bg-amber-900/30 border-amber-700'
                                  : 'bg-gray-800 border-gray-700'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-amber-400">
                                      {item.qty}×
                                    </span>
                                    <span className="text-white font-medium">
                                      {item.menu_item?.name}
                                    </span>
                                  </div>
                                  {item.note && (
                                    <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-600 rounded">
                                      <p className="text-sm text-yellow-200 font-medium">
                                        📝 {item.note}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  {item.status === 'sent' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => startItem(item, order.id)}
                                      className="text-amber-400 hover:bg-amber-900/50"
                                    >
                                      Start
                                    </Button>
                                  )}
                                  {(item.status === 'sent' || item.status === 'in_progress') && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => markItemComplete(item.id, order.id)}
                                      className="text-green-400 hover:bg-green-900/50"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {item.status === 'in_progress' && (
                                    <Badge className="bg-amber-600">Making</Badge>
                                  )}
                                  {item.status === 'ready' && (
                                    <Badge className="bg-green-600">Ready</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <Button
                        className="w-full mt-3 bg-amber-600 hover:bg-amber-700"
                        onClick={() => markOrderComplete(order.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Complete All
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          filteredCompletedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <Check className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-xl">No recently completed orders</p>
              {selectedStation !== "all" && completedOrders.length > 0 && (
                <p className="text-sm mt-2">({completedOrders.length} completed at other stations)</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCompletedOrders.map((order, index) => (
                <Card 
                  key={order.id} 
                  className="bg-green-950/50 border-green-800 overflow-hidden"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-400" />
                      #{index + 1}
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        {order.table?.name || "Table"}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-gray-400">
                      Completed {getOrderAge(order.created_at)}m ago
                    </p>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div 
                            key={item.id}
                            className="p-2 rounded bg-green-900/30 border border-green-800"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-green-400">
                                {item.qty}×
                              </span>
                              <span className="text-white text-sm">
                                {item.menu_item?.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Recipe Dialog */}
      {selectedItem && (
        <RecipeDialog
          open={recipeDialogOpen}
          onClose={() => {
            setRecipeDialogOpen(false);
            setSelectedItem(null);
          }}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          menuItemId={selectedItem.menuItemId}
          qty={selectedItem.qty}
          orderId={selectedItem.orderId}
          onComplete={() => markItemComplete(selectedItem.id, selectedItem.orderId)}
        />
      )}

      {/* Station Management Dialog */}
      {selectedOutlet && (
        <StationManagement
          open={stationManagementOpen}
          onClose={() => setStationManagementOpen(false)}
          outletId={selectedOutlet}
          onStationsChange={() => fetchStations(selectedOutlet)}
        />
      )}

      {/* Bartender Performance Dialog */}
      {selectedOutlet && (
        <BartenderPerformance
          open={performanceOpen}
          onClose={() => setPerformanceOpen(false)}
          outletId={selectedOutlet}
        />
      )}

      {/* Station Consumption Dialog */}
      {selectedOutlet && (
        <StationConsumption
          open={consumptionOpen}
          onClose={() => setConsumptionOpen(false)}
          outletId={selectedOutlet}
        />
      )}
    </div>
  );
}