import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { 
  Wine, Check, ArrowLeft, RefreshCw, 
  Volume2, VolumeX, Timer, AlertTriangle
} from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  unit_price: number;
  note: string | null;
  status: string;
  menu_item?: {
    name: string;
    category?: {
      name: string;
    };
  };
}

interface Order {
  id: string;
  table_id: string;
  status: string;
  created_at: string;
  table?: {
    name: string;
  };
  items: OrderItem[];
}

export default function BarKDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'completed'>('new');

  useEffect(() => {
    const outletId = localStorage.getItem('lab_ops_outlet_id');
    if (outletId) {
      setSelectedOutlet(outletId);
      fetchOrders(outletId);
    } else {
      fetchFirstOutlet();
    }
  }, []);

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
    }
    setIsLoading(false);
  };

  const fetchOrders = async (outletId: string) => {
    try {
      // Fetch active orders
      const { data: activeOrdersData, error: activeError } = await supabase
        .from("lab_ops_orders")
        .select(`
          id, table_id, status, created_at,
          table:lab_ops_tables(name)
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
          table:lab_ops_tables(name)
        `)
        .eq("outlet_id", outletId)
        .in("status", ["ready", "closed"])
        .gte("updated_at", thirtyMinsAgo)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (completedError) throw completedError;

      // Get bar station IDs
      const { data: barStations } = await supabase
        .from("lab_ops_stations")
        .select("id")
        .eq("outlet_id", outletId)
        .eq("type", "BAR");
      
      const barStationIds = (barStations || []).map(s => s.id);

      // Get menu items assigned to bar stations
      const { data: barItemMappings } = await supabase
        .from("lab_ops_menu_item_stations")
        .select("menu_item_id")
        .in("station_id", barStationIds.length > 0 ? barStationIds : ['none']);
      
      const barMenuItemIds = (barItemMappings || []).map(m => m.menu_item_id);

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
              category:lab_ops_categories(name)
            )
          `)
          .eq("order_id", order.id);

        // Filter items by station mapping
        const barItems = (items || []).filter(item => 
          barMenuItemIds.includes(item.menu_item_id)
        );

        if (barItems.length > 0) {
          const orderData: Order = {
            id: order.id,
            table_id: order.table_id,
            status: order.status,
            created_at: order.created_at,
            table: order.table as any,
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
              category:lab_ops_categories(name)
            )
          `)
          .eq("order_id", order.id);

        const barItems = (items || []).filter(item => 
          barMenuItemIds.includes(item.menu_item_id)
        );

        if (barItems.length > 0) {
          completedWithItems.push({
            id: order.id,
            table_id: order.table_id,
            status: order.status,
            created_at: order.created_at,
            table: order.table as any,
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

  const playNotificationSound = () => {
    const audio = new Audio('/notification.wav');
    audio.play().catch(() => {});
  };

  const startItem = async (itemId: string, orderId: string) => {
    try {
      await supabase
        .from("lab_ops_order_items")
        .update({ status: "in_progress" })
        .eq("id", itemId);

      // Notify server that item is being prepared
      await notifyServerStarted(orderId, itemId);

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
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.location.href = '/lab-ops'}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Wine className="h-8 w-8 text-amber-300" />
            <div>
              <h1 className="text-2xl font-bold">Bar KDS</h1>
              <p className="text-amber-200 text-sm">
                {orders.length} new • {completedOrders.length} completed
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white hover:bg-white/20"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => selectedOutlet && fetchOrders(selectedOutlet)}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Tab Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'new' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('new')}
            className={activeTab === 'new' 
              ? 'bg-amber-600 hover:bg-amber-700' 
              : 'text-white hover:bg-white/20'
            }
          >
            New Orders ({orders.length})
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('completed')}
            className={activeTab === 'completed' 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'text-white hover:bg-white/20'
            }
          >
            <Check className="h-4 w-4 mr-2" />
            Completed ({completedOrders.length})
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="p-4">
        {activeTab === 'new' ? (
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <Wine className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-xl">No pending bar orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orders.map((order, index) => {
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
                                      onClick={() => startItem(item.id, order.id)}
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
          completedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <Check className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-xl">No recently completed orders</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {completedOrders.map((order, index) => (
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
    </div>
  );
}