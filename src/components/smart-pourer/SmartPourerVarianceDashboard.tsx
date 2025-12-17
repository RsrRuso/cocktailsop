import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scale, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Download, FileText, CheckCircle2 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface VarianceData { sku_id: string; sku_name: string; measured_ml: number; expected_ml: number; variance_ml: number; variance_pct: number; cost_per_ml: number; variance_cost: number; }

const VARIANCE_REASONS = [
  { value: 'overpouring', label: 'Over-pouring' }, { value: 'spillage', label: 'Spillage' }, { value: 'staff_drinks', label: 'Staff Drinks' },
  { value: 'complimentary', label: 'Complimentary' }, { value: 'event_tasting', label: 'Event / Tasting' }, { value: 'device_issue', label: 'Device Issue' },
];

interface SmartPourerVarianceDashboardProps { outletId: string; outletName?: string; }

export function SmartPourerVarianceDashboard({ outletId, outletName }: SmartPourerVarianceDashboardProps) {
  const { user } = useAuth();
  const [varianceData, setVarianceData] = useState<VarianceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [isExplainDialogOpen, setIsExplainDialogOpen] = useState(false);
  const [selectedVariance, setSelectedVariance] = useState<VarianceData | null>(null);
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [totalStats, setTotalStats] = useState({ measuredMl: 0, expectedMl: 0, varianceMl: 0, variancePct: 0, varianceCost: 0 });

  useEffect(() => { if (outletId) calculateVariance(); }, [outletId, period]);

  const getPeriodRange = () => {
    const now = new Date();
    switch (period) {
      case 'today': return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case 'week': return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month': return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default: return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const calculateVariance = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getPeriodRange();
      const { data: pourEvents } = await supabase.from('smart_pourer_pour_events').select('poured_ml, sku_id, sku:smart_pourer_skus(name, cost_per_ml)').gte('started_at', start.toISOString()).lte('started_at', end.toISOString()).eq('error_flag', false);
      
      const measuredBySku: Record<string, { ml: number; name: string; costPerMl: number }> = {};
      (pourEvents || []).forEach((p: any) => {
        if (p.sku_id) {
          if (!measuredBySku[p.sku_id]) measuredBySku[p.sku_id] = { ml: 0, name: p.sku?.name || 'Unknown', costPerMl: p.sku?.cost_per_ml || 0 };
          measuredBySku[p.sku_id].ml += p.poured_ml || 0;
        }
      });

      const variance: VarianceData[] = Object.entries(measuredBySku).map(([skuId, data]) => ({
        sku_id: skuId, sku_name: data.name, measured_ml: data.ml, expected_ml: 0, variance_ml: data.ml, variance_pct: 0, cost_per_ml: data.costPerMl, variance_cost: data.ml * data.costPerMl,
      }));

      setVarianceData(variance.sort((a, b) => b.variance_ml - a.variance_ml));
      const totals = variance.reduce((acc, v) => ({ measuredMl: acc.measuredMl + v.measured_ml, expectedMl: acc.expectedMl + v.expected_ml, varianceMl: acc.varianceMl + v.variance_ml, varianceCost: acc.varianceCost + v.variance_cost }), { measuredMl: 0, expectedMl: 0, varianceMl: 0, varianceCost: 0 });
      setTotalStats({ ...totals, variancePct: totals.expectedMl > 0 ? ((totals.measuredMl - totals.expectedMl) / totals.expectedMl) * 100 : 0 });
    } catch (error) { toast.error('Failed to calculate variance'); } finally { setIsLoading(false); }
  };

  const handleSubmitExplanation = async () => {
    if (!selectedVariance || !reason) { toast.error('Please select a reason'); return; }
    try {
      await supabase.from('smart_pourer_variance_logs').insert({ outlet_id: outletId, sku_id: selectedVariance.sku_id, variance_date: new Date().toISOString().split('T')[0], variance_ml: selectedVariance.variance_ml, measured_ml: selectedVariance.measured_ml, expected_ml: selectedVariance.expected_ml, variance_type: 'consumption', reason, reason_notes: explanation, manager_id: user?.id });
      toast.success('Variance explanation logged');
      setIsExplainDialogOpen(false); setSelectedVariance(null); setReason(''); setExplanation('');
    } catch (error) { toast.error('Failed to log explanation'); }
  };

  const getVarianceStatus = (pct: number) => {
    const absPct = Math.abs(pct);
    if (absPct <= 3) return { color: 'bg-green-500', label: 'Normal', textColor: 'text-green-500' };
    if (absPct <= 7) return { color: 'bg-yellow-500', label: 'Warning', textColor: 'text-yellow-500' };
    return { color: 'bg-red-500', label: 'Critical', textColor: 'text-red-500' };
  };

  const exportReport = () => {
    const { start, end } = getPeriodRange();
    const blob = new Blob([JSON.stringify({ outlet: outletName, period: `${format(start, 'PP')} - ${format(end, 'PP')}`, summary: totalStats, breakdown: varianceData }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `variance-${format(new Date(), 'yyyy-MM-dd')}.json`; a.click();
    toast.success('Report downloaded');
  };

  if (isLoading) return <div className="flex items-center justify-center p-8">Calculating variance...</div>;
  const overallStatus = getVarianceStatus(totalStats.variancePct);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Scale className="h-5 w-5 text-amber-500" />Variance Dashboard</h3>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="yesterday">Yesterday</SelectItem><SelectItem value="week">Last 7 Days</SelectItem><SelectItem value="month">Last 30 Days</SelectItem></SelectContent></Select>
          <Button variant="outline" size="icon" onClick={calculateVariance}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={exportReport}><Download className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card className={`border-2 ${overallStatus.color.replace('bg-', 'border-')}/50`}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center"><p className="text-sm text-muted-foreground">Measured</p><p className="text-2xl font-bold">{totalStats.measuredMl.toFixed(0)}ml</p></div>
            <div className="text-center"><p className="text-sm text-muted-foreground">Expected (SOP)</p><p className="text-2xl font-bold">{totalStats.expectedMl.toFixed(0)}ml</p></div>
            <div className="text-center"><p className="text-sm text-muted-foreground">Variance</p><p className={`text-2xl font-bold flex items-center justify-center gap-1 ${overallStatus.textColor}`}>{totalStats.varianceMl > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}{totalStats.varianceMl.toFixed(0)}ml</p></div>
            <div className="text-center"><p className="text-sm text-muted-foreground">Variance %</p><div className="flex items-center justify-center gap-2"><p className={`text-2xl font-bold ${overallStatus.textColor}`}>{totalStats.variancePct.toFixed(1)}%</p><Badge variant="outline" className={overallStatus.textColor}>{overallStatus.label}</Badge></div></div>
            <div className="text-center"><p className="text-sm text-muted-foreground">Cost Impact</p><p className={`text-2xl font-bold ${totalStats.varianceCost > 0 ? 'text-red-500' : 'text-green-500'}`}>${Math.abs(totalStats.varianceCost).toFixed(2)}</p></div>
          </div>
        </CardContent>
      </Card>

      {varianceData.length === 0 ? (
        <Card className="bg-muted/30"><CardContent className="flex flex-col items-center justify-center py-8"><Scale className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground text-center">No variance data for this period.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {varianceData.map((item) => {
            const status = getVarianceStatus(item.variance_pct);
            const needsExplanation = Math.abs(item.variance_pct) > 7;
            return (
              <Card key={item.sku_id} className="overflow-hidden">
                <div className={`h-1 ${status.color}`} />
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${status.color}`} /><div><p className="font-medium">{item.sku_name}</p><p className="text-xs text-muted-foreground">Measured: {item.measured_ml.toFixed(0)}ml | Expected: {item.expected_ml.toFixed(0)}ml</p></div></div>
                    <div className="flex items-center gap-3">
                      <div className="text-right"><p className={`font-bold ${status.textColor}`}>{item.variance_ml > 0 ? '+' : ''}{item.variance_ml.toFixed(0)}ml</p><p className={`text-sm ${status.textColor}`}>{item.variance_pct > 0 ? '+' : ''}{item.variance_pct.toFixed(1)}%</p></div>
                      {needsExplanation && <Button size="sm" variant="outline" className="text-yellow-500 border-yellow-500/50" onClick={() => { setSelectedVariance(item); setIsExplainDialogOpen(true); }}><FileText className="h-4 w-4 mr-1" />Explain</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isExplainDialogOpen} onOpenChange={setIsExplainDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Explain Variance - {selectedVariance?.sku_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted/30 rounded-lg"><div className="flex justify-between text-sm"><span>Variance:</span><span className="font-bold text-red-500">{selectedVariance?.variance_ml.toFixed(0)}ml (${selectedVariance?.variance_cost.toFixed(2)})</span></div></div>
            <div className="space-y-2"><Label>Reason *</Label><Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger><SelectContent>{VARIANCE_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Additional Explanation</Label><Textarea placeholder="Provide any additional context..." value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} /></div>
            <DialogFooter><Button variant="outline" onClick={() => setIsExplainDialogOpen(false)}>Cancel</Button><Button onClick={handleSubmitExplanation}><CheckCircle2 className="h-4 w-4 mr-2" />Submit</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
