import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Download, Play, Pause, Volume2, VolumeX, Share2, 
  Sparkles, TrendingUp, Package, Calculator, Calendar,
  ChefHat, Thermometer, BarChart3, Users, Briefcase,
  Music, Video, Camera, MessageSquare, ShoppingCart,
  Zap, Star, Eye, Heart, BookOpen, Globe, Map
} from "lucide-react";
import { toast } from "sonner";

interface PromoReel {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  duration: string;
  views: number;
  downloads: number;
  videoUrl: string;
  thumbnailGradient: string;
  features: string[];
}

const promoReels: PromoReel[] = [
  {
    id: "inventory",
    title: "Inventory Manager",
    description: "Track stock levels, receive items, and manage transfers with QR scanning",
    category: "Operations",
    icon: <Package className="w-6 h-6" />,
    duration: "0:30",
    views: 12500,
    downloads: 3200,
    videoUrl: "/promo/inventory.mp4",
    thumbnailGradient: "from-blue-500 to-cyan-500",
    features: ["QR Code Scanning", "Real-time Stock", "Transfer Tracking"]
  },
  {
    id: "batch-calculator",
    title: "Batch Calculator",
    description: "Scale recipes and track production with precision calculations",
    category: "Production",
    icon: <Calculator className="w-6 h-6" />,
    duration: "0:25",
    views: 8900,
    downloads: 2100,
    videoUrl: "/promo/batch.mp4",
    thumbnailGradient: "from-purple-500 to-pink-500",
    features: ["Recipe Scaling", "Batch Tracking", "QR Generation"]
  },
  {
    id: "staff-scheduling",
    title: "Staff Scheduling",
    description: "Create weekly schedules and assign stations effortlessly",
    category: "Team",
    icon: <Calendar className="w-6 h-6" />,
    duration: "0:28",
    views: 7600,
    downloads: 1800,
    videoUrl: "/promo/scheduling.mp4",
    thumbnailGradient: "from-green-500 to-emerald-500",
    features: ["Drag & Drop", "Station Assignment", "PDF Export"]
  },
  {
    id: "cocktail-sop",
    title: "Cocktail SOPs",
    description: "Create and manage standardized cocktail recipes with photos",
    category: "Recipes",
    icon: <ChefHat className="w-6 h-6" />,
    duration: "0:32",
    views: 15200,
    downloads: 4500,
    videoUrl: "/promo/cocktail.mp4",
    thumbnailGradient: "from-orange-500 to-red-500",
    features: ["Photo Recipes", "Cost Tracking", "Taste Profiles"]
  },
  {
    id: "temperature-log",
    title: "Temperature Log",
    description: "Track equipment temperatures for health compliance",
    category: "Compliance",
    icon: <Thermometer className="w-6 h-6" />,
    duration: "0:22",
    views: 5400,
    downloads: 1200,
    videoUrl: "/promo/temperature.mp4",
    thumbnailGradient: "from-cyan-500 to-blue-500",
    features: ["Compliance Ready", "Alert System", "Export Logs"]
  },
  {
    id: "menu-engineering",
    title: "Menu Engineering",
    description: "BCG matrix analysis for menu profitability optimization",
    category: "Analytics",
    icon: <BarChart3 className="w-6 h-6" />,
    duration: "0:35",
    views: 9800,
    downloads: 2800,
    videoUrl: "/promo/menu.mp4",
    thumbnailGradient: "from-violet-500 to-purple-500",
    features: ["BCG Matrix", "AI Suggestions", "Profit Analysis"]
  },
  {
    id: "crm",
    title: "CRM System",
    description: "Manage customers, leads, and deals in one place",
    category: "Business",
    icon: <Users className="w-6 h-6" />,
    duration: "0:30",
    views: 11200,
    downloads: 3100,
    videoUrl: "/promo/crm.mp4",
    thumbnailGradient: "from-pink-500 to-rose-500",
    features: ["Lead Pipeline", "Deal Tracking", "Activity Log"]
  },
  {
    id: "lab-ops",
    title: "LAB Ops",
    description: "Complete restaurant & bar management system",
    category: "Operations",
    icon: <Briefcase className="w-6 h-6" />,
    duration: "0:40",
    views: 18500,
    downloads: 5200,
    videoUrl: "/promo/labops.mp4",
    thumbnailGradient: "from-amber-500 to-orange-500",
    features: ["Mobile POS", "KDS System", "Real-time Analytics"]
  },
  {
    id: "reels-editor",
    title: "Reels Editor Pro",
    description: "Create stunning video content with pro editing tools",
    category: "Content",
    icon: <Video className="w-6 h-6" />,
    duration: "0:28",
    views: 22100,
    downloads: 6800,
    videoUrl: "/promo/reels.mp4",
    thumbnailGradient: "from-red-500 to-pink-500",
    features: ["Pro Filters", "Music Library", "Export HD"]
  },
  {
    id: "music-box",
    title: "Music Box",
    description: "Upload and share your music with the community",
    category: "Content",
    icon: <Music className="w-6 h-6" />,
    duration: "0:25",
    views: 14300,
    downloads: 4100,
    videoUrl: "/promo/music.mp4",
    thumbnailGradient: "from-indigo-500 to-violet-500",
    features: ["Audio Upload", "Trending Charts", "Playlist Creation"]
  },
  {
    id: "stories",
    title: "Stories & Posts",
    description: "Share moments with beautiful stories and posts",
    category: "Social",
    icon: <Camera className="w-6 h-6" />,
    duration: "0:20",
    views: 28700,
    downloads: 8200,
    videoUrl: "/promo/stories.mp4",
    thumbnailGradient: "from-yellow-500 to-orange-500",
    features: ["Story Editor", "Filters", "Engagement Stats"]
  },
  {
    id: "messaging",
    title: "Messaging",
    description: "Connect with others through instant messaging",
    category: "Social",
    icon: <MessageSquare className="w-6 h-6" />,
    duration: "0:22",
    views: 19400,
    downloads: 5600,
    videoUrl: "/promo/messaging.mp4",
    thumbnailGradient: "from-teal-500 to-cyan-500",
    features: ["Group Chats", "Media Sharing", "Voice Notes"]
  },
  {
    id: "shop",
    title: "Shop & Marketplace",
    description: "Buy and sell products in the integrated marketplace",
    category: "Commerce",
    icon: <ShoppingCart className="w-6 h-6" />,
    duration: "0:30",
    views: 16800,
    downloads: 4700,
    videoUrl: "/promo/shop.mp4",
    thumbnailGradient: "from-emerald-500 to-teal-500",
    features: ["Easy Checkout", "Seller Dashboard", "Order Tracking"]
  },
  {
    id: "live-map",
    title: "Live Map",
    description: "Discover venues and events near you with real-time data",
    category: "Discovery",
    icon: <Map className="w-6 h-6" />,
    duration: "0:26",
    views: 13200,
    downloads: 3800,
    videoUrl: "/promo/map.mp4",
    thumbnailGradient: "from-lime-500 to-green-500",
    features: ["Real-time Updates", "Venue Details", "Directions"]
  },
  {
    id: "wasabi-ai",
    title: "Wasabi AI",
    description: "Your intelligent assistant for hospitality operations",
    category: "AI",
    icon: <Sparkles className="w-6 h-6" />,
    duration: "0:35",
    views: 24600,
    downloads: 7100,
    videoUrl: "/promo/wasabi.mp4",
    thumbnailGradient: "from-fuchsia-500 to-purple-500",
    features: ["Smart Assistant", "Tool Navigation", "Task Automation"]
  }
];

const categories = ["All", "Operations", "Content", "Social", "Business", "AI", "Commerce", "Discovery"];

export default function PromoReels() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

  const filteredReels = activeCategory === "All" 
    ? promoReels 
    : promoReels.filter(r => r.category === activeCategory);

  const handleDownload = async (reel: PromoReel) => {
    toast.loading(`Preparing ${reel.title} promo reel for download...`);
    
    // Simulate download preparation
    setTimeout(() => {
      // Create a downloadable link
      const link = document.createElement('a');
      link.href = reel.videoUrl;
      link.download = `${reel.id}-promo-reel.mp4`;
      link.target = '_blank';
      
      // For demo purposes, show success
      toast.dismiss();
      toast.success(`${reel.title} promo reel ready!`, {
        description: "Right-click the video and select 'Save video as...' to download",
        duration: 5000
      });
    }, 1500);
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

  const toggleMute = (id: string) => {
    setMutedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredReels.map((reel, index) => (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                  {/* Video Preview */}
                  <div className={`relative aspect-[9/16] max-h-[280px] bg-gradient-to-br ${reel.thumbnailGradient}`}>
                    {/* Placeholder Preview */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                        {reel.icon}
                      </div>
                      <h3 className="font-bold text-lg text-center">{reel.title}</h3>
                      <p className="text-white/80 text-xs text-center mt-1 line-clamp-2">
                        {reel.description}
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-1 mt-3 justify-center">
                        {reel.features.map((feature, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="bg-white/20 text-white text-[10px] border-0"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Overlay Controls */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
                        onClick={() => setPlayingId(playingId === reel.id ? null : reel.id)}
                      >
                        {playingId === reel.id ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-1" />
                        )}
                      </Button>
                    </div>

                    {/* Duration Badge */}
                    <Badge 
                      className="absolute bottom-2 right-2 bg-black/60 text-white text-xs"
                    >
                      {reel.duration}
                    </Badge>

                    {/* Category Badge */}
                    <Badge 
                      className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm text-white text-xs border-0"
                    >
                      {reel.category}
                    </Badge>
                  </div>

                  {/* Info */}
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{reel.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {reel.description}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(reel.views)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {formatNumber(reel.downloads)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleDownload(reel)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => handleShare(reel)}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 mb-8"
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">How to Use Promo Reels</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Download</h4>
                    <p className="text-xs text-muted-foreground">Click download to save the promo reel to your device</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Customize</h4>
                    <p className="text-xs text-muted-foreground">Add your branding or voiceover if desired</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Share</h4>
                    <p className="text-xs text-muted-foreground">Post on Instagram, TikTok, YouTube Shorts & more</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
