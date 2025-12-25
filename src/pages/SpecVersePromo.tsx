import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import SpecVersePromoVideo from "@/components/promo/SpecVersePromoVideo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Home, Image, Video, Clock, Radio, MessageCircle, Users, 
  Music, Search, User, Bell, Heart, Bookmark, Share2, 
  Send, MapPin, Star, Award, Sparkles, Zap
} from "lucide-react";

const DETAILED_FEATURES = [
  {
    category: "🏠 Home Feed",
    icon: Home,
    color: "from-emerald-500 to-green-600",
    actions: [
      "View posts and reels from people you follow",
      "Double-tap to like content instantly",
      "Tap the heart icon to like/unlike",
      "Tap comment icon to add comments",
      "Tap bookmark icon to save for later",
      "Tap share icon to send via DM or share externally",
      "Tap the repost icon to share to your followers",
      "Pull down to refresh your feed",
      "View Stories ring at the top - tap to watch",
      "See music playing on posts with attached tracks",
      "View engagement counts (likes, comments, views)"
    ]
  },
  {
    category: "📸 Create Post",
    icon: Image,
    color: "from-blue-500 to-purple-600",
    actions: [
      "Tap the + button in navigation",
      "Select 'Post' for photo content",
      "Choose photos from gallery or take new",
      "Apply filters and adjustments",
      "Write a caption with hashtags",
      "Tag people in your post",
      "Add location to your post",
      "Attach music from the library",
      "Share to your feed"
    ]
  },
  {
    category: "🎬 Create Reel",
    icon: Video,
    color: "from-pink-500 to-red-500",
    actions: [
      "Tap the + button and select 'Reel'",
      "Record video clips or upload from gallery",
      "Trim and arrange your clips",
      "Add trending music or your own audio",
      "Apply visual effects and filters",
      "Add text overlays and stickers",
      "Write an engaging caption",
      "Publish to Reels feed"
    ]
  },
  {
    category: "⏰ Create Story",
    icon: Clock,
    color: "from-orange-500 to-yellow-500",
    actions: [
      "Tap your profile ring or '+' then 'Story'",
      "Take photo/video or upload from gallery",
      "Add text, stickers, and drawings",
      "Add music that plays with your story",
      "Use location and mention stickers",
      "Post - story disappears after 24 hours",
      "View who watched your story",
      "Reply to story viewers"
    ]
  },
  {
    category: "📡 Go Live",
    icon: Radio,
    color: "from-red-500 to-pink-600",
    actions: [
      "Tap '+' and select 'Live'",
      "Add a title for your livestream",
      "Invite co-hosts to join",
      "Start streaming to your followers",
      "See viewers join in real-time",
      "Read and respond to live comments",
      "Receive virtual gifts from viewers",
      "End stream and save recording"
    ]
  },
  {
    category: "💬 Direct Messages",
    icon: MessageCircle,
    color: "from-violet-500 to-indigo-600",
    actions: [
      "Tap message icon in navigation",
      "View all your conversations",
      "Search for users to message",
      "Send text, photos, videos, voice notes",
      "Create group chats with multiple friends",
      "Name your groups and add avatars",
      "Pin important conversations",
      "React to messages with emojis",
      "Reply to specific messages",
      "Forward messages to others",
      "See read receipts (checkmarks)",
      "Delete messages for yourself or everyone"
    ]
  },
  {
    category: "🎵 Music Hub",
    icon: Music,
    color: "from-green-500 to-emerald-600",
    actions: [
      "Browse trending music tracks",
      "Search for specific songs or artists",
      "Upload your own music library",
      "Share songs to your feed",
      "Like and comment on music shares",
      "Add music to your posts and reels",
      "Set a music status for your profile",
      "Discover new music from people you follow"
    ]
  },
  {
    category: "🔍 Explore & Discover",
    icon: Search,
    color: "from-cyan-500 to-blue-500",
    actions: [
      "Tap search icon in navigation",
      "Browse trending posts and reels",
      "Search for users by username or name",
      "Search for hashtags and topics",
      "View posts in grid layout",
      "Tap any post to view full details",
      "Follow interesting creators you discover",
      "Filter content by region"
    ]
  },
  {
    category: "👤 Profile Management",
    icon: User,
    color: "from-amber-500 to-orange-500",
    actions: [
      "View your profile with posts grid",
      "Switch between Posts, Reels, Saved tabs",
      "Edit your profile photo and bio",
      "Add a professional title",
      "Set your website link",
      "View your followers and following",
      "Access your professional dashboard",
      "See your engagement analytics",
      "Manage your saved content",
      "View your reposted content",
      "Update notification preferences"
    ]
  },
  {
    category: "🏆 Community Channels",
    icon: Users,
    color: "from-teal-500 to-green-500",
    actions: [
      "Discover public community channels",
      "Join channels based on interests",
      "Create your own channels (public/private)",
      "Chat with community members",
      "Share media and files",
      "React to messages with emojis",
      "Reply in threads",
      "Pin important announcements",
      "Manage channel members (if admin)",
      "Mute notifications for specific channels"
    ]
  },
  {
    category: "🔔 Notifications",
    icon: Bell,
    color: "from-rose-500 to-red-500",
    actions: [
      "View all your notifications",
      "See who liked your posts",
      "See new comments on your content",
      "Get notified when followed",
      "Message request notifications",
      "Story mention notifications",
      "Live streaming alerts from followed users",
      "System announcements",
      "Customize notification preferences"
    ]
  },
  {
    category: "❤️ Engagement Features",
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    actions: [
      "Like posts, reels, stories, comments",
      "Double-tap for quick like",
      "View who liked any post",
      "Comment on posts and reels",
      "Reply to other comments",
      "Mention users with @username",
      "Use hashtags to categorize content",
      "View engagement insights on your posts"
    ]
  },
  {
    category: "🔖 Save & Organize",
    icon: Bookmark,
    color: "from-indigo-500 to-purple-500",
    actions: [
      "Tap bookmark icon to save posts",
      "Access saved posts from profile",
      "View all saved content in one place",
      "Unsave content anytime",
      "Saved content is private to you"
    ]
  },
  {
    category: "🔄 Sharing",
    icon: Share2,
    color: "from-sky-500 to-blue-500",
    actions: [
      "Share posts to your story",
      "Share posts via direct message",
      "Share to external apps",
      "Copy link to content",
      "Repost to your followers",
      "View who reposted your content"
    ]
  },
  {
    category: "🗺️ Map & Discovery",
    icon: MapPin,
    color: "from-emerald-500 to-teal-500",
    actions: [
      "View venues and bars on the map",
      "Discover places near you",
      "See ratings and reviews",
      "Get directions to venues",
      "Check-in to locations"
    ]
  },
  {
    category: "⭐ Creator Tools",
    icon: Star,
    color: "from-yellow-500 to-amber-500",
    actions: [
      "Access professional dashboard",
      "View detailed analytics",
      "Track follower growth",
      "Monitor post performance",
      "See best posting times",
      "Creator monetization options",
      "Studio for content management"
    ]
  },
  {
    category: "🏅 Achievements",
    icon: Award,
    color: "from-orange-500 to-red-500",
    actions: [
      "Earn verification badge",
      "Level up with engagement",
      "Unlock badge levels (Bronze, Silver, Gold)",
      "Display achievements on profile",
      "Complete certifications"
    ]
  }
];

const SpecVersePromo = () => {
  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              SpecVerse Features
            </h1>
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your complete social media universe. Here's everything you can do on SpecVerse.
          </p>
        </div>

        {/* Promo Video Generator */}
        <SpecVersePromoVideo />

        {/* Detailed Feature List */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 justify-center">
            <Zap className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Complete Feature List</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DETAILED_FEATURES.map((section, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className={`bg-gradient-to-r ${section.color} text-white py-4`}>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <section.icon className="w-5 h-5" />
                    {section.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-48 p-4">
                    <ul className="space-y-2">
                      {section.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-muted-foreground">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5">
            <p className="text-4xl font-bold text-primary">17+</p>
            <p className="text-sm text-muted-foreground">Feature Categories</p>
          </Card>
          <Card className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
            <p className="text-4xl font-bold text-emerald-500">100+</p>
            <p className="text-sm text-muted-foreground">User Actions</p>
          </Card>
          <Card className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <p className="text-4xl font-bold text-blue-500">∞</p>
            <p className="text-sm text-muted-foreground">Possibilities</p>
          </Card>
          <Card className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <p className="text-4xl font-bold text-purple-500">24/7</p>
            <p className="text-sm text-muted-foreground">Social Connection</p>
          </Card>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default SpecVersePromo;
