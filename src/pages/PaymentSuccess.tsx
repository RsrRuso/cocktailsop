import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Download, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [showConfetti, setShowConfetti] = useState(true);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          toast.success("Payment verified! Your order is confirmed.");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        toast.error("Payment verification failed. Please contact support.");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full"
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 20,
                opacity: 0,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-md w-full p-8 text-center space-y-6 backdrop-blur-sm bg-card/80 border-2 border-primary/20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          </motion.div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Payment Successful!</h1>
            <p className="text-muted-foreground">
              {verifying ? "Verifying payment..." : "Thank you for your purchase from SpecVerse"}
            </p>
          </div>

          {sessionId && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Order Reference</p>
              <p className="text-xs font-mono text-foreground break-all">
                {sessionId}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your inbox with your order details and download links (if applicable).
            </p>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={() => navigate("/shop")}
                className="w-full"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>

              <Button
                onClick={() => navigate("/home")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Go to Home
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Need help? Contact support@specverse.com
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
