import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import LabOpsAnalytics from "@/components/lab-ops/LabOpsAnalytics";
import LabOpsOnboarding from "@/components/lab-ops/LabOpsOnboarding";
import LiveOpsDashboard from "@/components/lab-ops/LiveOpsDashboard";
import TeamPresenceIndicator from "@/components/lab-ops/TeamPresenceIndicator";
import InviteLabOpsStaffDialog from "@/components/lab-ops/InviteLabOpsStaffDialog";
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
  PlusCircle, MinusCircle, UserPlus, Shield, Activity, History,
  Database, Loader2, Sparkles, HelpCircle, GripVertical
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
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onlineTeam, setOnlineTeam] = useState<{ id: string; name: string; username?: string; email?: string; role: string }[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ full_name?: string; username?: string } | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  // Setup presence tracking for the selected outlet
  useEffect(() => {
    if (!selectedOutlet || !user) return;

    const channelName = `lab-ops-presence:${selectedOutlet.id}`;
    
    // Cleanup previous channel
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase.channel(channelName);
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: { id: string; name: string; username?: string; email?: string; role: string }[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id !== user.id) {
              users.push({
                id: presence.user_id,
                name: presence.name || 'Team Member',
                username: presence.username,
                email: presence.email,
                role: presence.role || 'staff'
              });
            }
          });
        });
        setOnlineTeam(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Get user profile for full name and username
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .single();
          
          setCurrentUserProfile(profile);
          
          await channel.track({
            user_id: user.id,
            name: profile?.full_name || profile?.username || user.email?.split('@')[0] || 'User',
            username: profile?.username,
            email: user.email,
            role: 'manager',
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [selectedOutlet?.id, user]);

  const loadDemoData = async () => {
    if (!user || !selectedOutlet) return;
    setLoadingDemo(true);
    
    try {
      const outletId = selectedOutlet.id;
      
      // 1. Create Demo Categories
      const categories = [
        { outlet_id: outletId, name: "Cocktails", sort_order: 1 },
        { outlet_id: outletId, name: "Wines", sort_order: 2 },
        { outlet_id: outletId, name: "Beers", sort_order: 3 },
        { outlet_id: outletId, name: "Spirits", sort_order: 4 },
        { outlet_id: outletId, name: "Appetizers", sort_order: 5 },
        { outlet_id: outletId, name: "Main Courses", sort_order: 6 },
        { outlet_id: outletId, name: "Desserts", sort_order: 7 },
        { outlet_id: outletId, name: "Soft Drinks", sort_order: 8 },
      ];
      const { data: catData } = await supabase.from("lab_ops_categories").insert(categories).select();
      
      // 2. Create Demo Menu Items
      const getCatId = (name: string) => catData?.find(c => c.name === name)?.id;
      const menuItems = [
        { outlet_id: outletId, category_id: getCatId("Cocktails"), name: "Old Fashioned", base_price: 14 },
        { outlet_id: outletId, category_id: getCatId("Cocktails"), name: "Margarita", base_price: 12 },
        { outlet_id: outletId, category_id: getCatId("Cocktails"), name: "Mojito", base_price: 13 },
        { outlet_id: outletId, category_id: getCatId("Cocktails"), name: "Espresso Martini", base_price: 15 },
        { outlet_id: outletId, category_id: getCatId("Cocktails"), name: "Negroni", base_price: 14 },
        { outlet_id: outletId, category_id: getCatId("Wines"), name: "House Red", base_price: 9 },
        { outlet_id: outletId, category_id: getCatId("Wines"), name: "House White", base_price: 9 },
        { outlet_id: outletId, category_id: getCatId("Wines"), name: "Champagne Glass", base_price: 18 },
        { outlet_id: outletId, category_id: getCatId("Beers"), name: "Draft Lager", base_price: 7 },
        { outlet_id: outletId, category_id: getCatId("Beers"), name: "IPA", base_price: 8 },
        { outlet_id: outletId, category_id: getCatId("Beers"), name: "Stout", base_price: 8 },
        { outlet_id: outletId, category_id: getCatId("Appetizers"), name: "Bruschetta", base_price: 10 },
        { outlet_id: outletId, category_id: getCatId("Appetizers"), name: "Calamari", base_price: 14 },
        { outlet_id: outletId, category_id: getCatId("Appetizers"), name: "Oysters (6pc)", base_price: 24 },
        { outlet_id: outletId, category_id: getCatId("Main Courses"), name: "Grilled Salmon", base_price: 28 },
        { outlet_id: outletId, category_id: getCatId("Main Courses"), name: "Ribeye Steak", base_price: 42 },
        { outlet_id: outletId, category_id: getCatId("Main Courses"), name: "Pasta Carbonara", base_price: 22 },
        { outlet_id: outletId, category_id: getCatId("Desserts"), name: "Tiramisu", base_price: 12 },
        { outlet_id: outletId, category_id: getCatId("Desserts"), name: "Chocolate Fondant", base_price: 14 },
        { outlet_id: outletId, category_id: getCatId("Soft Drinks"), name: "Coca-Cola", base_price: 4 },
        { outlet_id: outletId, category_id: getCatId("Soft Drinks"), name: "Fresh OJ", base_price: 6 },
      ];
      await supabase.from("lab_ops_menu_items").insert(menuItems);
      
      // 3. Create Demo Tables
      const tables = [
        { outlet_id: outletId, name: "Table 1", capacity: 2 },
        { outlet_id: outletId, name: "Table 2", capacity: 2 },
        { outlet_id: outletId, name: "Table 3", capacity: 4 },
        { outlet_id: outletId, name: "Table 4", capacity: 4 },
        { outlet_id: outletId, name: "Table 5", capacity: 6 },
        { outlet_id: outletId, name: "Bar Seat 1", capacity: 1 },
        { outlet_id: outletId, name: "Bar Seat 2", capacity: 1 },
        { outlet_id: outletId, name: "VIP Booth", capacity: 8 },
      ];
      await supabase.from("lab_ops_tables").insert(tables);
      
      // 4. Create Demo Inventory Items
      const invItems = [
        { outlet_id: outletId, name: "Bourbon Whiskey", sku: "BRB001", base_unit: "ml", par_level: 3000 },
        { outlet_id: outletId, name: "Vodka Premium", sku: "VOD001", base_unit: "ml", par_level: 5000 },
        { outlet_id: outletId, name: "Tequila Blanco", sku: "TEQ001", base_unit: "ml", par_level: 2000 },
        { outlet_id: outletId, name: "Gin London Dry", sku: "GIN001", base_unit: "ml", par_level: 3000 },
        { outlet_id: outletId, name: "Rum White", sku: "RUM001", base_unit: "ml", par_level: 2000 },
        { outlet_id: outletId, name: "Campari", sku: "CAM001", base_unit: "ml", par_level: 1500 },
        { outlet_id: outletId, name: "Sweet Vermouth", sku: "VER001", base_unit: "ml", par_level: 1000 },
        { outlet_id: outletId, name: "Triple Sec", sku: "TRI001", base_unit: "ml", par_level: 1500 },
        { outlet_id: outletId, name: "Coffee Liqueur", sku: "COF001", base_unit: "ml", par_level: 1500 },
        { outlet_id: outletId, name: "Fresh Lime Juice", sku: "LIM001", base_unit: "ml", par_level: 2000 },
        { outlet_id: outletId, name: "Simple Syrup", sku: "SYR001", base_unit: "ml", par_level: 3000 },
        { outlet_id: outletId, name: "Fresh Mint", sku: "MNT001", base_unit: "bunch", par_level: 10 },
        { outlet_id: outletId, name: "Angostura Bitters", sku: "BIT001", base_unit: "ml", par_level: 500 },
        { outlet_id: outletId, name: "Salmon Fillet", sku: "SAL001", base_unit: "kg", par_level: 5 },
        { outlet_id: outletId, name: "Ribeye Steak", sku: "RIB001", base_unit: "kg", par_level: 8 },
        { outlet_id: outletId, name: "Pasta Spaghetti", sku: "PAS001", base_unit: "kg", par_level: 10 },
        { outlet_id: outletId, name: "Parmesan Cheese", sku: "PAR001", base_unit: "kg", par_level: 3 },
        { outlet_id: outletId, name: "Heavy Cream", sku: "CRM001", base_unit: "ltr", par_level: 5 },
        { outlet_id: outletId, name: "Espresso Coffee", sku: "ESP001", base_unit: "kg", par_level: 2 },
      ];
      const { data: invData } = await supabase.from("lab_ops_inventory_items").insert(invItems).select();
      
      // 5. Create Demo Suppliers
      const suppliers = [
        { outlet_id: outletId, name: "Premium Spirits Co", contact_name: "John Smith", email: "john@premiumspirits.com", phone: "+1-555-0101" },
        { outlet_id: outletId, name: "Fresh Produce Direct", contact_name: "Sarah Johnson", email: "sarah@freshproduce.com", phone: "+1-555-0102" },
        { outlet_id: outletId, name: "Quality Meats Ltd", contact_name: "Mike Brown", email: "mike@qualitymeats.com", phone: "+1-555-0103" },
        { outlet_id: outletId, name: "Wine Imports Inc", contact_name: "Lisa Davis", email: "lisa@wineimports.com", phone: "+1-555-0104" },
        { outlet_id: outletId, name: "Dairy Fresh Co", contact_name: "Tom Wilson", email: "tom@dairyfresh.com", phone: "+1-555-0105" },
      ];
      await supabase.from("lab_ops_suppliers").insert(suppliers);
      
      // 6. Create Demo Modifiers
      const modifiers = [
        { outlet_id: outletId, name: "Extra Shot", price: 2, modifier_type: "add_on" },
        { outlet_id: outletId, name: "Less Ice", price: 0, modifier_type: "preparation" },
        { outlet_id: outletId, name: "No Ice", price: 0, modifier_type: "preparation" },
        { outlet_id: outletId, name: "Double", price: 6, modifier_type: "size" },
        { outlet_id: outletId, name: "Gluten Free", price: 3, modifier_type: "dietary" },
        { outlet_id: outletId, name: "Vegan", price: 0, modifier_type: "dietary" },
        { outlet_id: outletId, name: "Extra Sauce", price: 1, modifier_type: "add_on" },
        { outlet_id: outletId, name: "Medium Rare", price: 0, modifier_type: "preparation" },
        { outlet_id: outletId, name: "Well Done", price: 0, modifier_type: "preparation" },
      ];
      await supabase.from("lab_ops_modifiers").insert(modifiers);
      
      // 7. Create Demo Staff
      const { data: authData } = await supabase.auth.getUser();
      const staffMembers = [
        { outlet_id: outletId, user_id: authData?.user?.id || "", full_name: "Alex Manager", role: "manager" as const, pin_code: "1234" },
        { outlet_id: outletId, user_id: authData?.user?.id || "", full_name: "Sam Bartender", role: "bartender" as const, pin_code: "2345" },
        { outlet_id: outletId, user_id: authData?.user?.id || "", full_name: "Jordan Waiter", role: "waiter" as const, pin_code: "3456" },
        { outlet_id: outletId, user_id: authData?.user?.id || "", full_name: "Casey Chef", role: "kitchen" as const, pin_code: "4567" },
      ];
      await supabase.from("lab_ops_staff").insert(staffMembers);
      
      // 8. Create Demo Void Reasons
      const voidReasons = [
        { outlet_id: outletId, code: "CUSTOMER_CHANGED_MIND", description: "Customer changed their mind" },
        { outlet_id: outletId, code: "WRONG_ORDER", description: "Wrong order entered" },
        { outlet_id: outletId, code: "QUALITY_ISSUE", description: "Quality issue with item" },
        { outlet_id: outletId, code: "SYSTEM_ERROR", description: "System or POS error" },
        { outlet_id: outletId, code: "COMP", description: "Complimentary item" },
      ];
      await supabase.from("lab_ops_void_reasons").insert(voidReasons);
      
      // 9. Create Demo Recipes
      const recipes = [
        { outlet_id: outletId, name: "Old Fashioned", menu_item_id: null, portion_cost: 3.50, selling_price: 14, instructions: "Muddle sugar and bitters, add bourbon, stir with ice, strain, garnish with orange peel" },
        { outlet_id: outletId, name: "Margarita", menu_item_id: null, portion_cost: 2.80, selling_price: 12, instructions: "Shake tequila, triple sec, lime juice with ice, strain into salt-rimmed glass" },
        { outlet_id: outletId, name: "Negroni", menu_item_id: null, portion_cost: 4.20, selling_price: 14, instructions: "Stir gin, campari, sweet vermouth with ice, strain into rocks glass, garnish with orange" },
      ];
      const { data: recipeData } = await supabase.from("lab_ops_recipes").insert(recipes).select();
      
      // 10. Add Recipe Ingredients
      if (recipeData && invData) {
        const getInvId = (name: string) => invData.find(i => i.name === name)?.id;
        const recipeIngredients = [
          { recipe_id: recipeData[0]?.id, inventory_item_id: getInvId("Bourbon Whiskey"), qty: 60, unit: "ml" },
          { recipe_id: recipeData[0]?.id, inventory_item_id: getInvId("Simple Syrup"), qty: 10, unit: "ml" },
          { recipe_id: recipeData[0]?.id, inventory_item_id: getInvId("Angostura Bitters"), qty: 2, unit: "dash" },
          { recipe_id: recipeData[1]?.id, inventory_item_id: getInvId("Tequila Blanco"), qty: 50, unit: "ml" },
          { recipe_id: recipeData[1]?.id, inventory_item_id: getInvId("Triple Sec"), qty: 25, unit: "ml" },
          { recipe_id: recipeData[1]?.id, inventory_item_id: getInvId("Fresh Lime Juice"), qty: 25, unit: "ml" },
          { recipe_id: recipeData[2]?.id, inventory_item_id: getInvId("Gin London Dry"), qty: 30, unit: "ml" },
          { recipe_id: recipeData[2]?.id, inventory_item_id: getInvId("Campari"), qty: 30, unit: "ml" },
          { recipe_id: recipeData[2]?.id, inventory_item_id: getInvId("Sweet Vermouth"), qty: 30, unit: "ml" },
        ].filter(ri => ri.recipe_id && ri.inventory_item_id);
        await supabase.from("lab_ops_recipe_ingredients").insert(recipeIngredients);
      }
      
      toast({ title: "Demo data loaded!", description: "Categories, menu items, inventory, suppliers, staff, and recipes created." });
    } catch (error: any) {
      console.error("Demo data error:", error);
      toast({ title: "Error loading demo data", description: error.message, variant: "destructive" });
    } finally {
      setLoadingDemo(false);
    }
  };

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
      <LabOpsOnboarding open={showOnboarding} onOpenChange={setShowOnboarding} />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-4 max-w-7xl">
        {/* Header - Mobile Optimized with proper spacing from TopNav */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shrink-0">
              <ChefHat className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">LAB Ops</h1>
              <p className="text-muted-foreground text-xs">Restaurant & Bar Management</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => window.location.href = '/staff-pos'}
              className="h-9 px-2 sm:px-3 bg-primary"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Staff POS</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = '/bar-kds'}
              className="h-9 px-2 sm:px-3 border-amber-500 text-amber-600 hover:bg-amber-500/10"
            >
              <Wine className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Bar</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.href = '/kitchen-kds'}
              className="h-9 px-2 sm:px-3 border-orange-500 text-orange-600 hover:bg-orange-500/10"
            >
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Kitchen</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOnboarding(true)}
              className="h-9 px-2 sm:px-3"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Guide</span>
            </Button>
            
            {selectedOutlet && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadDemoData} 
                disabled={loadingDemo}
                className="border-primary/50 text-primary hover:bg-primary/10 h-9 px-2 sm:px-3"
              >
                {loadingDemo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-1">Demo</span>
              </Button>
            )}
            
            {selectedOutlet && (
              <TeamPresenceIndicator
                onlineTeam={onlineTeam}
                outletName={selectedOutlet.name}
                currentStaffName={currentUserProfile?.full_name || user?.email?.split('@')[0] || 'You'}
                currentStaffUsername={currentUserProfile?.username}
                currentStaffEmail={user?.email}
              />
            )}
            
            {outlets.length > 0 && (
              <Select
                value={selectedOutlet?.id}
                onValueChange={(value) => {
                  const outlet = outlets.find(o => o.id === value);
                  if (outlet) setSelectedOutlet(outlet);
                }}
              >
                <SelectTrigger className="w-32 sm:w-44 h-9">
                  <Store className="h-4 w-4 mr-1 shrink-0" />
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
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
                <Button size="sm" className="h-9 px-2 sm:px-3">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
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
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={newOutletAddress}
                      onChange={(e) => setNewOutletAddress(e.target.value)}
                      placeholder="123 Main Street"
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={newOutletType} onValueChange={setNewOutletType}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="cafe">Cafe</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createOutlet} className="w-full h-12" disabled={!newOutletName.trim()}>
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
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Store className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center">No Outlets Yet</h3>
              <p className="text-muted-foreground text-center text-sm mb-6 max-w-md">
                Create your first outlet to start managing orders, inventory, and staff.
              </p>
              <Button onClick={() => setShowCreateOutlet(true)} size="lg" className="h-12">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Outlet
              </Button>
            </CardContent>
          </Card>
        ) : selectedOutlet && (
          <Tabs defaultValue="pos" className="space-y-4">
            {/* Mobile-friendly horizontal scrolling tabs */}
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted/50 rounded-xl w-max min-w-full sm:min-w-0">
                <TabsTrigger value="pos" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Smartphone className="h-5 w-5" />
                  <span className="text-xs font-medium">POS</span>
                </TabsTrigger>
                <TabsTrigger value="kds" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <ChefHat className="h-5 w-5" />
                  <span className="text-xs font-medium">KDS</span>
                </TabsTrigger>
                <TabsTrigger value="menu" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <UtensilsCrossed className="h-5 w-5" />
                  <span className="text-xs font-medium">Menu</span>
                </TabsTrigger>
                <TabsTrigger value="inventory" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-medium">Stock</span>
                </TabsTrigger>
                <TabsTrigger value="purchasing" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Truck className="h-5 w-5" />
                  <span className="text-xs font-medium">Orders</span>
                </TabsTrigger>
                <TabsTrigger value="recipes" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Wine className="h-5 w-5" />
                  <span className="text-xs font-medium">Recipe</span>
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Users className="h-5 w-5" />
                  <span className="text-xs font-medium">Staff</span>
                </TabsTrigger>
                <TabsTrigger value="live" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Activity className="h-5 w-5" />
                  <span className="text-xs font-medium">Live</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs font-medium">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-col sm:flex-row gap-1 py-2.5 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm min-w-[70px]">
                  <Settings className="h-5 w-5" />
                  <span className="text-xs font-medium">Setup</span>
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

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
              <StaffModule outletId={selectedOutlet.id} outletName={selectedOutlet.name} />
            </TabsContent>

            <TabsContent value="live">
              <LiveOpsDashboard outletId={selectedOutlet.id} outletName={selectedOutlet.name} />
            </TabsContent>

            <TabsContent value="reports">
              <LabOpsAnalytics outletId={selectedOutlet.id} />
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
    let orderId = currentOrder?.id;
    
    // If no current order, create one first
    if (!orderId) {
      const { data: userData } = await supabase.auth.getUser();
      const { data: newOrder, error: orderError } = await supabase
        .from("lab_ops_orders")
        .insert({
          outlet_id: outletId,
          table_id: selectedTable.id,
          order_type: "dine-in",
          status: "open",
          staff_id: userData?.user?.id,
        })
        .select()
        .single();

      if (orderError || !newOrder) {
        toast({ title: "Failed to create order", variant: "destructive" });
        return;
      }

      orderId = newOrder.id;
      setCurrentOrder(newOrder);
      await supabase
        .from("lab_ops_tables")
        .update({ status: "seated" })
        .eq("id", selectedTable.id);
      fetchTables();
    }

    const modifierPrice = modifierIds.reduce((sum, id) => {
      const mod = modifiers.find(m => m.id === id);
      return sum + (mod?.price || 0);
    }, 0);

    const { data, error } = await supabase
      .from("lab_ops_order_items")
      .insert({
        order_id: orderId,
        menu_item_id: menuItem.id,
        unit_price: menuItem.base_price + modifierPrice,
        qty: 1,
        status: "pending",
        note: note || null,
        modifiers: modifierIds.length > 0 ? modifierIds : null,
      })
      .select("*, lab_ops_menu_items(name)")
      .single();

    if (error) {
      console.error("Error adding item:", error);
      toast({ title: "Failed to add item", description: error.message, variant: "destructive" });
      return;
    }

    if (data) {
      const newItems = [...orderItems, data];
      setOrderItems(newItems);
      updateOrderTotals(newItems);
      toast({ title: `Added ${menuItem.name}` });
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
    <div className="space-y-4">
      {/* Mobile-first layout with stacked cards on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tables - Collapsible on mobile when table is selected */}
        <Card className={`${selectedTable ? 'hidden md:block' : ''}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                  <Store className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No tables configured</p>
                <p className="text-xs text-muted-foreground mt-1">Add tables in Settings</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-3 gap-2">
                {tables.map((table) => (
                  <Button
                    key={table.id}
                    variant={selectedTable?.id === table.id ? "default" : "outline"}
                    className={`h-14 sm:h-16 flex-col p-1 ${
                      table.status === "seated" ? "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20" :
                      table.status === "bill_requested" ? "border-red-500 bg-red-500/10 hover:bg-red-500/20" :
                      ""
                    }`}
                    onClick={() => selectTable(table)}
                  >
                    <span className="font-semibold text-xs sm:text-sm truncate w-full text-center">{table.name}</span>
                    <span className="text-[10px] sm:text-xs opacity-70">{table.capacity}p</span>
                  </Button>
                ))}
              </div>
            )}
            
            {/* Open Orders */}
            {orders.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Open Orders ({orders.length})</p>
                <ScrollArea className="h-32">
                  {orders.map((order) => (
                    <Button
                      key={order.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-10 mb-1"
                      onClick={() => selectTable(tables.find(t => t.id === order.table_id))}
                    >
                      <span className="font-medium">{order.lab_ops_tables?.name}</span>
                      <Badge variant={order.status === "sent" ? "default" : "outline"} className="text-xs">
                        {order.status}
                      </Badge>
                    </Button>
                  ))}
                </ScrollArea>
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
      </div>

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
        lab_ops_orders!inner(table_id, covers, outlet_id, lab_ops_tables(name))
      `)
      .eq("lab_ops_orders.outlet_id", outletId)
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
        lab_ops_orders!inner(table_id, outlet_id, lab_ops_tables(name))
      `)
      .eq("lab_ops_orders.outlet_id", outletId)
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
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggedCategory, setDraggedCategory] = useState<any>(null);
  
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

  // Drag and drop for menu items
  const handleItemDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleItemDrop = (e: React.DragEvent, targetItem: any) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const newItems = [...menuItems];
    const draggedIndex = newItems.findIndex(i => i.id === draggedItem.id);
    const targetIndex = newItems.findIndex(i => i.id === targetItem.id);
    
    // Reorder items
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setMenuItems(newItems);
    setDraggedItem(null);
    toast({ title: "Menu order updated" });
  };

  // Drag and drop for categories
  const handleCategoryDragStart = (e: React.DragEvent, cat: any) => {
    setDraggedCategory(cat);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleCategoryDrop = async (e: React.DragEvent, targetCat: any) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCat.id) return;

    const newCats = [...categories];
    const draggedIndex = newCats.findIndex(c => c.id === draggedCategory.id);
    const targetIndex = newCats.findIndex(c => c.id === targetCat.id);
    
    const [removed] = newCats.splice(draggedIndex, 1);
    newCats.splice(targetIndex, 0, removed);

    const updates = newCats.map((cat, index) => ({
      id: cat.id,
      sort_order: index,
    }));

    setCategories(newCats);
    setDraggedCategory(null);

    for (const update of updates) {
      await supabase
        .from("lab_ops_categories")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }
    toast({ title: "Category order updated" });
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
function StaffModule({ outletId, outletName }: { outletId: string; outletName: string }) {
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
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
      .order("full_name");
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
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowInviteDialog(true)}
          >
            <Users className="h-4 w-4 mr-1" />
            Invite
          </Button>
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
        </div>

        <InviteLabOpsStaffDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          outletId={outletId}
          outletName={outletName}
          onStaffAdded={fetchStaff}
        />
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
              <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${member.is_active ? "bg-primary/10" : "bg-muted"}`}>
                    <Users className={`h-5 w-5 ${member.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{member.full_name || 'Unknown'}</p>
                      <Badge variant={member.is_active ? "default" : "secondary"} className="shrink-0">
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Staff'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
                <Input value={editingStaff.full_name || ''} onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })} />
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
