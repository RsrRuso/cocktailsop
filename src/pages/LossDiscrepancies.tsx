import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Search, 
  Droplets, 
  Calendar,
  User,
  Trash2,
  TrendingDown,
  Package,
  FlaskConical,
  Beaker
} from "lucide-react";
import { useBatchProductionLosses, LOSS_REASONS } from "@/hooks/useBatchProductionLosses";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const LossDiscrepancies = () => {
  const navigate = useNavigate();
  const { allLosses, isLoadingAll, deleteLoss, getLossesByIngredient } = useBatchProductionLosses();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLosses = useMemo(() => {
    if (!allLosses) return [];
    if (!searchQuery.trim()) return allLosses;
    
    const query = searchQuery.toLowerCase();
    return allLosses.filter(loss => 
      loss.ingredient_name.toLowerCase().includes(query) ||
      loss.sub_recipe_name?.toLowerCase().includes(query) ||
      loss.loss_reason?.toLowerCase().includes(query) ||
      loss.production?.batch_name?.toLowerCase().includes(query)
    );
  }, [allLosses, searchQuery]);

  const summary = useMemo(() => {
    const losses = filteredLosses || [];
    const totalLossMl = losses.reduce((sum, l) => sum + Number(l.loss_amount_ml), 0);
    const byIngredient = getLossesByIngredient();
    const topIngredients = Object.entries(byIngredient)
      .sort((a, b) => b[1].totalLoss - a[1].totalLoss)
      .slice(0, 5);
    
    // Count by source type
    const batchLosses = losses.filter(l => l.production_id).length;
    const subRecipeLosses = losses.filter(l => l.sub_recipe_production_id).length;
    
    return { totalLossMl, count: losses.length, topIngredients, batchLosses, subRecipeLosses };
  }, [filteredLosses, getLossesByIngredient]);

  const getReasonLabel = (reason: string | null) => {
    if (!reason) return 'Unknown';
    return LOSS_REASONS.find(r => r.value === reason)?.label || reason;
  };

  const getReasonColor = (reason: string | null) => {
    switch (reason) {
      case 'spillage': return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'evaporation': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'quality_issue': return 'bg-orange-500/20 text-orange-700 dark:text-orange-300';
      case 'equipment_residue': return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
      case 'overpouring': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'production_loss': return 'bg-rose-500/20 text-rose-700 dark:text-rose-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isSubRecipeLoss = (loss: typeof filteredLosses[0]) => {
    return !!loss.sub_recipe_production_id;
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Loss Discrepancies
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and manage production losses for inventory balancing
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 glass">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Loss</p>
                <p className="text-lg font-bold text-red-500">
                  {(summary.totalLossMl / 1000).toFixed(2)} L
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Records</p>
                <p className="text-lg font-bold">{summary.count}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Source Type Breakdown */}
        {(summary.batchLosses > 0 || summary.subRecipeLosses > 0) && (
          <div className="flex gap-2 flex-wrap">
            {summary.subRecipeLosses > 0 && (
              <Badge variant="outline" className="flex items-center gap-1.5">
                <FlaskConical className="h-3 w-3 text-primary" />
                Sub-Recipes: {summary.subRecipeLosses}
              </Badge>
            )}
            {summary.batchLosses > 0 && (
              <Badge variant="outline" className="flex items-center gap-1.5">
                <Beaker className="h-3 w-3 text-blue-500" />
                Batch Productions: {summary.batchLosses}
              </Badge>
            )}
          </div>
        )}

        {/* Top Ingredients by Loss */}
        {summary.topIngredients.length > 0 && (
          <Card className="p-4 glass">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Top Ingredients by Loss
            </h3>
            <div className="space-y-2">
              {summary.topIngredients.map(([name, data]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="capitalize text-sm">{name}</span>
                  <Badge variant="outline" className="text-red-500">
                    -{data.totalLoss.toFixed(0)} ml
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ingredient, sub-recipe, reason, or batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Loss Records */}
        <Card className="glass">
          <ScrollArea className="h-[500px]">
            <div className="p-4 space-y-3">
              {isLoadingAll ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading losses...
                </div>
              ) : filteredLosses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No loss records found</p>
                  <p className="text-sm mt-1">
                    Losses will appear here when recorded during sub-recipe or batch production
                  </p>
                </div>
              ) : (
                filteredLosses.map((loss) => (
                  <Card key={loss.id} className="p-4 bg-card/50">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Source indicator */}
                          {isSubRecipeLoss(loss) ? (
                            <FlaskConical className="h-4 w-4 text-primary" />
                          ) : (
                            <Beaker className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium">{loss.ingredient_name}</span>
                          <Badge variant="destructive" className="text-xs">
                            -{loss.loss_amount_ml} ml
                          </Badge>
                          {loss.loss_reason && (
                            <Badge className={`text-xs ${getReasonColor(loss.loss_reason)}`}>
                              {getReasonLabel(loss.loss_reason)}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show yield comparison for sub-recipe losses */}
                        {isSubRecipeLoss(loss) && loss.expected_yield_ml && loss.actual_yield_ml && (
                          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-block">
                            Expected: {loss.expected_yield_ml}ml → Actual: {loss.actual_yield_ml}ml
                          </div>
                        )}
                        
                        {/* Show batch name for batch production losses */}
                        {loss.production?.batch_name && (
                          <p className="text-sm text-muted-foreground">
                            Batch: {loss.production.batch_name}
                          </p>
                        )}
                        
                        {/* Show sub-recipe name */}
                        {loss.sub_recipe_name && (
                          <p className="text-sm text-muted-foreground">
                            Sub-Recipe: {loss.sub_recipe_name}
                          </p>
                        )}
                        
                        {loss.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            "{loss.notes}"
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(loss.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                          {loss.recorded_by_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {loss.recorded_by_name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Loss Record?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this loss record. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteLoss(loss.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default LossDiscrepancies;
