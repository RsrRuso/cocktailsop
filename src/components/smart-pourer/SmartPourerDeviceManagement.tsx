import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Bluetooth, BatteryFull, BatteryMedium, BatteryLow, 
  BatteryWarning, Wifi, WifiOff, Settings, Trash2, RefreshCw,
  AlertTriangle, Check, X
} from 'lucide-react';

interface Device {
  id: string;
  device_code: string;
  firmware_version: string | null;
  battery_level: number;
  status: string;
  last_sync_at: string | null;
  created_at: string;
}

interface SmartPourerDeviceManagementProps {
  outletId: string;
}

export function SmartPourerDeviceManagement({ outletId }: SmartPourerDeviceManagementProps) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_code: '',
    firmware_version: '',
  });

  useEffect(() => {
    if (outletId) {
      fetchDevices();
      subscribeToDevices();
    }
  }, [outletId]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('smart_pourer_devices')
        .select('*')
        .eq('outlet_id', outletId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToDevices = () => {
    const channel = supabase
      .channel('smart-pourer-devices')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'smart_pourer_devices',
        filter: `outlet_id=eq.${outletId}`
      }, () => {
        fetchDevices();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleAddDevice = async () => {
    if (!newDevice.device_code) {
      toast.error('Device code is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('smart_pourer_devices')
        .insert({
          outlet_id: outletId,
          device_code: newDevice.device_code,
          firmware_version: newDevice.firmware_version || null,
          status: 'active',
          battery_level: 100,
        });

      if (error) throw error;

      toast.success('Device registered successfully');
      setIsAddDialogOpen(false);
      setNewDevice({ device_code: '', firmware_version: '' });
      fetchDevices();
    } catch (error: any) {
      console.error('Error adding device:', error);
      toast.error(error.message || 'Failed to register device');
    }
  };

  const updateDeviceStatus = async (deviceId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('smart_pourer_devices')
        .update({ status })
        .eq('id', deviceId);

      if (error) throw error;
      toast.success(`Device ${status === 'active' ? 'activated' : 'deactivated'}`);
      fetchDevices();
    } catch (error) {
      console.error('Error updating device:', error);
      toast.error('Failed to update device');
    }
  };

  const deleteDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('smart_pourer_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      toast.success('Device removed');
      fetchDevices();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Failed to remove device');
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 70) return <BatteryFull className="h-4 w-4 text-green-500" />;
    if (level > 40) return <BatteryMedium className="h-4 w-4 text-yellow-500" />;
    if (level > 15) return <BatteryLow className="h-4 w-4 text-orange-500" />;
    return <BatteryWarning className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Maintenance</Badge>;
      case 'offline':
        return <Badge className="bg-red-500/20 text-red-500">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLastSyncDisplay = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    const diff = Date.now() - new Date(lastSync).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading devices...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bluetooth className="h-5 w-5 text-blue-500" />
          Smart Pourer Devices
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDevices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Smart Pourer Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Device Code *</Label>
                  <Input
                    placeholder="SP-XXXX-XXXX"
                    value={newDevice.device_code}
                    onChange={(e) => setNewDevice({ ...newDevice, device_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Firmware Version</Label>
                  <Input
                    placeholder="e.g., v1.0.0"
                    value={newDevice.firmware_version}
                    onChange={(e) => setNewDevice({ ...newDevice, firmware_version: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddDevice} className="w-full">
                  Register Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {devices.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Bluetooth className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No devices registered.<br />
              Add your first smart pourer device to start tracking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <Card key={device.id} className={device.status === 'offline' ? 'border-red-500/30' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {device.device_code}
                      {device.status === 'active' ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </div>
                  {getStatusBadge(device.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {getBatteryIcon(device.battery_level)}
                    Battery
                  </span>
                  <span className="font-medium">{device.battery_level}%</span>
                </div>
                <Progress value={device.battery_level} className="h-2" />
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Last sync: {getLastSyncDisplay(device.last_sync_at)}</span>
                  <span>{device.firmware_version || 'Unknown FW'}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={device.status === 'active' ? 'outline' : 'default'}
                    className="flex-1"
                    onClick={() => updateDeviceStatus(device.id, device.status === 'active' ? 'maintenance' : 'active')}
                  >
                    {device.status === 'active' ? (
                      <>
                        <Settings className="h-3 w-3 mr-1" />
                        Maintenance
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => deleteDevice(device.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Device Health Summary */}
      {devices.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Device Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">
                  {devices.filter(d => d.status === 'active').length}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">
                  {devices.filter(d => d.status === 'maintenance').length}
                </p>
                <p className="text-xs text-muted-foreground">Maintenance</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {devices.filter(d => d.status === 'offline').length}
                </p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">
                  {devices.filter(d => d.battery_level < 20).length}
                </p>
                <p className="text-xs text-muted-foreground">Low Battery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
