import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ContentType, Like, getEngagementConfig } from "@/types/engagement";

interface UnifiedLikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
}

const UnifiedLikesDialog = ({ open, onOpenChange, contentType, contentId }: UnifiedLikesDialogProps) => {
  const navigate = useNavigate();
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (open && contentId) {
      fetchLikes();
    }
  }, [open, contentId, contentType]);

  const fetchLikes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(config.tables.likes as any)
        .select(`
          user_id,
          created_at,
          profiles!inner (username, avatar_url, full_name)
        `)
        .eq(config.tables.idColumn, contentId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLikes(data.map((item: any) => ({
          user_id: item.user_id,
          created_at: item.created_at,
          profiles: item.profiles
        })));
      }
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
    setLoading(false);
  };

  const getContentLabel = () => {
    const labels = {
      post: 'Post',
      reel: 'Reel',
      story: 'Story',
      music_share: 'Music Share',
      event: 'Event'
    };
    return labels[contentType];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-red-500 text-red-500" />
            {getContentLabel()} Likes
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {likes.length} {likes.length === 1 ? 'person likes' : 'people like'} this {getContentLabel().toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : likes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No likes yet</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {likes.map((like) => (
                <div
                  key={like.user_id}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl hover:bg-accent/50 active:bg-accent transition-all cursor-pointer group"
                  onClick={() => {
                    navigate(`/user/${like.user_id}`);
                    onOpenChange(false);
                  }}
                >
                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={like.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-base sm:text-lg font-semibold bg-primary/10">
                      {like.profiles.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{like.profiles.full_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      @{like.profiles.username}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                  </span>
                  <Heart className="w-4 h-4 fill-red-500 text-red-500 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedLikesDialog;
