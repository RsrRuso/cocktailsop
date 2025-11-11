import { useEffect, useState } from "react";
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    product_image: string;
  }>;
  order_status_updates: Array<{
    status: string;
    message: string;
    created_at: string;
  }>;
}

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/shop-auth");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*),
          order_status_updates (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "processing": return <Package className="w-4 h-4" />;
      case "shipped": return <Truck className="w-4 h-4" />;
      case "delivered": return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/20 text-yellow-500";
      case "processing": return "bg-blue-500/20 text-blue-500";
      case "shipped": return "bg-purple-500/20 text-purple-500";
      case "delivered": return "bg-green-500/20 text-green-500";
      case "cancelled": return "bg-red-500/20 text-red-500";
      default: return "bg-gray-500/20 text-gray-500";
    }
  };

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="glass-hover p-2.5 rounded-2xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Order Details</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="pt-20 px-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-mono font-semibold">{selectedOrder.order_number}</p>
              </div>
              <Badge className={getStatusColor(selectedOrder.status)}>
                {getStatusIcon(selectedOrder.status)}
                <span className="ml-1 capitalize">{selectedOrder.status}</span>
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-semibold text-primary">
                  ${selectedOrder.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="capitalize">{selectedOrder.payment_method.replace('-', ' ')}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Order Items</h3>
            <div className="space-y-3">
              {selectedOrder.order_items.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    <p className="text-sm font-semibold text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Order Timeline</h3>
            <div className="space-y-4">
              {selectedOrder.order_status_updates
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((update, index) => (
                  <div key={index} className="flex gap-3">
                    <div className={`p-2 rounded-full h-fit ${getStatusColor(update.status)}`}>
                      {getStatusIcon(update.status)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize">{update.status}</p>
                      <p className="text-sm text-muted-foreground">{update.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(update.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="glass-hover p-2.5 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">My Orders</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">
              Start shopping to see your orders here
            </p>
            <Button onClick={() => navigate("/shop")}>
              Browse Shop
            </Button>
          </div>
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">Order {order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1 capitalize">{order.status}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {order.order_items.slice(0, 3).map((item, index) => (
                  <img
                    key={index}
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ))}
                {order.order_items.length > 3 && (
                  <div className="w-12 h-12 rounded-lg glass flex items-center justify-center text-xs font-semibold">
                    +{order.order_items.length - 3}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                </span>
                <span className="font-semibold text-primary">
                  ${order.total_amount.toFixed(2)}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Orders;
