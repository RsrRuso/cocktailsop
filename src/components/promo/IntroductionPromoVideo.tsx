import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown,
  Users, Video, Music, Briefcase, Building2, ChefHat, 
  Calculator, MessageCircle, Heart, Star, Zap, Award,
  TrendingUp, Globe, Sparkles, Camera, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Promo slides with platform features
const PROMO_SLIDES = [
  {
    id: 'intro',
    title: 'Welcome to SpecVerse',
    subtitle: 'Your Hospitality Universe',
    description: 'The ultimate platform where hospitality professionals connect, create, and grow together',
    icon: Sparkles,
    gradient: 'from-blue-600 via-purple-600 to-pink-600',
    benefits: ['Connect with 50K+ professionals', 'Share your creative content', 'Build your career']
  },
  {
    id: 'social',
    title: 'Social Hub',
    subtitle: 'Connect & Share',
    description: 'Create stunning reels, share stories, and engage with a vibrant community of hospitality professionals',
    icon: Video,
    gradient: 'from-blue-500 to-cyan-500',
    benefits: ['Instagram-style engagement', 'Professional networking', 'Real-time messaging']
  },
  {
    id: 'reels',
    title: 'Reel Editor Pro',
    subtitle: '4K Video Creation',
    description: 'Professional video editing with filters, music, text overlays, and effects. Create viral content in minutes',
    icon: Camera,
    gradient: 'from-rose-500 to-red-500',
    benefits: ['4K HDR support', 'Trending music library', 'Pro editing tools']
  },
  {
    id: 'music',
    title: 'Music Library',
    subtitle: 'Sounds That Trend',
    description: 'Access thousands of trending tracks, upload your own music, and create the perfect soundtrack',
    icon: Music,
    gradient: 'from-violet-500 to-purple-600',
    benefits: ['Trending sounds', 'Upload your tracks', 'Instant sync']
  },
  {
    id: 'career',
    title: 'Professional Network',
    subtitle: 'Build Your Career',
    description: 'Showcase your portfolio, find jobs, verify work history, and connect with industry leaders',
    icon: Briefcase,
    gradient: 'from-purple-500 to-pink-500',
    benefits: ['Job marketplace', 'Venue verification', 'Digital portfolio']
  },
  {
    id: 'tools',
    title: 'Industry Tools',
    subtitle: 'Work Smarter',
    description: 'Professional tools for cocktail recipes, batch calculations, inventory management, and more',
    icon: ChefHat,
    gradient: 'from-amber-500 to-orange-500',
    benefits: ['Cocktail SOP Builder', 'Batch Calculator', 'Lab Operations']
  },
  {
    id: 'venues',
    title: 'Venue Management',
    subtitle: 'For Business',
    description: 'Complete venue management with staff directory, task management, and purchase orders',
    icon: Building2,
    gradient: 'from-emerald-500 to-teal-500',
    benefits: ['Team management', 'Smart ordering', 'Cost analytics']
  },
  {
    id: 'monetize',
    title: 'Creator Economy',
    subtitle: 'Earn & Grow',
    description: 'Monetize your content with tips, subscriptions, and brand partnerships',
    icon: Star,
    gradient: 'from-yellow-500 to-amber-500',
    benefits: ['Tips & donations', 'Paid subscriptions', 'Creator badges']
  },
  {
    id: 'community',
    title: 'Global Community',
    subtitle: 'Worldwide Network',
    description: 'Join channels, participate in competitions, and be part of the largest hospitality community',
    icon: Globe,
    gradient: 'from-teal-500 to-blue-500',
    benefits: ['Topic channels', 'Industry events', 'Competition tracking']
  },
  {
    id: 'security',
    title: 'Secure & Trusted',
    subtitle: 'Your Data, Protected',
    description: 'Enterprise-grade security with verified profiles and privacy controls you can trust',
    icon: Shield,
    gradient: 'from-slate-600 to-zinc-700',
    benefits: ['End-to-end encryption', 'Verified profiles', 'Privacy controls']
  },
  {
    id: 'cta',
    title: 'Join SpecVerse Today',
    subtitle: 'Free Forever',
    description: 'Start your journey with a free account. No credit card required. Join 50,000+ professionals now!',
    icon: Zap,
    gradient: 'from-blue-600 via-purple-600 to-pink-600',
    benefits: ['Free account', 'Instant access', 'Full features']
  }
];

export function IntroductionPromoVideo() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance slides
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

  const slide = PROMO_SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-[360px] mx-auto h-[640px] md:h-[720px] rounded-2xl overflow-hidden shadow-2xl border border-border/30"
    >
      {/* Animated Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
        >
          {/* Animated particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full"
                initial={{ 
                  x: Math.random() * 400,
                  y: Math.random() * 700,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{
                  y: [null, -100],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
          </div>

          {/* Glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 text-white text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mx-auto w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <SlideIcon className="w-10 h-10" />
            </motion.div>

            {/* Title */}
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm uppercase tracking-wider text-white/80 mb-2"
              >
                {slide.subtitle}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl md:text-4xl font-black"
              >
                {slide.title}
              </motion.h2>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 max-w-xs mx-auto"
            >
              {slide.description}
            </motion.p>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              {slide.benefits.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="flex items-center justify-center gap-2 text-sm"
                >
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* SpecVerse Branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-sm">SpecVerse</span>
          </div>
        </motion.div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
        {PROMO_SLIDES.map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-1 rounded-full overflow-hidden bg-white/30 cursor-pointer"
            onClick={() => setCurrentSlide(idx)}
          >
            <motion.div
              className="h-full bg-white"
              initial={{ width: '0%' }}
              animate={{
                width: idx === currentSlide ? '100%' : idx < currentSlide ? '100%' : '0%'
              }}
              transition={{
                duration: idx === currentSlide && isPlaying ? 4 : 0.3
              }}
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
        <Button
          size="icon"
          variant="ghost"
          onClick={handlePrevSlide}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsMuted(!isMuted)}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleNextSlide}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
      </div>

      {/* Slide Counter */}
      <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-xs z-20">
        {currentSlide + 1} / {PROMO_SLIDES.length}
      </div>

      {/* Navigation Dots */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        {PROMO_SLIDES.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentSlide 
                ? 'bg-white scale-125' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
