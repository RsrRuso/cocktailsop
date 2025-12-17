import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingBag, 
  Plus,
  Package,
  FileText,
  DollarSign,
  Edit,
  Trash2,
  Image as ImageIcon,
  Tag,
  Box
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const ShopProductsDialog = ({ open, onOpenChange, userId }: ShopProductsDialogProps) => {
  const [products, setProducts] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compareAtPrice: '',
    category: '',
    productType: 'physical',
    isDigital: false,
    inventoryCount: '0'
  });

  useEffect(() => {
    if (open && userId) {
      fetchProducts();
    }
  }, [open, userId]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('shop_products')
      .select('*')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setProducts(data);
  };

  const handleAddProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('shop_products').insert({
        seller_id: userId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        compare_at_price: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
        category: formData.category,
        product_type: formData.productType,
        is_digital: formData.isDigital,
        inventory_count: parseInt(formData.inventoryCount) || 0,
        is_active: true
      });

      if (error) throw error;
      
      toast.success("Product added successfully!");
      setShowAddForm(false);
      setFormData({
        name: '',
        description: '',
        price: '',
        compareAtPrice: '',
        category: '',
        productType: 'physical',
        isDigital: false,
        inventoryCount: '0'
      });
      fetchProducts();
    } catch (error) {
      toast.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    
    try {
      const { error } = await supabase
        .from('shop_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      toast.success("Product deleted");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleToggleActive = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('shop_products')
        .update({ is_active: isActive })
        .eq('id', productId);

      if (error) throw error;
      fetchProducts();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const activeProducts = products.filter(p => p.is_active);
  const totalValue = products.reduce((sum, p) => sum + (p.price * (p.inventory_count || 0)), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            Your Shop
          </DialogTitle>
          <DialogDescription>
            Sell physical or digital products directly to your followers.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
              <TabsTrigger value="add">Add Product</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <Package className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                    <p className="text-xl font-bold">{products.length}</p>
                    <p className="text-xs text-muted-foreground">Products</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Tag className="w-5 h-5 mx-auto mb-1 text-green-500" />
                    <p className="text-xl font-bold">{activeProducts.length}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                    <p className="text-xl font-bold">${totalValue.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Inventory</p>
                  </CardContent>
                </Card>
              </div>

              {/* Products List */}
              <div className="space-y-3">
                {products.map(product => (
                  <Card key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm truncate">{product.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="font-bold text-primary">${product.price}</span>
                            {product.compare_at_price && (
                              <span className="text-xs text-muted-foreground line-through">${product.compare_at_price}</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {product.is_digital ? (
                                <><FileText className="w-3 h-3 mr-1" />Digital</>
                              ) : (
                                <><Box className="w-3 h-3 mr-1" />Physical</>
                              )}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Stock: {product.inventory_count}
                            </span>
                          </div>
                        </div>
                        <Switch 
                          checked={product.is_active}
                          onCheckedChange={(checked) => handleToggleActive(product.id, checked)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {products.length === 0 && (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No products yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Add your first product to start selling</p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const tabTrigger = document.querySelector('[data-state="inactive"][value="add"]') as HTMLElement;
                        tabTrigger?.click();
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="add" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Compare at Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={formData.compareAtPrice}
                        onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                        placeholder="0.00"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merchandise">Merchandise</SelectItem>
                        <SelectItem value="courses">Courses</SelectItem>
                        <SelectItem value="ebooks">E-books</SelectItem>
                        <SelectItem value="templates">Templates</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Inventory</Label>
                    <Input
                      type="number"
                      value={formData.inventoryCount}
                      onChange={(e) => setFormData({ ...formData, inventoryCount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Digital Product</p>
                          <p className="text-xs text-muted-foreground">No shipping required</p>
                        </div>
                      </div>
                      <Switch 
                        checked={formData.isDigital}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          isDigital: checked,
                          productType: checked ? 'digital' : 'physical'
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  onClick={handleAddProduct}
                  disabled={loading || !formData.name || !formData.price}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {loading ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
