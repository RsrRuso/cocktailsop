import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Droplets, AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface SpillageRecord {
  id: string;
  inventory_item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  reason: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  cost_impact: number;
}

interface InventoryItem {
  id: string;
  name: string;
  base_unit: string;
  category: string | null;
}

interface SpillageTrackingProps {
  outletId: string;
}

const SPILLAGE_REASONS = [
  { value: 'spillage', label: 'Spillage / Accident' },
  { value: 'breakage', label: 'Breakage' },
  { value: 'expired', label: 'Expired' },
  { value: 'overpouring', label: 'Over-pouring' },
  { value: 'contaminated', label: 'Contaminated' },
  { value: 'training', label: 'Training / Practice' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
];

export function SpillageTracking({ outletId }: SpillageTrackingProps) {
  const { user } = useAuth();
  const [spillageRecords, setSpillageRecords] = useState<SpillageRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [todayStats, setTodayStats] = useState({ count: 0, totalQty: 0, totalCost: 0 });

  const [formData, setFormData] = useState({
    inventory_item_id: '',
    quantity: 1,
    reason: '',
    notes: '',
  });

  useEffect(() => {
    if (outletId) {
      fetchData();
    }
  }, [outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch inventory items for this outlet
      const { data: items, error: itemsError } = await supabase
        .from('lab_ops_inventory_items')
        .select('id, name, base_unit, category')
        .eq('outlet_id', outletId)
        .eq('is_active', true)
        .order('name');

      if (itemsError) throw itemsError;
      setInventoryItems(items || []);

      // Fetch spillage records (stock movements with movement_type = 'waste')
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: movements, error: movementsError } = await supabase
        .from('lab_ops_stock_movements')
        .select(`
          id,
          inventory_item_id,
          qty,
          notes,
          reference_type,
          created_at,
          created_by,
          lab_ops_inventory_items (name, base_unit)
        `)
        .eq('movement_type', 'wastage')
        .order('created_at', { ascending: false })
        .limit(50);

      if (movementsError) throw movementsError;

      const records: SpillageRecord[] = (movements || []).map((m: any) => ({
        id: m.id,
        inventory_item_id: m.inventory_item_id,
        item_name: m.lab_ops_inventory_items?.name || 'Unknown',
        quantity: Math.abs(m.qty || 0),
        unit: m.lab_ops_inventory_items?.base_unit || 'units',
        reason: m.reference_type || 'spillage',
        notes: m.notes,
        recorded_by: m.created_by,
        created_at: m.created_at,
        cost_impact: 0, // Could be calculated from item costs
      }));

      setSpillageRecords(records);

      // Calculate today's stats
      const todayRecords = records.filter(r => new Date(r.created_at) >= today);
      const stats = todayRecords.reduce(
        (acc, r) => ({
          count: acc.count + 1,
          totalQty: acc.totalQty + r.quantity,
          totalCost: acc.totalCost + r.cost_impact,
        }),
        { count: 0, totalQty: 0, totalCost: 0 }
      );
      setTodayStats(stats);
    } catch (error) {
      console.error('Error fetching spillage data:', error);
      toast.error('Failed to load spillage data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordSpillage = async () => {
    if (!formData.inventory_item_id || !formData.reason) {
      toast.error('Please select an item and reason');
      return;
    }

    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      const selectedItem = inventoryItems.find(i => i.id === formData.inventory_item_id);
      
      // Get current stock level
      const { data: stockLevels, error: stockError } = await supabase
        .from('lab_ops_stock_levels')
        .select('id, quantity, location_id')
        .eq('inventory_item_id', formData.inventory_item_id)
        .gt('quantity', 0)
        .order('quantity', { ascending: false })
        .limit(1);

      if (stockError) throw stockError;

      if (!stockLevels?.length) {
        toast.error('No stock available for this item');
        return;
      }

      const stockLevel = stockLevels[0];
      const newQuantity = Math.max(0, stockLevel.quantity - formData.quantity);

      // Update stock level
      const { error: updateError } = await supabase
        .from('lab_ops_stock_levels')
        .update({ quantity: newQuantity })
        .eq('id', stockLevel.id);

      if (updateError) throw updateError;

      // Record stock movement
      const { error: movementError } = await supabase
        .from('lab_ops_stock_movements')
        .insert([{
          inventory_item_id: formData.inventory_item_id,
          from_location_id: stockLevel.location_id,
          qty: formData.quantity,
          movement_type: 'wastage' as const,
          reference_type: formData.reason,
          notes: formData.notes || `${SPILLAGE_REASONS.find(r => r.value === formData.reason)?.label}: ${selectedItem?.name}`,
          created_by: user?.id,
        }]);

      if (movementError) throw movementError;

      toast.success(`Recorded ${formData.quantity} ${selectedItem?.base_unit || 'units'} of ${selectedItem?.name} as ${SPILLAGE_REASONS.find(r => r.value === formData.reason)?.label}`);
      
      setIsDialogOpen(false);
      setFormData({ inventory_item_id: '', quantity: 1, reason: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error recording spillage:', error);
      toast.error('Failed to record spillage');
    }
  };

  const getReasonLabel = (value: string) => {
    return SPILLAGE_REASONS.find(r => r.value === value)?.label || value;
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'spillage': return 'bg-blue-500/20 text-blue-500';
      case 'breakage': return 'bg-red-500/20 text-red-500';
      case 'expired': return 'bg-orange-500/20 text-orange-500';
      case 'overpouring': return 'bg-purple-500/20 text-purple-500';
      case 'contaminated': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Spillage & Wastage
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive" className="gap-2">
              <Plus className="h-4 w-4" />
              Record Spillage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Spillage / Wastage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Item *</Label>
                <Select
                  value={formData.inventory_item_id}
                  onValueChange={(v) => setFormData({ ...formData, inventory_item_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search inventory items..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.base_unit})
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                />
                {formData.inventory_item_id && (
                  <p className="text-xs text-muted-foreground">
                    Unit: {inventoryItems.find(i => i.id === formData.inventory_item_id)?.base_unit || 'units'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(v) => setFormData({ ...formData, reason: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPILLAGE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">This will deduct from stock</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recording spillage will reduce the stock level for this item.
                </p>
              </div>

              <Button onClick={handleRecordSpillage} variant="destructive" className="w-full">
                Confirm & Deduct from Stock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{todayStats.count}</div>
            <p className="text-xs text-muted-foreground">Incidents Today</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{todayStats.totalQty.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Units Lost</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              {spillageRecords.length}
            </div>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
      </div>

      {/* Spillage Records */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Spillage Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {spillageRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No spillage records found
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {spillageRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{record.item_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={`text-xs ${getReasonColor(record.reason)}`}>
                          {getReasonLabel(record.reason)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {record.quantity} {record.unit}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {record.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-500">-{record.quantity}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
