import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";
import { useUnifiedEngagement } from "@/hooks/useUnifiedEngagement";
import { X, ChevronLeft, ChevronRight, Heart, Eye, Trash2, MoreVertical, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StoryViewersDialog from "@/components/StoryViewersDialog";
import StoryLikesDialog from "@/components/StoryLikesDialog";
import StoryCommentsDialog from "@/components/StoryCommentsDialog";
import BirthdayFireworks from "@/components/BirthdayFireworks";

interface Story {
  id: string;
  user_id: string;
  media_urls: string[];
  media_types: string[];
  created_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
    date_of_birth?: string | null;
  };
}

interface FloatingHeart {
  id: number;
  x: number;
}

const StoryViewer = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [showViewersDialog, setShowViewersDialog] = useState(false);
  const [showLikesDialog, setShowLikesDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);

  const { likedItems, toggleLike } = useUnifiedEngagement('story', currentUserId || undefined);
  useEffect(() => {
    setIsPaused(showViewersDialog || showLikesDialog || showCommentsDialog);
  }, [showViewersDialog, showLikesDialog, showCommentsDialog]);
  const [lastTap, setLastTap] = useState(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartIdCounter = useRef(0);
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0 && currentUserId) {
      trackView();
    }
  }, [currentStoryIndex, stories.length, currentUserId]);

  // Separate subscription effect - only depends on story ID
  useEffect(() => {
    const storyId = stories[currentStoryIndex]?.id;
    if (!storyId) return;

    const channel = supabase
      .channel(`story-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${storyId}`
        },
        (payload) => {
          const newStory = payload.new as Story;
          setStories(prev => prev.map((s, i) => 
            i === currentStoryIndex 
              ? { ...s, like_count: newStory.like_count, comment_count: newStory.comment_count, view_count: newStory.view_count }
              : s
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stories[currentStoryIndex]?.id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  // Check if it's someone's birthday
  const isBirthday = (dateOfBirth: string | null | undefined) => {
    if (!dateOfBirth) return false;
    const today = new Date();
    const birthday = new Date(dateOfBirth);
    
    // Use UTC to avoid timezone issues
    const todayMonth = today.getUTCMonth();
    const todayDate = today.getUTCDate();
    const birthdayMonth = birthday.getUTCMonth();
    const birthdayDate = birthday.getUTCDate();
    
    return birthdayMonth === todayMonth && birthdayDate === todayDate;
  };

  const trackView = async () => {
    if (!currentUserId || !stories[currentStoryIndex]) return;
    
    const { error } = await supabase
      .from("story_views")
      .upsert({
        story_id: stories[currentStoryIndex].id,
        user_id: currentUserId,
      }, {
        onConflict: 'story_id,user_id',
        ignoreDuplicates: true
      });
    
    if (error) console.error("Error tracking view:", error);
  };

  
  const handleLike = () => {
    if (!currentUserId || !stories[currentStoryIndex]) {
      toast.error("Please login to like stories");
      return;
    }

    const storyId = stories[currentStoryIndex].id;
    const isCurrentlyLiked = likedItems.has(storyId);

    // Spawn heart only when changing from unliked to liked
    if (!isCurrentlyLiked) {
      addFloatingHeart();
    }

    // Use unified engagement system for reliable, idempotent likes
    toggleLike(storyId);
  };

  const handleDoubleTap = () => {
    const currentStory = stories[currentStoryIndex];
    if (!currentStory || currentStory.user_id === currentUserId) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Always spawn a flying heart for every double-tap
      addFloatingHeart();
      // Like the story if not already liked
      if (!isLiked) {
        handleLike();
      }
    }
    setLastTap(now);
  };

  const addFloatingHeart = () => {
    const id = heartIdCounter.current++;
    const x = Math.random() * 80 + 10; // Random position between 10% and 90%
    setFloatingHearts(prev => [...prev, { id, x }]);
    
    // Remove heart after animation
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(heart => heart.id !== id));
    }, 3000);
  };

  const handleDeleteStory = async () => {
    if (!stories[currentStoryIndex]) return;
    
    const story = stories[currentStoryIndex];
    
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", story.id);

    if (error) {
      toast.error("Failed to delete story");
      return;
    }

    // Delete media files from storage
    if (story.media_urls) {
      const filePaths = story.media_urls.map((url: string) => {
        const urlParts = url.split('/stories/');
        return urlParts[1];
      }).filter(Boolean);

      if (filePaths.length > 0) {
        await supabase.storage
          .from('stories')
          .remove(filePaths);
      }
    }

    toast.success("Story deleted");
    
    // Navigate to next story or go back
    if (stories.length > 1) {
      const updatedStories = stories.filter((_, index) => index !== currentStoryIndex);
      setStories(updatedStories);
      if (currentStoryIndex >= updatedStories.length) {
        setCurrentStoryIndex(Math.max(0, updatedStories.length - 1));
      }
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    // Reset progress when media changes
    setProgress(0);
    
    const currentStory = stories[currentStoryIndex];
    if (!currentStory || isPaused) return;

    const currentMediaType = currentStory.media_types?.[currentMediaIndex] || 'image';
    
    if (currentMediaType.startsWith('image')) {
      // For images: progress animation over 5 seconds
      const duration = 5000;
      const interval = 50; // Update every 50ms for smooth animation
      const increment = (interval / duration) * 100;
      
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + increment;
          if (newProgress >= 100) {
            goToNextMedia();
            return 100;
          }
          return newProgress;
        });
      }, interval);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
      }
    };
  }, [currentStoryIndex, currentMediaIndex, stories, isPaused]);

  useEffect(() => {
    // Preload next media
    const currentStory = stories[currentStoryIndex];
    if (!currentStory) return;

    const nextMediaIndex = currentMediaIndex + 1;
    if (nextMediaIndex < currentStory.media_urls.length) {
      const nextUrl = currentStory.media_urls[nextMediaIndex];
      const nextType = currentStory.media_types?.[nextMediaIndex];
      
      if (nextType?.startsWith('image')) {
        const img = new Image();
        img.src = nextUrl;
      } else if (nextType?.startsWith('video')) {
        const video = document.createElement('video');
        video.src = nextUrl;
        video.preload = 'auto';
      }
    }
  }, [currentStoryIndex, currentMediaIndex, stories]);

  const fetchStories = async () => {
    // Check cache first
    const cached = queryClient.getQueryData(['stories', userId]);
    if (cached) {
      setStories(cached as Story[]);
      return;
    }

    const { data, error } = await supabase
      .from("stories")
      .select(`
        *,
        profiles (username, avatar_url, date_of_birth)
      `)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load stories");
      navigate(-1);
      return;
    }

    if (!data || data.length === 0) {
      toast.info("No stories available");
      navigate(-1);
      return;
    }

    const storiesData = data as Story[];
    
    // Cache the stories
    queryClient.setQueryData(['stories', userId], storiesData);
    
    // Only preload first story's media for instant display
    if (storiesData[0]) {
      storiesData[0].media_urls.forEach((url, index) => {
        const mediaType = storiesData[0].media_types?.[index];
        if (!mediaType || mediaType.startsWith('image')) {
          const img = new Image();
          img.src = url;
        }
      });
    }

    setStories(storiesData);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - touchEndY;
    const diffX = touchStartX.current - touchEndX;
    const swipeThreshold = 100;
    const tapThreshold = 10; // Movement threshold to detect if it's a tap

    // Check if it's a tap (minimal movement)
    const isTap = Math.abs(diffY) < tapThreshold && Math.abs(diffX) < tapThreshold;

    // Swipe up - open comments
    if (diffY > swipeThreshold && Math.abs(diffX) < swipeThreshold) {
      setShowCommentsDialog(true);
      return;
    }

    // Swipe down - close story
    if (diffY < -swipeThreshold && Math.abs(diffX) < swipeThreshold) {
      navigate(-1);
      return;
    }

    // Swipe left - next story/media
    if (diffX > swipeThreshold && Math.abs(diffY) < swipeThreshold) {
      goToNextMedia();
      return;
    }

    // Swipe right - previous story/media
    if (diffX < -swipeThreshold && Math.abs(diffY) < swipeThreshold) {
      goToPreviousMedia();
      return;
    }

    // If it's a tap, check for double-tap
    if (isTap) {
      handleDoubleTap();
    }
  };

  const goToNextMedia = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setProgress(0);

    const currentStory = stories[currentStoryIndex];
    if (currentMediaIndex < currentStory.media_urls.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    } else if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setCurrentMediaIndex(0);
    } else {
      navigate(-1);
    }
  };

  const goToPreviousMedia = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    setProgress(0);

    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    } else if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      const prevStory = stories[currentStoryIndex - 1];
      setCurrentMediaIndex(prevStory.media_urls.length - 1);
    }
  };

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        setProgress((currentTime / duration) * 100);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only enable click navigation on non-touch devices (desktop preview)
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const clientX = e.clientX;

    // Detect double-click to trigger like without navigation
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (clickTimeoutRef.current !== null) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      handleDoubleTap();
      setLastTap(0);
      return;
    }

    setLastTap(now);

    if (clickTimeoutRef.current !== null) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const isLeftSide = clickX < rect.width / 2;

      if (isLeftSide) {
        goToPreviousMedia();
      } else {
        goToNextMedia();
      }
    }, DOUBLE_TAP_DELAY + 10);
  };

  if (stories.length === 0) {
    return null;
  }

  const currentStory = stories[currentStoryIndex];
  
  // Safety checks for arrays
  if (!currentStory || !currentStory.media_urls || currentStory.media_urls.length === 0) {
    navigate(-1);
    return null;
  }

  const currentMediaUrl = currentStory.media_urls[currentMediaIndex] || currentStory.media_urls[0];
  const currentMediaType = (currentStory.media_types && currentStory.media_types[currentMediaIndex]) 
    || currentStory.media_types?.[0] 
    || 'image';
  const totalMedia = currentStory.media_urls.length;
  const isLiked = likedItems.has(currentStory.id);
  const isOwnStory = currentStory.user_id === currentUserId;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {currentStory.media_urls.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index === currentMediaIndex 
                  ? `${progress}%` 
                  : index < currentMediaIndex 
                    ? '100%' 
                    : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 mt-6">
        <div className="flex items-center gap-3">
          <BirthdayFireworks isBirthday={isBirthday(currentStory.profiles?.date_of_birth)}>
            {currentStory.profiles?.avatar_url && isBirthday(currentStory.profiles.date_of_birth) ? (
              // Birthday avatar with celebration ring
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 opacity-75 blur animate-pulse"></div>
                <div className="relative rounded-full bg-gradient-to-br from-yellow-300 via-pink-400 to-purple-500 p-0.5 shadow-xl shadow-pink-500/50">
                  <img
                    src={currentStory.profiles.avatar_url}
                    alt={currentStory.profiles.username}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                {/* Birthday badge */}
                <div className="absolute -top-1 -right-1 text-lg animate-bounce">🎂</div>
              </div>
            ) : currentStory.profiles?.avatar_url ? (
              // Regular avatar
              <img
                src={currentStory.profiles.avatar_url}
                alt={currentStory.profiles.username}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            ) : null}
          </BirthdayFireworks>
          <span className="text-white font-normal text-sm">{currentStory.profiles?.username || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOwnStory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <MoreVertical className="w-5 h-5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowViewersDialog(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Views ({currentStory.view_count})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowLikesDialog(true)}>
                  <Heart className="w-4 h-4 mr-2" />
                  Likes ({currentStory.like_count})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCommentsDialog(true)}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Comments ({currentStory.comment_count})
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeleteStory}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Story
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Media content */}
      <div 
        className="w-full h-full flex items-center justify-center relative"
        onClick={handleClick}
      >
        {currentMediaType.startsWith("video") ? (
          <video
            ref={videoRef}
            key={currentMediaUrl}
            src={currentMediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            playsInline
            onEnded={goToNextMedia}
            onTimeUpdate={handleVideoProgress}
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
          />
        ) : (
          <img 
            key={currentMediaUrl}
            src={currentMediaUrl} 
            alt="Story" 
            className="max-w-full max-h-full object-contain" 
            loading="eager"
          />
        )}
        
        {/* Swipe hint text */}
        <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none">
          <p className="text-white/40 text-xs animate-pulse">
            Double tap to like • Swipe up to comment
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      {currentMediaIndex > 0 && (
        <button
          onClick={goToPreviousMedia}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center z-20"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {(currentMediaIndex < totalMedia - 1 || currentStoryIndex < stories.length - 1) && (
        <button
          onClick={goToNextMedia}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center z-20"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Bottom actions */}
      {!isOwnStory && (
        <div className="absolute bottom-6 left-0 right-0 px-4 z-20">
          <div className="flex items-center gap-2">
            {/* Like Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="w-12 h-12 rounded-full bg-transparent hover:bg-white/10 z-20"
            >
              <Heart
                className={`w-7 h-7 transition-all ${
                  isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'
                }`}
              />
            </Button>
            
            {/* Comment Button with count */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowCommentsDialog(true);
              }}
              className="w-12 h-12 rounded-full bg-transparent hover:bg-white/10 relative z-20"
            >
              <MessageCircle className="w-7 h-7 text-white" />
              {currentStory.comment_count > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {currentStory.comment_count}
                </span>
              )}
            </Button>
          </div>
          
          {/* Like count display */}
          {currentStory.like_count > 0 && (
            <div className="mt-2 ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isOwnStory && setShowLikesDialog(true);
                }}
                className="text-white font-semibold text-sm hover:opacity-70 transition-opacity"
              >
                {currentStory.like_count} {currentStory.like_count === 1 ? 'like' : 'likes'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating hearts animation */}
      <div className="absolute bottom-24 left-0 right-0 pointer-events-none z-30">
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute animate-float-up"
            style={{
              left: `${heart.x}%`,
              animationDuration: '3s',
            }}
          >
            <Heart className="w-8 h-8 fill-red-500 text-red-500 opacity-90" />
          </div>
        ))}
      </div>


      {/* Dialogs - Always render but control with open state */}
      <StoryViewersDialog
        open={showViewersDialog}
        onOpenChange={setShowViewersDialog}
        storyId={currentStory.id}
      />
      <StoryLikesDialog
        open={showLikesDialog}
        onOpenChange={setShowLikesDialog}
        storyId={currentStory.id}
      />
      <StoryCommentsDialog
        open={showCommentsDialog}
        onOpenChange={setShowCommentsDialog}
        storyId={currentStory.id}
      />
    </div>
  );
};

export default StoryViewer;
