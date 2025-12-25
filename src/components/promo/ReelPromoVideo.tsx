import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Play, Pause, RotateCcw, Sparkles, Film, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface VideoSection {
  title: string;
  subtitle: string;
  icon: string;
  features: { name: string; desc: string; icon: string }[];
  mockupType: 'notifications' | 'feed' | 'messages' | 'music' | 'create' | 'stories' | 'profile' | 'community' | 'explore' | 'analytics' | 'reels' | 'live';
}

const VIDEO_SECTIONS: VideoSection[] = [
  {
    title: "Smart Notifications",
    subtitle: "Never miss what matters",
    icon: "🔔",
    features: [
      { name: "Real-time Alerts", desc: "Instant push notifications", icon: "⚡" },
      { name: "Likes & Comments", desc: "Engagement updates", icon: "❤️" },
      { name: "New Followers", desc: "Community growth", icon: "👥" },
      { name: "Live Alerts", desc: "When friends go live", icon: "🔴" },
      { name: "Smart Grouping", desc: "Organized by type", icon: "📂" }
    ],
    mockupType: 'notifications'
  },
  {
    title: "Your Social Feed",
    subtitle: "Personalized for you",
    icon: "📱",
    features: [
      { name: "Photo & Video Posts", desc: "Share your world", icon: "📸" },
      { name: "Like & Comment", desc: "Engage with content", icon: "💬" },
      { name: "Save Favorites", desc: "Bookmark for later", icon: "🔖" },
      { name: "Share Instantly", desc: "Spread the love", icon: "➤" },
      { name: "Algorithm Magic", desc: "Content you'll love", icon: "✨" }
    ],
    mockupType: 'feed'
  },
  {
    title: "Direct Messages",
    subtitle: "Connect privately",
    icon: "💬",
    features: [
      { name: "One-on-One Chats", desc: "Private conversations", icon: "👤" },
      { name: "Group Messaging", desc: "Chat with squads", icon: "👥" },
      { name: "Voice Notes", desc: "Say it with audio", icon: "🎤" },
      { name: "Media Sharing", desc: "Photos & videos", icon: "🖼️" },
      { name: "Message Reactions", desc: "Express feelings", icon: "😍" }
    ],
    mockupType: 'messages'
  },
  {
    title: "Reels Studio",
    subtitle: "Create viral content",
    icon: "🎬",
    features: [
      { name: "Vertical Videos", desc: "Mobile-first format", icon: "📱" },
      { name: "Trending Audio", desc: "Popular sounds", icon: "🎵" },
      { name: "Effects & Filters", desc: "Stunning visuals", icon: "✨" },
      { name: "Speed Control", desc: "Slow-mo & fast", icon: "⏱️" },
      { name: "Duet & Stitch", desc: "Collab features", icon: "🤝" }
    ],
    mockupType: 'reels'
  },
  {
    title: "Music Hub",
    subtitle: "Sound of your world",
    icon: "🎵",
    features: [
      { name: "Trending Tracks", desc: "What's hot now", icon: "🔥" },
      { name: "Upload Library", desc: "Your own music", icon: "📤" },
      { name: "Add to Content", desc: "Soundtrack reels", icon: "🎬" },
      { name: "Discover Artists", desc: "Find new sounds", icon: "🔍" },
      { name: "Create Playlists", desc: "Organize favorites", icon: "📋" }
    ],
    mockupType: 'music'
  },
  {
    title: "Go Live",
    subtitle: "Real-time connection",
    icon: "🔴",
    features: [
      { name: "Stream Instantly", desc: "One-tap broadcast", icon: "📡" },
      { name: "Live Comments", desc: "Interact in real-time", icon: "💬" },
      { name: "Gifts & Tips", desc: "Supporter rewards", icon: "🎁" },
      { name: "Guest Invites", desc: "Bring friends on", icon: "👥" },
      { name: "Save Replays", desc: "Keep broadcasts", icon: "💾" }
    ],
    mockupType: 'live'
  },
  {
    title: "Stories",
    subtitle: "24-hour moments",
    icon: "⏱️",
    features: [
      { name: "Quick Capture", desc: "Photo & video stories", icon: "📸" },
      { name: "Interactive Polls", desc: "Engage followers", icon: "📊" },
      { name: "Questions Box", desc: "Get answers", icon: "❓" },
      { name: "Countdown Timer", desc: "Build hype", icon: "⏳" },
      { name: "Highlights", desc: "Save forever", icon: "⭐" }
    ],
    mockupType: 'stories'
  },
  {
    title: "Your Profile",
    subtitle: "Digital identity",
    icon: "👤",
    features: [
      { name: "Custom Bio", desc: "Tell your story", icon: "✏️" },
      { name: "Post Grid", desc: "Curated content", icon: "🔲" },
      { name: "Followers/Following", desc: "Your community", icon: "👥" },
      { name: "Highlights", desc: "Best moments", icon: "⭐" },
      { name: "Link in Bio", desc: "Drive traffic", icon: "🔗" }
    ],
    mockupType: 'profile'
  },
  {
    title: "Community",
    subtitle: "Find your tribe",
    icon: "🌐",
    features: [
      { name: "Topic Channels", desc: "Shared interests", icon: "📢" },
      { name: "Group Chats", desc: "Squad discussions", icon: "💬" },
      { name: "Events", desc: "Virtual meetups", icon: "📅" },
      { name: "Collaborations", desc: "Team up", icon: "🤝" },
      { name: "Discovery", desc: "Find new groups", icon: "🔍" }
    ],
    mockupType: 'community'
  },
  {
    title: "Explore",
    subtitle: "Discover new worlds",
    icon: "🔍",
    features: [
      { name: "Trending Now", desc: "What's viral", icon: "🔥" },
      { name: "For You Page", desc: "AI recommendations", icon: "🤖" },
      { name: "Categories", desc: "Browse by topic", icon: "📂" },
      { name: "Search", desc: "Find anything", icon: "🔎" },
      { name: "Hashtags", desc: "Follow trends", icon: "#️⃣" }
    ],
    mockupType: 'explore'
  },
  {
    title: "Analytics",
    subtitle: "Grow your presence",
    icon: "📊",
    features: [
      { name: "Engagement Rate", desc: "Track performance", icon: "📈" },
      { name: "Reach & Views", desc: "Audience size", icon: "👁️" },
      { name: "Best Times", desc: "When to post", icon: "🕐" },
      { name: "Demographics", desc: "Know your audience", icon: "🎯" },
      { name: "Growth Trends", desc: "Progress tracking", icon: "📊" }
    ],
    mockupType: 'analytics'
  },
  {
    title: "Create Content",
    subtitle: "Express yourself",
    icon: "✨",
    features: [
      { name: "Photo Posts", desc: "Stunning images", icon: "📷" },
      { name: "Video Reels", desc: "Short-form content", icon: "🎬" },
      { name: "Stories", desc: "24h moments", icon: "⏱️" },
      { name: "Go Live", desc: "Real-time", icon: "🔴" },
      { name: "Carousels", desc: "Multi-image posts", icon: "🔄" }
    ],
    mockupType: 'create'
  }
];

const ReelPromoVideo = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  // Reel dimensions: 1080x1920 (9:16 aspect ratio)
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1920;

  const PRIMARY = "#22c55e";
  const PRIMARY_LIGHT = "#4ade80";
  const PRIMARY_DARK = "#16a34a";
  const WHITE = "#ffffff";
  const DARK_BG = "#09090b";
  const CARD_BG = "#18181b";

  // Draw phone mockup with content - larger for reel format
  const drawPhoneMockup = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    section: VideoSection,
    animProgress: number
  ) => {
    ctx.save();
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = 40;
    
    // Phone body
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 40);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Screen
    const screenPadding = 12;
    ctx.fillStyle = DARK_BG;
    ctx.beginPath();
    ctx.roundRect(x + screenPadding, y + screenPadding, width - screenPadding * 2, height - screenPadding * 2, 28);
    ctx.fill();
    
    // Dynamic Island
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.roundRect(x + width / 2 - 60, y + 20, 120, 36, 18);
    ctx.fill();
    
    // Screen content
    const screenX = x + screenPadding + 12;
    const screenY = y + 70;
    const screenW = width - screenPadding * 2 - 24;
    const screenH = height - 140;
    
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
      case 'reels':
        drawReelsMockup(ctx, x, y, w, h, progress);
        break;
      case 'live':
        drawLiveMockup(ctx, x, y, w, h, progress);
        break;
    }
  };

  // Enhanced mockup drawings for larger reel format
  const drawNotificationsMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Header
    ctx.fillStyle = WHITE;
    ctx.font = "bold 28px system-ui";
    ctx.fillText("Notifications", x + 20, y + 40);
    
    ctx.fillStyle = PRIMARY;
    ctx.font = "bold 24px system-ui";
    ctx.textAlign = "right";
    ctx.fillText("Mark all read", x + w - 20, y + 40);
    ctx.textAlign = "left";
    
    const notifs = [
      { color: "#ef4444", icon: "❤️", user: "sarah_designs", text: "liked your photo", time: "2m" },
      { color: "#3b82f6", icon: "👤", user: "alex.creative", text: "started following you", time: "5m" },
      { color: "#a855f7", icon: "💬", user: "jordan_vibes", text: "commented: \"Amazing work! 🔥\"", time: "12m" },
      { color: "#f97316", icon: "📍", user: "maya.travels", text: "mentioned you in a story", time: "28m" },
      { color: "#ec4899", icon: "🔴", user: "studio_live", text: "is live now - Join!", time: "1h" },
      { color: "#10b981", icon: "🎉", user: "creator_hub", text: "Your reel hit 10K views!", time: "2h" }
    ];
    
    notifs.forEach((notif, i) => {
      const itemY = y + 80 + i * 90;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.08) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        // Background
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath();
        ctx.roundRect(x + 10, itemY, w - 20, 80, 16);
        ctx.fill();
        
        // Avatar
        ctx.fillStyle = notif.color;
        ctx.beginPath();
        ctx.arc(x + 55, itemY + 40, 28, 0, Math.PI * 2);
        ctx.fill();
        
        // Icon
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(notif.icon, x + 55, itemY + 48);
        ctx.textAlign = "left";
        
        // Text
        ctx.fillStyle = WHITE;
        ctx.font = "bold 20px system-ui";
        ctx.fillText(notif.user, x + 100, itemY + 35);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "18px system-ui";
        ctx.fillText(notif.text, x + 100, itemY + 58);
        
        // Time
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "16px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(notif.time, x + w - 30, itemY + 45);
        ctx.textAlign = "left";
        
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawFeedMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Story bar
    const stories = ["You", "Alex", "Maya", "Jordan", "Sam"];
    stories.forEach((name, i) => {
      const storyX = x + 30 + i * 72;
      const isActive = i !== 0;
      
      // Ring
      if (isActive) {
        const ringGrad = ctx.createLinearGradient(storyX - 28, y + 10, storyX + 28, y + 66);
        ringGrad.addColorStop(0, "#fbbf24");
        ringGrad.addColorStop(0.5, "#ef4444");
        ringGrad.addColorStop(1, "#a855f7");
        ctx.strokeStyle = ringGrad;
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(storyX, y + 38, 26, 0, Math.PI * 2);
      ctx.stroke();
      
      // Avatar
      ctx.fillStyle = `hsl(${i * 60 + 120}, 60%, 50%)`;
      ctx.beginPath();
      ctx.arc(storyX, y + 38, 22, 0, Math.PI * 2);
      ctx.fill();
      
      // Name
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(name, storyX, y + 78);
    });
    ctx.textAlign = "left";
    
    // Post
    const postY = y + 100;
    
    // User header
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(x + 35, postY + 30, 22, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 20px system-ui";
    ctx.fillText("creator_vibes", x + 70, postY + 28);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "16px system-ui";
    ctx.fillText("📍 New York, NY", x + 70, postY + 50);
    
    // Image with gradient overlay
    const imgGrad = ctx.createLinearGradient(x, postY + 70, x + w - 20, postY + 70 + 280);
    imgGrad.addColorStop(0, "rgba(34,197,94,0.4)");
    imgGrad.addColorStop(0.5, "rgba(16,185,129,0.3)");
    imgGrad.addColorStop(1, "rgba(59,130,246,0.3)");
    ctx.fillStyle = imgGrad;
    ctx.beginPath();
    ctx.roundRect(x + 10, postY + 70, w - 20, 280, 16);
    ctx.fill();
    
    // Animated heart
    const heartScale = 0.8 + Math.sin(progress * Math.PI * 4) * 0.3;
    ctx.save();
    ctx.translate(x + w / 2, postY + 210);
    ctx.scale(heartScale, heartScale);
    ctx.font = "60px sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.3 + Math.sin(progress * Math.PI * 4) * 0.3;
    ctx.fillText("❤️", 0, 0);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
    
    // Action bar
    const actionY = postY + 370;
    ctx.font = "32px sans-serif";
    ctx.fillText("♥", x + 20, actionY);
    ctx.fillText("💬", x + 75, actionY);
    ctx.fillText("➤", x + 130, actionY);
    ctx.fillText("🔖", x + w - 50, actionY);
    
    // Likes and caption
    ctx.fillStyle = WHITE;
    ctx.font = "bold 20px system-ui";
    ctx.fillText("12,847 likes", x + 20, actionY + 40);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "18px system-ui";
    ctx.fillText("creator_vibes Golden hour magic ✨", x + 20, actionY + 70);
  };

  const drawMessagesMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Header
    ctx.fillStyle = WHITE;
    ctx.font = "bold 28px system-ui";
    ctx.fillText("Messages", x + 20, y + 40);
    
    // New message button
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.roundRect(x + w - 100, y + 15, 80, 40, 20);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✏️", x + w - 60, y + 42);
    ctx.textAlign = "left";
    
    const chats = [
      { name: "Sarah Chen", msg: "Love your latest reel! 🎬 The editing is so smooth", unread: 3, online: true, time: "2m" },
      { name: "Alex Rivera", msg: "Hey! Want to collab on something?", unread: 0, online: true, time: "15m" },
      { name: "Jordan Smith", msg: "Thanks for the shoutout! 🙌", unread: 1, online: false, time: "1h" },
      { name: "Maya Johnson", msg: "🎤 Voice message (0:24)", unread: 0, online: true, time: "2h" },
      { name: "Creative Squad", msg: "Sam: Who's joining tonight?", unread: 12, online: false, time: "3h" },
      { name: "Design Team", msg: "You: Sent a photo", unread: 0, online: false, time: "1d" }
    ];
    
    chats.forEach((chat, i) => {
      const itemY = y + 80 + i * 95;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.07) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        // Avatar
        ctx.fillStyle = `hsl(${i * 50 + 100}, 70%, 50%)`;
        ctx.beginPath();
        ctx.arc(x + 50, itemY + 40, 32, 0, Math.PI * 2);
        ctx.fill();
        
        // Online indicator
        if (chat.online) {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(x + 72, itemY + 60, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = DARK_BG;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        
        // Name
        ctx.fillStyle = WHITE;
        ctx.font = "bold 20px system-ui";
        ctx.fillText(chat.name, x + 95, itemY + 32);
        
        // Message preview
        ctx.fillStyle = chat.unread > 0 ? WHITE : "rgba(255,255,255,0.5)";
        ctx.font = chat.unread > 0 ? "bold 17px system-ui" : "17px system-ui";
        const msgText = chat.msg.length > 32 ? chat.msg.substring(0, 32) + "..." : chat.msg;
        ctx.fillText(msgText, x + 95, itemY + 58);
        
        // Time
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "15px system-ui";
        ctx.textAlign = "right";
        ctx.fillText(chat.time, x + w - 25, itemY + 32);
        ctx.textAlign = "left";
        
        // Unread badge
        if (chat.unread > 0) {
          ctx.fillStyle = PRIMARY;
          ctx.beginPath();
          ctx.arc(x + w - 40, itemY + 55, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = WHITE;
          ctx.font = "bold 14px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(chat.unread.toString(), x + w - 40, itemY + 60);
          ctx.textAlign = "left";
        }
        
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawMusicMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Header
    ctx.fillStyle = PRIMARY;
    ctx.font = "bold 28px system-ui";
    ctx.fillText("🎵 Music Hub", x + 20, y + 40);
    
    // Categories
    const cats = ["Trending", "For You", "Library", "Playlists"];
    cats.forEach((cat, i) => {
      const catX = x + 20 + i * 90;
      ctx.fillStyle = i === 0 ? PRIMARY : "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(catX, y + 60, 80, 36, 18);
      ctx.fill();
      ctx.fillStyle = i === 0 ? WHITE : "rgba(255,255,255,0.6)";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(cat, catX + 40, y + 84);
    });
    ctx.textAlign = "left";
    
    const tracks = [
      { title: "Blinding Lights", artist: "The Weeknd", plays: "2.1B", trending: true },
      { title: "Levitating", artist: "Dua Lipa", plays: "1.8B", trending: true },
      { title: "Stay", artist: "The Kid LAROI", plays: "1.5B", trending: false },
      { title: "Good 4 U", artist: "Olivia Rodrigo", plays: "1.3B", trending: true },
      { title: "Montero", artist: "Lil Nas X", plays: "1.1B", trending: false },
      { title: "Peaches", artist: "Justin Bieber", plays: "982M", trending: true }
    ];
    
    tracks.forEach((track, i) => {
      const itemY = y + 120 + i * 80;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.08) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        // Play button
        const isPlaying = i === 0 && progress > 0.2;
        ctx.fillStyle = isPlaying ? PRIMARY : "rgba(255,255,255,0.1)";
        ctx.beginPath();
        ctx.roundRect(x + 15, itemY, 56, 56, 12);
        ctx.fill();
        
        ctx.fillStyle = WHITE;
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isPlaying ? "⏸" : "▶", x + 43, itemY + 38);
        ctx.textAlign = "left";
        
        // Track info
        ctx.fillStyle = WHITE;
        ctx.font = "bold 20px system-ui";
        ctx.fillText(track.title, x + 85, itemY + 25);
        
        if (track.trending) {
          ctx.fillStyle = PRIMARY;
          ctx.font = "18px sans-serif";
          ctx.fillText("📈", x + w - 50, itemY + 25);
        }
        
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "16px system-ui";
        ctx.fillText(`${track.artist} • ${track.plays} plays`, x + 85, itemY + 48);
        
        ctx.globalAlpha = 1;
      }
    });
    
    // Now playing bar
    if (progress > 0.2) {
      ctx.fillStyle = "rgba(34,197,94,0.15)";
      ctx.beginPath();
      ctx.roundRect(x + 10, y + h - 100, w - 20, 80, 16);
      ctx.fill();
      
      // Album art
      ctx.fillStyle = PRIMARY;
      ctx.beginPath();
      ctx.roundRect(x + 25, y + h - 85, 50, 50, 8);
      ctx.fill();
      
      // Track info
      ctx.fillStyle = WHITE;
      ctx.font = "bold 18px system-ui";
      ctx.fillText("Blinding Lights", x + 90, y + h - 60);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "15px system-ui";
      ctx.fillText("The Weeknd", x + 90, y + h - 40);
      
      // Progress bar
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.roundRect(x + 25, y + h - 25, w - 50, 6, 3);
      ctx.fill();
      
      ctx.fillStyle = PRIMARY;
      ctx.beginPath();
      ctx.roundRect(x + 25, y + h - 25, (w - 50) * progress, 6, 3);
      ctx.fill();
    }
  };

  const drawCreateMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Create", x + w / 2, y + 50);
    ctx.textAlign = "left";
    
    const options = [
      { icon: "📸", label: "Photo Post", desc: "Share stunning images", color: "#3b82f6" },
      { icon: "🎬", label: "Reel", desc: "Short-form videos", color: "#ec4899" },
      { icon: "⏱️", label: "Story", desc: "24-hour moments", color: "#f97316" },
      { icon: "🔴", label: "Go Live", desc: "Stream in real-time", color: "#ef4444" },
      { icon: "🔄", label: "Carousel", desc: "Multi-image posts", color: "#8b5cf6" },
      { icon: "📝", label: "Text Post", desc: "Share your thoughts", color: "#06b6d4" }
    ];
    
    const cols = 2;
    const itemW = (w - 50) / cols;
    const itemH = 120;
    
    options.forEach((opt, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const itemX = x + 20 + col * (itemW + 10);
      const itemY = y + 90 + row * (itemH + 15);
      
      const scale = Math.max(0, Math.min(1, (progress - i * 0.1) * 3));
      
      if (scale > 0) {
        ctx.globalAlpha = scale;
        ctx.save();
        ctx.translate(itemX + itemW / 2, itemY + itemH / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(itemX + itemW / 2), -(itemY + itemH / 2));
        
        // Background with gradient
        const bgGrad = ctx.createLinearGradient(itemX, itemY, itemX + itemW, itemY + itemH);
        bgGrad.addColorStop(0, `${opt.color}20`);
        bgGrad.addColorStop(1, "rgba(255,255,255,0.02)");
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.roundRect(itemX, itemY, itemW, itemH, 20);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = `${opt.color}40`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Icon
        ctx.font = "40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(opt.icon, itemX + itemW / 2, itemY + 50);
        
        // Label
        ctx.fillStyle = WHITE;
        ctx.font = "bold 18px system-ui";
        ctx.fillText(opt.label, itemX + itemW / 2, itemY + 80);
        
        // Description
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "14px system-ui";
        ctx.fillText(opt.desc, itemX + itemW / 2, itemY + 100);
        
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }
    });
  };

  const drawStoriesMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Story view mode
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 24);
    ctx.fill();
    
    // Progress bars
    const numBars = 5;
    const activeBar = Math.floor(progress * numBars) % numBars;
    for (let i = 0; i < numBars; i++) {
      const barW = (w - 60) / numBars - 4;
      const barX = x + 25 + i * (barW + 4);
      
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.roundRect(barX, y + 25, barW, 4, 2);
      ctx.fill();
      
      if (i < activeBar || i === activeBar) {
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.roundRect(barX, y + 25, i === activeBar ? barW * ((progress * numBars) % 1) : barW, 4, 2);
        ctx.fill();
      }
    }
    
    // User info
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(x + 50, y + 70, 24, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 20px system-ui";
    ctx.fillText("@username", x + 85, y + 68);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px system-ui";
    ctx.fillText("2h ago", x + 85, y + 90);
    
    // Story content area
    const storyGrad = ctx.createLinearGradient(x + 30, y + 120, x + w - 30, y + h - 200);
    storyGrad.addColorStop(0, "rgba(139,92,246,0.3)");
    storyGrad.addColorStop(0.5, "rgba(236,72,153,0.3)");
    storyGrad.addColorStop(1, "rgba(249,115,22,0.3)");
    ctx.fillStyle = storyGrad;
    ctx.beginPath();
    ctx.roundRect(x + 30, y + 120, w - 60, h - 280, 16);
    ctx.fill();
    
    // Interactive elements
    const elements = [
      { icon: "📊", label: "Poll: Which look?" },
      { icon: "❓", label: "Ask me anything" },
      { icon: "⏳", label: "Countdown: 2h 15m" }
    ];
    
    elements.forEach((elem, i) => {
      const appear = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.15) * 4));
      if (appear > 0) {
        ctx.globalAlpha = appear;
        const elemY = y + 150 + i * 80;
        
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.roundRect(x + 50, elemY, w - 100, 60, 16);
        ctx.fill();
        
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(elem.icon, x + w / 2, elemY + 30);
        ctx.fillStyle = WHITE;
        ctx.font = "18px system-ui";
        ctx.fillText(elem.label, x + w / 2, elemY + 50);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }
    });
    
    // Reply bar
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + 30, y + h - 80, w - 120, 50, 25);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "18px system-ui";
    ctx.fillText("Send message...", x + 60, y + h - 48);
    
    // Heart button
    ctx.font = "32px sans-serif";
    ctx.fillText("❤️", x + w - 70, y + h - 48);
  };

  const drawProfileMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Profile header
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 70, 55, 0, Math.PI * 2);
    ctx.fill();
    
    // Verified badge
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(x + w / 2 + 40, y + 100, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✓", x + w / 2 + 40, y + 106);
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 26px system-ui";
    ctx.fillText("@creativeminds", x + w / 2, y + 155);
    
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "18px system-ui";
    ctx.fillText("Digital Creator ✨ | NYC 📍", x + w / 2, y + 185);
    ctx.fillText("Creating content that inspires", x + w / 2, y + 210);
    ctx.textAlign = "left";
    
    // Stats
    const stats = [
      { label: "Posts", value: "1,247" },
      { label: "Followers", value: "524K" },
      { label: "Following", value: "892" }
    ];
    
    stats.forEach((stat, i) => {
      const statX = x + 35 + i * ((w - 70) / 3);
      ctx.fillStyle = WHITE;
      ctx.font = "bold 26px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(stat.value, statX + 50, y + 270);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "16px system-ui";
      ctx.fillText(stat.label, statX + 50, y + 295);
    });
    ctx.textAlign = "left";
    
    // Action buttons
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.roundRect(x + 30, y + 320, w / 2 - 40, 48, 24);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Follow", x + 30 + (w / 2 - 40) / 2, y + 350);
    
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + w / 2, y + 320, w / 2 - 40, 48, 24);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.fillText("Message", x + w / 2 + (w / 2 - 40) / 2, y + 350);
    ctx.textAlign = "left";
    
    // Grid tabs
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.moveTo(x + w / 4, y + 395);
    ctx.lineTo(x + w / 4 + 60, y + 395);
    ctx.lineWidth = 3;
    ctx.strokeStyle = PRIMARY;
    ctx.stroke();
    
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔲", x + w / 4 + 30, y + 385);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("🎬", x + w / 2, y + 385);
    ctx.fillText("📌", x + w * 3 / 4 - 30, y + 385);
    ctx.textAlign = "left";
    
    // Grid
    const gridCols = 3;
    const gridSize = (w - 50) / gridCols;
    
    for (let i = 0; i < 6; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const gridX = x + 20 + col * (gridSize + 5);
      const gridY = y + 415 + row * (gridSize + 5);
      
      const appear = Math.max(0, Math.min(1, (progress - i * 0.08) * 4));
      ctx.globalAlpha = appear;
      
      ctx.fillStyle = `hsl(${140 + i * 15}, 55%, ${35 + i * 5}%)`;
      ctx.beginPath();
      ctx.roundRect(gridX, gridY, gridSize, gridSize, 4);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
  };

  const drawCommunityMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 28px system-ui";
    ctx.fillText("🌐 Community", x + 20, y + 40);
    
    // Search bar
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + 15, y + 60, w - 30, 48, 24);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "18px system-ui";
    ctx.fillText("🔍 Search communities...", x + 35, y + 92);
    
    const channels = [
      { name: "📸 Photography", members: "124.5K", desc: "Share your best shots", pinned: true },
      { name: "🎨 Art & Design", members: "98.2K", desc: "Creative inspiration", pinned: true },
      { name: "🎵 Music Producers", members: "156.1K", desc: "Make beats together", pinned: false },
      { name: "✈️ Travel Stories", members: "89.8K", desc: "Explore the world", pinned: false },
      { name: "💻 Tech Creators", members: "67.3K", desc: "Build the future", pinned: false }
    ];
    
    channels.forEach((ch, i) => {
      const itemY = y + 130 + i * 100;
      const slideIn = Math.max(0, Math.min(1, (progress - i * 0.08) * 3));
      
      if (slideIn > 0) {
        ctx.globalAlpha = slideIn;
        
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath();
        ctx.roundRect(x + 15, itemY, w - 30, 85, 16);
        ctx.fill();
        
        ctx.fillStyle = WHITE;
        ctx.font = "bold 22px system-ui";
        ctx.fillText(ch.name, x + 30, itemY + 30);
        
        if (ch.pinned) {
          ctx.fillStyle = PRIMARY;
          ctx.font = "18px sans-serif";
          ctx.fillText("📌", x + w - 60, itemY + 30);
        }
        
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "16px system-ui";
        ctx.fillText(ch.desc, x + 30, itemY + 55);
        
        ctx.fillStyle = PRIMARY;
        ctx.font = "bold 16px system-ui";
        ctx.fillText(`👥 ${ch.members} members`, x + 30, itemY + 75);
        
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawExploreMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Search bar
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + 15, y + 15, w - 30, 48, 24);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "18px system-ui";
    ctx.fillText("🔍 Search", x + 35, y + 47);
    
    // Tags
    const tags = ["Trending", "For You", "Art", "Music", "Travel", "Food"];
    let tagX = x + 15;
    
    tags.forEach((tag, i) => {
      const tagW = ctx.measureText(tag).width + 32;
      const appear = Math.max(0, Math.min(1, (progress - i * 0.05) * 4));
      
      ctx.globalAlpha = appear;
      ctx.fillStyle = i === 0 ? PRIMARY : "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(tagX, y + 80, tagW, 36, 18);
      ctx.fill();
      
      ctx.fillStyle = WHITE;
      ctx.font = "16px system-ui";
      ctx.fillText(tag, tagX + 16, y + 104);
      
      tagX += tagW + 10;
      if (tagX > x + w - 50 && i < tags.length - 1) {
        tagX = x + 15;
      }
      ctx.globalAlpha = 1;
    });
    
    // Grid of content
    const gridCols = 3;
    const gridSize = (w - 50) / gridCols;
    
    for (let i = 0; i < 12; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const gridX = x + 18 + col * (gridSize + 7);
      const gridY = y + 140 + row * (gridSize + 7);
      
      const appear = Math.max(0, Math.min(1, (progress - i * 0.04) * 3));
      ctx.globalAlpha = appear;
      
      // Random vibrant colors
      ctx.fillStyle = `hsl(${(i * 30 + 100) % 360}, 65%, 45%)`;
      ctx.beginPath();
      ctx.roundRect(gridX, gridY, gridSize, gridSize, 8);
      ctx.fill();
      
      // Play icon for videos
      if (i % 3 === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.arc(gridX + gridSize / 2, gridY + gridSize / 2, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = WHITE;
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("▶", gridX + gridSize / 2 + 2, gridY + gridSize / 2 + 5);
        ctx.textAlign = "left";
      }
      
      ctx.globalAlpha = 1;
    }
  };

  const drawAnalyticsMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    ctx.fillStyle = WHITE;
    ctx.font = "bold 28px system-ui";
    ctx.fillText("📊 Analytics", x + 20, y + 40);
    
    // Date range
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + w - 140, y + 15, 120, 40, 20);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Last 7 days ▾", x + w - 80, y + 42);
    ctx.textAlign = "left";
    
    // Main stats
    const stats = [
      { label: "Total Reach", value: "1.2M", change: "+24%", icon: "👁️" },
      { label: "Engagement", value: "8.7%", change: "+12%", icon: "💬" },
      { label: "New Followers", value: "+2.4K", change: "+18%", icon: "👥" }
    ];
    
    stats.forEach((stat, i) => {
      const cardX = x + 15 + i * ((w - 45) / 3 + 8);
      const cardW = (w - 60) / 3;
      
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.roundRect(cardX, y + 70, cardW, 100, 16);
      ctx.fill();
      
      ctx.font = "28px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stat.icon, cardX + cardW / 2, y + 100);
      
      ctx.fillStyle = WHITE;
      ctx.font = "bold 24px system-ui";
      ctx.fillText(stat.value, cardX + cardW / 2, y + 135);
      
      ctx.fillStyle = PRIMARY;
      ctx.font = "bold 14px system-ui";
      ctx.fillText(stat.change, cardX + cardW / 2, y + 158);
    });
    ctx.textAlign = "left";
    
    // Chart area
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath();
    ctx.roundRect(x + 15, y + 190, w - 30, 200, 16);
    ctx.fill();
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 20px system-ui";
    ctx.fillText("Engagement Trend", x + 30, y + 225);
    
    // Animated line chart
    ctx.beginPath();
    ctx.moveTo(x + 40, y + 350);
    const points = 7;
    for (let i = 0; i <= points; i++) {
      const px = x + 40 + (i / points) * (w - 80);
      const variation = Math.sin(i * 0.8 + progress * 3) * 40;
      const py = y + 300 - variation - (progress * 30);
      
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    
    // Animated bars
    const barCount = 7;
    const barWidth = (w - 80) / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const barX = x + 40 + i * (barWidth + 5);
      const barHeight = 40 + Math.sin(progress * Math.PI * 2 + i * 0.7) * 25 + progress * 30;
      const barY = y + 520 - barHeight;
      
      const appear = Math.max(0, Math.min(1, (progress - i * 0.06) * 3));
      ctx.globalAlpha = appear;
      
      ctx.fillStyle = i % 2 === 0 ? PRIMARY : PRIMARY_LIGHT;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth - 8, barHeight, 8);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
  };

  const drawReelsMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Full screen reel view
    const reelGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    reelGrad.addColorStop(0, "rgba(139,92,246,0.4)");
    reelGrad.addColorStop(0.5, "rgba(236,72,153,0.4)");
    reelGrad.addColorStop(1, "rgba(249,115,22,0.4)");
    ctx.fillStyle = reelGrad;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 16);
    ctx.fill();
    
    // Side actions
    const actions = ["❤️", "💬", "➤", "🔖", "🎵"];
    actions.forEach((action, i) => {
      const actionY = y + 200 + i * 80;
      const bounce = Math.sin(progress * Math.PI * 3 + i) * 5;
      
      ctx.font = "36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(action, x + w - 50, actionY + bounce);
      
      if (i < 2) {
        ctx.fillStyle = WHITE;
        ctx.font = "bold 16px system-ui";
        ctx.fillText(i === 0 ? "24.5K" : "1.2K", x + w - 50, actionY + 30);
      }
    });
    ctx.textAlign = "left";
    
    // User info at bottom
    ctx.fillStyle = WHITE;
    ctx.font = "bold 22px system-ui";
    ctx.fillText("@viral_creator", x + 30, y + h - 120);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "18px system-ui";
    ctx.fillText("This transition hits different 🔥", x + 30, y + h - 90);
    
    // Music tag
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 30, y + h - 60, 200, 36, 18);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "16px system-ui";
    ctx.fillText("🎵 Trending Sound - Artist", x + 45, y + h - 35);
    
    // Animated progress
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.roundRect(x + 20, y + h - 20, w - 40, 4, 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.roundRect(x + 20, y + h - 20, (w - 40) * progress, 4, 2);
    ctx.fill();
  };

  const drawLiveMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, progress: number) => {
    // Live stream background
    const liveGrad = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, h / 2);
    liveGrad.addColorStop(0, "rgba(239,68,68,0.3)");
    liveGrad.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = liveGrad;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 16);
    ctx.fill();
    
    // LIVE badge
    const pulse = 0.8 + Math.sin(progress * Math.PI * 6) * 0.2;
    ctx.save();
    ctx.translate(x + 60, y + 50);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.roundRect(-30, -15, 60, 30, 15);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("LIVE", 0, 6);
    ctx.restore();
    ctx.textAlign = "left";
    
    // Viewers count
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(x + 100, y + 35, 90, 30, 15);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.font = "bold 16px system-ui";
    ctx.fillText("👁️ 12.4K", x + 115, y + 57);
    
    // Host info
    ctx.fillStyle = PRIMARY;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 200, 60, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = WHITE;
    ctx.font = "bold 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("@live_creator", x + w / 2, y + 290);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "18px system-ui";
    ctx.fillText("Q&A Session 🎤", x + w / 2, y + 320);
    ctx.textAlign = "left";
    
    // Live comments
    const comments = [
      { user: "fan123", msg: "Love this! 🔥" },
      { user: "viewer99", msg: "First time here!" },
      { user: "superfan", msg: "❤️❤️❤️" }
    ];
    
    comments.forEach((comment, i) => {
      const appear = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.15) * 3));
      if (appear > 0) {
        ctx.globalAlpha = appear;
        const commentY = y + h - 200 + i * 50;
        
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.roundRect(x + 20, commentY, w - 100, 40, 20);
        ctx.fill();
        
        ctx.fillStyle = PRIMARY;
        ctx.font = "bold 16px system-ui";
        ctx.fillText(comment.user, x + 40, commentY + 26);
        ctx.fillStyle = WHITE;
        ctx.font = "16px system-ui";
        ctx.fillText(comment.msg, x + 40 + ctx.measureText(comment.user).width + 10, commentY + 26);
        
        ctx.globalAlpha = 1;
      }
    });
    
    // Gift/reaction area
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.roundRect(x + 20, y + h - 70, w - 100, 50, 25);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "18px system-ui";
    ctx.fillText("Say something...", x + 40, y + h - 38);
    
    // Gift button
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(x + w - 50, y + h - 45, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎁", x + w - 50, y + h - 38);
    ctx.textAlign = "left";
  };

  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const totalFrames = 1800; // 60 seconds at 30fps for detailed content
    const sectionDuration = totalFrames / (VIDEO_SECTIONS.length + 2);

    const currentSection = Math.floor(frame / sectionDuration);
    const sectionProgress = (frame % sectionDuration) / sectionDuration;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, DARK_BG);
    gradient.addColorStop(0.3, "#0d1f12");
    gradient.addColorStop(0.7, "#0d1f12");
    gradient.addColorStop(1, DARK_BG);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles - more for larger canvas
    for (let i = 0; i < 80; i++) {
      const px = (Math.sin(frame * 0.006 + i * 1.5) * 0.5 + 0.5) * width;
      const py = ((frame * 0.5 + i * 50) % (height + 50)) - 25;
      const size = 2 + Math.sin(i * 0.5) * 2;
      const alpha = 0.15 + Math.sin(frame * 0.012 + i) * 0.1;
      
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.fill();
    }

    // Glowing orbs - larger for vertical format
    for (let i = 0; i < 5; i++) {
      const orbX = width * 0.2 + (i % 2) * width * 0.6;
      const orbY = height * 0.15 + (i * height * 0.18) + Math.sin(frame * 0.008 + i * 1.5) * 80;
      const orbRadius = 150 + Math.sin(frame * 0.015 + i) * 50;
      
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius);
      orbGrad.addColorStop(0, "rgba(34, 197, 94, 0.15)");
      orbGrad.addColorStop(1, "rgba(34, 197, 94, 0)");
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (currentSection === 0) {
      // INTRO - Larger text for reel format
      const scale = 0.85 + sectionProgress * 0.15;
      const alpha = Math.min(1, sectionProgress * 2);

      ctx.save();
      ctx.translate(width / 2, height / 2 - 100);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = 80 + Math.sin(frame * 0.06) * 20;

      ctx.fillStyle = WHITE;
      ctx.font = "bold 140px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SpecVerse", 0, -80);

      ctx.shadowBlur = 0;

      ctx.fillStyle = PRIMARY_LIGHT;
      ctx.font = "48px system-ui, -apple-system, sans-serif";
      ctx.fillText("Your Social Universe", 0, 30);

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect • Create • Inspire", 0, 100);

      // Animated features preview
      const features = ["📱 Feed", "💬 Messages", "🎬 Reels", "🎵 Music"];
      features.forEach((feat, i) => {
        const featAlpha = Math.max(0, Math.min(1, (sectionProgress - 0.4 - i * 0.1) * 4));
        ctx.globalAlpha = featAlpha;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "28px system-ui";
        ctx.fillText(feat, 0, 180 + i * 50);
      });

      ctx.restore();
    } else if (currentSection <= VIDEO_SECTIONS.length) {
      // FEATURE SECTIONS
      const section = VIDEO_SECTIONS[currentSection - 1];
      const slideIn = Math.min(1, sectionProgress * 2);
      const fadeOut = sectionProgress > 0.88 ? (1 - sectionProgress) * 8.33 : 1;

      ctx.save();
      ctx.globalAlpha = fadeOut;

      // Top - Feature title area
      const titleY = 120;
      
      // Section icon - large
      ctx.font = "100px sans-serif";
      ctx.globalAlpha = 0.15 * fadeOut;
      ctx.textAlign = "center";
      ctx.fillText(section.icon, width / 2, titleY);
      ctx.globalAlpha = fadeOut;
      ctx.textAlign = "left";

      // Title with glow
      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = 40;
      ctx.fillStyle = WHITE;
      ctx.font = "bold 72px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      const titleOffset = (1 - slideIn) * -100;
      ctx.fillText(section.title, width / 2, titleY + 80 + titleOffset);
      ctx.shadowBlur = 0;

      // Subtitle
      ctx.fillStyle = PRIMARY_LIGHT;
      ctx.font = "36px system-ui, -apple-system, sans-serif";
      ctx.fillText(section.subtitle, width / 2, titleY + 140 + titleOffset);
      ctx.textAlign = "left";

      // Phone mockup - centered, large
      const phoneW = 380;
      const phoneH = 760;
      const phoneX = (width - phoneW) / 2;
      const phoneY = titleY + 180;

      drawPhoneMockup(ctx, phoneX, phoneY, phoneW, phoneH, section, sectionProgress);

      // Features list below phone
      const featuresY = phoneY + phoneH + 50;
      section.features.forEach((feat, i) => {
        const featDelay = i * 0.06;
        const featProgress = Math.max(0, Math.min(1, (sectionProgress - featDelay - 0.15) * 3));
        const featX = width / 2 + (1 - featProgress) * 80;
        const featY = featuresY + i * 65;
        
        ctx.globalAlpha = featProgress * fadeOut;
        
        // Feature card
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath();
        ctx.roundRect(60, featY - 20, width - 120, 55, 16);
        ctx.fill();
        
        // Icon
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(feat.icon, 110, featY + 12);
        
        // Text
        ctx.textAlign = "left";
        ctx.fillStyle = WHITE;
        ctx.font = "bold 24px system-ui";
        ctx.fillText(feat.name, 150, featY + 5);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "20px system-ui";
        ctx.fillText(feat.desc, 150, featY + 32);
      });

      ctx.globalAlpha = fadeOut;

      // Section indicator
      ctx.globalAlpha = 0.6 * fadeOut;
      ctx.fillStyle = PRIMARY;
      ctx.font = "bold 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${currentSection} / ${VIDEO_SECTIONS.length}`, width / 2, height - 60);

      ctx.restore();
    } else {
      // OUTRO
      const scale = 0.92 + Math.sin(frame * 0.03) * 0.04;
      const alpha = Math.min(1, sectionProgress * 2);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = 80;

      ctx.fillStyle = WHITE;
      ctx.font = "bold 100px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Join", 0, -150);
      ctx.fillText("SpecVerse", 0, -40);

      ctx.shadowBlur = 0;

      // CTA button
      const btnW = 500;
      const btnH = 90;
      const btnGrad = ctx.createLinearGradient(-btnW/2, 60, btnW/2, 60 + btnH);
      btnGrad.addColorStop(0, PRIMARY);
      btnGrad.addColorStop(1, PRIMARY_DARK);
      
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(-btnW/2, 60, btnW, btnH, 45);
      ctx.fill();

      ctx.fillStyle = WHITE;
      ctx.font = "bold 36px system-ui";
      ctx.fillText("Start Your Journey", 0, 118);

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "28px system-ui";
      ctx.fillText("Connect with creators", 0, 200);
      ctx.fillText("worldwide", 0, 240);

      // Feature icons
      const icons = ["📱", "🎬", "🎵", "💬", "🌐"];
      icons.forEach((icon, i) => {
        const iconX = (i - 2) * 100;
        const bounce = Math.sin(frame * 0.04 + i * 0.8) * 15;
        ctx.font = "50px sans-serif";
        ctx.fillText(icon, iconX - 25, 320 + bounce);
      });

      ctx.restore();
    }

    // Watermark
    if (currentSection > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = PRIMARY;
      ctx.font = "bold 28px system-ui";
      ctx.textAlign = "left";
      ctx.fillText("SpecVerse", 50, height - 50);
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
    const totalFrames = 1800;
    
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
        videoBitsPerSecond: 15000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(blob);
        toast.success("Reel promo video generated! (60 seconds, 9:16 format)");
      };

      mediaRecorder.start();

      const totalFrames = 1800;
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
    a.download = "specverse-reel-promo.webm";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Reel video downloaded!");
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
    <Card className="border-primary/20 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          Reel Promo Video (9:16 Vertical)
          <span className="text-sm font-normal text-muted-foreground ml-2">1080x1920 • 60 seconds</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-6">
          {/* Canvas preview - scaled down for display */}
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-primary/20" style={{ width: 360, height: 640 }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-full"
              style={{ imageRendering: 'auto' }}
            />
            {!isPlaying && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Button
                  size="lg"
                  onClick={playPreview}
                  className="rounded-full w-20 h-20"
                >
                  <Play className="h-10 w-10" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="w-full max-w-md">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center mt-2">
              {isGenerating ? "Generating..." : `${Math.round(progress)}% • ${Math.round(progress * 0.6)}s / 60s`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={playPreview}
              disabled={isGenerating}
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPlaying ? "Pause" : "Preview"}
            </Button>
            <Button
              variant="outline"
              onClick={resetPreview}
              disabled={isGenerating}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={generateVideo}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary/90"
            >
              <Film className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Video"}
            </Button>
            {videoBlob && (
              <Button
                onClick={downloadVideo}
                variant="secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Features summary */}
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Video Highlights ({VIDEO_SECTIONS.length} sections)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {VIDEO_SECTIONS.map((section, index) => (
              <div key={index} className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">{section.icon}</div>
                <div className="font-medium text-sm">{section.title}</div>
                <div className="text-xs text-muted-foreground">{section.features.length} features</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReelPromoVideo;
