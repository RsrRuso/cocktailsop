import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX, ArrowLeft, Eye } from "lucide-react";
import TopNav from "@/components/TopNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { toast } from "sonner";
import CommentsDialog from "@/components/CommentsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShareDialog from "@/components/ShareDialog";
import LikesDialog from "@/components/LikesDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useViewTracking } from "@/hooks/useViewTracking";
import { ReelItemWrapper } from "@/components/ReelItemWrapper";

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
    badge_level: string;
  };
}

const Reels = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState("");
  const [selectedReelCaption, setSelectedReelCaption] = useState("");
  const [selectedReelVideo, setSelectedReelVideo] = useState("");
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [showLikes, setShowLikes] = useState(false);
  const [selectedReelForLikes, setSelectedReelForLikes] = useState("");
  const [targetReelId, setTargetReelId] = useState<string | null>(null);

  // Auto-unmute current reel, mute others
  useEffect(() => {
    if (reels.length > 0 && currentIndex >= 0 && currentIndex < reels.length) {
      const currentReelId = reels[currentIndex].id;
      // Keep all reels EXCEPT current in the muted set
      setMutedVideos(new Set(reels.map(r => r.id).filter(id => id !== currentReelId)));
    }
  }, [currentIndex, reels]);

  useEffect(() => {
    if (user) {
      fetchReels();
      fetchLikedReels();
    }

    // Subscribe to reel updates for comment counts
    const reelsChannel = supabase
      .channel('reels-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => fetchReels())
      .subscribe();

    return () => {
      supabase.removeChannel(reelsChannel);
    };
  }, [user]);

  // Navigate to specific reel if coming from profile
  useEffect(() => {
    const state = location.state as { scrollToReelId?: string; reelData?: any };
    if (state?.scrollToReelId && !targetReelId) {
      setTargetReelId(state.scrollToReelId);
      // If reel data was passed, use it immediately for instant display
      if (state.reelData) {
        setReels([state.reelData]);
        setCurrentIndex(0);
      }
      // Clear navigation state immediately
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, targetReelId, navigate, location.pathname]);

  // Scroll to target reel when all reels are loaded
  useEffect(() => {
    if (targetReelId && reels.length > 1) {
      const reelIndex = reels.findIndex(r => r.id === targetReelId);
      if (reelIndex !== -1) {
        setCurrentIndex(reelIndex);
        requestAnimationFrame(() => {
          const container = document.querySelector('.snap-y') as HTMLElement;
          if (container) {
            container.scrollTop = reelIndex * window.innerHeight;
          }
        });
        setTargetReelId(null); // Clear after successful scroll
      }
    }
  }, [reels, targetReelId]);

  const fetchReels = async () => {
    // Fetch reels WITHOUT expensive profile joins
    const { data, error } = await supabase
      .from("reels")
      .select("id, user_id, video_url, caption, like_count, comment_count, view_count, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data) return;

    // Fetch profiles separately in ONE query
    const userIds = [...new Set(data.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, badge_level')
      .in('id', userIds);

    // Map profiles to reels
    const reelsWithProfiles = data.map(reel => ({
      ...reel,
      profiles: profiles?.find(p => p.id === reel.user_id) || null
    }));

    setReels(reelsWithProfiles);
  };

  const fetchLikedReels = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("reel_likes")
      .select("reel_id")
      .eq("user_id", user.id);

    if (data) {
      setLikedReels(new Set(data.map(like => like.reel_id)));
    }
  };

  const handleLikeReel = async (reelId: string) => {
    if (!user?.id) {
      toast.error("Please login to like reels");
      return;
    }

    const isLiked = likedReels.has(reelId);

    // Optimistic UI update only - database trigger handles the count
    if (isLiked) {
      setLikedReels(prev => {
        const newSet = new Set(prev);
        newSet.delete(reelId);
        return newSet;
      });
    } else {
      setLikedReels(prev => new Set(prev).add(reelId));
    }

    // Database operation - trigger updates count automatically
    try {
      if (isLiked) {
        const { error } = await supabase
          .from("reel_likes")
          .delete()
          .eq("reel_id", reelId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reel_likes")
          .insert({ reel_id: reelId, user_id: user.id });

        // Ignore duplicate key errors - already liked
        if (error && error.code !== '23505') throw error;
      }
    } catch (error: any) {
      console.error('Error toggling reel like:', error);
      // Revert UI state only - database trigger handles counts
      if (isLiked) {
        setLikedReels(prev => new Set(prev).add(reelId));
      } else {
        setLikedReels(prev => {
          const newSet = new Set(prev);
          newSet.delete(reelId);
          return newSet;
        });
      }
      toast.error('Failed to update like');
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!user?.id) {
      toast.error("Please login to delete reels");
      return;
    }

    // Confirm deletion
    if (!window.confirm("Are you sure you want to delete this reel?")) {
      return;
    }

    // Optimistic update - remove instantly
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
      // Refresh to restore if failed
      fetchReels();
    }
  };

  const currentReel = reels[currentIndex];

  return (
    <div className="h-screen bg-background overflow-hidden relative">
      <TopNav />
      
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-20 left-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      
      {reels.length === 0 ? (
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
      ) : (
        <div 
          className="h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide pt-16"
          onScroll={(e) => {
            const scrollTop = e.currentTarget.scrollTop;
            const windowHeight = window.innerHeight;
            const newIndex = Math.round(scrollTop / windowHeight);
            if (newIndex !== currentIndex) setCurrentIndex(newIndex);
          }}
        >
          {reels.map((reel, index) => (
            <ReelItemWrapper
              key={reel.id}
              reel={reel}
              index={index}
              currentIndex={currentIndex}
              user={user}
              mutedVideos={mutedVideos}
              likedReels={likedReels}
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
