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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            {getContentLabel()} Likes
          </DialogTitle>
          <DialogDescription>
            {likes.length} {likes.length === 1 ? 'person likes' : 'people like'} this {getContentLabel().toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : likes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No likes yet
            </div>
          ) : (
            <div className="space-y-3">
              {likes.map((like) => (
                <div
                  key={like.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    navigate(`/user/${like.user_id}`);
                    onOpenChange(false);
                  }}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={like.profiles.avatar_url || undefined} />
                    <AvatarFallback>{like.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{like.profiles.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{like.profiles.username}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                  </span>
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
