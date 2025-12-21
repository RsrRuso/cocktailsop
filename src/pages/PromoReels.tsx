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
import svLogo from "@/assets/sv-logo.png";

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

// Interactive Animated Canvas Presentation Component
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
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const particlesRef = useRef<Array<{x: number; y: number; vx: number; vy: number; size: number; alpha: number}>>([]);

  // Initialize particles
  useEffect(() => {
    const width = isFullscreen ? 720 : 270;
    const height = isFullscreen ? 1280 : 480;
    particlesRef.current = Array.from({ length: 25 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.5 + 0.2
    }));
  }, [isFullscreen]);

  const drawMockUI = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => {
    // IMPORTANT: The main presentation uses centered text, so we must isolate
    // mock-UI text alignment to avoid clipped/misaligned labels.
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const scale = isFullscreen ? 1 : 0.4;
    const centerX = width / 2;
    
    // Draw mock phone/tablet frame
    const mockWidth = width * 0.85;
    const mockHeight = height * 0.35;
    const mockX = (width - mockWidth) / 2;
    const mockY = height * 0.48;
    
    // Device shadow
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(mockX + 5, mockY + 5, mockWidth, mockHeight, 12 * scale);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Device frame
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(mockX, mockY, mockWidth, mockHeight, 12 * scale);
    ctx.fill();
    
    // Screen area
    const screenPadding = 6 * scale;
    ctx.fillStyle = '#0f0f1a';
    ctx.beginPath();
    ctx.roundRect(mockX + screenPadding, mockY + screenPadding, mockWidth - screenPadding * 2, mockHeight - screenPadding * 2, 8 * scale);
    ctx.fill();
    
    // Draw tool-specific mock UI based on reel.id
    const screenX = mockX + screenPadding + 8;
    const screenY = mockY + screenPadding + 8;
    const screenW = mockWidth - screenPadding * 2 - 16;
    const screenH = mockHeight - screenPadding * 2 - 16;
    
    // Animated progress indicator
    const progress = (Math.sin(frame * 0.03) + 1) / 2;
    
    switch (reel.id) {
      case 'inventory':
        // Draw inventory grid
        drawInventoryUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'batch-calculator':
        drawCalculatorUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'staff-scheduling':
        drawScheduleUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'cocktail-sop':
        drawRecipeUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'temperature-log':
        drawTemperatureUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'menu-engineering':
        drawChartUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'crm':
        drawCRMUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'lab-ops':
        drawPOSUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'reels-editor':
        drawVideoEditorUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'music-box':
        drawMusicUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      case 'messaging':
        drawChatUI(ctx, screenX, screenY, screenW, screenH, frame, scale);
        break;
      default:
        drawGenericUI(ctx, screenX, screenY, screenW, screenH, frame, scale, progress);
    }

    ctx.restore();
  }, [reel.id, isFullscreen]);

  // Mock UI drawing functions
  const drawInventoryUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    const cols = 3;
    const rows = 3;
    const gap = 6;
    const itemW = (w - gap * (cols + 1)) / cols;
    const itemH = (h - 45 - gap * (rows + 1)) / rows;
    
    // Header with gradient
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('📦 Inventory', x + 12, y + 22);
    
    // Item count badge
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(x + w - 55, y + 7, 45, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${12}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('12', x + w - 32, y + 21);
    ctx.textAlign = 'left';
    
    // Grid items with product names
    const products = ['🍷 Wine', '🍺 Beer', '🥃 Whisky', '🍸 Gin', '🍹 Rum', '🧊 Ice', '🍋 Citrus', '🌿 Herbs', '🥤 Mixer'];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const itemX = x + gap + col * (itemW + gap);
        const itemY = y + 40 + row * (itemH + gap);
        const animDelay = idx * 4;
        const itemProgress = Math.max(0, Math.min(1, (frame - animDelay) / 15));
        
        ctx.globalAlpha = itemProgress;
        
        // Card background with border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(itemX, itemY, itemW, itemH, 6);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Product name - LARGER and BOLDER
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${13}px system-ui`;
        ctx.fillText(products[idx] || 'Item', itemX + 5, itemY + 18);
        
        // Stock quantity - LARGER
        const stockQty = Math.floor(20 + Math.sin(frame * 0.02 + idx) * 15);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${12}px system-ui`;
        ctx.fillText(`${stockQty}`, itemX + 5, itemY + 34);
        
        // Stock level bar
        const stockLevel = (Math.sin(frame * 0.02 + col + row) + 1) / 2;
        const barY = itemY + itemH - 12;
        
        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(itemX + 4, barY, itemW - 8, 8, 4);
        ctx.fill();
        
        // Bar fill
        ctx.fillStyle = stockLevel > 0.5 ? '#22c55e' : stockLevel > 0.3 ? '#f59e0b' : '#ef4444';
        ctx.beginPath();
        ctx.roundRect(itemX + 4, barY, (itemW - 8) * stockLevel, 8, 4);
        ctx.fill();
        
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawCalculatorUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header with gradient
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('🧮 Batch Calculator', x + 12, y + 22);
    
    // Recipe card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(x, y + 38, w * 0.58, h - 44, 8);
    ctx.fill();
    
    // Animated multiplier
    const multiplier = 1 + Math.sin(frame * 0.03) * 0.5;
    
    // Ingredients list with scaling animation
    const ingredients = [
      { name: '🥃 Spirit', amount: 60 },
      { name: '🍋 Citrus', amount: 30 },
      { name: '🍯 Sweet', amount: 20 },
      { name: '🌿 Bitters', amount: 5 }
    ];
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${14}px system-ui`;
    ctx.fillText('Ingredients', x + 10, y + 58);
    
    ingredients.forEach((ing, i) => {
      const ingY = y + 68 + i * ((h - 80) / 5);
      const scaledAmount = Math.round(ing.amount * multiplier);
      const barWidth = (w * 0.48 - 20) * (ing.amount / 60) * multiplier;
      
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${13}px system-ui`;
      ctx.fillText(ing.name, x + 10, ingY + 14);
      
      // Amount badge
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.32, ingY + 2, 48, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(`${scaledAmount}ml`, x + w * 0.32 + 24, ingY + 15);
      ctx.textAlign = 'left';
      
      // Animated bar
      const gradient = ctx.createLinearGradient(x + 10, ingY, x + 10 + barWidth, ingY);
      gradient.addColorStop(0, reel.gradientFrom);
      gradient.addColorStop(1, reel.gradientTo);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(x + 10, ingY + 22, Math.min(barWidth, w * 0.48 - 20), 8, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    
    // Batch size indicator panel
    ctx.fillStyle = reel.gradientTo;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.62, y + 38, w * 0.38, h * 0.42, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${32}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`${(multiplier * 10).toFixed(0)}L`, x + w * 0.81, y + 78);
    ctx.font = `bold ${13}px system-ui`;
    ctx.fillText('Total Batch', x + w * 0.81, y + 98);
    
    // Serves indicator
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.62, y + h * 0.52, w * 0.38, h * 0.42, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${24}px system-ui`;
    ctx.fillText(`${Math.round(multiplier * 100)}`, x + w * 0.81, y + h * 0.75);
    ctx.font = `bold ${12}px system-ui`;
    ctx.fillText('Servings', x + w * 0.81, y + h * 0.87);
    ctx.textAlign = 'left';
  };

  const drawScheduleUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('📅 Schedule', x + 12, y + 22);
    
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const dayWidth = w / 7;
    
    // Day headers with background
    days.forEach((day, i) => {
      const isActive = Math.floor(frame / 30) % 7 === i;
      const dayX = x + dayWidth * i;
      
      ctx.fillStyle = isActive ? reel.gradientFrom : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.roundRect(dayX + 1, y + 36, dayWidth - 2, 22, 4);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(day, dayX + dayWidth / 2, y + 51);
    });
    
    // Shift blocks with staff names
    const shifts = [
      { day: 0, start: 0.15, end: 0.45, color: '#22c55e', name: 'Alex' },
      { day: 1, start: 0.25, end: 0.65, color: '#3b82f6', name: 'Sam' },
      { day: 2, start: 0.1, end: 0.35, color: '#f59e0b', name: 'Kim' },
      { day: 3, start: 0.35, end: 0.75, color: '#22c55e', name: 'Alex' },
      { day: 4, start: 0.2, end: 0.55, color: '#ec4899', name: 'Jo' },
      { day: 5, start: 0.45, end: 0.85, color: '#8b5cf6', name: 'Pat' },
      { day: 6, start: 0.3, end: 0.7, color: '#3b82f6', name: 'Sam' },
    ];
    
    shifts.forEach((shift, i) => {
      const shiftDelay = i * 6;
      const appear = Math.min(1, Math.max(0, (frame - shiftDelay) / 12));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = shift.color;
      const shiftX = x + shift.day * dayWidth + 2;
      const shiftY = y + 62 + shift.start * (h - 68);
      const shiftH = (shift.end - shift.start) * (h - 68);
      
      ctx.beginPath();
      ctx.roundRect(shiftX, shiftY, dayWidth - 4, shiftH, 5);
      ctx.fill();
      
      // Staff name on shift - LARGER
      if (shiftH > 24) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${11}px system-ui`;
        ctx.textAlign = 'center';
        ctx.fillText(shift.name, shiftX + (dayWidth - 4) / 2, shiftY + shiftH / 2 + 4);
      }
      
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
  };

  const drawRecipeUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('🍸 Recipe', x + 12, y + 22);
    
    // Cocktail glass illustration - larger
    const glassX = x + 12;
    const glassY = y + 42;
    const glassW = w * 0.32;
    const glassH = h * 0.52;
    
    // Glass background
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(glassX - 8, glassY - 4, glassW + 16, glassH + 20, 8);
    ctx.fill();
    
    // Glass shape - martini style
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(glassX, glassY);
    ctx.lineTo(glassX + glassW, glassY);
    ctx.lineTo(glassX + glassW * 0.55, glassY + glassH * 0.65);
    ctx.lineTo(glassX + glassW * 0.55, glassY + glassH);
    ctx.lineTo(glassX + glassW * 0.35, glassY + glassH);
    ctx.lineTo(glassX + glassW * 0.45, glassY + glassH * 0.65);
    ctx.closePath();
    ctx.stroke();
    
    // Liquid fill animation
    const fillLevel = (Math.sin(frame * 0.02) + 1) / 2 * 0.5 + 0.3;
    const gradient = ctx.createLinearGradient(glassX, glassY, glassX, glassY + glassH * 0.6);
    gradient.addColorStop(0, reel.gradientFrom);
    gradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(glassX + 6, glassY + (1 - fillLevel) * glassH * 0.5);
    ctx.lineTo(glassX + glassW - 6, glassY + (1 - fillLevel) * glassH * 0.5);
    ctx.lineTo(glassX + glassW * 0.53, glassY + glassH * 0.58);
    ctx.lineTo(glassX + glassW * 0.47, glassY + glassH * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Recipe steps panel
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.42, y + 38, w * 0.56, h - 44, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${14}px system-ui`;
    ctx.fillText('Method', x + w * 0.47, y + 56);
    
    const steps = [
      { icon: '🧊', text: 'Add ice' },
      { icon: '🥃', text: 'Pour spirit' },
      { icon: '🔄', text: 'Shake 15s' },
      { icon: '🍸', text: 'Strain' }
    ];
    
    steps.forEach((step, i) => {
      const stepY = y + 66 + i * ((h - 80) / 4.5);
      const isActive = Math.floor(frame / 35) % 4 === i;
      const animDelay = i * 8;
      const appear = Math.min(1, Math.max(0, (frame - animDelay) / 15));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = isActive ? reel.gradientFrom : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.44, stepY, w * 0.52, 26, 6);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12}px system-ui`;
      ctx.fillText(`${step.icon} ${step.text}`, x + w * 0.48, stepY + 18);
      ctx.globalAlpha = 1;
    });
  };

  const drawTemperatureUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('🌡️ Temperature', x + 12, y + 22);
    
    // Temperature gauges with equipment icons
    const gauges = [
      { label: 'Fridge 1', icon: '❄️', temp: 2.6 + Math.sin(frame * 0.02) * 0.5, target: 4, ok: true },
      { label: 'Freezer', icon: '🧊', temp: -18.9 + Math.sin(frame * 0.025) * 1, target: -18, ok: true },
      { label: 'Walk-in', icon: '🚪', temp: 4.9 + Math.sin(frame * 0.03) * 2, target: 4, ok: false },
    ];
    
    const gaugeH = (h - 45) / 3;
    
    gauges.forEach((gauge, i) => {
      const gaugeY = y + 38 + i * (gaugeH + 3);
      const animDelay = i * 10;
      const appear = Math.min(1, Math.max(0, (frame - animDelay) / 20));
      
      ctx.globalAlpha = appear;
      
      // Gauge card with border
      ctx.fillStyle = gauge.ok ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.roundRect(x, gaugeY, w, gaugeH - 2, 8);
      ctx.fill();
      
      ctx.strokeStyle = gauge.ok ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Icon and Label - MUCH LARGER
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${15}px system-ui`;
      ctx.fillText(`${gauge.icon} ${gauge.label}`, x + 10, gaugeY + 22);
      
      // Status badge - LARGER
      ctx.fillStyle = gauge.ok ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.roundRect(x + 10, gaugeY + gaugeH - 26, gauge.ok ? 45 : 55, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${11}px system-ui`;
      ctx.fillText(gauge.ok ? '✓ OK' : '⚠ Alert', x + 16, gaugeY + gaugeH - 13);
      
      // Large Temperature display - BIGGER
      ctx.fillStyle = gauge.ok ? '#22c55e' : '#ef4444';
      ctx.font = `bold ${26}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText(`${gauge.temp.toFixed(1)}°C`, x + w - 10, gaugeY + gaugeH / 2 + 10);
      
      // Target temp - LARGER
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${12}px system-ui`;
      ctx.fillText(`Target: ${gauge.target}°C`, x + w - 10, gaugeY + gaugeH - 8);
      ctx.textAlign = 'left';
      
      ctx.globalAlpha = 1;
    });
  };

  const drawChartUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('📊 Analytics', x + 12, y + 22);
    
    // BCG Matrix quadrants with labels
    const quadSize = (Math.min(w, h - 42) - 8) / 2;
    const matrixX = x + 4;
    const matrixY = y + 40;
    
    const quadrants = [
      { label: '⭐ Stars', color: '#22c55e', items: 3 },
      { label: '❓ Question', color: '#f59e0b', items: 2 },
      { label: '🐄 Cows', color: '#3b82f6', items: 5 },
      { label: '🐕 Dogs', color: '#ef4444', items: 4 },
    ];
    
    quadrants.forEach((quad, i) => {
      const qx = matrixX + (i % 2) * (quadSize + 4);
      const qy = matrixY + Math.floor(i / 2) * (quadSize + 4);
      const animDelay = i * 8;
      const appear = Math.min(1, Math.max(0, (frame - animDelay) / 15));
      
      ctx.globalAlpha = appear;
      
      // Quadrant background
      ctx.fillStyle = quad.color;
      ctx.globalAlpha = appear * 0.3;
      ctx.beginPath();
      ctx.roundRect(qx, qy, quadSize, quadSize, 8);
      ctx.fill();
      
      // Border
      ctx.strokeStyle = quad.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = appear * 0.7;
      ctx.stroke();
      ctx.globalAlpha = appear;
      
      // Label - LARGER
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${13}px system-ui`;
      ctx.fillText(quad.label, qx + 8, qy + 20);
      
      // Item count badge - LARGER
      ctx.fillStyle = quad.color;
      ctx.beginPath();
      ctx.roundRect(qx + quadSize - 32, qy + 6, 26, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(`${quad.items}`, qx + quadSize - 19, qy + 20);
      ctx.textAlign = 'left';
      
      // Animated dots representing menu items
      for (let j = 0; j < Math.min(quad.items, 4); j++) {
        const dotX = qx + 14 + (j % 2) * 22 + Math.sin(frame * 0.03 + j) * 3;
        const dotY = qy + 35 + Math.floor(j / 2) * 18 + Math.cos(frame * 0.03 + j) * 3;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = appear * 0.85;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.globalAlpha = 1;
    });
  };

  const drawCRMUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('👥 Pipeline', x + 12, y + 22);
    
    // Pipeline stages
    const stages = [
      { name: '📥 Lead', count: 12, color: '#f59e0b' },
      { name: '📞 Call', count: 8, color: '#3b82f6' },
      { name: '📋 Prop', count: 5, color: '#8b5cf6' },
      { name: '✅ Won', count: 3, color: '#22c55e' }
    ];
    const stageW = (w - 12) / 4;
    
    stages.forEach((stage, i) => {
      const stageX = x + 3 + i * (stageW + 2);
      const isActive = Math.floor(frame / 25) % 4 === i;
      const animDelay = i * 6;
      const appear = Math.min(1, Math.max(0, (frame - animDelay) / 12));
      
      ctx.globalAlpha = appear;
      
      // Stage column
      ctx.fillStyle = isActive ? stage.color : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(stageX, y + 38, stageW, h - 44, 6);
      ctx.fill();
      
      // Stage header - LARGER
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${11}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(stage.name, stageX + stageW / 2, y + 56);
      
      // Count badge - LARGER
      ctx.fillStyle = stage.color;
      ctx.beginPath();
      ctx.roundRect(stageX + stageW / 2 - 14, y + 62, 28, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12}px system-ui`;
      ctx.fillText(`${stage.count}`, stageX + stageW / 2, y + 76);
      
      // Deal cards
      const dealCount = Math.min(4 - i + 1, 3);
      for (let j = 0; j < dealCount; j++) {
        const dealY = y + 88 + j * 24;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.roundRect(stageX + 3, dealY, stageW - 6, 20, 5);
        ctx.fill();
        
        // Deal value - LARGER
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${11}px system-ui`;
        ctx.fillText(`$${(j + 1) * 2}k`, stageX + stageW / 2, dealY + 14);
      }
      
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
  };

  const drawPOSUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('🍽️ POS', x + 12, y + 22);
    
    // Menu items panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(x, y + 38, w * 0.58, h - 44, 8);
    ctx.fill();
    
    // Menu items grid with names - LARGER text
    const menuItems = ['🍔 Burger', '🍕 Pizza', '🥗 Salad', '🍟 Fries', '🍺 Beer', '🍷 Wine'];
    for (let i = 0; i < 6; i++) {
      const itemX = x + 6 + (i % 2) * (w * 0.28);
      const itemY = y + 44 + Math.floor(i / 2) * ((h - 58) / 3.2);
      const isSelected = i === Math.floor(frame / 18) % 6;
      const animDelay = i * 4;
      const appear = Math.min(1, Math.max(0, (frame - animDelay) / 12));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = isSelected ? reel.gradientFrom : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.roundRect(itemX, itemY, w * 0.26, (h - 58) / 3.3, 6);
      ctx.fill();
      
      // Item name - LARGER
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${12}px system-ui`;
      ctx.fillText(menuItems[i], itemX + 5, itemY + 18);
      
      // Price - LARGER
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `bold ${11}px system-ui`;
      ctx.fillText(`$${8 + i * 3}`, itemX + 5, itemY + 34);
      
      ctx.globalAlpha = 1;
    }
    
    // Total panel
    ctx.fillStyle = reel.gradientTo;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.61, y + 38, w * 0.39, h * 0.4, 8);
    ctx.fill();
    
    const total = 45 + Math.floor(frame / 18) * 8;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${28}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`$${total}`, x + w * 0.805, y + 74);
    ctx.font = `bold ${12}px system-ui`;
    ctx.fillText('Total', x + w * 0.805, y + 92);
    
    // Items count
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.roundRect(x + w * 0.61, y + h * 0.5, w * 0.39, h * 0.42, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${22}px system-ui`;
    ctx.fillText(`${Math.floor(frame / 18) % 6 + 1}`, x + w * 0.805, y + h * 0.72);
    ctx.font = `bold ${12}px system-ui`;
    ctx.fillText('Items', x + w * 0.805, y + h * 0.84);
    ctx.textAlign = 'left';
  };

  const drawVideoEditorUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Preview area
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h * 0.55, 4);
    ctx.fill();
    
    // Playing indicator
    const playProgress = (frame % 100) / 100;
    ctx.fillStyle = reel.gradientFrom;
    ctx.fillRect(x, y + h * 0.52, w * playProgress, 3);
    
    // Timeline tracks
    const tracks = 3;
    const trackH = (h * 0.4) / tracks;
    
    for (let i = 0; i < tracks; i++) {
      const trackY = y + h * 0.58 + i * trackH;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(x, trackY, w, trackH - 2, 2);
      ctx.fill();
      
      // Clips on timeline
      const clipCount = 2 + i;
      for (let j = 0; j < clipCount; j++) {
        const clipX = x + (w / clipCount) * j + 2;
        const clipW = (w / clipCount) - 4;
        ctx.fillStyle = ['#22c55e', '#3b82f6', '#f59e0b'][i];
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.roundRect(clipX, trackY + 2, clipW, trackH - 6, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawMusicUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('🎵 Music', x + 12, y + 22);
    
    // Waveform visualization panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y + 38, w, h * 0.32, 8);
    ctx.fill();
    
    // Animated waveform bars - larger and more visible
    const barCount = 18;
    const barW = (w - 16) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barH = (Math.sin(frame * 0.08 + i * 0.4) + 1) * (h * 0.1) + 10;
      const barX = x + 8 + i * barW;
      const barY = y + 38 + h * 0.16 - barH / 2;
      
      const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barH);
      gradient.addColorStop(0, reel.gradientFrom);
      gradient.addColorStop(1, reel.gradientTo);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW - 3, barH, 3);
      ctx.fill();
    }
    
    // Track list with song info - LARGER text
    const tracks = [
      { name: '🎤 Summer Vibes', artist: 'DJ Max', duration: '3:24' },
      { name: '🎸 Rock Anthem', artist: 'The Band', duration: '4:12' },
      { name: '🎹 Piano Dreams', artist: 'Luna', duration: '2:58' }
    ];
    
    tracks.forEach((track, i) => {
      const trackY = y + h * 0.42 + i * ((h - h * 0.48) / 3.1);
      const isPlaying = i === Math.floor(frame / 50) % 3;
      const animDelay = i * 8;
      const appear = Math.min(1, Math.max(0, (frame - animDelay) / 15));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = isPlaying ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(x, trackY, w, (h - h * 0.48) / 3.3, 8);
      ctx.fill();
      
      // Play indicator
      if (isPlaying) {
        ctx.fillStyle = reel.gradientFrom;
        ctx.beginPath();
        ctx.arc(x + 18, trackY + 18, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x + 15, trackY + 13);
        ctx.lineTo(x + 23, trackY + 18);
        ctx.lineTo(x + 15, trackY + 23);
        ctx.closePath();
        ctx.fill();
      }
      
      // Track info - LARGER
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${13}px system-ui`;
      ctx.fillText(track.name, x + 36, trackY + 16);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${11}px system-ui`;
      ctx.fillText(track.artist, x + 36, trackY + 30);
      
      // Duration - LARGER
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `bold ${11}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText(track.duration, x + w - 12, trackY + 22);
      ctx.textAlign = 'left';
      
      ctx.globalAlpha = 1;
    });
  };

  const drawChatUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Header
    const headerGradient = ctx.createLinearGradient(x, y, x + w, y);
    headerGradient.addColorStop(0, reel.gradientFrom);
    headerGradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 32, 8);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${16}px system-ui`;
    ctx.fillText('💬 Messages', x + 12, y + 22);
    
    // Online indicator
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x + w - 20, y + 16, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Chat messages with content - LARGER
    const messages = [
      { sent: false, text: 'Hey! 👋', width: 0.45 },
      { sent: true, text: "Great! 😊", width: 0.4 },
      { sent: false, text: 'Ready?', width: 0.35 },
      { sent: true, text: 'Yes! 🎉', width: 0.35 },
    ];
    
    let msgY = y + 42;
    messages.forEach((msg, i) => {
      const delay = i * 12;
      const appear = Math.min(1, Math.max(0, (frame - delay) / 15));
      const msgW = w * msg.width;
      const msgX = msg.sent ? x + w - msgW - 8 : x + 8;
      
      ctx.globalAlpha = appear;
      
      // Message bubble
      ctx.fillStyle = msg.sent ? reel.gradientFrom : 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgW * appear, 30, 14);
      ctx.fill();
      
      // Message text - LARGER
      if (appear > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${13}px system-ui`;
        ctx.fillText(msg.text, msgX + 12, msgY + 20);
      }
      
      ctx.globalAlpha = 1;
      msgY += 36;
    });
    
    // Input field
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + h - 34, w - 8, 28, 14);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${12}px system-ui`;
    ctx.fillText('Type...', x + 16, y + h - 16);
    
    // Send button
    ctx.fillStyle = reel.gradientFrom;
    ctx.beginPath();
    ctx.roundRect(x + w - 48, y + h - 32, 40, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${11}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('Send', x + w - 28, y + h - 16);
    ctx.textAlign = 'left';
  };

  const drawGenericUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number, progress: number) => {
    // Generic dashboard UI
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h * 0.3, 4);
    ctx.fill();
    
    // Animated progress bar
    ctx.fillStyle = reel.gradientFrom;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + h * 0.15, (w - 16) * progress, 8, 3);
    ctx.fill();
    
    // Stats cards
    for (let i = 0; i < 3; i++) {
      const cardX = x + (w / 3) * i + 2;
      const cardY = y + h * 0.4;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, w / 3 - 4, h * 0.55, 4);
      ctx.fill();
    }
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Animated gradient background
    const gradientAngle = frame * 0.005;
    const gx1 = width / 2 + Math.cos(gradientAngle) * width;
    const gy1 = height / 2 + Math.sin(gradientAngle) * height;
    const gx2 = width / 2 - Math.cos(gradientAngle) * width;
    const gy2 = height / 2 - Math.sin(gradientAngle) * height;
    
    const gradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    gradient.addColorStop(0, reel.gradientFrom);
    gradient.addColorStop(0.5, reel.gradientTo);
    gradient.addColorStop(1, reel.gradientFrom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Update and draw particles
    particlesRef.current.forEach((particle) => {
      if (isPlaying) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Mouse interaction
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            particle.vx += dx * 0.001;
            particle.vy += dy * 0.001;
          }
        }
        
        // Boundaries
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      }
      
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw connecting lines between nearby particles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    particlesRef.current.forEach((p1, i) => {
      particlesRef.current.slice(i + 1).forEach((p2) => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    });

    const scale = isFullscreen ? 1 : 0.38;
    const centerX = width / 2;

    // Category badge with glow
    const badgeY = height * 0.06;
    ctx.shadowBlur = 10;
    ctx.shadowColor = reel.gradientFrom;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    const categoryText = reel.category.toUpperCase();
    ctx.font = `bold ${10 * scale / 0.38}px system-ui`;
    const categoryWidth = ctx.measureText(categoryText).width + 20;
    ctx.beginPath();
    ctx.roundRect(centerX - categoryWidth / 2, badgeY - 8, categoryWidth, 18 * scale / 0.38, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(categoryText, centerX, badgeY + 4);

    // Title with shadow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.font = `bold ${isFullscreen ? 32 : 16}px system-ui`;
    ctx.fillText(reel.title, centerX, height * 0.13);
    ctx.shadowBlur = 0;

    // Description with line wrap
    ctx.font = `${isFullscreen ? 16 : 10}px system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const words = reel.description.split(' ');
    let line = '';
    let lineY = height * 0.18;
    const maxWidth = width * 0.85;
    const lineHeight = isFullscreen ? 22 : 13;
    
    words.forEach((word) => {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), centerX, lineY);
        line = word + ' ';
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line.trim(), centerX, lineY);

    // Animated features with icons
    const featuresStartY = height * 0.28;
    const visibleFeatures = Math.min(4, Math.floor(frame / 15) + 1);
    
    reel.features.slice(0, visibleFeatures).forEach((feature, index) => {
      const y = featuresStartY + index * (isFullscreen ? 32 : 18);
      const slideIn = Math.min(1, (frame - index * 15) / 12);
      const bounce = Math.sin(frame * 0.06 + index) * 2;
      
      ctx.globalAlpha = slideIn;
      
      // Feature pill background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.font = `${isFullscreen ? 13 : 9}px system-ui`;
      const textWidth = ctx.measureText(feature).width;
      ctx.beginPath();
      ctx.roundRect(centerX - textWidth / 2 - 18, y - (isFullscreen ? 12 : 9) + bounce, textWidth + 36, isFullscreen ? 26 : 18, 12);
      ctx.fill();
      
      // Checkmark
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(centerX - textWidth / 2 - 8, y + bounce, isFullscreen ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(feature, centerX + 6, y + 3 + bounce);
      ctx.globalAlpha = 1;
    });

    // Draw mock UI
    drawMockUI(ctx, width, height, frame);

    // Stats at bottom with counters
    const statsY = height * 0.89;
    const statsSpacing = width / (reel.stats.length + 1);
    
    reel.stats.forEach((stat, index) => {
      const x = statsSpacing * (index + 1);
      const appear = Math.min(1, Math.max(0, (frame - 50 - index * 8) / 15));
      const bounce = Math.sin(frame * 0.04 + index) * 2;
      
      ctx.globalAlpha = appear;
      
      // Stat background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.roundRect(x - 35, statsY - (isFullscreen ? 20 : 12) + bounce, 70, isFullscreen ? 45 : 28, 8);
      ctx.fill();
      
      // Stat value
      ctx.font = `bold ${isFullscreen ? 22 : 13}px system-ui`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.value, x, statsY + bounce);
      
      // Stat label
      ctx.font = `${isFullscreen ? 11 : 7}px system-ui`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(stat.label, x, statsY + (isFullscreen ? 16 : 10) + bounce);
      
      ctx.globalAlpha = 1;
    });

    // Platform branding
    ctx.font = `bold ${isFullscreen ? 12 : 8}px system-ui`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('✨ SV Platform', centerX, height - (isFullscreen ? 25 : 12));

    ctx.textAlign = 'left';
  }, [reel, isFullscreen, drawMockUI]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mouse/touch events for interactivity
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouseRef.current.x = (clientX - rect.left) * (canvas.width / rect.width);
      mouseRef.current.y = (clientY - rect.top) * (canvas.height / rect.height);
    };
    
    const handleEnter = () => { mouseRef.current.active = true; };
    const handleLeave = () => { mouseRef.current.active = false; };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('mouseenter', handleEnter);
    canvas.addEventListener('mouseleave', handleLeave);

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
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('mouseenter', handleEnter);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [isPlaying, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={isFullscreen ? 720 : 270}
      height={isFullscreen ? 1280 : 480}
      className="w-full h-full object-cover cursor-pointer"
    />
  );
};

function PresentationPlayer({ reel, onClose }: { reel: PromoReel; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(true);

  const handleDownload = async () => {
    toast.loading("Generating Instagram Reel...");
    
    try {
      const canvas = document.createElement('canvas');
      // Instagram Reels optimal resolution: 1080x1920 (9:16 aspect ratio)
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No context');

      // Try MP4 first (better Instagram compatibility), fallback to WebM
      let mimeType = 'video/webm';
      let fileExt = 'webm';
      
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        fileExt = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
        fileExt = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
        fileExt = 'webm';
      }

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reel.id}-instagram-reel.${fileExt}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success(`Instagram Reel downloaded! (1080x1920, ${fileExt.toUpperCase()})`);
      };

      recorder.start();

      let frame = 0;
      const totalFrames = 270; // 9 seconds at 30fps (ideal for Instagram)
      
      const drawFrame = () => {
        // Animated gradient background
        const gradientAngle = frame * 0.008;
        const gx1 = canvas.width / 2 + Math.cos(gradientAngle) * canvas.width;
        const gy1 = canvas.height / 2 + Math.sin(gradientAngle) * canvas.height;
        const gx2 = canvas.width / 2 - Math.cos(gradientAngle) * canvas.width;
        const gy2 = canvas.height / 2 - Math.sin(gradientAngle) * canvas.height;
        
        const gradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
        gradient.addColorStop(0, reel.gradientFrom);
        gradient.addColorStop(0.5, reel.gradientTo);
        gradient.addColorStop(1, reel.gradientFrom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 25; i++) {
          const x = (Math.sin(frame * 0.015 + i * 0.8) * 0.4 + 0.5) * canvas.width;
          const y = (Math.cos(frame * 0.012 + i * 0.5) * 0.4 + 0.5) * canvas.height;
          const size = 3 + Math.sin(frame * 0.05 + i) * 2;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Category badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        const categoryText = reel.category.toUpperCase();
        ctx.font = 'bold 24px system-ui';
        const categoryWidth = ctx.measureText(categoryText).width + 40;
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - categoryWidth / 2, canvas.height * 0.12, categoryWidth, 48, 24);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(categoryText, canvas.width / 2, canvas.height * 0.12 + 32);

        // Title with shadow
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px system-ui';
        ctx.fillText(reel.title, canvas.width / 2, canvas.height * 0.22);
        ctx.shadowBlur = 0;

        // Description with word wrap
        ctx.font = '32px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const words = reel.description.split(' ');
        let line = '';
        let lineY = canvas.height * 0.28;
        const maxWidth = canvas.width * 0.85;
        
        words.forEach((word) => {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > maxWidth && line !== '') {
            ctx.fillText(line.trim(), canvas.width / 2, lineY);
            line = word + ' ';
            lineY += 40;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line.trim(), canvas.width / 2, lineY);

        // Animated feature pills
        const featuresStartY = canvas.height * 0.38;
        const visibleFeatures = Math.min(4, Math.floor(frame / 20) + 1);
        
        reel.features.slice(0, visibleFeatures).forEach((feature, index) => {
          const y = featuresStartY + index * 60;
          const slideIn = Math.min(1, (frame - index * 20) / 15);
          const bounce = Math.sin(frame * 0.04 + index) * 3;
          
          ctx.globalAlpha = slideIn;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.font = '28px system-ui';
          const textWidth = ctx.measureText(feature).width;
          ctx.beginPath();
          ctx.roundRect(canvas.width / 2 - textWidth / 2 - 40, y - 20 + bounce, textWidth + 80, 50, 25);
          ctx.fill();
          
          // Checkmark
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(canvas.width / 2 - textWidth / 2 - 16, y + 5 + bounce, 10, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(feature, canvas.width / 2 + 8, y + 10 + bounce);
          ctx.globalAlpha = 1;
        });

        // Stats at bottom with animation
        const statsY = canvas.height * 0.85;
        const statsSpacing = canvas.width / (reel.stats.length + 1);
        
        reel.stats.forEach((stat, index) => {
          const x = statsSpacing * (index + 1);
          const appear = Math.min(1, Math.max(0, (frame - 80 - index * 12) / 20));
          const bounce = Math.sin(frame * 0.03 + index) * 4;
          
          ctx.globalAlpha = appear;
          
          // Stat background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.roundRect(x - 70, statsY - 35 + bounce, 140, 90, 16);
          ctx.fill();
          
          // Stat value
          ctx.font = 'bold 44px system-ui';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(stat.value, x, statsY + 10 + bounce);
          
          // Stat label
          ctx.font = '22px system-ui';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.fillText(stat.label, x, statsY + 40 + bounce);
          
          ctx.globalAlpha = 1;
        });

        // Platform branding
        ctx.font = 'bold 24px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('✨ SV Platform', canvas.width / 2, canvas.height - 60);

        ctx.textAlign = 'left';

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
          <div className="flex items-center justify-center gap-3 mb-3">
            <img 
              src={svLogo} 
              alt="SpecVerse" 
              className="w-12 h-12 rounded-xl shadow-lg"
              style={{
                filter: 'sepia(15%) saturate(1.2) hue-rotate(-5deg)',
                boxShadow: '0 0 20px rgba(234, 179, 8, 0.3), 0 4px 16px rgba(0, 0, 0, 0.3)'
              }}
            />
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
                  {/* Animated Canvas Preview */}
                  <div className="relative aspect-[9/16] overflow-hidden">
                    <AnimatedPresentation 
                      reel={reel} 
                      isPlaying={hoveredId === reel.id}
                      isFullscreen={false}
                    />

                    {/* Hover Play Overlay */}
                    <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-200 ${hoveredId === reel.id ? 'opacity-100' : 'opacity-0'}`}>
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <Badge className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] border-0">
                      {reel.duration}
                    </Badge>

                    {/* Stats Overlay */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[9px] text-white/80">
                      <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded">
                        <Eye className="w-3 h-3" />
                        {formatNumber(reel.views)}
                      </div>
                      <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded">
                        <Download className="w-3 h-3" />
                        {formatNumber(reel.downloads)}
                      </div>
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
