import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Store, Plus, Settings, Users, UtensilsCrossed, ShoppingCart, 
  Package, ClipboardList, BarChart3, Smartphone, ChefHat, Wine,
  DollarSign, TrendingUp, Clock, AlertTriangle
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
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1 h-auto p-1">
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

// POS Module
function POSModule({ outletId }: { outletId: string }) {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
    fetchCategories();
    fetchOpenOrders();

    // Real-time subscription for orders
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

  const selectTable = async (table: any) => {
    setSelectedTable(table);
    
    // Check for existing open order
    const existingOrder = orders.find(o => o.table_id === table.id && o.status === "open");
    if (existingOrder) {
      setCurrentOrder(existingOrder);
      // Fetch order items
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
      // Update table status
      await supabase
        .from("lab_ops_tables")
        .update({ status: "seated" })
        .eq("id", selectedTable.id);
      fetchTables();
      toast({ title: "Order created" });
    }
  };

  const addItemToOrder = async (menuItem: any) => {
    if (!currentOrder) {
      await createOrder();
      return;
    }

    const { data, error } = await supabase
      .from("lab_ops_order_items")
      .insert({
        order_id: currentOrder.id,
        menu_item_id: menuItem.id,
        unit_price: menuItem.base_price,
        qty: 1,
        status: "pending",
      })
      .select("*, lab_ops_menu_items(name)")
      .single();

    if (!error && data) {
      setOrderItems([...orderItems, data]);
      updateOrderTotals();
    }
  };

  const updateOrderTotals = async () => {
    if (!currentOrder) return;
    
    const subtotal = orderItems.reduce((sum, item) => sum + (item.unit_price * item.qty), 0);
    await supabase
      .from("lab_ops_orders")
      .update({ subtotal, total_amount: subtotal })
      .eq("id", currentOrder.id);
  };

  const sendToKitchen = async () => {
    if (!currentOrder || orderItems.length === 0) return;

    // Update pending items to sent
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
    
    // Refresh order items
    const { data: items } = await supabase
      .from("lab_ops_order_items")
      .select("*, lab_ops_menu_items(name)")
      .eq("order_id", currentOrder.id);
    setOrderItems(items || []);
  };

  const closeOrder = async () => {
    if (!currentOrder) return;

    await supabase
      .from("lab_ops_orders")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", currentOrder.id);

    await supabase
      .from("lab_ops_tables")
      .update({ status: "free" })
      .eq("id", selectedTable.id);

    toast({ title: "Order closed" });
    setCurrentOrder(null);
    setOrderItems([]);
    setSelectedTable(null);
    fetchTables();
    fetchOpenOrders();
  };

  const filteredMenuItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(m => m.category_id === selectedCategory);

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
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Menu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
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

          {filteredMenuItems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No menu items. Add items in Menu tab.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {filteredMenuItems.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  className="h-auto py-3 flex-col items-start text-left"
                  onClick={() => addItemToOrder(item)}
                  disabled={!selectedTable}
                >
                  <span className="font-medium text-sm truncate w-full">{item.name}</span>
                  <span className="text-xs text-primary">${Number(item.base_price).toFixed(2)}</span>
                </Button>
              ))}
            </div>
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
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium text-sm">{item.lab_ops_menu_items?.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
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

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${orderItems.reduce((sum, i) => sum + (i.unit_price * i.qty), 0).toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={sendToKitchen}
                        disabled={orderItems.filter(i => i.status === "pending").length === 0}
                      >
                        Send to Kitchen
                      </Button>
                      <Button variant="outline" onClick={closeOrder}>
                        Close Bill
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// KDS Module
function KDSModule({ outletId }: { outletId: string }) {
  const [stations, setStations] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");

  useEffect(() => {
    fetchStations();
    fetchOrderItems();

    const channel = supabase
      .channel('kds-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lab_ops_order_items' }, () => {
        fetchOrderItems();
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
        lab_ops_orders(table_id, lab_ops_tables(name))
      `)
      .in("status", ["sent", "in_progress"])
      .order("sent_at", { ascending: true });
    setOrderItems(data || []);
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

  // Group items by table
  const groupedByTable = orderItems.reduce((acc, item) => {
    const tableName = item.lab_ops_orders?.lab_ops_tables?.name || "Unknown";
    if (!acc[tableName]) acc[tableName] = [];
    acc[tableName].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4">
      {/* Station Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
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
          {Object.entries(groupedByTable).map(([tableName, items]) => (
            <Card key={tableName} className="border-2">
              <CardHeader className="pb-2 bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tableName}</CardTitle>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor((Date.now() - new Date(items[0]?.sent_at).getTime()) / 60000)}m
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
                      {(item.status === "sent" || item.status === "in_progress") && (
                        <Button 
                          size="sm"
                          className="flex-1"
                          onClick={() => updateItemStatus(item.id, "ready")}
                        >
                          Ready
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Menu Module
function MenuModule({ outletId }: { outletId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("food");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
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

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;

    await supabase.from("lab_ops_categories").insert({
      outlet_id: outletId,
      name: newCategoryName.trim(),
      type: newCategoryType,
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
      base_price: parseFloat(newItemPrice),
      category_id: newItemCategory || null,
    });

    setNewItemName("");
    setNewItemPrice("");
    setNewItemCategory("");
    setShowAddItem(false);
    fetchMenuItems();
    toast({ title: "Menu item created" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
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
                  <span className="text-sm text-muted-foreground">
                    {menuItems.filter(m => m.category_id === cat.id).length} items
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu Items</CardTitle>
          <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {menuItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.lab_ops_categories?.name || "Uncategorized"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">${Number(item.base_price).toFixed(2)}</p>
                    <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Inventory Module
function InventoryModule({ outletId }: { outletId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("piece");
  const [newItemParLevel, setNewItemParLevel] = useState("");

  useEffect(() => {
    fetchItems();
  }, [outletId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("lab_ops_inventory_items")
      .select("*, lab_ops_stock_levels(*)")
      .eq("outlet_id", outletId)
      .order("name");
    setItems(data || []);
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

    setNewItemName("");
    setNewItemSku("");
    setNewItemParLevel("");
    setShowAddItem(false);
    fetchItems();
    toast({ title: "Inventory item created" });
  };

  const getTotalStock = (item: any) => {
    const levels = item.lab_ops_stock_levels as any[] | undefined;
    return levels?.reduce((sum: number, sl: any) => sum + (Number(sl.quantity) || 0), 0) || 0;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Inventory Items</CardTitle>
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
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Par Level</Label>
                <Input type="number" value={newItemParLevel} onChange={(e) => setNewItemParLevel(e.target.value)} />
              </div>
              <Button onClick={createItem} className="w-full">Create Item</Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  <div className="text-right">
                    <p className={`font-semibold ${isLow ? "text-red-500" : ""}`}>{stock} {item.base_unit}</p>
                    <p className="text-xs text-muted-foreground">Par: {item.par_level || 0}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Purchasing Module
function PurchasingModule({ outletId }: { outletId: string }) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");

  useEffect(() => {
    fetchSuppliers();
    fetchPurchaseOrders();
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
      .select("*, lab_ops_suppliers(name)")
      .eq("outlet_id", outletId)
      .order("created_at", { ascending: false });
    setPurchaseOrders(data || []);
  };

  const createSupplier = async () => {
    if (!newSupplierName.trim()) return;

    await supabase.from("lab_ops_suppliers").insert({
      outlet_id: outletId,
      name: newSupplierName.trim(),
      email: newSupplierEmail.trim() || null,
      phone: newSupplierPhone.trim() || null,
    });

    setNewSupplierName("");
    setNewSupplierEmail("");
    setNewSupplierPhone("");
    setShowAddSupplier(false);
    fetchSuppliers();
    toast({ title: "Supplier created" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Suppliers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Suppliers</CardTitle>
          <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
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
                  <p className="text-xs text-muted-foreground">{supplier.email || supplier.phone || "No contact info"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase Orders</CardTitle>
          <Button size="sm" disabled={suppliers.length === 0}>
            <Plus className="h-4 w-4 mr-1" />New PO
          </Button>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No purchase orders yet</p>
          ) : (
            <div className="space-y-2">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{po.po_number || `PO-${po.id.slice(0,8)}`}</p>
                    <Badge variant={
                      po.status === "draft" ? "secondary" :
                      po.status === "issued" ? "default" :
                      po.status === "closed" ? "outline" : "secondary"
                    }>{po.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{po.lab_ops_suppliers?.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Recipes Module
function RecipesModule({ outletId }: { outletId: string }) {
  const [recipes, setRecipes] = useState<any[]>([]);

  useEffect(() => {
    fetchRecipes();
  }, [outletId]);

  const fetchRecipes = async () => {
    const { data } = await supabase
      .from("lab_ops_recipes")
      .select("*, lab_ops_menu_items(name, outlet_id)")
      .order("created_at", { ascending: false });
    
    // Filter by outlet
    const filtered = data?.filter(r => r.lab_ops_menu_items?.outlet_id === outletId) || [];
    setRecipes(filtered);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recipes & Costing</CardTitle>
      </CardHeader>
      <CardContent>
        {recipes.length === 0 ? (
          <div className="text-center py-8">
            <Wine className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recipes yet. Create menu items first, then add recipes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{recipe.lab_ops_menu_items?.name}</p>
                <p className="text-xs text-muted-foreground">Version {recipe.version_number}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Reports Module
function ReportsModule({ outletId }: { outletId: string }) {
  const [dailySales, setDailySales] = useState<any>({ total: 0, orders: 0, covers: 0 });

  useEffect(() => {
    fetchDailySales();
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

      {/* Report Links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "Daily Sales", icon: BarChart3 },
          { name: "Menu Mix", icon: UtensilsCrossed },
          { name: "Stock Levels", icon: Package },
          { name: "Variance Report", icon: AlertTriangle },
        ].map((report) => (
          <Card key={report.name} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6 text-center">
              <report.icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">{report.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Settings Module
function SettingsModule({ outlet, onUpdate }: { outlet: Outlet; onUpdate: () => void }) {
  const [tables, setTables] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");

  useEffect(() => {
    fetchTables();
    fetchStations();
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tables */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tables</CardTitle>
          <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Table</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Table Name</Label>
                  <Input 
                    value={newTableName} 
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="e.g., Table 1, Bar 1, Patio 1"
                  />
                </div>
                <div>
                  <Label>Capacity</Label>
                  <Input 
                    type="number" 
                    value={newTableCapacity} 
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                  />
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
            <div className="grid grid-cols-3 gap-2">
              {tables.map((table) => (
                <div key={table.id} className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="font-medium">{table.name}</p>
                  <p className="text-xs text-muted-foreground">{table.capacity} pax</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stations */}
      <Card>
        <CardHeader>
          <CardTitle>Stations</CardTitle>
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
                    <Badge variant="outline" className="text-xs">{station.type}</Badge>
                  </div>
                  <Badge variant={station.is_active ? "default" : "secondary"}>
                    {station.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
