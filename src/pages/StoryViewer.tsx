import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart, Brain, BarChart3, Music2, Volume2, VolumeX, Send, Star, AtSign, MoreHorizontal, BadgeCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useUnifiedEngagement } from "@/hooks/useUnifiedEngagement";
import { LivestreamComments } from "@/components/story/LivestreamComments";
import { StoryInsights } from "@/components/story/StoryInsights";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Story {
  id: string;
  user_id: string;
  media_urls: string[];
  media_types: string[];
  created_at: string;
  expires_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  filters: any;
  music_data: any;
  text_overlays: any;
  trim_data: any;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  professional_title?: string | null;
}

interface FlyingHeart {
  id: number;
  x: number;
  y: number;
}

export default function StoryViewer() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  // State
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [recentViewers, setRecentViewers] = useState<Profile[]>([]);
  
  // Refs
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const heartCounterRef = useRef(0);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const seekIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isSeeking, setIsSeeking] = useState<'rewind' | 'forward' | null>(null);
  
  // Derived state
  const currentStory = stories[currentIndex];
  const mediaUrl = currentStory?.media_urls?.[0] || "";
  const mediaType = currentStory?.media_types?.[0] || "";
  const isVideo = mediaType.startsWith("video");

  // Get music data for current story
  const getMusicData = () => {
    if (!currentStory?.music_data) return null;
    const musicData = Array.isArray(currentStory.music_data) 
      ? currentStory.music_data[0] 
      : currentStory.music_data;
    if (!musicData?.url) return null;
    return musicData;
  };
  
  const musicData = getMusicData();

  const { likedItems, toggleLike } = useUnifiedEngagement("story", currentUserId);
  const isLiked = currentStory ? likedItems.has(currentStory.id) : false;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
    };
  }, []);

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();
  }, []);

  // Fetch stories and profile
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username, professional_title")
          .eq("id", userId)
          .single();

        if (profileData) setProfile(profileData);

        const { data: storiesData } = await supabase
          .from("stories")
          .select("*")
          .eq("user_id", userId)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true });

        if (storiesData && storiesData.length > 0) {
          setStories(storiesData);
          if (currentUserId) {
            trackView(storiesData[0].id);
            fetchRecentViewers(storiesData[0].id);
          }
        } else {
          toast.error("No active stories");
          navigate("/home");
        }
      } catch (error) {
        console.error("Error loading stories:", error);
        toast.error("Failed to load stories");
        navigate("/home");
      }
    };

    fetchData();
  }, [userId, currentUserId, navigate]);

  // Fetch recent viewers
  const fetchRecentViewers = async (storyId: string) => {
    const { data } = await supabase
      .from("story_views")
      .select("user_id, profiles!inner(id, avatar_url, full_name)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false })
      .limit(3);
    
    if (data) {
      setRecentViewers(data.map((v: any) => v.profiles));
    }
  };

  // Track view
  const trackView = async (storyId: string) => {
    if (!currentUserId) return;

    try {
      const { data: existingView } = await supabase
        .from("story_views")
        .select("id")
        .eq("story_id", storyId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (!existingView) {
        await supabase.from("story_views").insert({
          story_id: storyId,
          user_id: currentUserId,
        });

        await supabase
          .from("stories")
          .update({ view_count: (currentStory?.view_count || 0) + 1 })
          .eq("id", storyId);
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  // Calculate story duration based on music or content type
  const getStoryDuration = () => {
    if (musicData) {
      const trimStart = musicData.trimStart || 0;
      const trimEnd = musicData.trimEnd || 45;
      return (trimEnd - trimStart) * 1000;
    }
    return isVideo ? 15000 : 5000;
  };

  // Auto-progress timer
  useEffect(() => {
    if (!currentStory || isPaused || showComments) return;

    const duration = getStoryDuration();
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPaused, showComments, stories, musicData]);

  // Video sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    const handleTimeUpdate = () => {
      if (video.duration && !isPaused && !showComments) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => goToNext();

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [currentStory, isPaused, showComments]);

  // Pause/resume video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (isPaused || showComments) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  }, [isPaused, showComments, isVideo]);
  
  // Handle music playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicData?.url) return;
    
    audio.currentTime = musicData.trimStart || 0;
    audio.muted = isMuted;
    
    if (isPaused || showComments) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPaused, showComments, musicData, currentIndex, isMuted]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = isMuted;
  }, [isMuted]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicData?.url) return;
    
    const handleTimeUpdate = () => {
      const trimEnd = musicData.trimEnd || 45;
      if (audio.currentTime >= trimEnd) {
        audio.currentTime = musicData.trimStart || 0;
      }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [musicData]);

  // Navigation
  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      if (currentUserId) {
        trackView(stories[currentIndex + 1].id);
        fetchRecentViewers(stories[currentIndex + 1].id);
      }
    } else {
      navigate("/home");
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      navigate("/home");
    }
  };

  // Like with animation
  const handleLike = async (x: number, y: number) => {
    if (!currentStory || !currentUserId) return;

    const wasLiked = isLiked;
    await toggleLike(currentStory.id);

    if (!wasLiked) {
      const heartsCount = 5;
      for (let i = 0; i < heartsCount; i++) {
        setTimeout(() => {
          const id = heartCounterRef.current++;
          const offsetX = (Math.random() - 0.5) * 60;
          const offsetY = (Math.random() - 0.5) * 40;
          setFlyingHearts((prev) => [...prev, { id, x: x + offsetX, y: y + offsetY }]);
          setTimeout(() => {
            setFlyingHearts((prev) => prev.filter((h) => h.id !== id));
          }, 1200);
        }, i * 80);
      }
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    longPressTimerRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isPaused) {
      setIsPaused(false);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    if (deltaTime < 300 && (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) goToPrevious();
        else goToNext();
      } else {
        if (deltaY < 0) setShowComments(true);
        else if (deltaY > 50 && !showComments) navigate("/home");
      }
      return;
    }

    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const now = Date.now();
      
      if (now - lastTapRef.current < 300) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        handleLike(touch.clientX, touch.clientY);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        singleTapTimerRef.current = setTimeout(() => {
          if (Date.now() - lastTapRef.current >= 300) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const isLeftSide = touch.clientX - rect.left < rect.width / 2;
              if (isLeftSide) goToPrevious();
              else goToNext();
            }
          }
        }, 300);
      }
    }
  };

  const handleMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => setIsPaused(true), 200);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isPaused) {
      setIsPaused(false);
      return;
    }

    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    
    if (!rect) return;

    if (now - lastTapRef.current < 300) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      handleLike(e.clientX, e.clientY);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 300) {
          const isLeftSide = e.clientX - rect.left < rect.width / 2;
          if (isLeftSide) goToPrevious();
          else goToNext();
        }
      }, 300);
    }
  };

  // Send reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !currentStory || !currentUserId) return;
    
    try {
      await supabase.from("story_comments").insert({
        story_id: currentStory.id,
        user_id: currentUserId,
        content: replyText.trim(),
      });
      setReplyText("");
      toast.success("Reply sent!");
    } catch (error) {
      toast.error("Failed to send reply");
    }
  };

  // Get time ago
  const getTimeAgo = () => {
    if (!currentStory) return "";
    const diff = Date.now() - new Date(currentStory.created_at).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    return hours > 0 ? `${hours}h` : `${mins}m`;
  };

  if (!currentStory || !profile) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black">
        <div className="flex items-center gap-3">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.full_name || "User"}
            className="w-10 h-10 border-2 border-primary"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-semibold text-sm">
                {currentUserId === userId ? "Your story" : profile.full_name || profile.username}
              </span>
              <BadgeCheck className="w-4 h-4 text-primary fill-primary" />
              <span className="text-white/50 text-sm">{getTimeAgo()}</span>
            </div>
            <span className="text-primary text-xs flex items-center gap-1">
              <span>🎬</span> Watch full reel &gt;
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/home")}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Story Card Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <div className="w-full max-w-md h-full max-h-[70vh] relative rounded-2xl overflow-hidden bg-card border border-border/30">
          {/* Progress bars inside card */}
          <div className="absolute top-2 left-2 right-2 z-30 flex gap-1">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* User info overlay in card */}
          <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <OptimizedAvatar
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="w-8 h-8 border border-white/50"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-sm drop-shadow-lg">
                    {profile.username || profile.full_name}
                  </span>
                  <span className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-semibold">
                    P
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-primary text-xs drop-shadow-lg">
                    {profile.professional_title || "founder of specverse"}
                  </span>
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-white/70 text-[10px]">AI</span>
                </div>
              </div>
            </div>
            <button className="p-1.5 hover:bg-white/10 rounded-full">
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Mute button on media */}
          {(musicData?.url || isVideo) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="absolute top-6 right-3 z-30 p-2 bg-black/50 backdrop-blur-sm rounded-full"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          )}

          {/* Story content */}
          <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center relative select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{ touchAction: "none" }}
          >
            {isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={isMuted}
              />
            ) : (
              <img src={mediaUrl} alt="Story" className="w-full h-full object-cover" />
            )}
            
            {musicData?.url && !musicData.url.startsWith('spotify:') && (
              <audio ref={audioRef} src={musicData.url} loop={false} preload="auto" />
            )}

            {/* Flying hearts */}
            <AnimatePresence>
              {flyingHearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  className="absolute pointer-events-none z-50"
                  initial={{ left: heart.x - 24, top: heart.y - 24, scale: 0, opacity: 1 }}
                  animate={{ 
                    top: heart.y - 200,
                    scale: [0, 1.5, 1.2, 1],
                    opacity: [1, 1, 1, 0],
                    x: [0, Math.random() * 60 - 30, Math.random() * 40 - 20],
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                >
                  <Heart className="w-12 h-12 text-red-500 fill-red-500 drop-shadow-lg" />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Paused indicator */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex gap-2">
                  <div className="w-1 h-12 bg-white/80 rounded-full" />
                  <div className="w-1 h-12 bg-white/80 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Text overlays */}
          {currentStory.text_overlays && Array.isArray(currentStory.text_overlays) && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
              {currentStory.text_overlays.map((text: any, idx: number) => (
                <div
                  key={idx}
                  className="absolute text-white font-bold text-center px-4"
                  style={{
                    fontSize: text.fontSize || "24px",
                    color: text.color || "white",
                    left: text.x ? `${text.x}%` : "50%",
                    top: text.y ? `${text.y}%` : "50%",
                    transform: "translate(-50%, -50%)",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  {text.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply Input */}
      <div className="px-4 py-3 bg-black">
        <div className="flex items-center gap-3">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Say something..."
            className="flex-1 bg-transparent border-0 border-b border-white/20 rounded-none text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:border-white/40"
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
          />
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-around px-4 py-3 bg-black border-t border-white/10">
        {/* Activity */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => currentUserId === userId && setShowInsights(true)}
        >
          <div className="flex -space-x-2">
            {recentViewers.length > 0 ? (
              recentViewers.slice(0, 3).map((viewer, i) => (
                <OptimizedAvatar
                  key={i}
                  src={viewer.avatar_url}
                  alt={viewer.full_name || "Viewer"}
                  className="w-6 h-6 border border-black"
                />
              ))
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20" />
            )}
          </div>
          <span className="text-white/70 text-xs">Activity</span>
        </button>

        {/* Highlight */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("Highlight feature coming soon")}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          <span className="text-white/70 text-xs">Highlight</span>
        </button>

        {/* Mention */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("Mention feature coming soon")}
        >
          <AtSign className="w-6 h-6 text-white" />
          <span className="text-white/70 text-xs">Mention</span>
        </button>

        {/* Send */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("Share feature coming soon")}
        >
          <Send className="w-6 h-6 text-white" />
          <span className="text-white/70 text-xs">Send</span>
        </button>

        {/* More */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("More options coming soon")}
        >
          <MoreHorizontal className="w-6 h-6 text-white" />
          <span className="text-white/70 text-xs">More</span>
        </button>
      </div>

      {/* Livestream Comments Overlay */}
      <LivestreamComments 
        contentId={currentStory.id} 
        onPauseChange={(paused) => setIsPaused(paused)}
      />

      {/* Story Insights */}
      <Sheet open={showInsights} onOpenChange={setShowInsights}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Story Intelligence
            </SheetTitle>
            <SheetDescription>
              Advanced analytics and insights for your story
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <StoryInsights storyId={currentStory.id} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
