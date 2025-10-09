import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Music, Trash2, Edit } from "lucide-react";
import TopNav from "@/components/TopNav";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  useEffect(() => {
    fetchCurrentUser();
    fetchReels();

    // Set up realtime subscription
    const reelsChannel = supabase
      .channel('reels-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reels'
        },
        () => fetchReels()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reelsChannel);
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
      .limit(20);

    if (data) {
      setReels(data);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    try {
      const { error } = await supabase
        .from("reels")
        .delete()
        .eq("id", reelId);

      if (error) throw error;
      toast.success("Reel deleted successfully");
      fetchReels();
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error("Failed to delete reel");
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
              {/* Video Preview - In production this would be actual video */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Music className="w-20 h-20 text-white/50" />
              </div>

              {/* Right Side Actions */}
              <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-10">
                <div className="flex flex-col items-center gap-1">
                  <button className="w-11 h-11 rounded-full glass border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                    <Heart className="w-5 h-5 text-white" />
                  </button>
                  <span className="text-white text-xs font-semibold drop-shadow-lg">{reel.like_count}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="w-11 h-11 rounded-full neon-green border border-primary/30 flex items-center justify-center hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5 text-black" />
                  </button>
                  <span className="neon-green-text text-xs font-bold drop-shadow-lg">{reel.comment_count}</span>
                </div>

                <button className="w-11 h-11 rounded-full glass border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                  <Send className="w-5 h-5 text-white" />
                </button>

                <button className="w-11 h-11 rounded-full glass border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                  <Bookmark className="w-5 h-5 text-white" />
                </button>

                {currentUser && reel.user_id === currentUser.id ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-11 h-11 rounded-full glass border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                        <MoreVertical className="w-5 h-5 text-white" />
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
                ) : (
                  <button className="w-11 h-11 rounded-full glass border border-white/20 flex items-center justify-center hover:scale-110 transition-transform">
                    <MoreVertical className="w-5 h-5 text-white" />
                  </button>
                )}

                {/* Profile Avatar */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-full border border-white overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary border border-background flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+</span>
                  </div>
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-24 left-4 right-20 z-10 space-y-3">
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
    </div>
  );
};

export default Reels;
