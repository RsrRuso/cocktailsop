import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, ChevronDown, ChevronUp, Play, 
  Home, Image, Video, Clock, Radio, MessageCircle, 
  Music, Search, User, Bell, Users, BarChart3, Bookmark, Film
} from "lucide-react";
import {
  NotificationCenterPreview,
  FeedPostPreview,
  MessagesPreview,
  MusicHubPreview,
  CreateContentPreview,
  StoryViewerPreview,
  ProfilePreview,
  CommunityPreview,
  ExplorePreview,
  AnalyticsPreview
} from "@/components/promo/SpecVerseFeaturePreview";
import SpecVersePromoVideo from "@/components/promo/SpecVersePromoVideo";
import LandingPromoVideo from "@/components/promo/LandingPromoVideo";
import ReelPromoVideo from "@/components/promo/ReelPromoVideo";

interface FeatureSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  preview: React.ReactNode;
  details: {
    action: string;
    description: string;
  }[];
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "notifications",
    title: "Notifications Center",
    icon: Bell,
    description: "Real-time alerts for all your social activity",
    preview: <NotificationCenterPreview />,
    details: [
      { action: "Like Notification", description: "When someone likes your post, reel, or story, you get an instant notification with their profile picture and a red heart icon" },
      { action: "Follow Notification", description: "New followers appear with a blue icon - tap 'Follow' to follow back instantly" },
      { action: "Comment Notification", description: "See comment previews directly in the notification - tap to view full conversation" },
      { action: "Mention Notification", description: "When someone @mentions you in posts, comments, or stories - orange icon indicator" },
      { action: "Live Notification", description: "People you follow going live shows with pink pulsing icon - tap to join stream" },
      { action: "Message Request", description: "New message requests from non-followers with preview text" },
      { action: "Story Reaction", description: "When someone reacts to your story with emoji or message" },
      { action: "Repost Alert", description: "When your content is reposted by others" },
    ]
  },
  {
    id: "feed",
    title: "Home Feed",
    icon: Home,
    description: "Your personalized social feed with posts and reels",
    preview: <FeedPostPreview />,
    details: [
      { action: "Double-tap to Like", description: "Quickly like any post by double-tapping the image - a heart animation appears" },
      { action: "Like Button", description: "Tap the heart icon to like/unlike - count updates instantly" },
      { action: "Comment", description: "Tap comment icon to view all comments and add your own with @mentions" },
      { action: "Share via DM", description: "Tap the paper plane icon to send post directly to friends" },
      { action: "Save Post", description: "Tap bookmark icon to save to your private collection" },
      { action: "Repost", description: "Share to your followers so they see it in their feed" },
      { action: "View Likes", description: "Tap the likes count to see everyone who liked the post" },
      { action: "Follow from Feed", description: "Tap username to visit profile and follow" },
      { action: "See Location", description: "Tap location tag to see other posts from that place" },
      { action: "View Hashtags", description: "Tap any #hashtag to explore related content" },
    ]
  },
  {
    id: "create",
    title: "Create Content",
    icon: Image,
    description: "Multiple ways to share your creativity",
    preview: <CreateContentPreview />,
    details: [
      { action: "Create Post", description: "Upload photos, add filters, write captions with hashtags, tag people, add location and music" },
      { action: "Create Reel", description: "Record or upload video clips, trim and arrange, add trending music, apply effects, add text overlays" },
      { action: "Create Story", description: "Take photo/video, add stickers, text, music, polls, questions - disappears after 24 hours" },
      { action: "Go Live", description: "Start real-time broadcast, see viewers joining, read live comments, receive gifts, invite co-hosts" },
      { action: "Add Music", description: "Search trending tracks or upload your own to attach to any content type" },
      { action: "Apply Filters", description: "Choose from various photo and video filters to enhance your content" },
      { action: "Tag People", description: "Mention users in your posts so they get notified and linked" },
      { action: "Add Location", description: "Tag your location so others can discover your content geographically" },
    ]
  },
  {
    id: "stories",
    title: "Stories",
    icon: Clock,
    description: "24-hour ephemeral content with interactive features",
    preview: <StoryViewerPreview />,
    details: [
      { action: "View Stories", description: "Tap profile rings at top of feed - colored ring means unwatched story" },
      { action: "Story Progress", description: "Progress bars at top show how many stories and current position" },
      { action: "Tap to Navigate", description: "Tap left side to go back, right side to go forward, hold to pause" },
      { action: "Reply to Story", description: "Type a message at bottom to send reply directly to creator" },
      { action: "React with Emoji", description: "Quick react with heart or other emojis" },
      { action: "Share Story", description: "Send someone's story to friends via DM" },
      { action: "View Story Viewers", description: "See who viewed your story with profile list" },
      { action: "Story Highlights", description: "Save stories to profile highlights that don't disappear" },
    ]
  },
  {
    id: "messages",
    title: "Direct Messages",
    icon: MessageCircle,
    description: "Private conversations with individuals and groups",
    preview: <MessagesPreview />,
    details: [
      { action: "Start Conversation", description: "Tap compose icon to search and message any user" },
      { action: "Send Text", description: "Type messages with emoji support and send instantly" },
      { action: "Send Photos/Videos", description: "Tap camera or gallery icon to share media" },
      { action: "Voice Messages", description: "Hold mic button to record voice notes up to 60 seconds" },
      { action: "Create Group", description: "Add multiple people to create group chat with custom name and avatar" },
      { action: "Pin Conversations", description: "Long-press to pin important chats at top of list" },
      { action: "React to Messages", description: "Double-tap or long-press to react with emojis" },
      { action: "Reply to Specific", description: "Swipe right on message to reply in thread" },
      { action: "Unsend Message", description: "Long-press your message to delete for everyone" },
      { action: "Read Receipts", description: "See checkmarks: one = sent, two = delivered, blue = read" },
      { action: "Online Status", description: "Green dot shows when someone is currently active" },
    ]
  },
  {
    id: "music",
    title: "Music Hub",
    icon: Music,
    description: "Discover, share, and use music in your content",
    preview: <MusicHubPreview />,
    details: [
      { action: "Browse Trending", description: "See what songs are popular right now with play counts" },
      { action: "Play Preview", description: "Tap play button to preview any track before using" },
      { action: "Upload Music", description: "Add your own music files to your personal library" },
      { action: "Share Song", description: "Share a song to your feed for followers to discover" },
      { action: "Like & Comment", description: "Engage with music shares from people you follow" },
      { action: "Add to Content", description: "Select any track to add to your reel or story" },
      { action: "Set Music Status", description: "Show what you're listening to on your profile" },
      { action: "Save to Library", description: "Bookmark songs to find them easily later" },
    ]
  },
  {
    id: "explore",
    title: "Explore & Discover",
    icon: Search,
    description: "Find new content, creators, and trends",
    preview: <ExplorePreview />,
    details: [
      { action: "Search Users", description: "Find people by username, full name, or professional title" },
      { action: "Search Hashtags", description: "Discover content by topic using #hashtags" },
      { action: "Browse Grid", description: "Scroll through trending posts in visual grid layout" },
      { action: "View Reels", description: "Video content marked with play icon in grid" },
      { action: "For You Tab", description: "AI-curated content based on your interests" },
      { action: "Trending Tab", description: "See what's popular across the platform right now" },
      { action: "Following Tab", description: "Content from people you follow that you might have missed" },
      { action: "Filter by Region", description: "See content from specific geographic areas" },
    ]
  },
  {
    id: "profile",
    title: "Profile",
    icon: User,
    description: "Your personal page and content gallery",
    preview: <ProfilePreview />,
    details: [
      { action: "Edit Profile", description: "Change photo, cover, bio, name, and professional title" },
      { action: "View Stats", description: "See your post count, followers, and following numbers" },
      { action: "Posts Grid", description: "All your posts displayed in chronological grid" },
      { action: "Reels Tab", description: "Switch to see only your video content" },
      { action: "Saved Tab", description: "Private collection of bookmarked posts" },
      { action: "Share Profile", description: "Copy your profile link to share anywhere" },
      { action: "View Followers", description: "See complete list of people following you" },
      { action: "View Following", description: "See everyone you follow with search filter" },
      { action: "Professional Dashboard", description: "Access creator tools and detailed analytics" },
      { action: "Set Status", description: "Add music or text status to your profile" },
    ]
  },
  {
    id: "community",
    title: "Community Channels",
    icon: Users,
    description: "Join groups and chat with like-minded people",
    preview: <CommunityPreview />,
    details: [
      { action: "Discover Channels", description: "Browse public channels by category and member count" },
      { action: "Join Channel", description: "Tap to join any public channel instantly" },
      { action: "Create Channel", description: "Start your own public or private community" },
      { action: "Send Messages", description: "Chat in real-time with all channel members" },
      { action: "Share Media", description: "Upload photos, videos, and files to channels" },
      { action: "React with Emoji", description: "Add emoji reactions to any message" },
      { action: "Reply in Thread", description: "Start threaded discussions on specific messages" },
      { action: "Pin Announcements", description: "Admins can pin important messages at top" },
      { action: "Mute Channel", description: "Disable notifications for specific channels" },
      { action: "Manage Members", description: "Admins can add, remove, and assign roles" },
    ]
  },
  {
    id: "analytics",
    title: "Creator Analytics",
    icon: BarChart3,
    description: "Track your growth and engagement metrics",
    preview: <AnalyticsPreview />,
    details: [
      { action: "Profile Views", description: "See how many people visited your profile" },
      { action: "Total Likes", description: "Aggregate likes across all your content" },
      { action: "Follower Growth", description: "Track new followers gained over time" },
      { action: "Engagement Rate", description: "Percentage of followers interacting with content" },
      { action: "Best Posting Times", description: "When your audience is most active" },
      { action: "Top Posts", description: "Your best performing content by engagement" },
      { action: "Audience Demographics", description: "Where your followers are from" },
      { action: "Content Insights", description: "Individual post and reel performance stats" },
    ]
  },
];

const SpecVersePromo = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>("notifications");
  const [activeTab, setActiveTab] = useState("features");

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div 
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              SpecVerse
            </h1>
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Your complete social media universe. Explore every feature in detail.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3">
            <TabsTrigger value="features" className="gap-2">
              <Play className="w-4 h-4" />
              Live Previews
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2">
              <Video className="w-4 h-4" />
              Feature Video
            </TabsTrigger>
            <TabsTrigger value="landing" className="gap-2">
              <Film className="w-4 h-4" />
              Landing Video
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="mt-6">
            {/* Feature Sections */}
            <div className="space-y-4">
              {FEATURE_SECTIONS.map((section) => (
                <motion.div
                  key={section.id}
                  layout
                  className="bg-card/50 backdrop-blur border border-border/50 rounded-2xl overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <section.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-foreground">{section.title}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedSection === section.id ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedSection === section.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 grid md:grid-cols-2 gap-6">
                          {/* Live Preview */}
                          <div className="flex justify-center">
                            {section.preview}
                          </div>

                          {/* Detailed Actions */}
                          <div>
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              What You Can Do
                            </h4>
                            <ScrollArea className="h-[400px] pr-4">
                              <div className="space-y-3">
                                {section.details.map((detail, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="bg-white/5 rounded-xl p-3 border border-white/5"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-xs font-bold text-primary">{i + 1}</span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm text-foreground">{detail.action}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{detail.description}</p>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <SpecVersePromoVideo />
          </TabsContent>

          <TabsContent value="landing" className="mt-6">
            <LandingPromoVideo />
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <Card className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <p className="text-3xl font-bold text-primary">10</p>
            <p className="text-xs text-muted-foreground">Feature Categories</p>
          </Card>
          <Card className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <p className="text-3xl font-bold text-emerald-500">80+</p>
            <p className="text-xs text-muted-foreground">Detailed Actions</p>
          </Card>
          <Card className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <p className="text-3xl font-bold text-blue-500">10</p>
            <p className="text-xs text-muted-foreground">Live Previews</p>
          </Card>
          <Card className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <p className="text-3xl font-bold text-purple-500">∞</p>
            <p className="text-xs text-muted-foreground">Possibilities</p>
          </Card>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default SpecVersePromo;
