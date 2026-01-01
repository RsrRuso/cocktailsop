import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCurrency } from "@/contexts/CurrencyContext";
import { 
  FileText, Download, ChevronDown, ChevronUp, Loader2, 
  BarChart3, Package, DollarSign, TrendingUp, Percent, 
  ShoppingCart, Droplets, Calculator, RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReportBuilderProps {
  outletId: string;
  outletName?: string;
}

function normalizeName(input: string) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");
}

function namesLooselyMatch(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

// Available report fields organized by category
const REPORT_FIELDS = {
  item_info: {
    label: "Item Information",
    icon: Package,
    fields: [
      { id: "item_name", label: "Item Name", type: "text" },
      { id: "sku", label: "SKU/Code", type: "text" },
      { id: "category", label: "Category", type: "text" },
      { id: "base_unit", label: "Unit", type: "text" },
      { id: "par_level", label: "Par Level", type: "number" },
    ]
  },
  pricing: {
    label: "Pricing & Costs",
    icon: DollarSign,
    fields: [
      { id: "sale_price", label: "Sale Price", type: "currency" },
      { id: "cost_price", label: "Cost Price", type: "currency" },
      { id: "markup", label: "Markup %", type: "percent" },
      { id: "profit_margin", label: "Profit Margin", type: "currency" },
      { id: "vat_amount", label: "VAT Amount", type: "currency" },
      { id: "net_price", label: "Net Price (excl. VAT)", type: "currency" },
    ]
  },
  inventory: {
    label: "Inventory Tracking",
    icon: Package,
    fields: [
      { id: "current_stock", label: "Current Stock", type: "number" },
      { id: "received_qty", label: "Received Qty", type: "number" },
      { id: "sales_qty", label: "System Sales Qty", type: "number" },
      { id: "physical_pour", label: "Physical Pour (Pourer)", type: "number" },
      { id: "system_depletion", label: "System Depletion", type: "number" },
    ]
  },
  variance: {
    label: "Variance Analysis",
    icon: BarChart3,
    fields: [
      { id: "variance_qty", label: "Variance Qty", type: "number" },
      { id: "variance_pct", label: "Variance %", type: "percent" },
      { id: "variance_value", label: "Variance Value", type: "currency" },
    ]
  },
  performance: {
    label: "Menu Engineering",
    icon: TrendingUp,
    fields: [
      { id: "total_revenue", label: "Total Revenue", type: "currency" },
      { id: "total_profit", label: "Total Profit", type: "currency" },
      { id: "qty_sold", label: "Quantity Sold", type: "number" },
      { id: "food_cost_pct", label: "Food Cost %", type: "percent" },
      { id: "contribution_margin", label: "Contribution Margin", type: "currency" },
      { id: "popularity_rank", label: "Popularity Rank", type: "number" },
      { id: "profitability_rank", label: "Profitability Rank", type: "number" },
      { id: "menu_engineering_class", label: "Menu Engineering Class", type: "text" },
    ]
  },
};

// Predefined report templates
const REPORT_TEMPLATES = [
  {
    id: "variance_report",
    name: "Variance Report",
    description: "Physical pour vs system depletion",
    fields: ["item_name", "physical_pour", "system_depletion", "variance_qty", "variance_pct", "variance_value"]
  },
  {
    id: "cost_analysis",
    name: "Cost Analysis",
    description: "Pricing, costs, and margins",
    fields: ["item_name", "sale_price", "cost_price", "markup", "profit_margin", "vat_amount"]
  },
  {
    id: "menu_engineering",
    name: "Menu Engineering",
    description: "Item performance and classification",
    fields: ["item_name", "category", "qty_sold", "total_revenue", "food_cost_pct", "contribution_margin", "menu_engineering_class"]
  },
  {
    id: "stock_status",
    name: "Stock Status",
    description: "Current inventory levels",
    fields: ["item_name", "sku", "current_stock", "par_level", "received_qty", "sales_qty"]
  },
  {
    id: "profit_margins",
    name: "Profit Margins",
    description: "Profitability analysis",
    fields: ["item_name", "sale_price", "cost_price", "profit_margin", "food_cost_pct", "total_profit", "profitability_rank"]
  },
];

export default function ReportBuilder({ outletId }: ReportBuilderProps) {
  const { formatPrice, currency } = useCurrency();
  const [selectedFields, setSelectedFields] = useState<string[]>(["item_name"]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["item_info"]);
  const [reportName, setReportName] = useState("Custom Report");
  const [vatRate, setVatRate] = useState("5");

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const applyTemplate = (template: typeof REPORT_TEMPLATES[0]) => {
    setSelectedFields(template.fields);
    setReportName(template.name);
    toast({ title: `Applied "${template.name}" template` });
  };

  const generateReport = async () => {
    if (selectedFields.length === 0) {
      toast({ title: "Select at least one field", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      if (!outletId) {
        console.warn("generateReport: No outletId provided");
        toast({ title: "No outlet selected", variant: "destructive" });
        setIsGenerating(false);
        return;
      }
      
      // Fetch inventory items first to get IDs for filtering
      const inventoryRes = await supabase
        .from("lab_ops_inventory_items")
        .select(`
          id, name, sku, base_unit, par_level,
          lab_ops_stock_levels (quantity)
        `)
        .eq("outlet_id", outletId);
      
      console.log("ReportBuilder: fetched", inventoryRes.data?.length || 0, "items for outlet", outletId);
      if (inventoryRes.error) {
        console.error("ReportBuilder inventory error:", inventoryRes.error);
      }
      
      const inventoryItemIds = (inventoryRes.data || []).map(i => i.id);

      // Fetch remaining data in parallel
      const [movementsRes, menuItemsRes, ordersRes, salesRes, pourerRes] = await Promise.all([
        inventoryItemIds.length > 0 
          ? supabase
              .from("lab_ops_stock_movements")
              .select("inventory_item_id, qty, movement_type")
              .in("inventory_item_id", inventoryItemIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("lab_ops_menu_items")
          .select("id, name, base_price, category_id, inventory_item_id")
          .eq("outlet_id", outletId),
        supabase
          .from("lab_ops_orders")
          .select("id, total_amount")
          .eq("outlet_id", outletId)
          .eq("status", "closed"),
        supabase
          .from("lab_ops_sales")
          .select("item_name, quantity")
          .eq("outlet_id", outletId),
        supabase
          .from("lab_ops_pourer_readings")
          .select("bottle_id, ml_dispensed")
          .eq("outlet_id", outletId),
      ]);

      const vatMultiplier = parseFloat(vatRate) / 100;

      // Process inventory items
      const items = (inventoryRes.data || []).map(item => {
        const stockLevels = (item.lab_ops_stock_levels as any[]) || [];
        const currentStock = stockLevels.reduce((sum, sl) => sum + (Number(sl.quantity) || 0), 0);

        // Get movement data
        const itemMovements = (movementsRes.data || []).filter((m: any) => m.inventory_item_id === item.id);
        const receivedQty = itemMovements
          .filter((m: any) => m.movement_type === "purchase")
          .reduce((sum: number, m: any) => sum + Math.abs(m.qty || 0), 0);

        const salesQtyFromMovements = itemMovements
          .filter((m: any) => m.movement_type === "sale")
          .reduce((sum: number, m: any) => sum + Math.abs(m.qty || 0), 0);

        const salesQtyFromSales = (salesRes.data || []).reduce((sum: number, s: any) => {
          if (!s?.item_name) return sum;
          return namesLooselyMatch(s.item_name, item.name)
            ? sum + (Number(s.quantity) || 0)
            : sum;
        }, 0);

        // Prefer sales table (servings/units), but fall back to movement sales if needed (e.g., spirits fractional)
        const salesQty = Math.max(salesQtyFromSales, salesQtyFromMovements);

        // Find linked menu item for pricing
        const menuItem = (menuItemsRes.data || []).find((m: any) => m.inventory_item_id === item.id);
        const salePrice = menuItem?.base_price || 0;
        
        // Estimate cost (you'd want to pull from cost table in real implementation)
        const costPrice = salePrice * 0.3; // Example: 30% food cost
        const markup = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;
        const profitMargin = salePrice - costPrice;
        const vatAmount = salePrice * vatMultiplier;
        const netPrice = salePrice - vatAmount;
        const foodCostPct = salePrice > 0 ? (costPrice / salePrice) * 100 : 0;

        // Calculate physical pour (mock - would need real pourer mapping)
        const physicalPour = salesQty * 1.05; // Mock: 5% overpour
        const varianceQty = physicalPour - salesQty;
        const variancePct = salesQty > 0 ? (varianceQty / salesQty) * 100 : 0;
        const varianceValue = varianceQty * costPrice;

        // Menu engineering classification
        const qtySold = salesQty;
        const totalRevenue = qtySold * salePrice;
        const totalProfit = qtySold * profitMargin;
        const contributionMargin = profitMargin;

        return {
          item_name: item.name,
          sku: item.sku || "N/A",
          category: "Uncategorized",
          base_unit: item.base_unit,
          par_level: item.par_level || 0,
          sale_price: salePrice,
          cost_price: costPrice,
          markup: markup,
          profit_margin: profitMargin,
          vat_amount: vatAmount,
          net_price: netPrice,
          current_stock: currentStock,
          received_qty: receivedQty,
          sales_qty: salesQty,
          physical_pour: physicalPour,
          system_depletion: salesQty,
          variance_qty: varianceQty,
          variance_pct: variancePct,
          variance_value: varianceValue,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          qty_sold: qtySold,
          food_cost_pct: foodCostPct,
          contribution_margin: contributionMargin,
          popularity_rank: 0,
          profitability_rank: 0,
          menu_engineering_class: "TBD",
        };
      });

      // Sort and assign ranks
      const byQty = [...items].sort((a, b) => b.qty_sold - a.qty_sold);
      const byProfit = [...items].sort((a, b) => b.contribution_margin - a.contribution_margin);
      
      items.forEach(item => {
        item.popularity_rank = byQty.findIndex(i => i.item_name === item.item_name) + 1;
        item.profitability_rank = byProfit.findIndex(i => i.item_name === item.item_name) + 1;
        
        // Menu engineering classification
        const avgQty = items.reduce((s, i) => s + i.qty_sold, 0) / items.length;
        const avgMargin = items.reduce((s, i) => s + i.contribution_margin, 0) / items.length;
        const highPop = item.qty_sold >= avgQty;
        const highProfit = item.contribution_margin >= avgMargin;
        
        if (highPop && highProfit) item.menu_engineering_class = "Star ⭐";
        else if (highPop && !highProfit) item.menu_engineering_class = "Plowhouse 🐴";
        else if (!highPop && highProfit) item.menu_engineering_class = "Puzzle 🧩";
        else item.menu_engineering_class = "Dog 🐕";
      });

      setReportData(items);
      toast({ title: `Report generated with ${items.length} items` });
    } catch (error: any) {
      console.error("Report generation error:", error);
      toast({ title: "Error generating report", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = () => {
    if (reportData.length === 0) return;

    const headers = selectedFields.join(",");
    const rows = reportData.map(item => 
      selectedFields.map(field => {
        const value = item[field];
        if (typeof value === "number") return value.toFixed(2);
        return `"${value || ''}"`;
      }).join(",")
    );

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded" });
  };

  const formatValue = (value: any, fieldId: string) => {
    const fieldDef = Object.values(REPORT_FIELDS)
      .flatMap(cat => cat.fields)
      .find(f => f.id === fieldId);

    if (!fieldDef) return value;

    switch (fieldDef.type) {
      case "currency":
        return formatPrice(value || 0);
      case "percent":
        return `${(value || 0).toFixed(1)}%`;
      case "number":
        return (value || 0).toFixed(2);
      default:
        return value || "N/A";
    }
  };

  return (
    <div className="space-y-4">
      {/* Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {REPORT_TEMPLATES.map(template => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
                className="text-xs"
              >
                {template.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Field Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Select Report Fields
            </span>
            <Badge variant="secondary">{selectedFields.length} selected</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(REPORT_FIELDS).map(([categoryId, category]) => {
            const Icon = category.icon;
            const isExpanded = expandedCategories.includes(categoryId);
            const selectedInCategory = category.fields.filter(f => selectedFields.includes(f.id)).length;

            return (
              <Collapsible key={categoryId} open={isExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto"
                    onClick={() => toggleCategory(categoryId)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium">{category.label}</span>
                      {selectedInCategory > 0 && (
                        <Badge variant="secondary" className="text-xs">{selectedInCategory}</Badge>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pr-2 py-2">
                  <div className="grid grid-cols-2 gap-2">
                    {category.fields.map(field => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={() => toggleField(field.id)}
                        />
                        <label
                          htmlFor={field.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground mb-1 block">Report Name</Label>
          <Input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="Report name..."
          />
        </div>
        <div className="w-24">
          <Label className="text-xs text-muted-foreground mb-1 block">VAT %</Label>
          <Input
            type="number"
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={generateReport} disabled={isGenerating || selectedFields.length === 0} className="flex-1">
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
          Generate Report
        </Button>
        <Button variant="outline" onClick={downloadCSV} disabled={reportData.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      {/* Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{reportName}</span>
              <Badge>{reportData.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {reportData.map((item, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {selectedFields.map(fieldId => {
                        const fieldDef = Object.values(REPORT_FIELDS)
                          .flatMap(cat => cat.fields)
                          .find(f => f.id === fieldId);
                        
                        return (
                          <div key={fieldId}>
                            <p className="text-xs text-muted-foreground">{fieldDef?.label || fieldId}</p>
                            <p className="font-medium">{formatValue(item[fieldId], fieldId)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
