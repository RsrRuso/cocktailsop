import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const Cart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    toast({
      title: "Item Removed",
      description: "Item has been removed from your cart",
    });
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 9.99 : 0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Cart is Empty",
        description: "Add items to your cart before checking out",
        variant: "destructive",
      });
      return;
    }

    // For demo: Use first Stripe product price (Premium Cocktail Recipe Pack)
    // In production, products would have stripe_price_id in database
    const stripePriceId = "price_1SZhIeDeFqd186tlFsAgAlfD";
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: stripePriceId, quantity: 1 },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, "_blank");
        toast({
          title: "Checkout Started",
          description: "Complete your payment in the new tab",
        });
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          
          <h1 className="text-xl font-bold">Shopping Cart</h1>
          
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-4 pb-32 space-y-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">
              Add items from the shop to get started
            </p>
            <Button onClick={() => navigate("/shop")}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-3">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                      <p className="text-lg font-bold text-primary">
                        ${item.price.toFixed(2)}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="glass-hover p-1.5 rounded-lg"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="glass-hover p-1.5 rounded-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="glass-hover p-2 rounded-lg h-fit"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-lg">Order Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Fixed Checkout Button */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 glass border-t border-border/50">
          <Button 
            onClick={handleCheckout} 
            className="w-full" 
            size="lg"
            disabled={loading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {loading ? "Starting Checkout..." : `Checkout with Stripe ($${total.toFixed(2)})`}
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Cart;
