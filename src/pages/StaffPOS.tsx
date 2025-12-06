import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import StaffPinLogin from "@/components/lab-ops/StaffPinLogin";
import TeamPresenceIndicator from "@/components/lab-ops/TeamPresenceIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { 
  LogOut, ShoppingCart, Send, Plus, Minus, Trash2, 
  ChefHat, Wine, Clock, CheckCircle, Users, Search,
  Loader2, UtensilsCrossed, Bell, CreditCard, Receipt,
  DollarSign, ListOrdered, RefreshCw, ArrowLeft, Archive, Calendar
} from "lucide-react";

interface OnlineTeamMember {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  outlet_id: string;
  permissions: Record<string, boolean>;
}

interface Outlet {
  id: string;
  name: string;
}

interface OrderItem {
  id?: string;
  menu_item_id: string;
  name: string;
  qty: number;
  price: number;
  note?: string;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  base_price: number;
  category_id: string;
}

export default function StaffPOS() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // POS State
  const [tables, setTables] = useState<Table[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [covers, setCovers] = useState(2);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);

  // KDS State (for bartender/kitchen roles)
  const [kdsItems, setKdsItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pos" | "kds" | "orders">("pos");
  
  // Open Orders State
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [closingOrder, setClosingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [ordersTab, setOrdersTab] = useState<"open" | "archive">("open");
  const [archiveDate, setArchiveDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Team presence state
  const [onlineTeam, setOnlineTeam] = useState<OnlineTeamMember[]>([]);
  const [currentStaffUsername, setCurrentStaffUsername] = useState<string | undefined>();
  const presenceChannelRef = useRef<any>(null);

  useEffect(() => {
    fetchOutlets();
  }, []);

  const fetchOutlets = async () => {
    try {
      const { data } = await supabase
        .from("lab_ops_outlets")
        .select("id, name")
        .eq("is_active", true);
      setOutlets(data || []);
    } catch (error) {
      console.error("Error fetching outlets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (loggedInStaff: StaffMember, selectedOutlet: Outlet) => {
    setStaff(loggedInStaff);
    setOutlet(selectedOutlet);
    
    // Load outlet data
    await Promise.all([
      fetchTables(selectedOutlet.id),
      fetchCategories(selectedOutlet.id),
      fetchMenuItems(selectedOutlet.id),
    ]);

    // If bartender or kitchen, also load KDS items
    if (loggedInStaff.role === "bartender" || loggedInStaff.role === "kitchen") {
      fetchKDSItems(selectedOutlet.id, loggedInStaff.role);
      setActiveTab("kds");
    }
    
    // Set up team presence tracking
    setupPresenceTracking(selectedOutlet.id, loggedInStaff);
  };
  
  const setupPresenceTracking = (outletId: string, staffMember: StaffMember) => {
    // Clean up previous channel if exists
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }
    
    // Use same channel name as LabOps main page so all workspace members see each other
    const channel = supabase.channel(`lab-ops-presence:${outletId}`, {
      config: { presence: { key: staffMember.id } }
    });
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const members: OnlineTeamMember[] = [];
        
        Object.values(presenceState).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.id !== staffMember.id) {
              members.push({
                id: presence.id,
                name: presence.name,
                username: presence.username,
                email: presence.email,
                role: presence.role
              });
            }
          });
        });
        
        setOnlineTeam(members);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Fetch platform profile for username
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', staffMember.id)
            .maybeSingle();
          
          setCurrentStaffUsername(profile?.username);
          
          await channel.track({
            id: staffMember.id,
            name: staffMember.full_name,
            username: profile?.username,
            role: staffMember.role,
            online_at: new Date().toISOString()
          });
        }
      });
    
    presenceChannelRef.current = channel;
  };
  
  // Cleanup presence on logout
  const cleanupPresence = () => {
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
    setOnlineTeam([]);
  };

  const fetchTables = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_tables")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setTables(data || []);
  };

  const fetchCategories = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_categories")
      .select("*")
      .eq("outlet_id", outletId)
      .order("sort_order");
    setCategories(data || []);
  };

  const fetchMenuItems = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_menu_items")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("is_active", true);
    setMenuItems(data || []);
  };

  const fetchKDSItems = async (outletId: string, role: string) => {
    const stationType = role === "bartender" ? "BAR" : "HOT_KITCHEN";
    
    const { data } = await supabase
      .from("lab_ops_order_items")
      .select(`
        *,
        lab_ops_menu_items(name, lab_ops_menu_item_stations(station_id)),
        lab_ops_orders!inner(table_id, covers, outlet_id, lab_ops_tables(name))
      `)
      .eq("lab_ops_orders.outlet_id", outletId)
      .in("status", ["sent", "in_progress"])
      .order("sent_at", { ascending: true });
    
    setKdsItems(data || []);
  };

  const fetchOpenOrders = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_orders")
      .select(`
        *,
        lab_ops_tables(name),
        lab_ops_order_items(id, qty, unit_price, lab_ops_menu_items(name))
      `)
      .eq("outlet_id", outletId)
      .in("status", ["open", "sent"])
      .order("created_at", { ascending: false });
    
    setOpenOrders(data || []);
  };

  const fetchClosedOrders = async (outletId: string, date: string) => {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    
    const { data } = await supabase
      .from("lab_ops_orders")
      .select(`
        *,
        lab_ops_tables(name),
        lab_ops_order_items(id, qty, unit_price, lab_ops_menu_items(name)),
        lab_ops_payments(payment_method, amount)
      `)
      .eq("outlet_id", outletId)
      .eq("status", "closed")
      .gte("closed_at", startOfDay)
      .lte("closed_at", endOfDay)
      .order("closed_at", { ascending: false });
    
    setClosedOrders(data || []);
  };

  const closeOrder = async (order: any) => {
    if (!outlet || !staff) return;
    
    setClosingOrder(true);
    try {
      const orderItems = order.lab_ops_order_items || [];
      const subtotal = orderItems.reduce((sum: number, item: any) => sum + (item.unit_price * item.qty), 0);
      
      // Create payment record
      const { error: paymentError } = await supabase.from("lab_ops_payments").insert({
        order_id: order.id,
        amount: subtotal,
        payment_method: paymentMethod,
      });

      if (paymentError) {
        console.error("Payment insert error:", paymentError);
        throw new Error(`Payment failed: ${paymentError.message}`);
      }

      // Close order - this makes it appear in stats
      const { error: orderError } = await supabase
        .from("lab_ops_orders")
        .update({ 
          status: "closed", 
          closed_at: new Date().toISOString(),
          total_amount: subtotal,
        })
        .eq("id", order.id);

      if (orderError) {
        console.error("Order update error:", orderError);
        throw new Error(`Order close failed: ${orderError.message}`);
      }

      // Free table
      if (order.table_id) {
        const { error: tableError } = await supabase
          .from("lab_ops_tables")
          .update({ status: "free" })
          .eq("id", order.table_id);
          
        if (tableError) {
          console.error("Table update error:", tableError);
        }
      }

      toast({ title: "Order closed!", description: `$${subtotal.toFixed(2)} recorded in sales` });
      setSelectedOrder(null);
      fetchOpenOrders(outlet.id);
      fetchTables(outlet.id);
    } catch (error: any) {
      console.error("Error closing order:", error);
      toast({ title: "Failed to close order", description: error.message, variant: "destructive" });
    } finally {
      setClosingOrder(false);
    }
  };

  const handleLogout = () => {
    cleanupPresence();
    setStaff(null);
    setOutlet(null);
    setSelectedTable(null);
    setOrderItems([]);
    setSelectedOrder(null);
    setActiveTab("pos");
  };

  const addToOrder = (item: MenuItem) => {
    const existing = orderItems.find(o => o.menu_item_id === item.id);
    if (existing) {
      setOrderItems(orderItems.map(o => 
        o.menu_item_id === item.id ? { ...o, qty: o.qty + 1 } : o
      ));
    } else {
      setOrderItems([...orderItems, {
        menu_item_id: item.id,
        name: item.name,
        qty: 1,
        price: item.base_price
      }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setOrderItems(orderItems.map(o => {
      if (o.menu_item_id === itemId) {
        const newQty = o.qty + delta;
        return newQty > 0 ? { ...o, qty: newQty } : o;
      }
      return o;
    }).filter(o => o.qty > 0));
  };

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter(o => o.menu_item_id !== itemId));
  };

  const sendOrder = async () => {
    if (!selectedTable || orderItems.length === 0 || !outlet || !staff) return;
    
    setSendingOrder(true);
    try {
      // Calculate totals
      const subtotal = orderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("lab_ops_orders")
        .insert({
          outlet_id: outlet.id,
          table_id: selectedTable.id,
          server_id: staff.id,
          covers,
          status: "open",
          subtotal,
          total_amount: subtotal, // Will be updated when order is closed with discounts/tax
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const items = orderItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        qty: item.qty,
        unit_price: item.price,
        status: "sent" as const,
        sent_at: new Date().toISOString(),
        note: item.note || null,
      }));

      const { error: itemsError } = await supabase
        .from("lab_ops_order_items")
        .insert(items);

      if (itemsError) throw itemsError;

      // Update table status
      await supabase
        .from("lab_ops_tables")
        .update({ status: "seated" as const })
        .eq("id", selectedTable.id);

      toast({ title: "Order sent!", description: `Order sent to kitchen/bar for ${selectedTable.name}` });
      setOrderItems([]);
      setSelectedTable(null);
      setCovers(2);
    } catch (error: any) {
      console.error("Error sending order:", error);
      toast({ title: "Failed to send order", description: error.message, variant: "destructive" });
    } finally {
      setSendingOrder(false);
    }
  };

  const updateKDSItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "in_progress") updates.started_at = new Date().toISOString();
      if (newStatus === "ready") updates.ready_at = new Date().toISOString();

      await supabase
        .from("lab_ops_order_items")
        .update(updates)
        .eq("id", itemId);

      if (outlet && staff) {
        fetchKDSItems(outlet.id, staff.role);
      }
      toast({ title: `Item marked as ${newStatus}` });
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const orderTotal = orderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staff || !outlet) {
    return <StaffPinLogin outlets={outlets} onLogin={handleStaffLogin} />;
  }

  // KDS View for bartenders and kitchen staff
  if (activeTab === "kds") {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {staff.role === "bartender" ? <Wine className="w-5 h-5 text-primary" /> : <ChefHat className="w-5 h-5 text-primary" />}
            <div>
              <p className="font-semibold">{staff.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{staff.role} • {outlet.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TeamPresenceIndicator 
              onlineTeam={onlineTeam} 
              outletName={outlet.name}
              currentStaffName={staff.full_name}
              currentStaffUsername={currentStaffUsername}
            />
            {(staff.role === "waiter" || staff.role === "manager") && (
              <Button variant="outline" size="sm" onClick={() => setActiveTab("pos")}>
                <ShoppingCart className="w-4 h-4 mr-1" /> POS
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* KDS Grid */}
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {kdsItems.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending orders</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => outlet && staff && fetchKDSItems(outlet.id, staff.role)}
              >
                Refresh
              </Button>
            </div>
          ) : (
            kdsItems.map(item => (
              <Card key={item.id} className={`${item.status === "in_progress" ? "border-yellow-500" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {item.lab_ops_orders?.lab_ops_tables?.name || "Unknown Table"}
                      </p>
                      <CardTitle className="text-lg">{item.lab_ops_menu_items?.name}</CardTitle>
                    </div>
                    <Badge variant={item.status === "in_progress" ? "secondary" : "outline"}>
                      x{item.qty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.note && (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      Note: {item.note}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(item.sent_at).toLocaleTimeString()}
                  </div>
                  <div className="flex gap-2">
                    {item.status === "sent" && (
                      <Button 
                        className="flex-1" 
                        size="sm"
                        onClick={() => updateKDSItemStatus(item.id, "in_progress")}
                      >
                        Start
                      </Button>
                    )}
                    {item.status === "in_progress" && (
                      <Button 
                        className="flex-1" 
                        size="sm"
                        variant="default"
                        onClick={() => updateKDSItemStatus(item.id, "ready")}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Ready
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Open Orders View (for closing/payment)
  if (activeTab === "orders") {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-card border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListOrdered className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold">Orders</p>
              <p className="text-xs text-muted-foreground">{outlet.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TeamPresenceIndicator 
              onlineTeam={onlineTeam} 
              outletName={outlet.name}
              currentStaffName={staff.full_name}
              currentStaffUsername={currentStaffUsername}
            />
            <Button variant="outline" size="sm" onClick={() => setActiveTab("pos")}>
              <ShoppingCart className="w-4 h-4 mr-1" /> POS
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs: Open / Archive */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              ordersTab === "open" 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground"
            }`}
            onClick={() => setOrdersTab("open")}
          >
            <ListOrdered className="w-4 h-4 inline mr-1" />
            Open ({openOrders.length})
          </button>
          <button
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              ordersTab === "archive" 
                ? "border-b-2 border-primary text-primary" 
                : "text-muted-foreground"
            }`}
            onClick={() => {
              setOrdersTab("archive");
              fetchClosedOrders(outlet.id, archiveDate);
            }}
          >
            <Archive className="w-4 h-4 inline mr-1" />
            Archive
          </button>
        </div>

        {/* Archive Date Filter */}
        {ordersTab === "archive" && (
          <div className="p-3 border-b flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={archiveDate}
              onChange={(e) => {
                setArchiveDate(e.target.value);
                fetchClosedOrders(outlet.id, e.target.value);
              }}
              className="flex-1"
            />
          </div>
        )}

        {/* Order Detail View */}
        {selectedOrder ? (
          <div className="p-3 space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
              ← Back to Orders
            </Button>
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedOrder.lab_ops_tables?.name || "Table"}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.covers} covers • {new Date(selectedOrder.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant={selectedOrder.status === "closed" ? "secondary" : selectedOrder.status === "sent" ? "default" : "outline"}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {selectedOrder.lab_ops_order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.qty}x {item.lab_ops_menu_items?.name || "Item"}</span>
                      <span className="font-medium">${(item.unit_price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${selectedOrder.lab_ops_order_items?.reduce((sum: number, i: any) => sum + (i.unit_price * i.qty), 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Show payment info for closed orders */}
                {selectedOrder.status === "closed" && selectedOrder.lab_ops_payments?.[0] && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground">Paid via <span className="font-medium capitalize">{selectedOrder.lab_ops_payments[0].payment_method}</span></p>
                    <p className="text-muted-foreground">Closed at {new Date(selectedOrder.closed_at).toLocaleString()}</p>
                  </div>
                )}

                {/* Payment Method - only for open orders */}
                {selectedOrder.status !== "closed" && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {["cash", "card", "other"].map(method => (
                        <Button
                          key={method}
                          variant={paymentMethod === method ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaymentMethod(method)}
                          className="capitalize"
                        >
                          {method === "cash" && <DollarSign className="w-4 h-4 mr-1" />}
                          {method === "card" && <CreditCard className="w-4 h-4 mr-1" />}
                          {method === "other" && <Receipt className="w-4 h-4 mr-1" />}
                          {method}
                        </Button>
                      ))}
                    </div>

                    {/* Close Order Button */}
                    <Button 
                      className="w-full h-12" 
                      onClick={() => closeOrder(selectedOrder)}
                      disabled={closingOrder}
                    >
                      {closingOrder ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Close Order & Record Sale
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Open Orders Tab */}
            {ordersTab === "open" && (
              <>
                {openOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No open orders</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => fetchOpenOrders(outlet.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                    </Button>
                  </div>
                ) : (
                  openOrders.map(order => (
                    <Card 
                      key={order.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{order.lab_ops_tables?.name || "Table"}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.lab_ops_order_items?.length || 0} items • {order.covers} covers
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ${order.lab_ops_order_items?.reduce((sum: number, i: any) => sum + (i.unit_price * i.qty), 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {/* Archive Tab */}
            {ordersTab === "archive" && (
              <>
                {closedOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No closed orders for this date</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium">
                        {closedOrders.length} orders • Total: ${closedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    {closedOrders.map(order => (
                      <Card 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{order.lab_ops_tables?.name || "Table"}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.lab_ops_order_items?.length || 0} items • {order.lab_ops_payments?.[0]?.payment_method || "paid"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${(order.total_amount || 0).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.closed_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // POS View for waiters and managers
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card border-b p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold">{staff.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{staff.role} • {outlet.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TeamPresenceIndicator 
            onlineTeam={onlineTeam} 
            outletName={outlet.name}
            currentStaffName={staff.full_name}
            currentStaffUsername={currentStaffUsername}
          />
          <Button variant="outline" size="sm" onClick={() => { setActiveTab("orders"); fetchOpenOrders(outlet.id); }}>
            <Receipt className="w-4 h-4 mr-1" /> Orders
          </Button>
          {(staff.role === "bartender" || staff.role === "kitchen" || staff.role === "manager") && (
            <Button variant="outline" size="sm" onClick={() => { setActiveTab("kds"); fetchKDSItems(outlet.id, staff.role); }}>
              <ChefHat className="w-4 h-4 mr-1" /> KDS
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Table Selection */}
      {!selectedTable ? (
        <div className="flex-1 p-3">
          <h2 className="text-lg font-semibold mb-3">Select Table</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {tables.map(table => (
              <Button
                key={table.id}
                variant={table.status === "occupied" ? "secondary" : "outline"}
                className="h-16 flex flex-col"
                onClick={() => setSelectedTable(table)}
              >
                <span className="font-semibold">{table.name}</span>
                <span className="text-xs text-muted-foreground">
                  <Users className="w-3 h-3 inline mr-1" />{table.capacity}
                </span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Order Header */}
          <div className="p-3 bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedTable(null)}>
                ← Tables
              </Button>
              <span className="font-semibold">{selectedTable.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCovers(Math.max(1, covers - 1))}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center">{covers}</span>
              <Button variant="outline" size="sm" onClick={() => setCovers(covers + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">covers</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Menu Section */}
            <div className="flex-1 flex flex-col border-r">
              {/* Search */}
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search menu..." 
                    className="pl-9"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Categories - Horizontal scrolling */}
              <div className="border-b overflow-x-auto scrollbar-thin scrollbar-thumb-muted">
                <div className="flex gap-1.5 p-2 pr-4">
                  <Button
                    variant={!selectedCategory ? "default" : "outline"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Menu Items */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                  {filteredItems.map(item => (
                    <Button
                      key={item.id}
                      variant="outline"
                      className="h-20 flex flex-col items-start justify-between p-2"
                      onClick={() => addToOrder(item)}
                    >
                      <span className="text-sm font-medium text-left line-clamp-2">{item.name}</span>
                      <span className="text-primary font-semibold">${item.base_price.toFixed(2)}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-80 flex flex-col bg-card">
              <div className="p-3 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> 
                  Order ({orderItems.length})
                </h3>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {orderItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Tap menu items to add
                    </p>
                  ) : (
                    orderItems.map(item => (
                      <div key={item.menu_item_id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.menu_item_id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.qty}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.menu_item_id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(item.menu_item_id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Order Actions */}
              <div className="p-3 border-t space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full h-12"
                  disabled={orderItems.length === 0 || sendingOrder}
                  onClick={sendOrder}
                >
                  {sendingOrder ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send to Kitchen/Bar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
