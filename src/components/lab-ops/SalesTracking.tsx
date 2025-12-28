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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, DollarSign, TrendingUp, Clock, Percent, Receipt, Calculator } from 'lucide-react';
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
  cost_price: number | null;
  vat_percentage: number | null;
  vat_amount: number | null;
  service_charge_percentage: number | null;
  service_charge_amount: number | null;
  gross_amount: number | null;
  net_amount: number | null;
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
  const [todayStats, setTodayStats] = useState({ 
    count: 0, 
    totalMl: 0, 
    totalRevenue: 0, 
    totalCost: 0,
    totalVat: 0,
    totalServiceCharge: 0,
    totalNet: 0
  });

  const [newSale, setNewSale] = useState({
    item_name: '',
    spirit_type: '',
    quantity: 1,
    ml_per_serving: 45,
    unit_price: 0,
    cost_price: 0,
    vat_percentage: 0,
    service_charge_percentage: 0,
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

      // Calculate today's stats including new fields
      const stats = (data || []).reduce(
        (acc, sale) => ({
          count: acc.count + sale.quantity,
          totalMl: acc.totalMl + sale.total_ml_sold,
          totalRevenue: acc.totalRevenue + (sale.gross_amount || sale.total_price || 0),
          totalCost: acc.totalCost + ((sale.cost_price || 0) * sale.quantity),
          totalVat: acc.totalVat + (sale.vat_amount || 0),
          totalServiceCharge: acc.totalServiceCharge + (sale.service_charge_amount || 0),
          totalNet: acc.totalNet + (sale.net_amount || 0),
        }),
        { count: 0, totalMl: 0, totalRevenue: 0, totalCost: 0, totalVat: 0, totalServiceCharge: 0, totalNet: 0 }
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

  // Calculate derived values
  const calculateSaleAmounts = () => {
    const qty = newSale.quantity;
    const unitPrice = newSale.unit_price || 0;
    const costPrice = newSale.cost_price || 0;
    const vatPct = newSale.vat_percentage || 0;
    const serviceChargePct = newSale.service_charge_percentage || 0;

    const subtotal = qty * unitPrice;
    const vatAmount = subtotal * (vatPct / 100);
    const serviceChargeAmount = subtotal * (serviceChargePct / 100);
    const grossAmount = subtotal + vatAmount + serviceChargeAmount;
    const totalCost = qty * costPrice;
    const netAmount = subtotal - totalCost; // Profit before VAT/fees

    return {
      subtotal,
      vatAmount,
      serviceChargeAmount,
      grossAmount,
      totalCost,
      netAmount,
      totalMl: qty * newSale.ml_per_serving
    };
  };

  const handleAddSale = async () => {
    if (!newSale.item_name || !newSale.spirit_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const amounts = calculateSaleAmounts();

      const { error } = await supabase
        .from('lab_ops_sales')
        .insert({
          outlet_id: outletId,
          item_name: newSale.item_name,
          spirit_type: newSale.spirit_type,
          quantity: newSale.quantity,
          ml_per_serving: newSale.ml_per_serving,
          total_ml_sold: amounts.totalMl,
          unit_price: newSale.unit_price || null,
          total_price: amounts.subtotal || null,
          cost_price: newSale.cost_price || 0,
          vat_percentage: newSale.vat_percentage || 0,
          vat_amount: amounts.vatAmount || 0,
          service_charge_percentage: newSale.service_charge_percentage || 0,
          service_charge_amount: amounts.serviceChargeAmount || 0,
          gross_amount: amounts.grossAmount || 0,
          net_amount: amounts.netAmount || 0,
          sold_by: user?.id,
        });

      if (error) throw error;

      toast.success('Sale recorded');
      setIsAddDialogOpen(false);
      setNewSale({ 
        item_name: '', 
        spirit_type: '', 
        quantity: 1, 
        ml_per_serving: 45, 
        unit_price: 0,
        cost_price: 0,
        vat_percentage: 0,
        service_charge_percentage: 0
      });
      fetchSales();
    } catch (error) {
      console.error('Error adding sale:', error);
      toast.error('Failed to record sale');
    }
  };

  const amounts = calculateSaleAmounts();

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Sales Analytics
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

              <Separator />
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Pricing & Cost
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Selling Price (unit)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newSale.unit_price || ''}
                      onChange={(e) => setNewSale({ ...newSale, unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price (unit)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newSale.cost_price || ''}
                      onChange={(e) => setNewSale({ ...newSale, cost_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      VAT %
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={newSale.vat_percentage || ''}
                      onChange={(e) => setNewSale({ ...newSale, vat_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Service Charge %
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={newSale.service_charge_percentage || ''}
                      onChange={(e) => setNewSale({ ...newSale, service_charge_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total ML:</span>
                  <span className="font-medium">{amounts.totalMl}ml</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${amounts.subtotal.toFixed(2)}</span>
                </div>
                {amounts.vatAmount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>+ VAT ({newSale.vat_percentage}%):</span>
                    <span>${amounts.vatAmount.toFixed(2)}</span>
                  </div>
                )}
                {amounts.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>+ Service ({newSale.service_charge_percentage}%):</span>
                    <span>${amounts.serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Gross Amount:</span>
                  <span className="text-primary">${amounts.grossAmount.toFixed(2)}</span>
                </div>
                {amounts.totalCost > 0 && (
                  <>
                    <div className="flex justify-between text-red-500">
                      <span>- Cost:</span>
                      <span>${amounts.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Net Profit:</span>
                      <span>${amounts.netAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleAddSale} className="w-full">
                Record Sale
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Stats - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{todayStats.count}</div>
            <p className="text-xs text-muted-foreground">Drinks Sold</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">${todayStats.totalRevenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Gross Revenue</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">${todayStats.totalVat.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">VAT Collected</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">${todayStats.totalNet.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Net Profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-2">
            <div className="text-lg font-semibold">{todayStats.totalMl.toFixed(0)}ml</div>
            <p className="text-xs text-muted-foreground">Volume</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2">
            <div className="text-lg font-semibold text-red-500">${todayStats.totalCost.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Total Cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2">
            <div className="text-lg font-semibold text-blue-500">${todayStats.totalServiceCharge.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Service Charge</p>
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
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{sale.item_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {sale.spirit_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {sale.quantity}x • {sale.total_ml_sold}ml
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {sale.gross_amount ? (
                          <p className="font-medium">${sale.gross_amount.toFixed(2)}</p>
                        ) : sale.total_price ? (
                          <p className="font-medium">${sale.total_price.toFixed(2)}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.sold_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Detailed breakdown */}
                    {(sale.cost_price || sale.vat_amount || sale.service_charge_amount) ? (
                      <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-4 gap-2 text-xs">
                        {sale.cost_price ? (
                          <div>
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="ml-1 text-red-500">${(sale.cost_price * sale.quantity).toFixed(2)}</span>
                          </div>
                        ) : null}
                        {sale.vat_amount ? (
                          <div>
                            <span className="text-muted-foreground">VAT:</span>
                            <span className="ml-1 text-amber-600">${sale.vat_amount.toFixed(2)}</span>
                          </div>
                        ) : null}
                        {sale.service_charge_amount ? (
                          <div>
                            <span className="text-muted-foreground">Fee:</span>
                            <span className="ml-1 text-blue-500">${sale.service_charge_amount.toFixed(2)}</span>
                          </div>
                        ) : null}
                        {sale.net_amount ? (
                          <div>
                            <span className="text-muted-foreground">Net:</span>
                            <span className="ml-1 text-green-600 font-medium">${sale.net_amount.toFixed(2)}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
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
