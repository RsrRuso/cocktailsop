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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, Plus, Search, RefreshCw, Edit, Trash2,
  Wine, DollarSign, Layers
} from 'lucide-react';

interface SKU {
  id: string;
  sku_code: string;
  name: string;
  spirit_type: string;
  brand: string | null;
  cost_per_ml: number | null;
  default_bottle_size_ml: number;
  is_active: boolean;
}

const SPIRIT_TYPES = [
  'Vodka', 'Gin', 'Rum', 'Tequila', 'Whiskey', 'Bourbon', 'Scotch',
  'Brandy', 'Cognac', 'Liqueur', 'Vermouth', 'Bitters', 'Wine', 'Beer', 'Other'
];

interface SmartPourerSKUManagementProps {
  outletId: string;
}

export function SmartPourerSKUManagement({ outletId }: SmartPourerSKUManagementProps) {
  const { user } = useAuth();
  const [skus, setSkus] = useState<SKU[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SKU | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    sku_code: '',
    name: '',
    spirit_type: '',
    brand: '',
    cost_per_ml: '',
    default_bottle_size_ml: '750',
  });

  useEffect(() => {
    if (outletId) fetchSkus();
  }, [outletId]);

  const fetchSkus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('smart_pourer_skus')
        .select('*')
        .eq('outlet_id', outletId)
        .order('name');

      if (error) throw error;
      setSkus(data || []);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sku_code: '',
      name: '',
      spirit_type: '',
      brand: '',
      cost_per_ml: '',
      default_bottle_size_ml: '750',
    });
    setEditingSku(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.spirit_type || !formData.sku_code) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      const skuData = {
        sku_code: formData.sku_code,
        name: formData.name,
        spirit_type: formData.spirit_type,
        brand: formData.brand || null,
        cost_per_ml: formData.cost_per_ml ? parseFloat(formData.cost_per_ml) : null,
        default_bottle_size_ml: parseInt(formData.default_bottle_size_ml),
        outlet_id: outletId,
        user_id: user?.id,
        is_active: true,
      };

      if (editingSku) {
        const { error } = await supabase
          .from('smart_pourer_skus')
          .update(skuData)
          .eq('id', editingSku.id);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        const { error } = await supabase.from('smart_pourer_skus').insert(skuData);
        if (error) throw error;
        toast.success('Product added');
      }

      resetForm();
      setIsAddDialogOpen(false);
      fetchSkus();
    } catch (error: any) {
      console.error('Error saving SKU:', error);
      toast.error(error.message || 'Failed to save product');
    }
  };

  const handleEdit = (sku: SKU) => {
    setEditingSku(sku);
    setFormData({
      sku_code: sku.sku_code,
      name: sku.name,
      spirit_type: sku.spirit_type,
      brand: sku.brand || '',
      cost_per_ml: sku.cost_per_ml?.toString() || '',
      default_bottle_size_ml: sku.default_bottle_size_ml.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const toggleActive = async (sku: SKU) => {
    try {
      const { error } = await supabase
        .from('smart_pourer_skus')
        .update({ is_active: !sku.is_active })
        .eq('id', sku.id);

      if (error) throw error;
      toast.success(sku.is_active ? 'Product deactivated' : 'Product activated');
      fetchSkus();
    } catch (error) {
      console.error('Error toggling SKU:', error);
      toast.error('Failed to update product');
    }
  };

  const filteredSkus = skus.filter(sku =>
    sku.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.sku_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading products...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-500" />
          Product Catalog (SKUs)
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchSkus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSku ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU Code *</Label>
                    <Input
                      placeholder="VOD-001"
                      value={formData.sku_code}
                      onChange={(e) => setFormData({ ...formData, sku_code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Spirit Type *</Label>
                    <Select
                      value={formData.spirit_type}
                      onValueChange={(value) => setFormData({ ...formData, spirit_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPIRIT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    placeholder="Grey Goose Vodka"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Input
                    placeholder="Grey Goose"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost per ml ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.05"
                      value={formData.cost_per_ml}
                      onChange={(e) => setFormData({ ...formData, cost_per_ml: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Bottle Size (ml)</Label>
                    <Select
                      value={formData.default_bottle_size_ml}
                      onValueChange={(value) => setFormData({ ...formData, default_bottle_size_ml: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="375">375ml</SelectItem>
                        <SelectItem value="500">500ml</SelectItem>
                        <SelectItem value="700">700ml</SelectItem>
                        <SelectItem value="750">750ml</SelectItem>
                        <SelectItem value="1000">1000ml (1L)</SelectItem>
                        <SelectItem value="1750">1750ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>{editingSku ? 'Update' : 'Add'} Product</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{skus.length}</p>
            <p className="text-xs text-muted-foreground">Total Products</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{skus.filter(s => s.is_active).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{new Set(skus.map(s => s.spirit_type)).size}</p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      {filteredSkus.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchTerm ? 'No products match your search' : 'No products yet. Add your first product to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {filteredSkus.map((sku) => (
              <Card key={sku.id} className={`overflow-hidden ${!sku.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Wine className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{sku.name}</p>
                          {!sku.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{sku.sku_code}</span>
                          <span>•</span>
                          <span>{sku.spirit_type}</span>
                          {sku.brand && (
                            <>
                              <span>•</span>
                              <span>{sku.brand}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          {sku.default_bottle_size_ml}ml
                        </div>
                        {sku.cost_per_ml && (
                          <div className="flex items-center gap-1 text-green-500">
                            <DollarSign className="h-3 w-3" />
                            {sku.cost_per_ml.toFixed(3)}/ml
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sku)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleActive(sku)}
                        >
                          <Trash2 className={`h-4 w-4 ${sku.is_active ? 'text-red-500' : 'text-green-500'}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
