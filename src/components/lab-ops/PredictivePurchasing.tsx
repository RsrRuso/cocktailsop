import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, TrendingUp, AlertTriangle, Calendar,
  Package, Truck, DollarSign, Clock, ArrowRight,
  CheckCircle, XCircle, Sparkles
} from 'lucide-react';

interface PredictedOrder {
  id: string;
  itemName: string;
  spiritType: string;
  currentStock: number;
  averageDailyUsage: number;
  daysUntilEmpty: number;
  suggestedOrderQty: number;
  estimatedCost: number;
  urgency: 'critical' | 'soon' | 'planned';
  lastOrderDate?: string;
  supplier?: string;
}

interface PredictivePurchasingProps {
  outletId: string;
}

export function PredictivePurchasing({ outletId }: PredictivePurchasingProps) {
  const [predictions, setPredictions] = useState<PredictedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'all' | 'critical' | 'planned'>('all');

  useEffect(() => {
    if (outletId) {
      generatePredictions();
    }
  }, [outletId]);

  const generatePredictions = async () => {
    setIsLoading(true);
    try {
      // Fetch current inventory and historical consumption
      const [bottlesRes, salesRes] = await Promise.all([
        supabase.from('lab_ops_bottles').select('id, spirit_type, current_level_ml, bottle_size_ml').eq('outlet_id', outletId),
        supabase.from('lab_ops_sales').select('spirit_type, total_ml_sold').eq('outlet_id', outletId).gte('sold_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const bottles = bottlesRes.data || [];
      const sales = salesRes.data || [];

      // Calculate average daily usage by spirit type
      const usageBySpirit: Record<string, { totalMl: number; days: number }> = {};
      sales.forEach((sale: any) => {
        const spirit = sale.spirit_type || 'Unknown';
        if (!usageBySpirit[spirit]) {
          usageBySpirit[spirit] = { totalMl: 0, days: 30 };
        }
        usageBySpirit[spirit].totalMl += sale.total_ml_sold || 0;
      });

      // Generate predictions
      const spiritTypes = [...new Set([
        ...bottles.map((b: any) => b.spirit_type),
        ...Object.keys(usageBySpirit)
      ])].filter(Boolean);

      const predictedOrders: PredictedOrder[] = spiritTypes.map((spirit, index) => {
        const spiritBottles = bottles.filter((b: any) => b.spirit_type === spirit);
        const currentStock = spiritBottles.reduce((sum: number, b: any) => sum + (b.current_level_ml || 0), 0);
        const usage = usageBySpirit[spirit] || { totalMl: 0, days: 30 };
        const avgDailyUsage = usage.totalMl / usage.days || 50; // Default 50ml/day if no data
        const daysUntilEmpty = currentStock > 0 ? Math.floor(currentStock / avgDailyUsage) : 0;
        
        // Calculate suggested order (2 weeks supply)
        const suggestedQty = Math.ceil((avgDailyUsage * 14 - currentStock) / 750) * 750; // Round to bottles (750ml)
        
        // Estimate cost (rough estimate)
        const costPerMl = spirit === 'Vodka' ? 0.04 : spirit === 'Whiskey' ? 0.07 : 0.05;
        const estimatedCost = Math.max(0, suggestedQty * costPerMl);

        let urgency: 'critical' | 'soon' | 'planned' = 'planned';
        if (daysUntilEmpty <= 3) urgency = 'critical';
        else if (daysUntilEmpty <= 7) urgency = 'soon';

        return {
          id: `pred-${index}`,
          itemName: `${spirit} Stock`,
          spiritType: spirit,
          currentStock: Math.round(currentStock),
          averageDailyUsage: Math.round(avgDailyUsage),
          daysUntilEmpty,
          suggestedOrderQty: Math.max(0, suggestedQty),
          estimatedCost: Math.round(estimatedCost * 100) / 100,
          urgency,
          supplier: ['Premium Spirits', 'Metro Wholesale', 'Direct Import'][index % 3]
        };
      }).filter(p => p.suggestedOrderQty > 0).sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);

      setPredictions(predictedOrders);
    } catch (error) {
      console.error('Error generating predictions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'soon': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-green-500 bg-green-500/10 border-green-500/30';
    }
  };

  const filteredPredictions = predictions.filter(p => {
    if (view === 'all') return true;
    if (view === 'critical') return p.urgency === 'critical' || p.urgency === 'soon';
    return p.urgency === 'planned';
  });

  const totalEstimatedCost = filteredPredictions
    .filter(p => selectedItems.has(p.id))
    .reduce((sum, p) => sum + p.estimatedCost, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Predictive Purchasing</h2>
        </div>
        <div className="flex gap-1">
          {['all', 'critical', 'planned'].map(v => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView(v as any)}
              className="text-xs"
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-500">
              {predictions.filter(p => p.urgency === 'critical').length}
            </p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-yellow-500">
              {predictions.filter(p => p.urgency === 'soon').length}
            </p>
            <p className="text-xs text-muted-foreground">Order Soon</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 text-center">
            <Calendar className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-500">
              {predictions.filter(p => p.urgency === 'planned').length}
            </p>
            <p className="text-xs text-muted-foreground">Planned</p>
          </CardContent>
        </Card>
      </div>

      {/* Predictions List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Reorder Predictions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 space-y-3">
              {filteredPredictions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No reorder predictions at this time
                </p>
              ) : (
                filteredPredictions.map(pred => (
                  <div
                    key={pred.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedItems.has(pred.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                    onClick={() => toggleSelect(pred.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          selectedItems.has(pred.id) ? 'bg-primary' : 'bg-muted'
                        }`}>
                          {selectedItems.has(pred.id) ? (
                            <CheckCircle className="w-4 h-4 text-primary-foreground" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{pred.itemName}</p>
                          <p className="text-xs text-muted-foreground">{pred.supplier}</p>
                        </div>
                      </div>
                      <Badge className={getUrgencyColor(pred.urgency)}>
                        {pred.daysUntilEmpty}d left
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                      <div>
                        <p className="text-muted-foreground">Current</p>
                        <p className="font-semibold">{pred.currentStock}ml</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Daily Use</p>
                        <p className="font-semibold">{pred.averageDailyUsage}ml</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Order Qty</p>
                        <p className="font-semibold text-primary">{pred.suggestedOrderQty}ml</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Est. Cost</p>
                        <p className="font-semibold">€{pred.estimatedCost}</p>
                      </div>
                    </div>

                    <Progress 
                      value={Math.min(100, (pred.daysUntilEmpty / 14) * 100)} 
                      className="h-1"
                    />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Footer */}
      {selectedItems.size > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedItems.size} items selected</p>
                <p className="text-sm text-muted-foreground">
                  Estimated total: <span className="text-primary font-bold">€{totalEstimatedCost.toFixed(2)}</span>
                </p>
              </div>
              <Button className="gap-2">
                <Truck className="w-4 h-4" />
                Create Order
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
