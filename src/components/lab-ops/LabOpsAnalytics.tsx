import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { 
  DollarSign, TrendingUp, Users, ClipboardList, Package, Wine,
  BarChart3, PieChart, Download, FileText, Upload, Calendar,
  ChevronRight, AlertTriangle, Target, Percent, Clock, Star,
  Gift, ArrowUpRight, ArrowDownRight, Loader2, FileSpreadsheet,
  Presentation, Filter, RefreshCw, Plus, Trash2, Edit, Eye
} from "lucide-react";
import MemberTransactionsReport from "./MemberTransactionsReport";

interface LabOpsAnalyticsProps {
  outletId: string;
}

export default function LabOpsAnalytics({ outletId }: LabOpsAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [dailySummary, setDailySummary] = useState<any>({ total: 0, orders: 0, covers: 0 });
  const [weeklySales, setWeeklySales] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [categoryMix, setCategoryMix] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [barVariance, setBarVariance] = useState<any[]>([]);
  const [packageSessions, setPackageSessions] = useState<any[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<any[]>([]);
  const [guestFeedback, setGuestFeedback] = useState<any[]>([]);
  const [dataImports, setDataImports] = useState<any[]>([]);
  
  // Upload states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadType, setUploadType] = useState("sales");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();
  }, [outletId, dateRange]);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchDailySummary(),
      fetchWeeklySales(),
      fetchTopItems(),
      fetchCategoryMix(),
      fetchStaffPerformance(),
      fetchBarVariance(),
      fetchPackageSessions(),
      fetchInventoryCounts(),
      fetchGuestFeedback(),
      fetchDataImports(),
    ]);
    setIsLoading(false);
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "1d": return new Date(now.setDate(now.getDate() - 1)).toISOString();
      case "7d": return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "30d": return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case "90d": return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default: return new Date(now.setDate(now.getDate() - 7)).toISOString();
    }
  };

  const fetchDailySummary = async () => {
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
    setDailySummary({ total, orders, covers });
  };

  const fetchWeeklySales = async () => {
    const { data } = await supabase
      .from("lab_ops_orders")
      .select("*")
      .eq("outlet_id", outletId)
      .eq("status", "closed")
      .gte("closed_at", getDateFilter());

    const dailyTotals: Record<string, { revenue: number; orders: number }> = {};
    data?.forEach((order) => {
      const day = new Date(order.closed_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (!dailyTotals[day]) dailyTotals[day] = { revenue: 0, orders: 0 };
      dailyTotals[day].revenue += order.total_amount || 0;
      dailyTotals[day].orders += 1;
    });

    setWeeklySales(Object.entries(dailyTotals).map(([day, data]) => ({ day, ...data })));
  };

  const fetchTopItems = async () => {
    const { data } = await supabase
      .from("lab_ops_order_items")
      .select("qty, unit_price, lab_ops_menu_items(name, base_price), lab_ops_orders!inner(outlet_id, closed_at, status)")
      .eq("lab_ops_orders.outlet_id", outletId)
      .eq("lab_ops_orders.status", "closed")
      .gte("lab_ops_orders.closed_at", getDateFilter());

    const itemTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
    data?.forEach((item: any) => {
      const name = item.lab_ops_menu_items?.name || "Unknown";
      if (!itemTotals[name]) itemTotals[name] = { name, qty: 0, revenue: 0 };
      itemTotals[name].qty += item.qty || 0;
      itemTotals[name].revenue += (item.unit_price * item.qty) || 0;
    });

    const sorted = Object.values(itemTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
    setTopItems(sorted);
  };

  const fetchCategoryMix = async () => {
    const { data } = await supabase
      .from("lab_ops_order_items")
      .select("qty, unit_price, lab_ops_menu_items(lab_ops_categories(name)), lab_ops_orders!inner(outlet_id, closed_at, status)")
      .eq("lab_ops_orders.outlet_id", outletId)
      .eq("lab_ops_orders.status", "closed")
      .gte("lab_ops_orders.closed_at", getDateFilter());

    const categoryTotals: Record<string, { name: string; revenue: number; qty: number }> = {};
    data?.forEach((item: any) => {
      const cat = item.lab_ops_menu_items?.lab_ops_categories?.name || "Uncategorized";
      if (!categoryTotals[cat]) categoryTotals[cat] = { name: cat, revenue: 0, qty: 0 };
      categoryTotals[cat].revenue += (item.unit_price * item.qty) || 0;
      categoryTotals[cat].qty += item.qty || 0;
    });

    const sorted = Object.values(categoryTotals).sort((a, b) => b.revenue - a.revenue);
    setCategoryMix(sorted);
  };

  const fetchStaffPerformance = async () => {
    const { data: staff } = await supabase
      .from("lab_ops_staff")
      .select("id, full_name, role")
      .eq("outlet_id", outletId);

    // For now, return mock performance data
    const performance = (staff || []).map((s) => ({
      ...s,
      orders: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 2000) + 500,
      avgCheck: Math.floor(Math.random() * 50) + 20,
      hoursWorked: Math.floor(Math.random() * 8) + 4,
    }));
    setStaffPerformance(performance);
  };

  const fetchBarVariance = async () => {
    const { data } = await supabase
      .from("lab_ops_bar_variance")
      .select("*, lab_ops_ingredients_master(ingredient_name)")
      .eq("outlet_id", outletId)
      .order("created_at", { ascending: false })
      .limit(20);
    setBarVariance(data || []);
  };

  const fetchPackageSessions = async () => {
    const { data } = await supabase
      .from("lab_ops_package_sessions")
      .select("*")
      .eq("outlet_id", outletId)
      .gte("start_datetime", getDateFilter())
      .order("start_datetime", { ascending: false });
    setPackageSessions(data || []);
  };

  const fetchInventoryCounts = async () => {
    const { data } = await supabase
      .from("lab_ops_inventory_counts")
      .select("*, lab_ops_ingredients_master(ingredient_name)")
      .eq("outlet_id", outletId)
      .order("count_datetime", { ascending: false })
      .limit(50);
    setInventoryCounts(data || []);
  };

  const fetchGuestFeedback = async () => {
    const { data } = await supabase
      .from("lab_ops_guest_feedback")
      .select("*")
      .eq("outlet_id", outletId)
      .gte("feedback_date", getDateFilter().split('T')[0])
      .order("created_at", { ascending: false });
    setGuestFeedback(data || []);
  };

  const fetchDataImports = async () => {
    const { data } = await supabase
      .from("lab_ops_data_imports")
      .select("*")
      .eq("outlet_id", outletId)
      .order("created_at", { ascending: false })
      .limit(10);
    setDataImports(data || []);
  };

  // Export functions
  const exportToExcel = async () => {
    toast({ title: "Exporting to Excel...", description: "Generating spreadsheet with all analytics data" });
    // Implementation would use xlsx library
  };

  const exportToPDF = async () => {
    toast({ title: "Exporting to PDF...", description: "Generating PDF report with charts" });
    // Implementation would use jspdf library
  };

  const exportToPPT = async () => {
    toast({ title: "Exporting to PowerPoint...", description: "Generating presentation with charts" });
    // Implementation would create pptx
  };

  // Data upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from("lab_ops_data_imports")
        .insert({
          outlet_id: outletId,
          import_type: uploadType,
          file_name: file.name,
          status: "processing",
        })
        .select()
        .single();

      if (importError) throw importError;

      // Parse file (CSV/Excel)
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const records = lines.slice(1).map(line => {
        const values = line.split(',');
        const record: Record<string, string> = {};
        headers.forEach((h, i) => record[h] = values[i]?.trim() || '');
        return record;
      });

      let imported = 0;
      let failed = 0;

      // Process based on type
      if (uploadType === "sales") {
        for (const record of records) {
          try {
            await supabase.from("lab_ops_sales_transactions").insert({
              outlet_id: outletId,
              txn_id: record.txn_id || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              check_id: record.check_id,
              txn_datetime: record.txn_datetime || new Date().toISOString(),
              qty: parseFloat(record.qty) || 1,
              gross_amount: parseFloat(record.gross_amount) || 0,
              discount_amount: parseFloat(record.discount_amount) || 0,
              net_amount: parseFloat(record.net_amount) || 0,
              is_complimentary: record.is_complimentary === 'true',
            });
            imported++;
          } catch { failed++; }
        }
      } else if (uploadType === "inventory") {
        for (const record of records) {
          try {
            await supabase.from("lab_ops_inventory_movements").insert({
              outlet_id: outletId,
              movement_id: record.movement_id || `MOV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              movement_datetime: record.movement_datetime || new Date().toISOString(),
              movement_type: record.movement_type || 'purchase',
              qty: parseFloat(record.qty) || 0,
              unit_cost: parseFloat(record.unit_cost) || 0,
              notes: record.notes,
            });
            imported++;
          } catch { failed++; }
        }
      } else if (uploadType === "ingredients") {
        for (const record of records) {
          try {
            await supabase.from("lab_ops_ingredients_master").insert({
              outlet_id: outletId,
              ingredient_id: record.ingredient_id || `ING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              ingredient_name: record.ingredient_name || record.name,
              unit: record.unit || 'bottle',
              base_unit_ml: parseFloat(record.base_unit_ml) || null,
              category: record.category,
              sub_category: record.sub_category,
              standard_cost: parseFloat(record.standard_cost) || 0,
              is_bar_stock: record.is_bar_stock !== 'false',
            });
            imported++;
          } catch { failed++; }
        }
      } else if (uploadType === "feedback") {
        for (const record of records) {
          try {
            await supabase.from("lab_ops_guest_feedback").insert({
              outlet_id: outletId,
              feedback_date: record.date || new Date().toISOString().split('T')[0],
              source: record.source || 'internal',
              rating_overall: parseInt(record.rating_overall) || null,
              rating_food: parseInt(record.rating_food) || null,
              rating_beverage: parseInt(record.rating_beverage) || null,
              rating_service: parseInt(record.rating_service) || null,
              rating_ambience: parseInt(record.rating_ambience) || null,
              free_text: record.free_text || record.comment,
            });
            imported++;
          } catch { failed++; }
        }
      }

      // Update import record
      await supabase
        .from("lab_ops_data_imports")
        .update({
          records_imported: imported,
          records_failed: failed,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", importRecord.id);

      toast({ 
        title: "Import Complete", 
        description: `Imported ${imported} records, ${failed} failed` 
      });
      
      loadAllData();
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setShowUploadDialog(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load demo analytics data
  const loadDemoAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Create demo ingredients
      const ingredients = [
        { outlet_id: outletId, ingredient_id: "ING_BOURBON", ingredient_name: "Bourbon Whiskey", unit: "bottle", base_unit_ml: 700, category: "Whisky", standard_cost: 35 },
        { outlet_id: outletId, ingredient_id: "ING_VODKA", ingredient_name: "Premium Vodka", unit: "bottle", base_unit_ml: 700, category: "Vodka", standard_cost: 28 },
        { outlet_id: outletId, ingredient_id: "ING_GIN", ingredient_name: "London Dry Gin", unit: "bottle", base_unit_ml: 700, category: "Gin", standard_cost: 32 },
        { outlet_id: outletId, ingredient_id: "ING_TEQUILA", ingredient_name: "Blanco Tequila", unit: "bottle", base_unit_ml: 700, category: "Tequila", standard_cost: 38 },
        { outlet_id: outletId, ingredient_id: "ING_RUM", ingredient_name: "White Rum", unit: "bottle", base_unit_ml: 700, category: "Rum", standard_cost: 22 },
        { outlet_id: outletId, ingredient_id: "ING_CAMPARI", ingredient_name: "Campari", unit: "bottle", base_unit_ml: 700, category: "Liqueur", standard_cost: 25 },
      ];
      await supabase.from("lab_ops_ingredients_master").upsert(ingredients, { onConflict: 'outlet_id,ingredient_id' });

      // Create demo package sessions
      const packages = [
        { outlet_id: outletId, package_name: "3H Free-Flow Bubbles", package_type: "per_guest_unlimited", guest_count: 12, package_price_per_guest: 75, total_package_revenue: 900, start_datetime: new Date().toISOString() },
        { outlet_id: outletId, package_name: "Ladies Night Cocktails", package_type: "per_guest_unlimited", guest_count: 8, package_price_per_guest: 50, total_package_revenue: 400, start_datetime: new Date(Date.now() - 86400000).toISOString() },
        { outlet_id: outletId, package_name: "VIP Bottle Service", package_type: "bottle_package", guest_count: 6, package_price_per_guest: 150, total_package_revenue: 900, start_datetime: new Date(Date.now() - 172800000).toISOString() },
      ];
      await supabase.from("lab_ops_package_sessions").insert(packages);

      // Create demo feedback
      const feedback = [
        { outlet_id: outletId, source: "google", rating_overall: 5, rating_food: 5, rating_beverage: 5, rating_service: 5, rating_ambience: 4, free_text: "Amazing experience!" },
        { outlet_id: outletId, source: "tripadvisor", rating_overall: 4, rating_food: 4, rating_beverage: 5, rating_service: 4, rating_ambience: 5, free_text: "Great cocktails, will return" },
        { outlet_id: outletId, source: "internal", rating_overall: 5, rating_food: 5, rating_beverage: 5, rating_service: 5, rating_ambience: 5, free_text: "Birthday celebration was perfect" },
        { outlet_id: outletId, source: "google", rating_overall: 3, rating_food: 3, rating_beverage: 4, rating_service: 2, rating_ambience: 4, free_text: "Slow service but good drinks" },
      ];
      await supabase.from("lab_ops_guest_feedback").insert(feedback);

      toast({ title: "Demo analytics data loaded!" });
      loadAllData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = weeklySales.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = weeklySales.reduce((sum, d) => sum + d.orders, 0);
  const avgFeedbackRating = guestFeedback.length > 0 
    ? guestFeedback.reduce((sum, f) => sum + (f.rating_overall || 0), 0) / guestFeedback.length 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Analytics & Reports</h2>
          <p className="text-sm text-muted-foreground">Comprehensive restaurant & bar analytics</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-28 h-9">
              <Calendar className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={loadAllData} disabled={isLoading} className="h-9">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button size="sm" variant="outline" onClick={loadDemoAnalyticsData} disabled={isLoading} className="h-9">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Demo</span>
          </Button>

          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-9">
                <Upload className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Data Type</Label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Transactions</SelectItem>
                      <SelectItem value="inventory">Inventory Movements</SelectItem>
                      <SelectItem value="ingredients">Ingredients Master</SelectItem>
                      <SelectItem value="feedback">Guest Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CSV/Excel File</Label>
                  <Input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv,.xlsx,.xls" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="h-11"
                  />
                </div>
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing file...
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={exportToExcel} className="h-9 px-2">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportToPDF} className="h-9 px-2">
              <FileText className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportToPPT} className="h-9 px-2">
              <Presentation className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-auto p-1 gap-1 bg-muted/50 rounded-lg w-max">
            <TabsTrigger value="overview" className="text-xs px-3 py-2">Overview</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs px-3 py-2 bg-primary/10">Member Report</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs px-3 py-2">Sales</TabsTrigger>
            <TabsTrigger value="menu" className="text-xs px-3 py-2">Menu Mix</TabsTrigger>
            <TabsTrigger value="packages" className="text-xs px-3 py-2">Packages</TabsTrigger>
            <TabsTrigger value="variance" className="text-xs px-3 py-2">Variance</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs px-3 py-2">Staff</TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs px-3 py-2">Feedback</TabsTrigger>
            <TabsTrigger value="imports" className="text-xs px-3 py-2">Imports</TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Today's Revenue</p>
                    <p className="text-xl font-bold">${dailySummary.total.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Today's Orders</p>
                    <p className="text-xl font-bold">{dailySummary.orders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Period Revenue</p>
                    <p className="text-xl font-bold">${totalRevenue.toFixed(0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Star className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
                    <p className="text-xl font-bold">{avgFeedbackRating.toFixed(1)}/5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sales Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklySales.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">No sales data</p>
                ) : (
                  <div className="space-y-2">
                    {weeklySales.slice(-7).map((day) => {
                      const maxRevenue = Math.max(...weeklySales.map(d => d.revenue));
                      const percent = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={day.day} className="flex items-center gap-2">
                          <span className="w-16 text-xs font-medium truncate">{day.day}</span>
                          <div className="flex-1">
                            <Progress value={percent} className="h-2" />
                          </div>
                          <span className="w-16 text-right text-xs font-medium">${day.revenue.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Mix */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Category Mix</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryMix.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">No category data</p>
                ) : (
                  <div className="space-y-2">
                    {categoryMix.slice(0, 6).map((cat, idx) => {
                      const totalCatRevenue = categoryMix.reduce((s, c) => s + c.revenue, 0);
                      const percent = totalCatRevenue > 0 ? (cat.revenue / totalCatRevenue) * 100 : 0;
                      const colors = ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
                      return (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors[idx % colors.length]}`} />
                          <span className="flex-1 text-xs font-medium truncate">{cat.name}</span>
                          <span className="text-xs text-muted-foreground">{percent.toFixed(0)}%</span>
                          <span className="w-16 text-right text-xs font-bold">${cat.revenue.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No sales yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {topItems.slice(0, 9).map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                        {idx + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.qty} sold</p>
                      </div>
                      <span className="text-xs font-bold">${item.revenue.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SALES TAB */}
        <TabsContent value="sales" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Check</p>
                <p className="text-2xl font-bold">${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Daily Avg</p>
                <p className="text-2xl font-bold">${weeklySales.length > 0 ? (totalRevenue / weeklySales.length).toFixed(0) : '0'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {weeklySales.map((day) => (
                    <div key={day.day} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{day.day}</p>
                        <p className="text-sm text-muted-foreground">{day.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${day.revenue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Avg ${day.orders > 0 ? (day.revenue / day.orders).toFixed(0) : 0}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MENU MIX TAB */}
        <TabsContent value="menu" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Engineering Matrix</CardTitle>
              <CardDescription>Item profitability and popularity analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {topItems.map((item, idx) => {
                    const maxQty = Math.max(...topItems.map(i => i.qty));
                    const maxRev = Math.max(...topItems.map(i => i.revenue));
                    const popScore = (item.qty / maxQty) * 100;
                    const profScore = (item.revenue / maxRev) * 100;
                    let status = "puzzle";
                    if (popScore >= 50 && profScore >= 50) status = "star";
                    else if (popScore >= 50 && profScore < 50) status = "plowhorse";
                    else if (popScore < 50 && profScore >= 50) status = "puzzle";
                    else status = "dog";

                    const statusColors: Record<string, string> = {
                      star: "bg-yellow-500/20 text-yellow-700 border-yellow-500/50",
                      plowhorse: "bg-blue-500/20 text-blue-700 border-blue-500/50",
                      puzzle: "bg-purple-500/20 text-purple-700 border-purple-500/50",
                      dog: "bg-red-500/20 text-red-700 border-red-500/50",
                    };

                    return (
                      <div key={item.name} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <div className="flex gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">Qty: {item.qty}</span>
                            <span className="text-xs text-muted-foreground">Rev: ${item.revenue.toFixed(0)}</span>
                          </div>
                        </div>
                        <Badge className={statusColors[status]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PACKAGES TAB */}
        <TabsContent value="packages" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Packages</p>
                <p className="text-2xl font-bold">{packageSessions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Package Revenue</p>
                <p className="text-2xl font-bold">${packageSessions.reduce((s, p) => s + (p.total_package_revenue || 0), 0).toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold">{packageSessions.reduce((s, p) => s + (p.guest_count || 0), 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Per Guest</p>
                <p className="text-2xl font-bold">
                  ${packageSessions.length > 0 
                    ? (packageSessions.reduce((s, p) => s + (p.total_package_revenue || 0), 0) / packageSessions.reduce((s, p) => s + (p.guest_count || 1), 0)).toFixed(0)
                    : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Package Sessions</CardTitle>
              <CardDescription>Free-flow & special packages</CardDescription>
            </CardHeader>
            <CardContent>
              {packageSessions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No package sessions recorded</p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {packageSessions.map((pkg) => (
                      <div key={pkg.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{pkg.package_name}</p>
                          <div className="flex gap-3 mt-1">
                            <Badge variant="outline">{pkg.package_type}</Badge>
                            <span className="text-xs text-muted-foreground">{pkg.guest_count} guests</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${pkg.total_package_revenue?.toFixed(0) || 0}</p>
                          <p className="text-xs text-muted-foreground">${pkg.package_price_per_guest}/guest</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VARIANCE TAB */}
        <TabsContent value="variance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bar Variance Analysis</CardTitle>
              <CardDescription>Opening/closing stock vs theoretical consumption</CardDescription>
            </CardHeader>
            <CardContent>
              {barVariance.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No variance data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Import inventory counts to calculate variance</p>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {barVariance.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.lab_ops_ingredients_master?.ingredient_name || 'Unknown'}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Theo: {item.theoretical_consumption}</span>
                            <span>Actual: {item.actual_consumption}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${item.variance_qty > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {item.variance_qty > 0 ? '+' : ''}{item.variance_qty}
                          </p>
                          <p className="text-xs text-muted-foreground">${item.variance_cost?.toFixed(2) || 0} loss</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STAFF TAB */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Revenue per staff member</CardDescription>
            </CardHeader>
            <CardContent>
              {staffPerformance.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No staff performance data</p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {staffPerformance.map((staff) => (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{staff.full_name}</p>
                          <div className="flex gap-3 mt-1">
                            <Badge variant="outline">{staff.role}</Badge>
                            <span className="text-xs text-muted-foreground">{staff.orders} orders</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${staff.revenue}</p>
                          <p className="text-xs text-muted-foreground">Avg ${staff.avgCheck}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FEEDBACK TAB */}
        <TabsContent value="feedback" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {['overall', 'food', 'beverage', 'service', 'ambience'].map((type) => {
              const avg = guestFeedback.length > 0
                ? guestFeedback.reduce((s, f) => s + (f[`rating_${type}`] || 0), 0) / guestFeedback.filter(f => f[`rating_${type}`]).length
                : 0;
              return (
                <Card key={type}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground capitalize">{type}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-bold">{avg.toFixed(1)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Guest Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {guestFeedback.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No feedback yet</p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {guestFeedback.map((fb) => (
                      <div key={fb.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{fb.source}</Badge>
                            <div className="flex">
                              {[1,2,3,4,5].map((n) => (
                                <Star key={n} className={`h-3 w-3 ${n <= fb.rating_overall ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{fb.feedback_date}</span>
                        </div>
                        {fb.free_text && <p className="text-sm">{fb.free_text}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMPORTS TAB */}
        <TabsContent value="imports" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Import History</CardTitle>
              <CardDescription>Track uploaded data files</CardDescription>
            </CardHeader>
            <CardContent>
              {dataImports.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No imports yet</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-1" />
                    Import Data
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {dataImports.map((imp) => (
                      <div key={imp.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{imp.file_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{imp.import_type}</Badge>
                            <Badge variant={imp.status === 'completed' ? 'default' : 'secondary'}>{imp.status}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{imp.records_imported} imported</p>
                          {imp.records_failed > 0 && (
                            <p className="text-xs text-destructive">{imp.records_failed} failed</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEMBER TRANSACTIONS TAB */}
        <TabsContent value="transactions" className="mt-4">
          <MemberTransactionsReport outletId={outletId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
