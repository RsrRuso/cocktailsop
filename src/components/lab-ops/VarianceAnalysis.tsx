import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, TrendingUp, TrendingDown, Scale, RefreshCw, Download } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface VarianceData {
  spirit: string;
  physical_ml: number;
  virtual_ml: number;
  variance_ml: number;
  variance_pct: number;
}

interface VarianceAnalysisProps {
  outletId: string;
  outletName?: string;
}

export function VarianceAnalysis({ outletId, outletName }: VarianceAnalysisProps) {
  const [varianceData, setVarianceData] = useState<VarianceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [totalStats, setTotalStats] = useState({
    physicalMl: 0,
    virtualMl: 0,
    varianceMl: 0,
    variancePct: 0,
  });

  useEffect(() => {
    if (outletId) {
      calculateVariance();
    }
  }, [outletId, period]);

  const getPeriodRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const calculateVariance = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getPeriodRange();

      // Fetch physical consumption (pourer readings)
      const { data: pourings, error: pourError } = await supabase
        .from('lab_ops_pourer_readings')
        .select(`
          ml_dispensed,
          bottle:lab_ops_bottles(spirit_type)
        `)
        .eq('outlet_id', outletId)
        .gte('reading_timestamp', start.toISOString())
        .lte('reading_timestamp', end.toISOString());

      if (pourError) throw pourError;

      // Fetch virtual consumption (sales)
      const { data: salesData, error: salesError } = await supabase
        .from('lab_ops_sales')
        .select('spirit_type, total_ml_sold')
        .eq('outlet_id', outletId)
        .gte('sold_at', start.toISOString())
        .lte('sold_at', end.toISOString());

      if (salesError) throw salesError;

      // Aggregate physical by spirit type
      const physicalBySpirit: Record<string, number> = {};
      (pourings || []).forEach((p: any) => {
        const spirit = p.bottle?.spirit_type || 'Unknown';
        physicalBySpirit[spirit] = (physicalBySpirit[spirit] || 0) + p.ml_dispensed;
      });

      // Aggregate virtual by spirit type
      const virtualBySpirit: Record<string, number> = {};
      (salesData || []).forEach((s) => {
        const spirit = s.spirit_type || 'Unknown';
        virtualBySpirit[spirit] = (virtualBySpirit[spirit] || 0) + s.total_ml_sold;
      });

      // Combine all spirit types
      const allSpirits = new Set([
        ...Object.keys(physicalBySpirit),
        ...Object.keys(virtualBySpirit),
      ]);

      const variance: VarianceData[] = Array.from(allSpirits).map((spirit) => {
        const physical = physicalBySpirit[spirit] || 0;
        const virtual = virtualBySpirit[spirit] || 0;
        const varMl = physical - virtual;
        const varPct = virtual > 0 ? ((physical - virtual) / virtual) * 100 : 0;

        return {
          spirit,
          physical_ml: physical,
          virtual_ml: virtual,
          variance_ml: varMl,
          variance_pct: varPct,
        };
      });

      setVarianceData(variance.sort((a, b) => Math.abs(b.variance_pct) - Math.abs(a.variance_pct)));

      // Calculate totals
      const totals = variance.reduce(
        (acc, v) => ({
          physicalMl: acc.physicalMl + v.physical_ml,
          virtualMl: acc.virtualMl + v.virtual_ml,
          varianceMl: acc.varianceMl + v.variance_ml,
        }),
        { physicalMl: 0, virtualMl: 0, varianceMl: 0 }
      );

      setTotalStats({
        ...totals,
        variancePct: totals.virtualMl > 0 
          ? ((totals.physicalMl - totals.virtualMl) / totals.virtualMl) * 100 
          : 0,
      });
    } catch (error) {
      console.error('Error calculating variance:', error);
      toast.error('Failed to calculate variance');
    } finally {
      setIsLoading(false);
    }
  };

  const getVarianceStatus = (pct: number) => {
    const absPct = Math.abs(pct);
    if (absPct <= 3) return { color: 'bg-green-500', label: 'Normal', textColor: 'text-green-500' };
    if (absPct <= 7) return { color: 'bg-yellow-500', label: 'Warning', textColor: 'text-yellow-500' };
    return { color: 'bg-red-500', label: 'Critical', textColor: 'text-red-500' };
  };

  const exportReport = () => {
    const { start, end } = getPeriodRange();
    const reportData = {
      outlet: outletName || 'Outlet',
      period: `${format(start, 'PP')} - ${format(end, 'PP')}`,
      totalPhysical: totalStats.physicalMl,
      totalVirtual: totalStats.virtualMl,
      totalVariance: totalStats.varianceMl,
      variancePercentage: totalStats.variancePct,
      breakdown: varianceData,
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variance-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Calculating variance...</div>;
  }

  const overallStatus = getVarianceStatus(totalStats.variancePct);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Variance Analysis
        </h3>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={calculateVariance}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportReport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overall Summary */}
      <Card className={`border-2 ${overallStatus.color.replace('bg-', 'border-')}/50`}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Physical (Poured)</p>
              <p className="text-2xl font-bold">{totalStats.physicalMl.toFixed(0)}ml</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Virtual (Sold)</p>
              <p className="text-2xl font-bold">{totalStats.virtualMl.toFixed(0)}ml</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Variance</p>
              <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${overallStatus.textColor}`}>
                {totalStats.varianceMl > 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : totalStats.varianceMl < 0 ? (
                  <TrendingDown className="h-5 w-5" />
                ) : null}
                {totalStats.varianceMl.toFixed(0)}ml
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Variance %</p>
              <div className="flex items-center justify-center gap-2">
                <p className={`text-2xl font-bold ${overallStatus.textColor}`}>
                  {totalStats.variancePct.toFixed(1)}%
                </p>
                <Badge variant="outline" className={overallStatus.textColor}>
                  {overallStatus.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Spirit */}
      {varianceData.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No data for this period.<br />
              Record some pours and sales to see variance analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {varianceData.map((item) => {
            const status = getVarianceStatus(item.variance_pct);
            return (
              <Card key={item.spirit} className="overflow-hidden">
                <div className={`h-1 ${status.color}`} />
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                      <div>
                        <p className="font-medium">{item.spirit}</p>
                        <p className="text-xs text-muted-foreground">
                          Physical: {item.physical_ml.toFixed(0)}ml | Virtual: {item.virtual_ml.toFixed(0)}ml
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${status.textColor}`}>
                        {item.variance_ml > 0 ? '+' : ''}{item.variance_ml.toFixed(0)}ml
                      </p>
                      <p className={`text-sm ${status.textColor}`}>
                        {item.variance_pct > 0 ? '+' : ''}{item.variance_pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Normal (≤3%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Warning (3-7%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Critical (&gt;7%)</span>
        </div>
      </div>
    </div>
  );
}
