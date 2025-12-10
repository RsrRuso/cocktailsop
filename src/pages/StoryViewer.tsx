import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart, Volume2, VolumeX, Send, AtSign, MoreHorizontal, BadgeCheck, Sparkles, Eye, ChevronUp, MessageCircle, Music, Edit3, Brain } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { toast } from "sonner";
import { useLike } from "@/hooks/useLike";
import { LivestreamComments } from "@/components/story/LivestreamComments";
import { StoryInsights } from "@/components/story/StoryInsights";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  caption?: string;
  location?: any;
  tagged_people?: any;
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

// Memoized progress bar component - now counts individual media items
const ProgressBars = memo(({ totalItems, currentIndex, progress }: { totalItems: number, currentIndex: number, progress: number }) => (
  <div className="absolute top-2 left-2 right-2 z-30 flex gap-1">
    {Array.from({ length: totalItems }).map((_, idx) => (
      <div key={idx} className="flex-1 h-1 sm:h-0.5 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{
            width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
          }}
        />
      </div>
    ))}
  </div>
));

ProgressBars.displayName = "ProgressBars";

// Individual story engagement display
const StoryEngagementBadge = memo(({ likeCount, viewCount }: { likeCount: number, viewCount: number }) => (
  <div className="absolute bottom-20 left-3 z-30 flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
    <div className="flex items-center gap-1">
      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
      <span className="text-white text-xs font-medium">{likeCount || 0}</span>
    </div>
    <div className="flex items-center gap-1">
      <Eye className="w-4 h-4 text-white/80" />
      <span className="text-white text-xs font-medium">{viewCount || 0}</span>
    </div>
  </div>
));

StoryEngagementBadge.displayName = "StoryEngagementBadge";

// Music display component
const MusicDisplay = memo(({ musicData }: { musicData: any }) => {
  if (!musicData?.name) return null;
  
  return (
    <motion.div 
      className="absolute bottom-20 right-3 z-30 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 max-w-[180px]"
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <Music className="w-4 h-4 text-primary shrink-0" />
      </motion.div>
      <div className="min-w-0">
        <p className="text-white text-xs font-medium truncate">{musicData.name}</p>
        {musicData.artist && (
          <p className="text-white/60 text-[10px] truncate">{musicData.artist}</p>
        )}
      </div>
    </motion.div>
  );
});

MusicDisplay.displayName = "MusicDisplay";

export default function StoryViewer() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  // State
  const [stories, setStories] = useState<Story[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0); // Index across ALL media items
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showViewersPanel, setShowViewersPanel] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [recentViewers, setRecentViewers] = useState<Profile[]>([]);
  const [allViewers, setAllViewers] = useState<Profile[]>([]);
  const [allLikers, setAllLikers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const heartCounterRef = useRef(0);
  const lastTapRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Flatten all media items from all stories - memoized for stable reference
  const allMediaItems = useMemo(() => 
    stories.flatMap((story, storyIdx) => 
      (story.media_urls || []).map((url, mediaIdx) => ({
        storyId: story.id,
        storyIndex: storyIdx,
        url,
        type: story.media_types?.[mediaIdx] || 'image',
        musicData: Array.isArray(story.music_data) ? story.music_data[mediaIdx] : story.music_data,
        textOverlays: Array.isArray(story.text_overlays) ? story.text_overlays[mediaIdx] : story.text_overlays,
        trimData: Array.isArray(story.trim_data) ? story.trim_data[mediaIdx] : story.trim_data,
        filter: Array.isArray(story.filters) ? story.filters[mediaIdx] : story.filters,
        likeCount: stories[storyIdx].like_count,
        viewCount: stories[storyIdx].view_count,
      }))
    ), [stories]);
  
  const totalMediaCount = allMediaItems.length;
  const currentMedia = allMediaItems[currentMediaIndex];
  const currentStory = currentMedia ? stories[currentMedia.storyIndex] : null;
  const mediaUrl = currentMedia?.url || "";
  const mediaType = currentMedia?.type || "";
  const isVideo = mediaType.startsWith("video");

  // Get music data for current media item
  const getMusicData = useCallback(() => {
    if (!currentMedia?.musicData) return null;
    const musicData = currentMedia.musicData;
    if (!musicData?.url && !musicData?.name) return null;
    return musicData;
  }, [currentMedia?.musicData]);
  
  const musicData = getMusicData();

  const { likedItems, toggleLike } = useLike("story", currentUserId);
  const isLiked = currentStory ? likedItems.has(currentStory.id) : false;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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

  // Fetch stories and profile - optimized with parallel fetches
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Parallel fetch for faster loading
        const [profileResult, storiesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, avatar_url, username, professional_title")
            .eq("id", userId)
            .single(),
          supabase
            .from("stories")
            .select("id, user_id, media_urls, media_types, created_at, expires_at, view_count, like_count, comment_count, music_data, text_overlays, trim_data, filters")
            .eq("user_id", userId)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: true })
        ]);

        if (profileResult.data) setProfile(profileResult.data);

        if (storiesResult.data && storiesResult.data.length > 0) {
          setStories(storiesResult.data);
          // Preload first story media
          if (storiesResult.data[0]?.media_urls?.[0]) {
            preloadMedia(storiesResult.data[0].media_urls[0], storiesResult.data[0].media_types?.[0] || "image");
          }
          // Prefetch recent viewers async
          if (currentUserId) {
            trackView(storiesResult.data[0].id);
            fetchRecentViewers(storiesResult.data[0].id);
          }
        } else {
          toast.error("No active stories");
          navigate("/home");
        }
      } catch (error) {
        console.error("Error loading stories:", error);
        toast.error("Failed to load stories");
        navigate("/home");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, currentUserId, navigate]);

  // Preload media helper
  const preloadMedia = (url: string, type: string) => {
    if (type.startsWith("video")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
    } else {
      const img = new Image();
      img.src = url;
    }
  };

  // Preload next media
  useEffect(() => {
    if (allMediaItems.length > currentMediaIndex + 1) {
      const nextMedia = allMediaItems[currentMediaIndex + 1];
      if (nextMedia?.url) {
        preloadMedia(nextMedia.url, nextMedia.type || "image");
      }
    }
  }, [currentMediaIndex, allMediaItems]);

  // Fetch recent viewers
  const fetchRecentViewers = useCallback(async (storyId: string) => {
    const { data } = await supabase
      .from("story_views")
      .select("user_id, profiles!inner(id, avatar_url, full_name, username)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false })
      .limit(3);
    
    if (data) {
      setRecentViewers(data.map((v: any) => v.profiles));
    }
  }, []);

  // Fetch all viewers for the panel
  const fetchAllViewers = useCallback(async (storyId: string) => {
    const { data } = await supabase
      .from("story_views")
      .select("user_id, viewed_at, profiles!inner(id, avatar_url, full_name, username)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false });
    
    if (data) {
      setAllViewers(data.map((v: any) => v.profiles));
    }
  }, []);

  // Fetch all likers
  const fetchAllLikers = useCallback(async (storyId: string) => {
    const { data } = await supabase
      .from("story_likes")
      .select("user_id, created_at, profiles!inner(id, avatar_url, full_name, username)")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });
    
    if (data) {
      setAllLikers(data.map((l: any) => l.profiles));
    }
  }, []);

  // Track view
  const trackView = useCallback(async (storyId: string) => {
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
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  }, [currentUserId]);

  // Calculate story duration
  const getStoryDuration = useCallback(() => {
    if (musicData) {
      const trimStart = musicData.trimStart || 0;
      const trimEnd = musicData.trimEnd || 45;
      return (trimEnd - trimStart) * 1000;
    }
    return isVideo ? 15000 : 5000;
  }, [musicData, isVideo]);

  // Auto-progress timer
  useEffect(() => {
    if (!currentStory || isPaused || showComments || !mediaLoaded) return;

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
  }, [currentMediaIndex, isPaused, showComments, allMediaItems, musicData, mediaLoaded]);

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
    const handleLoadedData = () => setMediaLoaded(true);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadeddata", handleLoadedData);
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
  }, [isPaused, showComments, musicData, currentMediaIndex, isMuted]);
  
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

  // Reset media loaded state on media change - immediately set to true for preloaded content
  useEffect(() => {
    setMediaLoaded(true);
  }, [currentMediaIndex]);

  // Navigation
  const goToNext = useCallback(() => {
    setCurrentMediaIndex(prev => {
      if (prev < totalMediaCount - 1) {
        const nextMedia = allMediaItems[prev + 1];
        setProgress(0);
        if (currentUserId && nextMedia) {
          trackView(nextMedia.storyId);
          fetchRecentViewers(nextMedia.storyId);
        }
        return prev + 1;
      } else {
        navigate("/home");
        return prev;
      }
    });
  }, [totalMediaCount, allMediaItems, currentUserId, navigate, trackView, fetchRecentViewers]);

  const goToPrevious = useCallback(() => {
    setCurrentMediaIndex(prev => {
      if (prev > 0) {
        setProgress(0);
        return prev - 1;
      } else {
        navigate("/home");
        return prev;
      }
    });
  }, [navigate]);

  // Like with animation
  const handleLike = useCallback(async (x: number, y: number) => {
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
  }, [currentStory, currentUserId, isLiked, toggleLike]);

  // Smooth swipe handler using framer-motion drag
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 40;
    const velocityThreshold = 0.3;
    
    const absX = Math.abs(info.offset.x);
    const absY = Math.abs(info.offset.y);
    const velX = Math.abs(info.velocity.x);
    const velY = Math.abs(info.velocity.y);
    
    // Determine if swipe is more vertical or horizontal
    const isVerticalSwipe = absY > absX || velY > velX;
    
    if (isVerticalSwipe && (absY > threshold || velY > velocityThreshold)) {
      // Vertical swipe
      if (info.offset.y < -threshold && currentUserId === userId) {
        // Swipe UP - show viewers panel
        setShowViewersPanel(true);
        if (currentStory) {
          fetchAllViewers(currentStory.id);
          fetchAllLikers(currentStory.id);
        }
      } else if (info.offset.y > threshold && !showViewersPanel) {
        // Swipe DOWN - close story
        navigate("/home");
      }
    } else if (!isVerticalSwipe && (absX > threshold || velX > velocityThreshold)) {
      // Horizontal swipe for navigation
      if (info.offset.x > 0) {
        setSwipeDirection('right');
        setTimeout(() => {
          goToPrevious();
          setSwipeDirection(null);
        }, 150);
      } else {
        setSwipeDirection('left');
        setTimeout(() => {
          goToNext();
          setSwipeDirection(null);
        }, 150);
      }
    }
  }, [goToPrevious, goToNext, currentUserId, userId, currentStory, showViewersPanel, navigate, fetchAllViewers, fetchAllLikers]);

  // Tap handlers for left/right navigation and double-tap like
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging) return;
    
    const clientX = 'touches' in e ? e.changedTouches?.[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches?.[0]?.clientY : e.clientY;
    
    if (!clientX || !clientY) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const now = Date.now();
    const tapZone = rect.width / 3; // Divide into 3 zones
    const tapX = clientX - rect.left;
    
    // Double tap detection for like
    if (now - lastTapRef.current < 300) {
      handleLike(clientX, clientY);
      lastTapRef.current = 0;
      return;
    }
    
    lastTapRef.current = now;
    
    // Single tap after 300ms delay - navigate based on tap position
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 290) {
        if (tapX < tapZone) {
          // Left third - go back
          goToPrevious();
        } else if (tapX > rect.width - tapZone) {
          // Right third - go forward
          goToNext();
        }
        // Middle third - no action (or could pause)
      }
    }, 300);
  }, [isDragging, handleLike, goToPrevious, goToNext]);

  // Long press to pause
  const handlePressStart = useCallback(() => {
    const timer = setTimeout(() => {
      setIsPaused(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const handlePressEnd = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
    }
  }, [isPaused]);

  // Get time ago
  const getTimeAgo = useCallback(() => {
    if (!currentStory) return "";
    const diff = Date.now() - new Date(currentStory.created_at).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    return hours > 0 ? `${hours}h` : `${mins}m`;
  }, [currentStory]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex flex-col gap-1">
              <Skeleton className="w-24 h-4 bg-white/10" />
              <Skeleton className="w-16 h-3 bg-white/10" />
            </div>
          </div>
          <button onClick={() => navigate("/home")} className="p-2">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <Skeleton className="w-full max-w-md aspect-[9/16] rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (!currentStory || !profile) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area-inset">
      {/* Story Container - Fullscreen, header is now part of overlay */}
      <div className="flex-1 relative overflow-hidden">
        <div className="w-full h-full relative overflow-hidden">
          {/* Progress bars - at very top */}
          <ProgressBars totalItems={totalMediaCount} currentIndex={currentMediaIndex} progress={progress} />

          {/* User info overlay - merged header */}
          <div className="absolute top-4 left-2 right-2 sm:left-3 sm:right-3 z-30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <OptimizedAvatar
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-white font-semibold text-xs sm:text-sm truncate drop-shadow-lg">
                    {currentUserId === userId ? "Your story" : profile.full_name || profile.username}
                  </span>
                  <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary shrink-0" />
                  <span className="text-white/70 text-xs sm:text-sm shrink-0 drop-shadow-lg">{getTimeAgo()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/home")}
              className="p-1.5 sm:p-2 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full transition-colors shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
          </div>

          {/* Mute button */}
          {(musicData?.url || isVideo) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="absolute top-14 sm:top-16 right-2 sm:right-3 z-30 p-1.5 sm:p-2 bg-black/30 backdrop-blur-sm rounded-full"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              )}
            </button>
          )}

          {/* Story content with smooth swipe */}
          <motion.div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing"
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            onClick={handleTap}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            animate={{
              x: swipeDirection === 'left' ? -50 : swipeDirection === 'right' ? 50 : 0,
              opacity: swipeDirection ? 0.7 : 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ touchAction: "none" }}
          >
            {/* Loading skeleton while media loads */}
            {!mediaLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
              </div>
            )}
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMediaIndex}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full relative"
              >
                {isVideo ? (
                  <div className="w-full h-full relative">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted={isMuted}
                      preload="auto"
                      onLoadedData={() => {
                        console.log('[StoryViewer] Video loaded:', mediaUrl);
                        setMediaLoaded(true);
                      }}
                      onError={(e) => {
                        console.error('[StoryViewer] Video error:', mediaUrl, e);
                        setMediaLoaded(true);
                      }}
                      onCanPlay={() => {
                        console.log('[StoryViewer] Video can play');
                        videoRef.current?.play().catch(console.error);
                      }}
                      onPlay={() => console.log('[StoryViewer] Video playing')}
                      onStalled={() => console.log('[StoryViewer] Video stalled')}
                    >
                      <source src={mediaUrl} type="video/mp4" />
                      <source src={mediaUrl} type="video/quicktime" />
                      Your browser does not support the video tag.
                    </video>
                    {/* Loading overlay */}
                    {!mediaLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <img 
                    src={mediaUrl} 
                    alt="Story" 
                    className="w-full h-full object-cover"
                    loading="eager"
                    onLoad={() => {
                      console.log('[StoryViewer] Image loaded:', mediaUrl);
                      setMediaLoaded(true);
                    }}
                    onError={(e) => {
                      console.error('[StoryViewer] Image error:', e, mediaUrl);
                      setMediaLoaded(true);
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
            
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
                  <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 fill-red-500 drop-shadow-lg" />
                </motion.div>
              ))}
            </AnimatePresence>


            {/* Navigation hint areas */}
            <div className="absolute inset-y-0 left-0 w-1/3 z-20" />
            <div className="absolute inset-y-0 right-0 w-1/3 z-20" />
          </motion.div>

          {/* Individual story engagement badge */}
          <StoryEngagementBadge 
            likeCount={currentMedia?.likeCount || 0} 
            viewCount={currentMedia?.viewCount || 0} 
          />

          {/* Music display */}
          <MusicDisplay musicData={musicData} />

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

          {/* Livestream Comments Overlay - Inside story card */}
          <LivestreamComments 
            contentId={currentStory.id} 
            onPauseChange={(paused) => setIsPaused(paused)}
          />
        </div>
      </div>

      {/* Bottom Actions Bar - Transparent frameless */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-4 py-4 bg-gradient-to-t from-black/60 to-transparent">
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
                  className="w-6 h-6 border border-black/50"
                />
              ))
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/20" />
            )}
          </div>
          <span className="text-white/80 text-xs">Activity</span>
        </button>

        {/* Highlight */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("Highlight feature coming soon")}
        >
          <Heart className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white/90'}`} />
          <span className="text-white/80 text-xs">Highlight</span>
        </button>

        {/* Mention */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("Mention feature coming soon")}
        >
          <AtSign className="w-6 h-6 text-white/90" />
          <span className="text-white/80 text-xs">Mention</span>
        </button>

        {/* Send */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("Share feature coming soon")}
        >
          <Send className="w-6 h-6 text-white/90" />
          <span className="text-white/80 text-xs">Send</span>
        </button>

        {/* More */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => toast.info("More options coming soon")}
        >
          <MoreHorizontal className="w-6 h-6 text-white/90" />
          <span className="text-white/80 text-xs">More</span>
        </button>
      </div>

      {/* Swipe Up Indicator - Icon only */}
      {currentUserId === userId && !showViewersPanel && (
        <motion.div 
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <ChevronUp className="w-6 h-6 text-white/70" />
        </motion.div>
      )}

      {/* Viewers & Likers Panel - Instagram style bottom sheet */}
      <AnimatePresence>
        {showViewersPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-40"
              onClick={() => setShowViewersPanel(false)}
            />
            
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info: PanInfo) => {
                if (info.offset.y > 100) setShowViewersPanel(false);
              }}
              className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 max-h-[70vh] overflow-hidden"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Story Activity</h3>
                  <button 
                    onClick={() => setShowViewersPanel(false)}
                    className="p-1 hover:bg-muted rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {allViewers.length} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    {allLikers.length} likes
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <ScrollArea className="h-[calc(70vh-100px)]">
                {/* Likers Section */}
                {allLikers.length > 0 && (
                  <div className="px-4 py-3">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      Liked by
                    </h4>
                    <div className="space-y-3">
                      {allLikers.map((liker) => (
                        <div key={liker.id} className="flex items-center gap-3">
                          <OptimizedAvatar
                            src={liker.avatar_url}
                            alt={liker.full_name || "User"}
                            className="w-10 h-10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {liker.full_name || liker.username}
                            </p>
                            {liker.username && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{liker.username}
                              </p>
                            )}
                          </div>
                          <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Viewers Section */}
                <div className="px-4 py-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Viewers
                  </h4>
                  {allViewers.length > 0 ? (
                    <div className="space-y-3">
                      {allViewers.map((viewer) => (
                        <div key={viewer.id} className="flex items-center gap-3">
                          <OptimizedAvatar
                            src={viewer.avatar_url}
                            alt={viewer.full_name || "User"}
                            className="w-10 h-10"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {viewer.full_name || viewer.username}
                            </p>
                            {viewer.username && (
                              <p className="text-xs text-muted-foreground truncate">
                                @{viewer.username}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No viewers yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
