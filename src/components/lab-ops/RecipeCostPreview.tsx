import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Calculator, DollarSign, Percent, Wine, AlertTriangle } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { RecipeCostSummary } from "@/hooks/useRecipeCostCalculator";

interface RecipeCostPreviewProps {
  costSummary: RecipeCostSummary;
  sellingPrice: number;
  showBreakdown?: boolean;
}

export function RecipeCostPreview({ costSummary, sellingPrice, showBreakdown = true }: RecipeCostPreviewProps) {
  const { formatPrice } = useCurrency();
  
  const foodCostPct = costSummary.foodCostPercent(sellingPrice);
  const profitAmount = costSummary.profitAmount(sellingPrice);
  const profitMargin = costSummary.profitMargin(sellingPrice);
  
  const getFoodCostStatus = () => {
    if (foodCostPct <= 25) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Excellent' };
    if (foodCostPct <= 30) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Good' };
    if (foodCostPct <= 35) return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Average' };
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'High' };
  };

  const status = getFoodCostStatus();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calculator className="h-3.5 w-3.5" />
              <span className="text-xs">Recipe Cost</span>
            </div>
            <p className="text-lg font-bold">{formatPrice(costSummary.costPerServe)}</p>
            <p className="text-xs text-muted-foreground">per serve</p>
          </CardContent>
        </Card>

        <Card className={`border-border/50 ${status.bg}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Percent className="h-3.5 w-3.5" />
              <span className="text-xs">Food Cost %</span>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-lg font-bold ${status.color}`}>
                {foodCostPct.toFixed(1)}%
              </p>
              <Badge variant="outline" className={`text-[10px] h-5 ${status.color}`}>
                {status.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs">Suggested Price</span>
            </div>
            <p className="text-lg font-bold text-primary">{formatPrice(costSummary.suggestedPrice)}</p>
            <p className="text-xs text-muted-foreground">28% food cost target</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {profitAmount >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="text-xs">Profit</span>
            </div>
            <p className={`text-lg font-bold ${profitAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPrice(profitAmount)}
            </p>
            <p className="text-xs text-muted-foreground">{profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Info */}
      {costSummary.totalVolumeMl > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Wine className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Total Volume</span>
          </div>
          <span className="font-medium">{costSummary.totalVolumeMl.toFixed(0)} ml</span>
        </div>
      )}

      {/* Ingredient Cost Breakdown */}
      {showBreakdown && costSummary.breakdown.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Cost Breakdown</h4>
            <span className="text-xs text-muted-foreground">{costSummary.breakdown.length} ingredients</span>
          </div>
          
          <div className="space-y-2">
            {costSummary.breakdown
              .sort((a, b) => b.ingredientCost - a.ingredientCost)
              .map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[140px]">{item.ingredientName}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.qty} {item.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPrice(item.ingredientCost)}</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {item.percentOfTotal.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={item.percentOfTotal} className="h-1.5" />
                  {item.servesPerBottle > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      ~{item.servesPerBottle} serves/bottle ({item.bottleSize}ml)
                    </p>
                  )}
                </div>
              ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium">Total Recipe Cost</span>
            <span className="font-bold">{formatPrice(costSummary.totalCost)}</span>
          </div>
        </div>
      )}

      {/* Warning for high food cost */}
      {foodCostPct > 35 && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-500">High Food Cost Warning</p>
            <p className="text-muted-foreground text-xs mt-1">
              Consider increasing price to {formatPrice(costSummary.suggestedPrice)} or reducing ingredient costs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
