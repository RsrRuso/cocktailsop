import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { 
  ChefHat, Check, ArrowLeft, RefreshCw, 
  Volume2, VolumeX, Timer, AlertTriangle, Flame
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

export default function KitchenKDS() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "completed">("new");

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
      .channel('kitchen-kds-orders')
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

      // Fetch completed orders (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: completedOrdersData, error: completedError } = await supabase
        .from("lab_ops_orders")
        .select(`
          id, table_id, status, created_at,
          table:lab_ops_tables(name)
        `)
        .eq("outlet_id", outletId)
        .eq("status", "closed")
        .gte("created_at", thirtyMinutesAgo)
        .order("created_at", { ascending: false });

      if (completedError) throw completedError;

      const kitchenCategories = ["Appetizers", "Main Courses", "Desserts", "Starters", "Salads", "Sides"];

      // Process all orders and separate based on item status
      const activeOrdersWithItems: Order[] = [];
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

        const kitchenItems = (items || []).filter(item => 
          kitchenCategories.includes((item.menu_item as any)?.category?.name || "")
        );

        if (kitchenItems.length > 0) {
          const orderData: Order = {
            id: order.id,
            table_id: order.table_id,
            status: order.status,
            created_at: order.created_at,
            table: order.table as any,
            items: kitchenItems as unknown as OrderItem[]
          };

          // Check if ALL kitchen items are ready
          const allItemsReady = kitchenItems.every(item => item.status === 'ready');
          
          if (allItemsReady) {
            readyOrders.push(orderData);
          } else {
            activeOrdersWithItems.push(orderData);
          }
        }
      }

      // Process closed orders from DB
      const completedOrdersWithItems: Order[] = [];
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

        const kitchenItems = (items || []).filter(item => 
          kitchenCategories.includes((item.menu_item as any)?.category?.name || "")
        );

        if (kitchenItems.length > 0) {
          completedOrdersWithItems.push({
            id: order.id,
            table_id: order.table_id,
            status: order.status,
            created_at: order.created_at,
            table: order.table as any,
            items: kitchenItems as unknown as OrderItem[]
          });
        }
      }

      setOrders(activeOrdersWithItems);
      // Combine ready orders with completed orders
      setCompletedOrders([...readyOrders, ...completedOrdersWithItems]);
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

  const markItemComplete = async (itemId: string) => {
    try {
      await supabase
        .from("lab_ops_order_items")
        .update({ status: "ready" })
        .eq("id", itemId);

      toast({ title: "Item marked as ready" });
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
            .update({ status: "ready" })
            .eq("id", item.id);
        }
      }

      toast({ title: "All kitchen items marked as ready" });
      if (selectedOutlet) fetchOrders(selectedOutlet);
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const startPreparing = async (orderId: string) => {
    try {
      await supabase
        .from("lab_ops_orders")
        .update({ status: "in_progress" })
        .eq("id", orderId);

      toast({ title: "Order started" });
      if (selectedOutlet) fetchOrders(selectedOutlet);
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const getOrderAge = (createdAt: string) => {
    return differenceInMinutes(new Date(), new Date(createdAt));
  };

  const getAgeColor = (minutes: number) => {
    if (minutes < 10) return "bg-green-500";
    if (minutes < 20) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  const displayOrders = activeTab === "new" ? orders : completedOrders;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900 to-red-900 p-4 sticky top-0 z-10">
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
            <ChefHat className="h-8 w-8 text-orange-300" />
            <div>
              <h1 className="text-2xl font-bold">Kitchen KDS</h1>
              <p className="text-orange-200 text-sm">{orders.length} active orders</p>
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

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === "new" ? "default" : "outline"}
            onClick={() => setActiveTab("new")}
            className={activeTab === "new" 
              ? "bg-orange-600 hover:bg-orange-700 text-white" 
              : "border-orange-500 text-orange-300 hover:bg-orange-900/50"
            }
          >
            New Orders ({orders.length})
          </Button>
          <Button
            variant={activeTab === "completed" ? "default" : "outline"}
            onClick={() => setActiveTab("completed")}
            className={activeTab === "completed" 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "border-green-500 text-green-300 hover:bg-green-900/50"
            }
          >
            <Check className="h-4 w-4 mr-2" />
            Completed ({completedOrders.length})
          </Button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="p-4">
        {displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <ChefHat className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-xl">
              {activeTab === "new" ? "No pending kitchen orders" : "No recently completed orders"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayOrders.map((order, index) => {
              const ageMinutes = getOrderAge(order.created_at);
              const isPreparing = order.status === 'in_progress';
              const isCompleted = order.status === 'completed';
              return (
                <Card 
                  key={order.id} 
                  className={`overflow-hidden ${
                    isCompleted
                      ? 'bg-green-950 border-green-700'
                      : isPreparing 
                        ? 'bg-orange-950 border-orange-600' 
                        : 'bg-gray-900 border-gray-700'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        #{index + 1}
                        <Badge variant="outline" className={isCompleted ? "text-green-400 border-green-400" : "text-orange-400 border-orange-400"}>
                          {order.table?.name || "Table"}
                        </Badge>
                        {isPreparing && (
                          <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                        )}
                        {isCompleted && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : getAgeColor(ageMinutes)}`} />
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {ageMinutes}m ago
                      </span>
                      {!isCompleted && ageMinutes >= 20 && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div 
                            key={item.id}
                            className={`p-3 rounded-lg border ${
                              item.status === 'ready' || isCompleted
                                ? 'bg-green-900/30 border-green-700' 
                                : 'bg-gray-800 border-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-orange-400">
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
                              {!isCompleted && item.status !== 'ready' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markItemComplete(item.id)}
                                  className="text-green-400 hover:bg-green-900/50"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              {(item.status === 'ready' || isCompleted) && (
                                <Badge className="bg-green-600">Ready</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {!isCompleted && (
                      <div className="flex gap-2 mt-3">
                        {!isPreparing && (
                          <Button
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                            onClick={() => startPreparing(order.id)}
                          >
                            <Flame className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        )}
                        <Button
                          className={`${isPreparing ? 'w-full' : 'flex-1'} bg-green-600 hover:bg-green-700`}
                          onClick={() => markOrderComplete(order.id)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}