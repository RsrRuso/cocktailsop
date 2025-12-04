import { useState, useMemo } from "react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, FileSpreadsheet, Star, TrendingUp, TrendingDown, 
  AlertTriangle, Target, DollarSign, BarChart3, Lightbulb,
  Download, RefreshCw, Filter, Search, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, PieChart, Activity, ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

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

  // Calculate analysis summary
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
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">{summary.stars}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Stars</p>
                  <p className="text-xs text-yellow-600">High profit, High popularity</p>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{summary.plowhorses}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Plowhorses</p>
                  <p className="text-xs text-blue-600">Low profit, High popularity</p>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{summary.puzzles}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Puzzles</p>
                  <p className="text-xs text-purple-600">High profit, Low popularity</p>
                </CardContent>
              </Card>
              
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold">{summary.dogs}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Dogs</p>
                  <p className="text-xs text-red-600">Low profit, Low popularity</p>
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

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Food Cost %</TableHead>
                      <TableHead className="text-right">CM</TableHead>
                      <TableHead className="text-right">Mix %</TableHead>
                      <TableHead>Matrix</TableHead>
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

            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold">${summary.totalRevenue.toLocaleString()}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Avg Food Cost</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.avgFoodCostPct.toFixed(1)}%</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm">Avg Contribution Margin</span>
                  </div>
                  <p className="text-2xl font-bold">${summary.avgContributionMargin.toFixed(2)}</p>
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
                <CardTitle>Quick Optimization Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
                  Improve Plowhorse Margins (Recipe Engineering)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Lightbulb className="h-4 w-4 mr-2 text-purple-500" />
                  Boost Puzzle Visibility (Menu Placement)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                  Review Dogs for Removal
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="h-4 w-4 mr-2 text-green-500" />
                  Price Optimization Analysis
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}