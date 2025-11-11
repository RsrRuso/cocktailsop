import { useState } from "react";
import { ArrowLeft, ShoppingCart, Search, Filter, Package, BookOpen, Sparkles, Cpu, Shirt, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  inStock: boolean;
  description: string;
}

const Shop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cartCount, setCartCount] = useState(0);

  const categories = [
    { value: "all", label: "All Products", icon: Package },
    { value: "bar-equipment", label: "Bar Equipment", icon: Package },
    { value: "books", label: "Books & Courses", icon: BookOpen },
    { value: "ingredients", label: "Premium Ingredients", icon: Sparkles },
    { value: "tech", label: "Tech & Tools", icon: Cpu },
    { value: "apparel", label: "Apparel & Merch", icon: Shirt },
  ];

  const products: Product[] = [
    {
      id: "1",
      name: "Professional Boston Shaker Set",
      category: "bar-equipment",
      price: 49.99,
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400",
      rating: 4.8,
      inStock: true,
      description: "Premium weighted stainless steel shaker set"
    },
    {
      id: "2",
      name: "Mixology Masterclass Guide",
      category: "books",
      price: 29.99,
      image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
      rating: 4.9,
      inStock: true,
      description: "Complete guide to advanced cocktail techniques"
    },
    {
      id: "3",
      name: "Organic Agave Syrup 500ml",
      category: "ingredients",
      price: 19.99,
      image: "https://images.unsplash.com/photo-1587495191920-2e2b60f69e6b?w=400",
      rating: 4.7,
      inStock: true,
      description: "100% organic blue agave from Mexico"
    },
    {
      id: "4",
      name: "Smart Bar Inventory System",
      category: "tech",
      price: 299.99,
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400",
      rating: 4.6,
      inStock: true,
      description: "IoT-enabled inventory tracking system"
    },
    {
      id: "5",
      name: "Professional Bartender Apron",
      category: "apparel",
      price: 39.99,
      image: "https://images.unsplash.com/photo-1590986232706-7817d1b51160?w=400",
      rating: 4.5,
      inStock: true,
      description: "Premium canvas with leather straps"
    },
    {
      id: "6",
      name: "Japanese Jigger Set",
      category: "bar-equipment",
      price: 34.99,
      image: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400",
      rating: 4.9,
      inStock: true,
      description: "Precision-measured stainless steel jiggers"
    },
    {
      id: "7",
      name: "Cocktail Recipe Management App",
      category: "tech",
      price: 9.99,
      image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400",
      rating: 4.4,
      inStock: true,
      description: "Monthly subscription for recipe database access"
    },
    {
      id: "8",
      name: "Artisan Bitters Collection",
      category: "ingredients",
      price: 54.99,
      image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400",
      rating: 4.8,
      inStock: false,
      description: "Curated set of 6 premium bitters"
    },
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product) => {
    if (!product.inStock) {
      toast({
        title: "Out of Stock",
        description: "This item is currently unavailable",
        variant: "destructive",
      });
      return;
    }
    setCartCount(prev => prev + 1);
    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  const handleProductClick = (product: Product) => {
    navigate("/product/" + product.id, { state: { product } });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="glass-hover p-2.5 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-xl font-bold">Shop</h1>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/orders")}
              className="glass-hover p-2.5 rounded-2xl"
            >
              <Package className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate("/cart")}
              className="glass-hover p-2.5 rounded-2xl relative"
            >
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs font-bold">
                {cartCount}
              </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-20 px-4 space-y-6">
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    <cat.icon className="w-4 h-4" />
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Badge
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(cat.value)}
            >
              <cat.icon className="w-3 h-3 mr-1" />
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card 
              key={product.id} 
              className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="destructive">Out of Stock</Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2 glass px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  <span className="text-xs font-medium">{product.rating}</span>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {product.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">
                    ${product.price}
                  </span>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    disabled={!product.inStock}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Shop;
