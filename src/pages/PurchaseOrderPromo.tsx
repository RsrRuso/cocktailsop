import { PurchaseOrderPromoVideo } from "@/components/promo/PurchaseOrderPromoVideo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Users, ClipboardCheck, TrendingUp, AlertTriangle, Calculator, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function PurchaseOrderPromo() {
  const navigate = useNavigate();

  const features = [
    { icon: Users, title: "Team Workspace", desc: "Everyone works in the same space" },
    { icon: Package, title: "Order Tracking", desc: "Follow up on all purchase orders" },
    { icon: ClipboardCheck, title: "Receiving Check", desc: "Verify quantity & quality" },
    { icon: AlertTriangle, title: "Discrepancy Detection", desc: "Flag missing or damaged items" },
    { icon: Calculator, title: "Auto Deduction", desc: "Excluded items in red, total adjusted" },
    { icon: BarChart3, title: "Usage Forecast", desc: "Predict item needs based on history" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5">
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
            <h1 className="text-3xl font-bold">Purchase Order Promo</h1>
            <p className="text-muted-foreground">Generate a promotional video for the PO system</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Video Generator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <PurchaseOrderPromoVideo />
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
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-blue-500" />
                Purchase Order Flow
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Team creates purchase order with items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Order sent to vendor with tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Receive delivery & scan items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>Check each item for quantity & quality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                  <span>Flag discrepancies (missing/damaged)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold shrink-0">6</span>
                  <span>Excluded items shown in RED & deducted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold shrink-0">7</span>
                  <span>Invoice total auto-adjusted</span>
                </li>
              </ol>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Smart Features
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <span className="text-red-400 font-medium">Red items</span> = Excluded from invoice</li>
                <li>• Total spending overview with budget tracking</li>
                <li>• Category-wise expense breakdown</li>
                <li>• Usage forecast based on historical data</li>
                <li>• Low stock alerts with reorder suggestions</li>
                <li>• Team activity feed for collaboration</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
