import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Activity, Wine, Droplets, Clock, AlertTriangle, 
  BatteryLow, TrendingUp, Users, Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PourEvent {
  id: string;
  device_id: string;
  bottle_id: string | null;
  sku_id: string | null;
  poured_ml: number;
  started_at: string;
  error_flag: boolean;
  device?: { display_name: string | null; device_code: string };
  bottle?: { sku?: { spirit_name: string; brand: string | null } };
}

interface LiveStats {
  totalPours: number;
  totalMl: number;
  activeDevices: number;
  lowBatteryDevices: number;
  errorPours: number;
}

interface SmartPourerLiveBarViewProps {
  outletId: string;
}

export function SmartPourerLiveBarView({ outletId }: SmartPourerLiveBarViewProps) {
  const [recentPours, setRecentPours] = useState<PourEvent[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalPours: 0,
    totalMl: 0,
    activeDevices: 0,
    lowBatteryDevices: 0,
    errorPours: 0,
  });
  const [topSkus, setTopSkus] = useState<{ name: string; count: number; ml: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (outletId) {
      fetchLiveData();
      subscribeToLiveEvents();
    }
  }, [outletId]);

  const fetchLiveData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's pour events
      const { data: pours, error: poursError } = await supabase
        .from('smart_pourer_pour_events')
        .select(`
          *,
          device:smart_pourer_devices(display_name, device_code),
          bottle:smart_pourer_bottles(sku:smart_pourer_skus(spirit_name, brand))
        `)
        .gte('started_at', today.toISOString())
        .order('started_at', { ascending: false })
        .limit(50);

      if (poursError) throw poursError;

      // Fetch device stats
      const { data: devices } = await supabase
        .from('smart_pourer_devices')
        .select('status, battery_level')
        .eq('outlet_id', outletId);

      // Calculate stats
      const pourData = pours || [];
      const totalMl = pourData.reduce((sum, p) => sum + (p.poured_ml || 0), 0);
      const errorPours = pourData.filter(p => p.error_flag).length;
      const activeDevices = devices?.filter(d => d.status === 'active').length || 0;
      const lowBatteryDevices = devices?.filter(d => d.battery_level < 20).length || 0;

      // Calculate top SKUs
      const skuMap = new Map<string, { name: string; count: number; ml: number }>();
      pourData.forEach(p => {
        const name = p.bottle?.sku?.spirit_name || 'Unknown';
        const existing = skuMap.get(name) || { name, count: 0, ml: 0 };
        existing.count += 1;
        existing.ml += p.poured_ml || 0;
        skuMap.set(name, existing);
      });

      const topSkusList = Array.from(skuMap.values())
        .sort((a, b) => b.ml - a.ml)
        .slice(0, 5);

      setRecentPours(pourData);
      setLiveStats({
        totalPours: pourData.length,
        totalMl,
        activeDevices,
        lowBatteryDevices,
        errorPours,
      });
      setTopSkus(topSkusList);
    } catch (error) {
      console.error('Error fetching live data:', error);
      toast.error('Failed to load live data');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToLiveEvents = () => {
    const channel = supabase
      .channel('smart-pourer-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'smart_pourer_pour_events',
      }, (payload) => {
        // Add new pour event to the list
        fetchLiveData();
        
        // Show toast for new pour
        const pour = payload.new as any;
        toast.info(`Pour recorded: ${pour.poured_ml}ml`, {
          description: 'New pour event detected',
          duration: 3000,
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading live data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-green-500 animate-pulse" />
        <h3 className="text-lg font-semibold">Live Bar View</h3>
        <Badge variant="outline" className="ml-auto">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Droplets className="h-4 w-4" />
              <span className="text-xs font-medium">Today's Pours</span>
            </div>
            <p className="text-2xl font-bold">{liveStats.totalPours}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-purple-500 mb-1">
              <Wine className="h-4 w-4" />
              <span className="text-xs font-medium">Total Volume</span>
            </div>
            <p className="text-2xl font-bold">{(liveStats.totalMl / 1000).toFixed(1)}L</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs font-medium">Active Devices</span>
            </div>
            <p className="text-2xl font-bold">{liveStats.activeDevices}</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${liveStats.lowBatteryDevices > 0 ? 'from-orange-500/10 to-orange-600/5' : 'from-muted/10 to-muted/5'}`}>
          <CardContent className="pt-4">
            <div className={`flex items-center gap-2 ${liveStats.lowBatteryDevices > 0 ? 'text-orange-500' : 'text-muted-foreground'} mb-1`}>
              <BatteryLow className="h-4 w-4" />
              <span className="text-xs font-medium">Low Battery</span>
            </div>
            <p className="text-2xl font-bold">{liveStats.lowBatteryDevices}</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${liveStats.errorPours > 0 ? 'from-red-500/10 to-red-600/5' : 'from-muted/10 to-muted/5'}`}>
          <CardContent className="pt-4">
            <div className={`flex items-center gap-2 ${liveStats.errorPours > 0 ? 'text-red-500' : 'text-muted-foreground'} mb-1`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">Errors</span>
            </div>
            <p className="text-2xl font-bold">{liveStats.errorPours}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top SKUs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Products Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSkus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pours recorded today</p>
            ) : (
              <div className="space-y-3">
                {topSkus.map((sku, idx) => {
                  const maxMl = topSkus[0]?.ml || 1;
                  const percentage = (sku.ml / maxMl) * 100;
                  
                  return (
                    <div key={sku.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-500 text-yellow-950' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-amber-600 text-amber-50' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-medium">{sku.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {sku.count} pours • {sku.ml}ml
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Pours Feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Pours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px]">
              {recentPours.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pours recorded today</p>
              ) : (
                <div className="divide-y divide-border">
                  {recentPours.slice(0, 15).map((pour) => (
                    <div key={pour.id} className={`px-4 py-2 flex items-center justify-between ${pour.error_flag ? 'bg-red-500/5' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          pour.error_flag ? 'bg-red-500/20 text-red-500' : 'bg-primary/10 text-primary'
                        }`}>
                          <Droplets className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {pour.bottle?.sku?.spirit_name || 'Unknown Product'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pour.device?.display_name || pour.device?.device_code || 'Unknown Device'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{pour.poured_ml}ml</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(pour.started_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
