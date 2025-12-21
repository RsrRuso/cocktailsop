import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Download, Play, Pause, Share2, 
  Sparkles, Package, Calculator, Calendar,
  ChefHat, Thermometer, BarChart3, Users, Briefcase,
  Music, Video, Camera, MessageSquare, ShoppingCart,
  Eye, Map, X, TrendingUp, Shield, Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface PromoReel {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  duration: string;
  views: number;
  downloads: number;
  thumbnailGradient: string;
  gradientFrom: string;
  gradientTo: string;
  features: string[];
  stats: { label: string; value: string }[];
}

const promoReels: PromoReel[] = [
  {
    id: "inventory",
    title: "Inventory Manager",
    description: "Track stock levels, receive items, and manage transfers with QR scanning",
    category: "Operations",
    icon: <Package className="w-6 h-6" />,
    duration: "0:45",
    views: 12500,
    downloads: 3200,
    thumbnailGradient: "from-blue-500 to-cyan-500",
    gradientFrom: "#3b82f6",
    gradientTo: "#06b6d4",
    features: ["QR Code Scanning", "Real-time Stock", "Transfer Tracking", "Multi-location"],
    stats: [
      { label: "Accuracy", value: "99.2%" },
      { label: "Time Saved", value: "15h/wk" },
      { label: "Waste Cut", value: "40%" }
    ]
  },
  {
    id: "batch-calculator",
    title: "Batch Calculator",
    description: "Scale recipes and track production with precision calculations",
    category: "Production",
    icon: <Calculator className="w-6 h-6" />,
    duration: "0:38",
    views: 8900,
    downloads: 2100,
    thumbnailGradient: "from-purple-500 to-pink-500",
    gradientFrom: "#a855f7",
    gradientTo: "#ec4899",
    features: ["Recipe Scaling", "Batch Tracking", "QR Generation", "Cost Analysis"],
    stats: [
      { label: "Precision", value: "100%" },
      { label: "Batches/Day", value: "50+" },
      { label: "Efficiency", value: "+45%" }
    ]
  },
  {
    id: "staff-scheduling",
    title: "Staff Scheduling",
    description: "Create weekly schedules and assign stations effortlessly",
    category: "Team",
    icon: <Calendar className="w-6 h-6" />,
    duration: "0:35",
    views: 7600,
    downloads: 1800,
    thumbnailGradient: "from-green-500 to-emerald-500",
    gradientFrom: "#22c55e",
    gradientTo: "#10b981",
    features: ["Drag & Drop", "Station Assignment", "PDF Export", "Availability"],
    stats: [
      { label: "Time Saved", value: "70%" },
      { label: "Conflicts", value: "0" },
      { label: "Satisfaction", value: "4.9/5" }
    ]
  },
  {
    id: "cocktail-sop",
    title: "Cocktail SOPs",
    description: "Create and manage standardized cocktail recipes with photos",
    category: "Recipes",
    icon: <ChefHat className="w-6 h-6" />,
    duration: "0:52",
    views: 15200,
    downloads: 4500,
    thumbnailGradient: "from-orange-500 to-red-500",
    gradientFrom: "#f97316",
    gradientTo: "#ef4444",
    features: ["Photo Recipes", "Cost Tracking", "Taste Profiles", "Version Control"],
    stats: [
      { label: "Recipes", value: "500+" },
      { label: "Accuracy", value: "100%" },
      { label: "Training", value: "-60%" }
    ]
  },
  {
    id: "temperature-log",
    title: "Temperature Log",
    description: "Track equipment temperatures for health compliance",
    category: "Compliance",
    icon: <Thermometer className="w-6 h-6" />,
    duration: "0:30",
    views: 5400,
    downloads: 1200,
    thumbnailGradient: "from-cyan-500 to-blue-500",
    gradientFrom: "#06b6d4",
    gradientTo: "#3b82f6",
    features: ["Compliance Ready", "Alert System", "Export Logs", "Auto-Tracking"],
    stats: [
      { label: "Compliance", value: "100%" },
      { label: "Alerts", value: "Instant" },
      { label: "Audits", value: "Pass" }
    ]
  },
  {
    id: "menu-engineering",
    title: "Menu Engineering",
    description: "BCG matrix analysis for menu profitability optimization",
    category: "Analytics",
    icon: <BarChart3 className="w-6 h-6" />,
    duration: "0:48",
    views: 9800,
    downloads: 2800,
    thumbnailGradient: "from-violet-500 to-purple-500",
    gradientFrom: "#8b5cf6",
    gradientTo: "#a855f7",
    features: ["BCG Matrix", "AI Suggestions", "Profit Analysis", "Trend Insights"],
    stats: [
      { label: "Revenue", value: "+28%" },
      { label: "Margin", value: "+15%" },
      { label: "Insights", value: "Real-time" }
    ]
  },
  {
    id: "crm",
    title: "CRM System",
    description: "Manage customers, leads, and deals in one place",
    category: "Business",
    icon: <Users className="w-6 h-6" />,
    duration: "0:42",
    views: 11200,
    downloads: 3100,
    thumbnailGradient: "from-pink-500 to-rose-500",
    gradientFrom: "#ec4899",
    gradientTo: "#f43f5e",
    features: ["Lead Pipeline", "Deal Tracking", "Activity Log", "Automation"],
    stats: [
      { label: "Conversion", value: "+35%" },
      { label: "Leads", value: "10K+" },
      { label: "Retention", value: "92%" }
    ]
  },
  {
    id: "lab-ops",
    title: "LAB Ops",
    description: "Complete restaurant & bar management system",
    category: "Operations",
    icon: <Briefcase className="w-6 h-6" />,
    duration: "0:55",
    views: 18500,
    downloads: 5200,
    thumbnailGradient: "from-amber-500 to-orange-500",
    gradientFrom: "#f59e0b",
    gradientTo: "#f97316",
    features: ["Mobile POS", "KDS System", "Real-time Analytics", "Multi-Outlet"],
    stats: [
      { label: "Speed", value: "+50%" },
      { label: "Orders", value: "1M+" },
      { label: "Uptime", value: "99.9%" }
    ]
  },
  {
    id: "reels-editor",
    title: "Reels Editor Pro",
    description: "Create stunning video content with pro editing tools",
    category: "Content",
    icon: <Video className="w-6 h-6" />,
    duration: "0:40",
    views: 22100,
    downloads: 6800,
    thumbnailGradient: "from-red-500 to-pink-500",
    gradientFrom: "#ef4444",
    gradientTo: "#ec4899",
    features: ["Pro Filters", "Music Library", "Export HD", "Templates"],
    stats: [
      { label: "Exports", value: "50K+" },
      { label: "Quality", value: "4K" },
      { label: "Speed", value: "2x" }
    ]
  },
  {
    id: "music-box",
    title: "Music Box",
    description: "Upload and share your music with the community",
    category: "Content",
    icon: <Music className="w-6 h-6" />,
    duration: "0:35",
    views: 14300,
    downloads: 4100,
    thumbnailGradient: "from-indigo-500 to-violet-500",
    gradientFrom: "#6366f1",
    gradientTo: "#8b5cf6",
    features: ["Audio Upload", "Trending Charts", "Playlist Creation", "Discovery"],
    stats: [
      { label: "Tracks", value: "100K+" },
      { label: "Artists", value: "5K+" },
      { label: "Plays", value: "10M+" }
    ]
  },
  {
    id: "stories",
    title: "Stories & Posts",
    description: "Share moments with beautiful stories and posts",
    category: "Social",
    icon: <Camera className="w-6 h-6" />,
    duration: "0:32",
    views: 28700,
    downloads: 8200,
    thumbnailGradient: "from-yellow-500 to-orange-500",
    gradientFrom: "#eab308",
    gradientTo: "#f97316",
    features: ["Story Editor", "Filters", "Engagement Stats", "Scheduling"],
    stats: [
      { label: "Views", value: "50M+" },
      { label: "Engagement", value: "12%" },
      { label: "Reach", value: "Global" }
    ]
  },
  {
    id: "messaging",
    title: "Messaging",
    description: "Connect with others through instant messaging",
    category: "Social",
    icon: <MessageSquare className="w-6 h-6" />,
    duration: "0:28",
    views: 19400,
    downloads: 5600,
    thumbnailGradient: "from-teal-500 to-cyan-500",
    gradientFrom: "#14b8a6",
    gradientTo: "#06b6d4",
    features: ["Group Chats", "Media Sharing", "Voice Notes", "Encryption"],
    stats: [
      { label: "Messages", value: "1B+" },
      { label: "Groups", value: "100K+" },
      { label: "Secure", value: "E2E" }
    ]
  },
  {
    id: "shop",
    title: "Shop & Marketplace",
    description: "Buy and sell products in the integrated marketplace",
    category: "Commerce",
    icon: <ShoppingCart className="w-6 h-6" />,
    duration: "0:45",
    views: 16800,
    downloads: 4700,
    thumbnailGradient: "from-emerald-500 to-teal-500",
    gradientFrom: "#10b981",
    gradientTo: "#14b8a6",
    features: ["Easy Checkout", "Seller Dashboard", "Order Tracking", "Reviews"],
    stats: [
      { label: "Sales", value: "$5M+" },
      { label: "Sellers", value: "10K+" },
      { label: "Rating", value: "4.8/5" }
    ]
  },
  {
    id: "live-map",
    title: "Live Map",
    description: "Discover venues and events near you with real-time data",
    category: "Discovery",
    icon: <Map className="w-6 h-6" />,
    duration: "0:38",
    views: 13200,
    downloads: 3800,
    thumbnailGradient: "from-lime-500 to-green-500",
    gradientFrom: "#84cc16",
    gradientTo: "#22c55e",
    features: ["Real-time Updates", "Venue Details", "Directions", "Reviews"],
    stats: [
      { label: "Venues", value: "50K+" },
      { label: "Cities", value: "200+" },
      { label: "Updates", value: "Live" }
    ]
  },
  {
    id: "wasabi-ai",
    title: "Wasabi AI",
    description: "Your intelligent assistant for hospitality operations",
    category: "AI",
    icon: <Sparkles className="w-6 h-6" />,
    duration: "0:50",
    views: 24600,
    downloads: 7100,
    thumbnailGradient: "from-fuchsia-500 to-purple-500",
    gradientFrom: "#d946ef",
    gradientTo: "#a855f7",
    features: ["Smart Assistant", "Tool Navigation", "Task Automation", "Insights"],
    stats: [
      { label: "Tasks", value: "1M+" },
      { label: "Accuracy", value: "98%" },
      { label: "Speed", value: "10x" }
    ]
  }
];

const categories = ["All", "Operations", "Content", "Social", "Business", "AI", "Commerce", "Discovery"];

// Animated Canvas Presentation Component
const AnimatedPresentation = ({ 
  reel, 
  isPlaying, 
  isFullscreen = false 
}: { 
  reel: PromoReel; 
  isPlaying: boolean;
  isFullscreen?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const frameRef = useRef(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => {
    // Clear and draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, reel.gradientFrom);
    gradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(frame * 0.02 + i) * 0.5 + 0.5) * width;
      const y = (Math.cos(frame * 0.015 + i * 0.5) * 0.5 + 0.5) * height;
      const size = 2 + Math.sin(frame * 0.05 + i) * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central icon circle with pulse effect
    const centerX = width / 2;
    const centerY = height * 0.25;
    const baseRadius = Math.min(width, height) * (isFullscreen ? 0.12 : 0.15);
    const pulseRadius = baseRadius + Math.sin(frame * 0.05) * 5;

    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isFullscreen ? '28px' : '16px'} system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(reel.title, centerX, height * 0.42);

    // Category badge
    ctx.font = `${isFullscreen ? '14px' : '10px'} system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(reel.category.toUpperCase(), centerX, height * 0.38);

    // Description - word wrap
    ctx.font = `${isFullscreen ? '16px' : '11px'} system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const words = reel.description.split(' ');
    let line = '';
    let lineY = height * 0.50;
    const maxWidth = width * 0.85;
    const lineHeight = isFullscreen ? 22 : 14;
    
    words.forEach((word) => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), centerX, lineY);
        line = word + ' ';
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line.trim(), centerX, lineY);

    // Features with animated checkmarks
    const featuresStartY = height * 0.62;
    const visibleFeatures = Math.min(4, Math.floor(frame / 20) + 1);
    
    reel.features.slice(0, visibleFeatures).forEach((feature, index) => {
      const y = featuresStartY + index * (isFullscreen ? 28 : 18);
      const slideIn = Math.min(1, (frame - index * 20) / 15);
      const offsetX = (1 - slideIn) * 50;
      
      ctx.globalAlpha = slideIn;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      const textWidth = ctx.measureText(feature).width;
      ctx.beginPath();
      ctx.roundRect(centerX - textWidth / 2 - 10 - offsetX, y - (isFullscreen ? 14 : 10), textWidth + 20, isFullscreen ? 24 : 16, 8);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = `${isFullscreen ? '13px' : '9px'} system-ui`;
      ctx.fillText('✓ ' + feature, centerX - offsetX, y);
      ctx.globalAlpha = 1;
    });

    // Stats at bottom with bounce animation
    const statsY = height * 0.88;
    const statsSpacing = width / (reel.stats.length + 1);
    
    reel.stats.forEach((stat, index) => {
      const x = statsSpacing * (index + 1);
      const bounce = Math.sin(frame * 0.04 + index * 0.8) * 3;
      const appear = Math.min(1, Math.max(0, (frame - 60 - index * 10) / 20));
      
      ctx.globalAlpha = appear;
      
      // Stat value
      ctx.font = `bold ${isFullscreen ? '22px' : '14px'} system-ui`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.value, x, statsY + bounce);
      
      // Stat label
      ctx.font = `${isFullscreen ? '11px' : '8px'} system-ui`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(stat.label, x, statsY + (isFullscreen ? 18 : 12) + bounce);
      
      ctx.globalAlpha = 1;
    });

    // Platform branding
    ctx.font = `bold ${isFullscreen ? '12px' : '8px'} system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Platform Showcase', centerX, height - (isFullscreen ? 20 : 10));

  }, [reel, isFullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (isPlaying) {
        frameRef.current += 1;
      }
      draw(ctx, canvas.width, canvas.height, frameRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={isFullscreen ? 720 : 270}
      height={isFullscreen ? 1280 : 480}
      className="w-full h-full object-cover"
    />
  );
};

function PresentationPlayer({ reel, onClose }: { reel: PromoReel; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(true);

  const handleDownload = async () => {
    toast.loading("Generating video...");
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { 
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm' 
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reel.id}-promo.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success("Video downloaded!");
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 150; // 5 seconds at 30fps
      
      const drawFrame = () => {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, reel.gradientFrom);
        gradient.addColorStop(1, reel.gradientTo);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 15; i++) {
          const x = (Math.sin(frame * 0.02 + i) * 0.5 + 0.5) * canvas.width;
          const y = (Math.cos(frame * 0.015 + i * 0.5) * 0.5 + 0.5) * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(reel.title, canvas.width / 2, canvas.height * 0.35);

        ctx.font = '24px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(reel.description.slice(0, 50) + '...', canvas.width / 2, canvas.height * 0.42);

        // Stats
        const statsY = canvas.height * 0.75;
        reel.stats.forEach((stat, index) => {
          const x = (canvas.width / 4) * (index + 1);
          ctx.font = 'bold 36px system-ui';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(stat.value, x, statsY);
          ctx.font = '16px system-ui';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(stat.label, x, statsY + 28);
        });

        frame++;
        if (frame < totalFrames) {
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };

      drawFrame();
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate video");
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden">
        <AnimatedPresentation reel={reel} isPlaying={isPlaying} isFullscreen />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <Badge className={`bg-gradient-to-r ${reel.thumbnailGradient} text-white border-0`}>
            {reel.category}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Center Play/Pause */}
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <span className="text-white/70 text-sm">{reel.duration}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + `/promo/${reel.id}`);
                  toast.success("Link copied!");
                }}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PromoReels() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedReel, setSelectedReel] = useState<PromoReel | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredReels = activeCategory === "All" 
    ? promoReels 
    : promoReels.filter(r => r.category === activeCategory);

  const handleDownload = async (reel: PromoReel) => {
    toast.info(`Generating ${reel.title} promo video...`);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { 
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm' 
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reel.id}-promo.webm`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${reel.title} downloaded!`);
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 150;
      
      const drawFrame = () => {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, reel.gradientFrom);
        gradient.addColorStop(1, reel.gradientTo);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 15; i++) {
          const x = (Math.sin(frame * 0.02 + i) * 0.5 + 0.5) * canvas.width;
          const y = (Math.cos(frame * 0.015 + i * 0.5) * 0.5 + 0.5) * canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(reel.title, canvas.width / 2, canvas.height * 0.35);

        ctx.font = '20px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(reel.description.slice(0, 45) + '...', canvas.width / 2, canvas.height * 0.42);

        const statsY = canvas.height * 0.75;
        reel.stats.forEach((stat, index) => {
          const x = (canvas.width / 4) * (index + 1);
          ctx.font = 'bold 36px system-ui';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(stat.value, x, statsY);
          ctx.font = '14px system-ui';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(stat.label, x, statsY + 26);
        });

        frame++;
        if (frame < totalFrames) {
          requestAnimationFrame(drawFrame);
        } else {
          recorder.stop();
        }
      };

      drawFrame();
    } catch (error) {
      toast.error("Download failed");
    }
  };

  const handleShare = async (reel: PromoReel) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reel.title} - Promo Reel`,
          text: reel.description,
          url: window.location.origin + `/promo/${reel.id}`
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.origin + `/promo/${reel.id}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Promo Reels</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Download promotional videos for our platform tools. Share them on social media to grow your audience!
          </p>
          
          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{promoReels.length}</div>
              <div className="text-xs text-muted-foreground">Promo Reels</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-xl font-bold text-primary">
                {formatNumber(promoReels.reduce((acc, r) => acc + r.downloads, 0))}
              </div>
              <div className="text-xs text-muted-foreground">Downloads</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-xl font-bold text-primary">HD</div>
              <div className="text-xs text-muted-foreground">Quality</div>
            </div>
          </div>
        </motion.div>

        {/* Category Filter */}
        <ScrollArea className="w-full mb-6">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Reels Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredReels.map((reel, index) => (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  onMouseEnter={() => setHoveredId(reel.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedReel(reel)}
                >
                  {/* Video Preview with Content Description */}
                  <div className={`relative aspect-[9/16] bg-gradient-to-br ${reel.thumbnailGradient} overflow-hidden`}>
                    {/* Background Pattern for visual interest */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-2 border-white/30" />
                      <div className="absolute bottom-8 left-2 w-16 h-16 rounded-full border border-white/20" />
                      <div className="absolute top-1/3 left-1/4 w-8 h-8 rounded-lg bg-white/10 rotate-12" />
                    </div>

                    {/* Content Description - Always Visible */}
                    <div className="absolute inset-0 flex flex-col text-white p-3">
                      {/* Top Section - Icon & Title */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                          {reel.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-tight">{reel.title}</h3>
                          <Badge className="bg-white/20 text-white text-[8px] border-0 mt-0.5 px-1.5 py-0">
                            {reel.category}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-white/90 text-[11px] leading-relaxed mb-3 flex-1">
                        {reel.description}
                      </p>

                      {/* Features List */}
                      <div className="space-y-1.5 mb-3">
                        {reel.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px] text-white/80">
                            <div className="w-1 h-1 rounded-full bg-white/60" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Stats */}
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-[10px] text-white/70">
                          <div className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            {formatNumber(reel.views)}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Download className="w-3 h-3" />
                            {formatNumber(reel.downloads)}
                          </div>
                        </div>
                        <Badge className="bg-black/40 text-white text-[9px] border-0">
                          {reel.duration}
                        </Badge>
                      </div>
                    </div>

                    {/* Hover Play Overlay */}
                    <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200 ${hoveredId === reel.id ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                      </div>
                      <span className="absolute bottom-4 text-white text-xs font-medium">Tap to Preview</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <CardContent className="p-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(reel);
                        }}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(reel);
                        }}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredReels.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No promo reels in this category</p>
          </div>
        )}

        {/* How to Use Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 mb-8"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                How to Use Promo Reels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Click to Preview</p>
                    <p className="text-muted-foreground text-xs">Tap any reel to watch the full video</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Download HD Video</p>
                    <p className="text-muted-foreground text-xs">Click download button to save</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Share Everywhere</p>
                    <p className="text-muted-foreground text-xs">Post on Instagram, TikTok, YouTube</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Video Player Dialog */}
      <Dialog open={!!selectedReel} onOpenChange={() => setSelectedReel(null)}>
        <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none">
          {selectedReel && (
            <PresentationPlayer reel={selectedReel} onClose={() => setSelectedReel(null)} />
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
