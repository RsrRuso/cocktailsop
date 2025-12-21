import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown,
  Calculator,
  FlaskConical,
  FileText,
  BarChart3,
  Thermometer,
  ClipboardList,
  QrCode,
  Check,
  Gift,
  Video,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ToolPromoSlide {
  id: number;
  toolName: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  features: string[];
  howItWorks: string;
  benefits: string[];
}

const TOOL_PROMO_SLIDES: ToolPromoSlide[] = [
  {
    id: 1,
    toolName: "Batch Calculator",
    title: "Batch Calculator Pro",
    subtitle: "Scale Any Recipe Instantly",
    description: "The industry's most powerful batch scaling tool. Input any cocktail recipe and instantly scale it from 1 serving to 1,000+ liters. Perfect for bar prep, events, and production batching.",
    icon: <Calculator className="w-12 h-12" />,
    gradient: "from-blue-600 via-indigo-600 to-purple-600",
    features: [
      "Instant ML/OZ/CL conversion",
      "Batch size up to 10,000 liters",
      "Auto-calculate prep sheets"
    ],
    howItWorks: "Enter your recipe ingredients → Set target batch size → Get instant scaled quantities with automatic unit conversions",
    benefits: ["Save 2+ hours daily", "Zero calculation errors", "Print-ready prep sheets"]
  },
  {
    id: 2,
    toolName: "Recipe Vault",
    title: "Digital Recipe Vault",
    subtitle: "Your Secret Recipes, Secured",
    description: "Store, organize, and protect your signature recipes in an encrypted vault. Never lose a recipe again. Share securely with team members or keep them private forever.",
    icon: <FlaskConical className="w-12 h-12" />,
    gradient: "from-amber-500 via-orange-500 to-red-500",
    features: [
      "Unlimited recipe storage",
      "Version history & backup",
      "Secure team sharing"
    ],
    howItWorks: "Upload or create recipes → Organize by category → Set permissions → Access anywhere on any device",
    benefits: ["Never lose recipes", "Team collaboration", "Bank-level security"]
  },
  {
    id: 3,
    toolName: "SOP Builder",
    title: "SOP Builder Studio",
    subtitle: "Professional SOPs in Minutes",
    description: "Create stunning Standard Operating Procedures with our visual builder. Include photos, videos, step-by-step guides, and print them in multiple formats. Train staff faster.",
    icon: <FileText className="w-12 h-12" />,
    gradient: "from-emerald-500 via-green-500 to-teal-500",
    features: [
      "Drag-and-drop editor",
      "Photo & video support",
      "Multi-language export"
    ],
    howItWorks: "Choose template → Add steps with media → Customize branding → Export as PDF, print, or digital format",
    benefits: ["Train staff 3x faster", "Consistent quality", "Brand customization"]
  },
  {
    id: 4,
    toolName: "Cost Analyzer",
    title: "Profit & Cost Analyzer",
    subtitle: "Know Your Numbers",
    description: "Calculate exact pour costs, profit margins, and pricing strategies. Input ingredient costs and get detailed breakdowns per serving, per batch, and monthly projections.",
    icon: <BarChart3 className="w-12 h-12" />,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    features: [
      "Real-time cost tracking",
      "Profit margin calculator",
      "Price optimization AI"
    ],
    howItWorks: "Enter ingredient costs → Link to recipes → See instant cost per drink → Get pricing recommendations for target margins",
    benefits: ["Increase profits 15-30%", "Reduce waste costs", "Smart pricing insights"]
  },
  {
    id: 5,
    toolName: "Temperature Logger",
    title: "HACCP Temperature Log",
    subtitle: "Compliance Made Easy",
    description: "Digital temperature logging for food safety compliance. Record fridge, freezer, and holding temperatures with automatic alerts. Generate audit-ready reports instantly.",
    icon: <Thermometer className="w-12 h-12" />,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    features: [
      "One-tap logging",
      "Automated alerts",
      "Audit-ready reports"
    ],
    howItWorks: "Add equipment → Log temperatures with one tap → Get alerts for out-of-range → Download compliance reports anytime",
    benefits: ["Pass health inspections", "Reduce liability", "Save 1hr/day on logs"]
  },
  {
    id: 6,
    toolName: "Inventory Manager",
    title: "Smart Inventory System",
    subtitle: "Never Run Out Again",
    description: "Track stock levels, set par levels, and get automatic reorder alerts. Scan barcodes, count bottles, and generate purchase orders. Integrates with your recipes for smart forecasting.",
    icon: <ClipboardList className="w-12 h-12" />,
    gradient: "from-pink-500 via-rose-500 to-red-500",
    features: [
      "Barcode scanning",
      "Auto reorder alerts",
      "Usage forecasting"
    ],
    howItWorks: "Set up products & par levels → Scan or count inventory → Get alerts when low → Generate purchase orders automatically",
    benefits: ["Reduce stockouts 90%", "Cut waste by 25%", "Save 3hrs/week"]
  },
  {
    id: 7,
    toolName: "QR Menu Builder",
    title: "QR Code Menu Builder",
    subtitle: "Touchless Menus Instantly",
    description: "Create beautiful digital menus with QR codes. Update prices and items in real-time. Track what guests scan and view. Perfect for cocktail lists, food menus, and wine lists.",
    icon: <QrCode className="w-12 h-12" />,
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    features: [
      "Real-time updates",
      "View analytics",
      "Custom branding"
    ],
    howItWorks: "Upload menu items → Customize design & branding → Generate QR code → Print or display → Update anytime from your phone",
    benefits: ["Zero printing costs", "Update in seconds", "Guest analytics"]
  }
];

const ToolsPromoVideoReel = () => {
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
        setCurrentSlide((prev) => (prev + 1) % TOOL_PROMO_SLIDES.length);
      }, 6000); // Longer duration for detailed content
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + TOOL_PROMO_SLIDES.length) % TOOL_PROMO_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % TOOL_PROMO_SLIDES.length);
  };

  const currentTool = TOOL_PROMO_SLIDES[currentSlide];

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
          className={`absolute inset-0 bg-gradient-to-br ${currentTool.gradient}`}
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
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-4">
        {/* Top Progress Bars */}
        <div className="flex gap-1">
          {TOOL_PROMO_SLIDES.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: idx < currentSlide ? "100%" : "0%" }}
                animate={{ 
                  width: idx < currentSlide ? "100%" : idx === currentSlide ? "100%" : "0%" 
                }}
                transition={{ 
                  duration: idx === currentSlide ? 6 : 0,
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
            className="flex-1 flex flex-col items-center justify-start text-center text-white space-y-3 pt-4 overflow-y-auto"
          >
            {/* Tool Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full"
            >
              <Sparkles className="w-3 h-3" />
              <span className="text-xs font-bold">{currentTool.toolName}</span>
            </motion.div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              {currentTool.icon}
            </motion.div>

            {/* Title */}
            <div className="space-y-1">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold tracking-tight"
              >
                {currentTool.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-sm font-medium text-white/90"
              >
                {currentTool.subtitle}
              </motion.p>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-white/80 max-w-xs leading-relaxed px-2"
            >
              {currentTool.description}
            </motion.p>

            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-3 space-y-2"
            >
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider">Key Features</div>
              <div className="space-y-1">
                {currentTool.features.map((feature, idx) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + idx * 0.08 }}
                    className="flex items-center gap-2 text-white/90"
                  >
                    <Check className="w-3 h-3 text-white flex-shrink-0" />
                    <span className="text-xs font-medium text-left">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* How It Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-3"
            >
              <div className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">How It Works</div>
              <p className="text-xs text-white/90 leading-relaxed">{currentTool.howItWorks}</p>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap justify-center gap-2"
            >
              {currentTool.benefits.map((benefit, idx) => (
                <motion.span
                  key={benefit}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.85 + idx * 0.05 }}
                  className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full font-medium"
                >
                  {benefit}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <div className="space-y-3 pt-2">
          {/* FREE Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Gift className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">100% FREE • All Tools Included</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/tools")}
            className="w-full py-5 bg-white text-black font-bold text-base rounded-2xl hover:bg-white/90 transition-all shadow-xl"
          >
            Try {currentTool.toolName} Free
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
              <button
                onClick={() => navigate("/promo-ads")}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                title="Create Promo Ads"
              >
                <Video className="w-4 h-4 text-white" />
              </button>
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
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
        {TOOL_PROMO_SLIDES.map((slide, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-1.5 rounded-full transition-all ${
              idx === currentSlide 
                ? "bg-white h-5" 
                : "bg-white/40 hover:bg-white/60 h-1.5"
            }`}
            title={slide.toolName}
          />
        ))}
      </div>
    </div>
  );
};

export default ToolsPromoVideoReel;
