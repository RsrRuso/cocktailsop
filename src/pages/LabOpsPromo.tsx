import { LabOpsPromoVideo } from "@/components/promo/LabOpsPromoVideo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChefHat, Users, Package, Calculator, Bell, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function LabOpsPromo() {
  const navigate = useNavigate();

  const features = [
    { icon: Users, title: "Waiter Interface", desc: "Easy order taking & table management" },
    { icon: ChefHat, title: "Kitchen KDS", desc: "Real-time order display & status updates" },
    { icon: Bell, title: "Instant Notifications", desc: "Waiter alerts when orders are ready" },
    { icon: Package, title: "Quantity Tracking", desc: "Live inventory countdown" },
    { icon: TrendingUp, title: "Sales Deduction", desc: "Automatic stock updates on sale" },
    { icon: Calculator, title: "Smart Calculations", desc: "Revenue, cost & profit tracking" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">LAB OPS Promo Video</h1>
            <p className="text-muted-foreground">Generate a promotional video showcasing the system</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Video Generator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <LabOpsPromoVideo />
          </motion.div>

          {/* Features Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-card border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">What's Showcased in the Video</h2>
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <ChefHat className="w-5 h-5 text-orange-500" />
                Kitchen & Bar Flow
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Waiter takes order on mobile device</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Kitchen/Bar receives order with alert</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Press START to begin preparation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>Mark items READY when complete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                  <span>Waiter notified for pickup</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">6</span>
                  <span>Inventory auto-deducted, sales recorded</span>
                </li>
              </ol>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Calculator className="w-5 h-5 text-blue-500" />
                Smart Calculations
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Real-time revenue tracking per order</li>
                <li>• Automatic cost calculation (ingredient costs)</li>
                <li>• Profit margin analysis</li>
                <li>• ML/volume tracking for beverages</li>
                <li>• Variance reporting for inventory</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
