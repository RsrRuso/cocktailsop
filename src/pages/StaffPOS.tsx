import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  detectBottleSizeMl, 
  bottlesToServings, 
  isSpiritCategory,
  POUR_SIZE_ML 
} from "@/lib/spiritServings";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
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
  DollarSign, ListOrdered, RefreshCw, ArrowLeft, Archive, Calendar, Flame, X, BarChart3, UserPlus, Printer
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrintDialog, OrderData, KOTPreview } from "@/components/lab-ops/print";

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
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
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
  remaining_serves: number | null;
  recipe_id?: string | null;
  // For inventory-linked items (like bottled water)
  inventory_item_id?: string | null;
  inventory_stock?: number | null;
  stock_level_id?: string | null;
  // Calculated servings from recipe ingredients (bottle stock × servings per bottle)
  calculated_servings?: number | null;
}

export default function StaffPOS() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // Print dialog state
  type POSPrintType = 'kitchen' | 'bar' | 'precheck' | 'closing' | 'combined';

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState<OrderData | null>(null);
  const [defaultPrintType, setDefaultPrintType] = useState<POSPrintType>('precheck');

  // Hidden in-page print area (so we can call window.print() from a user tap reliably)
  const [quickPrintJob, setQuickPrintJob] = useState<{ order: OrderData; type: POSPrintType } | null>(null);

  const ensurePosPrintStyles = () => {
    const id = "pos-print-style";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
@media print {
  body[data-pos-printing='true'] * {
    visibility: hidden !important;
  }
  body[data-pos-printing='true'] [data-pos-print-area],
  body[data-pos-printing='true'] [data-pos-print-area] * {
    visibility: visible !important;
  }
  body[data-pos-printing='true'] [data-pos-print-area] {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 80mm !important;
    padding: 10px !important;
    background: #fff !important;
    color: #000 !important;
  }
}
`;
    document.head.appendChild(style);
  };

  const triggerSystemPrint = (job: { order: OrderData; type: POSPrintType }) => {
    ensurePosPrintStyles();

    // Flush receipt to DOM before calling print (important for mobile Safari)
    flushSync(() => {
      setQuickPrintJob(job);
    });

    document.body.setAttribute("data-pos-printing", "true");
    window.print();

    const cleanup = () => {
      document.body.removeAttribute("data-pos-printing");
      setQuickPrintJob(null);
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 1500);
  };

  const openPrintPage = (job: { order: OrderData; type: POSPrintType }) => {
    // Store a print job and navigate to the dedicated print page (best UX on iOS).
    // iOS often blocks auto-print unless user taps the Print button on that page.
    const id = (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const key = `pos_print_job:${id}`;
    const payload = JSON.stringify({ ...job, createdAt: Date.now() });

    try {
      sessionStorage.setItem(key, payload);
    } catch {
      try {
        localStorage.setItem(key, payload);
      } catch {
        // ignore
      }
    }

    navigate(`/staff-pos/print?job=${encodeURIComponent(id)}`);
  };

  useEffect(() => {
    const initSession = async () => {
      // First check navigation state (coming from KDS)
      const navState = location.state as { staff?: StaffMember; outlet?: Outlet } | null;
      if (navState?.staff && navState?.outlet) {
        handleStaffLogin(navState.staff, navState.outlet);
        setIsLoading(false);
        return;
      }

      // Check for stored session from PIN access page
      const storedSession = sessionStorage.getItem("lab_ops_staff_session");
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession);
          // Check if session is still valid (within 8 hours)
          if (session.timestamp && Date.now() - session.timestamp < 8 * 60 * 60 * 1000) {
            const staffFromSession: StaffMember = {
              id: session.staffId,
              full_name: session.staffName,
              role: session.staffRole,
              outlet_id: session.outletId,
              permissions: session.permissions || {}
            };
            const outletFromSession: Outlet = {
              id: session.outletId,
              name: session.outletName
            };
            // Auto-login with stored session
            handleStaffLogin(staffFromSession, outletFromSession);
            setIsLoading(false);
            return;
          } else {
            // Clear expired session
            sessionStorage.removeItem("lab_ops_staff_session");
          }
        } catch (e) {
          console.error("Error parsing stored session:", e);
          sessionStorage.removeItem("lab_ops_staff_session");
        }
      }
      fetchOutlets();
    };
    
    initSession();
  }, [location.state]);


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
    
    // Store session for seamless navigation between KDS and POS
    const sessionData = {
      staffId: loggedInStaff.id,
      staffName: loggedInStaff.full_name,
      staffRole: loggedInStaff.role,
      outletId: selectedOutlet.id,
      outletName: selectedOutlet.name,
      permissions: loggedInStaff.permissions,
      timestamp: Date.now()
    };
    sessionStorage.setItem("lab_ops_staff_session", JSON.stringify(sessionData));
    
    // Load outlet data including open orders for bill totals
    await Promise.all([
      fetchTables(selectedOutlet.id),
      fetchCategories(selectedOutlet.id),
      fetchMenuItems(selectedOutlet.id),
      fetchOpenOrders(selectedOutlet.id),
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

  // Navigate to KDS without requiring PIN
  const navigateToKDS = () => {
    if (staff && outlet) {
      navigate('/bar-kds', { state: { staff, outlet } });
    }
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
    // Use raw query to get tables with assigned staff - only active (non-archived) tables
    const { data: rawTables } = await supabase
      .from("lab_ops_tables")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("is_archived", false)
      .order("table_number", { ascending: true, nullsFirst: false });
    
    const tableData = rawTables || [];
    const staffIds = tableData
      .map((t: any) => t.assigned_staff_id)
      .filter(Boolean);
    
    // Fetch staff names in one query
    let staffMap: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from("lab_ops_staff")
        .select("id, full_name")
        .in("id", staffIds);
      staffMap = (staffData || []).reduce((acc, s) => ({ ...acc, [s.id]: s.full_name }), {});
    }
    
    setTables(tableData.map((t: any) => ({
      id: t.id,
      name: t.name,
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
      allocation: t.allocation,
      turnover_count: t.turnover_count || 0,
      assigned_staff_id: t.assigned_staff_id || null,
      assigned_staff_name: t.assigned_staff_id ? staffMap[t.assigned_staff_id] || null : null
    })));
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
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            // Fetch staff name if assigned
            let staffName = null;
            if (updated.assigned_staff_id) {
              const { data: staffData } = await supabase
                .from("lab_ops_staff")
                .select("full_name")
                .eq("id", updated.assigned_staff_id)
                .single();
              staffName = staffData?.full_name || null;
            }
            setTables(prev => prev.map(t => 
              t.id === updated.id 
                ? { 
                    ...t, 
                    status: updated.status, 
                    turnover_count: updated.turnover_count || 0,
                    assigned_staff_id: updated.assigned_staff_id || null,
                    assigned_staff_name: staffName
                  }
                : t
            ));
          } else if (payload.eventType === 'INSERT') {
            const inserted = payload.new as any;
            setTables(prev => [...prev, { 
              ...inserted, 
              turnover_count: inserted.turnover_count || 0,
              assigned_staff_id: inserted.assigned_staff_id || null,
              assigned_staff_name: null
            }]);
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
      .select(`
        id, name, base_price, category_id, remaining_serves, recipe_id, inventory_item_id,
        lab_ops_categories(name, type),
        lab_ops_recipes!lab_ops_recipes_menu_item_id_fkey(
          id,
          lab_ops_recipe_ingredients(qty, unit, bottle_size, inventory_item_id, lab_ops_inventory_items(name, base_unit))
        )
      `)
      .eq("outlet_id", outletId)
      .eq("is_active", true);
    
    // For items with inventory_item_id, fetch current stock from lab_ops_stock_levels
    const itemsWithInventory = (data || []).filter((item: any) => item.inventory_item_id);
    let stockMap: Record<string, { quantity: number; stock_level_id: string }> = {};
    
    if (itemsWithInventory.length > 0) {
      const inventoryItemIds = itemsWithInventory.map((item: any) => item.inventory_item_id);
      const { data: stockLevels } = await supabase
        .from("lab_ops_stock_levels")
        .select("id, inventory_item_id, quantity")
        .in("inventory_item_id", inventoryItemIds);
      
      if (stockLevels) {
        // Group by inventory_item_id and sum quantities
        for (const sl of stockLevels) {
          if (stockMap[sl.inventory_item_id]) {
            stockMap[sl.inventory_item_id].quantity += Number(sl.quantity || 0);
          } else {
            stockMap[sl.inventory_item_id] = { 
              quantity: Number(sl.quantity || 0), 
              stock_level_id: sl.id 
            };
          }
        }
      }
    }
    
    // Collect all inventory_item_ids from recipe ingredients for stock calculation
    const recipeInventoryIds = new Set<string>();
    const ingredientInfoMap: Record<string, { name: string; baseUnit: string }> = {};
    (data || []).forEach((item: any) => {
      const recipe = item.lab_ops_recipes?.[0];
      if (recipe?.lab_ops_recipe_ingredients) {
        recipe.lab_ops_recipe_ingredients.forEach((ing: any) => {
          if (ing.inventory_item_id) {
            recipeInventoryIds.add(ing.inventory_item_id);
            if (ing.lab_ops_inventory_items) {
              ingredientInfoMap[ing.inventory_item_id] = {
                name: ing.lab_ops_inventory_items.name || '',
                baseUnit: ing.lab_ops_inventory_items.base_unit || ''
              };
            }
          }
        });
      }
    });
    
    // Fetch stock levels for recipe ingredients
    let recipeStockMap: Record<string, number> = {};
    if (recipeInventoryIds.size > 0) {
      const { data: recipeStockLevels } = await supabase
        .from("lab_ops_stock_levels")
        .select("inventory_item_id, quantity")
        .in("inventory_item_id", Array.from(recipeInventoryIds));
      
      if (recipeStockLevels) {
        for (const sl of recipeStockLevels) {
          recipeStockMap[sl.inventory_item_id] = (recipeStockMap[sl.inventory_item_id] || 0) + Number(sl.quantity || 0);
        }
      }
    }
    
    setMenuItems((data || []).map((item: any) => {
      const invStock = item.inventory_item_id ? stockMap[item.inventory_item_id] : null;
      
      // Check if this menu item is in the Spirits category
      const categoryName = String(item.lab_ops_categories?.name || '').toLowerCase();
      const isSpirits = isSpiritCategory(categoryName);
      
      // NEW SIMPLIFIED LOGIC:
      // For Spirits: bottles × bottle_ml ÷ 30 = servings
      // For others: stock directly = servings
      let calculatedServings: number | null = null;
      const recipe = item.lab_ops_recipes?.[0];
      
      if (recipe?.lab_ops_recipe_ingredients?.length > 0) {
        // Find minimum servings across all ingredients (limiting ingredient)
        let minServings = Infinity;
        
        for (const ing of recipe.lab_ops_recipe_ingredients) {
          if (!ing.inventory_item_id) continue;
          
          const stockQty = recipeStockMap[ing.inventory_item_id] || 0;
          const ingInfo = ingredientInfoMap[ing.inventory_item_id];
          const ingName = ingInfo?.name || '';
          const baseUnit = String(ingInfo?.baseUnit || '').toUpperCase();
          
          // Check if ingredient is a bottle (BOT, bottle, etc.)
          const isBottleUnit = baseUnit === 'BOT' || baseUnit === 'BOTTLE';
          
          let servingsInStock: number;
          
          if (isSpirits && isBottleUnit) {
            // SPIRIT LOGIC: bottles × bottle_ml ÷ 30 = servings
            const bottleSizeMl = Number(ing.bottle_size) || detectBottleSizeMl(ingName);
            servingsInStock = bottlesToServings(stockQty, bottleSizeMl, POUR_SIZE_ML);
          } else if (isBottleUnit) {
            // Non-spirit bottle items: show as units directly
            servingsInStock = Math.floor(stockQty);
          } else {
            // Non-bottle items: use qty-based calculation
            const pourAmount = Number(ing.qty) || 1;
            servingsInStock = pourAmount > 0 ? Math.floor(stockQty / pourAmount) : Math.floor(stockQty);
          }
          
          minServings = Math.min(minServings, servingsInStock);
        }
        
        if (minServings !== Infinity) {
          calculatedServings = minServings;
        }
      }
      
      return {
        ...item,
        remaining_serves: item.remaining_serves ?? null,
        recipe_id: item.recipe_id || recipe?.id || null,
        inventory_item_id: item.inventory_item_id || null,
        inventory_stock: invStock ? invStock.quantity : null,
        stock_level_id: invStock ? invStock.stock_level_id : null,
        calculated_servings: calculatedServings,
      };
    }));
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
        lab_ops_order_items(
          id,
          menu_item_id,
          qty,
          unit_price,
          lab_ops_menu_items(name, serving_ml)
        )
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
        lab_ops_order_items(
          id,
          menu_item_id,
          qty,
          unit_price,
          lab_ops_menu_items(name, serving_ml)
        ),
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

      // Note: Closing check print is handled after the order is successfully closed,
      // by navigating to the dedicated print page (better UX and correct preview on iOS).

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

      // Record sales in lab_ops_sales for batch tracking
      const salesRecords = orderItems
        .filter((item: any) => item.menu_item_id)
        .map((item: any) => {
          const itemName = item.lab_ops_menu_items?.name || "Unknown Item";
          const qty = Number(item.qty || 0);
          const servingMl = Number(item.lab_ops_menu_items?.serving_ml || 90);
          const unitPrice = Number(item.unit_price || 0);

          return {
            outlet_id: outlet.id,
            order_id: order.id,
            item_name: itemName,
            quantity: qty,
            ml_per_serving: servingMl,
            total_ml_sold: servingMl * qty,
            unit_price: unitPrice || null,
            total_price: unitPrice ? unitPrice * qty : null,
            sold_at: new Date().toISOString(),
            sold_by: staff.id,
          };
        });

      if (salesRecords.length > 0) {
        const { error: salesError } = await supabase.from("lab_ops_sales").insert(salesRecords);

        if (salesError) {
          console.error("Sales insert error:", salesError);
          // Don't throw - sales recording failure shouldn't block order close
        }
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

      toast({ title: "Order closed!", description: `${formatPrice(subtotal)} recorded in sales` });
      
      const closedOrder = {
        ...order,
        status: "closed",
        closed_at: new Date().toISOString(),
        total_amount: subtotal,
        lab_ops_payments: [{ payment_method: paymentMethod, amount: subtotal }],
      };

      // Open closing check preview (then user can tap Print)
      try {
        const printData = prepareOrderForPrint(closedOrder);
        if (printData?.items?.length) {
          openPrintPage({ order: printData, type: "closing" });
        } else {
          toast({
            title: "No items to print",
            description: "This order has no items to print.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Closing print prep failed:", e);
      }

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

  // Prepare order data for printing
  const prepareOrderForPrint = (order: any): OrderData => {
    console.log('Preparing order for print:', order);
    
    if (!order) {
      throw new Error('No order provided');
    }
    
    const tableName = order.lab_ops_tables?.name || order.tableName || "Table";
    const tableNumber = order.lab_ops_tables?.table_number || order.tableNumber || null;
    const serverName = order.server?.full_name || order.serverName || staff?.full_name || "Staff";
    
    // Handle items from different sources
    const rawItems = order.lab_ops_order_items || order.items || [];
    const items = rawItems.map((item: any) => ({
      id: item.id || `item-${Math.random()}`,
      name: item.lab_ops_menu_items?.name || item.name || "Item",
      qty: item.qty || 1,
      price: item.unit_price || item.price || 0,
      note: item.note || undefined,
      category: item.lab_ops_menu_items?.lab_ops_categories?.name || item.category,
      categoryType: (item.lab_ops_menu_items?.lab_ops_categories?.type || item.categoryType) as 'food' | 'drink' | undefined,
    }));

    const subtotal = items.reduce((sum: number, i: any) => sum + (i.qty * i.price), 0);

    const rawTotal = (order.total_amount ?? order.total ?? subtotal) as number;
    const serviceCharge = (order.service_charge ?? order.serviceCharge ?? 0) as number;
    const discountTotal = (order.discount_total ?? order.discountTotal ?? 0) as number;
    let taxTotal = (order.tax_total ?? order.taxTotal ?? 0) as number;

    // If backend totals exist but tax wasn’t provided, infer it so Pre‑Check prints full totals.
    if ((!taxTotal || taxTotal === 0) && typeof rawTotal === "number") {
      const impliedTax = rawTotal - subtotal - serviceCharge + discountTotal;
      if (impliedTax > 0.0001) taxTotal = impliedTax;
    }

    const printData: OrderData = {
      id: order.id || `order-${Date.now()}`,
      tableName,
      tableNumber,
      serverName,
      covers: order.covers || 1,
      createdAt: order.created_at || order.createdAt || new Date().toISOString(),
      items,
      subtotal,
      taxTotal,
      serviceCharge,
      discountTotal,
      total: rawTotal,
      paymentMethod: order.lab_ops_payments?.[0]?.payment_method || order.paymentMethod,
      paidAt: order.closed_at || order.paidAt,
      outletName: outlet?.name || order.outletName,
    };

    console.log('Prepared print data result:', printData);
    return printData;
  };

  const openPrintDialog = async (
    order: any,
    printType?: 'kitchen' | 'bar' | 'precheck' | 'closing' | 'combined'
  ) => {
    // Open in-app dialog (no navigation / no popups)
    try {
      let hydratedOrder = order;

      // If the order we have doesn't include items (common in list views), hydrate it from the database.
      const hasItems = Array.isArray(order?.lab_ops_order_items) && order.lab_ops_order_items.length > 0;
      if (!hasItems && order?.id) {
        const { data, error } = await supabase
          .from('lab_ops_orders')
          .select(
            `
            id,
            created_at,
            status,
            covers,
            total_amount,
            service_charge,
            tax_total,
            discount_total,
            closed_at,
            lab_ops_tables ( name, table_number ),
            lab_ops_order_items ( id, qty, unit_price, note, lab_ops_menu_items ( name, lab_ops_categories ( name, type ) ) ),
            lab_ops_payments ( payment_method, amount )
          `.replace(/\s+/g, ' ').trim()
          )
          .eq('id', order.id)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }
        if (data) hydratedOrder = data;
      }

      const printData = prepareOrderForPrint(hydratedOrder);
      if (!printData?.items?.length) {
        toast({
          title: "No items to print",
          description: "This order has no items to display",
          variant: "destructive",
        });
        return;
      }

      setOrderToPrint(printData);
      setDefaultPrintType(printType || "precheck");
      setPrintDialogOpen(true);
    } catch (error: any) {
      console.error("Error preparing print job:", error);
      toast({
        title: "Print error",
        description: error?.message || "Failed to prepare print",
        variant: "destructive",
      });
    }
  };

  const handlePrecheckPrint = (order: any) => {
    try {
      const printData = prepareOrderForPrint(order);
      if (!printData?.items?.length) {
        toast({
          title: "No items to print",
          description: "This order has no items to print.",
          variant: "destructive",
        });
        return;
      }

      // Open the dedicated print page so the user sees the receipt preview (and can tap Print).
      openPrintPage({ order: printData, type: "precheck" });
    } catch (error: any) {
      console.error("Error preparing pre-check print:", error);
      toast({
        title: "Print error",
        description: error?.message || "Failed to print pre-check",
        variant: "destructive",
      });
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

  const addToOrder = async (item: MenuItem) => {
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
    
    // Handle inventory-linked items (like bottled water) - deduct from lab_ops_stock_levels
    if (item.inventory_item_id && item.inventory_stock !== null && item.inventory_stock > 0) {
      const newStock = Math.max(0, item.inventory_stock - 1);
      setMenuItems(prev => prev.map(m => 
        m.id === item.id && m.inventory_stock !== null
          ? { ...m, inventory_stock: newStock }
          : m
      ));
      
      // Deduct from stock levels in database
      deductInventoryStock(item.inventory_item_id, 1, item.stock_level_id);
    }
    // Handle batch-recipe based items (remaining_serves) 
    else if (item.remaining_serves !== null && item.remaining_serves > 0) {
      setMenuItems(prev => prev.map(m => 
        m.id === item.id && m.remaining_serves !== null
          ? { ...m, remaining_serves: Math.max(0, m.remaining_serves - 1) }
          : m
      ));
      
      // Update database in background (fire and forget)
      supabase
        .from("lab_ops_menu_items")
        .update({ remaining_serves: Math.max(0, item.remaining_serves - 1) })
        .eq("id", item.id)
        .then(() => {});
    }
    // Handle recipe-based items with calculated_servings (like cocktails with ingredients)
    else if (item.calculated_servings !== null && item.calculated_servings > 0) {
      // Update UI immediately
      setMenuItems(prev => prev.map(m => 
        m.id === item.id && m.calculated_servings !== null
          ? { ...m, calculated_servings: Math.max(0, m.calculated_servings - 1) }
          : m
      ));
    }
    
    // Real-time ingredient deduction based on recipe
    if (item.recipe_id) {
      deductRecipeIngredients(item.recipe_id, 1);
    }
    
    // Auto-navigate to bill on mobile
    setMobileView("bill");
  };

  // Deduct inventory stock for inventory-linked items (like bottled water)
  const deductInventoryStock = async (inventoryItemId: string, qty: number, stockLevelId?: string | null) => {
    try {
      // Get current stock level
      const { data: stockLevels } = await supabase
        .from("lab_ops_stock_levels")
        .select("id, quantity, location_id")
        .eq("inventory_item_id", inventoryItemId)
        .gt("quantity", 0)
        .order("quantity", { ascending: false })
        .limit(1);

      if (stockLevels?.length) {
        const stockLevel = stockLevels[0];
        const newQuantity = Math.max(0, Number(stockLevel.quantity) - qty);
        
        // Update stock level
        await supabase
          .from("lab_ops_stock_levels")
          .update({ quantity: newQuantity })
          .eq("id", stockLevel.id);

        // Record movement
        await supabase.from("lab_ops_stock_movements").insert({
          inventory_item_id: inventoryItemId,
          from_location_id: stockLevel.location_id,
          qty: qty,
          movement_type: "sale",
          reference_type: "pos_sale",
          notes: `POS sale deduction`
        });
      }
    } catch (error) {
      console.error("Inventory stock deduction error:", error);
    }
  };

  // Deduct recipe ingredients from inventory in real-time
  // SPIRIT LOGIC: recipe qty is in ml (e.g., 30ml pour), bottle_size is bottle capacity
  // Deduct = (recipe_qty_ml × servings) / bottle_size_ml = fractional bottles
  const deductRecipeIngredients = async (recipeId: string, servingsToDeduct: number) => {
    try {
      const { data: ingredients } = await supabase
        .from("lab_ops_recipe_ingredients")
        .select("inventory_item_id, qty, unit, bottle_size, lab_ops_inventory_items(name, base_unit)")
        .eq("recipe_id", recipeId);

      if (!ingredients?.length) return;

      for (const ingredient of ingredients as any[]) {
        const inventoryItemId = ingredient.inventory_item_id as string | null;
        if (!inventoryItemId) continue;

        const baseUnit = String(ingredient.lab_ops_inventory_items?.base_unit || '').toLowerCase();
        const isBottleUnit = baseUnit === 'bot' || baseUnit === 'bottle' || baseUnit === 'bottles';
        const ingName = String(ingredient.lab_ops_inventory_items?.name || '');
        const recipeQtyMl = Number(ingredient.qty || 0); // This is ml per serving (e.g., 30)
        const unit = String(ingredient.unit || 'ml').toLowerCase();
        
        let qtyToDeduct: number;
        
        // For bottle-based items with ml recipe qty: deduct fractional bottles
        // Formula: (pour_ml × servings) / bottle_size = bottles to deduct
        if (isBottleUnit && (unit === 'ml' || unit === 'g')) {
          const bottleSizeMl = Number(ingredient.bottle_size) || detectBottleSizeMl(ingName);
          // recipeQtyMl is the pour size (e.g., 30ml), deduct that per serving
          qtyToDeduct = (recipeQtyMl * servingsToDeduct) / bottleSizeMl;
        } else if (isBottleUnit) {
          // If unit is "bottle" or similar, deduct recipe qty as whole bottles
          qtyToDeduct = recipeQtyMl * servingsToDeduct;
        } else {
          // Non-bottle items: deduct recipe qty × servings
          qtyToDeduct = recipeQtyMl * servingsToDeduct;
        }

        if (qtyToDeduct <= 0) continue;

        // Get stock level (allow fetching even if quantity is 0 to still record movement)
        const { data: stockLevels } = await supabase
          .from("lab_ops_stock_levels")
          .select("id, quantity, location_id")
          .eq("inventory_item_id", inventoryItemId)
          .order("quantity", { ascending: false })
          .limit(1);

        if (!stockLevels?.length) continue;

        const stockLevel = stockLevels[0];
        const currentQty = Number(stockLevel.quantity || 0);
        const newQuantity = Math.max(0, currentQty - qtyToDeduct);

        await supabase
          .from("lab_ops_stock_levels")
          .update({ quantity: newQuantity })
          .eq("id", stockLevel.id);

        await supabase.from("lab_ops_stock_movements").insert({
          inventory_item_id: inventoryItemId,
          from_location_id: stockLevel.location_id,
          qty: qtyToDeduct,
          movement_type: "sale",
          reference_type: "recipe_consumption",
          reference_id: recipeId,
          notes: `Sold ${servingsToDeduct} srv → -${qtyToDeduct.toFixed(4)} ${isBottleUnit ? 'BOT' : unit}`,
        });
      }
    } catch (error) {
      console.error("Recipe ingredient deduction error:", error);
    }
  };

  // Restore recipe ingredients to inventory (for item removal/quantity decrease)
  const restoreRecipeIngredients = async (recipeId: string, servingsToRestore: number) => {
    try {
      const { data: ingredients } = await supabase
        .from("lab_ops_recipe_ingredients")
        .select("inventory_item_id, qty, unit, bottle_size, lab_ops_inventory_items(name, base_unit)")
        .eq("recipe_id", recipeId);

      if (!ingredients?.length) return;

      for (const ingredient of ingredients as any[]) {
        const inventoryItemId = ingredient.inventory_item_id as string | null;
        if (!inventoryItemId) continue;

        const baseUnit = String(ingredient.lab_ops_inventory_items?.base_unit || '').toLowerCase();
        const isBottleUnit = baseUnit === 'bot' || baseUnit === 'bottle' || baseUnit === 'bottles';
        const ingName = String(ingredient.lab_ops_inventory_items?.name || '');
        const recipeQtyMl = Number(ingredient.qty || 0);
        const unit = String(ingredient.unit || 'ml').toLowerCase();
        
        let qtyToRestore: number;
        
        if (isBottleUnit && (unit === 'ml' || unit === 'g')) {
          const bottleSizeMl = Number(ingredient.bottle_size) || detectBottleSizeMl(ingName);
          qtyToRestore = (recipeQtyMl * servingsToRestore) / bottleSizeMl;
        } else if (isBottleUnit) {
          qtyToRestore = recipeQtyMl * servingsToRestore;
        } else {
          qtyToRestore = recipeQtyMl * servingsToRestore;
        }

        if (qtyToRestore <= 0) continue;

        const { data: stockLevels } = await supabase
          .from("lab_ops_stock_levels")
          .select("id, quantity, location_id")
          .eq("inventory_item_id", inventoryItemId)
          .order("quantity", { ascending: false })
          .limit(1);

        if (!stockLevels?.length) continue;

        const stockLevel = stockLevels[0];
        const currentQty = Number(stockLevel.quantity || 0);
        const newQuantity = currentQty + qtyToRestore;

        await supabase
          .from("lab_ops_stock_levels")
          .update({ quantity: newQuantity })
          .eq("id", stockLevel.id);

        await supabase.from("lab_ops_stock_movements").insert({
          inventory_item_id: inventoryItemId,
          to_location_id: stockLevel.location_id,
          qty: qtyToRestore,
          movement_type: "adjustment",
          reference_type: "recipe_return",
          reference_id: recipeId,
          notes: `Returned ${servingsToRestore} srv → +${qtyToRestore.toFixed(4)} ${isBottleUnit ? 'BOT' : unit}`,
        });
      }
    } catch (error) {
      console.error("Recipe ingredient restore error:", error);
    }
  };

  const updateQuantity = async (itemId: string, delta: number) => {
    const currentItem = orderItems.find(o => o.menu_item_id === itemId);
    const menuItem = menuItems.find(m => m.id === itemId);
    
    setOrderItems(orderItems.map(o => {
      if (o.menu_item_id === itemId) {
        const newQty = o.qty + delta;
        return newQty > 0 ? { ...o, qty: newQty } : o;
      }
      return o;
    }).filter(o => o.qty > 0));
    
    // Handle inventory-linked items
    if (menuItem && menuItem.inventory_item_id && menuItem.inventory_stock !== null) {
      const newStock = delta > 0 
        ? Math.max(0, menuItem.inventory_stock - 1)
        : menuItem.inventory_stock + 1;
      
      setMenuItems(prev => prev.map(m => 
        m.id === itemId && m.inventory_stock !== null
          ? { ...m, inventory_stock: newStock }
          : m
      ));
      
      // Update database
      if (delta > 0) {
        deductInventoryStock(menuItem.inventory_item_id, 1, menuItem.stock_level_id);
      } else {
        restoreInventoryStock(menuItem.inventory_item_id, 1);
      }
    }
    // Handle batch-recipe based items (remaining_serves)
    else if (menuItem && menuItem.remaining_serves !== null) {
      const newRemaining = delta > 0 
        ? Math.max(0, menuItem.remaining_serves - 1)
        : menuItem.remaining_serves + 1;
      
      setMenuItems(prev => prev.map(m => 
        m.id === itemId && m.remaining_serves !== null
          ? { ...m, remaining_serves: newRemaining }
          : m
      ));
      
      // Update database
      supabase
        .from("lab_ops_menu_items")
        .update({ remaining_serves: newRemaining })
        .eq("id", itemId)
        .then(() => {});
    }
    // Handle recipe-based items with calculated_servings
    else if (menuItem && menuItem.calculated_servings !== null) {
      const newServings = delta > 0 
        ? Math.max(0, menuItem.calculated_servings - 1)
        : menuItem.calculated_servings + 1;
      
      setMenuItems(prev => prev.map(m => 
        m.id === itemId && m.calculated_servings !== null
          ? { ...m, calculated_servings: newServings }
          : m
      ));
    }
    
    // Handle recipe ingredient deduction/restore
    if (menuItem?.recipe_id && delta !== 0) {
      if (delta > 0) {
        deductRecipeIngredients(menuItem.recipe_id, 1);
      } else {
        restoreRecipeIngredients(menuItem.recipe_id, 1);
      }
    }
  };

  const removeItem = async (itemId: string) => {
    const removedItem = orderItems.find(o => o.menu_item_id === itemId);
    const menuItem = menuItems.find(m => m.id === itemId);
    
    setOrderItems(orderItems.filter(o => o.menu_item_id !== itemId));
    
    // Restore inventory stock when item is removed
    if (removedItem && menuItem && menuItem.inventory_item_id && menuItem.inventory_stock !== null) {
      const restoredAmount = removedItem.qty;
      const newStock = menuItem.inventory_stock + restoredAmount;
      
      setMenuItems(prev => prev.map(m => 
        m.id === itemId && m.inventory_stock !== null
          ? { ...m, inventory_stock: newStock }
          : m
      ));
      
      // Restore in database
      restoreInventoryStock(menuItem.inventory_item_id, restoredAmount);
    }
    // Restore remaining_serves when item is removed
    else if (removedItem && menuItem && menuItem.remaining_serves !== null) {
      const restoredAmount = removedItem.qty;
      const newRemaining = menuItem.remaining_serves + restoredAmount;
      
      setMenuItems(prev => prev.map(m => 
        m.id === itemId && m.remaining_serves !== null
          ? { ...m, remaining_serves: newRemaining }
          : m
      ));
      
      // Update database
      supabase
        .from("lab_ops_menu_items")
        .update({ remaining_serves: newRemaining })
        .eq("id", itemId)
        .then(() => {});
    }
    // Restore calculated_servings when item is removed
    else if (removedItem && menuItem && menuItem.calculated_servings !== null) {
      const restoredAmount = removedItem.qty;
      const newServings = menuItem.calculated_servings + restoredAmount;
      
      setMenuItems(prev => prev.map(m => 
        m.id === itemId && m.calculated_servings !== null
          ? { ...m, calculated_servings: newServings }
          : m
      ));
      
      // Restore recipe ingredients in database
      if (menuItem.recipe_id) {
        restoreRecipeIngredients(menuItem.recipe_id, restoredAmount);
      }
    }
  };

  // Restore inventory stock (for item removal/quantity decrease)
  const restoreInventoryStock = async (inventoryItemId: string, qty: number) => {
    try {
      // Get current stock level
      const { data: stockLevels } = await supabase
        .from("lab_ops_stock_levels")
        .select("id, quantity, location_id")
        .eq("inventory_item_id", inventoryItemId)
        .order("quantity", { ascending: false })
        .limit(1);

      if (stockLevels?.length) {
        const stockLevel = stockLevels[0];
        const newQuantity = Number(stockLevel.quantity) + qty;
        
        // Update stock level
        await supabase
          .from("lab_ops_stock_levels")
          .update({ quantity: newQuantity })
          .eq("id", stockLevel.id);

        // Record movement (adjustment for return)
        await supabase.from("lab_ops_stock_movements").insert({
          inventory_item_id: inventoryItemId,
          to_location_id: stockLevel.location_id,
          qty: qty,
          movement_type: "adjustment",
          reference_type: "pos_return",
          notes: `POS order item removed/reduced`
        });
      }
    } catch (error) {
      console.error("Inventory stock restore error:", error);
    }
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
      // Check if table already has an open order
      const { data: existingOrder } = await supabase
        .from("lab_ops_orders")
        .select("*")
        .eq("table_id", selectedTable.id)
        .in("status", ["open", "sent"])
        .single();

      let orderId: string;
      let isExistingOrder = false;

      if (existingOrder) {
        // Add to existing order instead of creating duplicate
        orderId = existingOrder.id;
        isExistingOrder = true;
      } else {
        // Calculate totals
        const subtotal = orderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
        
        // Create new order
        const { data: order, error: orderError } = await supabase
          .from("lab_ops_orders")
          .insert({
            outlet_id: outlet.id,
            table_id: selectedTable.id,
            server_id: staff.id,
            covers,
            status: "open",
            subtotal,
            total_amount: subtotal,
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = order.id;
      }

      // Create order items
      const items = orderItems.map(item => ({
        order_id: orderId,
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

      // Deduct stock for recipe-based items (bottle_size / pour_qty logic)
      for (const orderItem of orderItems) {
        const menuItem = menuItems.find(m => m.id === orderItem.menu_item_id);
        if (!menuItem) continue;
        
        // Handle direct inventory items (like bottled water)
        if (menuItem.inventory_item_id && menuItem.stock_level_id) {
          await supabase
            .from("lab_ops_stock_levels")
            .update({ quantity: Math.max(0, (menuItem.inventory_stock || 0) - orderItem.qty) })
            .eq("id", menuItem.stock_level_id);
        }
        
        // Handle recipe-based items - deduct fractional bottle amounts
        const recipe = (menuItem as any).lab_ops_recipes?.[0];
        if (recipe?.lab_ops_recipe_ingredients?.length > 0) {
          for (const ing of recipe.lab_ops_recipe_ingredients) {
            if (ing.inventory_item_id && ing.qty > 0 && ing.bottle_size > 0) {
              // Each serving uses (pourQty / bottleSize) bottles
              const bottleFraction = ing.qty / ing.bottle_size;
              const bottlesToDeduct = bottleFraction * orderItem.qty;
              
              // Deduct from stock level
              const { data: stockLevel } = await supabase
                .from("lab_ops_stock_levels")
                .select("id, quantity")
                .eq("inventory_item_id", ing.inventory_item_id)
                .limit(1)
                .single();
              
              if (stockLevel) {
                await supabase
                  .from("lab_ops_stock_levels")
                  .update({ quantity: Math.max(0, stockLevel.quantity - bottlesToDeduct) })
                  .eq("id", stockLevel.id);
              }
            }
          }
        }
      }

      // Update order subtotal if adding to existing order
      if (isExistingOrder) {
        const { data: allItems } = await supabase
          .from("lab_ops_order_items")
          .select("qty, unit_price")
          .eq("order_id", orderId);
        
        const newSubtotal = (allItems || []).reduce((sum: number, i: any) => sum + (i.unit_price * i.qty), 0);
        
        await supabase
          .from("lab_ops_orders")
          .update({ subtotal: newSubtotal, total_amount: newSubtotal })
          .eq("id", orderId);
      }

      // Update table status
      await supabase
        .from("lab_ops_tables")
        .update({ status: "seated" as const })
        .eq("id", selectedTable.id);

      toast({ 
        title: isExistingOrder ? "Items added to existing order!" : "Order sent!", 
        description: isExistingOrder 
          ? `Added ${orderItems.length} item(s) to ${selectedTable.name}'s open bill`
          : `Order sent to kitchen/bar for ${selectedTable.name}` 
      });
      setOrderItems([]);
      setSelectedTable(null);
      setCovers(2);
      if (outlet) fetchOpenOrders(outlet.id);
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
                      <span className="font-medium">{formatPrice(item.unit_price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.lab_ops_order_items?.reduce((sum: number, i: any) => sum + (i.unit_price * i.qty), 0) || 0)}</span>
                  </div>
                </div>

                {/* Print Pre-Check Button - only for open orders */}
                {selectedOrder.status !== "closed" && (
                  <div className="border-t pt-3">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
                      onClick={() => handlePrecheckPrint(selectedOrder)}
                    >
                      <Printer className="w-5 h-5 mr-2" />
                      Pre Check
                    </Button>
                  </div>
                )}

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
                                {formatPrice(order.lab_ops_order_items?.reduce((sum: number, i: any) => sum + (i.unit_price * i.qty), 0) || 0)}
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
                          <p className="text-lg font-bold text-primary">{formatPrice(avgOrderValue)}</p>
                        </div>
                        <div className="bg-card rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Per Cover</p>
                          <p className="text-lg font-bold text-green-500">{formatPrice(avgPerCover)}</p>
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
                              <span className="text-sm font-semibold">{formatPrice(cashTotal)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{cashOrders.length} cash</p>
                          </div>
                          <div className="w-px bg-border" />
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <CreditCard className="w-3 h-3 text-blue-500" />
                              <span className="text-sm font-semibold">{formatPrice(cardTotal)}</span>
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
                          <p className="text-sm font-bold text-primary">{formatPrice(topTable[1])}</p>
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
                                <p className="font-bold text-lg">{formatPrice(order.total_amount || 0)}</p>
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={navigateToKDS}
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{staff.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{outlet.name}</p>
          </div>
          {/* Quick access to Bar KDS */}
          <Button
            variant="ghost"
            size="sm"
            onClick={navigateToKDS}
            className="ml-2 bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 h-7 text-xs"
          >
            <Wine className="h-3.5 w-3.5 mr-1" />
            KDS
          </Button>
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
            {/* Filter tables: managers see all, others see only their assigned tables */}
            {tables
              .filter(table => {
                // Managers see all tables
                if (staff?.role === "manager") return true;
                // Non-managers only see tables assigned to them
                return table.assigned_staff_id === staff?.id;
              })
              .map(table => {
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
                <div key={table.id} className="relative">
                  <Button
                    variant="outline"
                    className={`h-24 w-full flex flex-col py-2 px-2 transition-all rounded-xl ${getTableStyle()}`}
                    onClick={() => setSelectedTable(table)}
                    disabled={isClosed}
                  >
                    {/* Large readable table number */}
                    <span className="font-black text-2xl leading-none">
                      {table.table_number || table.name?.replace(/[^0-9]/g, '') || '?'}
                    </span>
                    {/* Capacity/guest count */}
                    <div className="flex items-center gap-1 mt-0.5 opacity-80">
                      <Users className="w-3 h-3" />
                      <span className="text-xs font-medium">{table.capacity}</span>
                    </div>
                    {/* Assigned staff name - always show if assigned */}
                    {table.assigned_staff_name && (
                      <span className="text-[10px] font-medium bg-white/20 px-1.5 py-0.5 rounded mt-0.5 truncate max-w-full">
                        {table.assigned_staff_name.split(' ')[0]}
                      </span>
                    )}
                    {/* Bill amount for occupied tables */}
                    {isOccupied && billTotal > 0 && (
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 bg-black/30 px-2 py-0.5 rounded">
                        <DollarSign className="w-3 h-3" />
                        <span className="text-xs font-bold">{billTotal.toFixed(0)}</span>
                      </div>
                    )}
                  </Button>
                  {/* Assign button - only for managers */}
                  {staff?.role === "manager" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignDialog(table);
                      }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                      title="Assign staff"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {/* Empty state for non-managers with no assigned tables */}
            {staff?.role !== "manager" && tables.filter(t => t.assigned_staff_id === staff?.id).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No tables assigned to you</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Ask your manager to assign tables</p>
              </div>
            )}
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
                  {formatPrice(orderTotal)}
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
                    // Priority: calculated_servings (recipe-based) > inventory_stock > remaining_serves
                    const displayStock = item.calculated_servings !== null && item.calculated_servings !== undefined
                      ? item.calculated_servings
                      : item.inventory_stock !== null 
                        ? item.inventory_stock 
                        : item.remaining_serves;
                    const hasStock = displayStock !== null;
                    const isLowStock = hasStock && displayStock !== null && displayStock <= 5;
                    const isOutOfStock = hasStock && displayStock === 0;
                    return (
                      <Button
                        key={item.id}
                        variant="outline"
                        className={`h-14 flex flex-col items-start justify-between p-1.5 transition-all relative ${
                          isOutOfStock
                            ? 'bg-muted/50 border-muted text-muted-foreground opacity-60 cursor-not-allowed'
                            : isInOrder 
                              ? 'bg-amber-500/90 border-amber-400 text-amber-950 hover:bg-amber-400' 
                              : 'bg-card hover:bg-muted'
                        }`}
                        onClick={() => !isOutOfStock && addToOrder(item)}
                        disabled={isOutOfStock}
                      >
                        <span className={`text-[11px] font-medium text-left line-clamp-1 leading-tight ${isInOrder ? 'text-amber-950' : ''}`}>
                          {item.name}
                        </span>
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-xs font-semibold ${isInOrder ? 'text-amber-800' : 'text-primary'}`}>
                            {formatPrice(item.base_price)}
                          </span>
                          {hasStock && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isOutOfStock 
                                ? 'bg-red-500/20 text-red-400' 
                                : isLowStock 
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : isInOrder
                                    ? 'bg-amber-800/30 text-amber-900'
                                    : 'bg-green-500/20 text-green-400'
                            }`}>
                              {isOutOfStock ? 'OUT' : displayStock}
                            </span>
                          )}
                        </div>
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
                            <p className="text-xs text-muted-foreground">{formatPrice(item.price * item.qty)}</p>
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
                  <span>{formatPrice(orderTotal)}</span>
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
      {/* Hidden print area for system printing */}
      {quickPrintJob && (
        <div className="pointer-events-none absolute -left-[10000px] top-0" aria-hidden>
          <div data-pos-print-area>
            <KOTPreview order={quickPrintJob.order} type={quickPrintJob.type} />
          </div>
        </div>
      )}

      {/* Print Dialog */}
      <PrintDialog 
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        order={orderToPrint}
        defaultType={defaultPrintType}
        onPrintComplete={() => setPrintDialogOpen(false)}
      />
    </div>
  );
}
