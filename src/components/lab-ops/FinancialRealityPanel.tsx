import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, TrendingUp, TrendingDown, Percent, 
  AlertTriangle, Wine, BarChart3, Target, Zap, 
  ArrowUpRight, ArrowDownRight, Droplets
} from 'lucide-react';

interface BrandPerformance {
  spiritType: string;
  totalSalesMl: number;
  totalCostMl: number;
  theoreticalCost: number;
  actualCost: number;
  variance: number;
  variancePct: number;
  grossProfit: number;
  gpPct: number;
  pourCount: number;
}

interface FinancialRealityPanelProps {
  outletId: string;
}

export function FinancialRealityPanel({ outletId }: FinancialRealityPanelProps) {
  const [brandData, setBrandData] = useState<BrandPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [totals, setTotals] = useState({
    trueGP: 0,
    targetGP: 75,
    costLeakage: 0,
    totalRevenue: 0,
    totalCost: 0,
    physicalConsumption: 0,
    virtualSales: 0,
    overallVariance: 0
  });

  useEffect(() => {
    if (outletId) {
      fetchFinancialData();
    }
  }, [outletId, period]);

  const getPeriodDays = () => {
    switch (period) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 7;
    }
  };

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - getPeriodDays());

      // Fetch physical consumption (pourer readings)
      const { data: pourings } = await supabase
        .from('lab_ops_pourer_readings')
        .select(`
          ml_dispensed,
          bottle:lab_ops_bottles(spirit_type, bottle_size_ml)
        `)
        .eq('outlet_id', outletId)
        .gte('reading_timestamp', daysAgo.toISOString());

      // Fetch virtual sales
      const { data: salesData } = await supabase
        .from('lab_ops_sales')
        .select('spirit_type, total_ml_sold, revenue, cost')
        .eq('outlet_id', outletId)
        .gte('sold_at', daysAgo.toISOString());

      // Fetch recipes for cost calculation
      const { data: recipes } = await supabase
        .from('lab_ops_recipes')
        .select('*')
        .eq('outlet_id', outletId);

      const physicalBySpirit: Record<string, number> = {};
      if (pourings) {
        pourings.forEach((p: any) => {
          const spirit = p.lab_ops_bottles?.spirit_type || 'Unknown';
          physicalBySpirit[spirit] = (physicalBySpirit[spirit] || 0) + (p.ml_dispensed || 0);
        });
      }

      const virtualBySpirit: Record<string, { ml: number; revenue: number; cost: number }> = {};
      if (salesData) {
        salesData.forEach((s: any) => {
          const spirit = s.spirit_type || 'Unknown';
        if (!virtualBySpirit[spirit]) {
          virtualBySpirit[spirit] = { ml: 0, revenue: 0, cost: 0 };
        }
        virtualBySpirit[spirit].ml += s.total_ml_sold || 0;
        virtualBySpirit[spirit].revenue += s.revenue || 0;
        virtualBySpirit[spirit].cost += s.cost || 0;
      });

      // Average cost per ml by spirit type (estimated)
      const costPerMl: Record<string, number> = {
        'Vodka': 0.04,
        'Gin': 0.05,
        'Rum': 0.04,
        'Tequila': 0.06,
        'Whiskey': 0.07,
        'Bourbon': 0.06,
        'Scotch': 0.10,
        'Brandy': 0.08,
        'Cognac': 0.15,
        'Liqueur': 0.05,
        'Vermouth': 0.03,
        'Bitters': 0.20,
        'Other': 0.05
      };

      // Calculate brand performance
      const allSpirits = new Set([
        ...Object.keys(physicalBySpirit),
        ...Object.keys(virtualBySpirit)
      ]);

      const brandPerformance: BrandPerformance[] = Array.from(allSpirits).map(spirit => {
        const physicalMl = physicalBySpirit[spirit] || 0;
        const virtual = virtualBySpirit[spirit] || { ml: 0, revenue: 0, cost: 0 };
        const avgCost = costPerMl[spirit] || 0.05;

        const theoreticalCost = virtual.ml * avgCost;
        const actualCost = physicalMl * avgCost;
        const variance = actualCost - theoreticalCost;
        const variancePct = theoreticalCost > 0 ? (variance / theoreticalCost) * 100 : 0;

        const revenue = virtual.revenue || physicalMl * avgCost * 4; // 4x markup assumption
        const grossProfit = revenue - actualCost;
        const gpPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

        return {
          spiritType: spirit,
          totalSalesMl: virtual.ml,
          totalCostMl: physicalMl,
          theoreticalCost,
          actualCost,
          variance,
          variancePct,
          grossProfit,
          gpPct,
          pourCount: (pourings || []).filter((p: any) => p.bottle?.spirit_type === spirit).length
        };
      }).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

      setBrandData(brandPerformance);

      // Calculate totals
      const totalRevenue = brandPerformance.reduce((sum, b) => sum + (b.gpPct > 0 ? b.actualCost * 4 : 0), 0);
      const totalCost = brandPerformance.reduce((sum, b) => sum + b.actualCost, 0);
      const costLeakage = brandPerformance.reduce((sum, b) => sum + Math.max(0, b.variance), 0);
      const physicalTotal = brandPerformance.reduce((sum, b) => sum + b.totalCostMl, 0);
      const virtualTotal = brandPerformance.reduce((sum, b) => sum + b.totalSalesMl, 0);
      const trueGP = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

      setTotals({
        trueGP: Math.round(trueGP * 10) / 10,
        targetGP: 75,
        costLeakage: Math.round(costLeakage * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        physicalConsumption: Math.round(physicalTotal),
        virtualSales: Math.round(virtualTotal),
        overallVariance: physicalTotal - virtualTotal
      });

    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGPColor = (gp: number, target: number) => {
    if (gp >= target) return 'text-green-500';
    if (gp >= target - 10) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getVarianceColor = (variance: number) => {
    if (variance <= 0) return 'text-green-500';
    if (variance < 50) return 'text-yellow-500';
    return 'text-red-500';
  };

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
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Financial Reality</h2>
        </div>
        <div className="flex gap-1">
          {['1d', '7d', '30d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                period === p 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">True GP%</p>
                <p className={`text-2xl font-bold ${getGPColor(totals.trueGP, totals.targetGP)}`}>
                  {totals.trueGP}%
                </p>
                <p className="text-xs text-muted-foreground">Target: {totals.targetGP}%</p>
              </div>
              <Percent className="w-8 h-8 text-primary/50" />
            </div>
            <Progress 
              value={(totals.trueGP / 100) * 100} 
              className="h-1 mt-2"
            />
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totals.costLeakage > 0 ? 'from-red-500/10 to-red-500/5' : 'from-green-500/10 to-green-500/5'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cost Leakage</p>
                <p className={`text-2xl font-bold ${totals.costLeakage > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  €{totals.costLeakage}
                </p>
              </div>
              <TrendingDown className={`w-8 h-8 ${totals.costLeakage > 0 ? 'text-red-500/50' : 'text-green-500/50'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Physical ml</p>
                <p className="text-2xl font-bold text-blue-500">{totals.physicalConsumption}</p>
              </div>
              <Droplets className="w-8 h-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Virtual ml</p>
                <p className="text-2xl font-bold text-green-500">{totals.virtualSales}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Alert */}
      {totals.overallVariance > 100 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">Variance Alert</p>
                <p className="text-sm text-muted-foreground">
                  Physical consumption exceeds virtual sales by {Math.abs(totals.overallVariance)}ml. 
                  This may indicate over-pouring, spillage, or unrecorded consumption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wine className="w-4 h-4 text-primary" />
            Profit by Brand/Spirit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <div className="p-3 space-y-3">
              {brandData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No consumption data yet
                </p>
              ) : (
                brandData.map(brand => (
                  <div 
                    key={brand.spiritType}
                    className={`p-3 rounded-lg border ${
                      brand.variance > 0 
                        ? 'border-red-500/30 bg-red-500/5' 
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wine className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{brand.spiritType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={getGPColor(brand.gpPct, 70)}
                        >
                          GP: {Math.round(brand.gpPct)}%
                        </Badge>
                        {brand.variance > 0 && (
                          <Badge 
                            variant="outline" 
                            className="text-red-500 border-red-500/30"
                          >
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            €{Math.abs(Math.round(brand.variance * 100) / 100)} loss
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Physical</p>
                        <p className="font-semibold">{Math.round(brand.totalCostMl)}ml</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Virtual</p>
                        <p className="font-semibold">{Math.round(brand.totalSalesMl)}ml</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Variance</p>
                        <p className={`font-semibold ${getVarianceColor(brand.variance)}`}>
                          {brand.variance > 0 ? '+' : ''}{Math.round(brand.totalCostMl - brand.totalSalesMl)}ml
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pours</p>
                        <p className="font-semibold">{brand.pourCount}</p>
                      </div>
                    </div>

                    <Progress 
                      value={Math.min(brand.gpPct, 100)} 
                      className="h-1 mt-2"
                    />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}