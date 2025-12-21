import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Download, Play, Pause, Volume2, VolumeX, Share2, 
  Sparkles, Package, Calculator, Calendar,
  ChefHat, Thermometer, BarChart3, Users, Briefcase,
  Music, Video, Camera, MessageSquare, ShoppingCart,
  Eye, Map, X
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  features: string[];
  demoVideo: string; // Using sample video URLs
}

// Sample video URLs for demo - these are free stock videos
const SAMPLE_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
];

const promoReels: PromoReel[] = [
  {
    id: "inventory",
    title: "Inventory Manager",
    description: "Track stock levels, receive items, and manage transfers with QR scanning",
    category: "Operations",
    icon: <Package className="w-6 h-6" />,
    duration: "0:15",
    views: 12500,
    downloads: 3200,
    thumbnailGradient: "from-blue-500 to-cyan-500",
    features: ["QR Code Scanning", "Real-time Stock", "Transfer Tracking"],
    demoVideo: SAMPLE_VIDEOS[0]
  },
  {
    id: "batch-calculator",
    title: "Batch Calculator",
    description: "Scale recipes and track production with precision calculations",
    category: "Production",
    icon: <Calculator className="w-6 h-6" />,
    duration: "0:15",
    views: 8900,
    downloads: 2100,
    thumbnailGradient: "from-purple-500 to-pink-500",
    features: ["Recipe Scaling", "Batch Tracking", "QR Generation"],
    demoVideo: SAMPLE_VIDEOS[1]
  },
  {
    id: "staff-scheduling",
    title: "Staff Scheduling",
    description: "Create weekly schedules and assign stations effortlessly",
    category: "Team",
    icon: <Calendar className="w-6 h-6" />,
    duration: "0:15",
    views: 7600,
    downloads: 1800,
    thumbnailGradient: "from-green-500 to-emerald-500",
    features: ["Drag & Drop", "Station Assignment", "PDF Export"],
    demoVideo: SAMPLE_VIDEOS[2]
  },
  {
    id: "cocktail-sop",
    title: "Cocktail SOPs",
    description: "Create and manage standardized cocktail recipes with photos",
    category: "Recipes",
    icon: <ChefHat className="w-6 h-6" />,
    duration: "0:15",
    views: 15200,
    downloads: 4500,
    thumbnailGradient: "from-orange-500 to-red-500",
    features: ["Photo Recipes", "Cost Tracking", "Taste Profiles"],
    demoVideo: SAMPLE_VIDEOS[3]
  },
  {
    id: "temperature-log",
    title: "Temperature Log",
    description: "Track equipment temperatures for health compliance",
    category: "Compliance",
    icon: <Thermometer className="w-6 h-6" />,
    duration: "0:15",
    views: 5400,
    downloads: 1200,
    thumbnailGradient: "from-cyan-500 to-blue-500",
    features: ["Compliance Ready", "Alert System", "Export Logs"],
    demoVideo: SAMPLE_VIDEOS[4]
  },
  {
    id: "menu-engineering",
    title: "Menu Engineering",
    description: "BCG matrix analysis for menu profitability optimization",
    category: "Analytics",
    icon: <BarChart3 className="w-6 h-6" />,
    duration: "0:15",
    views: 9800,
    downloads: 2800,
    thumbnailGradient: "from-violet-500 to-purple-500",
    features: ["BCG Matrix", "AI Suggestions", "Profit Analysis"],
    demoVideo: SAMPLE_VIDEOS[0]
  },
  {
    id: "crm",
    title: "CRM System",
    description: "Manage customers, leads, and deals in one place",
    category: "Business",
    icon: <Users className="w-6 h-6" />,
    duration: "0:15",
    views: 11200,
    downloads: 3100,
    thumbnailGradient: "from-pink-500 to-rose-500",
    features: ["Lead Pipeline", "Deal Tracking", "Activity Log"],
    demoVideo: SAMPLE_VIDEOS[1]
  },
  {
    id: "lab-ops",
    title: "LAB Ops",
    description: "Complete restaurant & bar management system",
    category: "Operations",
    icon: <Briefcase className="w-6 h-6" />,
    duration: "0:15",
    views: 18500,
    downloads: 5200,
    thumbnailGradient: "from-amber-500 to-orange-500",
    features: ["Mobile POS", "KDS System", "Real-time Analytics"],
    demoVideo: SAMPLE_VIDEOS[2]
  },
  {
    id: "reels-editor",
    title: "Reels Editor Pro",
    description: "Create stunning video content with pro editing tools",
    category: "Content",
    icon: <Video className="w-6 h-6" />,
    duration: "0:15",
    views: 22100,
    downloads: 6800,
    thumbnailGradient: "from-red-500 to-pink-500",
    features: ["Pro Filters", "Music Library", "Export HD"],
    demoVideo: SAMPLE_VIDEOS[3]
  },
  {
    id: "music-box",
    title: "Music Box",
    description: "Upload and share your music with the community",
    category: "Content",
    icon: <Music className="w-6 h-6" />,
    duration: "0:15",
    views: 14300,
    downloads: 4100,
    thumbnailGradient: "from-indigo-500 to-violet-500",
    features: ["Audio Upload", "Trending Charts", "Playlist Creation"],
    demoVideo: SAMPLE_VIDEOS[4]
  },
  {
    id: "stories",
    title: "Stories & Posts",
    description: "Share moments with beautiful stories and posts",
    category: "Social",
    icon: <Camera className="w-6 h-6" />,
    duration: "0:15",
    views: 28700,
    downloads: 8200,
    thumbnailGradient: "from-yellow-500 to-orange-500",
    features: ["Story Editor", "Filters", "Engagement Stats"],
    demoVideo: SAMPLE_VIDEOS[0]
  },
  {
    id: "messaging",
    title: "Messaging",
    description: "Connect with others through instant messaging",
    category: "Social",
    icon: <MessageSquare className="w-6 h-6" />,
    duration: "0:15",
    views: 19400,
    downloads: 5600,
    thumbnailGradient: "from-teal-500 to-cyan-500",
    features: ["Group Chats", "Media Sharing", "Voice Notes"],
    demoVideo: SAMPLE_VIDEOS[1]
  },
  {
    id: "shop",
    title: "Shop & Marketplace",
    description: "Buy and sell products in the integrated marketplace",
    category: "Commerce",
    icon: <ShoppingCart className="w-6 h-6" />,
    duration: "0:15",
    views: 16800,
    downloads: 4700,
    thumbnailGradient: "from-emerald-500 to-teal-500",
    features: ["Easy Checkout", "Seller Dashboard", "Order Tracking"],
    demoVideo: SAMPLE_VIDEOS[2]
  },
  {
    id: "live-map",
    title: "Live Map",
    description: "Discover venues and events near you with real-time data",
    category: "Discovery",
    icon: <Map className="w-6 h-6" />,
    duration: "0:15",
    views: 13200,
    downloads: 3800,
    thumbnailGradient: "from-lime-500 to-green-500",
    features: ["Real-time Updates", "Venue Details", "Directions"],
    demoVideo: SAMPLE_VIDEOS[3]
  },
  {
    id: "wasabi-ai",
    title: "Wasabi AI",
    description: "Your intelligent assistant for hospitality operations",
    category: "AI",
    icon: <Sparkles className="w-6 h-6" />,
    duration: "0:15",
    views: 24600,
    downloads: 7100,
    thumbnailGradient: "from-fuchsia-500 to-purple-500",
    features: ["Smart Assistant", "Tool Navigation", "Task Automation"],
    demoVideo: SAMPLE_VIDEOS[4]
  }
];

const categories = ["All", "Operations", "Content", "Social", "Business", "AI", "Commerce", "Discovery"];

function VideoPlayer({ reel, onClose }: { reel: PromoReel; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleDownload = async () => {
    toast.loading("Preparing download...");
    
    try {
      const response = await fetch(reel.demoVideo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reel.id}-promo-reel.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success("Download started!");
    } catch (error) {
      toast.dismiss();
      toast.error("Download failed. Try right-clicking the video.");
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Video */}
      <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={reel.demoVideo}
          className="w-full h-full object-cover"
          loop
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
        />

        {/* Overlay Info */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

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

        {/* Progress Bar */}
        <div className="absolute top-16 left-4 right-4">
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Center Play/Pause */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
              onClick={togglePlay}
            >
              <Play className="w-8 h-8 ml-1" />
            </Button>
          </div>
        )}

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${reel.thumbnailGradient} flex items-center justify-center`}>
                  {reel.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{reel.title}</h3>
                  <p className="text-white/70 text-xs">{reel.duration}</p>
                </div>
              </div>
              <p className="text-white/90 text-sm line-clamp-2">{reel.description}</p>
              
              <div className="flex flex-wrap gap-1 mt-2">
                {reel.features.map((feature, i) => (
                  <Badge key={i} variant="secondary" className="bg-white/20 text-white text-[10px] border-0">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Side Actions */}
            <div className="flex flex-col gap-3">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="w-6 h-6" />
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
                <Share2 className="w-6 h-6" />
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
  const hoverVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const filteredReels = activeCategory === "All" 
    ? promoReels 
    : promoReels.filter(r => r.category === activeCategory);

  const handleDownload = async (reel: PromoReel) => {
    toast.loading(`Preparing ${reel.title} promo reel...`);
    
    try {
      const response = await fetch(reel.demoVideo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reel.id}-promo-reel.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success(`${reel.title} downloaded!`);
    } catch (error) {
      toast.dismiss();
      toast.error("Download failed. Try opening the video first.");
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

  // Handle hover video playback
  useEffect(() => {
    if (hoveredId && hoverVideoRefs.current[hoveredId]) {
      hoverVideoRefs.current[hoveredId]?.play();
    }
  }, [hoveredId]);

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
                  {/* Video Preview */}
                  <div className={`relative aspect-[9/16] bg-gradient-to-br ${reel.thumbnailGradient}`}>
                    {/* Hover Video */}
                    {hoveredId === reel.id && (
                      <video
                        ref={(el) => { hoverVideoRefs.current[reel.id] = el; }}
                        src={reel.demoVideo}
                        className="absolute inset-0 w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                    )}
                    
                    {/* Static Preview */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center text-white p-3 transition-opacity ${hoveredId === reel.id ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                        {reel.icon}
                      </div>
                      <h3 className="font-bold text-sm text-center line-clamp-2">{reel.title}</h3>
                    </div>

                    {/* Play Button Overlay on Hover */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${hoveredId === reel.id ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <Badge className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px]">
                      {reel.duration}
                    </Badge>

                    {/* Category Badge */}
                    <Badge className="absolute top-2 left-2 bg-white/20 backdrop-blur-sm text-white text-[10px] border-0">
                      {reel.category}
                    </Badge>
                  </div>

                  {/* Info */}
                  <CardContent className="p-2">
                    <h4 className="font-semibold text-xs truncate">{reel.title}</h4>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                      <div className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" />
                        {formatNumber(reel.views)}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Download className="w-3 h-3" />
                        {formatNumber(reel.downloads)}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 mt-2">
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
            <VideoPlayer reel={selectedReel} onClose={() => setSelectedReel(null)} />
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
