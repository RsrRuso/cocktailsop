import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Heart, Brain, BarChart3 } from "lucide-react";
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

  const currentStory = stories[currentIndex];
  const isLiked = currentStory ? likedItems.has(currentStory.id) : false;
  const mediaUrl = currentStory?.media_urls?.[0] || "";
  const mediaType = currentStory?.media_types?.[0] || "";
  const isVideo = mediaType.startsWith("video");

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
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

  // Auto-progress timer
  useEffect(() => {
    if (!currentStory || isPaused || showComments) return;

    const duration = isVideo ? 15000 : 5000;
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
  }, [currentIndex, isPaused, showComments, stories]);

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
    
    if (isPaused || showComments) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPaused, showComments, musicData, currentIndex]);
  
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
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-30 flex items-center justify-between px-4 mt-3">
        <div className="flex items-center gap-2">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.full_name || "User"}
            className="w-8 h-8 border-2 border-white"
          />
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">
              {profile.full_name || profile.username || "User"}
            </span>
            <span className="text-white/70 text-xs">
              {(() => {
                const diff = Date.now() - new Date(currentStory.created_at).getTime();
                const hours = Math.floor(diff / 3600000);
                const mins = Math.floor(diff / 60000);
                return hours > 0 ? `${hours}h` : `${mins}m`;
              })()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUserId === userId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInsights(true);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </button>
          )}
          <button
            onClick={() => navigate("/home")}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

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

      {/* Bottom actions */}
      <div className="absolute bottom-6 left-0 right-0 z-30 px-4 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike(e.clientX, e.clientY);
          }}
          className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <Heart
            className={`w-7 h-7 transition-all ${
              isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"
            }`}
          />
          {currentStory.like_count > 0 && (
            <span className="text-white font-semibold text-sm">
              {currentStory.like_count}
            </span>
          )}
        </button>
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
      `}</style>
    </div>
  );
}
