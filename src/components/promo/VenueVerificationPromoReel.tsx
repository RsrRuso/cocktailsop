import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Shield, 
  Users, 
  CheckCircle2, 
  BadgeCheck, 
  FileCheck, 
  Briefcase,
  MapPin,
  Clock,
  UserCheck,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  gradient: string;
  accentColor: string;
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "venue-registration",
    title: "Venue Registration",
    subtitle: "Get Your Venue Verified",
    description: "Register your bar, restaurant, or hotel and unlock powerful team management tools",
    icon: Building2,
    features: ["Multi-outlet support", "Brand verification", "Team management"],
    gradient: "from-primary via-amber-500 to-orange-500",
    accentColor: "primary"
  },
  {
    id: "verification-methods",
    title: "Multiple Verification",
    subtitle: "Prove Your Identity",
    description: "Choose from email, phone, social media, or document verification",
    icon: Shield,
    features: ["Email verification", "Phone OTP", "Document upload"],
    gradient: "from-blue-500 via-indigo-500 to-purple-500",
    accentColor: "blue-500"
  },
  {
    id: "employment-claims",
    title: "Claim Work History",
    subtitle: "Build Your Career Timeline",
    description: "Staff can claim their employment at verified venues for a trusted career record",
    icon: Briefcase,
    features: ["Position details", "Date ranges", "Department info"],
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    accentColor: "emerald-500"
  },
  {
    id: "admin-approval",
    title: "Admin Approval",
    subtitle: "Venue-Verified Claims",
    description: "Venue admins review and approve employment claims for maximum trust",
    icon: UserCheck,
    features: ["Quick approve", "Edit & approve", "Reject with reason"],
    gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
    accentColor: "rose-500"
  },
  {
    id: "verified-network",
    title: "Verified Network",
    subtitle: "Trust at Scale",
    description: "Join a network of verified professionals with authentic work histories",
    icon: BadgeCheck,
    features: ["Verified badges", "Trusted profiles", "Industry credibility"],
    gradient: "from-primary via-yellow-500 to-amber-500",
    accentColor: "primary"
  }
];

export const VenueVerificationPromoReel = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  
  const slide = PROMO_SLIDES[currentSlide];
  const Icon = slide.icon;

  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
  }, []);

  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      {/* Phone frame */}
      <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden border-4 border-border/50 shadow-2xl">
        {/* Animated background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
          />
        </AnimatePresence>

        {/* Overlay pattern */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              initial={{ 
                x: Math.random() * 320, 
                y: 600,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: -50,
                x: Math.random() * 320
              }}
              transition={{ 
                duration: 6 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-white">SpecVerse</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <Shield className="w-3 h-3 text-white" />
              <span className="text-xs text-white">Verified</span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center border border-white/30"
                >
                  <Icon className="w-10 h-10 text-white" />
                </motion.div>

                {/* Text */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wider">
                    {slide.subtitle}
                  </p>
                  <h2 className="text-2xl font-bold text-white">
                    {slide.title}
                  </h2>
                  <p className="text-sm text-white/80 max-w-[240px] mx-auto">
                    {slide.description}
                  </p>
                </div>

                {/* Features */}
                <div className="flex flex-wrap justify-center gap-2">
                  {slide.features.map((feature, idx) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom section */}
          <div className="space-y-4">
            {/* CTA Button */}
            <Button
              onClick={() => navigate("/auth")}
              className="w-full py-5 bg-white/20 backdrop-blur-lg text-white font-bold rounded-xl border border-white/30 hover:bg-white/30 transition-all"
            >
              Get Started Free
            </Button>

            {/* Progress indicators */}
            <div className="flex justify-center gap-2">
              {PROMO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1 rounded-full transition-all ${
                    idx === currentSlide 
                      ? "w-8 bg-white" 
                      : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Side controls */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handlePrevSlide}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextSlide}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats below reel */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-gradient-primary">850+</div>
          <div className="text-xs text-muted-foreground">Venues</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-gradient-gold">2.4K</div>
          <div className="text-xs text-muted-foreground">Verified</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-white">100%</div>
          <div className="text-xs text-muted-foreground">Free</div>
        </div>
      </div>
    </div>
  );
};

export default VenueVerificationPromoReel;
