import { PurchaseOrderPromoVideo } from "@/components/promo/PurchaseOrderPromoVideo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Users, ClipboardCheck, TrendingUp, AlertTriangle, Calculator, BarChart3, Lock, Upload, FileText, Image, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function PurchaseOrderPromo() {
  const navigate = useNavigate();

  const features = [
    { icon: Lock, title: "PIN Access", desc: "Secure team login with 4-digit PIN" },
    { icon: Users, title: "Team Workspace", desc: "Everyone works in the same space" },
    { icon: Upload, title: "Smart Upload", desc: "PDF, Image, Excel auto-parsed" },
    { icon: Package, title: "Order Tracking", desc: "Follow up on all purchase orders" },
    { icon: ClipboardCheck, title: "Receiving Check", desc: "Upload delivery doc for comparison" },
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

            {/* PIN Access Section */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-indigo-500" />
                Secure PIN Access
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Team members access the PO system with their unique 4-digit PIN from the Profile &gt; My Space section.
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-12 rounded-lg bg-background/50 border border-border flex items-center justify-center text-lg font-bold">
                    •
                  </div>
                ))}
              </div>
            </div>

            {/* File Upload Section */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-cyan-500" />
                Smart File Upload
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload any invoice format - we parse it automatically
              </p>
              <div className="flex justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">PDF</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Image className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Image</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Excel</span>
                </div>
              </div>
            </div>

            {/* Purchase Order Flow */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-blue-500" />
                Purchase Order Flow
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Login with your PIN from Profile &gt; My Space</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Upload invoice (PDF/Image/Excel) - auto-parsed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Review parsed items & create purchase order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs font-bold shrink-0">4</span>
                  <span>When delivery arrives, upload delivery document</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold shrink-0">5</span>
                  <span>System compares & flags discrepancies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-xs font-bold shrink-0">6</span>
                  <span>Excluded items shown in <span className="text-red-500 font-medium">RED</span> & deducted</span>
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
