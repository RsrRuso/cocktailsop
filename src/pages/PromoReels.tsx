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
  }, [reel.id, isFullscreen]);

  // Mock UI drawing functions
  const drawInventoryUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    const cols = 4;
    const rows = 3;
    const itemW = (w - 15) / cols;
    const itemH = (h - 30) / rows;
    
    // Header
    ctx.fillStyle = reel.gradientFrom;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 18 * scale, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${8 * scale}px system-ui`;
    ctx.fillText('Inventory', x + 8, y + 12 * scale);
    
    // Grid items
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const itemX = x + col * (itemW + 4);
        const itemY = y + 22 * scale + row * (itemH + 4);
        const animDelay = (row * cols + col) * 5;
        const itemProgress = Math.max(0, Math.min(1, (frame - animDelay) / 20));
        
        ctx.globalAlpha = itemProgress;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(itemX, itemY, itemW, itemH, 4);
        ctx.fill();
        
        // Item icon placeholder
        ctx.fillStyle = reel.gradientFrom;
        ctx.globalAlpha = itemProgress * 0.6;
        ctx.beginPath();
        ctx.arc(itemX + itemW/2, itemY + itemH/2 - 4, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Stock bar
        const stockLevel = (Math.sin(frame * 0.02 + col + row) + 1) / 2;
        ctx.fillStyle = stockLevel > 0.3 ? '#22c55e' : '#ef4444';
        ctx.globalAlpha = itemProgress;
        ctx.beginPath();
        ctx.roundRect(itemX + 2, itemY + itemH - 6, (itemW - 4) * stockLevel, 3, 1);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  };

  const drawCalculatorUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Recipe card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, w * 0.6, h, 6);
    ctx.fill();
    
    // Animated multiplier
    const multiplier = 1 + Math.sin(frame * 0.03) * 0.5;
    
    // Ingredients list with scaling animation
    const ingredients = ['Spirit', 'Citrus', 'Sweet', 'Bitter'];
    ingredients.forEach((ing, i) => {
      const ingY = y + 12 + i * (h / 5);
      const barWidth = (w * 0.5 - 20) * (0.3 + (i * 0.15)) * multiplier;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${7 * scale}px system-ui`;
      ctx.fillText(ing, x + 8, ingY + 8);
      
      ctx.fillStyle = reel.gradientFrom;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(x + 8, ingY + 12, Math.min(barWidth, w * 0.5 - 20), 6, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    
    // Batch size indicator
    ctx.fillStyle = reel.gradientTo;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.65, y, w * 0.35, h * 0.4, 6);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${14 * scale}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`${(multiplier * 10).toFixed(0)}L`, x + w * 0.82, y + h * 0.25);
    ctx.font = `${7 * scale}px system-ui`;
    ctx.fillText('Batch Size', x + w * 0.82, y + h * 0.35);
    ctx.textAlign = 'left';
  };

  const drawScheduleUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const dayWidth = w / 7;
    
    // Day headers
    days.forEach((day, i) => {
      const isActive = Math.floor(frame / 30) % 7 === i;
      ctx.fillStyle = isActive ? reel.gradientFrom : 'rgba(255, 255, 255, 0.3)';
      ctx.font = `bold ${8 * scale}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(day, x + dayWidth * i + dayWidth / 2, y + 12);
    });
    
    // Shift blocks
    const shifts = [
      { day: 0, start: 0.2, end: 0.5, color: '#22c55e' },
      { day: 1, start: 0.3, end: 0.7, color: '#3b82f6' },
      { day: 2, start: 0.1, end: 0.4, color: '#f59e0b' },
      { day: 3, start: 0.4, end: 0.8, color: '#22c55e' },
      { day: 4, start: 0.2, end: 0.6, color: '#ec4899' },
      { day: 5, start: 0.5, end: 0.9, color: '#8b5cf6' },
    ];
    
    shifts.forEach((shift, i) => {
      const shiftDelay = i * 8;
      const appear = Math.min(1, Math.max(0, (frame - shiftDelay) / 15));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = shift.color;
      const shiftX = x + shift.day * dayWidth + 2;
      const shiftY = y + 18 + shift.start * (h - 25);
      const shiftH = (shift.end - shift.start) * (h - 25);
      
      ctx.beginPath();
      ctx.roundRect(shiftX, shiftY, dayWidth - 4, shiftH, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
  };

  const drawRecipeUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Cocktail glass illustration
    const glassX = x + w * 0.15;
    const glassY = y + h * 0.1;
    const glassW = w * 0.25;
    const glassH = h * 0.6;
    
    // Glass shape
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(glassX, glassY);
    ctx.lineTo(glassX + glassW, glassY);
    ctx.lineTo(glassX + glassW * 0.7, glassY + glassH * 0.7);
    ctx.lineTo(glassX + glassW * 0.5, glassY + glassH);
    ctx.lineTo(glassX + glassW * 0.3, glassY + glassH * 0.7);
    ctx.closePath();
    ctx.stroke();
    
    // Liquid fill animation
    const fillLevel = (Math.sin(frame * 0.02) + 1) / 2 * 0.6 + 0.2;
    const gradient = ctx.createLinearGradient(glassX, glassY + glassH * (1 - fillLevel), glassX, glassY + glassH * 0.7);
    gradient.addColorStop(0, reel.gradientFrom);
    gradient.addColorStop(1, reel.gradientTo);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(glassX + 4, glassY + glassH * (1 - fillLevel) * 0.8);
    ctx.lineTo(glassX + glassW - 4, glassY + glassH * (1 - fillLevel) * 0.8);
    ctx.lineTo(glassX + glassW * 0.68, glassY + glassH * 0.68);
    ctx.lineTo(glassX + glassW * 0.32, glassY + glassH * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Recipe steps
    const steps = ['Shake', 'Strain', 'Garnish'];
    steps.forEach((step, i) => {
      const stepY = y + 8 + i * (h / 4);
      const isActive = Math.floor(frame / 40) % 3 === i;
      
      ctx.fillStyle = isActive ? reel.gradientFrom : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(x + w * 0.45, stepY, w * 0.52, h / 5 - 4, 4);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = `${7 * scale}px system-ui`;
      ctx.fillText(`${i + 1}. ${step}`, x + w * 0.5, stepY + h / 10);
    });
  };

  const drawTemperatureUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Temperature gauges
    const gauges = [
      { label: 'Fridge 1', temp: 3 + Math.sin(frame * 0.02) * 0.5, target: 4, ok: true },
      { label: 'Freezer', temp: -18 + Math.sin(frame * 0.025) * 1, target: -18, ok: true },
      { label: 'Walk-in', temp: 5 + Math.sin(frame * 0.03) * 2, target: 4, ok: false },
    ];
    
    const gaugeH = (h - 20) / 3;
    
    gauges.forEach((gauge, i) => {
      const gaugeY = y + 5 + i * gaugeH;
      
      // Gauge background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(x, gaugeY, w, gaugeH - 6, 4);
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `${7 * scale}px system-ui`;
      ctx.fillText(gauge.label, x + 6, gaugeY + 12);
      
      // Temperature display
      ctx.fillStyle = gauge.ok ? '#22c55e' : '#ef4444';
      ctx.font = `bold ${12 * scale}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText(`${gauge.temp.toFixed(1)}°C`, x + w - 6, gaugeY + gaugeH / 2 + 4);
      ctx.textAlign = 'left';
      
      // Status indicator
      ctx.beginPath();
      ctx.arc(x + w - 45, gaugeY + gaugeH / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawChartUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // BCG Matrix quadrants
    const quadSize = Math.min(w, h) * 0.45;
    const matrixX = x + (w - quadSize * 2) / 2;
    const matrixY = y + 8;
    
    const quadrants = [
      { label: '★', color: '#22c55e', items: 3 },
      { label: '?', color: '#f59e0b', items: 2 },
      { label: '🐕', color: '#ef4444', items: 4 },
      { label: '🐄', color: '#3b82f6', items: 5 },
    ];
    
    quadrants.forEach((quad, i) => {
      const qx = matrixX + (i % 2) * quadSize;
      const qy = matrixY + Math.floor(i / 2) * quadSize;
      
      ctx.fillStyle = quad.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.roundRect(qx + 1, qy + 1, quadSize - 2, quadSize - 2, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Animated dots representing items
      for (let j = 0; j < quad.items; j++) {
        const dotX = qx + 8 + (j % 3) * 12 + Math.sin(frame * 0.03 + j) * 3;
        const dotY = qy + 12 + Math.floor(j / 3) * 12 + Math.cos(frame * 0.03 + j) * 3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  const drawCRMUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Pipeline stages
    const stages = ['Lead', 'Contact', 'Proposal', 'Won'];
    const stageW = (w - 12) / 4;
    
    stages.forEach((stage, i) => {
      const stageX = x + 2 + i * (stageW + 2);
      const isActive = Math.floor(frame / 25) % 4 === i;
      
      ctx.fillStyle = isActive ? reel.gradientFrom : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(stageX, y, stageW, h, 4);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.font = `${6 * scale}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(stage, stageX + stageW / 2, y + 10);
      
      // Deal cards
      const dealCount = 4 - i;
      for (let j = 0; j < dealCount; j++) {
        const dealY = y + 16 + j * 14;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(stageX + 2, dealY, stageW - 4, 10, 2);
        ctx.fill();
      }
    });
    ctx.textAlign = 'left';
  };

  const drawPOSUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Order items
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, w * 0.55, h, 4);
    ctx.fill();
    
    // Menu items grid
    for (let i = 0; i < 6; i++) {
      const itemX = x + 4 + (i % 2) * (w * 0.27);
      const itemY = y + 4 + Math.floor(i / 2) * (h / 3.5);
      const isSelected = i === Math.floor(frame / 20) % 6;
      
      ctx.fillStyle = isSelected ? reel.gradientFrom : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(itemX, itemY, w * 0.24, h / 4 - 4, 3);
      ctx.fill();
    }
    
    // Total panel
    ctx.fillStyle = reel.gradientTo;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.58, y, w * 0.42, h * 0.4, 4);
    ctx.fill();
    
    const total = 45 + Math.floor(frame / 20) * 12;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${14 * scale}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(`$${total}`, x + w * 0.79, y + h * 0.2);
    ctx.font = `${7 * scale}px system-ui`;
    ctx.fillText('Total', x + w * 0.79, y + h * 0.32);
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
    // Waveform visualization
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h * 0.4, 4);
    ctx.fill();
    
    // Animated waveform bars
    const barCount = 30;
    const barW = (w - 10) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barH = (Math.sin(frame * 0.08 + i * 0.3) + 1) * (h * 0.15) + 4;
      const barX = x + 5 + i * barW;
      const barY = y + h * 0.2 - barH / 2;
      
      const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barH);
      gradient.addColorStop(0, reel.gradientFrom);
      gradient.addColorStop(1, reel.gradientTo);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW - 1, barH, 1);
      ctx.fill();
    }
    
    // Track list
    for (let i = 0; i < 3; i++) {
      const trackY = y + h * 0.45 + i * (h * 0.18);
      const isPlaying = i === Math.floor(frame / 50) % 3;
      
      ctx.fillStyle = isPlaying ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(x, trackY, w, h * 0.16, 3);
      ctx.fill();
      
      if (isPlaying) {
        ctx.fillStyle = reel.gradientFrom;
        ctx.beginPath();
        ctx.arc(x + 12, trackY + h * 0.08, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawChatUI = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, scale: number) => {
    // Chat messages
    const messages = [
      { sent: false, width: 0.6 },
      { sent: true, width: 0.5 },
      { sent: false, width: 0.7 },
      { sent: true, width: 0.4 },
    ];
    
    let msgY = y + 5;
    messages.forEach((msg, i) => {
      const delay = i * 15;
      const appear = Math.min(1, Math.max(0, (frame - delay) / 20));
      const msgW = w * msg.width;
      const msgX = msg.sent ? x + w - msgW - 5 : x + 5;
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = msg.sent ? reel.gradientFrom : 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(msgX, msgY, msgW * appear, 16, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      msgY += 22;
    });
    
    // Input field
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y + h - 20, w, 16, 8);
    ctx.fill();
    
    // Typing indicator
    if (frame % 60 < 30) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 3; i++) {
        const dotY = y + h - 12 + Math.sin(frame * 0.15 + i * 0.5) * 2;
        ctx.beginPath();
        ctx.arc(x + 10 + i * 8, dotY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
