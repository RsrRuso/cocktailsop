import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { 
  Store, Plus, Settings, Users, UtensilsCrossed, ShoppingCart, 
  Package, ClipboardList, BarChart3, Smartphone, ChefHat, Wine,
  DollarSign, TrendingUp, Clock, AlertTriangle, FileText, Trash2,
  Edit, Eye, Send, CreditCard, Percent, Calculator, Receipt,
  Download, RefreshCw, Check, X, ArrowRight, Calendar, Truck,
  Archive, Search, Filter, MoreHorizontal, Copy, Printer, Hash,
  PlusCircle, MinusCircle, UserPlus, Shield, Activity, History
} from "lucide-react";

interface Outlet {
  id: string;
  name: string;
  address: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

export default function LabOps() {
  const { user } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateOutlet, setShowCreateOutlet] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");
  const [newOutletType, setNewOutletType] = useState("restaurant");

  useEffect(() => {
    if (user) {
      fetchOutlets();
    }
  }, [user]);

  const fetchOutlets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("lab_ops_outlets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOutlets(data || []);
      
      if (data && data.length > 0 && !selectedOutlet) {
        setSelectedOutlet(data[0]);
      }
    } catch (error) {
      console.error("Error fetching outlets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createOutlet = async () => {
    if (!user || !newOutletName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("lab_ops_outlets")
        .insert({
          user_id: user.id,
          name: newOutletName.trim(),
          address: newOutletAddress.trim(),
          type: newOutletType,
        })
        .select()
        .single();

      if (error) throw error;

      setOutlets([data, ...outlets]);
      setSelectedOutlet(data);
      setShowCreateOutlet(false);
      setNewOutletName("");
      setNewOutletAddress("");
      
      // Create default stations
      await supabase.from("lab_ops_stations").insert([
        { outlet_id: data.id, name: "Bar", type: "BAR" },
        { outlet_id: data.id, name: "Hot Kitchen", type: "HOT_KITCHEN" },
        { outlet_id: data.id, name: "Cold Kitchen", type: "COLD_KITCHEN" },
        { outlet_id: data.id, name: "Expo", type: "EXPO" },
      ]);

      // Create default locations
      await supabase.from("lab_ops_locations").insert([
        { outlet_id: data.id, name: "Main Floor", type: "service" },
        { outlet_id: data.id, name: "Bar Storage", type: "storage" },
        { outlet_id: data.id, name: "Kitchen Storage", type: "storage" },
      ]);

      toast({ title: "Outlet created successfully" });
    } catch (error: any) {
      toast({ title: "Error creating outlet", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ChefHat className="h-7 w-7 text-primary" />
              LAB Ops
            </h1>
            <p className="text-muted-foreground text-sm">Restaurant & Bar Management System</p>
          </div>
          
          <div className="flex items-center gap-3">
            {outlets.length > 0 && (
              <Select
                value={selectedOutlet?.id}
                onValueChange={(value) => {
                  const outlet = outlets.find(o => o.id === value);
                  if (outlet) setSelectedOutlet(outlet);
                }}
              >
                <SelectTrigger className="w-48">
                  <Store className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Dialog open={showCreateOutlet} onOpenChange={setShowCreateOutlet}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Outlet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Outlet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Outlet Name</Label>
                    <Input
                      value={newOutletName}
                      onChange={(e) => setNewOutletName(e.target.value)}
                      placeholder="e.g., Main Restaurant"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={newOutletAddress}
                      onChange={(e) => setNewOutletAddress(e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newOutletType} onValueChange={setNewOutletType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createOutlet} className="w-full" disabled={!newOutletName.trim()}>
                    Create Outlet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* No outlets state */}
        {outlets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Store className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Outlets Yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create your first outlet to start managing orders, inventory, and staff.
              </p>
              <Button onClick={() => setShowCreateOutlet(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Outlet
              </Button>
            </CardContent>
          </Card>
        ) : selectedOutlet && (
          <Tabs defaultValue="pos" className="space-y-6">
            <TabsList className="grid grid-cols-4 lg:grid-cols-9 gap-1 h-auto p-1">
              <TabsTrigger value="pos" className="text-xs py-2">
                <Smartphone className="h-4 w-4 mr-1" />
                POS
              </TabsTrigger>
              <TabsTrigger value="kds" className="text-xs py-2">
                <ChefHat className="h-4 w-4 mr-1" />
                KDS
              </TabsTrigger>
              <TabsTrigger value="menu" className="text-xs py-2">
                <UtensilsCrossed className="h-4 w-4 mr-1" />
                Menu
              </TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs py-2">
                <Package className="h-4 w-4 mr-1" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="purchasing" className="text-xs py-2">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Purchasing
              </TabsTrigger>
              <TabsTrigger value="recipes" className="text-xs py-2">
                <Wine className="h-4 w-4 mr-1" />
                Recipes
              </TabsTrigger>
              <TabsTrigger value="staff" className="text-xs py-2">
                <Users className="h-4 w-4 mr-1" />
                Staff
              </TabsTrigger>
              <TabsTrigger value="reports" className="text-xs py-2">
                <BarChart3 className="h-4 w-4 mr-1" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs py-2">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pos">
              <POSModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="kds">
              <KDSModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="menu">
              <MenuModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="inventory">
              <InventoryModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="purchasing">
              <PurchasingModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="recipes">
              <RecipesModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="staff">
              <StaffModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="reports">
              <ReportsModule outletId={selectedOutlet.id} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsModule outlet={selectedOutlet} onUpdate={fetchOutlets} />
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}

// ====================== POS MODULE ======================
function POSModule({ outletId }: { outletId: string }) {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [showModifiers, setShowModifiers] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [itemNote, setItemNote] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
    fetchCategories();
    fetchOpenOrders();
    fetchModifiers();

    const channel = supabase
      .channel('pos-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_ops_orders', filter: `outlet_id=eq.${outletId}` }, () => {
        fetchOpenOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_ops_tables', filter: `outlet_id=eq.${outletId}` }, () => {
        fetchTables();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [outletId]);

  const fetchTables = async () => {
    const { data } = await supabase
      .from("lab_ops_tables")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setTables(data || []);
  };

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("lab_ops_menu_items")
      .select("*, lab_ops_categories(name)")
      .eq("outlet_id", outletId)
      .eq("is_active", true);
    setMenuItems(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("lab_ops_categories")
      .select("*")
      .eq("outlet_id", outletId)
      .order("sort_order");
    setCategories(data || []);
  };

  const fetchOpenOrders = async () => {
    const { data } = await supabase
      .from("lab_ops_orders")
      .select("*, lab_ops_tables(name)")
      .eq("outlet_id", outletId)
      .in("status", ["open", "sent", "in_progress"])
      .order("opened_at", { ascending: false });
    setOrders(data || []);
  };

  const fetchModifiers = async () => {
    // Use any to bypass complex type inference
    const client: any = supabase;
    const { data } = await client
      .from("lab_ops_modifiers")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("is_active", true);
    setModifiers(data || []);
  };

  const selectTable = async (table: any) => {
    setSelectedTable(table);
    
    const existingOrder = orders.find(o => o.table_id === table.id && o.status === "open");
    if (existingOrder) {
      setCurrentOrder(existingOrder);
      const { data: items } = await supabase
        .from("lab_ops_order_items")
        .select("*, lab_ops_menu_items(name)")
        .eq("order_id", existingOrder.id);
      setOrderItems(items || []);
    } else {
      setCurrentOrder(null);
      setOrderItems([]);
    }
  };

  const createOrder = async () => {
    if (!selectedTable || !user) return;

    const { data, error } = await supabase
      .from("lab_ops_orders")
      .insert({
        outlet_id: outletId,
        table_id: selectedTable.id,
        status: "open",
        covers: 1,
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentOrder(data);
      await supabase
        .from("lab_ops_tables")
        .update({ status: "seated" })
        .eq("id", selectedTable.id);
      fetchTables();
      toast({ title: "Order created" });
    }
  };

  const addItemToOrder = async (menuItem: any, modifierIds: string[] = [], note: string = "") => {
    if (!currentOrder) {
      await createOrder();
      return;
    }

    const modifierPrice = modifierIds.reduce((sum, id) => {
      const mod = modifiers.find(m => m.id === id);
      return sum + (mod?.price || 0);
    }, 0);

    const { data, error } = await supabase
      .from("lab_ops_order_items")
      .insert({
        order_id: currentOrder.id,
        menu_item_id: menuItem.id,
        unit_price: menuItem.base_price + modifierPrice,
        qty: 1,
        status: "pending",
        note: note || null,
        modifier_ids: modifierIds.length > 0 ? modifierIds : null,
      })
      .select("*, lab_ops_menu_items(name)")
      .single();

    if (!error && data) {
      setOrderItems([...orderItems, data]);
      updateOrderTotals([...orderItems, data]);
    }
  };

  const updateItemQty = async (itemId: string, delta: number) => {
    const item = orderItems.find(i => i.id === itemId);
    if (!item) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      await supabase.from("lab_ops_order_items").delete().eq("id", itemId);
      const newItems = orderItems.filter(i => i.id !== itemId);
      setOrderItems(newItems);
      updateOrderTotals(newItems);
    } else {
      await supabase.from("lab_ops_order_items").update({ qty: newQty }).eq("id", itemId);
      const newItems = orderItems.map(i => i.id === itemId ? { ...i, qty: newQty } : i);
      setOrderItems(newItems);
      updateOrderTotals(newItems);
    }
  };

  const updateOrderTotals = async (items: any[]) => {
    if (!currentOrder) return;
    
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
    const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
    const total = Math.max(0, subtotal - discountAmount);
    
    await supabase
      .from("lab_ops_orders")
      .update({ subtotal, total_amount: total, discount_amount: discountAmount })
      .eq("id", currentOrder.id);
  };

  const sendToKitchen = async () => {
    if (!currentOrder || orderItems.length === 0) return;

    const pendingItems = orderItems.filter(i => i.status === "pending");
    if (pendingItems.length === 0) {
      toast({ title: "No items to send", variant: "destructive" });
      return;
    }

    for (const item of pendingItems) {
      await supabase
        .from("lab_ops_order_items")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);
    }

    await supabase
      .from("lab_ops_orders")
      .update({ status: "sent" })
      .eq("id", currentOrder.id);

    toast({ title: "Order sent to kitchen/bar" });
    fetchOpenOrders();
    
    const { data: items } = await supabase
      .from("lab_ops_order_items")
      .select("*, lab_ops_menu_items(name)")
      .eq("order_id", currentOrder.id);
    setOrderItems(items || []);
  };

  const processPayment = async () => {
    if (!currentOrder) return;

    const subtotal = orderItems.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
    const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
    const total = Math.max(0, subtotal - discountAmount);

    // Create payment record
    await supabase.from("lab_ops_payments").insert({
      order_id: currentOrder.id,
      amount: total,
      payment_method: paymentMethod,
      status: "completed",
    });

    // Close order
    await supabase
      .from("lab_ops_orders")
      .update({ 
        status: "closed", 
        closed_at: new Date().toISOString(),
        total_amount: total,
        discount_amount: discountAmount,
      })
      .eq("id", currentOrder.id);

    // Free table
    await supabase
      .from("lab_ops_tables")
      .update({ status: "free" })
      .eq("id", selectedTable.id);

    toast({ title: "Payment processed successfully" });
    setShowPayment(false);
    setDiscount(0);
    setCurrentOrder(null);
    setOrderItems([]);
    setSelectedTable(null);
    fetchTables();
    fetchOpenOrders();
  };

  const voidOrder = async () => {
    if (!currentOrder) return;

    await supabase
      .from("lab_ops_orders")
      .update({ status: "cancelled" })
      .eq("id", currentOrder.id);

    await supabase
      .from("lab_ops_tables")
      .update({ status: "free" })
      .eq("id", selectedTable.id);

    toast({ title: "Order voided" });
    setCurrentOrder(null);
    setOrderItems([]);
    setSelectedTable(null);
    fetchTables();
    fetchOpenOrders();
  };

  const filteredMenuItems = menuItems.filter(m => {
    const matchesCategory = selectedCategory === "all" || m.category_id === selectedCategory;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const subtotal = orderItems.reduce((sum, i) => sum + (i.unit_price * i.qty), 0);
  const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Tables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5" />
            Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tables.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No tables configured. Add tables in Settings.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {tables.map((table) => (
                <Button
                  key={table.id}
                  variant={selectedTable?.id === table.id ? "default" : "outline"}
                  className={`h-16 flex-col ${
                    table.status === "seated" ? "border-amber-500 bg-amber-500/10" :
                    table.status === "bill_requested" ? "border-red-500 bg-red-500/10" :
                    ""
                  }`}
                  onClick={() => selectTable(table)}
                >
                  <span className="font-semibold">{table.name}</span>
                  <span className="text-xs opacity-70">{table.capacity} pax</span>
                </Button>
              ))}
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Open Orders</p>
            {orders.slice(0, 5).map((order) => (
              <Button
                key={order.id}
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => selectTable(tables.find(t => t.id === order.table_id))}
              >
                <span>{order.lab_ops_tables?.name}</span>
                <Badge variant="outline">{order.status}</Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Menu
          </CardTitle>
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              <Button
                size="sm"
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {filteredMenuItems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No menu items found.
            </p>
          ) : (
            <ScrollArea className="h-96">
              <div className="grid grid-cols-2 gap-2">
                {filteredMenuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="h-auto py-3 flex-col items-start text-left"
                    onClick={() => {
                      if (modifiers.length > 0) {
                        setSelectedMenuItem(item);
                        setShowModifiers(true);
                      } else {
                        addItemToOrder(item);
                      }
                    }}
                    disabled={!selectedTable}
                  >
                    <span className="font-medium text-sm truncate w-full">{item.name}</span>
                    <span className="text-xs text-primary">${Number(item.base_price).toFixed(2)}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Current Order */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Order
            </span>
            {selectedTable && (
              <Badge variant="outline">{selectedTable.name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedTable ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Select a table to start an order
            </p>
          ) : (
            <>
              {orderItems.length === 0 && !currentOrder ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm mb-4">No items yet</p>
                  <Button onClick={createOrder}>Start Order</Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.lab_ops_menu_items?.name}</p>
                            {item.note && <p className="text-xs text-amber-500">{item.note}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItemQty(item.id, -1)}>
                                <MinusCircle className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItemQty(item.id, 1)}>
                                <PlusCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${(item.unit_price * item.qty).toFixed(2)}</p>
                            <Badge variant={
                              item.status === "pending" ? "secondary" :
                              item.status === "sent" ? "default" :
                              item.status === "ready" ? "outline" : "secondary"
                            } className="text-xs">
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={sendToKitchen}
                        disabled={orderItems.filter(i => i.status === "pending").length === 0}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </Button>
                      <Button variant="default" onClick={() => setShowPayment(true)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay
                      </Button>
                    </div>
                    <Button variant="destructive" size="sm" className="w-full" onClick={voidOrder}>
                      <X className="h-4 w-4 mr-1" />
                      Void Order
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modifier Dialog */}
      <Dialog open={showModifiers} onOpenChange={setShowModifiers}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Modifiers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Note</Label>
              <Input
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="e.g., No ice, extra lime"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {modifiers.map((mod) => (
                <Badge key={mod.id} variant="outline" className="cursor-pointer hover:bg-primary/10">
                  {mod.name} (+${mod.price?.toFixed(2) || "0.00"})
                </Badge>
              ))}
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                addItemToOrder(selectedMenuItem, [], itemNote);
                setShowModifiers(false);
                setItemNote("");
                setSelectedMenuItem(null);
              }}
            >
              Add to Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={discountType} onValueChange={(v: "percent" | "fixed") => setDiscountType(v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="fixed">$</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile Pay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-2">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={processPayment} className="w-full" size="lg">
              <Check className="h-5 w-5 mr-2" />
              Complete Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================== KDS MODULE ======================
function KDSModule({ outletId }: { outletId: string }) {
  const [stations, setStations] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchStations();
    fetchOrderItems();
    fetchCompletedItems();

    const channel = supabase
      .channel('kds-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_ops_order_items' }, () => {
        fetchOrderItems();
        fetchCompletedItems();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [outletId]);

  const fetchStations = async () => {
    const { data } = await supabase
      .from("lab_ops_stations")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("is_active", true);
    setStations(data || []);
  };

  const fetchOrderItems = async () => {
    const { data } = await supabase
      .from("lab_ops_order_items")
      .select(`
        *,
        lab_ops_menu_items(name, lab_ops_menu_item_stations(station_id)),
        lab_ops_orders(table_id, covers, lab_ops_tables(name))
      `)
      .in("status", ["sent", "in_progress"])
      .order("sent_at", { ascending: true });
    setOrderItems(data || []);
  };

  const fetchCompletedItems = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("lab_ops_order_items")
      .select(`
        *,
        lab_ops_menu_items(name),
        lab_ops_orders(table_id, lab_ops_tables(name))
      `)
      .eq("status", "ready")
      .gte("ready_at", today)
      .order("ready_at", { ascending: false })
      .limit(50);
    setCompletedItems(data || []);
  };

  const updateItemStatus = async (itemId: string, newStatus: "in_progress" | "ready") => {
    await supabase
      .from("lab_ops_order_items")
      .update({ 
        status: newStatus, 
        ...(newStatus === "ready" ? { ready_at: new Date().toISOString() } : {})
      })
      .eq("id", itemId);
    
    toast({ title: `Item marked as ${newStatus}` });
    fetchOrderItems();
  };

  const bumpAll = async (tableName: string, items: any[]) => {
    for (const item of items) {
      if (item.status !== "ready") {
        await supabase
          .from("lab_ops_order_items")
          .update({ status: "ready", ready_at: new Date().toISOString() })
          .eq("id", item.id);
      }
    }
    toast({ title: `All items for ${tableName} ready` });
    fetchOrderItems();
  };

  const recallItem = async (itemId: string) => {
    await supabase
      .from("lab_ops_order_items")
      .update({ status: "in_progress", ready_at: null })
      .eq("id", itemId);
    toast({ title: "Item recalled" });
    fetchOrderItems();
    fetchCompletedItems();
  };

  const groupedByTable = orderItems.reduce((acc, item) => {
    const tableName = item.lab_ops_orders?.lab_ops_tables?.name || "Unknown";
    if (!acc[tableName]) acc[tableName] = [];
    acc[tableName].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <ScrollArea className="flex-1">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedStation === "all" ? "default" : "outline"}
              onClick={() => setSelectedStation("all")}
            >
              All Stations
            </Button>
            {stations.map((station) => (
              <Button
                key={station.id}
                variant={selectedStation === station.id ? "default" : "outline"}
                onClick={() => setSelectedStation(station.id)}
              >
                {station.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowCompleted(!showCompleted)}
        >
          <History className="h-4 w-4 mr-1" />
          {showCompleted ? "Hide" : "Show"} Completed
        </Button>
      </div>

      {/* Completed Items */}
      {showCompleted && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Recently Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {completedItems.slice(0, 10).map((item) => (
                <div key={item.id} className="flex-shrink-0 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-sm font-medium">{item.qty}x {item.lab_ops_menu_items?.name}</p>
                  <p className="text-xs text-muted-foreground">{item.lab_ops_orders?.lab_ops_tables?.name}</p>
                  <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" onClick={() => recallItem(item.id)}>
                    Recall
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets */}
      {Object.keys(groupedByTable).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ChefHat className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Active Tickets</h3>
            <p className="text-muted-foreground text-center">
              Waiting for orders to come in...
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(groupedByTable).map(([tableName, items]: [string, any[]]) => {
            const waitTime = Math.floor((Date.now() - new Date(items[0]?.sent_at).getTime()) / 60000);
            const isUrgent = waitTime > 10;
            
            return (
              <Card key={tableName} className={`border-2 ${isUrgent ? "border-red-500 animate-pulse" : ""}`}>
                <CardHeader className="pb-2 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tableName}</CardTitle>
                    <Badge variant={isUrgent ? "destructive" : "outline"}>
                      <Clock className="h-3 w-3 mr-1" />
                      {waitTime}m
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className={`p-3 rounded-lg border ${
                      item.status === "in_progress" ? "bg-amber-500/10 border-amber-500" : "bg-muted/50"
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{item.qty}x {item.lab_ops_menu_items?.name}</p>
                          {item.note && (
                            <p className="text-xs text-amber-500 mt-1">{item.note}</p>
                          )}
                        </div>
                        <Badge variant={item.status === "in_progress" ? "default" : "secondary"}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {item.status === "sent" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => updateItemStatus(item.id, "in_progress")}
                          >
                            Start
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => updateItemStatus(item.id, "ready")}
                        >
                          Ready
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    className="w-full mt-2" 
                    variant="outline"
                    onClick={() => bumpAll(tableName, items)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Bump All
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====================== MENU MODULE ======================
function MenuModule({ outletId }: { outletId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddModifier, setShowAddModifier] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("items");
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("food");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newModifierName, setNewModifierName] = useState("");
  const [newModifierPrice, setNewModifierPrice] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
    fetchModifiers();
  }, [outletId]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("lab_ops_categories")
      .select("*")
      .eq("outlet_id", outletId)
      .order("sort_order");
    setCategories(data || []);
  };

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("lab_ops_menu_items")
      .select("*, lab_ops_categories(name)")
      .eq("outlet_id", outletId)
      .order("name");
    setMenuItems(data || []);
  };

  const fetchModifiers = async () => {
    const { data } = await supabase
      .from("lab_ops_modifiers")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setModifiers(data || []);
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;

    await supabase.from("lab_ops_categories").insert({
      outlet_id: outletId,
      name: newCategoryName.trim(),
      type: newCategoryType,
      sort_order: categories.length,
    });

    setNewCategoryName("");
    setShowAddCategory(false);
    fetchCategories();
    toast({ title: "Category created" });
  };

  const createMenuItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return;

    await supabase.from("lab_ops_menu_items").insert({
      outlet_id: outletId,
      name: newItemName.trim(),
      description: newItemDescription.trim() || null,
      base_price: parseFloat(newItemPrice),
      category_id: newItemCategory || null,
    });

    setNewItemName("");
    setNewItemPrice("");
    setNewItemCategory("");
    setNewItemDescription("");
    setShowAddItem(false);
    fetchMenuItems();
    toast({ title: "Menu item created" });
  };

  const updateMenuItem = async () => {
    if (!editingItem) return;

    await supabase.from("lab_ops_menu_items")
      .update({
        name: editingItem.name,
        description: editingItem.description,
        base_price: editingItem.base_price,
        category_id: editingItem.category_id,
        is_active: editingItem.is_active,
      })
      .eq("id", editingItem.id);

    setEditingItem(null);
    fetchMenuItems();
    toast({ title: "Menu item updated" });
  };

  const toggleItemStatus = async (item: any) => {
    await supabase.from("lab_ops_menu_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    fetchMenuItems();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("lab_ops_menu_items").delete().eq("id", id);
    fetchMenuItems();
    toast({ title: "Item deleted" });
  };

  const createModifier = async () => {
    if (!newModifierName.trim()) return;

    await supabase.from("lab_ops_modifiers").insert({
      outlet_id: outletId,
      name: newModifierName.trim(),
      price: parseFloat(newModifierPrice) || 0,
    });

    setNewModifierName("");
    setNewModifierPrice("");
    setShowAddModifier(false);
    fetchModifiers();
    toast({ title: "Modifier created" });
  };

  const deleteModifier = async (id: string) => {
    await supabase.from("lab_ops_modifiers").delete().eq("id", id);
    fetchModifiers();
    toast({ title: "Modifier deleted" });
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("lab_ops_categories").delete().eq("id", id);
    fetchCategories();
    toast({ title: "Category deleted" });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">Menu Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
        </TabsList>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Menu Items</CardTitle>
              <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Menu Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input type="number" step="0.01" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createMenuItem} className="w-full">Create Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {menuItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No menu items yet</p>
              ) : (
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          <Badge variant={item.is_active ? "default" : "secondary"}>
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.lab_ops_categories?.name || "Uncategorized"} • ${Number(item.base_price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={item.is_active} onCheckedChange={() => toggleItemStatus(item)} />
                        <Button size="icon" variant="ghost" onClick={() => setEditingItem(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Categories</CardTitle>
              <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Category</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newCategoryType} onValueChange={setNewCategoryType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="drink">Drink</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createCategory} className="w-full">Create Category</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No categories yet</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <Badge variant="outline" className="text-xs">{cat.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {menuItems.filter(m => m.category_id === cat.id).length} items
                        </span>
                        <Button size="icon" variant="ghost" onClick={() => deleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modifiers Tab */}
        <TabsContent value="modifiers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Modifiers</CardTitle>
              <Dialog open={showAddModifier} onOpenChange={setShowAddModifier}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Modifier</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Modifier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newModifierName} onChange={(e) => setNewModifierName(e.target.value)} placeholder="e.g., Extra cheese" />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input type="number" step="0.01" value={newModifierPrice} onChange={(e) => setNewModifierPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button onClick={createModifier} className="w-full">Create Modifier</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {modifiers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No modifiers yet. Add modifiers like "Extra cheese", "No ice", etc.</p>
              ) : (
                <div className="space-y-2">
                  {modifiers.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{mod.name}</p>
                        <p className="text-sm text-primary">+${Number(mod.price || 0).toFixed(2)}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteModifier(mod.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editingItem.description || ""} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} />
              </div>
              <div>
                <Label>Price</Label>
                <Input type="number" step="0.01" value={editingItem.base_price} onChange={(e) => setEditingItem({ ...editingItem, base_price: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editingItem.category_id || ""} onValueChange={(v) => setEditingItem({ ...editingItem, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={updateMenuItem} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================== INVENTORY MODULE ======================
function InventoryModule({ outletId }: { outletId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stockTakes, setStockTakes] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showStockTake, setShowStockTake] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("items");
  
  // Form states
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("piece");
  const [newItemParLevel, setNewItemParLevel] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockLocation, setStockLocation] = useState("");
  const [stockNotes, setStockNotes] = useState("");

  useEffect(() => {
    fetchItems();
    fetchLocations();
    fetchStockTakes();
    fetchMovements();
  }, [outletId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("lab_ops_inventory_items")
      .select("*, lab_ops_stock_levels(*)")
      .eq("outlet_id", outletId)
      .order("name");
    setItems(data || []);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("lab_ops_locations")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setLocations(data || []);
  };

  const fetchStockTakes = async () => {
    const { data } = await supabase
      .from("lab_ops_stock_takes")
      .select("*")
      .eq("outlet_id", outletId)
      .order("created_at", { ascending: false })
      .limit(10);
    setStockTakes(data || []);
  };

  const fetchMovements = async () => {
    const { data } = await supabase
      .from("lab_ops_stock_movements")
      .select("*, lab_ops_inventory_items(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements(data || []);
  };

  const createItem = async () => {
    if (!newItemName.trim()) return;

    await supabase.from("lab_ops_inventory_items").insert({
      outlet_id: outletId,
      name: newItemName.trim(),
      sku: newItemSku.trim() || null,
      base_unit: newItemUnit,
      par_level: parseFloat(newItemParLevel) || 0,
    });

    if (newItemCost) {
      // Create cost record
      const { data: newItem } = await supabase
        .from("lab_ops_inventory_items")
        .select("id")
        .eq("outlet_id", outletId)
        .eq("name", newItemName.trim())
        .single();
      
      if (newItem) {
        await supabase.from("lab_ops_inventory_item_costs").insert({
          inventory_item_id: newItem.id,
          unit_cost: parseFloat(newItemCost),
        });
      }
    }

    setNewItemName("");
    setNewItemSku("");
    setNewItemParLevel("");
    setNewItemCost("");
    setShowAddItem(false);
    fetchItems();
    toast({ title: "Inventory item created" });
  };

  const addStock = async () => {
    if (!selectedItem || !stockQty || !stockLocation) return;

    // Check existing stock level
    const { data: existing } = await supabase
      .from("lab_ops_stock_levels")
      .select("*")
      .eq("inventory_item_id", selectedItem.id)
      .eq("location_id", stockLocation)
      .single();

    if (existing) {
      await supabase
        .from("lab_ops_stock_levels")
        .update({ quantity: existing.quantity + parseFloat(stockQty) })
        .eq("id", existing.id);
    } else {
      await supabase.from("lab_ops_stock_levels").insert({
        inventory_item_id: selectedItem.id,
        location_id: stockLocation,
        quantity: parseFloat(stockQty),
      });
    }

    // Record movement
    await supabase.from("lab_ops_stock_movements").insert({
      inventory_item_id: selectedItem.id,
      to_location_id: stockLocation,
      qty: parseFloat(stockQty),
      movement_type: "purchase" as const,
      notes: stockNotes || null,
      created_by: user?.id,
    });

    setStockQty("");
    setStockLocation("");
    setStockNotes("");
    setShowAddStock(false);
    setSelectedItem(null);
    fetchItems();
    fetchMovements();
    toast({ title: "Stock added" });
  };

  const startStockTake = async () => {
    const { data, error } = await supabase
      .from("lab_ops_stock_takes")
      .insert({
        outlet_id: outletId,
        status: "in_progress",
        started_by: user?.id,
      })
      .select()
      .single();

    if (!error && data) {
      toast({ title: "Stock take started" });
      fetchStockTakes();
    }
  };

  const getTotalStock = (item: any) => {
    const levels = item.lab_ops_stock_levels as any[] | undefined;
    return levels?.reduce((sum: number, sl: any) => sum + (Number(sl.quantity) || 0), 0) || 0;
  };

  const lowStockItems = items.filter(item => getTotalStock(item) < (item.par_level || 0));

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert ({lowStockItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="destructive">
                  {item.name}: {getTotalStock(item)} / {item.par_level}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="stocktakes">Stock Takes</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory Items</CardTitle>
              <div className="flex gap-2">
                <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Inventory Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
                      </div>
                      <div>
                        <Label>SKU (Optional)</Label>
                        <Input value={newItemSku} onChange={(e) => setNewItemSku(e.target.value)} />
                      </div>
                      <div>
                        <Label>Base Unit</Label>
                        <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">Piece</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="bottle">Bottle</SelectItem>
                            <SelectItem value="case">Case</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Par Level</Label>
                          <Input type="number" value={newItemParLevel} onChange={(e) => setNewItemParLevel(e.target.value)} />
                        </div>
                        <div>
                          <Label>Unit Cost</Label>
                          <Input type="number" step="0.01" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)} />
                        </div>
                      </div>
                      <Button onClick={createItem} className="w-full">Create Item</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No inventory items yet</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => {
                    const stock = getTotalStock(item);
                    const isLow = stock < (item.par_level || 0);
                    return (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${isLow ? "bg-red-500/10 border border-red-500/50" : "bg-muted/50"}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            {isLow && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.sku || "No SKU"} • {item.base_unit}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-semibold ${isLow ? "text-red-500" : ""}`}>{stock} {item.base_unit}</p>
                            <p className="text-xs text-muted-foreground">Par: {item.par_level || 0}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setShowAddStock(true); }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movements</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No stock movements yet</p>
              ) : (
                <div className="space-y-2">
                  {movements.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{mov.lab_ops_inventory_items?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(mov.created_at).toLocaleString()} • {mov.reference_type}
                        </p>
                      </div>
                      <Badge variant={mov.movement_type === "in" ? "default" : "destructive"}>
                        {mov.movement_type === "in" ? "+" : "-"}{mov.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Takes Tab */}
        <TabsContent value="stocktakes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Takes</CardTitle>
              <Button size="sm" onClick={startStockTake}>
                <Plus className="h-4 w-4 mr-1" />Start Stock Take
              </Button>
            </CardHeader>
            <CardContent>
              {stockTakes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No stock takes yet</p>
              ) : (
                <div className="space-y-2">
                  {stockTakes.map((st) => (
                    <div key={st.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">Stock Take #{st.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(st.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={st.status === "completed" ? "default" : "secondary"}>
                        {st.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Stock Dialog */}
      <Dialog open={showAddStock} onOpenChange={setShowAddStock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock: {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={stockLocation} onValueChange={setStockLocation}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} />
            </div>
            <Button onClick={addStock} className="w-full">Add Stock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================== PURCHASING MODULE ======================
function PurchasingModule({ outletId }: { outletId: string }) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("orders");
  
  // Form states
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [poItems, setPoItems] = useState<{ itemId: string; qty: number; price: number }[]>([]);

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
    fetchInventoryItems();
  }, [outletId]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from("lab_ops_suppliers")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setSuppliers(data || []);
  };

  const fetchPurchaseOrders = async () => {
    const { data } = await supabase
      .from("lab_ops_purchase_orders")
      .select("*, lab_ops_suppliers(name), lab_ops_purchase_order_lines(*)")
      .eq("outlet_id", outletId)
      .order("created_at", { ascending: false });
    setPurchaseOrders(data || []);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from("lab_ops_inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setInventoryItems(data || []);
  };

  const createSupplier = async () => {
    if (!newSupplierName.trim()) return;

    await supabase.from("lab_ops_suppliers").insert({
      outlet_id: outletId,
      name: newSupplierName.trim(),
      email: newSupplierEmail.trim() || null,
      phone: newSupplierPhone.trim() || null,
      address: newSupplierAddress.trim() || null,
    });

    setNewSupplierName("");
    setNewSupplierEmail("");
    setNewSupplierPhone("");
    setNewSupplierAddress("");
    setShowAddSupplier(false);
    fetchSuppliers();
    toast({ title: "Supplier created" });
  };

  const createPurchaseOrder = async () => {
    if (!selectedSupplier || poItems.length === 0) return;

    const poNumber = `PO-${Date.now().toString().slice(-8)}`;
    const total = poItems.reduce((sum, i) => sum + (i.qty * i.price), 0);

    const { data: po, error } = await supabase
      .from("lab_ops_purchase_orders")
      .insert({
        outlet_id: outletId,
        supplier_id: selectedSupplier,
        po_number: poNumber,
        status: "draft",
        total_amount: total,
        created_by: user?.id,
      })
      .select()
      .single();

    if (!error && po) {
      // Add line items
      for (const item of poItems) {
        await supabase.from("lab_ops_purchase_order_lines").insert({
          purchase_order_id: po.id,
          inventory_item_id: item.itemId,
          qty_ordered: item.qty,
          unit_cost: item.price,
        });
      }

      toast({ title: "Purchase order created" });
      setShowCreatePO(false);
      setSelectedSupplier("");
      setPoItems([]);
      fetchPurchaseOrders();
    }
  };

  const updatePOStatus = async (poId: string, status: "draft" | "issued" | "partially_received" | "closed" | "cancelled") => {
    await supabase
      .from("lab_ops_purchase_orders")
      .update({ status, ...(status === "issued" ? { issued_at: new Date().toISOString() } : {}) })
      .eq("id", poId);
    
    toast({ title: `PO ${status}` });
    fetchPurchaseOrders();
  };

  const receivePO = async (po: any) => {
    // Create goods receipt
    const { data: receipt, error } = await supabase
      .from("lab_ops_goods_receipts")
      .insert({
        outlet_id: outletId,
        purchase_order_id: po.id,
        supplier_id: po.supplier_id,
        status: "received",
        received_by: user?.id,
      })
      .select()
      .single();

    if (!error && receipt) {
      // Update PO status
      await supabase
        .from("lab_ops_purchase_orders")
        .update({ status: "closed" })
        .eq("id", po.id);

      // Add stock for each line item
      const lines = po.lab_ops_purchase_order_lines || [];
      for (const line of lines) {
        // Get or create stock level
        const { data: existing } = await supabase
          .from("lab_ops_stock_levels")
          .select("*")
          .eq("inventory_item_id", line.inventory_item_id)
          .limit(1)
          .single();

        const qtyOrdered = line.qty_ordered || 0;
        if (existing) {
          await supabase
            .from("lab_ops_stock_levels")
            .update({ quantity: existing.quantity + qtyOrdered })
            .eq("id", existing.id);
        } else {
          // Get first location
          const { data: loc } = await supabase
            .from("lab_ops_locations")
            .select("id")
            .eq("outlet_id", outletId)
            .limit(1)
            .single();

          if (loc) {
            await supabase.from("lab_ops_stock_levels").insert({
              inventory_item_id: line.inventory_item_id,
              location_id: loc.id,
              quantity: qtyOrdered,
            });
          }
        }
      }

      toast({ title: "Goods received and stock updated" });
      fetchPurchaseOrders();
    }
  };

  const addPOItem = () => {
    setPoItems([...poItems, { itemId: "", qty: 1, price: 0 }]);
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    setPoItems(updated);
  };

  const removePOItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Orders</CardTitle>
              <Dialog open={showCreatePO} onOpenChange={setShowCreatePO}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={suppliers.length === 0}>
                    <Plus className="h-4 w-4 mr-1" />New PO
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Supplier</Label>
                      <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Line Items</Label>
                        <Button size="sm" variant="outline" onClick={addPOItem}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {poItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Select value={item.itemId} onValueChange={(v) => updatePOItem(idx, "itemId", v)}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Item" /></SelectTrigger>
                              <SelectContent>
                                {inventoryItems.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              placeholder="Qty"
                              className="w-20"
                              value={item.qty}
                              onChange={(e) => updatePOItem(idx, "qty", parseInt(e.target.value) || 0)}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              className="w-24"
                              value={item.price}
                              onChange={(e) => updatePOItem(idx, "price", parseFloat(e.target.value) || 0)}
                            />
                            <Button size="icon" variant="ghost" onClick={() => removePOItem(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>${poItems.reduce((sum, i) => sum + (i.qty * i.price), 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <Button onClick={createPurchaseOrder} className="w-full" disabled={!selectedSupplier || poItems.length === 0}>
                      Create Purchase Order
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {purchaseOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No purchase orders yet</p>
              ) : (
                <div className="space-y-2">
                  {purchaseOrders.map((po) => (
                    <div key={po.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{po.po_number}</p>
                          <Badge variant={
                            po.status === "draft" ? "secondary" :
                            po.status === "issued" ? "default" :
                            po.status === "closed" ? "outline" : "secondary"
                          }>{po.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {po.lab_ops_suppliers?.name} • ${Number(po.total_amount || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {po.status === "draft" && (
                          <Button size="sm" onClick={() => updatePOStatus(po.id, "issued")}>
                            <Send className="h-4 w-4 mr-1" />Issue
                          </Button>
                        )}
                        {po.status === "issued" && (
                          <Button size="sm" onClick={() => receivePO(po)}>
                            <Truck className="h-4 w-4 mr-1" />Receive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Suppliers</CardTitle>
              <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Supplier</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Supplier</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={newSupplierEmail} onChange={(e) => setNewSupplierEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Textarea value={newSupplierAddress} onChange={(e) => setNewSupplierAddress(e.target.value)} />
                    </div>
                    <Button onClick={createSupplier} className="w-full">Create Supplier</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No suppliers yet</p>
              ) : (
                <div className="space-y-2">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {supplier.email || supplier.phone || "No contact info"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ====================== RECIPES MODULE ======================
function RecipesModule({ outletId }: { outletId: string }) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  
  // Form states
  const [selectedMenuItem, setSelectedMenuItem] = useState("");
  const [recipeYield, setRecipeYield] = useState("1");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [ingredients, setIngredients] = useState<{ itemId: string; qty: number; unit: string }[]>([]);

  useEffect(() => {
    fetchRecipes();
    fetchMenuItems();
    fetchInventoryItems();
  }, [outletId]);

  const fetchRecipes = async () => {
    const { data } = await supabase
      .from("lab_ops_recipes")
      .select("*, lab_ops_menu_items(name, base_price, outlet_id), lab_ops_recipe_ingredients(*)")
      .order("created_at", { ascending: false });
    
    const filtered = data?.filter(r => r.lab_ops_menu_items?.outlet_id === outletId) || [];
    setRecipes(filtered);
  };

  const fetchMenuItems = async () => {
    const { data } = await supabase
      .from("lab_ops_menu_items")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setMenuItems(data || []);
  };

  const fetchInventoryItems = async () => {
    const { data } = await supabase
      .from("lab_ops_inventory_items")
      .select("*, lab_ops_inventory_item_costs(*)")
      .eq("outlet_id", outletId)
      .order("name");
    setInventoryItems(data || []);
  };

  const createRecipe = async () => {
    if (!selectedMenuItem || ingredients.length === 0) return;

    const { data: recipe, error } = await supabase
      .from("lab_ops_recipes")
      .insert({
        menu_item_id: selectedMenuItem,
        version_number: 1,
        yield_quantity: parseFloat(recipeYield) || 1,
        instructions: recipeInstructions || null,
      })
      .select()
      .single();

    if (!error && recipe) {
      // Add ingredients
      for (const ing of ingredients) {
        await supabase.from("lab_ops_recipe_ingredients").insert({
          recipe_id: recipe.id,
          inventory_item_id: ing.itemId,
          qty: ing.qty,
          unit: ing.unit,
        });
      }

      toast({ title: "Recipe created" });
      setShowAddRecipe(false);
      setSelectedMenuItem("");
      setRecipeYield("1");
      setRecipeInstructions("");
      setIngredients([]);
      fetchRecipes();
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { itemId: "", qty: 1, unit: "g" }]);
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const calculateRecipeCost = (recipe: any) => {
    const recipeIngredients = recipe.lab_ops_recipe_ingredients || [];
    let totalCost = 0;

    for (const ing of recipeIngredients) {
      const invItem = inventoryItems.find(i => i.id === ing.inventory_item_id);
      const cost = invItem?.lab_ops_inventory_item_costs?.[0]?.unit_cost || 0;
      totalCost += cost * ing.quantity;
    }

    return totalCost;
  };

  const calculateFoodCostPercent = (recipe: any) => {
    const cost = calculateRecipeCost(recipe);
    const price = recipe.lab_ops_menu_items?.base_price || 0;
    return price > 0 ? ((cost / price) * 100).toFixed(1) : "0.0";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recipes & Costing</CardTitle>
            <CardDescription>Manage recipes and calculate food costs</CardDescription>
          </div>
          <Dialog open={showAddRecipe} onOpenChange={setShowAddRecipe}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={menuItems.length === 0}>
                <Plus className="h-4 w-4 mr-1" />Add Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Recipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Menu Item</Label>
                  <Select value={selectedMenuItem} onValueChange={setSelectedMenuItem}>
                    <SelectTrigger><SelectValue placeholder="Select menu item" /></SelectTrigger>
                    <SelectContent>
                      {menuItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Yield (portions)</Label>
                  <Input type="number" value={recipeYield} onChange={(e) => setRecipeYield(e.target.value)} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Ingredients</Label>
                    <Button size="sm" variant="outline" onClick={addIngredient}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Select value={ing.itemId} onValueChange={(v) => updateIngredient(idx, "itemId", v)}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Ingredient" /></SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          className="w-20"
                          value={ing.qty}
                          onChange={(e) => updateIngredient(idx, "qty", parseFloat(e.target.value) || 0)}
                        />
                        <Select value={ing.unit} onValueChange={(v) => updateIngredient(idx, "unit", v)}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="piece">pc</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" onClick={() => removeIngredient(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Instructions</Label>
                  <Textarea 
                    value={recipeInstructions} 
                    onChange={(e) => setRecipeInstructions(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button onClick={createRecipe} className="w-full" disabled={!selectedMenuItem || ingredients.length === 0}>
                  Create Recipe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {recipes.length === 0 ? (
            <div className="text-center py-8">
              <Wine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recipes yet. Create menu items first, then add recipes with ingredients.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recipes.map((recipe) => {
                const cost = calculateRecipeCost(recipe);
                const foodCostPct = calculateFoodCostPercent(recipe);
                const price = recipe.lab_ops_menu_items?.base_price || 0;
                const profit = price - cost;

                return (
                  <Card key={recipe.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{recipe.lab_ops_menu_items?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Version {recipe.version_number} • Yield: {recipe.yield_quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={parseFloat(foodCostPct) > 35 ? "destructive" : "default"}>
                            {foodCostPct}% Food Cost
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Cost</p>
                          <p className="font-semibold">${cost.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-semibold">${price.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Profit</p>
                          <p className="font-semibold text-green-600">${profit.toFixed(2)}</p>
                        </div>
                      </div>

                      {recipe.lab_ops_recipe_ingredients?.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium mb-2">Ingredients:</p>
                          <div className="flex flex-wrap gap-2">
                            {recipe.lab_ops_recipe_ingredients.map((ing: any) => {
                              const invItem = inventoryItems.find(i => i.id === ing.inventory_item_id);
                              return (
                                <Badge key={ing.id} variant="outline">
                                  {invItem?.name}: {ing.quantity} {ing.unit}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ====================== STAFF MODULE ======================
function StaffModule({ outletId }: { outletId: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  
  // Form states
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState("server");
  const [staffPin, setStaffPin] = useState("");

  useEffect(() => {
    fetchStaff();
  }, [outletId]);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("lab_ops_staff")
      .select("*")
      .eq("outlet_id", outletId)
      .order("name");
    setStaff(data || []);
  };

  const createStaff = async () => {
    if (!staffName.trim()) return;
    const { data: authData } = await supabase.auth.getUser();

    await supabase.from("lab_ops_staff").insert({
      outlet_id: outletId,
      user_id: authData?.user?.id || "",
      full_name: staffName.trim(),
      role: staffRole as "manager" | "bartender" | "waiter" | "kitchen" | "admin" | "supervisor",
      pin_code: staffPin || null,
    });

    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffRole("server");
    setStaffPin("");
    setShowAddStaff(false);
    fetchStaff();
    toast({ title: "Staff member added" });
  };

  const updateStaff = async () => {
    if (!editingStaff) return;

    await supabase
      .from("lab_ops_staff")
      .update({
        full_name: editingStaff.full_name,
        role: editingStaff.role,
        is_active: editingStaff.is_active,
      })
      .eq("id", editingStaff.id);

    setEditingStaff(null);
    fetchStaff();
    toast({ title: "Staff updated" });
  };

  const toggleStaffStatus = async (staffMember: any) => {
    await supabase
      .from("lab_ops_staff")
      .update({ is_active: !staffMember.is_active })
      .eq("id", staffMember.id);
    fetchStaff();
  };

  const deleteStaff = async (id: string) => {
    await supabase.from("lab_ops_staff").delete().eq("id", id);
    fetchStaff();
    toast({ title: "Staff member removed" });
  };

  const roleLabels: Record<string, string> = {
    manager: "Manager",
    bartender: "Bartender",
    server: "Server",
    chef: "Chef",
    host: "Host",
    barback: "Barback",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>Manage your team members and their roles</CardDescription>
        </div>
        <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="h-4 w-4 mr-1" />Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={staffRole} onValueChange={setStaffRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                    <SelectItem value="barback">Barback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>POS PIN (4 digits)</Label>
                <Input 
                  type="password" 
                  maxLength={4}
                  value={staffPin} 
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ""))} 
                  placeholder="****"
                />
              </div>
              <Button onClick={createStaff} className="w-full">Add Staff</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No staff members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.is_active ? "bg-primary/10" : "bg-muted"}`}>
                    <Users className={`h-5 w-5 ${member.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.name}</p>
                      <Badge variant={member.is_active ? "default" : "secondary"}>
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {roleLabels[member.role] || member.role} {member.email && `• ${member.email}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={member.is_active} onCheckedChange={() => toggleStaffStatus(member)} />
                  <Button size="icon" variant="ghost" onClick={() => setEditingStaff(member)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteStaff(member.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {editingStaff && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={editingStaff.name} onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editingStaff.email || ""} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editingStaff.phone || ""} onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editingStaff.role} onValueChange={(v) => setEditingStaff({ ...editingStaff, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="bartender">Bartender</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                    <SelectItem value="barback">Barback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={updateStaff} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ====================== REPORTS MODULE ======================
function ReportsModule({ outletId }: { outletId: string }) {
  const [dailySales, setDailySales] = useState<any>({ total: 0, orders: 0, covers: 0 });
  const [weeklySales, setWeeklySales] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDailySales();
    fetchWeeklySales();
    fetchTopItems();
  }, [outletId]);

  const fetchDailySales = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("lab_ops_orders")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("status", "closed")
      .gte("closed_at", today);

    const total = data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const orders = data?.length || 0;
    const covers = data?.reduce((sum, o) => sum + (o.covers || 0), 0) || 0;

    setDailySales({ total, orders, covers });
  };

  const fetchWeeklySales = async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data } = await supabase
      .from("lab_ops_orders")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("status", "closed")
      .gte("closed_at", weekAgo.toISOString());

    // Group by day
    const dailyTotals: Record<string, number> = {};
    data?.forEach((order) => {
      const day = new Date(order.closed_at).toLocaleDateString("en-US", { weekday: "short" });
      dailyTotals[day] = (dailyTotals[day] || 0) + (order.total_amount || 0);
    });

    setWeeklySales(Object.entries(dailyTotals).map(([day, total]) => ({ day, total })));
  };

  const fetchTopItems = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("lab_ops_order_items")
      .select("qty, lab_ops_menu_items(name), lab_ops_orders!inner(outlet_id, closed_at, status)")
      .eq("lab_ops_orders.outlet_id", outletId)
      .eq("lab_ops_orders.status", "closed")
      .gte("lab_ops_orders.closed_at", today);

    // Aggregate by item
    const itemTotals: Record<string, { name: string; qty: number }> = {};
    data?.forEach((item: any) => {
      const name = item.lab_ops_menu_items?.name || "Unknown";
      if (!itemTotals[name]) {
        itemTotals[name] = { name, qty: 0 };
      }
      itemTotals[name].qty += item.qty || 0;
    });

    const sorted = Object.values(itemTotals).sort((a, b) => b.qty - a.qty).slice(0, 10);
    setTopItems(sorted);
  };

  return (
    <div className="space-y-6">
      {/* Daily KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-2xl font-bold">${dailySales.total.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">{dailySales.orders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Covers</p>
                <p className="text-2xl font-bold">{dailySales.covers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Check</p>
                <p className="text-2xl font-bold">
                  ${dailySales.orders > 0 ? (dailySales.total / dailySales.orders).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklySales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data for this week</p>
            ) : (
              <div className="space-y-2">
                {weeklySales.map((day) => {
                  const maxSale = Math.max(...weeklySales.map(d => d.total));
                  const percent = maxSale > 0 ? (day.total / maxSale) * 100 : 0;
                  return (
                    <div key={day.day} className="flex items-center gap-3">
                      <span className="w-12 text-sm font-medium">{day.day}</span>
                      <div className="flex-1">
                        <Progress value={percent} />
                      </div>
                      <span className="w-20 text-right text-sm font-medium">${day.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Items Today</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sales yet today</p>
            ) : (
              <div className="space-y-2">
                {topItems.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{idx + 1}</Badge>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <Badge>{item.qty} sold</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "Daily Sales", icon: BarChart3, description: "Sales breakdown by day" },
          { name: "Menu Mix", icon: UtensilsCrossed, description: "Item performance analysis" },
          { name: "Stock Levels", icon: Package, description: "Current inventory status" },
          { name: "Variance Report", icon: AlertTriangle, description: "Discrepancy analysis" },
          { name: "Labor Report", icon: Users, description: "Staff hours & costs" },
          { name: "Audit Log", icon: Activity, description: "System activity history" },
          { name: "Void Report", icon: X, description: "Voided transactions" },
          { name: "Export Data", icon: Download, description: "Download reports" },
        ].map((report) => (
          <Card key={report.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <report.icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">{report.name}</p>
              <p className="text-xs text-muted-foreground">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ====================== SETTINGS MODULE ======================
function SettingsModule({ outlet, onUpdate }: { outlet: Outlet; onUpdate: () => void }) {
  const [tables, setTables] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [voidReasons, setVoidReasons] = useState<any[]>([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddStation, setShowAddStation] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddVoidReason, setShowAddVoidReason] = useState(false);
  const [activeTab, setActiveTab] = useState("tables");
  
  // Form states
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [newStationName, setNewStationName] = useState("");
  const [newStationType, setNewStationType] = useState("BAR");
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState("storage");
  const [newVoidReason, setNewVoidReason] = useState("");

  useEffect(() => {
    fetchTables();
    fetchStations();
    fetchLocations();
    fetchVoidReasons();
  }, [outlet.id]);

  const fetchTables = async () => {
    const { data } = await supabase
      .from("lab_ops_tables")
      .select("*")
      .eq("outlet_id", outlet.id)
      .order("name");
    setTables(data || []);
  };

  const fetchStations = async () => {
    const { data } = await supabase
      .from("lab_ops_stations")
      .select("*")
      .eq("outlet_id", outlet.id);
    setStations(data || []);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("lab_ops_locations")
      .select("*")
      .eq("outlet_id", outlet.id)
      .order("name");
    setLocations(data || []);
  };

  const fetchVoidReasons = async () => {
    const { data } = await supabase
      .from("lab_ops_void_reasons")
      .select("*")
      .eq("outlet_id", outlet.id)
      .order("name");
    setVoidReasons(data || []);
  };

  const createTable = async () => {
    if (!newTableName.trim()) return;

    await supabase.from("lab_ops_tables").insert({
      outlet_id: outlet.id,
      name: newTableName.trim(),
      capacity: parseInt(newTableCapacity) || 4,
    });

    setNewTableName("");
    setNewTableCapacity("4");
    setShowAddTable(false);
    fetchTables();
    toast({ title: "Table created" });
  };

  const createStation = async () => {
    if (!newStationName.trim()) return;

    await supabase.from("lab_ops_stations").insert({
      outlet_id: outlet.id,
      name: newStationName.trim(),
      type: newStationType,
    });

    setNewStationName("");
    setShowAddStation(false);
    fetchStations();
    toast({ title: "Station created" });
  };

  const createLocation = async () => {
    if (!newLocationName.trim()) return;

    await supabase.from("lab_ops_locations").insert({
      outlet_id: outlet.id,
      name: newLocationName.trim(),
      type: newLocationType,
    });

    setNewLocationName("");
    setShowAddLocation(false);
    fetchLocations();
    toast({ title: "Location created" });
  };

  const createVoidReason = async () => {
    if (!newVoidReason.trim()) return;

    await supabase.from("lab_ops_void_reasons").insert({
      outlet_id: outlet.id,
      code: newVoidReason.trim().toUpperCase().replace(/\s+/g, "_"),
      description: newVoidReason.trim(),
    });

    setNewVoidReason("");
    setShowAddVoidReason(false);
    fetchVoidReasons();
    toast({ title: "Void reason created" });
  };

  const deleteTable = async (id: string) => {
    await supabase.from("lab_ops_tables").delete().eq("id", id);
    fetchTables();
    toast({ title: "Table deleted" });
  };

  const deleteStation = async (id: string) => {
    await supabase.from("lab_ops_stations").delete().eq("id", id);
    fetchStations();
    toast({ title: "Station deleted" });
  };

  const deleteLocation = async (id: string) => {
    await supabase.from("lab_ops_locations").delete().eq("id", id);
    fetchLocations();
    toast({ title: "Location deleted" });
  };

  const deleteVoidReason = async (id: string) => {
    await supabase.from("lab_ops_void_reasons").delete().eq("id", id);
    fetchVoidReasons();
    toast({ title: "Void reason deleted" });
  };

  return (
    <div className="space-y-6">
      {/* Outlet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Outlet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{outlet.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="font-medium capitalize">{outlet.type}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Address</Label>
              <p className="font-medium">{outlet.address || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="voidreasons">Void Reasons</TabsTrigger>
        </TabsList>

        {/* Tables Tab */}
        <TabsContent value="tables" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tables</CardTitle>
              <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Table</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Table</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="e.g., T1, Bar 1" />
                    </div>
                    <div>
                      <Label>Capacity</Label>
                      <Input type="number" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} />
                    </div>
                    <Button onClick={createTable} className="w-full">Create Table</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {tables.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No tables configured</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {tables.map((table) => (
                    <div key={table.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{table.name}</p>
                        <p className="text-xs text-muted-foreground">{table.capacity} seats</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteTable(table.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stations Tab */}
        <TabsContent value="stations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kitchen/Bar Stations</CardTitle>
              <Dialog open={showAddStation} onOpenChange={setShowAddStation}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Station</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Station</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newStationName} onChange={(e) => setNewStationName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newStationType} onValueChange={setNewStationType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BAR">Bar</SelectItem>
                          <SelectItem value="HOT_KITCHEN">Hot Kitchen</SelectItem>
                          <SelectItem value="COLD_KITCHEN">Cold Kitchen</SelectItem>
                          <SelectItem value="EXPO">Expo</SelectItem>
                          <SelectItem value="DESSERT">Dessert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createStation} className="w-full">Create Station</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {stations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No stations configured</p>
              ) : (
                <div className="space-y-2">
                  {stations.map((station) => (
                    <div key={station.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{station.name}</p>
                        <Badge variant="outline">{station.type}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteStation(station.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Storage Locations</CardTitle>
              <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Location</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Location</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newLocationType} onValueChange={setNewLocationType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="storage">Storage</SelectItem>
                          <SelectItem value="service">Service Area</SelectItem>
                          <SelectItem value="fridge">Fridge</SelectItem>
                          <SelectItem value="freezer">Freezer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createLocation} className="w-full">Create Location</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No locations configured</p>
              ) : (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{location.name}</p>
                        <Badge variant="outline">{location.type}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteLocation(location.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Void Reasons Tab */}
        <TabsContent value="voidreasons" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Void Reasons</CardTitle>
              <Dialog open={showAddVoidReason} onOpenChange={setShowAddVoidReason}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Reason</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Void Reason</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Reason</Label>
                      <Input value={newVoidReason} onChange={(e) => setNewVoidReason(e.target.value)} placeholder="e.g., Customer changed mind" />
                    </div>
                    <Button onClick={createVoidReason} className="w-full">Create Reason</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {voidReasons.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No void reasons configured</p>
              ) : (
                <div className="space-y-2">
                  {voidReasons.map((reason) => (
                    <div key={reason.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <p className="font-medium">{reason.name}</p>
                      <Button size="icon" variant="ghost" onClick={() => deleteVoidReason(reason.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
