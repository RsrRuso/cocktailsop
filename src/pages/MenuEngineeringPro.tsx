import { useState, useMemo } from "react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, FileSpreadsheet, Star, TrendingUp, TrendingDown, 
  AlertTriangle, Target, DollarSign, BarChart3, Lightbulb,
  Download, RefreshCw, Filter, Search, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, PieChart, Activity, ArrowLeft,
  Info, HelpCircle, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

// Educational tooltips for all menu engineering terms
const TOOLTIPS = {
  units: "Number of times this item was sold during the analysis period. Higher units indicate popularity.",
  revenue: "Total money earned from selling this item. Calculated as: Units Sold × Selling Price.",
  foodCostPct: "Percentage of selling price spent on ingredients. Target: 25-35%. Formula: (Food Cost ÷ Selling Price) × 100.",
  contributionMargin: "Profit earned per item after ingredient costs. Formula: Selling Price - Food Cost. Higher CM = more profitable.",
  mixPct: "This item's share of total sales volume. Formula: (Item Units ÷ Total Units) × 100. Shows relative popularity.",
  matrix: "BCG Matrix category based on profitability (CM) and popularity (Mix %). Used to determine strategic actions.",
  star: "⭐ STAR: High profit, High popularity. Your best performers! Strategy: Maintain quality, feature prominently, protect the recipe.",
  plowhorse: "🐴 PLOWHORSE: Low profit, High popularity. Customers love it but margins are thin. Strategy: Engineer recipe to reduce costs or increase price subtly.",
  puzzle: "🧩 PUZZLE: High profit, Low popularity. Hidden gems with great margins. Strategy: Increase visibility, train staff to upsell, add to specials.",
  dog: "🐕 DOG: Low profit, Low popularity. Underperformers dragging you down. Strategy: Remove from menu, complete redesign, or repurpose ingredients.",
  bcgMatrix: "The BCG Matrix (Boston Consulting Group) categorizes menu items into 4 quadrants based on profitability and popularity to guide strategic decisions.",
  avgFoodCost: "Average food cost percentage across all items. Industry benchmark: 28-35% for restaurants, 20-25% for bars.",
  avgCM: "Average contribution margin across all items. Higher averages indicate a more profitable menu overall."
};

// Action dialog state type
type ActionDialog = 'plowhorses' | 'puzzles' | 'dogs' | 'pricing' | null;

interface MenuItem {
  id: string;
  item_name: string;
  category: string;
  food_cost: number;
  selling_price: number;
  units_sold: number;
  revenue: number;
  contribution_margin: number;
  food_cost_pct: number;
  sales_mix_pct: number;
  matrix_category: 'star' | 'plowhorse' | 'puzzle' | 'dog';
  profitability_index: number;
  popularity_index: number;
}

interface AnalysisSummary {
  totalItems: number;
  totalRevenue: number;
  totalFoodCost: number;
  avgFoodCostPct: number;
  avgContributionMargin: number;
  stars: number;
  plowhorses: number;
  puzzles: number;
  dogs: number;
}

// Micros Oracle field mapping
const MICROS_FIELD_MAP: Record<string, string> = {
  'MI_NAME': 'item_name',
  'MI_SALES_TTL': 'revenue',
  'MI_QTY_SOLD': 'units_sold',
  'MI_COST': 'food_cost',
  'DAYPART_ID': 'daypart',
  'CATEGORY_ID': 'category',
  'MODIFIER_SALES': 'modifier_revenue',
  'WASTE_QTY': 'waste_units',
  'ITEM_NAME': 'item_name',
  'NET_SALES': 'revenue',
  'QTY_SOLD': 'units_sold',
  'FOOD_COST': 'food_cost',
  'SELLING_PRICE': 'selling_price',
  'CATEGORY': 'category'
};

export default function MenuEngineeringPro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("import");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [matrixFilter, setMatrixFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);

  // Helper component for educational tooltips
  const InfoTooltip = ({ content }: { content: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Calculate analysis summary (all items)
  const summary = useMemo<AnalysisSummary>(() => {
    if (menuItems.length === 0) {
      return {
        totalItems: 0, totalRevenue: 0, totalFoodCost: 0,
        avgFoodCostPct: 0, avgContributionMargin: 0,
        stars: 0, plowhorses: 0, puzzles: 0, dogs: 0
      };
    }

    const totalRevenue = menuItems.reduce((sum, i) => sum + i.revenue, 0);
    const totalFoodCost = menuItems.reduce((sum, i) => sum + (i.food_cost * i.units_sold), 0);
    const avgContributionMargin = menuItems.reduce((sum, i) => sum + i.contribution_margin, 0) / menuItems.length;

    return {
      totalItems: menuItems.length,
      totalRevenue,
      totalFoodCost,
      avgFoodCostPct: totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0,
      avgContributionMargin,
      stars: menuItems.filter(i => i.matrix_category === 'star').length,
      plowhorses: menuItems.filter(i => i.matrix_category === 'plowhorse').length,
      puzzles: menuItems.filter(i => i.matrix_category === 'puzzle').length,
      dogs: menuItems.filter(i => i.matrix_category === 'dog').length
    };
  }, [menuItems]);

  // Categorize items using BCG matrix logic
  const categorizeItem = (
    contributionMargin: number,
    salesMixPct: number,
    avgMargin: number,
    avgMixPct: number
  ): 'star' | 'plowhorse' | 'puzzle' | 'dog' => {
    const highProfit = contributionMargin >= avgMargin;
    const highPopularity = salesMixPct >= avgMixPct;

    if (highProfit && highPopularity) return 'star';
    if (!highProfit && highPopularity) return 'plowhorse';
    if (highProfit && !highPopularity) return 'puzzle';
    return 'dog';
  };

  // Parse uploaded file (CSV/Excel)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        toast.error("No data found in file");
        return;
      }

      // Map Micros Oracle fields to our schema
      const mappedData = jsonData.map((row: any) => {
        const mapped: any = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toUpperCase().replace(/\s+/g, '_');
          const targetField = MICROS_FIELD_MAP[normalizedKey] || key.toLowerCase();
          mapped[targetField] = row[key];
        });
        return mapped;
      });

      processImportedData(mappedData);
      toast.success(`Imported ${mappedData.length} items from ${file.name}`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to parse file. Please check format.");
    }
  };

  // Process and analyze imported data
  const processImportedData = (data: any[]) => {
    // Calculate totals for averages
    const totalUnits = data.reduce((sum, item) => sum + (Number(item.units_sold) || 0), 0);
    const allMargins = data.map(item => {
      const revenue = Number(item.revenue) || 0;
      const unitsSold = Number(item.units_sold) || 1;
      const foodCost = Number(item.food_cost) || 0;
      const sellingPrice = unitsSold > 0 ? revenue / unitsSold : 0;
      return sellingPrice - foodCost;
    });
    const avgMargin = allMargins.reduce((a, b) => a + b, 0) / allMargins.length;
    const avgMixPct = 100 / data.length;

    // Process each item
    const processedItems: MenuItem[] = data.map((item, index) => {
      const unitsSold = Number(item.units_sold) || 0;
      const revenue = Number(item.revenue) || 0;
      const foodCost = Number(item.food_cost) || 0;
      const sellingPrice = Number(item.selling_price) || (unitsSold > 0 ? revenue / unitsSold : 0);
      const contributionMargin = sellingPrice - foodCost;
      const salesMixPct = totalUnits > 0 ? (unitsSold / totalUnits) * 100 : 0;
      const foodCostPct = sellingPrice > 0 ? (foodCost / sellingPrice) * 100 : 0;

      return {
        id: `item-${index}`,
        item_name: item.item_name || `Item ${index + 1}`,
        category: item.category || 'Uncategorized',
        food_cost: foodCost,
        selling_price: sellingPrice,
        units_sold: unitsSold,
        revenue,
        contribution_margin: contributionMargin,
        food_cost_pct: foodCostPct,
        sales_mix_pct: salesMixPct,
        matrix_category: categorizeItem(contributionMargin, salesMixPct, avgMargin, avgMixPct),
        profitability_index: avgMargin > 0 ? (contributionMargin / avgMargin) * 100 : 0,
        popularity_index: avgMixPct > 0 ? (salesMixPct / avgMixPct) * 100 : 0
      };
    });

    setMenuItems(processedItems);
    setActiveTab("matrix");
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesMatrix = matrixFilter === "all" || item.matrix_category === matrixFilter;
      return matchesSearch && matchesCategory && matchesMatrix;
    });
  }, [menuItems, searchQuery, categoryFilter, matrixFilter]);

  // Calculate filtered summary (adjusts based on category/matrix filter)
  const filteredSummary = useMemo<AnalysisSummary>(() => {
    if (filteredItems.length === 0) {
      return {
        totalItems: 0, totalRevenue: 0, totalFoodCost: 0,
        avgFoodCostPct: 0, avgContributionMargin: 0,
        stars: 0, plowhorses: 0, puzzles: 0, dogs: 0
      };
    }

    const totalRevenue = filteredItems.reduce((sum, i) => sum + i.revenue, 0);
    const totalFoodCost = filteredItems.reduce((sum, i) => sum + (i.food_cost * i.units_sold), 0);
    const avgContributionMargin = filteredItems.reduce((sum, i) => sum + i.contribution_margin, 0) / filteredItems.length;

    return {
      totalItems: filteredItems.length,
      totalRevenue,
      totalFoodCost,
      avgFoodCostPct: totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0,
      avgContributionMargin,
      stars: filteredItems.filter(i => i.matrix_category === 'star').length,
      plowhorses: filteredItems.filter(i => i.matrix_category === 'plowhorse').length,
      puzzles: filteredItems.filter(i => i.matrix_category === 'puzzle').length,
      dogs: filteredItems.filter(i => i.matrix_category === 'dog').length
    };
  }, [filteredItems]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(menuItems.map(i => i.category))];
  }, [menuItems]);

  // Matrix category styling
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'star': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Star, label: 'Star' };
      case 'plowhorse': return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: TrendingUp, label: 'Plowhorse' };
      case 'puzzle': return { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Lightbulb, label: 'Puzzle' };
      case 'dog': return { color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle, label: 'Dog' };
      default: return { color: 'text-muted-foreground', bg: 'bg-muted', icon: Target, label: 'Unknown' };
    }
  };

  // AI Recommendations based on category
  const getRecommendation = (item: MenuItem) => {
    switch (item.matrix_category) {
      case 'star':
        return "Maintain quality & visibility. Consider premium positioning or featured placement.";
      case 'plowhorse':
        return "High volume, low margin. Consider portion engineering or ingredient substitution to improve profitability.";
      case 'puzzle':
        return "High profit, low sales. Increase visibility through better menu placement, staff upselling, or promotion.";
      case 'dog':
        return "Consider removing from menu or complete recipe overhaul. May be dragging down overall performance.";
      default:
        return "Analyze further.";
    }
  };

  // Export analysis to PDF
  const exportAnalysis = () => {
    toast.success("Exporting analysis report...");
    // Implementation would use jsPDF similar to other reports
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background pb-24">
      <TopNav />
      
      <main className="container max-w-7xl mx-auto px-4 pt-20 pb-6 space-y-4">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/ops-tools')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 truncate">
              <PieChart className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
              <span className="truncate">Menu Engineering Pro</span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm truncate">
              BCG Matrix analysis with Micros Oracle import
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {menuItems.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setMenuItems([])}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={exportAnalysis}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="matrix" disabled={menuItems.length === 0}>Matrix</TabsTrigger>
            <TabsTrigger value="analysis" disabled={menuItems.length === 0}>Analysis</TabsTrigger>
            <TabsTrigger value="insights" disabled={menuItems.length === 0}>AI Insights</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Micros Oracle Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Upload Sales Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports CSV, Excel (.xlsx, .xls) exports from Micros Oracle
                  </p>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="max-w-xs mx-auto"
                  />
                </div>

                {/* Expected Fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Expected Micros Fields</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1 text-muted-foreground">
                      <p>• MI_NAME / ITEM_NAME - Item name</p>
                      <p>• MI_QTY_SOLD / QTY_SOLD - Units sold</p>
                      <p>• MI_SALES_TTL / NET_SALES - Revenue</p>
                      <p>• MI_COST / FOOD_COST - Cost per unit</p>
                      <p>• CATEGORY_ID - Category</p>
                      <p>• DAYPART_ID - Daypart (optional)</p>
                      <p>• MODIFIER_SALES - Modifier revenue (optional)</p>
                      <p>• WASTE_QTY - Waste units (optional)</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Supported Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1 text-muted-foreground">
                      <p>• Menu Item Detail Report</p>
                      <p>• Product Mix Report</p>
                      <p>• Sales by Category Report</p>
                      <p>• Sales by Daypart Report</p>
                      <p>• Consolidated Sales Report</p>
                      <p>• Item Cost Analysis Report</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Manual Entry Option */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    Don't have Micros data? Enter items manually:
                  </p>
                  <Button variant="outline" onClick={() => {
                    // Demo data for testing
                    const demoData = [
                      { item_name: 'Margarita', units_sold: 245, revenue: 3675, food_cost: 4.20, selling_price: 15, category: 'Cocktails' },
                      { item_name: 'Old Fashioned', units_sold: 189, revenue: 3402, food_cost: 5.50, selling_price: 18, category: 'Cocktails' },
                      { item_name: 'Mojito', units_sold: 156, revenue: 2184, food_cost: 3.80, selling_price: 14, category: 'Cocktails' },
                      { item_name: 'Cosmopolitan', units_sold: 98, revenue: 1568, food_cost: 4.00, selling_price: 16, category: 'Cocktails' },
                      { item_name: 'Negroni', units_sold: 67, revenue: 1139, food_cost: 5.20, selling_price: 17, category: 'Cocktails' },
                      { item_name: 'Caesar Salad', units_sold: 312, revenue: 4680, food_cost: 3.50, selling_price: 15, category: 'Food' },
                      { item_name: 'Truffle Fries', units_sold: 178, revenue: 2136, food_cost: 4.00, selling_price: 12, category: 'Food' },
                      { item_name: 'Wagyu Slider', units_sold: 45, revenue: 1125, food_cost: 12.00, selling_price: 25, category: 'Food' },
                      { item_name: 'House Wine', units_sold: 289, revenue: 3468, food_cost: 3.00, selling_price: 12, category: 'Wine' },
                      { item_name: 'Premium Whiskey', units_sold: 34, revenue: 850, food_cost: 8.00, selling_price: 25, category: 'Spirits' },
                    ];
                    processImportedData(demoData);
                    toast.success("Demo data loaded for testing");
                  }}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Load Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matrix Tab */}
          <TabsContent value="matrix" className="space-y-6">
            {/* Educational Header */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Understanding the BCG Matrix</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The BCG (Boston Consulting Group) Matrix categorizes menu items into 4 quadrants based on 
                      <strong> Contribution Margin</strong> (profitability) and <strong>Sales Mix %</strong> (popularity). 
                      Click any category below to learn its strategy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards with Click to Filter */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card 
                className="bg-yellow-500/10 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20 transition-colors"
                onClick={() => { setMatrixFilter('star'); setActiveTab('analysis'); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">{summary.stars}</span>
                  </div>
                  <p className="text-sm font-medium">Stars ⭐</p>
                  <p className="text-xs text-yellow-600 mt-1">High profit, High popularity</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💎 Your best performers! Protect & feature prominently.
                  </p>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-blue-500/10 border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
                onClick={() => { setMatrixFilter('plowhorse'); setActiveTab('analysis'); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{summary.plowhorses}</span>
                  </div>
                  <p className="text-sm font-medium">Plowhorses 🐴</p>
                  <p className="text-xs text-blue-600 mt-1">Low profit, High popularity</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    🔧 Popular but thin margins. Engineer recipe costs.
                  </p>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-purple-500/10 border-purple-500/30 cursor-pointer hover:bg-purple-500/20 transition-colors"
                onClick={() => { setMatrixFilter('puzzle'); setActiveTab('analysis'); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{summary.puzzles}</span>
                  </div>
                  <p className="text-sm font-medium">Puzzles 🧩</p>
                  <p className="text-xs text-purple-600 mt-1">High profit, Low popularity</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📣 Hidden gems! Increase visibility & upselling.
                  </p>
                </CardContent>
              </Card>
              
              <Card 
                className="bg-red-500/10 border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
                onClick={() => { setMatrixFilter('dog'); setActiveTab('analysis'); }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold">{summary.dogs}</span>
                  </div>
                  <p className="text-sm font-medium">Dogs 🐕</p>
                  <p className="text-xs text-red-600 mt-1">Low profit, Low popularity</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Underperformers. Consider removal or overhaul.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visual Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>BCG Matrix Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 aspect-square max-w-2xl mx-auto">
                  {/* Puzzles - Top Left */}
                  <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-purple-500" />
                      <span className="font-semibold text-purple-700">Puzzles</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">High Profit, Low Sales</p>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {menuItems.filter(i => i.matrix_category === 'puzzle').slice(0, 5).map(item => (
                        <div key={item.id} className="text-xs bg-background/50 rounded px-2 py-1">
                          {item.item_name}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Stars - Top Right */}
                  <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-yellow-700">Stars</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">High Profit, High Sales</p>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {menuItems.filter(i => i.matrix_category === 'star').slice(0, 5).map(item => (
                        <div key={item.id} className="text-xs bg-background/50 rounded px-2 py-1">
                          {item.item_name}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Dogs - Bottom Left */}
                  <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="font-semibold text-red-700">Dogs</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Low Profit, Low Sales</p>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {menuItems.filter(i => i.matrix_category === 'dog').slice(0, 5).map(item => (
                        <div key={item.id} className="text-xs bg-background/50 rounded px-2 py-1">
                          {item.item_name}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Plowhorses - Bottom Right */}
                  <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold text-blue-700">Plowhorses</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Low Profit, High Sales</p>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {menuItems.filter(i => i.matrix_category === 'plowhorse').slice(0, 5).map(item => (
                        <div key={item.id} className="text-xs bg-background/50 rounded px-2 py-1">
                          {item.item_name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Axis Labels */}
                <div className="flex justify-center mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>Popularity (Sales Mix %)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={matrixFilter} onValueChange={setMatrixFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Matrix" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="star">Stars</SelectItem>
                      <SelectItem value="plowhorse">Plowhorses</SelectItem>
                      <SelectItem value="puzzle">Puzzles</SelectItem>
                      <SelectItem value="dog">Dogs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Items Table with Educational Headers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Menu Items Analysis
                  <InfoTooltip content={TOOLTIPS.bcgMatrix} />
                </CardTitle>
                <CardDescription className="text-xs">
                  Hover over column headers for explanations. Click any header (?) icon to learn more.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">
                        Units<InfoTooltip content={TOOLTIPS.units} />
                      </TableHead>
                      <TableHead className="text-right">
                        Revenue<InfoTooltip content={TOOLTIPS.revenue} />
                      </TableHead>
                      <TableHead className="text-right">
                        Food Cost %<InfoTooltip content={TOOLTIPS.foodCostPct} />
                      </TableHead>
                      <TableHead className="text-right">
                        CM<InfoTooltip content={TOOLTIPS.contributionMargin} />
                      </TableHead>
                      <TableHead className="text-right">
                        Mix %<InfoTooltip content={TOOLTIPS.mixPct} />
                      </TableHead>
                      <TableHead>
                        Matrix<InfoTooltip content={TOOLTIPS.matrix} />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => {
                      const style = getCategoryStyle(item.matrix_category);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.units_sold}</TableCell>
                          <TableCell className="text-right">${item.revenue.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={item.food_cost_pct > 35 ? 'text-red-500' : item.food_cost_pct < 25 ? 'text-green-500' : ''}>
                              {item.food_cost_pct.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">${item.contribution_margin.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.sales_mix_pct.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Badge className={`${style.bg} ${style.color} border-0`}>
                              <style.icon className="h-3 w-3 mr-1" />
                              {style.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Summary Stats with Educational Tooltips */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Total Revenue</span>
                    <InfoTooltip content={TOOLTIPS.revenue} />
                  </div>
                  <p className="text-2xl font-bold">${filteredSummary.totalRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Avg Food Cost</span>
                    <InfoTooltip content={TOOLTIPS.avgFoodCost} />
                  </div>
                  <p className="text-2xl font-bold">{filteredSummary.avgFoodCostPct.toFixed(1)}%</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm">Avg Contribution Margin</span>
                    <InfoTooltip content={TOOLTIPS.avgCM} />
                  </div>
                  <p className="text-2xl font-bold">${filteredSummary.avgContributionMargin.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {menuItems.slice(0, 10).map(item => {
                  const style = getCategoryStyle(item.matrix_category);
                  return (
                    <Card key={item.id} className={`${style.bg} border-0`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <style.icon className={`h-4 w-4 ${style.color}`} />
                              <span className="font-semibold">{item.item_name}</span>
                              <Badge variant="outline" className="text-xs">{style.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {getRecommendation(item)}
                            </p>
                            <div className="flex gap-4 text-xs">
                              <span>CM: ${item.contribution_margin.toFixed(2)}</span>
                              <span>Mix: {item.sales_mix_pct.toFixed(1)}%</span>
                              <span>FC: {item.food_cost_pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Quick Optimization Actions
                  <InfoTooltip content="Click each action to view specific items and get detailed recommendations for that category." />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActionDialog('plowhorses')}
                  disabled={summary.plowhorses === 0}
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  Improve Plowhorse Margins ({summary.plowhorses} items)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActionDialog('puzzles')}
                  disabled={summary.puzzles === 0}
                >
                  <Lightbulb className="h-4 w-4 mr-2 text-purple-500" />
                  Boost Puzzle Visibility ({summary.puzzles} items)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActionDialog('dogs')}
                  disabled={summary.dogs === 0}
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                  Review Dogs for Removal ({summary.dogs} items)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActionDialog('pricing')}
                  disabled={menuItems.length === 0}
                >
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  Price Optimization Analysis
                </Button>
              </CardContent>
            </Card>

            {/* Action Dialogs */}
            <Dialog open={actionDialog === 'plowhorses'} onOpenChange={(open) => !open && setActionDialog(null)}>
              <DialogContent className="max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    Plowhorse Margin Improvement
                  </DialogTitle>
                  <DialogDescription>{TOOLTIPS.plowhorse}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-3">
                    {menuItems.filter(i => i.matrix_category === 'plowhorse').map(item => (
                      <Card key={item.id} className="bg-blue-500/5 border-blue-500/20">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                            <Badge variant="outline" className="text-blue-500">FC: {item.food_cost_pct.toFixed(1)}%</Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>💡 <strong>Actions:</strong></p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                              <li>Review portion sizes - can you reduce slightly without affecting perception?</li>
                              <li>Substitute expensive ingredients with similar alternatives</li>
                              <li>Consider increasing price by 5-10% gradually</li>
                              <li>CM: ${item.contribution_margin.toFixed(2)} → Target: ${(item.contribution_margin * 1.15).toFixed(2)}</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog open={actionDialog === 'puzzles'} onOpenChange={(open) => !open && setActionDialog(null)}>
              <DialogContent className="max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-purple-500" />
                    Puzzle Visibility Boost
                  </DialogTitle>
                  <DialogDescription>{TOOLTIPS.puzzle}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-3">
                    {menuItems.filter(i => i.matrix_category === 'puzzle').map(item => (
                      <Card key={item.id} className="bg-purple-500/5 border-purple-500/20">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                            <Badge variant="outline" className="text-purple-500">CM: ${item.contribution_margin.toFixed(2)}</Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>💡 <strong>Actions:</strong></p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                              <li>Move to prime menu real estate (top-right, boxed section)</li>
                              <li>Add to daily specials board</li>
                              <li>Train staff to recommend this item</li>
                              <li>Current Mix: {item.sales_mix_pct.toFixed(1)}% → Target: {(item.sales_mix_pct * 1.5).toFixed(1)}%</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog open={actionDialog === 'dogs'} onOpenChange={(open) => !open && setActionDialog(null)}>
              <DialogContent className="max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Dog Items Review
                  </DialogTitle>
                  <DialogDescription>{TOOLTIPS.dog}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-3">
                    {menuItems.filter(i => i.matrix_category === 'dog').map(item => (
                      <Card key={item.id} className="bg-red-500/5 border-red-500/20">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">{item.category}</p>
                            </div>
                            <Badge variant="outline" className="text-red-500">⚠️ Review</Badge>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>💡 <strong>Decision Points:</strong></p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                              <li>CM: ${item.contribution_margin.toFixed(2)} | Mix: {item.sales_mix_pct.toFixed(1)}%</li>
                              <li>🔴 Remove from menu if no strategic value</li>
                              <li>🟡 Complete recipe overhaul if keeping</li>
                              <li>🟢 Repurpose ingredients into better-performing items</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog open={actionDialog === 'pricing'} onOpenChange={(open) => !open && setActionDialog(null)}>
              <DialogContent className="max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Price Optimization Analysis
                  </DialogTitle>
                  <DialogDescription>Items with pricing opportunities based on food cost and contribution margin analysis.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-3">
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="p-3">
                        <p className="font-medium text-sm mb-2">📊 Overall Pricing Health</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Avg Food Cost: <strong>{summary.avgFoodCostPct.toFixed(1)}%</strong></div>
                          <div>Target: <strong>28-32%</strong></div>
                          <div>Avg CM: <strong>${summary.avgContributionMargin.toFixed(2)}</strong></div>
                          <div>Items: <strong>{summary.totalItems}</strong></div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <p className="text-xs font-medium text-muted-foreground">Items with High Food Cost (&gt;35%):</p>
                    {menuItems.filter(i => i.food_cost_pct > 35).map(item => (
                      <Card key={item.id} className="border-amber-500/20">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">Current: ${item.selling_price.toFixed(2)}</p>
                            </div>
                            <Badge variant="outline" className="text-amber-500">FC: {item.food_cost_pct.toFixed(1)}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 Suggested price: ${(item.food_cost / 0.30).toFixed(2)} (to achieve 30% FC)
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {menuItems.filter(i => i.food_cost_pct > 35).length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">✅ No items with high food cost!</p>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
    </TooltipProvider>
  );
}