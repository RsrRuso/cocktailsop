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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Sale {
  id: string;
  item_name: string;
  spirit_type: string | null;
  quantity: number;
  ml_per_serving: number;
  total_ml_sold: number;
  unit_price: number | null;
  total_price: number | null;
  sold_at: string;
}

interface SalesTrackingProps {
  outletId: string;
}

const SPIRIT_TYPES = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon', 'Scotch',
  'Brandy', 'Cognac', 'Liqueur', 'Vermouth', 'Bitters', 'Other'
];

export function SalesTracking({ outletId }: SalesTrackingProps) {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [todayStats, setTodayStats] = useState({ count: 0, totalMl: 0, totalRevenue: 0 });

  const [newSale, setNewSale] = useState({
    item_name: '',
    spirit_type: '',
    quantity: 1,
    ml_per_serving: 45,
    unit_price: 0,
  });

  useEffect(() => {
    if (outletId) {
      fetchSales();
      subscribeToSales();
    }
  }, [outletId]);

  const fetchSales = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('lab_ops_sales')
        .select('*')
        .eq('outlet_id', outletId)
        .gte('sold_at', today.toISOString())
        .order('sold_at', { ascending: false });

      if (error) throw error;

      setSales(data || []);

      // Calculate today's stats
      const stats = (data || []).reduce(
        (acc, sale) => ({
          count: acc.count + sale.quantity,
          totalMl: acc.totalMl + sale.total_ml_sold,
          totalRevenue: acc.totalRevenue + (sale.total_price || 0),
        }),
        { count: 0, totalMl: 0, totalRevenue: 0 }
      );
      setTodayStats(stats);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error('Failed to load sales');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToSales = () => {
    const channel = supabase
      .channel('sales-tracking')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lab_ops_sales',
        filter: `outlet_id=eq.${outletId}`
      }, () => {
        fetchSales();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleAddSale = async () => {
    if (!newSale.item_name || !newSale.spirit_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const totalMl = newSale.quantity * newSale.ml_per_serving;
      const totalPrice = newSale.quantity * newSale.unit_price;

      const { error } = await supabase
        .from('lab_ops_sales')
        .insert({
          outlet_id: outletId,
          item_name: newSale.item_name,
          spirit_type: newSale.spirit_type,
          quantity: newSale.quantity,
          ml_per_serving: newSale.ml_per_serving,
          total_ml_sold: totalMl,
          unit_price: newSale.unit_price || null,
          total_price: totalPrice || null,
          sold_by: user?.id,
        });

      if (error) throw error;

      toast.success('Sale recorded');
      setIsAddDialogOpen(false);
      setNewSale({ item_name: '', spirit_type: '', quantity: 1, ml_per_serving: 45, unit_price: 0 });
      fetchSales();
    } catch (error) {
      console.error('Error adding sale:', error);
      toast.error('Failed to record sale');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Sales Tracking (Virtual)
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Item/Drink Name *</Label>
                <Input
                  placeholder="e.g., Vodka Martini"
                  value={newSale.item_name}
                  onChange={(e) => setNewSale({ ...newSale, item_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Spirit Type *</Label>
                <Select
                  value={newSale.spirit_type}
                  onValueChange={(v) => setNewSale({ ...newSale, spirit_type: v })}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSale.quantity}
                    onChange={(e) => setNewSale({ ...newSale, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ML per Serving</Label>
                  <Input
                    type="number"
                    value={newSale.ml_per_serving}
                    onChange={(e) => setNewSale({ ...newSale, ml_per_serving: parseInt(e.target.value) || 45 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Unit Price (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newSale.unit_price || ''}
                  onChange={(e) => setNewSale({ ...newSale, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Total ML: <span className="font-medium text-foreground">{newSale.quantity * newSale.ml_per_serving}ml</span>
                </p>
                {newSale.unit_price > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Total Price: <span className="font-medium text-foreground">${(newSale.quantity * newSale.unit_price).toFixed(2)}</span>
                  </p>
                )}
              </div>
              <Button onClick={handleAddSale} className="w-full">
                Record Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{todayStats.count}</div>
            <p className="text-xs text-muted-foreground">Drinks Sold</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{todayStats.totalMl.toFixed(0)}ml</div>
            <p className="text-xs text-muted-foreground">Total Volume</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">${todayStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Today's Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No sales recorded today
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{sale.item_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {sale.spirit_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {sale.quantity}x • {sale.total_ml_sold}ml
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {sale.total_price && (
                        <p className="font-medium text-green-500">${sale.total_price.toFixed(2)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.sold_at), 'HH:mm')}
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
