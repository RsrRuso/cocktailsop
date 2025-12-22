import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown,
  Store,
  ArrowRightLeft,
  Download,
  ClipboardCheck,
  TrendingDown,
  Users,
  Lock,
  Check,
  Package,
  Shield,
  Bell,
  BarChart3,
  Smartphone,
  History,
  FileText,
  AlertTriangle,
  Zap,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PromoSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  benefits: string[];
  howItWorks?: string[];
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 1,
    title: "Store Management",
    subtitle: "Complete Inventory Control",
    description: "Centralized inventory management for multi-location hospitality operations. Track stock, transfers, and variances in real-time across all your stores.",
    icon: <Store className="w-12 h-12" />,
    gradient: "from-emerald-500 via-green-500 to-teal-600",
    benefits: ["Multi-Store Support", "Real-Time Tracking", "Complete Audit Trail"],
    howItWorks: ["Create stores & items", "Track inventory levels", "Monitor all movements"]
  },
  {
    id: 2,
    title: "Store Setup",
    subtitle: "Configure Your Locations",
    description: "Create unlimited stores with custom types. WAREHOUSE stores auto-sync new items to all retail locations, ensuring seamless inventory distribution.",
    icon: <Package className="w-12 h-12" />,
    gradient: "from-blue-500 via-indigo-500 to-violet-600",
    benefits: ["Unlimited Stores", "Smart Auto-Sync", "Custom Store Types"],
    howItWorks: ["Click 'Add Store'", "Name & select type", "Items auto-populate"]
  },
  {
    id: 3,
    title: "Inventory Transfers",
    subtitle: "Move Stock Between Stores",
    description: "Transfer inventory between any stores with one click. Source quantity reduces, destination increases automatically. Full audit trail included.",
    icon: <ArrowRightLeft className="w-12 h-12" />,
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    benefits: ["One-Click Transfers", "Auto Adjustments", "Real-Time Updates"],
    howItWorks: ["Select FROM store", "Select TO store", "Enter quantity & submit"]
  },
  {
    id: 4,
    title: "Receiving Goods",
    subtitle: "Record Incoming Stock",
    description: "Log received inventory from suppliers instantly. Include invoice numbers, supplier details. Warehouse receiving auto-syncs to all stores.",
    icon: <Download className="w-12 h-12" />,
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
    benefits: ["Quick Recording", "Supplier Tracking", "Auto-Distribution"],
    howItWorks: ["Select store & item", "Enter quantity received", "Add notes & save"]
  },
  {
    id: 5,
    title: "Spot Check Audits",
    subtitle: "Physical Inventory Counts",
    description: "Conduct physical counts with our guided process. System shows expected quantities, you enter actual counts. Variances calculated automatically.",
    icon: <ClipboardCheck className="w-12 h-12" />,
    gradient: "from-orange-500 via-amber-500 to-yellow-600",
    benefits: ["Guided Counting", "Auto Calculations", "Instant Updates"],
    howItWorks: ["Start spot check", "Enter physical counts", "Submit & auto-adjust"]
  },
  {
    id: 6,
    title: "Variance Analysis",
    subtitle: "Track Discrepancies",
    description: "Identify inventory discrepancies with detailed variance reports. See percentage differences, investigate root causes, and take corrective action.",
    icon: <TrendingDown className="w-12 h-12" />,
    gradient: "from-red-500 via-rose-500 to-pink-600",
    benefits: ["Detailed Reports", "Root Cause Analysis", "Action Tracking"],
    howItWorks: ["Review variance %", "Check activity log", "Investigate & document"]
  },
  {
    id: 7,
    title: "Activity Logging",
    subtitle: "Complete Audit Trail",
    description: "Every inventory movement is logged with timestamp, user, and details. Perfect for accountability, compliance, and investigating discrepancies.",
    icon: <History className="w-12 h-12" />,
    gradient: "from-slate-500 via-gray-500 to-zinc-600",
    benefits: ["Full History", "User Tracking", "Timestamp Records"],
    howItWorks: ["All actions logged", "Filter by type/date", "Export for reports"]
  },
  {
    id: 8,
    title: "Low Stock Alerts",
    subtitle: "Never Run Out",
    description: "Automatic detection of low stock items based on average quantities. Visual alerts on dashboard show which stores need attention.",
    icon: <AlertTriangle className="w-12 h-12" />,
    gradient: "from-amber-500 via-orange-500 to-red-600",
    benefits: ["Auto Detection", "Visual Alerts", "Per-Store Tracking"],
    howItWorks: ["System monitors levels", "Alerts when low", "Take action quickly"]
  },
  {
    id: 9,
    title: "Secure PIN Access",
    subtitle: "Staff Mobile Access",
    description: "Give staff secure access via 4-digit PINs. Perfect for shared devices at POS or warehouse. Staff can manage inventory without full account access.",
    icon: <Lock className="w-12 h-12" />,
    gradient: "from-slate-600 via-zinc-600 to-neutral-700",
    benefits: ["4-Digit PIN Login", "Shared Device Ready", "Full Audit Trail"],
    howItWorks: ["Staff enters PIN", "Access granted", "Actions logged to PIN"]
  },
  {
    id: 10,
    title: "Team Permissions",
    subtitle: "Role-Based Access",
    description: "Control who can receive, transfer, or audit inventory. Assign permissions per team member. Workspace-based collaboration for teams.",
    icon: <Users className="w-12 h-12" />,
    gradient: "from-teal-500 via-emerald-500 to-green-600",
    benefits: ["Granular Control", "Role Assignment", "Team Workspaces"],
    howItWorks: ["Invite team members", "Set permissions", "Manage access levels"]
  },
  {
    id: 11,
    title: "Real-Time Dashboard",
    subtitle: "Everything at a Glance",
    description: "Live dashboard shows all stores, recent activity, low stock alerts, and team actions. Stay informed without digging through reports.",
    icon: <BarChart3 className="w-12 h-12" />,
    gradient: "from-indigo-500 via-blue-500 to-cyan-600",
    benefits: ["Live Updates", "Visual Overview", "Quick Actions"],
    howItWorks: ["Open dashboard", "See all metrics", "Click to drill down"]
  },
  {
    id: 12,
    title: "Export & Reports",
    subtitle: "Professional Documentation",
    description: "Export transfer records, variance reports, and activity logs to PDF. Perfect for management reporting, audits, and compliance.",
    icon: <FileText className="w-12 h-12" />,
    gradient: "from-violet-500 via-purple-500 to-indigo-600",
    benefits: ["PDF Export", "Detailed Reports", "Audit Ready"],
    howItWorks: ["Select date range", "Choose report type", "Download PDF"]
  },
  {
    id: 13,
    title: "Get Started Now",
    subtitle: "Transform Your Operations",
    description: "Join thousands of hospitality professionals using Store Management. Setup takes minutes, benefits last forever. Start optimizing today!",
    icon: <Zap className="w-12 h-12" />,
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    benefits: ["Free to Use", "Easy Setup", "Instant Results"],
    howItWorks: ["Create workspace", "Add stores & items", "Start managing!"]
  }
];

const StoreManagementPromoVideoReel = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance slides
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
  };

  const currentPromo = PROMO_SLIDES[currentSlide];

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-md mx-auto aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Animated Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-br ${currentPromo.gradient}`}
        >
          {/* Animated particles/orbs */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/10 blur-xl"
                style={{
                  width: 20 + Math.random() * 60,
                  height: 20 + Math.random() * 60,
                }}
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: Math.random() * 100 + "%",
                  scale: 0.5 
                }}
                animate={{ 
                  x: [null, Math.random() * 100 + "%"],
                  y: [null, Math.random() * 100 + "%"],
                  scale: [0.5, 1.2, 0.5]
                }}
                transition={{ 
                  duration: 6 + Math.random() * 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        {/* Top Progress Bars */}
        <div className="flex gap-0.5">
          {PROMO_SLIDES.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: idx < currentSlide ? "100%" : "0%" }}
                animate={{ 
                  width: idx < currentSlide ? "100%" : idx === currentSlide ? "100%" : "0%" 
                }}
                transition={{ 
                  duration: idx === currentSlide ? 5 : 0,
                  ease: "linear"
                }}
              />
            </div>
          ))}
        </div>

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col items-center justify-center text-center text-white space-y-4"
          >
            {/* Step indicator */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-medium text-white/70 uppercase tracking-wider"
            >
              Step {currentSlide + 1} of {PROMO_SLIDES.length}
            </motion.div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              {currentPromo.icon}
            </motion.div>

            {/* Title */}
            <div className="space-y-1">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold tracking-tight"
              >
                {currentPromo.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-base font-medium text-white/90"
              >
                {currentPromo.subtitle}
              </motion.p>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-white/80 max-w-xs leading-relaxed px-2"
            >
              {currentPromo.description}
            </motion.p>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-1.5"
            >
              {currentPromo.benefits.map((benefit, idx) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="flex items-center gap-2 text-white/90"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span className="text-xs font-medium">{benefit}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* How It Works */}
            {currentPromo.howItWorks && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 w-full max-w-xs"
              >
                <p className="text-xs font-semibold text-white/90 mb-2 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  How It Works
                </p>
                <div className="flex justify-between text-xs text-white/80">
                  {currentPromo.howItWorks.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-center leading-tight">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <div className="space-y-3">
          {/* Feature Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Shield className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">Secure • Reliable • Real-time</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/store-management")}
            className="w-full py-5 bg-white text-black font-bold text-base rounded-2xl hover:bg-white/90 transition-all shadow-xl"
          >
            Open Store Management
          </Button>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            <div className="text-xs text-white/60">
              {currentSlide + 1} / {PROMO_SLIDES.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSlide}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronUp className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleNextSlide}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side indicators */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {PROMO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-1.5 rounded-full transition-all ${
              idx === currentSlide 
                ? "bg-white h-4" 
                : "bg-white/40 h-1.5 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default StoreManagementPromoVideoReel;
