import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Story {
  id: string;
  user_id: string;
  media_urls: string[];
  media_types: string[];
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const StoryViewer = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchStories();
  }, [userId]);

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
    const { data, error } = await supabase
      .from("stories")
      .select(`
        *,
        profiles (username, avatar_url)
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

    setStories(data as Story[]);
    setLoading(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff < -100) {
      navigate(-1);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
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
          {currentStory.profiles.avatar_url && (
            <img
              src={currentStory.profiles.avatar_url}
              alt={currentStory.profiles.username}
              className="w-10 h-10 rounded-full border-2 border-white"
            />
          )}
          <span className="text-white font-semibold">{currentStory.profiles.username}</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Media content */}
      <div className="w-full h-full flex items-center justify-center">
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
      </div>

      {/* Navigation buttons */}
      {currentMediaIndex > 0 && (
        <button
          onClick={goToPreviousMedia}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {(currentMediaIndex < totalMedia - 1 || currentStoryIndex < stories.length - 1) && (
        <button
          onClick={goToNextMedia}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center z-10"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Tap zones for navigation */}
      <div className="absolute inset-0 flex">
        <div className="w-1/3 h-full" onClick={goToPreviousMedia} />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" onClick={goToNextMedia} />
      </div>
    </div>
  );
};

export default StoryViewer;
