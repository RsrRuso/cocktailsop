import { useState } from "react";
import { ArrowLeft, CreditCard, Smartphone, DollarSign, CheckCircle2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const PaymentOptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { cartItems, total } = location.state || { cartItems: [], total: 0 };
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    {
      id: "card",
      name: "Credit/Debit Card",
      icon: CreditCard,
      description: "Pay securely with your card",
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: DollarSign,
      description: "Fast and secure payment",
    },
    {
      id: "apple-pay",
      name: "Apple Pay",
      icon: Smartphone,
      description: "Quick checkout with Apple Pay",
    },
    {
      id: "google-pay",
      name: "Google Pay",
      icon: Smartphone,
      description: "Pay with Google Pay",
    },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please choose a payment method to continue",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to complete your purchase",
          variant: "destructive",
        });
        navigate("/shop-auth");
        return;
      }

      // Get billing address from form
      const addressInput = document.getElementById("address") as HTMLInputElement;
      const cityInput = document.getElementById("city") as HTMLInputElement;
      const zipInput = document.getElementById("zip") as HTMLInputElement;

      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

      // Create order in database
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_amount: total,
          status: "pending",
          payment_method: selectedMethod,
          shipping_address: addressInput?.value || "N/A",
          shipping_city: cityInput?.value || "N/A",
          shipping_postal_code: zipInput?.value || "",
          shipping_country: "N/A",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_image: item.image,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Payment Successful!",
        description: "Your order has been placed successfully",
      });
      
      navigate("/order-confirmation", { 
        state: { 
          cartItems, 
          total,
          paymentMethod: selectedMethod,
          orderNumber 
        } 
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
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
          
          <h1 className="text-xl font-bold">Payment Options</h1>
          
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-4 pb-32 space-y-6">
        {/* Order Summary */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2">
            {cartItems.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">${total?.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Select Payment Method</h3>
          
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedMethod === method.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => setSelectedMethod(method.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`glass p-3 rounded-2xl ${
                  selectedMethod === method.id ? 'bg-primary/20' : ''
                }`}>
                  <method.icon className={`w-6 h-6 ${
                    selectedMethod === method.id ? 'text-primary' : ''
                  }`} />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-semibold">{method.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {method.description}
                  </p>
                </div>
                
                {selectedMethod === method.id && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Card Details (shown if card selected) */}
        {selectedMethod === "card" && (
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Card Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
              />
            </div>
          </Card>
        )}

        {/* Billing Address */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold">Billing Address</h3>
          
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" placeholder="123 Main St" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="New York" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" placeholder="10001" />
            </div>
          </div>
        </Card>
      </div>

      {/* Fixed Pay Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 glass border-t border-border/50">
        <Button
          onClick={handlePayment}
          disabled={!selectedMethod || processing}
          className="w-full"
          size="lg"
        >
          {processing ? (
            <>Processing...</>
          ) : (
            <>Pay ${total?.toFixed(2)}</>
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default PaymentOptions;
