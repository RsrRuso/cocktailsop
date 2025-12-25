import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Play, Pause, RotateCcw, Sparkles, Film } from "lucide-react";
import { toast } from "sonner";

interface VideoSection {
  title: string;
  subtitle: string;
  icon: string;
  features: string[];
  mockupType: 'notifications' | 'feed' | 'messages' | 'music' | 'create' | 'stories' | 'profile' | 'community' | 'explore' | 'analytics';
}

const VIDEO_SECTIONS: VideoSection[] = [
  {
    title: "Notification Center",
    subtitle: "Never miss a moment",
    icon: "🔔",
    features: ["Real-time alerts", "Likes & comments", "Follow notifications", "Live updates"],
    mockupType: 'notifications'
  },
  {
    title: "Social Feed",
    subtitle: "Your personalized timeline",
    icon: "📱",
    features: ["Photos & Reels", "Like & Comment", "Save favorites", "Share instantly"],
    mockupType: 'feed'
  },
  {
    title: "Messages",
    subtitle: "Connect with everyone",
    icon: "💬",
    features: ["Direct messages", "Group chats", "Voice notes", "Media sharing"],
    mockupType: 'messages'
  },
  {
    title: "Music Hub",
    subtitle: "Sound of your world",
    icon: "🎵",
    features: ["Trending tracks", "Upload library", "Add to content", "Share songs"],
    mockupType: 'music'
  },
  {
    title: "Create Content",
    subtitle: "Express yourself",
    icon: "✨",
    features: ["Photo posts", "Short reels", "24h stories", "Go live"],
    mockupType: 'create'
  },
  {
    title: "Stories",
    subtitle: "Moments that matter",
    icon: "⏱️",
    features: ["24h content", "Reactions", "Mentions", "Highlights"],
    mockupType: 'stories'
  },
  {
    title: "Profile",
    subtitle: "Your digital identity",
    icon: "👤",
    features: ["Custom bio", "Post grid", "Followers", "Analytics"],
    mockupType: 'profile'
  },
  {
    title: "Community",
    subtitle: "Find your tribe",
    icon: "🌐",
    features: ["Topic channels", "Group chats", "Discussions", "Events"],
    mockupType: 'community'
  },
  {
    title: "Explore",
    subtitle: "Discover new worlds",
    icon: "🔍",
    features: ["Trending now", "For you", "Categories", "Search"],
    mockupType: 'explore'
  },
  {
    title: "Analytics",
    subtitle: "Grow your presence",
    icon: "📊",
    features: ["Engagement stats", "Reach insights", "Growth trends", "Best times"],
    mockupType: 'analytics'
  }
];

const LandingPromoVideo = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  const PRIMARY = "#22c55e";
  const PRIMARY_LIGHT = "#4ade80";
  const PRIMARY_DARK = "#16a34a";
  const WHITE = "#ffffff";
  const DARK_BG = "#09090b";
  const CARD_BG = "#18181b";

  // Draw phone mockup with content
  const drawPhoneMockup = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    section: VideoSection,
    animProgress: number
  ) => {
    // Phone frame
    ctx.save();
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = 30;
    
    // Phone body
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 24);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Screen
    const screenPadding = 8;
    ctx.fillStyle = DARK_BG;
    ctx.beginPath();
    ctx.roundRect(x + screenPadding, y + screenPadding, width - screenPadding * 2, height - screenPadding * 2, 16);
    ctx.fill();
    
    // Dynamic notch
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.roundRect(x + width / 2 - 40, y + 12, 80, 24, 12);
    ctx.fill();
    
    // Screen content based on mockup type
    const screenX = x + screenPadding + 8;
    const screenY = y + 50;
    const screenW = width - screenPadding * 2 - 16;
    const screenH = height - 100;
    
    drawMockupContent(ctx, screenX, screenY, screenW, screenH, section, animProgress);
    
    ctx.restore();
  };

  const drawMockupContent = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    section: VideoSection,
    progress: number
  ) => {
    switch (section.mockupType) {
      case 'notifications':
        drawNotificationsMockup(ctx, x, y, w, h, progress);
        break;
      case 'feed':
        drawFeedMockup(ctx, x, y, w, h, progress);
        break;
      case 'messages':
        drawMessagesMockup(ctx, x, y, w, h, progress);
        break;
      case 'music':
        drawMusicMockup(ctx, x, y, w, h, progress);
        break;
      case 'create':
        drawCreateMockup(ctx, x, y, w, h, progress);
        break;
      case 'stories':
        drawStoriesMockup(ctx, x, y, w, h, progress);
        break;
      case 'profile':
        drawProfileMockup(ctx, x, y, w, h, progress);
        break;
      case 'community':
        drawCommunityMockup(ctx, x, y, w, h, progress);
        break;
      case 'explore':
        drawExploreMockup(ctx, x, y, w, h, progress);
        break;
      case 'analytics':
        drawAnalyticsMockup(ctx, x, y, w, h, progress);
        break;
    }
  };

  // Individual mockup drawings
  const drawNotificationsMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Header
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px system-ui";
    ctx.fillText("Notifications", x + 10, y + 20);
    
    // Notification items
    const notifs = [
      { color: "#ef4444", icon: "♥", text: "liked your post" },
      { color: "#3b82f6", icon: "👤", text: "started following" },
      { color: "#a855f7", icon: "💬", text: "commented" },
      { color: "#f97316", icon: "@", text: "mentioned you" },
      { color: "#ec4899", icon: "🔴", text: "is live now" }
    ];
    
    notifs.forEach((notif, i) => {
      const itemY = y + 45 + i * 50;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.1) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        // Avatar circle
        ctx.fillStyle = notif.color;
        ctx.beginPath();
        ctx.arc(x + 25, itemY + 15, 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon
        ctx.font = "12px sans-serif";
        ctx.fillStyle = WHITE;
        ctx.textAlign = "center";
        ctx.fillText(notif.icon, x + 25, itemY + 19);
        ctx.textAlign = "left";
        
        // Text
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "11px system-ui";
        ctx.fillText(`user_${i + 1}`, x + 50, itemY + 12);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(notif.text, x + 50, itemY + 26);
        
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawFeedMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Post card
    const postY = y + 10;
    
    // User header
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(x + 18, postY + 18, 14, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 11px system-ui";
    ctx.fillText("creator_vibes", x + 40, postY + 15);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px system-ui";
    ctx.fillText("New York, NY", x + 40, postY + 28);
    
    // Image placeholder with gradient
    const imgGrad = ctx.createLinearGradient(x, postY + 45, x + w - 20, postY + 45 + 120);
    imgGrad.addColorStop(0, "rgba(34,197,94,0.3)");
    imgGrad.addColorStop(1, "rgba(16,185,129,0.2)");
    ctx.fillStyle = imgGrad;
    ctx.beginPath();
    ctx.roundRect(x + 5, postY + 45, w - 30, 120, 8);
    ctx.fill();
    
    // Heart animation
    const heartScale = 0.8 + Math.sin(progress * Math.PI * 4) * 0.2;
    ctx.save();
    ctx.translate(x + w / 2 - 10, postY + 105);
    ctx.scale(heartScale, heartScale);
    ctx.font = "30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("❤️", 0, 0);
    ctx.restore();
    ctx.textAlign = "left";
    
    // Action bar
    const actionY = postY + 175;
    ctx.font = "16px sans-serif";
    ctx.fillText("♥", x + 10, actionY);
    ctx.fillText("💬", x + 40, actionY);
    ctx.fillText("➤", x + 70, actionY);
    ctx.fillText("🔖", x + w - 40, actionY);
    
    // Likes
    ctx.fillStyle = WHITE;
    ctx.font = "bold 11px system-ui";
    ctx.fillText("1,247 likes", x + 10, actionY + 22);
  };

  const drawMessagesMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px system-ui";
    ctx.fillText("Messages", x + 10, y + 20);
    
    const chats = [
      { name: "Sarah", msg: "Love your reel! 🎬", unread: 3 },
      { name: "Alex", msg: "Collab?", unread: 0 },
      { name: "Jordan", msg: "Thanks! 🙌", unread: 1 },
      { name: "Maya", msg: "Voice (0:24)", unread: 0 }
    ];
    
    chats.forEach((chat, i) => {
      const itemY = y + 45 + i * 55;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.08) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        // Avatar
        ctx.fillStyle = `hsl(${i * 60 + 120}, 70%, 50%)`;
        ctx.beginPath();
        ctx.arc(x + 25, itemY + 20, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Online indicator
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(x + 38, itemY + 32, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Name & message
        ctx.fillStyle = WHITE;
        ctx.font = "bold 11px system-ui";
        ctx.fillText(chat.name, x + 52, itemY + 16);
        ctx.fillStyle = chat.unread > 0 ? WHITE : "rgba(255,255,255,0.5)";
        ctx.font = "10px system-ui";
        ctx.fillText(chat.msg, x + 52, itemY + 30);
        
        // Unread badge
        if (chat.unread > 0) {
          ctx.fillStyle = PRIMARY;
          ctx.beginPath();
          ctx.arc(x + w - 35, itemY + 20, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = WHITE;
          ctx.font = "bold 9px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(chat.unread.toString(), x + w - 35, itemY + 23);
          ctx.textAlign = "left";
        }
        
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawMusicMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = PRIMARY;
    ctx.font = "bold 14px system-ui";
    ctx.fillText("🎵 Music Hub", x + 10, y + 20);
    
    const tracks = [
      { title: "Blinding Lights", artist: "The Weeknd", trending: true },
      { title: "Levitating", artist: "Dua Lipa", trending: true },
      { title: "Stay", artist: "Kid LAROI", trending: false },
      { title: "Good 4 U", artist: "Olivia Rodrigo", trending: true }
    ];
    
    tracks.forEach((track, i) => {
      const itemY = y + 50 + i * 52;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.1) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        // Play button
        const isPlaying = i === 0 && progress > 0.3;
        ctx.fillStyle = isPlaying ? PRIMARY : "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.roundRect(x + 8, itemY, 36, 36, 8);
        ctx.fill();
        
        ctx.fillStyle = WHITE;
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isPlaying ? "⏸" : "▶", x + 26, itemY + 24);
        ctx.textAlign = "left";
        
        // Track info
        ctx.fillStyle = WHITE;
        ctx.font = "bold 11px system-ui";
        ctx.fillText(track.title, x + 52, itemY + 14);
        if (track.trending) {
          ctx.fillStyle = PRIMARY;
          ctx.fillText("📈", x + w - 35, itemY + 14);
        }
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px system-ui";
        ctx.fillText(track.artist, x + 52, itemY + 28);
        
        ctx.globalAlpha = 1;
      }
    });
    
    // Now playing bar
    if (progress > 0.3) {
      ctx.fillStyle = "rgba(34,197,94,0.2)";
      ctx.beginPath();
      ctx.roundRect(x + 5, y + h - 50, w - 30, 40, 8);
      ctx.fill();
      
      // Progress bar
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.roundRect(x + 10, y + h - 20, w - 40, 4, 2);
      ctx.fill();
      
      ctx.fillStyle = PRIMARY;
      ctx.beginPath();
      ctx.roundRect(x + 10, y + h - 20, (w - 40) * progress, 4, 2);
      ctx.fill();
    }
  };

  const drawCreateMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Create", x + w / 2 - 10, y + 25);
    ctx.textAlign = "left";
    
    const options = [
      { icon: "📸", label: "Post", color: "from-blue-500 to-purple-500" },
      { icon: "🎬", label: "Reel", color: "from-pink-500 to-red-500" },
      { icon: "⏱️", label: "Story", color: "from-orange-500 to-yellow-500" },
      { icon: "🔴", label: "Live", color: "from-red-500 to-pink-500" }
    ];
    
    const cols = 2;
    const itemW = (w - 40) / cols;
    const itemH = 70;
    
    options.forEach((opt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const itemX = x + 15 + col * (itemW + 10);
      const itemY = y + 50 + row * (itemH + 15);
      
      const scale = Math.max(0, Math.min(1, (progress - i * 0.15) * 3));
      
      if (scale > 0) {
        ctx.globalAlpha = scale;
        ctx.save();
        ctx.translate(itemX + itemW / 2, itemY + itemH / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(itemX + itemW / 2), -(itemY + itemH / 2));
        
        // Background
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.roundRect(itemX, itemY, itemW, itemH, 12);
        ctx.fill();
        
        // Icon
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(opt.icon, itemX + itemW / 2, itemY + 35);
        
        // Label
        ctx.fillStyle = WHITE;
        ctx.font = "bold 10px system-ui";
        ctx.fillText(opt.label, itemX + itemW / 2, itemY + 55);
        
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }
    });
  };

  const drawStoriesMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui";
    ctx.fillText("Stories", x + 10, y + 15);
    
    // Story circles
    const stories = ["You", "Sarah", "Alex", "Jordan", "Maya"];
    const circleSize = 45;
    
    stories.forEach((name, i) => {
      const circleX = x + 30 + i * 42;
      const circleY = y + 50;
      
      const isActive = Math.floor(progress * 10) % stories.length === i;
      
      // Ring gradient
      if (isActive) {
        const ringGrad = ctx.createLinearGradient(circleX - 22, circleY - 22, circleX + 22, circleY + 22);
        ringGrad.addColorStop(0, "#fbbf24");
        ringGrad.addColorStop(0.5, "#ef4444");
        ringGrad.addColorStop(1, "#a855f7");
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
      }
      
      ctx.beginPath();
      ctx.arc(circleX, circleY, 20, 0, Math.PI * 2);
      ctx.stroke();
      
      // Avatar
      ctx.fillStyle = `hsl(${i * 50 + 100}, 60%, 50%)`;
      ctx.beginPath();
      ctx.arc(circleX, circleY, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // Name
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "8px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(name, circleX, circleY + 32);
      ctx.textAlign = "left";
    });
    
    // Story viewer mockup
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 100, w - 40, h - 120, 12);
    ctx.fill();
    
    // Progress bars at top
    const activeIdx = Math.floor(progress * 5) % 5;
    for (let i = 0; i < 5; i++) {
      const barW = (w - 60) / 5 - 3;
      const barX = x + 20 + i * (barW + 3);
      
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.roundRect(barX, y + 110, barW, 2, 1);
      ctx.fill();
      
      if (i < activeIdx || (i === activeIdx)) {
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.roundRect(barX, y + 110, i === activeIdx ? barW * (progress * 5 % 1) : barW, 2, 1);
        ctx.fill();
      }
    }
  };

  const drawProfileMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Profile header
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(x + w / 2 - 10, y + 45, 35, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("@username", x + w / 2 - 10, y + 100);
    
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui";
    ctx.fillText("Digital Creator ✨", x + w / 2 - 10, y + 116);
    ctx.textAlign = "left";
    
    // Stats
    const stats = [
      { label: "Posts", value: "142" },
      { label: "Followers", value: "24.5K" },
      { label: "Following", value: "892" }
    ];
    
    stats.forEach((stat, i) => {
      const statX = x + 20 + i * ((w - 50) / 3);
      ctx.fillStyle = WHITE;
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(stat.value, statX + 25, y + 145);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "9px system-ui";
      ctx.fillText(stat.label, statX + 25, y + 158);
    });
    ctx.textAlign = "left";
    
    // Grid
    const gridCols = 3;
    const gridSize = (w - 46) / gridCols;
    
    for (let i = 0; i < 6; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const gridX = x + 13 + col * (gridSize + 3);
      const gridY = y + 175 + row * (gridSize + 3);
      
      const appear = Math.max(0, Math.min(1, (progress - i * 0.1) * 4));
      ctx.globalAlpha = appear;
      
      ctx.fillStyle = `hsl(${140 + i * 10}, 50%, ${30 + i * 5}%)`;
      ctx.beginPath();
      ctx.roundRect(gridX, gridY, gridSize, gridSize, 4);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
  };

  const drawCommunityMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px system-ui";
    ctx.fillText("🌐 Community", x + 10, y + 20);
    
    const channels = [
      { name: "📸 Photography", members: "12.4K", pinned: true },
      { name: "🎨 Art & Design", members: "8.2K", pinned: true },
      { name: "🎵 Music Makers", members: "15.1K", pinned: false },
      { name: "✈️ Travel Stories", members: "9.8K", pinned: false }
    ];
    
    channels.forEach((ch, i) => {
      const itemY = y + 45 + i * 50;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.1) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.roundRect(x + 8, itemY, w - 36, 42, 8);
        ctx.fill();
        
        ctx.fillStyle = WHITE;
        ctx.font = "12px system-ui";
        ctx.fillText(ch.name, x + 18, itemY + 18);
        
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "10px system-ui";
        ctx.fillText(`${ch.members} members`, x + 18, itemY + 32);
        
        if (ch.pinned) {
          ctx.fillStyle = PRIMARY;
          ctx.font = "10px sans-serif";
          ctx.fillText("📌", x + w - 50, itemY + 25);
        }
        
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawExploreMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Search bar
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 40, 32, 16);
    ctx.fill();
    
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px system-ui";
    ctx.fillText("🔍 Search...", x + 22, y + 30);
    
    // Tags
    const tags = ["Trending", "For You", "Art", "Music", "Travel"];
    let tagX = x + 10;
    
    tags.forEach((tag, i) => {
      const tagW = ctx.measureText(tag).width + 20;
      const appear = Math.max(0, Math.min(1, (progress - i * 0.08) * 4));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = i === 0 ? PRIMARY : "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(tagX, y + 52, tagW, 24, 12);
      ctx.fill();
      
      ctx.fillStyle = WHITE;
      ctx.font = "10px system-ui";
      ctx.fillText(tag, tagX + 10, y + 68);
      
      tagX += tagW + 8;
      ctx.globalAlpha = 1;
    });
    
    // Grid of content
    const gridCols = 3;
    const gridSize = (w - 46) / gridCols;
    
    for (let i = 0; i < 9; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const gridX = x + 13 + col * (gridSize + 3);
      const gridY = y + 90 + row * (gridSize + 3);
      
      const appear = Math.max(0, Math.min(1, (progress - i * 0.05) * 3));
      ctx.globalAlpha = appear;
      
      ctx.fillStyle = `hsl(${100 + i * 20}, 60%, ${35 + i * 3}%)`;
      ctx.beginPath();
      ctx.roundRect(gridX, gridY, gridSize, gridSize, 4);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
  };

  const drawAnalyticsMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 14px system-ui";
    ctx.fillText("📊 Analytics", x + 10, y + 20);
    
    // Stats cards
    const stats = [
      { label: "Reach", value: "24.5K", change: "+12%" },
      { label: "Engagement", value: "8.2%", change: "+5%" }
    ];
    
    stats.forEach((stat, i) => {
      const cardX = x + 10 + i * ((w - 30) / 2 + 5);
      const cardY = y + 35;
      
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, (w - 40) / 2, 55, 8);
      ctx.fill();
      
      ctx.fillStyle = WHITE;
      ctx.font = "bold 16px system-ui";
      ctx.fillText(stat.value, cardX + 10, cardY + 25);
      
      ctx.fillStyle = PRIMARY;
      ctx.font = "10px system-ui";
      ctx.fillText(stat.change, cardX + 10, cardY + 42);
      
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(stat.label, cardX + 45, cardY + 42);
    });
    
    // Chart
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 100, w - 40, 100, 8);
    ctx.fill();
    
    // Animated bars
    const barCount = 7;
    const barWidth = (w - 70) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barX = x + 20 + i * (barWidth + 5);
      const barHeight = 30 + Math.sin(progress * Math.PI * 2 + i * 0.5) * 20 + Math.random() * 10;
      const barY = y + 180 - barHeight;
      
      const appear = Math.max(0, Math.min(1, (progress - i * 0.08) * 3));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = PRIMARY;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth - 5, barHeight, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const totalFrames = 900; // 30 seconds at 30fps
    const sectionDuration = totalFrames / (VIDEO_SECTIONS.length + 2);

    const currentSection = Math.floor(frame / sectionDuration);
    const sectionProgress = (frame % sectionDuration) / sectionDuration;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, DARK_BG);
    gradient.addColorStop(0.5, "#0d1f12");
    gradient.addColorStop(1, DARK_BG);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles
    for (let i = 0; i < 50; i++) {
      const px = (Math.sin(frame * 0.008 + i * 1.8) * 0.5 + 0.5) * width;
      const py = ((frame * 0.4 + i * 40) % (height + 40)) - 20;
      const size = 1.5 + Math.sin(i * 0.6) * 1.5;
      const alpha = 0.15 + Math.sin(frame * 0.015 + i) * 0.1;
      
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.fill();
    }

    // Glowing orbs
    for (let i = 0; i < 4; i++) {
      const orbX = width * 0.15 + (i * width * 0.22);
      const orbY = height * 0.4 + Math.sin(frame * 0.012 + i * 1.8) * 60;
      const orbRadius = 100 + Math.sin(frame * 0.018 + i) * 30;
      
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius);
      orbGrad.addColorStop(0, "rgba(34, 197, 94, 0.12)");
      orbGrad.addColorStop(1, "rgba(34, 197, 94, 0)");
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (currentSection === 0) {
      // INTRO
      const scale = 0.85 + sectionProgress * 0.15;
      const alpha = Math.min(1, sectionProgress * 2.5);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = 50 + Math.sin(frame * 0.08) * 15;

      ctx.fillStyle = WHITE;
      ctx.font = "bold 140px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SpecVerse", 0, -60);

      ctx.shadowBlur = 0;

      ctx.fillStyle = PRIMARY_LIGHT;
      ctx.font = "36px system-ui, -apple-system, sans-serif";
      ctx.fillText("Your Social Universe", 0, 40);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "26px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect • Create • Inspire", 0, 100);

      ctx.restore();
    } else if (currentSection <= VIDEO_SECTIONS.length) {
      // FEATURE SECTIONS
      const section = VIDEO_SECTIONS[currentSection - 1];
      const slideIn = Math.min(1, sectionProgress * 2.5);
      const fadeOut = sectionProgress > 0.85 ? (1 - sectionProgress) * 6.67 : 1;

      ctx.save();
      ctx.globalAlpha = fadeOut;

      // Left side - Text content
      const textX = 80;
      const textY = height / 2 - 100;

      // Section icon
      ctx.font = "80px sans-serif";
      ctx.globalAlpha = 0.2 * fadeOut;
      ctx.fillText(section.icon, textX - 20, textY - 40);
      ctx.globalAlpha = fadeOut;

      // Title with glow
      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = 25;
      ctx.fillStyle = WHITE;
      ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      const titleOffset = (1 - slideIn) * -80;
      ctx.fillText(section.title, textX + titleOffset, textY + 30);
      ctx.shadowBlur = 0;

      // Subtitle
      ctx.fillStyle = PRIMARY_LIGHT;
      ctx.font = "24px system-ui, -apple-system, sans-serif";
      ctx.fillText(section.subtitle, textX + titleOffset, textY + 70);

      // Features list
      section.features.forEach((feat, i) => {
        const featDelay = i * 0.08;
        const featProgress = Math.max(0, Math.min(1, (sectionProgress - featDelay - 0.1) * 4));
        const featX = textX + (1 - featProgress) * 60;
        const featY = textY + 120 + i * 40;
        
        ctx.globalAlpha = featProgress * fadeOut;
        
        // Bullet
        ctx.fillStyle = PRIMARY;
        ctx.beginPath();
        ctx.arc(featX, featY - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Text
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "20px system-ui, -apple-system, sans-serif";
        ctx.fillText(feat, featX + 20, featY);
      });

      ctx.globalAlpha = fadeOut;

      // Right side - Phone mockup
      const phoneW = 240;
      const phoneH = 480;
      const phoneX = width - phoneW - 120 + (1 - slideIn) * 100;
      const phoneY = (height - phoneH) / 2;

      drawPhoneMockup(ctx, phoneX, phoneY, phoneW, phoneH, section, sectionProgress);

      // Section indicator
      ctx.globalAlpha = 0.6 * fadeOut;
      ctx.fillStyle = PRIMARY;
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${currentSection} / ${VIDEO_SECTIONS.length}`, width - 60, height - 40);

      ctx.restore();
    } else {
      // OUTRO
      const scale = 0.92 + Math.sin(frame * 0.04) * 0.04;
      const alpha = Math.min(1, sectionProgress * 2);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = 60;

      ctx.fillStyle = WHITE;
      ctx.font = "bold 90px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Join SpecVerse", 0, -70);

      ctx.shadowBlur = 0;

      // CTA button
      const btnW = 420;
      const btnH = 75;
      const btnGrad = ctx.createLinearGradient(-btnW/2, 30, btnW/2, 30 + btnH);
      btnGrad.addColorStop(0, PRIMARY);
      btnGrad.addColorStop(1, PRIMARY_DARK);
      
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(-btnW/2, 30, btnW, btnH, 38);
      ctx.fill();

      ctx.fillStyle = WHITE;
      ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
      ctx.fillText("Start Your Journey", 0, 78);

      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "22px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect with creators worldwide", 0, 150);

      ctx.restore();
    }

    // Watermark
    if (currentSection > 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PRIMARY;
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("SpecVerse", 40, height - 40);
    }
  }, []);

  const playPreview = useCallback(() => {
    if (isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const totalFrames = 900;
    
    const animate = () => {
      drawFrame(frameRef.current);
      frameRef.current = (frameRef.current + 1) % totalFrames;
      setProgress((frameRef.current / totalFrames) * 100);
      
      if (frameRef.current < totalFrames - 1 || isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [isPlaying, drawFrame]);

  const resetPreview = () => {
    frameRef.current = 0;
    setProgress(0);
    drawFrame(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsPlaying(false);
  };

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 10000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(blob);
        toast.success("Landing promo video generated!");
      };

      mediaRecorder.start();

      const totalFrames = 900;
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise((resolve) => setTimeout(resolve, 33));
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SpecVerse-Landing-Promo.webm";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Video downloaded!");
  };

  useEffect(() => {
    drawFrame(0);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawFrame]);

  return (
    <Card className="w-full max-w-5xl mx-auto bg-card/50 backdrop-blur border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Film className="w-6 h-6 text-primary" />
          Landing Page Promo Video
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-2">
          30-second promotional video with live feature mockups
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Canvas Preview */}
        <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl shadow-primary/10">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full aspect-video"
          />
          {isGenerating && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-medium">Generating video...</p>
                <p className="text-primary">{Math.round(progress)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={playPreview}
            variant="outline"
            className="gap-2"
            disabled={isGenerating}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pause" : "Preview"}
          </Button>

          <Button
            onClick={resetPreview}
            variant="outline"
            className="gap-2"
            disabled={isGenerating}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>

          <Button
            onClick={generateVideo}
            disabled={isGenerating}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Generate Video"}
          </Button>

          {videoBlob && (
            <Button
              onClick={downloadVideo}
              variant="secondary"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-border/50">
          {VIDEO_SECTIONS.map((section, i) => (
            <div
              key={i}
              className="p-2 rounded-lg bg-primary/5 border border-primary/10 text-center"
            >
              <p className="text-xl mb-1">{section.icon}</p>
              <p className="text-[10px] font-medium text-foreground/70 truncate">{section.title}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LandingPromoVideo;
