import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart, Brain, Volume2, VolumeX, Send, AtSign, MoreHorizontal, BadgeCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useUnifiedEngagement } from "@/hooks/useUnifiedEngagement";
import { LivestreamComments } from "@/components/story/LivestreamComments";
import { StoryInsights } from "@/components/story/StoryInsights";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [recentViewers, setRecentViewers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(true); // Always true for instant display
  
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
    if (!musicData?.url) return null;
    return musicData;
  }, [currentMedia?.musicData]);
  
  const musicData = getMusicData();

  const { likedItems, toggleLike } = useUnifiedEngagement("story", currentUserId);
  const isLiked = currentStory ? likedItems.has(currentStory.id) : false;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
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

  // USE REACT QUERY FOR INSTANT CACHED DATA
  const { data: storiesData } = useQuery({
    queryKey: ['stories', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, media_urls, media_types, created_at, expires_at, view_count, like_count, comment_count, music_data, text_overlays, trim_data, filters")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username, professional_title")
        .eq("id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Preload media helper
  const preloadMedia = useCallback((url: string, type: string) => {
    if (type.startsWith("video")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
    } else {
      const img = new Image();
      img.src = url;
    }
  }, []);

  // Fetch recent viewers
  const fetchRecentViewers = useCallback(async (storyId: string) => {
    const { data } = await supabase
      .from("story_views")
      .select("user_id, profiles!inner(id, avatar_url, full_name)")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false })
      .limit(3);
    
    if (data) {
      setRecentViewers(data.map((v: any) => v.profiles));
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

  // Sync query data to state INSTANTLY
  useEffect(() => {
    if (profileData) setProfile(profileData);
  }, [profileData]);

  useEffect(() => {
    if (storiesData && storiesData.length > 0) {
      setStories(storiesData);
      setIsLoading(false);
      
      // Track view in background (non-blocking)
      if (currentUserId && storiesData[0]) {
        trackView(storiesData[0].id);
        fetchRecentViewers(storiesData[0].id);
      }
    } else if (storiesData && storiesData.length === 0) {
      toast.error("No active stories");
      navigate("/home");
    }
  }, [storiesData, currentUserId, navigate, trackView, fetchRecentViewers]);

  // Preload next media
  useEffect(() => {
    if (allMediaItems.length > currentMediaIndex + 1) {
      const nextMedia = allMediaItems[currentMediaIndex + 1];
      if (nextMedia?.url) {
        preloadMedia(nextMedia.url, nextMedia.type || "image");
      }
    }
  }, [currentMediaIndex, allMediaItems, preloadMedia]);

  // Calculate story duration
  const getStoryDuration = useCallback(() => {
    if (musicData) {
      const trimStart = musicData.trimStart || 0;
      const trimEnd = musicData.trimEnd || 45;
      return (trimEnd - trimStart) * 1000;
    }
    return isVideo ? 15000 : 5000;
  }, [musicData, isVideo]);

  // Auto-progress timer - INSTANT, no media loading check
  useEffect(() => {
    if (!currentStory || isPaused || showComments) return;

    const duration = getStoryDuration();
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Navigate to next inline instead of calling goToNext
          setCurrentMediaIndex(idx => {
            if (idx < totalMediaCount - 1) {
              return idx + 1;
            } else {
              navigate("/home");
              return idx;
            }
          });
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentMediaIndex, isPaused, showComments, currentStory, getStoryDuration, totalMediaCount, navigate]);

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

  // No longer reset media loaded - keep instant transitions

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

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    longPressTimerRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
  }, [isPaused, goToPrevious, goToNext, showComments, navigate, handleLike]);

  const handleMouseDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => setIsPaused(true), 200);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
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
  }, [isPaused, goToPrevious, goToNext, handleLike]);

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
      {/* Top Header - Mobile optimized */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-black shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.full_name || "User"}
            className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-primary shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-white font-semibold text-xs sm:text-sm truncate">
                {currentUserId === userId ? "Your story" : profile.full_name || profile.username}
              </span>
              <BadgeCheck className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary shrink-0" />
              <span className="text-white/50 text-xs sm:text-sm shrink-0">{getTimeAgo()}</span>
            </div>
            <span className="text-primary text-[10px] sm:text-xs flex items-center gap-1">
              <span>🎬</span> Watch full reel &gt;
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/home")}
          className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
      </div>

      {/* Story Container - Fullscreen */}
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <div className="w-full h-full relative overflow-hidden">
          {/* Progress bars */}
          <ProgressBars totalItems={totalMediaCount} currentIndex={currentMediaIndex} progress={progress} />

          {/* User info overlay */}
          <div className="absolute top-5 sm:top-6 left-2 right-2 sm:left-3 sm:right-3 z-30 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <OptimizedAvatar
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="w-7 h-7 sm:w-8 sm:h-8 border border-white/50 shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-xs sm:text-sm drop-shadow-lg truncate">
                    {profile.username || profile.full_name}
                  </span>
                  <span className="bg-primary/90 text-primary-foreground text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded font-semibold shrink-0">
                    P
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-primary text-[10px] sm:text-xs drop-shadow-lg truncate">
                    {profile.professional_title || "founder of specverse"}
                  </span>
                  <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary shrink-0" />
                  <span className="text-white/70 text-[8px] sm:text-[10px] shrink-0">AI</span>
                </div>
              </div>
            </div>
            <button className="p-1 sm:p-1.5 hover:bg-white/10 rounded-full shrink-0">
              <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>

          {/* Mute button */}
          {(musicData?.url || isVideo) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="absolute top-5 sm:top-6 right-2 sm:right-3 z-30 p-1.5 sm:p-2 bg-black/50 backdrop-blur-sm rounded-full"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
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
            {/* Loading skeleton while media loads */}
            {!mediaLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
              </div>
            )}
            
            {isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={isMuted}
                preload="auto"
                onLoadedData={() => setMediaLoaded(true)}
              />
            ) : (
              <img 
                src={mediaUrl} 
                alt="Story" 
                className="w-full h-full object-cover"
                loading="eager"
                onLoad={() => setMediaLoaded(true)}
              />
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
                  <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 fill-red-500 drop-shadow-lg" />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Paused indicator */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex gap-2">
                  <div className="w-1 h-10 sm:h-12 bg-white/80 rounded-full" />
                  <div className="w-1 h-10 sm:h-12 bg-white/80 rounded-full" />
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
