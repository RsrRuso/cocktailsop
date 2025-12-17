import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Beaker, Plus, RefreshCw, Check, AlertTriangle, 
  TrendingDown, Package 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BatchMenuSyncProps {
  outletId: string;
}

interface BatchRecipe {
  id: string;
  recipe_name: string;
  current_serves: number;
  ingredients: any[];
  totalProduced: number;
  servingMl: number;
  isSynced: boolean;
  menuItemId?: string;
  remainingServes: number;
  totalSold: number;
}

export function BatchMenuSync({ outletId }: BatchMenuSyncProps) {
  const [recipes, setRecipes] = useState<BatchRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all batch recipes with their productions
      const { data: productions, error: prodError } = await supabase
        .from('batch_productions')
        .select(`
          id,
          target_serves,
          target_liters,
          batch_recipes!inner (
            id,
            recipe_name,
            current_serves,
            ingredients
          )
        `);

      if (prodError) throw prodError;

      // Fetch synced menu items
      const { data: menuItems, error: menuError } = await supabase
        .from('lab_ops_menu_items')
        .select('id, name, batch_recipe_id, remaining_serves, total_produced_serves, serving_ml')
        .eq('outlet_id', outletId)
        .not('batch_recipe_id', 'is', null);

      if (menuError) throw menuError;

      // Fetch sales data for synced items
      const { data: salesData, error: salesError } = await supabase
        .from('lab_ops_sales')
        .select('item_name, quantity')
        .eq('outlet_id', outletId);

      if (salesError) throw salesError;

      // Create a map of synced recipe IDs
      const syncedMap = new Map<string, { menuItemId: string; remainingServes: number; totalProduced: number }>();
      menuItems?.forEach(item => {
        if (item.batch_recipe_id) {
          syncedMap.set(item.batch_recipe_id, {
            menuItemId: item.id,
            remainingServes: item.remaining_serves || 0,
            totalProduced: item.total_produced_serves || 0
          });
        }
      });

      // Calculate sales per item name
      const salesMap = new Map<string, number>();
      salesData?.forEach(sale => {
        const name = sale.item_name?.toLowerCase().trim();
        if (name) {
          salesMap.set(name, (salesMap.get(name) || 0) + (sale.quantity || 0));
        }
      });

      // Group productions by recipe
      const recipeMap = new Map<string, BatchRecipe>();
      
      productions?.forEach((prod: any) => {
        const recipe = prod.batch_recipes;
        if (!recipe) return;
        
        const existing = recipeMap.get(recipe.id);
        const ingredients = recipe.ingredients || [];
        const currentServes = recipe.current_serves || 1;
        
        // Calculate total ml from all ml-based ingredients (parse as number to avoid string concatenation)
        const totalMl = ingredients.reduce((sum: number, ing: any) => {
          if (ing.unit === 'ml') return sum + (parseFloat(ing.amount) || 0);
          return sum;
        }, 0);
        
        // Per-serve ml = total ml / number of serves in recipe
        const servingMl = totalMl > 0 ? Math.round(totalMl / currentServes) : 90;

        const syncInfo = syncedMap.get(recipe.id);
        const recipeLower = recipe.recipe_name.toLowerCase().trim();
        const totalSold = salesMap.get(recipeLower) || 0;

        if (existing) {
          existing.totalProduced += prod.target_serves;
        } else {
          recipeMap.set(recipe.id, {
            id: recipe.id,
            recipe_name: recipe.recipe_name,
            current_serves: recipe.current_serves,
            ingredients: recipe.ingredients,
            totalProduced: prod.target_serves,
            servingMl,
            isSynced: !!syncInfo,
            menuItemId: syncInfo?.menuItemId,
            remainingServes: syncInfo ? syncInfo.totalProduced - totalSold : prod.target_serves - totalSold,
            totalSold
          });
        }
      });

      // Update remaining serves for existing entries
      recipeMap.forEach((recipe) => {
        if (!recipe.isSynced) {
          const recipeLower = recipe.recipe_name.toLowerCase().trim();
          const totalSold = salesMap.get(recipeLower) || 0;
          recipe.totalSold = totalSold;
          recipe.remainingServes = recipe.totalProduced - totalSold;
        }
      });

      setRecipes(Array.from(recipeMap.values()));
    } catch (error) {
      console.error('Error fetching batch recipes:', error);
      toast({
        title: "Error",
        description: "Failed to load batch recipes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [outletId]);

  const syncToMenu = async (recipe: BatchRecipe) => {
    setSyncingId(recipe.id);
    try {
      // Check if already synced
      const { data: existing } = await supabase
        .from('lab_ops_menu_items')
        .select('id')
        .eq('outlet_id', outletId)
        .eq('batch_recipe_id', recipe.id)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('lab_ops_menu_items')
          .update({
            total_produced_serves: recipe.totalProduced,
            remaining_serves: recipe.remainingServes,
            serving_ml: recipe.servingMl,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        toast({ title: "Menu item updated" });
      } else {
        // Create new menu item
        await supabase
          .from('lab_ops_menu_items')
          .insert({
            outlet_id: outletId,
            name: recipe.recipe_name,
            batch_recipe_id: recipe.id,
            total_produced_serves: recipe.totalProduced,
            remaining_serves: recipe.remainingServes,
            serving_ml: recipe.servingMl,
            base_price: 0,
            is_bar_item: true,
            item_type: 'drink'
          });

        toast({ title: "Recipe synced to menu!" });
      }

      fetchData();
    } catch (error) {
      console.error('Error syncing recipe:', error);
      toast({
        title: "Error",
        description: "Failed to sync recipe to menu",
        variant: "destructive"
      });
    } finally {
      setSyncingId(null);
    }
  };

  const syncAllToMenu = async () => {
    const unsynced = recipes.filter(r => !r.isSynced);
    for (const recipe of unsynced) {
      await syncToMenu(recipe);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const syncedCount = recipes.filter(r => r.isSynced).length;
  const totalServes = recipes.reduce((sum, r) => sum + r.totalProduced, 0);
  const totalSold = recipes.reduce((sum, r) => sum + r.totalSold, 0);
  const totalRemaining = recipes.reduce((sum, r) => sum + Math.max(0, r.remainingServes), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Batch Recipes</div>
            <div className="text-2xl font-bold">{recipes.length}</div>
            <div className="text-xs text-muted-foreground">{syncedCount} synced</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Produced</div>
            <div className="text-2xl font-bold text-primary">{totalServes}</div>
            <div className="text-xs text-muted-foreground">serves</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Sold</div>
            <div className="text-2xl font-bold text-green-400">{totalSold}</div>
            <div className="text-xs text-muted-foreground">serves</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className={`text-2xl font-bold ${totalRemaining < 10 ? 'text-red-400' : 'text-amber-400'}`}>
              {totalRemaining}
            </div>
            <div className="text-xs text-muted-foreground">serves left</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        {recipes.some(r => !r.isSynced) && (
          <Button size="sm" onClick={syncAllToMenu}>
            <Plus className="w-4 h-4 mr-2" />
            Sync All to Menu
          </Button>
        )}
      </div>

      {/* Recipe List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {recipes.length === 0 ? (
            <Card className="bg-card/30 border-dashed">
              <CardContent className="p-8 text-center">
                <Beaker className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No batch productions found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create batches in the Batch Calculator first
                </p>
              </CardContent>
            </Card>
          ) : (
            recipes.map((recipe) => {
              const depletionPercent = recipe.totalProduced > 0 
                ? Math.min(100, (recipe.totalSold / recipe.totalProduced) * 100) 
                : 0;
              const isLowStock = recipe.remainingServes < 10;
              const isOutOfStock = recipe.remainingServes <= 0;

              return (
                <Card 
                  key={recipe.id} 
                  className={`bg-card/50 border-border/50 hover:bg-card/70 transition-colors ${
                    isOutOfStock ? 'border-red-500/50' : isLowStock ? 'border-amber-500/50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{recipe.recipe_name}</h4>
                          {recipe.isSynced && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <Check className="w-3 h-3 mr-1" />
                              Synced
                            </Badge>
                          )}
                          {isOutOfStock && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Out of Stock
                            </Badge>
                          )}
                          {!isOutOfStock && isLowStock && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {recipe.servingMl}ml per serve
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={recipe.isSynced ? "outline" : "default"}
                        onClick={() => syncToMenu(recipe)}
                        disabled={syncingId === recipe.id}
                      >
                        {syncingId === recipe.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : recipe.isSynced ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Update
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Sync
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Produced</div>
                        <div className="font-medium">{recipe.totalProduced}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Sold</div>
                        <div className="font-medium text-green-400">{recipe.totalSold}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Remaining</div>
                        <div className={`font-medium ${
                          isOutOfStock ? 'text-red-400' : isLowStock ? 'text-amber-400' : 'text-foreground'
                        }`}>
                          {Math.max(0, recipe.remainingServes)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Depletion</span>
                        <span>{Math.round(depletionPercent)}%</span>
                      </div>
                      <Progress 
                        value={depletionPercent}
                        className={`h-2 ${depletionPercent >= 90 ? '[&>div]:bg-red-500' : depletionPercent >= 70 ? '[&>div]:bg-amber-500' : ''}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Info */}
      <Card className="bg-card/30 border-border/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Synced batches appear as menu items. Sales automatically deduct from remaining serves.
              Low stock alerts at &lt;10 serves.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}