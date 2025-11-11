import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  Package,
  DollarSign,
  ShoppingBag,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  is_active: boolean;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "bar-equipment",
    price: "",
    stock_quantity: "",
    image_url: "",
  });

  useEffect(() => {
    checkSellerRole();
    fetchProducts();
    fetchOrders();
  }, []);

  const checkSellerRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/shop-auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "seller");

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You need a seller account to access this page",
        variant: "destructive",
      });
      navigate("/shop");
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const productData = {
        seller_id: user.id,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: formData.image_url,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "Success", description: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);

        if (error) throw error;
        toast({ title: "Success", description: "Product added successfully" });
      }

      setProductDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        category: "bar-equipment",
        price: "",
        stock_quantity: "",
        image_url: "",
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      image_url: product.image_url,
    });
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Product deleted successfully" });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Product ${!product.is_active ? "activated" : "deactivated"}` 
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0);
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="glass-hover p-2.5 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Seller Dashboard</h1>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: "",
                description: "",
                category: "bar-equipment",
                price: "",
                stock_quantity: "",
                image_url: "",
              });
              setProductDialogOpen(true);
            }}
            className="glass-hover p-2.5 rounded-2xl"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="pt-20 px-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalProducts}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </Card>
          <Card className="p-4 text-center">
            <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{activeProducts}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </Card>
          <Card className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">${totalRevenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </Card>
        </div>

        {/* Products List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">My Products</h2>
          {loading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </Card>
          ) : products.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold mb-2">No products yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start by adding your first product
              </p>
              <Button onClick={() => setProductDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="flex gap-3">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Stock: {product.stock_quantity}
                            </Badge>
                            <span className="text-lg font-bold text-primary">
                              ${product.price}
                            </span>
                          </div>
                        </div>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className="glass-hover p-1.5 rounded-lg"
                        >
                          {product.is_active ? (
                            <ToggleRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="glass-hover p-1.5 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="glass-hover p-1.5 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Orders</h2>
            <div className="space-y-2">
              {orders.map((order) => (
                <Card key={order.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">${order.total_amount}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              Fill in the product details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar-equipment">Bar Equipment</SelectItem>
                  <SelectItem value="books">Books & Courses</SelectItem>
                  <SelectItem value="ingredients">Premium Ingredients</SelectItem>
                  <SelectItem value="tech">Tech & Tools</SelectItem>
                  <SelectItem value="apparel">Apparel & Merch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                required
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Must be a direct link to an image file (.jpg, .png, .webp)
              </p>
              {formData.image_url && (
                <div className="mt-2 rounded-lg border border-border overflow-hidden">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = 'block';
                      e.currentTarget.nextElementSibling?.classList.add('hidden');
                    }}
                  />
                  <div className="hidden p-4 text-center text-sm text-destructive bg-destructive/10">
                    ⚠️ Invalid image URL. Please use a direct link to an image file.
                  </div>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full">
              {editingProduct ? "Update Product" : "Add Product"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SellerDashboard;
