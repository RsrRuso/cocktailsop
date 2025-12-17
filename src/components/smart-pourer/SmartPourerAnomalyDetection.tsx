import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  AlertTriangle, ShieldAlert, Clock, Zap, TrendingUp, 
  Eye, Check, X, RefreshCw, Brain, Activity
} from 'lucide-react';
import { format, subHours, differenceInMinutes } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: string;
  detected_at: string;
  details: any;
  dismissed: boolean;
  reviewed_at: string | null;
  notes: string | null;
  device?: { device_code: string };
  sku?: { name: string };
}

const ANOMALY_CONFIG = {
  rapid_pours: { icon: Zap, label: 'Rapid Pours', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  unusual_volume: { icon: TrendingUp, label: 'Unusual Volume', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  after_hours: { icon: Clock, label: 'After Hours', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  device_tampering: { icon: ShieldAlert, label: 'Device Tampering', color: 'text-red-500', bg: 'bg-red-500/10' },
  stock_mismatch: { icon: AlertTriangle, label: 'Stock Mismatch', color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

interface SmartPourerAnomalyDetectionProps {
  outletId: string;
}

export function SmartPourerAnomalyDetection({ outletId }: SmartPourerAnomalyDetectionProps) {
  const { user } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (outletId) {
      fetchAnomalies();
      // Subscribe to real-time anomaly updates
      const channel = supabase
        .channel('anomaly-updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_pourer_anomaly_logs',
          filter: `outlet_id=eq.${outletId}`
        }, (payload) => {
          toast.warning('New anomaly detected!', { description: (payload.new as any).anomaly_type });
          fetchAnomalies();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [outletId]);

  const fetchAnomalies = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('smart_pourer_anomaly_logs')
        .select(`
          *,
          device:smart_pourer_devices(device_code),
          sku:smart_pourer_skus(name)
        `)
        .eq('outlet_id', outletId)
        .eq('dismissed', false)
        .order('detected_at', { ascending: false })
        .limit(50);

      setAnomalies((data as any) || []);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnomalyAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const last24h = subHours(new Date(), 24);
      
      // Fetch recent pour events
      const { data: pourEvents } = await supabase
        .from('smart_pourer_pour_events')
        .select('*, device:smart_pourer_devices(device_code)')
        .eq('outlet_id', outletId)
        .gte('started_at', last24h.toISOString())
        .order('started_at', { ascending: true });

      const events = pourEvents || [];
      const newAnomalies: any[] = [];

      // Analysis 1: Rapid Pours (multiple pours within 30 seconds from same device)
      const byDevice: Record<string, any[]> = {};
      events.forEach(e => {
        if (!byDevice[e.device_id]) byDevice[e.device_id] = [];
        byDevice[e.device_id].push(e);
      });

      Object.entries(byDevice).forEach(([deviceId, deviceEvents]) => {
        for (let i = 1; i < deviceEvents.length; i++) {
          const timeDiff = differenceInMinutes(
            new Date(deviceEvents[i].started_at),
            new Date(deviceEvents[i-1].started_at)
          );
          if (timeDiff < 0.5) { // Less than 30 seconds
            newAnomalies.push({
              outlet_id: outletId,
              device_id: deviceId,
              anomaly_type: 'rapid_pours',
              severity: 'warning',
              details: { 
                event1: deviceEvents[i-1].id, 
                event2: deviceEvents[i].id,
                time_between_seconds: timeDiff * 60 
              }
            });
          }
        }
      });

      // Analysis 2: Unusual Volume (pours > 100ml or < 10ml)
      events.forEach(e => {
        if (e.poured_ml > 100 || (e.poured_ml < 10 && e.poured_ml > 0)) {
          newAnomalies.push({
            outlet_id: outletId,
            device_id: e.device_id,
            sku_id: e.sku_id,
            anomaly_type: 'unusual_volume',
            severity: e.poured_ml > 150 ? 'critical' : 'warning',
            details: { poured_ml: e.poured_ml, event_id: e.id }
          });
        }
      });

      // Analysis 3: After Hours Activity (between 3am-6am)
      events.forEach(e => {
        const hour = new Date(e.started_at).getHours();
        if (hour >= 3 && hour < 6) {
          newAnomalies.push({
            outlet_id: outletId,
            device_id: e.device_id,
            anomaly_type: 'after_hours',
            severity: 'info',
            details: { time: e.started_at, event_id: e.id }
          });
        }
      });

      // Analysis 4: Error flag events (potential tampering)
      const errorEvents = events.filter(e => e.error_flag);
      if (errorEvents.length > 3) {
        newAnomalies.push({
          outlet_id: outletId,
          anomaly_type: 'device_tampering',
          severity: 'critical',
          details: { error_count: errorEvents.length, events: errorEvents.map(e => e.id) }
        });
      }

      // Insert new anomalies
      if (newAnomalies.length > 0) {
        await supabase.from('smart_pourer_anomaly_logs').insert(newAnomalies);
        toast.success(`Found ${newAnomalies.length} potential anomalies`);
      } else {
        toast.success('No anomalies detected');
      }

      fetchAnomalies();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const dismissAnomaly = async (id: string) => {
    try {
      await supabase.from('smart_pourer_anomaly_logs').update({
        dismissed: true,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        notes: reviewNotes || null
      }).eq('id', id);

      toast.success('Anomaly dismissed');
      setSelectedAnomaly(null);
      setReviewNotes('');
      fetchAnomalies();
    } catch (error) {
      toast.error('Failed to dismiss');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Warning</Badge>;
      default: return <Badge variant="outline">Info</Badge>;
    }
  };

  const getAnomalyConfig = (type: string) => {
    return ANOMALY_CONFIG[type as keyof typeof ANOMALY_CONFIG] || {
      icon: AlertTriangle, label: type, color: 'text-muted-foreground', bg: 'bg-muted'
    };
  };

  const stats = {
    critical: anomalies.filter(a => a.severity === 'critical').length,
    warning: anomalies.filter(a => a.severity === 'warning').length,
    total: anomalies.length
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading anomaly data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Anomaly Detection
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runAnomalyAnalysis} disabled={isAnalyzing}>
            <Activity className="h-4 w-4 mr-1" />
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchAnomalies}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={stats.critical > 0 ? 'border-red-500/50' : ''}>
          <CardContent className="pt-4 text-center">
            <p className={`text-2xl font-bold ${stats.critical > 0 ? 'text-red-500' : ''}`}>
              {stats.critical}
            </p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className={stats.warning > 0 ? 'border-yellow-500/50' : ''}>
          <CardContent className="pt-4 text-center">
            <p className={`text-2xl font-bold ${stats.warning > 0 ? 'text-yellow-500' : ''}`}>
              {stats.warning}
            </p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly List */}
      {anomalies.length === 0 ? (
        <Card className="bg-green-500/5 border-green-500/30">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-green-500 font-medium">All Clear</p>
            <p className="text-sm text-muted-foreground">No anomalies detected</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {anomalies.map(anomaly => {
              const config = getAnomalyConfig(anomaly.anomaly_type);
              const IconComponent = config.icon;
              
              return (
                <Card key={anomaly.id} className={`${config.bg} border-l-4 ${config.color.replace('text-', 'border-')}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <IconComponent className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{config.label}</p>
                            {getSeverityBadge(anomaly.severity)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {anomaly.device?.device_code && `Device: ${anomaly.device.device_code} • `}
                            {anomaly.sku?.name && `SKU: ${anomaly.sku.name} • `}
                            {format(new Date(anomaly.detected_at), 'PPp')}
                          </p>
                          {anomaly.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(anomaly.details).slice(0, 80)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedAnomaly(anomaly)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Review Anomaly
            </DialogTitle>
          </DialogHeader>
          {selectedAnomaly && (
            <div className="space-y-4 pt-4">
              <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{getAnomalyConfig(selectedAnomaly.anomaly_type).label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Severity:</span>
                  {getSeverityBadge(selectedAnomaly.severity)}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Detected:</span>
                  <span>{format(new Date(selectedAnomaly.detected_at), 'PPp')}</span>
                </div>
              </div>

              {selectedAnomaly.details && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Details:</p>
                  <pre className="text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedAnomaly.details, null, 2)}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Review Notes</p>
                <Textarea
                  placeholder="Add notes about this anomaly..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAnomaly(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Close
                </Button>
                <Button onClick={() => dismissAnomaly(selectedAnomaly.id)}>
                  <Check className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
