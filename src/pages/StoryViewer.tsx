import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, MoreVertical, Heart } from "lucide-react";
import { toast } from "sonner";
import { useUnifiedEngagement } from "@/hooks/useUnifiedEngagement";
import UnifiedCommentsDialog from "@/components/unified/UnifiedCommentsDialog";
import OptimizedAvatar from "@/components/OptimizedAvatar";

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
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartCounter = useRef(0);
  const lastTapTime = useRef(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const { likedItems, toggleLike } = useUnifiedEngagement("story", currentUserId);

  const currentStory = stories[currentIndex];
  const isLiked = currentStory ? likedItems.has(currentStory.id) : false;
  
  // Get first media item for current story
  const mediaUrl = currentStory?.media_urls?.[0] || "";
  const mediaType = currentStory?.media_types?.[0] || "";

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
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .eq("id", userId)
          .single();

        if (profileData) setProfile(profileData);

        // Fetch stories
        const { data: storiesData } = await supabase
          .from("stories")
          .select("*")
          .eq("user_id", userId)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true });

        if (storiesData && storiesData.length > 0) {
          setStories(storiesData);
          
          // Track view for first story
          if (currentUserId && storiesData[0]) {
            trackView(storiesData[0].id);
          }
        } else {
          toast.error("No active stories found");
          navigate("/home");
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
        toast.error("Failed to load stories");
        navigate("/home");
      }
    };

    fetchData();
  }, [userId, currentUserId, navigate]);

  // Track story view
  const trackView = async (storyId: string) => {
    if (!currentUserId) return;

    try {
      // Check if already viewed
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

        // Update view count
        await supabase
          .from("stories")
          .update({ view_count: (currentStory?.view_count || 0) + 1 })
          .eq("id", storyId);
      }
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  // Progress bar management
  useEffect(() => {
    if (!currentStory) return;

    setProgress(0);
    const duration = mediaType.startsWith("video") ? 15000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [currentIndex, stories]);

  // Video progress sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaType.startsWith("video")) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", updateProgress);
    return () => video.removeEventListener("timeupdate", updateProgress);
  }, [currentStory]);

  // Navigation functions
  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      trackView(stories[currentIndex + 1].id);
    } else {
      navigate("/home");
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      navigate("/home");
    }
  };

  // Like handler with heart animation
  const handleLike = async (x: number, y: number) => {
    if (!currentStory || !currentUserId) return;

    const wasLiked = isLiked;
    await toggleLike(currentStory.id);

    // Show heart animation only when liking (not unliking)
    if (!wasLiked) {
      const heartId = heartCounter.current++;
      setFlyingHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setFlyingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 1000);
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Swipe detection (minimum 50px movement)
    if (Math.abs(diffX) > 50 || Math.abs(diffY) > 50) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
          goToNext(); // Swipe left
        } else {
          goToPrevious(); // Swipe right
        }
      } else {
        // Vertical swipe
        if (diffY > 0) {
          setShowComments(true); // Swipe up
        } else {
          navigate("/home"); // Swipe down
        }
      }
      return;
    }

    // Double tap detection
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      handleLike(touchEndX, touchEndY);
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  };

  // Click handler for desktop
  const handleClick = (e: React.MouseEvent) => {
    // Only on desktop (not touch devices)
    if ('ontouchstart' in window) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftSide = clickX < rect.width / 2;

    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      // Double click
      handleLike(e.clientX, e.clientY);
      lastTapTime.current = 0;
    } else {
      // Single click navigation
      lastTapTime.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapTime.current >= 300) {
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
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 mt-4">
        <div className="flex items-center gap-2">
          <OptimizedAvatar
            src={profile.avatar_url}
            alt={profile.full_name || "User"}
            className="w-8 h-8"
          />
          <span className="text-white font-medium text-sm">
            {profile.full_name || profile.username || "User"}
          </span>
          <span className="text-white/70 text-xs">
            {new Date(currentStory.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowComments(true)}>
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => navigate("/home")}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Media content with click/touch handlers */}
      <div
        className="flex-1 flex items-center justify-center relative"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mediaType.startsWith("video") ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            onEnded={goToNext}
          />
        ) : (
          <img
            src={mediaUrl}
            alt="Story"
            className="w-full h-full object-contain"
          />
        )}

        {/* Flying hearts animation */}
        {flyingHearts.map((heart) => (
          <Heart
            key={heart.id}
            className="absolute text-red-500 fill-red-500 pointer-events-none animate-ping"
            style={{
              left: heart.x,
              top: heart.y,
              fontSize: "48px",
              animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) forwards",
            }}
          />
        ))}
      </div>

      {/* Text overlays */}
      {currentStory.text_overlays && Array.isArray(currentStory.text_overlays) && (
        <div className="absolute bottom-20 left-0 right-0 px-4 z-10">
          {currentStory.text_overlays.map((text: any, idx: number) => (
            <p key={idx} className="text-white text-sm mb-2">{text.text}</p>
          ))}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentStory) handleLike(e.clientX, e.clientY);
          }}
          className="flex items-center gap-2"
        >
          <Heart
            className={`w-6 h-6 transition-colors ${
              isLiked ? "fill-red-500 text-red-500" : "text-white"
            }`}
          />
          <span className="text-white text-sm">{currentStory.like_count || 0}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(true);
          }}
          className="text-white text-sm"
        >
          View Comments
        </button>
      </div>

      {/* Comments dialog */}
      {showComments && currentStory && (
        <UnifiedCommentsDialog
          contentId={currentStory.id}
          contentType="story"
          open={showComments}
          onOpenChange={setShowComments}
        />
      )}
    </div>
  );
}
