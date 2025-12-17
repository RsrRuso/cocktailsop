import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { RefreshCw, Upload, ShoppingCart, Link2, Plus, Check, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface POSSale {
  id: string;
  pos_item_name: string;
  pos_item_code: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  sold_at: string;
  source: string;
}

interface SmartPourerPOSSyncProps {
  outletId: string;
}

export function SmartPourerPOSSync({ outletId }: SmartPourerPOSSyncProps) {
  const [sales, setSales] = useState<POSSale[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Form state
  const [selectedSku, setSelectedSku] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('12');
  const [saleDate, setSaleDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  useEffect(() => {
    if (outletId) fetchData();
  }, [outletId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, skusRes] = await Promise.all([
        supabase
          .from('smart_pourer_pos_sales')
          .select('*')
          .eq('outlet_id', outletId)
          .gte('sold_at', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
          .order('sold_at', { ascending: false }),
        supabase
          .from('smart_pourer_skus')
          .select('id, name, default_bottle_size_ml')
          .eq('outlet_id', outletId)
          .eq('is_active', true)
      ]);

      setSales((salesRes.data as any) || []);
      setSkus(skusRes.data || []);
    } catch (error) {
      console.error('Error fetching POS data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSale = async () => {
    if (!selectedSku || !quantity) {
      toast.error('Please select SKU and quantity');
      return;
    }

    const sku = skus.find(s => s.id === selectedSku);
    
    try {
      const qty = parseInt(quantity);
      const price = parseFloat(unitPrice);
      
      await supabase.from('smart_pourer_pos_sales').insert({
        outlet_id: outletId,
        pos_item_name: sku?.name || 'Unknown',
        pos_item_code: selectedSku,
        quantity: qty,
        unit_price: price,
        total_price: qty * price,
        sold_at: new Date(saleDate).toISOString(),
        source: 'manual'
      });

      toast.success('POS sale recorded');
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to record sale');
    }
  };

  const resetForm = () => {
    setSelectedSku('');
    setQuantity('1');
    setUnitPrice('12');
    setSaleDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  };

  const syncFromLabOps = async () => {
    setIsSyncing(true);
    try {
      // Fetch LAB Ops closed orders for the outlet
      const { data: orders, error } = await supabase
        .from('lab_ops_orders')
        .select(`
          id, created_at, total_amount,
          items:lab_ops_order_items(
            quantity, unit_price,
            menu_item:lab_ops_menu_items(name, category_id)
          )
        `)
        .eq('outlet_id', outletId)
        .eq('status', 'closed')
        .gte('created_at', format(subDays(new Date(), 1), 'yyyy-MM-dd'));

      if (error) throw error;

      // Match drink items to SKUs by name
      let syncedCount = 0;
      for (const order of orders || []) {
        for (const item of (order as any).items || []) {
          const itemName = item.menu_item?.name || '';
          
          // Try to match by name
          const matchingSku = skus.find(s => 
            s.name.toLowerCase().includes(itemName.toLowerCase()) ||
            itemName.toLowerCase().includes(s.name.toLowerCase())
          );

          await supabase.from('smart_pourer_pos_sales').insert({
            outlet_id: outletId,
            pos_item_name: itemName,
            pos_item_code: matchingSku?.id || null,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: (item.quantity || 1) * (item.unit_price || 0),
            sold_at: order.created_at,
            pos_transaction_id: order.id,
            source: 'lab_ops'
          });
          syncedCount++;
        }
      }

      toast.success(`Synced ${syncedCount} items from LAB Ops`);
      fetchData();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync from LAB Ops');
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await supabase.from('smart_pourer_pos_sales').delete().eq('id', id);
      toast.success('Sale deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getTodayStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todaySales = sales.filter(s => s.sold_at?.startsWith(today));
    return {
      count: todaySales.reduce((sum, s) => sum + (s.quantity || 0), 0),
      ml: todaySales.reduce((sum, s) => sum + ((s.quantity || 0) * 45), 0), // Assume 45ml per serve
      revenue: todaySales.reduce((sum, s) => sum + (s.total_price || 0), 0)
    };
  };

  const todayStats = getTodayStats();

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading POS data...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-green-500" />
          POS Sales Sync
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncFromLabOps} disabled={isSyncing}>
            <Link2 className="h-4 w-4 mr-1" />
            {isSyncing ? 'Syncing...' : 'Sync LAB Ops'}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Today Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{todayStats.count}</p>
            <p className="text-xs text-muted-foreground">Drinks Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{todayStats.ml}ml</p>
            <p className="text-xs text-muted-foreground">ML Expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">${todayStats.revenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Manual Sale */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Record Manual Sale
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record POS Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Spirit/SKU *</Label>
              <Select value={selectedSku} onValueChange={setSelectedSku}>
                <SelectTrigger><SelectValue placeholder="Select spirit" /></SelectTrigger>
                <SelectContent>
                  {skus.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
              </div>
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sale Time</Label>
              <Input type="datetime-local" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSale}>
                <Check className="h-4 w-4 mr-1" />
                Record Sale
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Sales */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Sales (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {sales.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No sales recorded</p>
            ) : (
              <div className="space-y-2">
                {sales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{sale.pos_item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.quantity}x @ ${sale.unit_price} • {format(new Date(sale.sold_at), 'PP p')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {sale.source}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSale(sale.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
