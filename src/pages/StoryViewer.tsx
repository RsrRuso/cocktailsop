import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart, Brain, BarChart3, Music2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useUnifiedEngagement } from "@/hooks/useUnifiedEngagement";
import { LivestreamComments } from "@/components/story/LivestreamComments";
import { StoryInsights } from "@/components/story/StoryInsights";
import OptimizedAvatar from "@/components/OptimizedAvatar";
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
  
  // Derived state - must come before functions that use them
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
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      if (seekIntervalRef.current) {
        clearInterval(seekIntervalRef.current);
      }
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
          .select("id, full_name, avatar_url, username")
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
          if (currentUserId) trackView(storiesData[0].id);
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
      return (trimEnd - trimStart) * 1000; // Convert to milliseconds
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
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
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
    
    // Set initial time to trim start
    audio.currentTime = musicData.trimStart || 0;
    audio.muted = isMuted;
    
    if (isPaused || showComments) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPaused, showComments, musicData, currentIndex, isMuted]);
  
  // Update mute state on audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = isMuted;
    }
  }, [isMuted]);
  
  // Handle music trim looping
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
      if (currentUserId) trackView(stories[currentIndex + 1].id);
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
      const id = heartCounterRef.current++;
      setFlyingHearts((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setFlyingHearts((prev) => prev.filter((h) => h.id !== id));
      }, 1000);
    }
  };

  // Touch handlers - Instagram style
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  };

  const handleTouchMove = () => {
    // Cancel long press if user moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Resume if was paused
    if (isPaused) {
      setIsPaused(false);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Detect swipe (fast movement) - more sensitive thresholds
    if (deltaTime < 300 && (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30)) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
      } else {
        // Vertical swipe
        if (deltaY < 0) {
          setShowComments(true);
        } else if (deltaY > 50) {
          navigate("/home");
        }
      }
      return;
    }

    // Detect tap
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const now = Date.now();
      
      // Double tap = like (clear any pending single tap timer)
      if (now - lastTapRef.current < 300) {
        // Clear single tap timer to prevent navigation
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        handleLike(touch.clientX, touch.clientY);
        lastTapRef.current = 0;
      } else {
        // Single tap = navigate (with delay to detect double tap)
        lastTapRef.current = now;
        singleTapTimerRef.current = setTimeout(() => {
          if (Date.now() - lastTapRef.current >= 300) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const isLeftSide = touch.clientX - rect.left < rect.width / 2;
              if (isLeftSide) {
                goToPrevious();
              } else {
                goToNext();
              }
            }
          }
        }, 300);
      }
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
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

    // Double click = like (clear any pending single click timer)
    if (now - lastTapRef.current < 300) {
      // Clear single click timer to prevent navigation
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      handleLike(e.clientX, e.clientY);
      lastTapRef.current = 0;
    } else {
      // Single click = navigate (with delay to detect double click)
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 300) {
          const isLeftSide = e.clientX - rect.left < rect.width / 2;
          if (isLeftSide) {
            goToPrevious();
          } else {
            goToNext();
          }
        }
      }, 300);
    }
  };

  if (!currentStory || !profile) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 safe-area-inset">
      {/* Progress bars - with safe area padding */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-[env(safe-area-inset-top,12px)] pb-1">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width:
                  idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header - improved mobile layout */}
      <div className="absolute top-[calc(env(safe-area-inset-top,12px)+16px)] left-0 right-0 z-30 flex items-center justify-between px-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.full_name || "User"}
            className="w-10 h-10 border-2 border-white/80 flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-white font-semibold text-sm truncate">
              {profile.full_name || profile.username || "User"}
            </span>
            <span className="text-white/60 text-xs">
              {(() => {
                const diff = Date.now() - new Date(currentStory.created_at).getTime();
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor(diff / 60000);
                return hours > 0 ? `${hours}h ago` : `${mins}m ago`;
              })()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Mute/Unmute button */}
          {musicData?.url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="p-2.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          )}
          
          {currentUserId === userId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInsights(true);
              }}
              className="p-2.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </button>
          )}
          <button
            onClick={() => navigate("/home")}
            className="p-2.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Music indicator */}
      {musicData?.url && (
        <div className="absolute top-[calc(env(safe-area-inset-top,12px)+70px)] left-3 right-3 z-30">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit max-w-[70%]">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
              <Music2 className="w-3 h-3 text-white" />
            </div>
            <span className="text-white text-xs font-medium truncate">
              {musicData.name || "Background Music"}
            </span>
          </div>
        </div>
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
        {/* Left tap zone - tap for previous, hold for rewind */}
        <div 
          className="absolute left-0 top-20 bottom-32 w-1/4 z-20 cursor-pointer flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            if (!isSeeking) goToPrevious();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsSeeking('rewind');
            setIsPaused(true);
            seekIntervalRef.current = setInterval(() => {
              setProgress(prev => Math.max(0, prev - 2));
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.1);
              }
            }, 50);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
            setIsSeeking(null);
            setIsPaused(false);
          }}
          onMouseLeave={() => {
            if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
            if (isSeeking) {
              setIsSeeking(null);
              setIsPaused(false);
            }
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setIsSeeking('rewind');
            setIsPaused(true);
            seekIntervalRef.current = setInterval(() => {
              setProgress(prev => Math.max(0, prev - 2));
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.1);
              }
            }, 50);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
            if (!isSeeking) goToPrevious();
            setIsSeeking(null);
            setIsPaused(false);
          }}
        >
          {isSeeking === 'rewind' && (
            <div className="text-white text-2xl font-bold animate-pulse">⏪</div>
          )}
        </div>
        
        {/* Right tap zone - tap for next, hold for fast-forward */}
        <div 
          className="absolute right-0 top-20 bottom-32 w-1/4 z-20 cursor-pointer flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            if (!isSeeking) goToNext();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsSeeking('forward');
            setIsPaused(true);
            seekIntervalRef.current = setInterval(() => {
              setProgress(prev => Math.min(100, prev + 2));
              if (videoRef.current) {
                videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 0.1);
              }
            }, 50);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
            setIsSeeking(null);
            setIsPaused(false);
          }}
          onMouseLeave={() => {
            if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
            if (isSeeking) {
              setIsSeeking(null);
              setIsPaused(false);
            }
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setIsSeeking('forward');
            setIsPaused(true);
            seekIntervalRef.current = setInterval(() => {
              setProgress(prev => Math.min(100, prev + 2));
              if (videoRef.current) {
                videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 0.1);
              }
            }, 50);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (seekIntervalRef.current) clearInterval(seekIntervalRef.current);
            if (!isSeeking) goToNext();
            setIsSeeking(null);
            setIsPaused(false);
          }}
        >
          {isSeeking === 'forward' && (
            <div className="text-white text-2xl font-bold animate-pulse">⏩</div>
          )}
        </div>

        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted={false}
          />
        ) : (
          <img src={mediaUrl} alt="Story" className="w-full h-full object-contain" />
        )}
        
        {/* Background music audio */}
        {musicData?.url && (
          <audio
            ref={audioRef}
            src={musicData.url}
            loop={false}
            preload="auto"
          />
        )}

        {/* Flying hearts */}
        {flyingHearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute pointer-events-none"
            style={{
              left: heart.x - 24,
              top: heart.y - 24,
              animation: "fly-up 1s ease-out forwards",
            }}
          >
            <Heart className="w-12 h-12 text-red-500 fill-red-500" />
          </div>
        ))}

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

      {/* Bottom actions - with safe area padding */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+70px)] left-0 right-0 z-30 px-4 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike(e.clientX, e.clientY);
          }}
          className="flex items-center gap-2 p-3 bg-black/30 backdrop-blur-sm hover:bg-white/10 active:bg-white/20 rounded-full transition-all"
        >
          <Heart
            className={`w-7 h-7 transition-all duration-200 ${
              isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"
            }`}
          />
          {currentStory.like_count > 0 && (
            <span className="text-white font-semibold text-sm">
              {currentStory.like_count}
            </span>
          )}
        </button>
        
        {/* Story duration indicator */}
        {musicData && (
          <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-white/80 text-xs font-medium">
              {Math.round((musicData.trimEnd || 45) - (musicData.trimStart || 0))}s
            </span>
          </div>
        )}
      </div>

      {/* Always-visible livestream comments */}
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

      <style>{`
        @keyframes fly-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 1;
            transform: translateY(-50px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.5);
          }
        }
        .safe-area-inset {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      `}</style>
    </div>
  );
}
