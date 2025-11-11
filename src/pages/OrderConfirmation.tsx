import { CheckCircle2, Package, Home } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, total, paymentMethod, orderNumber } = location.state || {};
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="pt-20 px-4 space-y-6">
        {/* Success Animation */}
        <div className="text-center py-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
            <CheckCircle2 className="w-20 h-20 text-green-500 relative animate-in zoom-in duration-500" />
          </div>
          
          <h1 className="text-2xl font-bold mt-6 mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase
          </p>
        </div>

        {/* Order Details */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-muted-foreground">Order Number</span>
            <span className="font-mono font-semibold">{orderNumber || `ORD-${Date.now().toString().slice(-8)}`}</span>
          </div>
          
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium capitalize">
              {paymentMethod?.replace('-', ' ')}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="text-xl font-bold text-primary">
              ${total?.toFixed(2)}
            </span>
          </div>
        </Card>

        {/* Order Items */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Items
          </h3>
          <div className="space-y-3">
            {cartItems?.map((item: any) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium line-clamp-1">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Delivery Info */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2">What's Next?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>You'll receive an email confirmation shortly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Your order will be processed within 24 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Estimated delivery: 3-5 business days</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Track your order status in your account</span>
            </li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button onClick={() => navigate("/orders")} className="w-full" size="lg">
            View My Orders
          </Button>
          <Button
            onClick={() => navigate("/shop")}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Continue Shopping
          </Button>
          <Button
            onClick={() => navigate("/home")}
            variant="ghost"
            className="w-full"
            size="lg"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default OrderConfirmation;
