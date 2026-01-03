import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, ChevronUp, ChevronDown,
  Users, Video, Music, Briefcase, Building2, ChefHat, 
  Calculator, MessageCircle, Heart, Star, Zap, Award,
  TrendingUp, Globe, Sparkles, Camera, Shield, Wallet,
  BookOpen, Target, Lightbulb, Rocket, Crown, Gift,
  BarChart3, Clock, Check, Fingerprint, Lock, Eye,
  Palette, Wand2, Layers, Share2, Download, Upload,
  Mic, Headphones, Radio, FileAudio, Disc, PlayCircle,
  GraduationCap, Medal, Trophy, Flag, Map, Navigation,
  Store, ShoppingBag, Package, Truck, ClipboardList,
  Thermometer, Beaker, TestTube2, FlaskConical, Droplets,
  HandCoins, BadgeDollarSign, CreditCard, PiggyBank, Banknote,
  UserCheck, UserPlus, Users2, Network, Link2, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Comprehensive promo slides with detailed platform features
const PROMO_SLIDES = [
  {
    id: 'intro',
    title: 'Welcome to SpecVerse',
    subtitle: 'Your Hospitality Universe',
    description: 'The world\'s first all-in-one platform designed exclusively for hospitality professionals. Connect, create, learn, and grow in a community of 50,000+ industry experts.',
    icon: Sparkles,
    gradient: 'from-blue-600 via-purple-600 to-pink-600',
    benefits: ['50,000+ Active Professionals', 'Used in 120+ Countries', 'Free Forever Access'],
    stats: { users: '50K+', countries: '120+', posts: '1M+' }
  },
  {
    id: 'feed',
    title: 'Dynamic Social Feed',
    subtitle: 'Stay Connected',
    description: 'A beautifully designed feed featuring posts, reels, stories, and updates from bartenders, chefs, managers, and hospitality leaders worldwide.',
    icon: Heart,
    gradient: 'from-pink-500 to-rose-600',
    benefits: ['Like, Comment & Share Posts', 'Save Favorite Content', 'Algorithm-Powered Discovery', 'Real-time Updates'],
    stats: { dailyPosts: '10K+', engagement: '95%', stories: '5K+' }
  },
  {
    id: 'reels',
    title: 'Reel Editor Pro',
    subtitle: 'Professional Video Creation',
    description: 'Create stunning 4K/HD videos with our professional editor. Add music, filters, text, stickers, transitions, and effects. Perfect for cocktail tutorials, venue tours, and recipes.',
    icon: Camera,
    gradient: 'from-rose-500 to-red-500',
    benefits: ['4K Ultra HD Support', '60fps Smooth Recording', '100+ Pro Filters', 'Green Screen Effects', 'Speed Controls'],
    stats: { filters: '100+', effects: '50+', templates: '200+' }
  },
  {
    id: 'editing',
    title: 'Advanced Editing Suite',
    subtitle: 'Create Like a Pro',
    description: 'Timeline-based editing with multi-track audio, keyframe animations, color grading, cropping, trimming, and seamless transitions between clips.',
    icon: Wand2,
    gradient: 'from-violet-500 to-purple-600',
    benefits: ['Multi-Track Timeline', 'Keyframe Animations', 'Color Correction', 'Audio Ducking', 'Export up to 500MB'],
    stats: { transitions: '30+', fonts: '50+', stickers: '500+' }
  },
  {
    id: 'music',
    title: 'Music Library',
    subtitle: 'Sounds That Trend',
    description: 'Access thousands of trending tracks, royalty-free music, and sound effects. Upload your own audio or sync with popular songs to make your content go viral.',
    icon: Music,
    gradient: 'from-indigo-500 to-violet-600',
    benefits: ['Trending Sounds Daily', 'Royalty-Free Tracks', 'Upload Your Music', 'Sound Effects Library', 'Auto Beat Sync'],
    stats: { tracks: '10K+', genres: '25+', sfx: '1K+' }
  },
  {
    id: 'stories',
    title: 'Stories & Moments',
    subtitle: '24-Hour Highlights',
    description: 'Share ephemeral content that disappears in 24 hours. Perfect for behind-the-scenes, daily specials, shift vibes, and spontaneous moments.',
    icon: Clock,
    gradient: 'from-orange-500 to-amber-500',
    benefits: ['24-Hour Auto Delete', 'Story Highlights', 'Interactive Polls', 'Question Stickers', 'Music Integration'],
    stats: { dailyStories: '15K+', views: '2M+', interactions: '500K+' }
  },
  {
    id: 'messaging',
    title: 'Direct Messaging',
    subtitle: 'Connect Privately',
    description: 'Private and group messaging with media sharing, voice notes, reactions, and read receipts. Network with industry professionals securely.',
    icon: MessageCircle,
    gradient: 'from-cyan-500 to-blue-500',
    benefits: ['Private & Group Chats', 'Voice Messages', 'Media Sharing', 'Message Reactions', 'Read Receipts'],
    stats: { dailyMessages: '100K+', groups: '5K+', active: '98%' }
  },
  {
    id: 'profile',
    title: 'Professional Portfolio',
    subtitle: 'Showcase Your Work',
    description: 'Build a stunning digital portfolio with your work history, skills, certifications, awards, and signature creations. Your professional identity in one place.',
    icon: Briefcase,
    gradient: 'from-emerald-500 to-teal-600',
    benefits: ['Work History Timeline', 'Skills Showcase', 'Certification Display', 'Media Gallery', 'QR Code Sharing'],
    stats: { portfolios: '30K+', views: '5M+', hires: '10K+' }
  },
  {
    id: 'verification',
    title: 'Venue Verification',
    subtitle: 'Verified Employment',
    description: 'Claim your work history and get it verified by venue managers. Build a trusted, verified profile that employers and industry peers can trust.',
    icon: UserCheck,
    gradient: 'from-green-500 to-emerald-600',
    benefits: ['Manager Verification', 'Work History Claims', 'Digital Proof Upload', 'Verified Badges', 'Reference System'],
    stats: { verified: '15K+', venues: '5K+', claims: '50K+' }
  },
  {
    id: 'jobs',
    title: 'Job Marketplace',
    subtitle: 'Find Your Next Role',
    description: 'Browse and apply to hospitality jobs worldwide. From bartender positions to F&B director roles, find opportunities that match your skills and aspirations.',
    icon: Target,
    gradient: 'from-blue-500 to-indigo-600',
    benefits: ['Global Job Listings', 'One-Click Apply', 'Salary Insights', 'Company Reviews', 'Interview Scheduling'],
    stats: { jobs: '5K+', companies: '2K+', placements: '8K+' }
  },
  {
    id: 'cocktails',
    title: 'Cocktail SOP Builder',
    subtitle: 'Recipe Perfection',
    description: 'Create professional Standard Operating Procedures for cocktails. Include ABV calculations, cost analysis, taste profiles, nutritional info, and step-by-step methods.',
    icon: Beaker,
    gradient: 'from-amber-500 to-orange-600',
    benefits: ['ABV Calculator', 'Cost Per Serve', 'Taste Wheel', 'Nutritional Facts', 'Version Control'],
    stats: { recipes: '25K+', shared: '100K+', sops: '50K+' }
  },
  {
    id: 'batch',
    title: 'Batch Calculator',
    subtitle: 'Scale Perfectly',
    description: 'Scale recipes from single serves to banquet quantities instantly. Calculate ingredients, costs, and portions with precision for any batch size.',
    icon: Calculator,
    gradient: 'from-teal-500 to-cyan-600',
    benefits: ['Instant Scaling', 'Unit Conversion', 'Cost Calculation', 'Production Logging', 'QR Code Labels'],
    stats: { calculations: '1M+', batches: '100K+', saved: '$2M+' }
  },
  {
    id: 'labops',
    title: 'Lab Operations',
    subtitle: 'Inventory Intelligence',
    description: 'Track bottles, manage pars, log usage, and monitor costs across multiple outlets. Real-time inventory management for bars and restaurants.',
    icon: FlaskConical,
    gradient: 'from-purple-500 to-pink-600',
    benefits: ['Bottle Tracking', 'Par Level Alerts', 'Usage Analytics', 'Multi-Outlet Sync', 'Waste Logging'],
    stats: { bottles: '500K+', outlets: '1K+', savings: '$5M+' }
  },
  {
    id: 'specverse',
    title: 'SpecVerse Intelligence',
    subtitle: 'Hardware-Powered Analytics',
    description: 'Connect smart pourers and sensors to track real consumption vs sales. Identify variance, measure staff performance, and uncover hidden revenue.',
    icon: BarChart3,
    gradient: 'from-slate-600 to-zinc-700',
    benefits: ['Smart Pourer Integration', 'Real vs Virtual Tracking', 'Staff Performance', 'Risk Radar', 'Revenue Recovery'],
    stats: { accuracy: '99.9%', recovered: '$10M+', venues: '500+' }
  },
  {
    id: 'venues',
    title: 'Venue Management',
    subtitle: 'For Business Owners',
    description: 'Complete venue management platform with staff directory, shift scheduling, task management, purchase orders, and team communication.',
    icon: Building2,
    gradient: 'from-slate-500 to-gray-600',
    benefits: ['Staff Directory', 'Shift Scheduling', 'Task Management', 'Purchase Orders', 'Team Chat'],
    stats: { venues: '3K+', staff: '25K+', tasks: '1M+' }
  },
  {
    id: 'preopening',
    title: 'Pre-Opening Package',
    subtitle: '19 Essential Tools',
    description: 'Everything you need to launch a new venue: HR onboarding, equipment setup, design guidelines, training programs, and opening checklists.',
    icon: Rocket,
    gradient: 'from-orange-500 to-red-600',
    benefits: ['HR Automation', 'Equipment Tracking', 'Design Templates', 'Training Modules', 'Launch Checklists'],
    stats: { tools: '19', openings: '200+', saved: '1000hrs' }
  },
  {
    id: 'community',
    title: 'Community Channels',
    subtitle: 'Join the Conversation',
    description: 'Topic-based channels for bartenders, sommeliers, chefs, managers, and more. Share knowledge, ask questions, and learn from industry experts.',
    icon: Users2,
    gradient: 'from-violet-500 to-purple-600',
    benefits: ['Topic Channels', 'Expert AMAs', 'Knowledge Base', 'Polls & Surveys', 'Event Announcements'],
    stats: { channels: '100+', members: '40K+', posts: '500K+' }
  },
  {
    id: 'competitions',
    title: 'Competition Tracking',
    subtitle: 'Compete & Win',
    description: 'Track bartending competitions, register for events, follow results, and build your competition portfolio. Connect with fellow competitors.',
    icon: Trophy,
    gradient: 'from-yellow-500 to-amber-600',
    benefits: ['Global Event Calendar', 'Registration System', 'Live Results', 'Winner Profiles', 'Sponsorship Connect'],
    stats: { competitions: '500+', participants: '10K+', prizes: '$1M+' }
  },
  {
    id: 'learning',
    title: 'Learning Hub',
    subtitle: 'Never Stop Growing',
    description: 'Courses, tutorials, and certifications from industry experts. Learn cocktail techniques, bar management, wine service, and hospitality skills.',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-cyan-600',
    benefits: ['Video Courses', 'Certifications', 'Expert Instructors', 'Progress Tracking', 'Certificate Sharing'],
    stats: { courses: '200+', students: '20K+', certificates: '15K+' }
  },
  {
    id: 'monetize',
    title: 'Creator Economy',
    subtitle: 'Earn From Your Content',
    description: 'Monetize your expertise with tips, paid subscriptions, exclusive content, and brand partnerships. Turn your passion into income.',
    icon: HandCoins,
    gradient: 'from-green-500 to-emerald-600',
    benefits: ['Tip Jar Feature', 'Paid Subscriptions', 'Exclusive Content', 'Brand Deals', 'Payout System'],
    stats: { creators: '5K+', earned: '$500K+', tips: '100K+' }
  },
  {
    id: 'badges',
    title: 'Achievement Badges',
    subtitle: 'Earn Recognition',
    description: 'Earn badges for milestones, contributions, and achievements. From "Rising Star" to "Legend" status, showcase your journey.',
    icon: Award,
    gradient: 'from-amber-500 to-yellow-500',
    benefits: ['Milestone Badges', 'Skill Badges', 'Community Badges', 'Verified Status', 'Leaderboards'],
    stats: { badges: '50+', earned: '200K+', legends: '100+' }
  },
  {
    id: 'analytics',
    title: 'Profile Analytics',
    subtitle: 'Track Your Growth',
    description: 'Detailed insights into your profile views, content performance, follower growth, and engagement rates. Understand what works.',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-blue-600',
    benefits: ['View Analytics', 'Engagement Rates', 'Follower Insights', 'Content Performance', 'Growth Trends'],
    stats: { dataPoints: '50+', reports: '10K+', insights: '1M+' }
  },
  {
    id: 'ai',
    title: 'AI-Powered Features',
    subtitle: 'Smart Assistance',
    description: 'AI-generated content suggestions, recipe recommendations, caption writing, hashtag optimization, and smart search across the platform.',
    icon: Lightbulb,
    gradient: 'from-cyan-500 to-teal-600',
    benefits: ['AI Content Ideas', 'Recipe Suggestions', 'Smart Captions', 'Hashtag Generator', 'Intelligent Search'],
    stats: { suggestions: '10M+', accuracy: '92%', saved: '50K hrs' }
  },
  {
    id: 'security',
    title: 'Enterprise Security',
    subtitle: 'Your Data Protected',
    description: 'Bank-grade encryption, two-factor authentication, privacy controls, and GDPR compliance. Your data is safe with us.',
    icon: Shield,
    gradient: 'from-slate-600 to-zinc-700',
    benefits: ['End-to-End Encryption', '2FA Authentication', 'Privacy Controls', 'GDPR Compliant', 'Data Export'],
    stats: { encryption: '256-bit', uptime: '99.9%', audits: 'SOC2' }
  },
  {
    id: 'mobile',
    title: 'Mobile First',
    subtitle: 'Always With You',
    description: 'Native iOS and Android apps with offline access, push notifications, and seamless sync. Access SpecVerse anywhere, anytime.',
    icon: Zap,
    gradient: 'from-purple-500 to-pink-600',
    benefits: ['iOS & Android Apps', 'Offline Access', 'Push Notifications', 'Dark Mode', 'Widget Support'],
    stats: { downloads: '100K+', rating: '4.9★', reviews: '10K+' }
  },
  {
    id: 'cta',
    title: 'Join SpecVerse Today',
    subtitle: 'Free Forever • No Credit Card',
    description: 'Start your journey with a completely free account. Access all core features instantly. Join 50,000+ hospitality professionals and transform your career.',
    icon: Crown,
    gradient: 'from-blue-600 via-purple-600 to-pink-600',
    benefits: ['100% Free to Join', 'Instant Access', 'All Core Features', 'No Hidden Fees', 'Premium Upgrades Available'],
    stats: { signups: '1K+/day', rating: '4.9★', satisfaction: '98%' }
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
    }, 5000);
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
            {[...Array(25)].map((_, i) => (
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
          <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-5 text-white text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg"
            >
              <SlideIcon className="w-8 h-8" />
            </motion.div>

            {/* Title */}
            <div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs uppercase tracking-widest text-white/80 mb-1"
              >
                {slide.subtitle}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl md:text-3xl font-black leading-tight"
              >
                {slide.title}
              </motion.h2>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 text-sm max-w-xs mx-auto leading-relaxed"
            >
              {slide.description}
            </motion.p>

            {/* Stats Row */}
            {slide.stats && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
                className="flex justify-center gap-4 py-2"
              >
                {Object.entries(slide.stats).slice(0, 3).map(([key, value], idx) => (
                  <div key={key} className="text-center">
                    <div className="text-lg font-bold text-white">{value}</div>
                    <div className="text-[10px] uppercase text-white/60 tracking-wide">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-1.5"
            >
              {slide.benefits.map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.08 }}
                  className="flex items-center justify-center gap-2 text-xs"
                >
                  <Check className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Button on last slide */}
            {slide.id === 'cta' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <Button 
                  size="lg"
                  className="mt-4 bg-white text-black hover:bg-white/90 font-bold px-8 py-6 text-lg rounded-full shadow-xl"
                  onClick={() => window.location.href = '/auth'}
                >
                  Get Started Free
                  <Rocket className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* SpecVerse Branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="font-bold text-sm">SpecVerse</span>
          </div>
        </motion.div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute top-3 left-3 right-3 flex gap-0.5 z-20">
        {PROMO_SLIDES.map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-0.5 rounded-full overflow-hidden bg-white/30 cursor-pointer"
            onClick={() => setCurrentSlide(idx)}
          >
            <motion.div
              className="h-full bg-white"
              initial={{ width: '0%' }}
              animate={{
                width: idx === currentSlide ? '100%' : idx < currentSlide ? '100%' : '0%'
              }}
              transition={{
                duration: idx === currentSlide && isPlaying ? 5 : 0.3
              }}
            />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        <Button
          size="icon"
          variant="ghost"
          onClick={handlePrevSlide}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsMuted(!isMuted)}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleNextSlide}
          className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Slide Counter */}
      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-[10px] z-20 font-medium">
        {currentSlide + 1} / {PROMO_SLIDES.length}
      </div>

      {/* Navigation Dots - Scrollable */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20 max-h-[300px] overflow-y-auto scrollbar-hide">
        {PROMO_SLIDES.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`w-1.5 h-1.5 rounded-full transition-all flex-shrink-0 ${
              idx === currentSlide 
                ? 'bg-white scale-150' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Swipe hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ delay: 2, duration: 2, repeat: 1 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/60 text-[10px] flex items-center gap-1 z-20"
      >
        <ChevronUp className="w-3 h-3" />
        Swipe or tap to navigate
      </motion.div>
    </div>
  );
}
