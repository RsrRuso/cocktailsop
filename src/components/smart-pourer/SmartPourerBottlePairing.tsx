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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Link2, Unlink, Wine, Package, AlertTriangle, QrCode, 
  Plus, RefreshCw, Search, CheckCircle2
} from 'lucide-react';

interface Device {
  id: string;
  device_code: string;
  status: string;
}

interface SKU {
  id: string;
  sku_code: string;
  name: string;
  brand: string | null;
  spirit_type: string;
  default_bottle_size_ml: number;
  cost_per_ml: number | null;
}

interface Bottle {
  id: string;
  sku_id: string;
  qr_or_nfc_code: string | null;
  bottle_size_ml: number;
  current_level_ml: number;
  status: string;
  created_at: string;
  sku?: SKU;
}

interface Pairing {
  id: string;
  device_id: string;
  bottle_id: string;
  paired_at: string;
  unpaired_at: string | null;
  manager_override: boolean;
  device?: Device;
  bottle?: Bottle;
}

interface SmartPourerBottlePairingProps {
  outletId: string;
}

export function SmartPourerBottlePairing({ outletId }: SmartPourerBottlePairingProps) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPairDialogOpen, setIsPairDialogOpen] = useState(false);
  const [isAddBottleDialogOpen, setIsAddBottleDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedBottle, setSelectedBottle] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newBottle, setNewBottle] = useState({
    sku_id: '',
    qr_code: '',
    bottle_size_ml: 750,
  });

  useEffect(() => {
    if (outletId) {
      fetchData();
    }
  }, [outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch devices
      const { data: devicesData } = await supabase
        .from('smart_pourer_devices')
        .select('id, device_code, status')
        .eq('outlet_id', outletId)
        .eq('status', 'active');

      // Fetch SKUs
      const { data: skusData } = await supabase
        .from('smart_pourer_skus')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('is_active', true);

      // Fetch bottles with SKU info
      const { data: bottlesData } = await supabase
        .from('smart_pourer_bottles')
        .select(`
          *,
          sku:smart_pourer_skus(*)
        `)
        .eq('outlet_id', outletId)
        .eq('status', 'active');

      // Fetch active pairings
      const { data: pairingsData } = await supabase
        .from('smart_pourer_device_pairings')
        .select(`
          *,
          device:smart_pourer_devices(id, device_code, status),
          bottle:smart_pourer_bottles(*, sku:smart_pourer_skus(*))
        `)
        .eq('is_active', true)
        .is('unpaired_at', null);

      setDevices(devicesData || []);
      setSKUs(skusData || []);
      setBottles(bottlesData || []);
      setPairings(pairingsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pairing data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBottle = async () => {
    if (!newBottle.sku_id) {
      toast.error('Please select a SKU');
      return;
    }

    try {
      const selectedSKU = skus.find(s => s.id === newBottle.sku_id);
      const { error } = await supabase
        .from('smart_pourer_bottles')
        .insert({
          outlet_id: outletId,
          sku_id: newBottle.sku_id,
          qr_or_nfc_code: newBottle.qr_code || null,
          bottle_size_ml: selectedSKU?.default_bottle_size_ml || newBottle.bottle_size_ml,
          current_level_ml: selectedSKU?.default_bottle_size_ml || newBottle.bottle_size_ml,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Bottle registered successfully');
      setIsAddBottleDialogOpen(false);
      setNewBottle({ sku_id: '', qr_code: '', bottle_size_ml: 750 });
      fetchData();
    } catch (error: any) {
      console.error('Error adding bottle:', error);
      toast.error(error.message || 'Failed to register bottle');
    }
  };

  const handlePairDevice = async () => {
    if (!selectedDevice || !selectedBottle) {
      toast.error('Please select both device and bottle');
      return;
    }

    // Check if device already has an active pairing
    const existingPairing = pairings.find(p => p.device_id === selectedDevice);
    if (existingPairing) {
      toast.error('This device already has an active pairing. Unpair first.');
      return;
    }

    try {
      const { error } = await supabase
        .from('smart_pourer_device_pairings')
        .insert({
          device_id: selectedDevice,
          bottle_id: selectedBottle,
          paired_by_user: user?.id,
          is_active: true,
        });

      if (error) throw error;

      toast.success('Device paired with bottle successfully');
      setIsPairDialogOpen(false);
      setSelectedDevice('');
      setSelectedBottle('');
      fetchData();
    } catch (error: any) {
      console.error('Error pairing:', error);
      toast.error(error.message || 'Failed to pair device');
    }
  };

  const handleUnpair = async (pairingId: string) => {
    try {
      const { error } = await supabase
        .from('smart_pourer_device_pairings')
        .update({
          is_active: false,
          unpaired_at: new Date().toISOString(),
        })
        .eq('id', pairingId);

      if (error) throw error;

      toast.success('Device unpaired');
      fetchData();
    } catch (error) {
      console.error('Error unpairing:', error);
      toast.error('Failed to unpair device');
    }
  };

  const getAvailableDevices = () => {
    const pairedDeviceIds = pairings.map(p => p.device_id);
    return devices.filter(d => !pairedDeviceIds.includes(d.id));
  };

  const getAvailableBottles = () => {
    const pairedBottleIds = pairings.map(p => p.bottle_id);
    return bottles.filter(b => !pairedBottleIds.includes(b.id));
  };

  const getLevelPercentage = (bottle: Bottle) => {
    return (bottle.current_level_ml / bottle.bottle_size_ml) * 100;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading pairing data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5 text-purple-500" />
          Device-Bottle Pairing
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isAddBottleDialogOpen} onOpenChange={setIsAddBottleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Wine className="h-4 w-4" />
                Add Bottle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Bottle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Select value={newBottle.sku_id} onValueChange={(v) => setNewBottle({ ...newBottle, sku_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product SKU" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus.map((sku) => (
                        <SelectItem key={sku.id} value={sku.id}>
                          {sku.name} - {sku.default_bottle_size_ml}ml
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>QR/NFC Code (optional)</Label>
                  <Input
                    placeholder="Scan or enter code"
                    value={newBottle.qr_code}
                    onChange={(e) => setNewBottle({ ...newBottle, qr_code: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddBottle} className="w-full">
                  Register Bottle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isPairDialogOpen} onOpenChange={setIsPairDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Pair Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pair Device with Bottle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Device</Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDevices().map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.device_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select Bottle</Label>
                  <Select value={selectedBottle} onValueChange={setSelectedBottle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a bottle" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableBottles().map((bottle) => (
                        <SelectItem key={bottle.id} value={bottle.id}>
                          {bottle.sku?.name || 'Unknown'} ({getLevelPercentage(bottle).toFixed(0)}% full)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handlePairDevice} className="w-full" disabled={!selectedDevice || !selectedBottle}>
                  Create Pairing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Pairings */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Active Pairings ({pairings.length})</h4>
        
        {pairings.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No active pairings.<br />
                Pair a device with a bottle to start tracking pours.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pairings.map((pairing) => {
              const bottle = pairing.bottle as Bottle & { sku: SKU };
              const device = pairing.device as Device;
              const levelPct = bottle ? getLevelPercentage(bottle) : 0;

              return (
                <Card key={pairing.id} className="border-purple-500/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Active Pairing</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 h-8"
                        onClick={() => handleUnpair(pairing.id)}
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Unpair
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Device Info */}
                      <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          Device
                        </div>
                        <p className="font-medium text-sm">
                          {device?.device_code || 'Unknown'}
                        </p>
                      </div>

                      {/* Bottle Info */}
                      <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Wine className="h-3 w-3" />
                          Bottle
                        </div>
                        <p className="font-medium text-sm">
                          {bottle?.sku?.name || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Bottle Level */}
                    {bottle && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Level</span>
                          <span>{bottle.current_level_ml}ml / {bottle.bottle_size_ml}ml</span>
                        </div>
                        <Progress 
                          value={levelPct} 
                          className={`h-2 ${levelPct < 20 ? '[&>div]:bg-red-500' : levelPct < 40 ? '[&>div]:bg-yellow-500' : ''}`}
                        />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Paired: {new Date(pairing.paired_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Bottles */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">
          Available Bottles ({getAvailableBottles().length})
        </h4>
        
        <ScrollArea className="max-h-[300px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {getAvailableBottles().map((bottle) => {
              const levelPct = getLevelPercentage(bottle);
              const sku = bottle.sku as SKU;
              
              return (
                <Card key={bottle.id} className="bg-muted/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{sku?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{sku?.brand}</p>
                      </div>
                      <Badge variant={levelPct < 20 ? 'destructive' : levelPct < 40 ? 'secondary' : 'default'}>
                        {levelPct.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={levelPct} className="h-1.5 mt-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
