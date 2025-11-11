import { useState } from "react";
import { ArrowLeft, ShoppingCart, Star, Package, Truck, Shield, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const ProductDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const product = location.state?.product;
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Product not found</h3>
          <Button onClick={() => navigate("/shop")}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image || product.image_url,
      seller_id: product.seller_id,
    };
    
    navigate("/cart", { 
      state: { 
        cartItems: [cartItem] 
      } 
    });
    
    toast({
      title: "Added to Cart",
      description: `${quantity}x ${product.name} added to cart`,
    });
  };

  const handleBuyNow = () => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image || product.image_url,
      seller_id: product.seller_id,
    };
    
    navigate("/payment-options", { 
      state: { 
        cartItems: [cartItem],
        total: product.price * quantity
      } 
    });
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
          
          <h1 className="text-xl font-bold">Product Details</h1>
          
          <button
            onClick={() => {
              setIsFavorite(!isFavorite);
              toast({
                title: isFavorite ? "Removed from Favorites" : "Added to Favorites",
                description: isFavorite ? "Item removed from your favorites" : "Item added to your favorites",
              });
            }}
            className="glass-hover p-2.5 rounded-2xl"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      <div className="pt-20 pb-32">
        {/* Product Image */}
        <div className="relative aspect-square w-full overflow-hidden">
          <img
            src={product.image || product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {(product.inStock === false || (product.stock_quantity !== undefined && product.stock_quantity === 0)) && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg px-4 py-2">Out of Stock</Badge>
            </div>
          )}
        </div>

        <div className="px-4 space-y-4 mt-4">
          {/* Product Info */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold flex-1">{product.name}</h1>
              <div className="glass px-3 py-1.5 rounded-full flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="font-medium">{product.rating || 4.8}</span>
              </div>
            </div>
            
            <p className="text-3xl font-bold text-primary mb-4">
              ${product.price}
            </p>
            
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Features */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Product Features</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Free Shipping</p>
                  <p className="text-sm text-muted-foreground">On orders over $50</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Quality Guarantee</p>
                  <p className="text-sm text-muted-foreground">30-day money back</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Secure Packaging</p>
                  <p className="text-sm text-muted-foreground">Protected delivery</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quantity Selector */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="glass-hover px-3 py-1.5 rounded-lg"
                  disabled={product.inStock === false || (product.stock_quantity !== undefined && product.stock_quantity === 0)}
                >
                  -
                </button>
                <span className="w-12 text-center font-medium text-lg">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="glass-hover px-3 py-1.5 rounded-lg"
                  disabled={product.inStock === false || (product.stock_quantity !== undefined && product.stock_quantity === 0)}
                >
                  +
                </button>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Full Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {product.fullDescription || product.description}
              {" "}This premium product is crafted with attention to detail and quality. 
              Perfect for professionals and enthusiasts alike. Backed by our satisfaction guarantee 
              and expert customer support team.
            </p>
          </Card>
        </div>
      </div>

      {/* Fixed Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 glass border-t border-border/50">
        <div className="flex gap-3">
          <Button
            onClick={handleAddToCart}
            variant="outline"
            className="flex-1"
            size="lg"
            disabled={product.inStock === false || (product.stock_quantity !== undefined && product.stock_quantity === 0)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
          <Button
            onClick={handleBuyNow}
            className="flex-1"
            size="lg"
            disabled={product.inStock === false || (product.stock_quantity !== undefined && product.stock_quantity === 0)}
          >
            Buy Now
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductDetail;
