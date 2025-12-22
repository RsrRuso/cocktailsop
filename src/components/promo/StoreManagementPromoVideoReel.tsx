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
  Zap,
  Package,
  Shield,
  Bell,
  BarChart3
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
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 1,
    title: "Store Management",
    subtitle: "Complete Inventory Control",
    description: "Centralized inventory management for multi-location hospitality operations. Track stock, transfers, and variances in real-time.",
    icon: <Store className="w-12 h-12" />,
    gradient: "from-emerald-500 via-green-500 to-teal-600",
    benefits: ["Multi-Store Support", "Real-Time Tracking", "Complete Audit Trail"]
  },
  {
    id: 2,
    title: "Store Setup",
    subtitle: "Configure Your Locations",
    description: "Create unlimited stores with custom types. WAREHOUSE auto-syncs to retail stores, ensuring seamless inventory distribution.",
    icon: <Package className="w-12 h-12" />,
    gradient: "from-blue-500 via-indigo-500 to-violet-600",
    benefits: ["Unlimited Stores", "Smart Auto-Sync", "Store Type Categories"]
  },
  {
    id: 3,
    title: "Inventory Transfers",
    subtitle: "Move Stock Effortlessly",
    description: "Transfer inventory between stores with one click. Automatic quantity adjustments, complete logging, and real-time notifications.",
    icon: <ArrowRightLeft className="w-12 h-12" />,
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    benefits: ["One-Click Transfers", "Auto Adjustments", "Real-Time Updates"]
  },
  {
    id: 4,
    title: "Receiving Goods",
    subtitle: "Record Incoming Stock",
    description: "Log received inventory from suppliers instantly. Items auto-populate across stores when received at central warehouse.",
    icon: <Download className="w-12 h-12" />,
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
    benefits: ["Quick Recording", "Supplier Tracking", "Auto-Distribution"]
  },
  {
    id: 5,
    title: "Spot Check Audits",
    subtitle: "Physical Inventory Counts",
    description: "Conduct physical counts with ease. Compare expected vs actual, auto-calculate variances, and update records instantly.",
    icon: <ClipboardCheck className="w-12 h-12" />,
    gradient: "from-orange-500 via-amber-500 to-yellow-600",
    benefits: ["Easy Counting", "Auto Calculations", "Instant Updates"]
  },
  {
    id: 6,
    title: "Variance Analysis",
    subtitle: "Track Discrepancies",
    description: "Identify inventory discrepancies with detailed variance reports. Investigate root causes and take corrective action.",
    icon: <TrendingDown className="w-12 h-12" />,
    gradient: "from-red-500 via-rose-500 to-pink-600",
    benefits: ["Variance Reports", "Root Cause Analysis", "Action Tracking"]
  },
  {
    id: 7,
    title: "Secure PIN Access",
    subtitle: "Staff Mobile Access",
    description: "Give staff secure access via 4-digit PINs. Perfect for shared devices at POS or warehouse. Full audit trail included.",
    icon: <Lock className="w-12 h-12" />,
    gradient: "from-slate-600 via-zinc-600 to-neutral-700",
    benefits: ["4-Digit PIN Login", "Shared Device Ready", "Full Audit Trail"]
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
      }, 4500);
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
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-24 h-24 rounded-full bg-white/10 blur-xl"
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: Math.random() * 100 + "%",
                  scale: 0.5 
                }}
                animate={{ 
                  x: [null, Math.random() * 100 + "%"],
                  y: [null, Math.random() * 100 + "%"],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{ 
                  duration: 8 + Math.random() * 4,
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
      <div className="relative z-10 h-full flex flex-col justify-between p-6">
        {/* Top Progress Bars */}
        <div className="flex gap-1">
          {PROMO_SLIDES.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: idx < currentSlide ? "100%" : "0%" }}
                animate={{ 
                  width: idx < currentSlide ? "100%" : idx === currentSlide ? "100%" : "0%" 
                }}
                transition={{ 
                  duration: idx === currentSlide ? 4.5 : 0,
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
            className="flex-1 flex flex-col items-center justify-center text-center text-white space-y-6"
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
              className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              {currentPromo.icon}
            </motion.div>

            {/* Title */}
            <div className="space-y-2">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold tracking-tight"
              >
                {currentPromo.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg font-medium text-white/90"
              >
                {currentPromo.subtitle}
              </motion.p>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-white/80 max-w-xs leading-relaxed"
            >
              {currentPromo.description}
            </motion.p>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
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
                  <span className="text-sm font-medium">{benefit}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <div className="space-y-4">
          {/* Feature Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Secure • Reliable • Real-time</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/store-management")}
            className="w-full py-6 bg-white text-black font-bold text-lg rounded-2xl hover:bg-white/90 transition-all shadow-xl"
          >
            Open Store Management
          </Button>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSlide}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronUp className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleNextSlide}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side indicators */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {PROMO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentSlide 
                ? "bg-white h-6" 
                : "bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default StoreManagementPromoVideoReel;
