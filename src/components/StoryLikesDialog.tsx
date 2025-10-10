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

interface StoryLikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
}

interface Like {
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

const StoryLikesDialog = ({ open, onOpenChange, storyId }: StoryLikesDialogProps) => {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && storyId) {
      fetchLikes();
    }
  }, [open, storyId]);

  const fetchLikes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_likes")
      .select(`
        user_id,
        created_at,
        profiles (username, avatar_url, full_name)
      `)
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLikes(data as any);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            Story Likes
          </DialogTitle>
          <DialogDescription>
            {likes.length} {likes.length === 1 ? 'person likes' : 'people like'} this story
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
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
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

export default StoryLikesDialog;
