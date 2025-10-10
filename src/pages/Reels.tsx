import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX } from "lucide-react";
import TopNav from "@/components/TopNav";
import { toast } from "sonner";
import CommentsDialog from "@/components/CommentsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShareDialog from "@/components/ShareDialog";

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
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState("");
  const [selectedReelCaption, setSelectedReelCaption] = useState("");
  const [selectedReelVideo, setSelectedReelVideo] = useState("");
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([fetchCurrentUser(), fetchReels(), fetchLikedReels()]);

    let updateTimeout: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => fetchReels(), 1000);
    };

    const reelsChannel = supabase
      .channel('reels-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reels'
        },
        debouncedFetch
      )
      .subscribe();

    // Real-time for reel likes
    const reelLikesChannel = supabase
      .channel('reels-page-likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reel_likes'
        },
        () => {
          clearTimeout(updateTimeout);
          updateTimeout = setTimeout(() => {
            fetchReels();
            fetchLikedReels();
          }, 1000);
        }
      )
      .subscribe();

    // Real-time for reel comments
    const reelCommentsChannel = supabase
      .channel('reels-page-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reel_comments'
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      clearTimeout(updateTimeout);
      supabase.removeChannel(reelsChannel);
      supabase.removeChannel(reelLikesChannel);
      supabase.removeChannel(reelCommentsChannel);
    };
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (data) setCurrentUser(data);
  };

  const fetchReels = async () => {
    const { data } = await supabase
      .from("reels")
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url,
          badge_level
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setReels(data);
    }
  };

  const fetchLikedReels = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("reel_likes")
      .select("reel_id")
      .eq("user_id", user.id);

    if (data) {
      setLikedReels(new Set(data.map(like => like.reel_id)));
    }
  };

  const handleLikeReel = async (reelId: string) => {
    if (!currentUser) {
      toast.error("Please login to like reels");
      return;
    }

    const isLiked = likedReels.has(reelId);

    // Optimistic update
    if (isLiked) {
      setLikedReels(prev => {
        const newSet = new Set(prev);
        newSet.delete(reelId);
        return newSet;
      });
      setReels(prev => prev.map(r => 
        r.id === reelId ? { ...r, like_count: Math.max(0, r.like_count - 1) } : r
      ));
    } else {
      setLikedReels(prev => new Set(prev).add(reelId));
      setReels(prev => prev.map(r => 
        r.id === reelId ? { ...r, like_count: r.like_count + 1 } : r
      ));
    }

    // Background API call
    if (isLiked) {
      const { error } = await supabase
        .from("reel_likes")
        .delete()
        .eq("reel_id", reelId)
        .eq("user_id", currentUser.id);

      if (error) {
        setLikedReels(prev => new Set(prev).add(reelId));
        setReels(prev => prev.map(r => 
          r.id === reelId ? { ...r, like_count: r.like_count + 1 } : r
        ));
      }
    } else {
      const { error } = await supabase
        .from("reel_likes")
        .insert({ reel_id: reelId, user_id: currentUser.id });

      if (error) {
        setLikedReels(prev => {
          const newSet = new Set(prev);
          newSet.delete(reelId);
          return newSet;
        });
        setReels(prev => prev.map(r => 
          r.id === reelId ? { ...r, like_count: Math.max(0, r.like_count - 1) } : r
        ));
      }
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    // Optimistic update - remove instantly
    setReels(prev => prev.filter(r => r.id !== reelId));
    toast.success("Reel deleted");

    try {
      const { error } = await supabase
        .from("reels")
        .delete()
        .eq("id", reelId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error("Failed to delete reel");
      // Refresh to restore if failed
      fetchReels();
    }
  };

  const currentReel = reels[currentIndex];

  return (
    <div className="h-screen bg-background overflow-hidden relative">
      <TopNav />
      
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
        <div className="h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide pt-16">
          {reels.map((reel, index) => (
            <div
              key={reel.id}
              className="h-screen snap-start relative flex items-center justify-center bg-black"
            >
              {/* Video Player */}
              <video
                src={reel.video_url}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                playsInline
                muted={!mutedVideos.has(reel.id)}
                autoPlay
              />

              {/* Mute/Unmute Button */}
              <button
                onClick={() => {
                  setMutedVideos(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(reel.id)) {
                      newSet.delete(reel.id);
                    } else {
                      newSet.add(reel.id);
                    }
                    return newSet;
                  });
                }}
                className="absolute top-20 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
              >
                {mutedVideos.has(reel.id) ? (
                  <Volume2 className="w-5 h-5 text-white" />
                ) : (
                  <VolumeX className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Bottom Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm border-t border-white/10">
                <div className="h-full flex items-center justify-around px-4">
                  <button 
                    onClick={() => handleLikeReel(reel.id)}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                  >
                    <Heart className={`w-7 h-7 transition-all ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    <span className="text-white text-xs font-semibold">{reel.like_count || 0}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setSelectedReelForComments(reel.id);
                      setShowComments(true);
                    }}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition-transform"
                  >
                    <MessageCircle className="w-7 h-7 text-white" />
                    <span className="text-white text-xs font-semibold">{reel.comment_count || 0}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setSelectedReelId(reel.id);
                      setSelectedReelCaption(reel.caption || '');
                      setSelectedReelVideo(reel.video_url);
                      setShowShare(true);
                    }}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition-transform group"
                  >
                    <div className="relative">
                      <Send className="w-7 h-7 text-white drop-shadow-[0_4px_8px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_6px_12px_rgba(255,255,255,0.5)] transition-all" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
                    </div>
                    <span className="text-white text-xs font-semibold">Send</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform">
                    <Bookmark className="w-7 h-7 text-white" />
                  </button>

                  {currentUser && reel.user_id === currentUser.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform">
                          <MoreVertical className="w-7 h-7 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass">
                        <DropdownMenuItem onClick={() => navigate(`/edit-reel/${reel.id}`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteReel(reel.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* User Info - Left Bottom */}
              <div className="absolute bottom-20 left-4 right-20 z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold">@{reel.profiles?.username}</p>
                </div>
                <p className="text-white text-sm line-clamp-2">{reel.caption}</p>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-white" />
                  <p className="text-white text-xs">Original Audio</p>
                </div>
              </div>
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
      />
    </div>
  );
};

export default Reels;
