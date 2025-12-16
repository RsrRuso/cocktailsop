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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { 
  LogOut, ShoppingCart, Send, Plus, Minus, Trash2, 
  ChefHat, Wine, Clock, CheckCircle, Users, Search,
  Loader2, UtensilsCrossed, Bell, CreditCard, Receipt,
  DollarSign, ListOrdered, RefreshCw, ArrowLeft, Archive, Calendar, Flame, X, BarChart3, UserPlus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  table_number: number | null;
  capacity: number;
  status: string;
  allocation: string | null;
  turnover_count: number;
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
  
  // Mobile view state for POS
  const [mobileView, setMobileView] = useState<"menu" | "bill">("menu");
  
  // Open Orders State
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [closedOrders, setClosedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [closingOrder, setClosingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [ordersTab, setOrdersTab] = useState<"open" | "archive">("open");
  const [archiveDate, setArchiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [archiveFilter, setArchiveFilter] = useState<"all" | "cash" | "card" | "other">("all");
  const [showArchiveAnalytics, setShowArchiveAnalytics] = useState(false);
  
  // Team presence state
  const [onlineTeam, setOnlineTeam] = useState<OnlineTeamMember[]>([]);
  const [currentStaffUsername, setCurrentStaffUsername] = useState<string | undefined>();
  const presenceChannelRef = useRef<any>(null);
  
  // Notifications state
  const [orderNotifications, setOrderNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Staff assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [tableToAssign, setTableToAssign] = useState<Table | null>(null);
  const [outletStaffList, setOutletStaffList] = useState<StaffMember[]>([]);
  const [assigningStaff, setAssigningStaff] = useState(false);

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

    // If bartender or kitchen, also load KDS items (but bartenders can still access POS)
    if (loggedInStaff.role === "bartender" || loggedInStaff.role === "kitchen") {
      fetchKDSItems(selectedOutlet.id, loggedInStaff.role);
      // Only kitchen staff goes directly to KDS, bartenders can access tables/POS
      if (loggedInStaff.role === "kitchen") {
        setActiveTab("kds");
      }
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

  // Fetch and listen for order notifications
  const fetchNotifications = async (outletId: string, staffId: string) => {
    const { data } = await supabase
      .from("lab_ops_order_notifications")
      .select(`
        *,
        order:lab_ops_orders(
          id,
          table:lab_ops_tables(name, table_number),
          lab_ops_order_items(id, qty, status, lab_ops_menu_items(name))
        ),
        item:lab_ops_order_items(id, qty, status, lab_ops_menu_items(name))
      `)
      .eq("outlet_id", outletId)
      .eq("server_id", staffId)
      .eq("is_read", false)
      .order("created_at", { ascending: false });
    
    setOrderNotifications(data || []);
    setUnreadNotifications((data || []).length);
  };
  
  // Setup notification listener
  useEffect(() => {
    if (!staff || !outlet) return;
    
    fetchNotifications(outlet.id, staff.id);
    
    const channel = supabase
      .channel('staff-order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lab_ops_order_notifications',
          filter: `server_id=eq.${staff.id}`
        },
        (payload) => {
          const notification = payload.new as any;
          setOrderNotifications(prev => [notification, ...prev]);
          setUnreadNotifications(prev => prev + 1);
          
          // Play notification sound and show toast
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          } catch {}
          
          const isStarted = notification.notification_type === 'item_started';
          toast({ 
            title: isStarted ? "🔥 Order Started!" : "✅ Order Ready!", 
            description: notification.message,
            className: isStarted 
              ? "bg-amber-600 border-amber-700 text-white"
              : "bg-green-600 border-green-700 text-white"
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [staff, outlet]);
  
  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from("lab_ops_order_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    
    setOrderNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };
  
  const markAllNotificationsRead = async () => {
    if (!staff || !outlet) return;
    
    await supabase
      .from("lab_ops_order_notifications")
      .update({ is_read: true })
      .eq("outlet_id", outlet.id)
      .eq("server_id", staff.id);
    
    setOrderNotifications([]);
    setUnreadNotifications(0);
  };

  const fetchTables = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_tables")
      .select("id, name, table_number, capacity, status, allocation, turnover_count")
      .eq("outlet_id", outletId)
      .order("table_number", { ascending: true, nullsFirst: false });
    setTables((data || []).map(t => ({ ...t, turnover_count: t.turnover_count || 0 })));
  };

  // Real-time subscription for instant table color updates
  useEffect(() => {
    if (!outlet) return;
    
    const channel = supabase
      .channel('lab-ops-tables-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_ops_tables',
          filter: `outlet_id=eq.${outlet.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setTables(prev => prev.map(t => 
              t.id === updated.id 
                ? { ...t, status: updated.status, turnover_count: updated.turnover_count || 0 }
                : t
            ));
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as any;
            setTables(prev => [...prev, { ...inserted, turnover_count: inserted.turnover_count || 0 }]);
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            setTables(prev => prev.filter(t => t.id !== deleted.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [outlet]);

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

  const fetchOutletStaff = async (outletId: string) => {
    const { data } = await supabase
      .from("lab_ops_staff")
      .select("id, full_name, role, outlet_id, permissions")
      .eq("outlet_id", outletId)
      .eq("is_active", true)
      .order("full_name");
    setOutletStaffList((data || []).map(s => ({
      ...s,
      permissions: (s.permissions || {}) as Record<string, boolean>
    })));
  };

  const openAssignDialog = (table: Table) => {
    setTableToAssign(table);
    if (outlet) fetchOutletStaff(outlet.id);
    setAssignDialogOpen(true);
  };

  const assignStaffToTable = async (staffId: string | null) => {
    if (!tableToAssign || !outlet) return;
    
    setAssigningStaff(true);
    try {
      const { error } = await supabase
        .from("lab_ops_tables")
        .update({ assigned_staff_id: staffId } as any)
        .eq("id", tableToAssign.id);
      
      if (error) throw error;
      
      toast({
        title: staffId ? "Staff Assigned" : "Assignment Cleared",
        description: staffId 
          ? `Table ${tableToAssign.table_number || tableToAssign.name} assigned successfully`
          : `Assignment cleared from table ${tableToAssign.table_number || tableToAssign.name}`,
      });
      
      setAssignDialogOpen(false);
      setTableToAssign(null);
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast({ title: "Error", description: "Failed to assign staff", variant: "destructive" });
    } finally {
      setAssigningStaff(false);
    }
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
        lab_ops_tables(name, table_number),
        server:lab_ops_staff(full_name),
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
        lab_ops_tables(name, table_number, turnover_count),
        server:lab_ops_staff(full_name),
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

      // Free table and increment turnover count
      if (order.table_id) {
        // First get current turnover count
        const { data: tableData } = await supabase
          .from("lab_ops_tables")
          .select("turnover_count")
          .eq("id", order.table_id)
          .single();
        
        const currentTurnover = tableData?.turnover_count || 0;
        
        const { error: tableError } = await supabase
          .from("lab_ops_tables")
          .update({ 
            status: "free",
            turnover_count: currentTurnover + 1
          })
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
    // Auto-navigate to bill on mobile
    setMobileView("bill");
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

  const updateItemNote = (itemId: string, note: string) => {
    setOrderItems(orderItems.map(o => 
      o.menu_item_id === itemId ? { ...o, note } : o
    ));
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
            {(staff.role === "waiter" || staff.role === "manager" || staff.role === "bartender") && (
              <Button variant="outline" size="sm" onClick={() => setActiveTab("pos")}>
                <ShoppingCart className="w-4 h-4 mr-1" /> POS
              </Button>
            )}
            {(staff.role === "bartender" || staff.role === "manager") && (
              <Button variant="outline" size="sm" onClick={() => { setActiveTab("orders"); fetchOpenOrders(outlet!.id); }}>
                <Receipt className="w-4 h-4 mr-1" /> Orders
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
                openOrders.map(order => {
                    const tableName = order.lab_ops_tables?.name || "Table";
                    const tableNumber = order.lab_ops_tables?.table_number || tableName.replace(/[^0-9]/g, '') || tableName.substring(0, 2);
                    const serverName = order.server?.full_name || "—";
                    const sentTime = new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                    return (
                      <Card 
                        key={order.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-amber-500"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              {/* Table Number Badge */}
                              <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <span className="font-black text-amber-500 text-xl">{tableNumber}</span>
                              </div>
                              <div>
                                <p className="font-semibold">{tableName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {order.lab_ops_order_items?.length || 0} items • {order.covers} covers
                                </p>
                                <p className="text-xs text-amber-500 font-medium mt-0.5">
                                  {serverName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">
                                ${order.lab_ops_order_items?.reduce((sum: number, i: any) => sum + (i.unit_price * i.qty), 0).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sentTime}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}

            {/* Archive Tab */}
            {ordersTab === "archive" && (
              <>
                {/* Filter & Analytics Controls */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="flex gap-1 flex-1">
                    {(["all", "cash", "card", "other"] as const).map(filter => (
                      <Button
                        key={filter}
                        variant={archiveFilter === filter ? "default" : "outline"}
                        size="sm"
                        className="text-xs capitalize flex-1"
                        onClick={() => setArchiveFilter(filter)}
                      >
                        {filter}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant={showArchiveAnalytics ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchiveAnalytics(!showArchiveAnalytics)}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Analytics Panel */}
                {showArchiveAnalytics && closedOrders.length > 0 && (() => {
                  const filteredOrders = archiveFilter === "all" 
                    ? closedOrders 
                    : closedOrders.filter(o => o.lab_ops_payments?.[0]?.payment_method === archiveFilter);
                  
                  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
                  const totalCovers = filteredOrders.reduce((sum, o) => sum + (o.covers || 0), 0);
                  const avgPerCover = totalCovers > 0 ? totalRevenue / totalCovers : 0;
                  
                  // Payment breakdown
                  const cashOrders = closedOrders.filter(o => o.lab_ops_payments?.[0]?.payment_method === 'cash');
                  const cardOrders = closedOrders.filter(o => o.lab_ops_payments?.[0]?.payment_method === 'card');
                  const cashTotal = cashOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                  const cardTotal = cardOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                  
                  // Peak hours
                  const hourCounts: Record<number, number> = {};
                  closedOrders.forEach(o => {
                    const hour = new Date(o.closed_at).getHours();
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                  });
                  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
                  
                  // Table performance
                  const tableRevenue: Record<string, number> = {};
                  closedOrders.forEach(o => {
                    const tableName = o.lab_ops_tables?.name || 'Unknown';
                    tableRevenue[tableName] = (tableRevenue[tableName] || 0) + (o.total_amount || 0);
                  });
                  const topTable = Object.entries(tableRevenue).sort((a, b) => b[1] - a[1])[0];
                  
                  return (
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-3 mb-3 space-y-3">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-card rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Avg Order</p>
                          <p className="text-lg font-bold text-primary">${avgOrderValue.toFixed(2)}</p>
                        </div>
                        <div className="bg-card rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Per Cover</p>
                          <p className="text-lg font-bold text-green-500">${avgPerCover.toFixed(2)}</p>
                        </div>
                        <div className="bg-card rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Total Covers</p>
                          <p className="text-lg font-bold">{totalCovers}</p>
                        </div>
                        <div className="bg-card rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Peak Hour</p>
                          <p className="text-lg font-bold">{peakHour ? `${peakHour[0]}:00` : '-'}</p>
                        </div>
                      </div>
                      
                      {/* Payment Breakdown */}
                      <div className="bg-card rounded-lg p-2">
                        <p className="text-xs text-muted-foreground mb-2">Payment Split</p>
                        <div className="flex gap-2">
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign className="w-3 h-3 text-green-500" />
                              <span className="text-sm font-semibold">${cashTotal.toFixed(0)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{cashOrders.length} cash</p>
                          </div>
                          <div className="w-px bg-border" />
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <CreditCard className="w-3 h-3 text-blue-500" />
                              <span className="text-sm font-semibold">${cardTotal.toFixed(0)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{cardOrders.length} card</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Top Table */}
                      {topTable && (
                        <div className="bg-card rounded-lg p-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
                              <span className="text-amber-500 font-bold text-sm">🏆</span>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Top Table</p>
                              <p className="text-sm font-semibold">{topTable[0]}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-primary">${topTable[1].toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {closedOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No closed orders for this date</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Bar */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium">
                        {(archiveFilter === "all" ? closedOrders : closedOrders.filter(o => o.lab_ops_payments?.[0]?.payment_method === archiveFilter)).length} orders • Total: $
                        {(archiveFilter === "all" ? closedOrders : closedOrders.filter(o => o.lab_ops_payments?.[0]?.payment_method === archiveFilter))
                          .reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                    
                    {/* Order Cards */}
                    {(archiveFilter === "all" ? closedOrders : closedOrders.filter(o => o.lab_ops_payments?.[0]?.payment_method === archiveFilter)).map(order => {
                      const tableName = order.lab_ops_tables?.name || "Table";
                      const tableNumber = order.lab_ops_tables?.table_number || tableName.replace(/[^0-9]/g, '') || "?";
                      const serverName = order.server?.full_name || "—";
                      const turnoverCount = order.lab_ops_tables?.turnover_count || 0;
                      const paymentMethod = order.lab_ops_payments?.[0]?.payment_method || "paid";
                      
                      return (
                        <Card 
                          key={order.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors mb-2"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                {/* Table Number Badge */}
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                  <span className="font-black text-green-500 text-lg">{tableNumber}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">{tableName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {order.lab_ops_order_items?.length || 0} items • {order.covers || 0} pax
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-green-500">{serverName}</span>
                                    <span className="text-[10px] text-muted-foreground">↻{turnoverCount}</span>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize">
                                      {paymentMethod}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">${(order.total_amount || 0).toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.closed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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
      {/* Compact Header */}
      <div className="sticky top-0 z-50 bg-card border-b px-2 py-2 flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{staff.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{outlet.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TeamPresenceIndicator 
            onlineTeam={onlineTeam} 
            outletName={outlet.name}
            currentStaffName={staff.full_name}
            currentStaffUsername={currentStaffUsername}
          />
          {/* Notification Bell with Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={unreadNotifications > 0 ? "default" : "ghost"} 
                size="icon"
                className={`relative h-8 w-8 ${unreadNotifications > 0 ? "bg-green-600 hover:bg-green-700 animate-pulse" : ""}`}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 max-h-[60vh] flex flex-col" align="end">
              <div className="p-3 border-b flex justify-between items-center shrink-0">
                <h4 className="font-semibold text-sm">Order Notifications</h4>
                {orderNotifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="text-xs h-7">
                    Clear All
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1 overflow-auto">
                {orderNotifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No notifications
                  </div>
                ) : (
                  <div className="divide-y">
                    {orderNotifications.map((notif) => {
                      const isStarted = notif.notification_type === 'item_started';
                      
                      // Extract table info
                      const tableInfo = notif.order?.table;
                      const tableName = tableInfo?.name || "Table";
                      const tableNumber = tableInfo?.table_number || tableName.replace(/[^0-9]/g, '') || "?";
                      
                      // Get completed item name
                      const completedItem = notif.item?.lab_ops_menu_items?.name || "Item";
                      const completedQty = notif.item?.qty || 1;
                      
                      // Calculate pending items from order
                      const orderItems = notif.order?.lab_ops_order_items || [];
                      const pendingItems = orderItems.filter((i: any) => i.status !== 'ready' && i.id !== notif.order_item_id);
                      const pendingCount = pendingItems.length;
                      
                      return (
                        <div 
                          key={notif.id} 
                          className={`p-3 ${isStarted ? 'bg-amber-500/10' : 'bg-green-500/10'}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Table Number Badge */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg text-white ${isStarted ? 'bg-amber-500' : 'bg-green-500'}`}>
                              {tableNumber}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">
                                  {isStarted ? 'Being Prepared' : 'Ready for Pickup'}
                                </p>
                                {isStarted ? (
                                  <Flame className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              
                              {/* Completed Item */}
                              <p className="text-sm mt-1">
                                <span className="font-medium">{completedQty}x {completedItem}</span>
                                <span className="text-muted-foreground"> for {tableName}</span>
                              </p>
                              
                              {/* Pending Items */}
                              {pendingCount > 0 && (
                                <p className="text-xs text-amber-500 mt-1">
                                  ⏳ {pendingCount} item{pendingCount > 1 ? 's' : ''} still pending
                                </p>
                              )}
                              {pendingCount === 0 && !isStarted && (
                                <p className="text-xs text-green-500 mt-1">
                                  ✓ All items ready!
                                </p>
                              )}
                              
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notif.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 shrink-0"
                              onClick={() => markNotificationRead(notif.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveTab("orders"); fetchOpenOrders(outlet.id); }}>
            <Receipt className="w-4 h-4" />
          </Button>
          {(staff.role === "bartender" || staff.role === "kitchen" || staff.role === "manager") && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setActiveTab("kds"); fetchKDSItems(outlet.id, staff.role); }}>
              <ChefHat className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table Selection */}
      {!selectedTable ? (
        <div className="flex-1 p-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-sm font-semibold">Select Table</h2>
              <p className="text-[10px] text-muted-foreground">Long-press to assign staff</p>
            </div>
            {/* Color Legend */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-muted-foreground">Occupied</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-muted-foreground">Closed</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {tables.map(table => {
              const isOccupied = table.status === "seated" || table.status === "occupied";
              const isClosed = table.status === "closed";
              const isFree = table.status === "free" || (!isOccupied && !isClosed);
              
              // Calculate bill total for this table from open orders
              const tableOrder = openOrders.find(o => o.table_id === table.id);
              const billTotal = tableOrder?.lab_ops_order_items?.reduce(
                (sum: number, item: any) => sum + (item.unit_price * item.qty), 0
              ) || 0;
              
              // Color coding: Red=Occupied, Green=Free, Orange=Closed
              const getTableStyle = () => {
                if (isOccupied) {
                  return "bg-red-500/90 hover:bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/30";
                }
                if (isClosed) {
                  return "bg-orange-500/90 hover:bg-orange-500 text-orange-950 border-orange-600 shadow-lg shadow-orange-500/30";
                }
                // Free - green
                return "bg-emerald-500/90 hover:bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-500/30";
              };
              
              return (
                <Button
                  key={table.id}
                  variant="outline"
                  className={`h-24 flex flex-col py-2 px-2 transition-all rounded-xl ${getTableStyle()}`}
                  onClick={() => setSelectedTable(table)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openAssignDialog(table);
                  }}
                  disabled={isClosed}
                >
                  {/* Large readable table number */}
                  <span className="font-black text-2xl leading-none">
                    {table.table_number || table.name?.replace(/[^0-9]/g, '') || '?'}
                  </span>
                  {/* Bill amount for occupied tables OR capacity for free tables */}
                  {isOccupied && billTotal > 0 ? (
                    <div className="flex items-center gap-1 mt-1.5 bg-white/20 px-2 py-0.5 rounded-full">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-sm font-bold">{billTotal.toFixed(0)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 opacity-80">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{table.capacity}</span>
                      {table.allocation === "outdoor" && <span className="text-[10px]">•Out</span>}
                    </div>
                  )}
                  {/* Turnover count */}
                  <span className="text-[10px] font-medium opacity-70 mt-1">
                    ↻ {table.turnover_count} turns
                  </span>
                </Button>
              );
            })}
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
              <span className="font-semibold">
                {selectedTable.table_number ? `Table ${selectedTable.table_number}` : selectedTable.name}
              </span>
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

          {/* Mobile Tab Toggle */}
          <div className="flex lg:hidden border-b bg-muted/30">
            <button
              onClick={() => setMobileView("menu")}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                mobileView === "menu" 
                  ? "bg-card text-primary border-b-2 border-primary" 
                  : "text-muted-foreground"
              }`}
            >
              <Search className="w-4 h-4" />
              Menu
            </button>
            <button
              onClick={() => setMobileView("bill")}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                mobileView === "bill" 
                  ? "bg-card text-primary border-b-2 border-primary" 
                  : "text-muted-foreground"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Bill ({orderItems.length})
              {orderItems.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                  ${orderTotal.toFixed(0)}
                </span>
              )}
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Menu Section - Hidden on mobile when bill is active */}
            <div className={`flex-1 flex flex-col border-r ${mobileView === "bill" ? "hidden lg:flex" : "flex"}`}>
              {/* Search */}
              <div className="p-1.5 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search menu..." 
                    className="pl-8 h-9 text-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Categories Dropdown */}
              <div className="border-b p-1.5">
                <Select 
                  value={selectedCategory || "all"} 
                  onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full h-9 text-sm bg-card">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border z-50">
                    <SelectItem value="all" className="text-sm py-2">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm py-2">
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Menu Items - More compact grid */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 gap-1 p-1">
                  {filteredItems.map(item => {
                    const isInOrder = orderItems.some(o => o.menu_item_id === item.id);
                    return (
                      <Button
                        key={item.id}
                        variant="outline"
                        className={`h-12 flex flex-col items-start justify-between p-1.5 transition-all ${
                          isInOrder 
                            ? 'bg-amber-500/90 border-amber-400 text-amber-950 hover:bg-amber-400' 
                            : 'bg-card hover:bg-muted'
                        }`}
                        onClick={() => addToOrder(item)}
                      >
                        <span className={`text-[11px] font-medium text-left line-clamp-1 leading-tight ${isInOrder ? 'text-amber-950' : ''}`}>
                          {item.name}
                        </span>
                        <span className={`text-xs font-semibold ${isInOrder ? 'text-amber-800' : 'text-primary'}`}>
                          ${item.base_price.toFixed(2)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Order Summary - Hidden on mobile when menu is active */}
            <div className={`w-full lg:w-80 flex flex-col bg-card ${mobileView === "menu" ? "hidden lg:flex" : "flex"}`}>
              <div className="p-2 border-b flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <ShoppingCart className="w-4 h-4" /> 
                  Order ({orderItems.length})
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="lg:hidden text-xs"
                  onClick={() => setMobileView("menu")}
                >
                  + Add More
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-1.5">
                  {orderItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Tap menu items to add
                    </p>
                  ) : (
                    orderItems.map(item => (
                      <div key={item.menu_item_id} className="p-2 bg-muted/50 rounded space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${(item.price * item.qty).toFixed(2)}</p>
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
                            <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
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
                        <Input
                          placeholder="Add note..."
                          value={item.note || ""}
                          onChange={(e) => updateItemNote(item.menu_item_id, e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Order Actions */}
              <div className="p-2 border-t space-y-2">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full h-11"
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
      {/* Staff Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Assign Staff to Table {tableToAssign?.table_number || tableToAssign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {/* Clear assignment option */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => assignStaffToTable(null)}
              disabled={assigningStaff}
            >
              <X className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Clear Assignment</span>
            </Button>
            
            {outletStaffList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No staff found</p>
            ) : (
              outletStaffList.map(staffMember => (
                <Button
                  key={staffMember.id}
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => assignStaffToTable(staffMember.id)}
                  disabled={assigningStaff}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {staffMember.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{staffMember.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{staffMember.role}</p>
                  </div>
                </Button>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Long-press or right-click on tables to assign staff
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
