import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Bluetooth, BluetoothOff, BluetoothSearching, Battery, 
  Signal, Droplets, Zap, AlertTriangle, Check, Loader2,
  RefreshCw, Settings, Link2, Link2Off, Wine
} from 'lucide-react';

// BLE Service UUIDs (example - replace with actual device UUIDs)
const POURER_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const FLOW_CHARACTERISTIC_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

interface ConnectedDevice {
  device: any;
  server: any;
  bottleId: string | null;
  batteryLevel: number;
  signalStrength: number;
  lastReading: Date | null;
  totalPoured: number;
  isActive: boolean;
}

interface BLEPourerIntegrationProps {
  outletId: string;
}

export function BLEPourerIntegration({ outletId }: BLEPourerIntegrationProps) {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<Map<string, ConnectedDevice>>(new Map());
  const [availableBottles, setAvailableBottles] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // Check Web Bluetooth support
  useEffect(() => {
    const supported = 'bluetooth' in navigator;
    setIsSupported(supported);
    if (!supported) {
      console.warn('Web Bluetooth API is not supported in this browser');
    }
  }, []);

  // Fetch available bottles for pairing
  useEffect(() => {
    if (outletId) {
      fetchBottles();
    }
  }, [outletId]);

  const fetchBottles = async () => {
    try {
      const { data } = await supabase
        .from('lab_ops_bottles')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('status', 'active')
        .is('pourer_id', null);
      
      setAvailableBottles(data || []);
    } catch (error) {
      console.error('Error fetching bottles:', error);
    }
  };

  // Scan for BLE devices
  const startScan = useCallback(async () => {
    if (!isSupported || !(navigator as any).bluetooth) {
      toast.error('Bluetooth not supported in this browser');
      return;
    }

    setIsScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [POURER_SERVICE_UUID, 'battery_service']
      });

      if (device) {
        await connectToDevice(device);
      }
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        console.error('BLE scan error:', error);
        toast.error('Failed to scan for devices');
      }
    } finally {
      setIsScanning(false);
    }
  }, [isSupported]);

  const connectToDevice = async (device: any) => {
    try {
      toast.info(`Connecting to ${device.name || device.id}...`);

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Create connected device entry
      const connectedDevice: ConnectedDevice = {
        device,
        server,
        bottleId: null,
        batteryLevel: 100,
        signalStrength: -50,
        lastReading: null,
        totalPoured: 0,
        isActive: true
      };

      // Try to get battery level
      try {
        const batteryService = await server.getPrimaryService('battery_service');
        const batteryChar = await batteryService.getCharacteristic('battery_level');
        const batteryValue = await batteryChar.readValue();
        connectedDevice.batteryLevel = batteryValue.getUint8(0);

        // Subscribe to battery notifications
        await batteryChar.startNotifications();
        batteryChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value.getUint8(0);
          setConnectedDevices(prev => {
            const updated = new Map(prev);
            const existing = updated.get(device.id);
            if (existing) {
              updated.set(device.id, { ...existing, batteryLevel: value });
            }
            return updated;
          });
        });
      } catch (e) {
        console.log('Battery service not available');
      }

      // Set up disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        handleDeviceDisconnect(device.id);
      });

      // Add to connected devices
      setConnectedDevices(prev => {
        const updated = new Map(prev);
        updated.set(device.id, connectedDevice);
        return updated;
      });

      toast.success(`Connected to ${device.name || 'Smart Pourer'}`);

      // Start listening for flow data
      startFlowMonitoring(device.id, server);

    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect to device');
    }
  };

  const startFlowMonitoring = async (deviceId: string, server: any) => {
    try {
      // In a real implementation, subscribe to flow characteristic
      // For demo, we'll simulate readings
      const simulateFlowData = () => {
        const interval = setInterval(() => {
          const device = connectedDevices.get(deviceId);
          if (!device?.isActive) {
            clearInterval(interval);
            return;
          }

          // Simulate a pour event (random chance)
          if (Math.random() < 0.1) { // 10% chance per tick
            const pourAmount = 30 + Math.random() * 30; // 30-60ml
            handlePourEvent(deviceId, pourAmount);
          }
        }, 1000);
      };

      // Start simulation for demo
      simulateFlowData();

    } catch (error) {
      console.error('Flow monitoring error:', error);
    }
  };

  // Handle pour event from device
  const handlePourEvent = async (deviceId: string, mlDispensed: number) => {
    const device = connectedDevices.get(deviceId);
    if (!device?.bottleId) {
      console.log('Pour detected but no bottle assigned');
      return;
    }

    try {
      // Record pour in database
      await supabase
        .from('lab_ops_pourer_readings')
        .insert({
          outlet_id: outletId,
          bottle_id: device.bottleId,
          ml_dispensed: mlDispensed,
          reading_source: 'ble_sensor',
          reading_timestamp: new Date().toISOString(),
          device_id: deviceId
        });

      // Update connected device stats
      setConnectedDevices(prev => {
        const updated = new Map(prev);
        const existing = updated.get(deviceId);
        if (existing) {
          updated.set(deviceId, {
            ...existing,
            lastReading: new Date(),
            totalPoured: existing.totalPoured + mlDispensed
          });
        }
        return updated;
      });

      toast.success(`Pour recorded: ${Math.round(mlDispensed)}ml`, {
        duration: 2000
      });

    } catch (error) {
      console.error('Error recording pour:', error);
    }
  };

  // Handle device disconnect
  const handleDeviceDisconnect = (deviceId: string) => {
    setConnectedDevices(prev => {
      const updated = new Map(prev);
      const device = updated.get(deviceId);
      if (device) {
        updated.set(deviceId, { ...device, isActive: false });
      }
      return updated;
    });
    toast.warning('Device disconnected');
  };

  // Pair device with bottle
  const pairWithBottle = async (deviceId: string, bottleId: string) => {
    try {
      // Update bottle with pourer ID
      await supabase
        .from('lab_ops_bottles')
        .update({ pourer_id: deviceId })
        .eq('id', bottleId);

      // Update connected device
      setConnectedDevices(prev => {
        const updated = new Map(prev);
        const device = updated.get(deviceId);
        if (device) {
          updated.set(deviceId, { ...device, bottleId });
        }
        return updated;
      });

      toast.success('Device paired with bottle');
      fetchBottles();
      setSelectedDevice(null);

    } catch (error) {
      console.error('Pairing error:', error);
      toast.error('Failed to pair device');
    }
  };

  // Disconnect device
  const disconnectDevice = (deviceId: string) => {
    const device = connectedDevices.get(deviceId);
    if (device?.device.gatt?.connected) {
      device.device.gatt.disconnect();
    }
    setConnectedDevices(prev => {
      const updated = new Map(prev);
      updated.delete(deviceId);
      return updated;
    });
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi > -60) return 'Excellent';
    if (rssi > -70) return 'Good';
    if (rssi > -80) return 'Fair';
    return 'Weak';
  };

  if (!isSupported) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-6 text-center">
          <BluetoothOff className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Bluetooth Not Supported</h3>
          <p className="text-sm text-muted-foreground">
            Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera 
            on a supported device to connect smart pourers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bluetooth className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Smart Pourer Connection</h2>
          <Badge variant="outline" className="text-xs">
            {connectedDevices.size} connected
          </Badge>
        </div>
        <Button
          onClick={startScan}
          disabled={isScanning}
          size="sm"
          className="gap-2"
        >
          {isScanning ? (
            <>
              <BluetoothSearching className="w-4 h-4 animate-pulse" />
              Scanning...
            </>
          ) : (
            <>
              <Bluetooth className="w-4 h-4" />
              Scan for Devices
            </>
          )}
        </Button>
      </div>

      {/* Connected Devices */}
      {connectedDevices.size > 0 ? (
        <div className="space-y-3">
          {Array.from(connectedDevices.entries()).map(([id, device]) => (
            <Card key={id} className={device.isActive ? 'border-green-500/30' : 'border-muted'}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${device.isActive ? 'bg-green-500/10' : 'bg-muted'}`}>
                      {device.isActive ? (
                        <Bluetooth className="w-5 h-5 text-green-500" />
                      ) : (
                        <BluetoothOff className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{device.device.name || 'Smart Pourer'}</p>
                      <p className="text-xs text-muted-foreground">ID: {id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <Badge variant={device.isActive ? 'default' : 'secondary'}>
                    {device.isActive ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                {/* Device Stats */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center">
                    <Battery className={`w-5 h-5 mx-auto mb-1 ${getBatteryColor(device.batteryLevel)}`} />
                    <p className="text-xs text-muted-foreground">Battery</p>
                    <p className="font-semibold text-sm">{device.batteryLevel}%</p>
                  </div>
                  <div className="text-center">
                    <Signal className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Signal</p>
                    <p className="font-semibold text-sm">{getSignalStrength(device.signalStrength)}</p>
                  </div>
                  <div className="text-center">
                    <Droplets className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <p className="text-xs text-muted-foreground">Poured</p>
                    <p className="font-semibold text-sm">{Math.round(device.totalPoured)}ml</p>
                  </div>
                  <div className="text-center">
                    <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                    <p className="text-xs text-muted-foreground">Last Pour</p>
                    <p className="font-semibold text-sm">
                      {device.lastReading 
                        ? new Date(device.lastReading).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </p>
                  </div>
                </div>

                {/* Bottle Pairing */}
                {device.bottleId ? (
                  <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Paired with bottle</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConnectedDevices(prev => {
                          const updated = new Map(prev);
                          const d = updated.get(id);
                          if (d) {
                            updated.set(id, { ...d, bottleId: null });
                          }
                          return updated;
                        });
                      }}
                    >
                      <Link2Off className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      Not paired with a bottle - pours won't be recorded
                    </p>
                    {availableBottles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableBottles.map(bottle => (
                          <Button
                            key={bottle.id}
                            variant="outline"
                            size="sm"
                            onClick={() => pairWithBottle(id, bottle.id)}
                            className="gap-1"
                          >
                            <Wine className="w-3 h-3" />
                            {bottle.bottle_name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No unassigned bottles available. Register a bottle first.
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectDevice(id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <BluetoothSearching className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Devices Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scan for nearby smart pourers to start tracking physical consumption in real-time
            </p>
            <Button onClick={startScan} disabled={isScanning}>
              {isScanning ? 'Scanning...' : 'Scan for Smart Pourers'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            How it works
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Smart pourers measure liquid flow in real-time via BLE sensors</li>
            <li>• Each pour is automatically recorded when the bottle is tilted</li>
            <li>• Pair each pourer with a registered bottle to track consumption</li>
            <li>• Data syncs instantly - no manual entry required</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}