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
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, FileSpreadsheet, Star, TrendingUp, TrendingDown, 
  AlertTriangle, Target, DollarSign, BarChart3, Lightbulb,
  Download, RefreshCw, Filter, Search, ChevronRight, Sparkles,
  ArrowUpRight, ArrowDownRight, PieChart, Activity, ArrowLeft,
  Info, HelpCircle, X, Eye, Link2, Package, Utensils
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import EditableRecipeIngredients, { EditableIngredient } from "@/components/menu-engineering/EditableRecipeIngredients";

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

interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  bottleSize: number;
  bottleCost: number;
  cost: number;
}

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
  ingredients?: Ingredient[];
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
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [editableIngredients, setEditableIngredients] = useState<EditableIngredient[]>([]);

  // Mock ingredients data for demo items (with bottle cost structure)
  const DEMO_INGREDIENTS: Record<string, Ingredient[]> = {
    'Margarita': [
      { id: '1', name: 'Tequila Blanco', amount: 60, unit: 'ml', bottleSize: 700, bottleCost: 28, cost: 2.40 },
      { id: '2', name: 'Triple Sec', amount: 30, unit: 'ml', bottleSize: 700, bottleCost: 21, cost: 0.90 },
      { id: '3', name: 'Fresh Lime Juice', amount: 30, unit: 'ml', bottleSize: 500, bottleCost: 8.33, cost: 0.50 },
      { id: '4', name: 'Agave Syrup', amount: 15, unit: 'ml', bottleSize: 750, bottleCost: 10, cost: 0.20 },
      { id: '5', name: 'Salt', amount: 2, unit: 'g', bottleSize: 1000, bottleCost: 2.5, cost: 0.05 },
      { id: '6', name: 'Lime Wheel', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.15, cost: 0.15 }
    ],
    'Old Fashioned': [
      { id: '1', name: 'Bourbon', amount: 60, unit: 'ml', bottleSize: 700, bottleCost: 40.83, cost: 3.50 },
      { id: '2', name: 'Angostura Bitters', amount: 3, unit: 'dashes', bottleSize: 100, bottleCost: 10, cost: 0.30 },
      { id: '3', name: 'Sugar Cube', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.10, cost: 0.10 },
      { id: '4', name: 'Orange Peel', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.20, cost: 0.20 },
      { id: '5', name: 'Luxardo Cherry', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.40, cost: 0.40 }
    ],
    'Mojito': [
      { id: '1', name: 'White Rum', amount: 60, unit: 'ml', bottleSize: 700, bottleCost: 23.33, cost: 2.00 },
      { id: '2', name: 'Fresh Lime Juice', amount: 30, unit: 'ml', bottleSize: 500, bottleCost: 8.33, cost: 0.50 },
      { id: '3', name: 'Sugar Syrup', amount: 20, unit: 'ml', bottleSize: 1000, bottleCost: 7.5, cost: 0.15 },
      { id: '4', name: 'Fresh Mint', amount: 8, unit: 'leaves', bottleSize: 1, bottleCost: 0.0375, cost: 0.30 },
      { id: '5', name: 'Soda Water', amount: 60, unit: 'ml', bottleSize: 1000, bottleCost: 3.33, cost: 0.20 }
    ],
    'Cosmopolitan': [
      { id: '1', name: 'Vodka', amount: 45, unit: 'ml', bottleSize: 700, bottleCost: 28, cost: 1.80 },
      { id: '2', name: 'Triple Sec', amount: 15, unit: 'ml', bottleSize: 700, bottleCost: 21, cost: 0.45 },
      { id: '3', name: 'Fresh Lime Juice', amount: 15, unit: 'ml', bottleSize: 500, bottleCost: 8.33, cost: 0.25 },
      { id: '4', name: 'Cranberry Juice', amount: 30, unit: 'ml', bottleSize: 1000, bottleCost: 13.33, cost: 0.40 },
      { id: '5', name: 'Orange Peel', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.20, cost: 0.20 }
    ],
    'Negroni': [
      { id: '1', name: 'Gin', amount: 30, unit: 'ml', bottleSize: 700, bottleCost: 46.67, cost: 2.00 },
      { id: '2', name: 'Campari', amount: 30, unit: 'ml', bottleSize: 700, bottleCost: 42, cost: 1.80 },
      { id: '3', name: 'Sweet Vermouth', amount: 30, unit: 'ml', bottleSize: 750, bottleCost: 25, cost: 1.00 },
      { id: '4', name: 'Orange Peel', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.20, cost: 0.20 }
    ],
    'Caesar Salad': [
      { id: '1', name: 'Romaine Lettuce', amount: 150, unit: 'g', bottleSize: 500, bottleCost: 2.67, cost: 0.80 },
      { id: '2', name: 'Caesar Dressing', amount: 50, unit: 'ml', bottleSize: 500, bottleCost: 6, cost: 0.60 },
      { id: '3', name: 'Parmesan Cheese', amount: 30, unit: 'g', bottleSize: 200, bottleCost: 6, cost: 0.90 },
      { id: '4', name: 'Croutons', amount: 30, unit: 'g', bottleSize: 200, bottleCost: 2, cost: 0.30 },
      { id: '5', name: 'Anchovy Fillet', amount: 2, unit: 'pc', bottleSize: 1, bottleCost: 0.25, cost: 0.50 }
    ],
    'Truffle Fries': [
      { id: '1', name: 'French Fries', amount: 200, unit: 'g', bottleSize: 1000, bottleCost: 6, cost: 1.20 },
      { id: '2', name: 'Truffle Oil', amount: 10, unit: 'ml', bottleSize: 250, bottleCost: 37.5, cost: 1.50 },
      { id: '3', name: 'Parmesan Cheese', amount: 20, unit: 'g', bottleSize: 200, bottleCost: 6, cost: 0.60 },
      { id: '4', name: 'Fresh Parsley', amount: 5, unit: 'g', bottleSize: 50, bottleCost: 2, cost: 0.20 },
      { id: '5', name: 'Garlic Aioli', amount: 30, unit: 'ml', bottleSize: 500, bottleCost: 6.67, cost: 0.40 }
    ],
    'Wagyu Slider': [
      { id: '1', name: 'Wagyu Beef Patty', amount: 100, unit: 'g', bottleSize: 100, bottleCost: 8, cost: 8.00 },
      { id: '2', name: 'Brioche Bun', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 1, cost: 1.00 },
      { id: '3', name: 'Cheddar Cheese', amount: 30, unit: 'g', bottleSize: 200, bottleCost: 5.33, cost: 0.80 },
      { id: '4', name: 'Truffle Aioli', amount: 20, unit: 'ml', bottleSize: 250, bottleCost: 12.5, cost: 1.00 },
      { id: '5', name: 'Arugula', amount: 10, unit: 'g', bottleSize: 100, bottleCost: 3, cost: 0.30 },
      { id: '6', name: 'Tomato Slice', amount: 1, unit: 'pc', bottleSize: 1, bottleCost: 0.15, cost: 0.15 }
    ],
    'House Wine': [
      { id: '1', name: 'House Red/White Wine', amount: 175, unit: 'ml', bottleSize: 750, bottleCost: 10.71, cost: 2.50 }
    ],
    'Premium Whiskey': [
      { id: '1', name: 'Premium Whiskey', amount: 45, unit: 'ml', bottleSize: 700, bottleCost: 116.67, cost: 7.50 }
    ]
  };

  // Initialize editable ingredients when item selected
  const initializeEditableIngredients = (item: MenuItem) => {
    const ings = item.ingredients || DEMO_INGREDIENTS[item.item_name] || [];
    setEditableIngredients(ings.map((ing, idx) => ({
      id: ing.id || `ing-${idx}`,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      bottleSize: ing.bottleSize || 700,
      bottleCost: ing.bottleCost || 0,
      cost: ing.cost
    })));
  };

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    initializeEditableIngredients(item);
    setShowRecipeDialog(true);
  };

  const handleIngredientsChange = (newIngredients: EditableIngredient[]) => {
    setEditableIngredients(newIngredients);
    // Update the menu item's food cost based on new ingredients
    if (selectedItem) {
      const newFoodCost = newIngredients.reduce((sum, ing) => sum + ing.cost, 0);
      const updatedItem = {
        ...selectedItem,
        food_cost: newFoodCost,
        food_cost_pct: selectedItem.selling_price > 0 ? (newFoodCost / selectedItem.selling_price) * 100 : 0,
        contribution_margin: selectedItem.selling_price - newFoodCost,
        ingredients: newIngredients
      };
      setSelectedItem(updatedItem);
      // Update in menuItems array
      setMenuItems(prev => prev.map(item => 
        item.id === selectedItem.id ? updatedItem : item
      ));
    }
  };

  const getCurrencySymbol = () => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'AED': 'د.إ', 'SAR': '﷼',
      'AUD': 'A$', 'CAD': 'C$', 'JPY': '¥', 'INR': '₹', 'CHF': 'CHF'
    };
    return symbols[currency] || '$';
  };

  // Get cross-utilized ingredients
  const getCrossUtilization = useMemo(() => {
    const ingredientUsage: Record<string, { items: string[]; totalUsage: number }> = {};
    
    menuItems.forEach(item => {
      const ingredients = item.ingredients || DEMO_INGREDIENTS[item.item_name] || [];
      ingredients.forEach(ing => {
        if (!ingredientUsage[ing.name]) {
          ingredientUsage[ing.name] = { items: [], totalUsage: 0 };
        }
        if (!ingredientUsage[ing.name].items.includes(item.item_name)) {
          ingredientUsage[ing.name].items.push(item.item_name);
        }
        ingredientUsage[ing.name].totalUsage += ing.amount * item.units_sold;
      });
    });
    
    return ingredientUsage;
  }, [menuItems]);

  // Get optimization suggestions for an item
  const getOptimizationSuggestions = (item: MenuItem) => {
    const suggestions: string[] = [];
    const ingredients = item.ingredients || DEMO_INGREDIENTS[item.item_name] || [];
    const crossUtil = getCrossUtilization;
    
    // Check for high-cost single-use ingredients
    ingredients.forEach(ing => {
      const usage = crossUtil[ing.name];
      if (usage && usage.items.length === 1 && ing.cost > 1) {
        suggestions.push(`Consider replacing ${ing.name} ($${ing.cost.toFixed(2)}) - only used in this item`);
      }
    });
    
    // Check for shared ingredients that could be bulk purchased
    const sharedIngredients = ingredients.filter(ing => {
      const usage = crossUtil[ing.name];
      return usage && usage.items.length >= 3;
    });
    if (sharedIngredients.length > 0) {
      suggestions.push(`Bulk purchase opportunity: ${sharedIngredients.map(i => i.name).join(', ')} used in 3+ items`);
    }
    
    // Food cost specific suggestions
    if (item.food_cost_pct > 35) {
      suggestions.push(`High food cost (${item.food_cost_pct.toFixed(1)}%) - reduce portions or find cheaper alternatives`);
    }
    
    // Matrix-specific suggestions
    if (item.matrix_category === 'plowhorse') {
      suggestions.push('Popular but low margin - consider 10% portion reduction or ingredient substitution');
    } else if (item.matrix_category === 'puzzle') {
      suggestions.push('High margin but low sales - feature on specials or train staff to upsell');
    } else if (item.matrix_category === 'dog') {
      suggestions.push('Low performer - review recipe completely or remove from menu');
    }
    
    return suggestions;
  };

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

  // Export analysis to PDF based on active tab
  const exportAnalysis = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleDateString();
    
    // Header
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Menu Engineering Pro', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${activeTab === 'matrix' ? 'BCG Matrix' : activeTab === 'analysis' ? 'Analysis Report' : activeTab === 'ingredients' ? 'Ingredient Cross-Utilization' : 'AI Insights'} - ${now}`, pageWidth / 2, 25, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    let yPos = 45;

    if (activeTab === 'matrix') {
      // Matrix Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('BCG Matrix Summary', 14, yPos);
      yPos += 10;
      
      // Summary cards data with colored indicators
      const summaryData = [
        ['Category', 'Count', 'Description', 'Strategy'],
        ['[*] STARS', String(summary.stars), 'High profit, High popularity', 'Maintain & feature prominently'],
        ['[+] PLOWHORSES', String(summary.plowhorses), 'Low profit, High popularity', 'Engineer costs or increase price'],
        ['[?] PUZZLES', String(summary.puzzles), 'High profit, Low popularity', 'Increase visibility & upselling'],
        ['[!] DOGS', String(summary.dogs), 'Low profit, Low popularity', 'Consider removal or overhaul']
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const text = String(data.cell.raw);
            if (text.includes('STARS')) {
              data.cell.styles.textColor = [180, 150, 30]; // Gold
            } else if (text.includes('PLOWHORSES')) {
              data.cell.styles.textColor = [50, 100, 180]; // Blue
            } else if (text.includes('PUZZLES')) {
              data.cell.styles.textColor = [130, 80, 170]; // Purple
            } else if (text.includes('DOGS')) {
              data.cell.styles.textColor = [200, 60, 60]; // Red
            }
          }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Items by category
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Items by Category', 14, yPos);
      yPos += 8;
      
      const matrixItems = menuItems.map(item => [
        item.item_name,
        item.category,
        `$${item.contribution_margin.toFixed(2)}`,
        `${item.sales_mix_pct.toFixed(1)}%`,
        item.matrix_category.charAt(0).toUpperCase() + item.matrix_category.slice(1)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Category', 'CM', 'Mix %', 'Matrix']],
        body: matrixItems,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
        styles: { fontSize: 9 }
      });
      
    } else if (activeTab === 'analysis') {
      // Analysis Report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Menu Analysis Report', 14, yPos);
      yPos += 10;
      
      // Filtered summary stats
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Revenue: $${filteredSummary.totalRevenue.toLocaleString()}`, 14, yPos);
      doc.text(`Avg Food Cost: ${filteredSummary.avgFoodCostPct.toFixed(1)}%`, 80, yPos);
      doc.text(`Avg CM: $${filteredSummary.avgContributionMargin.toFixed(2)}`, 140, yPos);
      yPos += 8;
      doc.text(`Items: ${filteredSummary.totalItems} | Stars: ${filteredSummary.stars} | Plowhorses: ${filteredSummary.plowhorses} | Puzzles: ${filteredSummary.puzzles} | Dogs: ${filteredSummary.dogs}`, 14, yPos);
      yPos += 12;
      
      // Filtered items table
      const analysisItems = filteredItems.map(item => [
        item.item_name,
        item.category,
        String(item.units_sold),
        `$${item.revenue.toFixed(2)}`,
        `${item.food_cost_pct.toFixed(1)}%`,
        `$${item.contribution_margin.toFixed(2)}`,
        `${item.sales_mix_pct.toFixed(1)}%`,
        item.matrix_category.charAt(0).toUpperCase() + item.matrix_category.slice(1)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Category', 'Units', 'Revenue', 'FC%', 'CM', 'Mix%', 'Matrix']],
        body: analysisItems,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
        styles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 35 },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        }
      });
      
    } else if (activeTab === 'ingredients') {
      // Ingredients Cross-Utilization Report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ingredient Cross-Utilization Report', 14, yPos);
      yPos += 10;
      
      // Build ingredient data
      const ingredientData: [string, string, string, string][] = [];
      Object.entries(getCrossUtilization).forEach(([ingName, data]) => {
        ingredientData.push([
          ingName,
          String(data.items.length),
          data.items.join(', '),
          data.items.length > 2 ? 'Bulk Purchase' : data.items.length === 1 ? 'Single Use' : 'Shared'
        ]);
      });
      
      // Sort by usage count (descending)
      ingredientData.sort((a, b) => parseInt(b[1]) - parseInt(a[1]));
      
      autoTable(doc, {
        startY: yPos,
        head: [['Ingredient', 'Used In', 'Menu Items', 'Status']],
        body: ingredientData,
        theme: 'striped',
        headStyles: { fillColor: [60, 60, 60] },
        styles: { fontSize: 8 },
        columnStyles: { 
          0: { cellWidth: 40 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 90 },
          3: { cellWidth: 30 }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const text = String(data.cell.raw);
            if (text === 'Bulk Purchase') {
              data.cell.styles.textColor = [50, 150, 50]; // Green
            } else if (text === 'Single Use') {
              data.cell.styles.textColor = [200, 100, 50]; // Orange
            }
          }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Summary stats
      const totalIngredients = Object.keys(getCrossUtilization).length;
      const sharedIngredients = Object.values(getCrossUtilization).filter(d => d.items.length > 1).length;
      const bulkOpportunities = Object.values(getCrossUtilization).filter(d => d.items.length >= 3).length;
      
      doc.setFontSize(10);
      doc.text(`Total Ingredients: ${totalIngredients} | Shared (2+ items): ${sharedIngredients} | Bulk Opportunities (3+ items): ${bulkOpportunities}`, 14, yPos);
      
    } else if (activeTab === 'insights') {
      // AI Insights Report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('AI-Powered Menu Recommendations', 14, yPos);
      yPos += 10;
      
      // Overall stats
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Items: ${summary.totalItems} | Revenue: $${summary.totalRevenue.toLocaleString()} | Avg FC: ${summary.avgFoodCostPct.toFixed(1)}%`, 14, yPos);
      yPos += 12;
      
      // Recommendations by category
      const categories = [
        { name: 'Stars', items: menuItems.filter(i => i.matrix_category === 'star'), action: 'Maintain & Feature' },
        { name: 'Plowhorses', items: menuItems.filter(i => i.matrix_category === 'plowhorse'), action: 'Improve Margins' },
        { name: 'Puzzles', items: menuItems.filter(i => i.matrix_category === 'puzzle'), action: 'Boost Visibility' },
        { name: 'Dogs', items: menuItems.filter(i => i.matrix_category === 'dog'), action: 'Review/Remove' }
      ];
      
      categories.forEach(cat => {
        if (cat.items.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${cat.name} (${cat.items.length}) - ${cat.action}`, 14, yPos);
          yPos += 6;
          
          const catItems = cat.items.map(item => [
            item.item_name,
            item.category,
            `$${item.contribution_margin.toFixed(2)}`,
            `${item.food_cost_pct.toFixed(1)}%`,
            `${item.sales_mix_pct.toFixed(1)}%`
          ]);
          
          autoTable(doc, {
            startY: yPos,
            head: [['Item', 'Category', 'CM', 'FC%', 'Mix%']],
            body: catItems,
            theme: 'grid',
            headStyles: { fillColor: [80, 80, 80], fontSize: 8 },
            styles: { fontSize: 8 },
            margin: { left: 14 }
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 10;
          
          // Check for page break
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }
        }
      });
      
      // High food cost items
      const highFCItems = menuItems.filter(i => i.food_cost_pct > 35);
      if (highFCItems.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Price Optimization Opportunities (FC > 35%)`, 14, yPos);
        yPos += 6;
        
        const priceItems = highFCItems.map(item => [
          item.item_name,
          `$${item.selling_price.toFixed(2)}`,
          `${item.food_cost_pct.toFixed(1)}%`,
          `$${(item.food_cost / 0.30).toFixed(2)}`
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Item', 'Current Price', 'FC%', 'Suggested Price (30% FC)']],
          body: priceItems,
          theme: 'grid',
          headStyles: { fillColor: [180, 100, 50], fontSize: 8 },
          styles: { fontSize: 8 }
        });
      }
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`SpecVerse Menu Engineering Pro | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    doc.save(`menu-engineering-${activeTab}-${now.replace(/\//g, '-')}.pdf`);
    toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} exported successfully!`);
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
          <TabsList className="grid grid-cols-5 w-full max-w-lg">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="matrix" disabled={menuItems.length === 0}>Matrix</TabsTrigger>
            <TabsTrigger value="analysis" disabled={menuItems.length === 0}>Analysis</TabsTrigger>
            <TabsTrigger value="ingredients" disabled={menuItems.length === 0}>Ingredients</TabsTrigger>
            <TabsTrigger value="insights" disabled={menuItems.length === 0}>AI</TabsTrigger>
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
                        <TableRow 
                          key={item.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSelectItem(item)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              {item.item_name}
                            </div>
                          </TableCell>
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

          {/* Ingredients Cross-Utilization Tab */}
          <TabsContent value="ingredients" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Ingredient Cross-Utilization Analysis</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      See which ingredients are shared across multiple menu items. Ingredients used in 3+ items are 
                      <strong className="text-green-600"> bulk purchase opportunities</strong>. Single-use ingredients may indicate 
                      <strong className="text-amber-600"> cost inefficiencies</strong>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{Object.keys(getCrossUtilization).length}</p>
                  <p className="text-xs text-muted-foreground">Total Ingredients</p>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Object.values(getCrossUtilization).filter(d => d.items.length >= 3).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Bulk Opportunities (3+)</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {Object.values(getCrossUtilization).filter(d => d.items.length === 2).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Shared (2 items)</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {Object.values(getCrossUtilization).filter(d => d.items.length === 1).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Single Use</p>
                </CardContent>
              </Card>
            </div>

            {/* Ingredients Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  All Ingredients Cross-Utilization
                  <InfoTooltip content="Complete list of all ingredients showing how many times each is used and in which menu items" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-center">Used In</TableHead>
                      <TableHead>Menu Items</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(getCrossUtilization)
                      .sort((a, b) => b[1].items.length - a[1].items.length)
                      .map(([ingName, data]) => (
                        <TableRow key={ingName}>
                          <TableCell className="font-medium">{ingName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{data.items.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {data.items.map((item, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="secondary" 
                                  className="text-xs cursor-pointer hover:bg-primary/20"
                                  onClick={() => {
                                    const menuItem = menuItems.find(i => i.item_name === item);
                                    if (menuItem) {
                                      handleSelectItem(menuItem);
                                    }
                                  }}
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {data.items.length >= 3 ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                Bulk Purchase
                              </Badge>
                            ) : data.items.length === 2 ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                Shared
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                Single Use
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Optimization Recommendations */}
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Cross-Utilization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.values(getCrossUtilization).filter(d => d.items.length >= 3).length > 0 && (
                  <div className="flex items-start gap-2 text-sm p-3 bg-green-500/10 rounded-lg">
                    <Package className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700">Bulk Purchase Opportunities</p>
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(getCrossUtilization)
                          .filter(([_, d]) => d.items.length >= 3)
                          .map(([name]) => name)
                          .slice(0, 5)
                          .join(', ')}
                        {Object.values(getCrossUtilization).filter(d => d.items.length >= 3).length > 5 && 
                          ` and ${Object.values(getCrossUtilization).filter(d => d.items.length >= 3).length - 5} more`}
                      </p>
                    </div>
                  </div>
                )}
                
                {Object.values(getCrossUtilization).filter(d => d.items.length === 1).length > 0 && (
                  <div className="flex items-start gap-2 text-sm p-3 bg-amber-500/10 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-700">Single-Use Ingredients Review</p>
                      <p className="text-xs text-muted-foreground">
                        Consider if these can be replaced with shared ingredients: {' '}
                        {Object.entries(getCrossUtilization)
                          .filter(([_, d]) => d.items.length === 1)
                          .map(([name]) => name)
                          .slice(0, 5)
                          .join(', ')}
                        {Object.values(getCrossUtilization).filter(d => d.items.length === 1).length > 5 && 
                          ` and ${Object.values(getCrossUtilization).filter(d => d.items.length === 1).length - 5} more`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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

        {/* Recipe Detail - Mobile Sheet / Desktop Dialog */}
        {selectedItem && (
          <>
            {/* Mobile: Full-screen Drawer */}
            <Drawer open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
              <DrawerContent className="h-[95vh] md:hidden">
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between px-4 pb-4 border-b bg-background shrink-0">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold text-base">{selectedItem.item_name}</h3>
                        <p className="text-xs text-muted-foreground">Recipe & Ingredients</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowRecipeDialog(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 pb-20 space-y-4">
                      {/* Item Summary - Mobile Grid */}
                      <div className={`rounded-xl p-4 ${getCategoryStyle(selectedItem.matrix_category).bg}`}>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-background/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Selling Price</p>
                            <p className="text-lg font-bold">${selectedItem.selling_price.toFixed(2)}</p>
                          </div>
                          <div className="text-center p-3 bg-background/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Food Cost</p>
                            <p className="text-lg font-bold">${selectedItem.food_cost.toFixed(2)}</p>
                          </div>
                          <div className="text-center p-3 bg-background/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Food Cost %</p>
                            <p className={`text-lg font-bold ${selectedItem.food_cost_pct > 35 ? 'text-red-500' : 'text-green-500'}`}>
                              {selectedItem.food_cost_pct.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center p-3 bg-background/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Matrix</p>
                            <Badge className={`${getCategoryStyle(selectedItem.matrix_category).bg} ${getCategoryStyle(selectedItem.matrix_category).color} border-0 mt-1`}>
                              {getCategoryStyle(selectedItem.matrix_category).label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Editable Ingredients - Mobile */}
                      <EditableRecipeIngredients
                        ingredients={editableIngredients}
                        onIngredientsChange={handleIngredientsChange}
                        currency={currency}
                        onCurrencyChange={setCurrency}
                      />

                      {/* Cross-Utilized Products - Mobile */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Link2 className="h-4 w-4" />
                            Cross-Utilized Products
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const ingredients = selectedItem.ingredients || DEMO_INGREDIENTS[selectedItem.item_name] || [];
                            const sharedItems = new Set<string>();
                            
                            ingredients.forEach(ing => {
                              const crossUse = getCrossUtilization[ing.name];
                              if (crossUse) {
                                crossUse.items.forEach(item => {
                                  if (item !== selectedItem.item_name) sharedItems.add(item);
                                });
                              }
                            });
                            
                            if (sharedItems.size === 0) {
                              return <p className="text-sm text-muted-foreground text-center py-4">No shared ingredients</p>;
                            }
                            
                            return (
                              <div className="space-y-2">
                                {Array.from(sharedItems).map(itemName => {
                                  const menuItem = menuItems.find(i => i.item_name === itemName);
                                  const sharedIngs = ingredients.filter(ing => {
                                    const crossUse = getCrossUtilization[ing.name];
                                    return crossUse && crossUse.items.includes(itemName);
                                  });
                                  
                                  return (
                                    <div key={itemName} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                      <div>
                                        <p className="font-medium text-sm">{itemName}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                          {sharedIngs.map(i => i.name).join(', ')}
                                        </p>
                                      </div>
                                      {menuItem && (
                                        <Badge className={`${getCategoryStyle(menuItem.matrix_category).bg} ${getCategoryStyle(menuItem.matrix_category).color} border-0 text-xs shrink-0`}>
                                          {getCategoryStyle(menuItem.matrix_category).label}
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>

                      {/* AI Suggestions - Mobile */}
                      <Card className="border-primary/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="relative w-5 h-5">
                              <div className="absolute inset-0 border border-white/80" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                              <div className="absolute inset-[3px] border border-white/60" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                              <div className="absolute inset-[6px] bg-white/80" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
                            </div>
                            AI Suggestions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {getOptimizationSuggestions(selectedItem).map((suggestion, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                                <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                <span className="text-sm">{suggestion}</span>
                              </div>
                            ))}
                            {getOptimizationSuggestions(selectedItem).length === 0 && (
                              <div className="text-center py-6">
                                <div className="text-3xl mb-2">✅</div>
                                <p className="text-sm text-muted-foreground">This item is well optimized!</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            {/* Desktop: Standard Dialog */}
            <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] hidden md:flex md:flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                  <DialogTitle className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    {selectedItem.item_name} - Recipe & Ingredients
                  </DialogTitle>
                  <DialogDescription>
                    View ingredients, cross-utilization analysis, and optimization suggestions
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto max-h-[70vh] pr-2">
                  <div className="space-y-4 pr-2">
                    {/* Item Summary */}
                    <Card className={`${getCategoryStyle(selectedItem.matrix_category).bg} border-0`}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Selling Price</p>
                            <p className="font-bold">${selectedItem.selling_price.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Food Cost</p>
                            <p className="font-bold">${selectedItem.food_cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Food Cost %</p>
                            <p className={`font-bold ${selectedItem.food_cost_pct > 35 ? 'text-red-500' : 'text-green-500'}`}>
                              {selectedItem.food_cost_pct.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Matrix</p>
                            <Badge className={`${getCategoryStyle(selectedItem.matrix_category).bg} ${getCategoryStyle(selectedItem.matrix_category).color} border-0`}>
                              {getCategoryStyle(selectedItem.matrix_category).label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Editable Ingredients - Desktop */}
                    <EditableRecipeIngredients
                      ingredients={editableIngredients}
                      onIngredientsChange={handleIngredientsChange}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                    />

                    {/* Cross-Utilized Products */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Cross-Utilized Products
                          <InfoTooltip content="Other menu items that share ingredients with this item - useful for bulk purchasing and inventory management" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const ingredients = selectedItem.ingredients || DEMO_INGREDIENTS[selectedItem.item_name] || [];
                          const sharedItems = new Set<string>();
                          
                          ingredients.forEach(ing => {
                            const crossUse = getCrossUtilization[ing.name];
                            if (crossUse) {
                              crossUse.items.forEach(item => {
                                if (item !== selectedItem.item_name) sharedItems.add(item);
                              });
                            }
                          });
                          
                          if (sharedItems.size === 0) {
                            return <p className="text-sm text-muted-foreground text-center py-4">No shared ingredients with other items</p>;
                          }
                          
                          return (
                            <div className="space-y-2">
                              {Array.from(sharedItems).map(itemName => {
                                const menuItem = menuItems.find(i => i.item_name === itemName);
                                const sharedIngs = ingredients.filter(ing => {
                                  const crossUse = getCrossUtilization[ing.name];
                                  return crossUse && crossUse.items.includes(itemName);
                                });
                                
                                return (
                                  <Card key={itemName} className="bg-muted/30">
                                    <CardContent className="p-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-sm">{itemName}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Shared: {sharedIngs.map(i => i.name).join(', ')}
                                          </p>
                                        </div>
                                        {menuItem && (
                                          <Badge className={`${getCategoryStyle(menuItem.matrix_category).bg} ${getCategoryStyle(menuItem.matrix_category).color} border-0 text-xs`}>
                                            {getCategoryStyle(menuItem.matrix_category).label}
                                          </Badge>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* Optimization Suggestions */}
                    <Card className="border-primary/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <div className="relative w-5 h-5">
                            <div className="absolute inset-0 border border-white/80" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                            <div className="absolute inset-[3px] border border-white/60" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
                            <div className="absolute inset-[6px] bg-white/80" style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
                          </div>
                          AI Optimization Suggestions
                          <InfoTooltip content="Smart recommendations based on ingredient usage, cross-utilization patterns, and menu engineering best practices" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {getOptimizationSuggestions(selectedItem).map((suggestion, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <span>{suggestion}</span>
                            </div>
                          ))}
                          {getOptimizationSuggestions(selectedItem).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              ✅ This item is well optimized!
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>

      <BottomNav />
    </div>
    </TooltipProvider>
  );
}