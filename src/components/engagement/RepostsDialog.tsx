import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Repeat2, Camera, Music, MessageCircle, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface RepostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'post' | 'reel';
  contentId: string;
}

interface RepostUser {
  id: string;
  user_id: string;
  created_at: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const RepostsDialog = ({ open, onOpenChange, contentType, contentId }: RepostsDialogProps) => {
  const [reposts, setReposts] = useState<RepostUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && contentId) {
      fetchReposts();
    }
  }, [open, contentId, contentType]);

  const fetchReposts = async () => {
    setLoading(true);
    try {
      let repostData: { id: string; user_id: string; created_at: string }[] = [];
      
      if (contentType === 'post') {
        const { data, error } = await supabase
          .from('post_reposts')
          .select('id, user_id, created_at')
          .eq('post_id', contentId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        repostData = data || [];
      } else {
        const { data, error } = await supabase
          .from('reel_reposts')
          .select('id, user_id, created_at')
          .eq('reel_id', contentId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        repostData = data || [];
      }

      // Fetch profiles separately
      if (repostData.length > 0) {
        const userIds = repostData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedReposts = repostData.map(r => ({
          ...r,
          username: profileMap.get(r.user_id)?.username || 'Unknown',
          full_name: profileMap.get(r.user_id)?.full_name || null,
          avatar_url: profileMap.get(r.user_id)?.avatar_url || null,
        }));
        
        setReposts(enrichedReposts);
      } else {
        setReposts([]);
      }
    } catch (error) {
      console.error("Error fetching reposts:", error);
      setReposts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShareToStory = () => {
    navigate('/create-story', { state: { shareContent: { type: contentType, id: contentId } } });
    onOpenChange(false);
    toast.success("Opening story creator...");
  };

  const handleShareToMusic = () => {
    navigate('/music', { state: { shareContent: { type: contentType, id: contentId } } });
    onOpenChange(false);
    toast.success("Share to music...");
  };

  const handleShareToStatus = () => {
    toast.success("Share to status...");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] bg-black/70 backdrop-blur-xl border-0 z-50">
        <DialogHeader className="border-b border-white/10 pb-3">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Repeat2 className="w-5 h-5 text-green-500" />
            Reposts
          </DialogTitle>
        </DialogHeader>

        {/* Share Options */}
        <div className="flex items-center justify-around py-4 border-b border-white/10">
          <button
            onClick={handleShareToStory}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white/80">Story</span>
          </button>
          <button
            onClick={handleShareToMusic}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white/80">Music</span>
          </button>
          <button
            onClick={handleShareToStatus}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white/80">Status</span>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[50vh] py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : reposts.length === 0 ? (
            <p className="text-center text-white/60 py-8">No reposts yet</p>
          ) : (
            <div className="space-y-2">
              {reposts.map((repost) => (
                <div 
                  key={repost.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                  onClick={() => {
                    navigate(`/user/${repost.user_id}`);
                    onOpenChange(false);
                  }}
                >
                  <Avatar className="w-11 h-11">
                    <AvatarImage src={repost.avatar_url || undefined} />
                    <AvatarFallback className="bg-white/20 text-white">{repost.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-white">
                      {repost.full_name || repost.username}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      @{repost.username}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
