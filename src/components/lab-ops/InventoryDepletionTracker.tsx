import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/contexts/CurrencyContext";
import { 
  Package, TrendingDown, TrendingUp, ShoppingCart, Droplets, 
  AlertTriangle, Search, RefreshCw, BarChart3, Minus, Equal
} from "lucide-react";
import { format } from "date-fns";

interface InventoryDepletionTrackerProps {
  outletId: string;
}

interface DepletionItem {
  id: string;
  name: string;
  sku: string | null;
  base_unit: string;
  par_level: number;
  // Quantities
  received_qty: number;
  sales_qty: number;
  pourer_qty: number;
  current_stock: number;
  // Calculated
  system_depletion: number;
  physical_depletion: number;
  variance: number;
  variance_pct: number;
}

export default function InventoryDepletionTracker({ outletId }: InventoryDepletionTrackerProps) {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<DepletionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "variance" | "low">("all");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("all"); // Default to all time

  useEffect(() => {
    if (outletId) {
      fetchDepletionData();
    }
  }, [outletId, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const fetchDepletionData = async () => {
    setIsLoading(true);
    try {
      const dateFilter = getDateFilter();
      console.log("[DepletionTracker] Fetching data for outlet:", outletId, "dateFilter:", dateFilter);

      // Fetch inventory items with stock levels
      const { data: inventoryItems, error: invError } = await supabase
        .from("lab_ops_inventory_items")
        .select(`
          id, name, sku, base_unit, par_level,
          lab_ops_stock_levels (quantity)
        `)
        .eq("outlet_id", outletId);
      
      console.log("[DepletionTracker] Inventory items:", inventoryItems?.length || 0, invError);
      
      if (invError) {
        console.error("Error fetching inventory items:", invError);
      }

      // Get inventory item IDs for this outlet to filter movements
      const inventoryItemIds = inventoryItems?.map(i => i.id) || [];

      // Fetch stock movements for received and sales - filter by inventory items in this outlet
      let movements: any[] = [];
      if (inventoryItemIds.length > 0) {
        let movementsQuery = supabase
          .from("lab_ops_stock_movements")
          .select("inventory_item_id, qty, movement_type, created_at")
          .in("inventory_item_id", inventoryItemIds)
          .in("movement_type", ["purchase", "sale", "adjustment"]);
        
        if (dateFilter) {
          movementsQuery = movementsQuery.gte("created_at", dateFilter);
        }

        const { data, error: movError } = await movementsQuery;
        if (movError) {
          console.error("Error fetching movements:", movError);
        }
        movements = data || [];
      }

      // Fetch pourer readings (ml_dispensed is the column name)
      let pourerQuery = supabase
        .from("lab_ops_pourer_readings")
        .select("bottle_id, ml_dispensed, created_at")
        .eq("outlet_id", outletId);
      
      if (dateFilter) {
        pourerQuery = pourerQuery.gte("created_at", dateFilter);
      }

      const { data: pourerReadings } = await pourerQuery;

      // Fetch bottle to inventory mapping (item_id links to items table, not inventory)
      const { data: bottles } = await supabase
        .from("lab_ops_bottles")
        .select("id, item_id, bottle_name")
        .eq("outlet_id", outletId);

      // Create bottle to item name map for matching
      const bottleToItemName = new Map(
        bottles?.map(b => [b.id, b.bottle_name]) || []
      );

      // Aggregate data
      const depletionMap = new Map<string, DepletionItem>();

      inventoryItems?.forEach(item => {
        const stockLevels = (item.lab_ops_stock_levels as any[]) || [];
        const currentStock = stockLevels.reduce((sum, sl) => sum + (Number(sl.quantity) || 0), 0);

        depletionMap.set(item.id, {
          id: item.id,
          name: item.name,
          sku: item.sku,
          base_unit: item.base_unit,
          par_level: item.par_level || 0,
          received_qty: 0,
          sales_qty: 0,
          pourer_qty: 0,
          current_stock: currentStock,
          system_depletion: 0,
          physical_depletion: 0,
          variance: 0,
          variance_pct: 0,
        });
      });

      // Process movements
      movements?.forEach(mov => {
        const item = depletionMap.get(mov.inventory_item_id);
        if (!item) return;

        if (mov.movement_type === "purchase") {
          item.received_qty += Math.abs(mov.qty || 0);
        } else if (mov.movement_type === "sale") {
          item.sales_qty += Math.abs(mov.qty || 0);
        }
      });

      // Process pourer readings - match by bottle name to inventory item name
      pourerReadings?.forEach(reading => {
        const bottleName = bottleToItemName.get(reading.bottle_id);
        if (!bottleName) return;

        // Find matching inventory item by name (case insensitive)
        const matchingItem = Array.from(depletionMap.values()).find(
          item => item.name.toLowerCase().includes(bottleName.toLowerCase()) ||
                  bottleName.toLowerCase().includes(item.name.toLowerCase())
        );
        
        if (matchingItem) {
          matchingItem.pourer_qty += reading.ml_dispensed || 0;
        }
      });

      // Calculate variance
      depletionMap.forEach(item => {
        item.system_depletion = item.sales_qty;
        item.physical_depletion = item.pourer_qty;
        item.variance = item.physical_depletion - item.system_depletion;
        item.variance_pct = item.system_depletion > 0 
          ? (item.variance / item.system_depletion) * 100 
          : 0;
      });

      const finalItems = Array.from(depletionMap.values());
      console.log("[DepletionTracker] Final items:", finalItems.length, finalItems);
      setItems(finalItems);
    } catch (error) {
      console.error("Error fetching depletion data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filterStatus === "variance" && Math.abs(item.variance_pct) < 5) {
        return false;
      }
      if (filterStatus === "low" && item.current_stock >= item.par_level) {
        return false;
      }
      return true;
    });
  }, [items, searchTerm, filterStatus]);

  const summaryStats = useMemo(() => {
    const totalReceived = items.reduce((sum, i) => sum + i.received_qty, 0);
    const totalSales = items.reduce((sum, i) => sum + i.sales_qty, 0);
    const totalPourer = items.reduce((sum, i) => sum + i.pourer_qty, 0);
    const totalVariance = totalPourer - totalSales;
    const itemsWithVariance = items.filter(i => Math.abs(i.variance_pct) > 5).length;
    const lowStockItems = items.filter(i => i.current_stock < i.par_level).length;

    return { totalReceived, totalSales, totalPourer, totalVariance, itemsWithVariance, lowStockItems };
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Received</span>
            </div>
            <p className="text-lg font-bold text-green-500 mt-1">+{summaryStats.totalReceived.toFixed(1)}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">System Sales</span>
            </div>
            <p className="text-lg font-bold text-blue-500 mt-1">{summaryStats.totalSales.toFixed(1)}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Physical Pour</span>
            </div>
            <p className="text-lg font-bold text-purple-500 mt-1">{summaryStats.totalPourer.toFixed(1)}</p>
          </CardContent>
        </Card>

        <Card className={`${summaryStats.totalVariance > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Variance</span>
            </div>
            <p className={`text-lg font-bold mt-1 ${summaryStats.totalVariance > 0 ? 'text-red-500' : 'text-amber-500'}`}>
              {summaryStats.totalVariance > 0 ? '+' : ''}{summaryStats.totalVariance.toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="flex gap-2 flex-wrap">
        {summaryStats.itemsWithVariance > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {summaryStats.itemsWithVariance} items with variance
          </Badge>
        )}
        {summaryStats.lowStockItems > 0 && (
          <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-500">
            <TrendingDown className="h-3 w-3" />
            {summaryStats.lowStockItems} low stock
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="variance">With Variance</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchDepletionData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Items List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items match your filters</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const hasVariance = Math.abs(item.variance_pct) > 5;
              const isLowStock = item.current_stock < item.par_level;

              return (
                <Card 
                  key={item.id} 
                  className={`p-3 ${hasVariance ? 'border-red-500/50 bg-red-500/5' : isLowStock ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{item.name}</p>
                        {hasVariance && (
                          <Badge variant="destructive" className="text-xs shrink-0">Variance</Badge>
                        )}
                        {isLowStock && (
                          <Badge variant="secondary" className="text-xs shrink-0 bg-amber-500/20 text-amber-500">Low</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.sku || 'No SKU'} • {item.base_unit} • Par: {item.par_level}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Stock: {item.current_stock.toFixed(1)}
                    </Badge>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-green-500/10 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground mb-1">Received</p>
                      <p className="font-semibold text-green-500">+{item.received_qty.toFixed(1)}</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground mb-1">Sales Qty</p>
                      <p className="font-semibold text-blue-500">{item.sales_qty.toFixed(1)}</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground mb-1">Pourer</p>
                      <p className="font-semibold text-purple-500">{item.pourer_qty.toFixed(1)}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${item.variance > 0 ? 'bg-red-500/10' : item.variance < 0 ? 'bg-green-500/10' : 'bg-muted/50'}`}>
                      <p className="text-xs text-muted-foreground mb-1">Variance</p>
                      <p className={`font-semibold ${item.variance > 0 ? 'text-red-500' : item.variance < 0 ? 'text-green-500' : ''}`}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}
                        <span className="text-xs ml-1">({item.variance_pct.toFixed(0)}%)</span>
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
