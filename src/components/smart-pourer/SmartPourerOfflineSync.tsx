import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Wifi, WifiOff, Cloud, CloudOff, RefreshCw, 
  Upload, Check, AlertCircle, Trash2, Database
} from 'lucide-react';

interface QueuedEvent {
  id: string;
  device_code: string;
  pour_data: any;
  queued_at: string;
  sync_attempts: number;
  sync_error: string | null;
}

interface SmartPourerOfflineSyncProps {
  outletId: string;
}

export function SmartPourerOfflineSync({ outletId }: SmartPourerOfflineSyncProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedEvents, setQueuedEvents] = useState<QueuedEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!');
      syncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Events will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchQueue = async () => {
    try {
      const { data } = await supabase
        .from('smart_pourer_offline_queue')
        .select('*')
        .eq('outlet_id', outletId)
        .is('synced_at', null)
        .order('queued_at', { ascending: true });

      setQueuedEvents((data as any) || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const syncQueue = async () => {
    if (!isOnline || queuedEvents.length === 0) return;

    setIsSyncing(true);
    setSyncProgress(0);

    let synced = 0;
    const total = queuedEvents.length;

    for (const event of queuedEvents) {
      try {
        // Validate device and create pour event
        const { data: device } = await supabase
          .from('smart_pourer_devices')
          .select('id')
          .eq('device_code', event.device_code)
          .eq('outlet_id', outletId)
          .single();

        if (device) {
          // Get active pairing
          const { data: pairing } = await supabase
            .from('smart_pourer_device_pairings')
            .select('id, bottle_id, bottle:smart_pourer_bottles(sku_id)')
            .eq('device_id', device.id)
            .eq('is_active', true)
            .single();

          if (pairing) {
            // Insert pour event
            await supabase.from('smart_pourer_pour_events').insert({
              device_id: device.id,
              bottle_id: pairing.bottle_id,
              sku_id: (pairing.bottle as any)?.sku_id,
              pairing_id: pairing.id,
              poured_ml: event.pour_data.poured_ml,
              pulse_count: event.pour_data.pulse_count,
              started_at: event.pour_data.started_at || event.queued_at,
              battery: event.pour_data.battery,
              outlet_id: outletId,
              synced_from_offline: true,
              error_flag: false
            });

            // Mark as synced
            await supabase
              .from('smart_pourer_offline_queue')
              .update({ synced_at: new Date().toISOString() })
              .eq('id', event.id);

            synced++;
          } else {
            throw new Error('No active pairing');
          }
        } else {
          throw new Error('Device not found');
        }
      } catch (error: any) {
        // Update sync error
        await supabase
          .from('smart_pourer_offline_queue')
          .update({ 
            sync_attempts: event.sync_attempts + 1,
            sync_error: error.message 
          })
          .eq('id', event.id);
      }

      setSyncProgress(Math.round(((synced + 1) / total) * 100));
    }

    setIsSyncing(false);
    setLastSyncTime(new Date());
    toast.success(`Synced ${synced}/${total} events`);
    fetchQueue();
  };

  const clearSynced = async () => {
    try {
      await supabase
        .from('smart_pourer_offline_queue')
        .delete()
        .eq('outlet_id', outletId)
        .not('synced_at', 'is', null);

      toast.success('Cleared synced events');
    } catch (error) {
      toast.error('Failed to clear');
    }
  };

  const deleteFailedEvent = async (id: string) => {
    try {
      await supabase.from('smart_pourer_offline_queue').delete().eq('id', id);
      toast.success('Event deleted');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const queuePourEvent = async (deviceCode: string, pourData: any) => {
    try {
      await supabase.from('smart_pourer_offline_queue').insert({
        outlet_id: outletId,
        device_code: deviceCode,
        pour_data: pourData,
      });
      fetchQueue();
    } catch (error) {
      console.error('Failed to queue event:', error);
    }
  };

  // Expose queuePourEvent for external use
  useEffect(() => {
    (window as any).queueSmartPourerEvent = queuePourEvent;
    return () => { delete (window as any).queueSmartPourerEvent; };
  }, [outletId]);

  const failedEvents = queuedEvents.filter(e => e.sync_error);
  const pendingEvents = queuedEvents.filter(e => !e.sync_error);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          Offline Sync Queue
        </h3>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge className="bg-green-500 gap-1">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          <Button variant="outline" size="icon" onClick={fetchQueue}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{pendingEvents.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className={failedEvents.length > 0 ? 'border-red-500/50' : ''}>
          <CardContent className="pt-4 text-center">
            <p className={`text-2xl font-bold ${failedEvents.length > 0 ? 'text-red-500' : ''}`}>
              {failedEvents.length}
            </p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{queuedEvents.length}</p>
            <p className="text-xs text-muted-foreground">Total Queue</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {isSyncing && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-sm">Syncing...</span>
              <span className="text-sm text-muted-foreground ml-auto">{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} />
          </CardContent>
        </Card>
      )}

      {/* Sync Button */}
      <Button 
        className="w-full gap-2" 
        onClick={syncQueue} 
        disabled={!isOnline || isSyncing || queuedEvents.length === 0}
      >
        <Upload className="h-4 w-4" />
        {isSyncing ? 'Syncing...' : `Sync ${queuedEvents.length} Events`}
      </Button>

      {/* Last Sync */}
      {lastSyncTime && (
        <p className="text-xs text-center text-muted-foreground">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </p>
      )}

      {/* Queue List */}
      {queuedEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Queued Events</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearSynced}>
                Clear Synced
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {queuedEvents.map(event => (
                  <div 
                    key={event.id} 
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      event.sync_error ? 'bg-red-500/10' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {event.sync_error ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CloudOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{event.device_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.pour_data?.poured_ml}ml • {new Date(event.queued_at).toLocaleTimeString()}
                        </p>
                        {event.sync_error && (
                          <p className="text-xs text-red-500">{event.sync_error}</p>
                        )}
                      </div>
                    </div>
                    {event.sync_error && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => deleteFailedEvent(event.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {queuedEvents.length === 0 && (
        <Card className="bg-green-500/5 border-green-500/30">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Check className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-green-500 font-medium">Queue Empty</p>
            <p className="text-xs text-muted-foreground">All events synced</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
