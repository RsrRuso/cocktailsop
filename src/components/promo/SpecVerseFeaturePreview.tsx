import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Bookmark, Share2, Send, MoreHorizontal,
  Bell, UserPlus, AtSign, Radio, Play, Pause, Volume2, VolumeX,
  Camera, Image, Video, Clock, Smile, MapPin, Music, Hash,
  Users, Pin, Search, Grid3X3, Settings, Star, Award, Zap,
  ThumbsUp, Eye, TrendingUp, BarChart3, Upload, Download,
  Check, CheckCheck, Phone, Mic, Paperclip, X, Plus, ChevronRight,
  Globe, Lock, Megaphone, Reply, Trash2, Edit2, Copy, Flag
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Mock data for realistic previews
const MOCK_USERS = [
  { name: "Sarah Chen", username: "sarahc", avatar: "https://i.pravatar.cc/150?img=1", verified: true },
  { name: "Alex Rivera", username: "alexr", avatar: "https://i.pravatar.cc/150?img=2", verified: false },
  { name: "Jordan Kim", username: "jordank", avatar: "https://i.pravatar.cc/150?img=3", verified: true },
  { name: "Maya Patel", username: "mayap", avatar: "https://i.pravatar.cc/150?img=4", verified: false },
  { name: "Chris Lee", username: "chrisl", avatar: "https://i.pravatar.cc/150?img=5", verified: true },
];

const MOCK_NOTIFICATIONS = [
  { type: "like", user: MOCK_USERS[0], content: "liked your post", time: "2m", icon: Heart },
  { type: "follow", user: MOCK_USERS[1], content: "started following you", time: "5m", icon: UserPlus },
  { type: "comment", user: MOCK_USERS[2], content: "commented: Amazing work! 🔥", time: "12m", icon: MessageCircle },
  { type: "mention", user: MOCK_USERS[3], content: "mentioned you in a story", time: "1h", icon: AtSign },
  { type: "live", user: MOCK_USERS[4], content: "is live now", time: "Just now", icon: Radio },
];

const MOCK_MESSAGES = [
  { user: MOCK_USERS[0], message: "Hey! Love your latest reel 🎬", time: "2:30 PM", unread: 3 },
  { user: MOCK_USERS[1], message: "Can we collaborate on something?", time: "1:45 PM", unread: 0 },
  { user: MOCK_USERS[2], message: "Thanks for the follow back!", time: "12:20 PM", unread: 1 },
  { user: MOCK_USERS[3], message: "Voice note (0:24)", time: "11:00 AM", unread: 0, isVoice: true },
];

const MOCK_MUSIC = [
  { title: "Blinding Lights", artist: "The Weeknd", plays: "2.4B", trending: true },
  { title: "Levitating", artist: "Dua Lipa", plays: "1.8B", trending: true },
  { title: "Stay", artist: "Kid LAROI & Justin Bieber", plays: "1.5B", trending: false },
  { title: "Good 4 U", artist: "Olivia Rodrigo", plays: "1.2B", trending: true },
];

// ============ FEATURE PREVIEW COMPONENTS ============

// Notification Center Preview
export const NotificationCenterPreview = () => {
  const [activeNotifications, setActiveNotifications] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNotifications(prev => {
        if (prev.length >= MOCK_NOTIFICATIONS.length) return [0];
        return [...prev, prev.length];
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          {MOCK_NOTIFICATIONS.length} new
        </Badge>
      </div>
      
      {/* Notifications List */}
      <div className="divide-y divide-white/5">
        {MOCK_NOTIFICATIONS.map((notif, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ 
              opacity: activeNotifications.includes(i) ? 1 : 0.4,
              x: 0,
              backgroundColor: activeNotifications.includes(i) ? "rgba(34, 197, 94, 0.1)" : "transparent"
            }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 p-3"
          >
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={notif.user.avatar} />
                <AvatarFallback>{notif.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                notif.type === "like" && "bg-red-500",
                notif.type === "follow" && "bg-blue-500",
                notif.type === "comment" && "bg-purple-500",
                notif.type === "mention" && "bg-orange-500",
                notif.type === "live" && "bg-pink-500"
              )}>
                <notif.icon className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">
                <span className="font-semibold">{notif.user.username}</span>{" "}
                <span className="text-white/70">{notif.content}</span>
              </p>
              <p className="text-xs text-white/40">{notif.time}</p>
            </div>
            {notif.type === "follow" && (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs h-7">
                Follow
              </Button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Feed Post Preview
export const FeedPostPreview = () => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(1247);

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 ring-2 ring-primary">
            <AvatarImage src={MOCK_USERS[0].avatar} />
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-white flex items-center gap-1">
              {MOCK_USERS[0].username}
              <Check className="w-3 h-3 text-primary" />
            </p>
            <p className="text-[10px] text-white/40">New York, NY</p>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white/60" />
      </div>

      {/* Post Image */}
      <div className="aspect-square bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-16 h-16 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Photo Content</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                setLiked(!liked);
                setLikeCount(prev => liked ? prev - 1 : prev + 1);
              }}
            >
              <Heart className={cn("w-6 h-6", liked ? "fill-red-500 text-red-500" : "text-white")} />
            </motion.button>
            <MessageCircle className="w-6 h-6 text-white" />
            <Send className="w-6 h-6 text-white" />
          </div>
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => setSaved(!saved)}>
            <Bookmark className={cn("w-6 h-6", saved ? "fill-white text-white" : "text-white")} />
          </motion.button>
        </div>
        <p className="text-sm font-semibold text-white">{likeCount.toLocaleString()} likes</p>
        <p className="text-sm text-white mt-1">
          <span className="font-semibold">{MOCK_USERS[0].username}</span>{" "}
          <span className="text-white/80">Beautiful sunset vibes 🌅 #photography #travel</span>
        </p>
        <p className="text-xs text-white/40 mt-1">View all 89 comments</p>
      </div>
    </div>
  );
};

// Messages Preview
export const MessagesPreview = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white">Messages</h3>
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-white/60" />
          <Edit2 className="w-5 h-5 text-white/60" />
        </div>
      </div>

      {/* Chat List */}
      <div className="divide-y divide-white/5">
        {MOCK_MESSAGES.map((chat, i) => (
          <motion.div
            key={i}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            onClick={() => setSelectedChat(i)}
            className={cn(
              "flex items-center gap-3 p-3 cursor-pointer",
              selectedChat === i && "bg-primary/10"
            )}
          >
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={chat.user.avatar} />
                <AvatarFallback>{chat.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-white">{chat.user.name}</p>
                <p className="text-[10px] text-white/40">{chat.time}</p>
              </div>
              <div className="flex items-center gap-1">
                {chat.isVoice && <Mic className="w-3 h-3 text-primary" />}
                <p className={cn(
                  "text-xs truncate",
                  chat.unread > 0 ? "text-white font-medium" : "text-white/50"
                )}>
                  {chat.message}
                </p>
              </div>
            </div>
            {chat.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{chat.unread}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Message Input Hint */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
          <Camera className="w-5 h-5 text-white/40" />
          <span className="text-sm text-white/40 flex-1">Message...</span>
          <Mic className="w-5 h-5 text-white/40" />
          <Image className="w-5 h-5 text-white/40" />
        </div>
      </div>
    </div>
  );
};

// Music Hub Preview
export const MusicHubPreview = () => {
  const [playing, setPlaying] = useState<number | null>(null);

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Music Hub
          </h3>
          <Button size="sm" variant="ghost" className="text-primary">
            <Upload className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-primary/20 text-primary">Trending</Badge>
          <Badge variant="outline" className="border-white/20 text-white/60">My Library</Badge>
          <Badge variant="outline" className="border-white/20 text-white/60">Saved</Badge>
        </div>
      </div>

      {/* Track List */}
      <div className="divide-y divide-white/5">
        {MOCK_MUSIC.map((track, i) => (
          <motion.div
            key={i}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            className="flex items-center gap-3 p-3"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setPlaying(playing === i ? null : i)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                playing === i ? "bg-primary" : "bg-white/10"
              )}
            >
              {playing === i ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </motion.button>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-white truncate flex items-center gap-1">
                {track.title}
                {track.trending && <TrendingUp className="w-3 h-3 text-primary" />}
              </p>
              <p className="text-xs text-white/50">{track.artist}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">{track.plays}</p>
              <p className="text-[10px] text-white/30">plays</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Now Playing Bar */}
      {playing !== null && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-3 bg-primary/20 border-t border-primary/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary/30 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{MOCK_MUSIC[playing].title}</p>
              <p className="text-xs text-white/60">{MOCK_MUSIC[playing].artist}</p>
            </div>
            <Volume2 className="w-5 h-5 text-white/60" />
          </div>
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "60%" }}
              transition={{ duration: 2 }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Create Content Preview
export const CreateContentPreview = () => {
  const options = [
    { icon: Image, label: "Post", desc: "Photo or carousel", color: "from-blue-500 to-purple-500" },
    { icon: Video, label: "Reel", desc: "Short video", color: "from-pink-500 to-red-500" },
    { icon: Clock, label: "Story", desc: "24h content", color: "from-orange-500 to-yellow-500" },
    { icon: Radio, label: "Live", desc: "Go live now", color: "from-red-500 to-pink-500" },
  ];

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm p-6">
      <h3 className="text-lg font-semibold text-white text-center mb-6">Create</h3>
      <div className="grid grid-cols-2 gap-4">
        {options.map((opt, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${opt.color} flex items-center justify-center`}>
              <opt.icon className="w-6 h-6 text-white" />
            </div>
            <p className="font-medium text-sm text-white">{opt.label}</p>
            <p className="text-[10px] text-white/50">{opt.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Story Viewer Preview
export const StoryViewerPreview = () => {
  const [currentStory, setCurrentStory] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStory(prev => (prev + 1) % MOCK_USERS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      {/* Stories Bar */}
      <div className="p-3 border-b border-white/10">
        <p className="text-xs text-white/40 mb-2">Stories</p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {MOCK_USERS.map((user, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center gap-1 flex-shrink-0"
              animate={{ scale: currentStory === i ? 1.1 : 1 }}
            >
              <div className={cn(
                "w-14 h-14 rounded-full p-0.5",
                currentStory === i 
                  ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500" 
                  : "bg-white/20"
              )}>
                <Avatar className="w-full h-full border-2 border-zinc-900">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <p className="text-[10px] text-white/60 truncate w-14 text-center">{user.username}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Story View */}
      <div className="aspect-[9/16] bg-gradient-to-b from-primary/30 to-emerald-500/30 relative">
        {/* Progress Bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1">
          {MOCK_USERS.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: i < currentStory ? "100%" : "0%" }}
                animate={{ width: i <= currentStory ? "100%" : "0%" }}
                transition={{ duration: i === currentStory ? 2 : 0 }}
              />
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="absolute top-6 left-3 flex items-center gap-2">
          <Avatar className="w-8 h-8 ring-2 ring-white">
            <AvatarImage src={MOCK_USERS[currentStory].avatar} />
            <AvatarFallback>{MOCK_USERS[currentStory].name[0]}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium text-white">{MOCK_USERS[currentStory].username}</p>
          <p className="text-xs text-white/60">2h</p>
        </div>

        {/* Story Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/40 text-sm">Story Content</p>
        </div>

        {/* Reply Input */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2">
            <span className="text-sm text-white/60 flex-1">Reply to story...</span>
            <Heart className="w-5 h-5 text-white/60" />
            <Send className="w-5 h-5 text-white/60" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Preview
export const ProfilePreview = () => {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      {/* Cover */}
      <div className="h-20 bg-gradient-to-r from-primary/40 to-emerald-500/40" />
      
      {/* Profile Info */}
      <div className="px-4 -mt-8">
        <Avatar className="w-16 h-16 border-4 border-zinc-900">
          <AvatarImage src={MOCK_USERS[0].avatar} />
          <AvatarFallback>S</AvatarFallback>
        </Avatar>
        
        <div className="mt-2">
          <p className="font-semibold text-white flex items-center gap-1">
            {MOCK_USERS[0].name}
            <Check className="w-4 h-4 text-primary" />
          </p>
          <p className="text-sm text-white/50">@{MOCK_USERS[0].username}</p>
          <p className="text-sm text-white/70 mt-1">Digital creator ✨ | Photography 📸</p>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-3 mb-3">
          <div className="text-center">
            <p className="font-bold text-white">156</p>
            <p className="text-[10px] text-white/40">posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white">24.5K</p>
            <p className="text-[10px] text-white/40">followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white">892</p>
            <p className="text-[10px] text-white/40">following</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">Follow</Button>
          <Button size="sm" variant="outline" className="flex-1 border-white/20">Message</Button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="aspect-square bg-white/5" />
        ))}
      </div>
    </div>
  );
};

// Community Channels Preview
export const CommunityPreview = () => {
  const channels = [
    { name: "Photography", members: 12400, icon: Camera, pinned: true },
    { name: "Tech Talk", members: 8900, icon: Zap, pinned: false },
    { name: "Music Lovers", members: 15600, icon: Music, pinned: true },
    { name: "Travel", members: 9200, icon: Globe, pinned: false },
  ];

  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Community
        </h3>
        <Plus className="w-5 h-5 text-primary" />
      </div>

      <div className="divide-y divide-white/5">
        {channels.map((ch, i) => (
          <motion.div
            key={i}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            className="flex items-center gap-3 p-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <ch.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm text-white flex items-center gap-1">
                #{ch.name}
                {ch.pinned && <Pin className="w-3 h-3 text-primary" />}
              </p>
              <p className="text-xs text-white/50">{ch.members.toLocaleString()} members</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Explore Grid Preview
export const ExplorePreview = () => {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm">
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-white/40" />
          <span className="text-sm text-white/40">Search users, hashtags...</span>
        </div>
      </div>
      
      <div className="p-2">
        <div className="flex gap-2 mb-3">
          <Badge className="bg-primary/20 text-primary">For You</Badge>
          <Badge variant="outline" className="border-white/20 text-white/60">Trending</Badge>
          <Badge variant="outline" className="border-white/20 text-white/60">Following</Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-0.5">
          {[1,2,3,4,5,6,7,8,9].map(i => (
            <motion.div
              key={i}
              whileHover={{ scale: 0.98 }}
              className="aspect-square bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center"
            >
              {i === 5 && <Play className="w-6 h-6 text-white/40" />}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Analytics Preview  
export const AnalyticsPreview = () => {
  return (
    <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 w-full max-w-sm p-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        Your Analytics
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-xl p-3">
          <Eye className="w-5 h-5 text-blue-400 mb-1" />
          <p className="text-xl font-bold text-white">24.5K</p>
          <p className="text-[10px] text-white/50">Profile views</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <Heart className="w-5 h-5 text-red-400 mb-1" />
          <p className="text-xl font-bold text-white">12.8K</p>
          <p className="text-[10px] text-white/50">Total likes</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <UserPlus className="w-5 h-5 text-green-400 mb-1" />
          <p className="text-xl font-bold text-white">+892</p>
          <p className="text-[10px] text-white/50">New followers</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <TrendingUp className="w-5 h-5 text-purple-400 mb-1" />
          <p className="text-xl font-bold text-white">156%</p>
          <p className="text-[10px] text-white/50">Engagement</p>
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="h-24 bg-white/5 rounded-xl flex items-end justify-around p-2">
        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
          <motion.div
            key={i}
            className="w-6 bg-gradient-to-t from-primary to-emerald-400 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
};
