import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Wine, Droplets, AlertTriangle, RotateCcw } from 'lucide-react';

interface Bottle {
  id: string;
  bottle_name: string;
  spirit_type: string;
  bottle_size_ml: number;
  current_level_ml: number;
  initial_level_ml: number;
  pourer_id: string | null;
  status: string;
  registered_at: string;
}

interface PourerManagementProps {
  outletId: string;
}

const SPIRIT_TYPES = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon', 'Scotch',
  'Brandy', 'Cognac', 'Liqueur', 'Vermouth', 'Bitters', 'Other'
];

export function PourerManagement({ outletId }: PourerManagementProps) {
  const { user } = useAuth();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPourDialogOpen, setIsPourDialogOpen] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<Bottle | null>(null);
  
  const [newBottle, setNewBottle] = useState({
    bottle_name: '',
    spirit_type: '',
    bottle_size_ml: 750,
    pourer_id: '',
  });
  
  const [pourAmount, setPourAmount] = useState('');

  useEffect(() => {
    if (outletId) {
      fetchBottles();
      subscribeToReadings();
    }
  }, [outletId]);

  const fetchBottles = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_ops_bottles')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('status', 'active')
        .order('bottle_name');

      if (error) throw error;
      setBottles(data || []);
    } catch (error) {
      console.error('Error fetching bottles:', error);
      toast.error('Failed to load bottles');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToReadings = () => {
    const channel = supabase
      .channel('pourer-readings')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lab_ops_pourer_readings',
        filter: `outlet_id=eq.${outletId}`
      }, () => {
        fetchBottles();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleAddBottle = async () => {
    if (!newBottle.bottle_name || !newBottle.spirit_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('lab_ops_bottles')
        .insert({
          outlet_id: outletId,
          bottle_name: newBottle.bottle_name,
          spirit_type: newBottle.spirit_type,
          bottle_size_ml: newBottle.bottle_size_ml,
          initial_level_ml: newBottle.bottle_size_ml,
          current_level_ml: newBottle.bottle_size_ml,
          pourer_id: newBottle.pourer_id || null,
          registered_by: user?.id,
        });

      if (error) throw error;

      toast.success('Bottle registered successfully');
      setIsAddDialogOpen(false);
      setNewBottle({ bottle_name: '', spirit_type: '', bottle_size_ml: 750, pourer_id: '' });
      fetchBottles();
    } catch (error) {
      console.error('Error adding bottle:', error);
      toast.error('Failed to register bottle');
    }
  };

  const handleRecordPour = async () => {
    if (!selectedBottle || !pourAmount) {
      toast.error('Please enter pour amount');
      return;
    }

    const mlAmount = parseFloat(pourAmount);
    if (isNaN(mlAmount) || mlAmount <= 0) {
      toast.error('Invalid pour amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('lab_ops_pourer_readings')
        .insert({
          bottle_id: selectedBottle.id,
          outlet_id: outletId,
          ml_dispensed: mlAmount,
          recorded_by: user?.id,
          source: 'manual',
        });

      if (error) throw error;

      toast.success(`Recorded ${mlAmount}ml pour`);
      setIsPourDialogOpen(false);
      setPourAmount('');
      setSelectedBottle(null);
      fetchBottles();
    } catch (error) {
      console.error('Error recording pour:', error);
      toast.error('Failed to record pour');
    }
  };

  const handleRefillBottle = async (bottle: Bottle) => {
    try {
      const { error } = await supabase
        .from('lab_ops_bottles')
        .update({
          current_level_ml: bottle.bottle_size_ml,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bottle.id);

      if (error) throw error;
      toast.success('Bottle refilled');
      fetchBottles();
    } catch (error) {
      console.error('Error refilling bottle:', error);
      toast.error('Failed to refill bottle');
    }
  };

  const getLevelColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wine className="h-5 w-5" />
          Bottle & Pourer Management
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Register Bottle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Bottle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Bottle Name *</Label>
                <Input
                  placeholder="e.g., Absolut Vodka"
                  value={newBottle.bottle_name}
                  onChange={(e) => setNewBottle({ ...newBottle, bottle_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Spirit Type *</Label>
                <Select
                  value={newBottle.spirit_type}
                  onValueChange={(v) => setNewBottle({ ...newBottle, spirit_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select spirit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPIRIT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bottle Size (ml)</Label>
                <Input
                  type="number"
                  value={newBottle.bottle_size_ml}
                  onChange={(e) => setNewBottle({ ...newBottle, bottle_size_ml: parseInt(e.target.value) || 750 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Pourer Device ID (optional)</Label>
                <Input
                  placeholder="Enter pourer device ID"
                  value={newBottle.pourer_id}
                  onChange={(e) => setNewBottle({ ...newBottle, pourer_id: e.target.value })}
                />
              </div>
              <Button onClick={handleAddBottle} className="w-full">
                Register Bottle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {bottles.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Wine className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No bottles registered yet.<br />
              Register your first bottle to start tracking pours.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bottles.map((bottle) => {
            const percentage = (bottle.current_level_ml / bottle.bottle_size_ml) * 100;
            const isLow = percentage < 25;

            return (
              <Card key={bottle.id} className={isLow ? 'border-yellow-500/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{bottle.bottle_name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">{bottle.spirit_type}</Badge>
                    </div>
                    {isLow && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Level</span>
                      <span className="font-medium">
                        {bottle.current_level_ml.toFixed(0)}ml / {bottle.bottle_size_ml}ml
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-3"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}% remaining
                    </div>
                  </div>

                  {bottle.pourer_id && (
                    <div className="text-xs text-muted-foreground">
                      Pourer ID: {bottle.pourer_id}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setSelectedBottle(bottle);
                        setIsPourDialogOpen(true);
                      }}
                    >
                      <Droplets className="h-3 w-3" />
                      Record Pour
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRefillBottle(bottle)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isPourDialogOpen} onOpenChange={setIsPourDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Pour - {selectedBottle?.bottle_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Pour Amount (ml)</Label>
              <Input
                type="number"
                placeholder="e.g., 45"
                value={pourAmount}
                onChange={(e) => setPourAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Standard pour: 30ml (1oz) | Double: 60ml (2oz)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPourAmount('30')} size="sm">30ml</Button>
              <Button variant="outline" onClick={() => setPourAmount('45')} size="sm">45ml</Button>
              <Button variant="outline" onClick={() => setPourAmount('60')} size="sm">60ml</Button>
            </div>
            <Button onClick={handleRecordPour} className="w-full">
              Record Pour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
