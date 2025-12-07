import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { 
  Camera, Video, MessageCircle, Music2, Sparkles, 
  Wand2, Brain, TrendingUp, Zap, Mic, 
  ImageIcon, Hash, Users, Clock, ChevronRight,
  Loader2, RefreshCw, Star, Target
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import CreateStatusDialog from "@/components/CreateStatusDialog";
import MusicStatusDialog from "@/components/MusicStatusDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AIInsight {
  type: string;
  message: string;
  icon: React.ReactNode;
}

const StoryOptions = () => {
  const navigate = useNavigate();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showMusicStatusDialog, setShowMusicStatusDialog] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [optimalTime, setOptimalTime] = useState<string>("");
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);

  useEffect(() => {
    generateAIInsights();
    getOptimalPostingTime();
    fetchTrendingTopics();
  }, []);

  const generateAIInsights = async () => {
    setLoadingInsights(true);
    try {
      // Simulate AI analysis of user's engagement patterns
      const hour = new Date().getHours();
      const insights: AIInsight[] = [];
      
      if (hour >= 18 && hour <= 21) {
        insights.push({
          type: "timing",
          message: "Peak engagement time! Your followers are most active now.",
          icon: <TrendingUp className="w-4 h-4 text-emerald-500" />
        });
      }
      
      insights.push({
        type: "suggestion",
        message: "Videos get 2x more engagement than photos on weekends",
        icon: <Video className="w-4 h-4 text-blue-500" />
      });

      insights.push({
        type: "trending",
        message: "Music stories are trending - add a soundtrack!",
        icon: <Music2 className="w-4 h-4 text-purple-500" />
      });

      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const getOptimalPostingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setOptimalTime("Best time: 6-8 PM today");
    } else if (hour < 18) {
      setOptimalTime("Good time to post now!");
    } else {
      setOptimalTime("Peak engagement time!");
    }
  };

  const fetchTrendingTopics = () => {
    setTrendingTopics(["#mixology", "#bartender", "#cocktails", "#hospitality"]);
  };

  const handleLiveStream = () => {
    toast.info("Live Stream feature coming soon!", {
      description: "AI-powered live streaming with real-time captions"
    });
  };

  const storyOptions = [
    {
      id: "story",
      title: "Create Story",
      subtitle: "Share photos and videos that disappear in 24 hours",
      icon: Camera,
      gradient: "from-amber-500 via-orange-500 to-rose-500",
      shadowColor: "shadow-orange-500/50",
      aiFeatures: ["AI Captions", "Smart Filters", "Auto-Hashtags"],
      action: () => navigate("/create/story"),
      badge: "AI Enhanced"
    },
    {
      id: "status",
      title: "Add Status",
      subtitle: "Share what's on your mind with emoji",
      icon: MessageCircle,
      gradient: "from-blue-500 via-indigo-500 to-violet-500",
      shadowColor: "shadow-blue-500/50",
      aiFeatures: ["AI Suggestions", "Mood Detection", "Smart Emojis"],
      action: () => setShowStatusDialog(true),
      badge: "Smart Status"
    },
    {
      id: "music",
      title: "Share Music",
      subtitle: "Share what you're listening to from Spotify",
      icon: Music2,
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      shadowColor: "shadow-emerald-500/50",
      aiFeatures: ["AI Matching", "Mood Music", "Trending Tracks"],
      action: () => setShowMusicStatusDialog(true),
      badge: "Music AI"
    },
    {
      id: "live",
      title: "Live Stream",
      subtitle: "Go live and connect with your audience in real-time",
      icon: Video,
      gradient: "from-red-500 via-pink-500 to-purple-500",
      shadowColor: "shadow-red-500/50",
      aiFeatures: ["Live Captions", "AI Moderation", "Smart Comments"],
      action: handleLiveStream,
      badge: "Coming Soon"
    }
  ];

  const quickActions = [
    { icon: Wand2, label: "AI Caption", color: "text-purple-500" },
    { icon: Hash, label: "Hashtags", color: "text-blue-500" },
    { icon: Music2, label: "Add Music", color: "text-emerald-500" },
    { icon: Users, label: "Tag People", color: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-16">
      <TopNav />

      <div className="px-4 py-4 space-y-5">
        {/* Header with AI Badge */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Your Story
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </motion.div>
            </h2>
            <p className="text-muted-foreground text-sm">AI-powered content creation</p>
          </div>
          <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-accent/20 border-primary/30">
            <Brain className="w-3 h-3 mr-1" />
            AI Ready
          </Badge>
        </div>

        {/* AI Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">AI Insights</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={generateAIInsights}
              disabled={loadingInsights}
            >
              {loadingInsights ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          </div>
          
          <AnimatePresence mode="wait">
            {aiInsights.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                {aiInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    {insight.icon}
                    <span className="text-muted-foreground">{insight.message}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Optimal Time */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-primary/10">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">{optimalTime}</span>
          </div>
        </motion.div>

        {/* Quick AI Actions */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-all"
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-xs font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Trending Topics */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <span className="text-xs text-muted-foreground flex-shrink-0">Trending:</span>
          {trendingTopics.map((topic, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs flex-shrink-0 bg-secondary/30 hover:bg-secondary/50 cursor-pointer"
            >
              {topic}
            </Badge>
          ))}
        </div>

        {/* Main Options */}
        <div className="space-y-3">
          {storyOptions.map((option, index) => (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={option.action}
              className="w-full rounded-2xl p-4 flex items-center gap-4 group transition-all bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-primary/20"
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center shadow-xl ${option.shadowColor} group-hover:shadow-lg transition-all`}>
                <option.icon className="w-7 h-7 text-white" />
              </div>
              
              {/* Content */}
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">{option.title}</h3>
                  <Badge 
                    variant="secondary" 
                    className={`text-[10px] px-1.5 py-0 h-5 ${
                      option.badge === "Coming Soon" 
                        ? "bg-muted text-muted-foreground" 
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                    {option.badge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{option.subtitle}</p>
                
                {/* AI Features */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {option.aiFeatures.map((feature, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-background/60 text-muted-foreground border border-border/50"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </motion.button>
          ))}
        </div>

        {/* AI Recommendation Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">AI Recommendation</p>
              <p className="text-xs text-muted-foreground">
                Based on your engagement, try a music story today for 3x more views!
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-0"
              onClick={() => setShowMusicStatusDialog(true)}
            >
              Try Now
            </Button>
          </div>
        </motion.div>
      </div>

      <CreateStatusDialog 
        open={showStatusDialog} 
        onOpenChange={setShowStatusDialog} 
      />
      
      <MusicStatusDialog
        open={showMusicStatusDialog}
        onOpenChange={setShowMusicStatusDialog}
      />

      <BottomNav />
    </div>
  );
};

export default StoryOptions;
