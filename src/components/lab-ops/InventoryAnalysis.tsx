import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Package, TrendingUp, TrendingDown, DollarSign, BarChart3,
  Search, Edit, Calculator, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InventoryAnalysisProps {
  outletId: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  base_unit: string;
  par_level: number;
  unit_cost: number;
  sale_price: number;
  tax_rate: number;
  vat_rate: number;
}

interface MovementSummary {
  item_id: string;
  received_qty: number;
  received_cost: number;
  sold_qty: number;
  sold_revenue: number;
}

interface AnalysisItem extends InventoryItem {
  current_stock: number;
  received_qty: number;
  received_cost: number;
  cost_per_item: number;
  sold_qty: number;
  sold_revenue: number;
  sale_price_before_tax: number;
  profit_per_item: number;
  total_profit: number;
  par_from_receiving: number;
  par_from_sales: number;
  par_difference: number;
}

export function InventoryAnalysis({ outletId }: InventoryAnalysisProps) {
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [movementSummary, setMovementSummary] = useState<MovementSummary[]>([]);
  const [poLatestUnitPrice, setPoLatestUnitPrice] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [analysisTab, setAnalysisTab] = useState("overview");

  useEffect(() => {
    if (outletId) {
      fetchData();
    }
  }, [outletId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch inventory items
      const { data: itemsData } = await supabase
        .from("lab_ops_inventory_items")
        .select("*")
        .eq("outlet_id", outletId)
        .eq("is_active", true);

      // Fetch stock levels
      const { data: levelsData } = await supabase
        .from("lab_ops_stock_levels")
        .select("inventory_item_id, quantity");

      // Fetch movements for summary
      const { data: movementsData } = await supabase
        .from("lab_ops_stock_movements")
        .select("inventory_item_id, movement_type, qty, unit_cost, sale_price")
        .in("inventory_item_id", (itemsData || []).map(i => i.id));

      // Fetch latest PO received unit prices (used as fallback cost when inventory items/movements have 0)
      const { data: poPrices } = await supabase
        .from("purchase_order_received_items")
        .select("item_name, unit_price, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      const latestMap: Record<string, number> = {};
      (poPrices || []).forEach((r: any) => {
        const name = String(r.item_name || "").trim();
        if (!name) return;
        if (latestMap[name] == null) latestMap[name] = Number(r.unit_price || 0);
      });
      setPoLatestUnitPrice(latestMap);

      setItems(itemsData || []);

      // Calculate stock levels per item
      const levels: Record<string, number> = {};
      (levelsData || []).forEach((sl) => {
        levels[sl.inventory_item_id] = (levels[sl.inventory_item_id] || 0) + Number(sl.quantity || 0);
      });
      setStockLevels(levels);

      // Calculate movement summaries
      const summaryMap: Record<string, MovementSummary> = {};
      (movementsData || []).forEach((mov) => {
        if (!summaryMap[mov.inventory_item_id]) {
          summaryMap[mov.inventory_item_id] = {
            item_id: mov.inventory_item_id,
            received_qty: 0,
            received_cost: 0,
            sold_qty: 0,
            sold_revenue: 0,
          };
        }
        const summary = summaryMap[mov.inventory_item_id];
        if (mov.movement_type === "purchase") {
          summary.received_qty += Number(mov.qty || 0);
          summary.received_cost += Number(mov.qty || 0) * Number(mov.unit_cost || 0);
        } else if (mov.movement_type === "sale") {
          summary.sold_qty += Math.abs(Number(mov.qty || 0));
          summary.sold_revenue += Math.abs(Number(mov.qty || 0)) * Number(mov.sale_price || 0);
        }
      });
      setMovementSummary(Object.values(summaryMap));
    } catch (error) {
      console.error("Error fetching inventory analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const analysisData: AnalysisItem[] = useMemo(() => {
    return items.map((item) => {
      const summary = movementSummary.find((s) => s.item_id === item.id) || {
        received_qty: 0,
        received_cost: 0,
        sold_qty: 0,
        sold_revenue: 0,
      };

      const current_stock = stockLevels[item.id] || 0;

      // Cost per item: prefer item.unit_cost, otherwise fallback to latest PO received unit price
      const poCost = poLatestUnitPrice[item.name] || 0;
      const cost_per_item = Number(item.unit_cost || 0) > 0 ? Number(item.unit_cost) : Number(poCost);

      // Sale price is the menu item selling price - calculate without VAT/tax
      const sale_price = Number(item.sale_price || 0);
      const tax_rate = Number(item.tax_rate || 0);
      const vat_rate = Number(item.vat_rate || 0);
      const total_tax = tax_rate + vat_rate;

      // Selling price without VAT/tax (net selling price)
      const sale_price_before_tax = total_tax > 0
        ? sale_price / (1 + total_tax / 100)
        : sale_price;

      // Profit = Selling price (without VAT/tax) - Cost price
      const profit_per_item = sale_price_before_tax - cost_per_item;
      const total_profit = profit_per_item * summary.sold_qty;

      // Par level calculations
      const par_from_receiving = summary.received_qty > 0 ? Math.ceil(summary.received_qty / 7) : 0;
      const par_from_sales = summary.sold_qty > 0 ? Math.ceil((summary.sold_qty / 7) * 1.2) : 0;
      const par_difference = par_from_receiving - par_from_sales;

      return {
        ...item,
        current_stock,
        received_qty: summary.received_qty,
        received_cost: summary.received_cost,
        cost_per_item,
        sold_qty: summary.sold_qty,
        sold_revenue: summary.sold_revenue,
        sale_price_before_tax,
        profit_per_item,
        total_profit,
        par_from_receiving,
        par_from_sales,
        par_difference,
      };
    });
  }, [items, stockLevels, movementSummary]);

  const filteredData = useMemo(() => {
    if (!search) return analysisData;
    return analysisData.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [analysisData, search]);

  // Summary calculations
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => ({
        received_qty: acc.received_qty + item.received_qty,
        received_cost: acc.received_cost + item.received_cost,
        sold_qty: acc.sold_qty + item.sold_qty,
        sold_revenue: acc.sold_revenue + item.sold_revenue,
        total_profit: acc.total_profit + item.total_profit,
        items_count: acc.items_count + 1,
      }),
      { received_qty: 0, received_cost: 0, sold_qty: 0, sold_revenue: 0, total_profit: 0, items_count: 0 }
    );
  }, [filteredData]);

  const averages = useMemo(() => {
    const count = filteredData.length || 1;
    return {
      avg_cost: totals.received_cost / (totals.received_qty || 1),
      avg_sale_price: totals.sold_revenue / (totals.sold_qty || 1),
      avg_profit_per_item: totals.total_profit / (totals.sold_qty || 1),
      avg_margin: totals.sold_revenue > 0 
        ? ((totals.sold_revenue - totals.received_cost) / totals.sold_revenue) * 100 
        : 0,
    };
  }, [totals, filteredData]);

  const updateItemPricing = async () => {
    if (!editingItem) return;
    try {
      await supabase
        .from("lab_ops_inventory_items")
        .update({
          unit_cost: editingItem.unit_cost,
          sale_price: editingItem.sale_price,
          tax_rate: editingItem.tax_rate,
          vat_rate: editingItem.vat_rate,
        })
        .eq("id", editingItem.id);

      toast({ title: "Pricing updated successfully" });
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error updating pricing", description: error.message, variant: "destructive" });
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Analysis Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Summary
    doc.setFontSize(12);
    doc.text("Summary", 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Items: ${totals.items_count}`, 14, 48);
    doc.text(`Total Received: ${totals.received_qty} units | ${formatPrice(totals.received_cost)}`, 14, 54);
    doc.text(`Total Sold: ${totals.sold_qty} units | ${formatPrice(totals.sold_revenue)}`, 14, 60);
    doc.text(`Total Profit: ${formatPrice(totals.total_profit)}`, 14, 66);
    doc.text(`Avg Margin: ${averages.avg_margin.toFixed(1)}%`, 14, 72);

    // Table
    autoTable(doc, {
      startY: 85,
      head: [["Item", "Received", "Cost/Unit", "Sold", "Sale Price", "Profit/Unit", "Total Profit"]],
      body: filteredData.map((item) => [
        item.name,
        item.received_qty.toString(),
        formatPrice(item.cost_per_item),
        item.sold_qty.toString(),
        formatPrice(item.sale_price),
        formatPrice(item.profit_per_item),
        formatPrice(item.total_profit),
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`inventory-analysis-${new Date().toISOString().split("T")[0]}.pdf`);
    toast({ title: "Report exported" });
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading analysis...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards - Mobile optimized */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Received</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{totals.received_qty}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{formatPrice(totals.received_cost)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Sold</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{totals.sold_qty}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{formatPrice(totals.sold_revenue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Profit</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{formatPrice(totals.total_profit)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{averages.avg_margin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <Calculator className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Avg Profit/Item</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold">{formatPrice(averages.avg_profit_per_item)}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Cost: {formatPrice(averages.avg_cost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Export - Mobile optimized */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={exportPDF} variant="outline" size="sm" className="w-full sm:w-auto">
          <BarChart3 className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Analysis Tabs - Mobile optimized */}
      <Tabs value={analysisTab} onValueChange={setAnalysisTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs sm:text-sm py-2">Cost & Pricing</TabsTrigger>
          <TabsTrigger value="par" className="text-xs sm:text-sm py-2">Par Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Mobile card layout */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                Inventory Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Mobile: Card layout */}
              <div className="block sm:hidden space-y-3 max-h-[400px] overflow-y-auto">
                {filteredData.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 border">
                    <p className="font-medium text-sm mb-2">{item.name}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Stock</p>
                        <p className="font-semibold">{item.current_stock}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Received</p>
                        <p className="font-semibold text-blue-500">+{item.received_qty}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Sold</p>
                        <p className="font-semibold text-green-500">{item.sold_qty}</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t text-xs">
                      <div>
                        <span className="text-muted-foreground">Revenue: </span>
                        <span>{formatPrice(item.sold_revenue)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Profit: </span>
                        <span className={`font-semibold ${item.total_profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPrice(item.total_profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table layout */}
              <ScrollArea className="hidden sm:block h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.current_stock}</TableCell>
                        <TableCell className="text-right text-blue-500">+{item.received_qty}</TableCell>
                        <TableCell className="text-right text-green-500">{item.sold_qty}</TableCell>
                        <TableCell className="text-right">{formatPrice(item.sold_revenue)}</TableCell>
                        <TableCell className={`text-right font-semibold ${item.total_profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPrice(item.total_profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost & Pricing Tab - Mobile optimized */}
        <TabsContent value="pricing" className="mt-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                Cost & Pricing Analysis
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Cost price vs selling price (without VAT/tax)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Mobile: Card layout */}
              <div className="block sm:hidden space-y-3 max-h-[400px] overflow-y-auto">
                {filteredData.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tax: {item.tax_rate}% | VAT: {item.vat_rate}%
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingItem(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                        <p className="text-muted-foreground">Cost Price</p>
                        <p className="font-semibold text-red-400">{formatPrice(item.cost_per_item)}</p>
                      </div>
                      <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                        <p className="text-muted-foreground">Sell (Net)</p>
                        <p className="font-semibold text-green-400">{formatPrice(item.sale_price_before_tax)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t text-xs">
                      <span className="text-muted-foreground">Gross: {formatPrice(item.sale_price)}</span>
                      <div>
                        <span className="text-muted-foreground">Profit: </span>
                        <span className={`font-bold ${item.profit_per_item >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPrice(item.profit_per_item)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table layout */}
              <ScrollArea className="hidden sm:block h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Sell (Gross)</TableHead>
                      <TableHead className="text-right">Sell (Net)</TableHead>
                      <TableHead className="text-right">Profit/Unit</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Tax: {item.tax_rate}% | VAT: {item.vat_rate}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-red-400">{formatPrice(item.cost_per_item)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatPrice(item.sale_price)}</TableCell>
                        <TableCell className="text-right text-green-400">{formatPrice(item.sale_price_before_tax)}</TableCell>
                        <TableCell className={`text-right font-semibold ${item.profit_per_item >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {formatPrice(item.profit_per_item)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" onClick={() => setEditingItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Par Analysis Tab - Mobile optimized */}
        <TabsContent value="par" className="mt-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Par Level Analysis
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Compare par levels based on receiving vs sales patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Mobile: Card layout */}
              <div className="block sm:hidden space-y-3 max-h-[400px] overflow-y-auto">
                {filteredData.map((item) => {
                  const status = item.par_difference > 2 ? "over" : item.par_difference < -2 ? "under" : "balanced";
                  return (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{item.name}</p>
                        <Badge
                          variant={status === "balanced" ? "default" : status === "over" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {status === "over" && <TrendingUp className="h-3 w-3 mr-1" />}
                          {status === "under" && <TrendingDown className="h-3 w-3 mr-1" />}
                          {status === "balanced" && <Minus className="h-3 w-3 mr-1" />}
                          {status === "over" ? "Over" : status === "under" ? "Under" : "OK"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-semibold">{item.par_level}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Receiving</p>
                          <p className="font-semibold text-blue-500">{item.par_from_receiving}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sales</p>
                          <p className="font-semibold text-green-500">{item.par_from_sales}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Diff</p>
                          <p className={`font-semibold ${item.par_difference > 0 ? "text-blue-500" : item.par_difference < 0 ? "text-amber-500" : ""}`}>
                            {item.par_difference > 0 ? "+" : ""}{item.par_difference}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop: Table layout */}
              <ScrollArea className="hidden sm:block h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Current Par</TableHead>
                      <TableHead className="text-right">Par (Receiving)</TableHead>
                      <TableHead className="text-right">Par (Sales)</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => {
                      const status = item.par_difference > 2 ? "over" : item.par_difference < -2 ? "under" : "balanced";
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right font-semibold">{item.par_level}</TableCell>
                          <TableCell className="text-right text-blue-500">{item.par_from_receiving}</TableCell>
                          <TableCell className="text-right text-green-500">{item.par_from_sales}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold ${item.par_difference > 0 ? "text-blue-500" : item.par_difference < 0 ? "text-amber-500" : ""}`}>
                              {item.par_difference > 0 ? "+" : ""}{item.par_difference}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={status === "balanced" ? "default" : status === "over" ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {status === "over" && <TrendingUp className="h-3 w-3 mr-1" />}
                              {status === "under" && <TrendingDown className="h-3 w-3 mr-1" />}
                              {status === "balanced" && <Minus className="h-3 w-3 mr-1" />}
                              {status === "over" ? "Over-stocked" : status === "under" ? "Under-stocked" : "Balanced"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Par Summary - Mobile optimized */}
          <Card className="mt-4">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm">Par Level Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-lg sm:text-2xl font-bold text-green-500">
                    {filteredData.filter((i) => Math.abs(i.par_difference) <= 2).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Balanced</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-lg sm:text-2xl font-bold text-blue-500">
                    {filteredData.filter((i) => i.par_difference > 2).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Over</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-lg sm:text-2xl font-bold text-amber-500">
                    {filteredData.filter((i) => i.par_difference < -2).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Under</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Pricing Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pricing: {editingItem?.name}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unit Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.unit_cost}
                    onChange={(e) => setEditingItem({ ...editingItem, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Sale Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.sale_price}
                    onChange={(e) => setEditingItem({ ...editingItem, sale_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingItem.tax_rate}
                    onChange={(e) => setEditingItem({ ...editingItem, tax_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>VAT Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingItem.vat_rate}
                    onChange={(e) => setEditingItem({ ...editingItem, vat_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Preview:</p>
                <p>Before Tax: {formatPrice(editingItem.sale_price / (1 + (editingItem.tax_rate + editingItem.vat_rate) / 100))}</p>
                <p>Profit/Unit: {formatPrice((editingItem.sale_price / (1 + (editingItem.tax_rate + editingItem.vat_rate) / 100)) - editingItem.unit_cost)}</p>
              </div>
              <Button onClick={updateItemPricing} className="w-full">
                Save Pricing
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
