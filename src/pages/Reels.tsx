import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Music, ArrowLeft, WifiOff } from "lucide-react";

import { toast } from "sonner";
import CommentsDialog from "@/components/CommentsDialog";
import ShareDialog from "@/components/ShareDialog";
import LikesDialog from "@/components/LikesDialog";
import { useAuth } from "@/contexts/AuthContext";
import { ReelItemWrapper } from "@/components/ReelItemWrapper";
import { preloadReelVideos, getConnectionQuality } from "@/lib/mediaPreloader";
import { preloadFeedAvatars } from "@/lib/avatarCache";
import { useEngagement } from "@/hooks/useEngagement";

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  created_at: string;
  music_url: string | null;
  music_track_id: string | null;
  mute_original_audio: boolean | null;
  is_image_reel?: boolean | null;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
    badge_level: string;
  };
  music_tracks?: {
    title: string;
    preview_url: string | null;
    original_url: string | null;
    profiles?: {
      username: string;
    } | null;
  } | null;
}

// LocalStorage cache for instant cold starts
const REELS_CACHE_KEY = 'reels_cache_v1';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const loadCachedReels = (): Reel[] => {
  try {
    const cached = localStorage.getItem(REELS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch {}
  return [];
};

const saveCachedReels = (reels: Reel[]) => {
  try {
    localStorage.setItem(REELS_CACHE_KEY, JSON.stringify({
      data: reels.slice(0, 20), // Cache first 20 reels
      timestamp: Date.now()
    }));
  } catch {}
};

const Reels = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const initialState = location.state as {
    scrollToReelId?: string;
    reelData?: any;
  } | null;
  const hasTargetReel = !!(initialState?.scrollToReelId || initialState?.reelData);

  // INSTANT: Load from cache immediately
  const cachedReels = useMemo(() => loadCachedReels(), []);
  const [reels, setReels] = useState<Reel[]>(() => {
    if (initialState?.reelData) return [initialState.reelData];
    return cachedReels;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState("");
  const [selectedReelCaption, setSelectedReelCaption] = useState("");
  const [selectedReelVideo, setSelectedReelVideo] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [showLikes, setShowLikes] = useState(false);
  const [selectedReelForLikes, setSelectedReelForLikes] = useState("");
  const [targetReelId, setTargetReelId] = useState<string | null>(() => initialState?.scrollToReelId ?? null);
  // INSTANT: No loading if we have cached data
  const [isLoading, setIsLoading] = useState(() => cachedReels.length === 0 && Boolean(user) && !initialState?.reelData);
  const [connectionQuality, setConnectionQuality] = useState<'fast' | 'slow' | 'offline'>(() => getConnectionQuality());

  // Optimistic like count updater
  const handleLikeCountChange = useCallback((reelId: string, type: 'like' | 'save' | 'repost', delta: number) => {
    if (type === 'like') {
      setReels(prev => prev.map(r => 
        r.id === reelId ? { ...r, like_count: Math.max(0, (r.like_count || 0) + delta) } : r
      ));
    }
  }, []);

  // Use centralized useEngagement hook for consistent like/unlike behavior
  const reelEngagement = useEngagement('reel', user?.id, handleLikeCountChange);

  useEffect(() => {
    if (user) {
      fetchReels();
      reelEngagement.fetchEngagement();
    } else {
      setIsLoading(false);
    }

    const reelsChannel = supabase
      .channel('reels-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => fetchReels())
      .subscribe();

    return () => {
      supabase.removeChannel(reelsChannel);
    };
  }, [user]);

  // Navigate to specific reel if coming from profile or notification
  useEffect(() => {
    const state = location.state as { scrollToReelId?: string; reelData?: any };
    if (state?.scrollToReelId && !targetReelId) {
      setTargetReelId(state.scrollToReelId);
      if (state.reelData) {
        setReels([state.reelData]);
        setCurrentIndex(0);
        setIsLoading(false);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, targetReelId, navigate, location.pathname]);

  // Scroll to target reel when all reels are loaded
  useEffect(() => {
    if (targetReelId && reels.length > 0) {
      const reelIndex = reels.findIndex(r => r.id === targetReelId);
      if (reelIndex !== -1) {
        setCurrentIndex(reelIndex);
        requestAnimationFrame(() => {
          const container = document.querySelector('.snap-y') as HTMLElement;
          if (container) {
            container.scrollTop = reelIndex * window.innerHeight;
          }
        });
        setTargetReelId(null);
      }
    }
  }, [reels, targetReelId]);

  // Monitor connection quality
  useEffect(() => {
    const updateConnection = () => setConnectionQuality(getConnectionQuality());
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    const conn = (navigator as any).connection;
    conn?.addEventListener?.('change', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      conn?.removeEventListener?.('change', updateConnection);
    };
  }, []);

  // Preload videos when reels change or index changes
  useEffect(() => {
    if (reels.length > 0 && connectionQuality !== 'offline') {
      preloadReelVideos(reels, currentIndex);
      // Also preload avatars
      preloadFeedAvatars(reels);
    }
  }, [reels, currentIndex, connectionQuality]);

  const fetchReels = async () => {
    // If offline, use cached data
    if (!navigator.onLine) {
      setIsLoading(false);
      return;
    }

    // Only show loading if no cached data
    if (reels.length === 0) setIsLoading(true);
    
    const { data, error } = await supabase
      .from("reels")
      .select(`
        id, user_id, video_url, caption, like_count, comment_count, view_count, created_at,
        music_url, music_track_id, mute_original_audio, is_image_reel,
        music_tracks:music_track_id(title, preview_url, original_url, profiles:uploaded_by(username))
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) {
      setIsLoading(false);
      return;
    }

    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, badge_level')
      .in('id', userIds);

    const reelsWithProfiles = data.map(reel => ({
      ...reel,
      profiles: profiles?.find(p => p.id === reel.user_id) || null
    }));

    let finalReels: any[] = reelsWithProfiles;
    const missingMusicUrls = Array.from(
      new Set(
        reelsWithProfiles
          .filter(r => !r.music_tracks && r.music_url)
          .map(r => r.music_url)
      )
    ) as string[];

    if (missingMusicUrls.length > 0) {
      const { data: tracks } = await supabase
        .from('music_tracks')
        .select('title, artist, preview_url, original_url, profiles:uploaded_by(username)')
        .in('original_url', missingMusicUrls);

      const byUrl = new Map((tracks || []).map((t: any) => [t.original_url, t]));

      finalReels = reelsWithProfiles.map((r: any) => {
        if (r.music_tracks) return r;
        if (!r.music_url) return r;
        const found = byUrl.get(r.music_url);
        return found ? { ...r, music_tracks: found } : r;
      });
    }

    setReels(finalReels as any);
    // Cache for instant next load
    saveCachedReels(finalReels);
    // Preload videos immediately
    preloadReelVideos(finalReels, 0);
    preloadFeedAvatars(finalReels);
    setIsLoading(false);
  };

  const handleLikeReel = useCallback((reelId: string) => {
    reelEngagement.toggleLike(reelId);
  }, [reelEngagement]);

  const handleDeleteReel = async (reelId: string) => {
    if (!user?.id) {
      toast.error("Please login to delete reels");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this reel?")) {
      return;
    }

    setReels(prev => prev.filter(r => r.id !== reelId));
    toast.success("Reel deleted");

    try {
      const { error } = await supabase
        .from("reels")
        .delete()
        .eq("id", reelId)
        .eq("user_id", user.id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error deleting reel:', error);
      toast.error(error?.message || "Failed to delete reel");
      fetchReels();
    }
  };

  return (
    <div className="h-screen bg-black overflow-hidden relative">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-12 left-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      
      {reels.length === 0 && !hasTargetReel ? (
        isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Reels Yet</h3>
                <p className="text-muted-foreground text-sm">
                  Start creating amazing reels
                </p>
              </div>
            </div>
          </div>
        )
      ) : (
        <div 
          className="h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide"
          style={{
            scrollBehavior: 'smooth',
            scrollSnapType: 'y mandatory',
            scrollSnapStop: 'always',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
            const windowHeight = window.innerHeight;
            const newIndex = Math.round(scrollTop / windowHeight);
            if (newIndex !== currentIndex) {
              setCurrentIndex(newIndex);
              // Preload next batch of videos on scroll
              preloadReelVideos(reels, newIndex);
            }
          }}
        >
          {/* Offline indicator */}
          {connectionQuality === 'offline' && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-yellow-500/90 text-black text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <WifiOff className="w-3 h-3" />
              Offline - Showing cached reels
            </div>
          )}
          {reels.map((reel, index) => (
            <div 
              key={reel.id}
              className="h-screen snap-start snap-always"
              style={{ 
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)'
              }}
            >
              <ReelItemWrapper
                reel={reel}
                index={index}
                currentIndex={currentIndex}
                user={user}
                mutedVideos={mutedVideos}
                likedReels={reelEngagement.likedIds}
                setMutedVideos={setMutedVideos}
                handleLikeReel={handleLikeReel}
                setSelectedReelForLikes={setSelectedReelForLikes}
                setShowLikes={setShowLikes}
                setSelectedReelForComments={setSelectedReelForComments}
                setShowComments={setShowComments}
                setSelectedReelId={setSelectedReelId}
                setSelectedReelCaption={setSelectedReelCaption}
                setSelectedReelVideo={setSelectedReelVideo}
                setShowShare={setShowShare}
                navigate={navigate}
                handleDeleteReel={handleDeleteReel}
              />
            </div>
          ))}
        </div>
      )}

      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        postId={selectedReelId}
        postContent={selectedReelCaption}
        postType="reel"
        mediaUrls={[selectedReelVideo]}
      />

      <CommentsDialog
        open={showComments}
        onOpenChange={setShowComments}
        postId={selectedReelForComments}
        isReel={true}
        onCommentChange={fetchReels}
      />

      <LikesDialog
        open={showLikes}
        onOpenChange={setShowLikes}
        postId={selectedReelForLikes}
        isReel={true}
      />
    </div>
  );
};

export default Reels;
