import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Beaker, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, Search, RefreshCw, Download 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BatchProductionVarianceProps {
  outletId: string;
}

interface RecipeVariance {
  recipeName: string;
  totalProducedLiters: number;
  totalProducedServes: number;
  servingMl: number;
  totalSold: number;
  variance: number;
  variancePercent: number;
  status: 'matched' | 'over' | 'under' | 'no-sales';
  productions: {
    id: string;
    date: string;
    liters: number;
    serves: number;
  }[];
}

export function BatchProductionVariance({ outletId }: BatchProductionVarianceProps) {
  const [varianceData, setVarianceData] = useState<RecipeVariance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchVarianceData = async () => {
    setIsLoading(true);
    try {
      // Fetch all batch productions with recipe info
      const { data: productions, error: prodError } = await supabase
        .from('batch_productions')
        .select(`
          id,
          batch_name,
          target_liters,
          target_serves,
          production_date,
          recipe_id,
          batch_recipes!inner (
            id,
            recipe_name,
            current_serves,
            ingredients
          )
        `)
        .order('production_date', { ascending: false });

      if (prodError) throw prodError;

      // Fetch sales data
      const { data: salesData, error: salesError } = await supabase
        .from('lab_ops_sales')
        .select('item_name, quantity, ml_per_serving, total_ml_sold')
        .eq('outlet_id', outletId);

      if (salesError) throw salesError;

      // Group productions by recipe name
      const recipeMap = new Map<string, RecipeVariance>();

      productions?.forEach((prod: any) => {
        const recipeName = prod.batch_recipes?.recipe_name || prod.batch_name;
        const ingredients = prod.batch_recipes?.ingredients || [];
        
        // Calculate serving size from ingredients
        const totalMlPerServe = ingredients.reduce((sum: number, ing: any) => {
          if (ing.unit === 'ml') return sum + (ing.amount || 0);
          return sum;
        }, 0);

        const existing = recipeMap.get(recipeName);
        const prodEntry = {
          id: prod.id,
          date: prod.production_date,
          liters: prod.target_liters,
          serves: prod.target_serves
        };

        if (existing) {
          existing.totalProducedLiters += prod.target_liters;
          existing.totalProducedServes += prod.target_serves;
          existing.productions.push(prodEntry);
          // Use the most recent serving size
          if (totalMlPerServe > 0) existing.servingMl = totalMlPerServe;
        } else {
          recipeMap.set(recipeName, {
            recipeName,
            totalProducedLiters: prod.target_liters,
            totalProducedServes: prod.target_serves,
            servingMl: totalMlPerServe || 90, // Default 90ml if not calculable
            totalSold: 0,
            variance: 0,
            variancePercent: 0,
            status: 'no-sales',
            productions: [prodEntry]
          });
        }
      });

      // Match sales to recipes (fuzzy matching by name)
      salesData?.forEach((sale: any) => {
        const saleName = sale.item_name?.toLowerCase().trim();
        
        recipeMap.forEach((recipe, key) => {
          const recipeLower = key.toLowerCase().trim();
          if (saleName?.includes(recipeLower) || recipeLower.includes(saleName || '')) {
            recipe.totalSold += sale.quantity || 0;
          }
        });
      });

      // Calculate variance for each recipe
      recipeMap.forEach((recipe) => {
        recipe.variance = recipe.totalProducedServes - recipe.totalSold;
        
        // Only calculate meaningful variance percent when we have sales data
        if (recipe.totalSold === 0) {
          recipe.variancePercent = 0; // No variance percent without sales
          recipe.status = 'no-sales';
        } else {
          // Calculate variance as percentage of SOLD (not produced) for accuracy
          // This shows how much extra/short we are relative to actual consumption
          recipe.variancePercent = Math.round((recipe.variance / recipe.totalSold) * 100);
          
          if (Math.abs(recipe.variancePercent) <= 5) {
            recipe.status = 'matched';
          } else if (recipe.variance > 0) {
            recipe.status = 'over'; // Produced more than sold (surplus stock)
          } else {
            recipe.status = 'under'; // Sold more than produced (possible loss/theft)
          }
        }
      });

      setVarianceData(Array.from(recipeMap.values()));
    } catch (error) {
      console.error('Error fetching variance data:', error);
      toast({
        title: "Error",
        description: "Failed to load batch production variance data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVarianceData();
  }, [outletId]);

  const filteredData = varianceData.filter(item =>
    item.recipeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, variancePercent: number) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Matched</Badge>;
      case 'over':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><TrendingUp className="w-3 h-3 mr-1" />+{variancePercent}% Stock</Badge>;
      case 'under':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><TrendingDown className="w-3 h-3 mr-1" />{Math.abs(variancePercent)}% Short</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><AlertTriangle className="w-3 h-3 mr-1" />Awaiting Sales</Badge>;
    }
  };

  const totals = varianceData.reduce((acc, item) => ({
    produced: acc.produced + item.totalProducedServes,
    sold: acc.sold + item.totalSold,
    liters: acc.liters + item.totalProducedLiters
  }), { produced: 0, sold: 0, liters: 0 });

  const overallVariance = totals.produced - totals.sold;
  // Calculate percentage relative to sold (how much extra/short relative to consumption)
  const overallPercent = totals.sold > 0 ? Math.round((overallVariance / totals.sold) * 100) : 0;

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRecipes: varianceData.length,
        totalProducedLiters: totals.liters.toFixed(1),
        totalProducedServes: totals.produced,
        totalSold: totals.sold,
        overallVariance,
        overallVariancePercent: overallPercent
      },
      recipes: varianceData.map(r => ({
        name: r.recipeName,
        producedLiters: r.totalProducedLiters,
        producedServes: r.totalProducedServes,
        servingMl: r.servingMl,
        sold: r.totalSold,
        variance: r.variance,
        variancePercent: r.variancePercent,
        status: r.status,
        productionCount: r.productions.length
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-variance-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Report exported" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Produced</div>
            <div className="text-2xl font-bold text-primary">{totals.produced}</div>
            <div className="text-xs text-muted-foreground">{totals.liters.toFixed(1)} L</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Sold</div>
            <div className="text-2xl font-bold text-green-400">{totals.sold}</div>
            <div className="text-xs text-muted-foreground">servings</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Variance</div>
            <div className={`text-2xl font-bold ${overallVariance > 0 ? 'text-amber-400' : overallVariance < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {overallVariance > 0 ? '+' : ''}{overallVariance}
            </div>
            <div className="text-xs text-muted-foreground">{overallPercent}%</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Recipes</div>
            <div className="text-2xl font-bold">{varianceData.length}</div>
            <div className="text-xs text-muted-foreground">tracked</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchVarianceData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={exportReport}>
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Recipe Variance List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <Card className="bg-card/30 border-dashed">
              <CardContent className="p-8 text-center">
                <Beaker className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No batch productions found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create batches in the Batch Calculator to start tracking
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredData.map((item) => (
              <Card key={item.recipeName} className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{item.recipeName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {item.servingMl}ml per serve • {item.productions.length} batch{item.productions.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    {getStatusBadge(item.status, item.variancePercent)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Produced</div>
                      <div className="font-medium">{item.totalProducedServes} serves</div>
                      <div className="text-xs text-muted-foreground">{item.totalProducedLiters.toFixed(1)} L</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Sold</div>
                      <div className="font-medium text-green-400">{item.totalSold} serves</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Variance</div>
                      <div className={`font-medium ${item.variance > 0 ? 'text-amber-400' : item.variance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {item.variance > 0 ? '+' : ''}{item.variance}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar showing depletion */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Depletion</span>
                      <span>{item.totalProducedServes > 0 ? Math.min(100, Math.round((item.totalSold / item.totalProducedServes) * 100)) : 0}%</span>
                    </div>
                    <Progress 
                      value={item.totalProducedServes > 0 ? Math.min(100, (item.totalSold / item.totalProducedServes) * 100) : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <Card className="bg-card/30 border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Matched (±5%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Surplus (produced &gt; sold)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Short (sold &gt; produced)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted" />
              <span>No sales data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
