import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown,
  Sparkles,
  Shield,
  Users,
  Briefcase,
  TrendingUp,
  Star,
  Check,
  Zap,
  Gift,
  Download,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
    title: "Welcome to SpecVerse",
    subtitle: "Your Career Starts Here",
    description: "The first proof-of-work platform for hospitality professionals. Connect, grow, and get recognized.",
    icon: <Sparkles className="w-12 h-12" />,
    gradient: "from-primary via-blue-500 to-purple-600",
    benefits: ["100% Verified Community", "Global Network", "Real Opportunities"]
  },
  {
    id: 2,
    title: "100% FREE",
    subtitle: "No Hidden Fees. Ever.",
    description: "Full access to all features without paying a single penny. No subscriptions, no premium tiers, no tricks.",
    icon: <Gift className="w-12 h-12" />,
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    benefits: ["Free Forever", "All Features Included", "No Credit Card Required"]
  },
  {
    id: 3,
    title: "Get Verified",
    subtitle: "Stand Out From The Crowd",
    description: "Prove your skills and experience. Get the verified badge that employers and investors trust.",
    icon: <Shield className="w-12 h-12" />,
    gradient: "from-amber-500 via-orange-500 to-red-500",
    benefits: ["Verified Badge", "Trusted Profile", "Industry Recognition"]
  },
  {
    id: 4,
    title: "Smart Tools",
    subtitle: "Professional Grade. Free.",
    description: "Batch calculators, recipe vaults, SOP builders, and 20+ tools designed by industry experts.",
    icon: <Zap className="w-12 h-12" />,
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    benefits: ["20+ Pro Tools", "Save Hours Daily", "Industry Standards"]
  },
  {
    id: 5,
    title: "Network & Grow",
    subtitle: "Your Tribe Awaits",
    description: "Connect with verified professionals, find mentors, discover job opportunities, and build your reputation.",
    icon: <Users className="w-12 h-12" />,
    gradient: "from-pink-500 via-rose-500 to-red-500",
    benefits: ["Find Jobs", "Get Mentored", "Build Reputation"]
  },
  {
    id: 6,
    title: "Career Growth",
    subtitle: "Level Up Your Career",
    description: "Track achievements, earn badges, showcase your portfolio, and attract investors for your concepts.",
    icon: <TrendingUp className="w-12 h-12" />,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    benefits: ["Track Progress", "Earn Badges", "Attract Investors"]
  },
  {
    id: 7,
    title: "Join Now",
    subtitle: "What Are You Waiting For?",
    description: "Thousands of professionals already growing their careers. Don't miss out on the opportunity of a lifetime.",
    icon: <Star className="w-12 h-12" />,
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    benefits: ["2,400+ Members", "850+ Opportunities", "$2M+ Invested"]
  }
];

const PromoVideoReel = () => {
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
      }, 4000);
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
                  duration: idx === currentSlide ? 4 : 0,
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
          {/* FREE Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Gift className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">100% FREE • No Hidden Fees</span>
            </div>
          </motion.div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/auth")}
            className="w-full py-6 bg-white text-black font-bold text-lg rounded-2xl hover:bg-white/90 transition-all shadow-xl"
          >
            Join SpecVerse Free
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
              <button
                onClick={() => navigate("/promo-ads")}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                title="Create Promo Ads"
              >
                <Video className="w-5 h-5 text-white" />
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

export default PromoVideoReel;
