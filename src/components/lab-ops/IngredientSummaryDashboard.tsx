import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Search,
  AlertTriangle,
  Wine,
  ChefHat
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface IngredientUsage {
  itemId: string;
  itemName: string;
  category?: string;
  totalQtyUsed: number;
  unit: string;
  recipeCount: number;
  totalCostContribution: number;
  currentStock: number;
  bottleSize: number;
  avgCostPerRecipe: number;
  recipes: Array<{ name: string; qty: number }>;
}

interface IngredientSummaryDashboardProps {
  recipes: any[];
  inventoryItems: any[];
}

export function IngredientSummaryDashboard({ recipes, inventoryItems }: IngredientSummaryDashboardProps) {
  const { formatPrice } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('usage');

  // Aggregate ingredient usage across all recipes
  const ingredientUsage = useMemo(() => {
    const usageMap = new Map<string, IngredientUsage>();

    for (const recipe of recipes) {
      const recipeIngredients = recipe.lab_ops_recipe_ingredients || [];
      const recipeName = recipe.menu_item?.name || recipe.lab_ops_menu_items?.name || 'Unknown Recipe';

      for (const ing of recipeIngredients) {
        const invItem = inventoryItems.find(i => i.id === ing.inventory_item_id);
        if (!invItem) continue;

        const existing = usageMap.get(ing.inventory_item_id);
        const unitCost = invItem.lab_ops_inventory_item_costs?.[0]?.unit_cost || 0;
        const bottleSize = ing.bottle_size || invItem.bottle_size_ml || 750;
        const costPerMl = unitCost;
        const ingredientCost = ing.qty * costPerMl;


        if (existing) {
          existing.totalQtyUsed += ing.qty || 0;
          existing.recipeCount += 1;
          existing.totalCostContribution += ingredientCost;
          existing.recipes.push({ name: recipeName, qty: ing.qty });
        } else {
          usageMap.set(ing.inventory_item_id, {
            itemId: ing.inventory_item_id,
            itemName: invItem.name,
            category: invItem.category,
            totalQtyUsed: ing.qty || 0,
            unit: ing.unit,
            recipeCount: 1,
            totalCostContribution: ingredientCost,
            currentStock: invItem.totalStock || 0,
            bottleSize,
            avgCostPerRecipe: ingredientCost,
            recipes: [{ name: recipeName, qty: ing.qty }],
          });
        }
      }
    }

    // Calculate average cost per recipe
    for (const usage of usageMap.values()) {
      usage.avgCostPerRecipe = usage.totalCostContribution / usage.recipeCount;
    }

    return Array.from(usageMap.values());
  }, [recipes, inventoryItems]);

  // Filter by search
  const filteredUsage = useMemo(() => {
    if (!searchTerm) return ingredientUsage;
    const term = searchTerm.toLowerCase();
    return ingredientUsage.filter(item => 
      item.itemName.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term)
    );
  }, [ingredientUsage, searchTerm]);

  // Summary stats
  const stats = useMemo(() => {
    const totalIngredients = ingredientUsage.length;
    const totalCostContribution = ingredientUsage.reduce((sum, i) => sum + i.totalCostContribution, 0);
    const avgRecipesPerIngredient = totalIngredients > 0 
      ? ingredientUsage.reduce((sum, i) => sum + i.recipeCount, 0) / totalIngredients 
      : 0;
    const lowStockItems = ingredientUsage.filter(i => {
      const servesAvailable = i.bottleSize > 0 ? Math.floor(i.currentStock / (i.totalQtyUsed / i.recipeCount)) : 0;
      return servesAvailable < 10;
    });

    return {
      totalIngredients,
      totalCostContribution,
      avgRecipesPerIngredient,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }, [ingredientUsage]);

  // Top cost drivers
  const topCostDrivers = useMemo(() => 
    [...ingredientUsage]
      .sort((a, b) => b.totalCostContribution - a.totalCostContribution)
      .slice(0, 5),
    [ingredientUsage]
  );

  // Most used ingredients
  const mostUsedIngredients = useMemo(() =>
    [...ingredientUsage]
      .sort((a, b) => b.recipeCount - a.recipeCount)
      .slice(0, 5),
    [ingredientUsage]
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ingredient Summary
            </CardTitle>
            <CardDescription>Usage analytics across all recipes</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="h-3.5 w-3.5" />
                <span className="text-xs">Ingredients</span>
              </div>
              <p className="text-xl font-bold">{stats.totalIngredients}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                <span className="text-xs">Total Cost</span>
              </div>
              <p className="text-xl font-bold">{formatPrice(stats.totalCostContribution)}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ChefHat className="h-3.5 w-3.5" />
                <span className="text-xs">Avg Recipes</span>
              </div>
              <p className="text-xl font-bold">{stats.avgRecipesPerIngredient.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card className={`border-border/50 ${stats.lowStockCount > 0 ? 'bg-yellow-500/10' : ''}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <AlertTriangle className={`h-3.5 w-3.5 ${stats.lowStockCount > 0 ? 'text-yellow-500' : ''}`} />
                <span className="text-xs">Low Stock</span>
              </div>
              <p className={`text-xl font-bold ${stats.lowStockCount > 0 ? 'text-yellow-500' : ''}`}>
                {stats.lowStockCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage">All Usage</TabsTrigger>
            <TabsTrigger value="cost">Cost Drivers</TabsTrigger>
            <TabsTrigger value="popular">Most Used</TabsTrigger>
          </TabsList>

          <TabsContent value="usage" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredUsage.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No ingredients found</p>
                  </div>
                ) : (
                  filteredUsage.map((item) => (
                    <Card key={item.itemId} className="border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{item.itemName}</h4>
                              {item.category && (
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Used in {item.recipeCount} recipe{item.recipeCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold">{formatPrice(item.totalCostContribution)}</p>
                            <p className="text-xs text-muted-foreground">total cost</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Total Qty</span>
                            <p className="font-medium">{item.totalQtyUsed.toFixed(1)} {item.unit}</p>
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Stock</span>
                            <p className={`font-medium ${item.currentStock < item.totalQtyUsed ? 'text-yellow-500' : 'text-green-500'}`}>
                              {item.currentStock.toFixed(0)}
                            </p>
                          </div>
                          <div className="bg-muted/50 rounded px-2 py-1">
                            <span className="text-muted-foreground">Avg/Recipe</span>
                            <p className="font-medium">{formatPrice(item.avgCostPerRecipe)}</p>
                          </div>
                        </div>

                        {item.recipes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.recipes.slice(0, 3).map((r, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px]">
                                {r.name}: {r.qty}{item.unit}
                              </Badge>
                            ))}
                            {item.recipes.length > 3 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{item.recipes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="cost" className="mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Top 5 ingredients by cost contribution</p>
              {topCostDrivers.map((item, idx) => {
                const pct = stats.totalCostContribution > 0 
                  ? (item.totalCostContribution / stats.totalCostContribution) * 100 
                  : 0;
                return (
                  <div key={item.itemId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">{item.recipeCount} recipes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(item.totalCostContribution)}</p>
                        <Badge variant="outline" className="text-[10px]">{pct.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="popular" className="mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Most frequently used ingredients</p>
              {mostUsedIngredients.map((item, idx) => (
                <Card key={item.itemId} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.totalQtyUsed.toFixed(1)} {item.unit} total
                          </p>
                        </div>
                      </div>
                      <Badge>{item.recipeCount} recipes</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
