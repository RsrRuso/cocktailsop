import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface MusicShareCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musicShareId: string;
  trackTitle: string;
  trackArtist: string;
}

export const MusicShareCommentsDialog = ({ 
  open, 
  onOpenChange, 
  musicShareId,
  trackTitle,
  trackArtist
}: MusicShareCommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && musicShareId) {
      fetchComments();

      // Real-time subscription for comments
      const channel = supabase
        .channel(`music_share_comments:${musicShareId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "music_share_comments",
            filter: `music_share_id=eq.${musicShareId}`,
          },
          () => {
            fetchComments();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "music_share_comments",
            filter: `music_share_id=eq.${musicShareId}`,
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, musicShareId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("music_share_comments")
      .select("id, user_id, content, created_at")
      .eq("music_share_id", musicShareId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching comments:", error);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const commentsWithProfiles = data.map(comment => ({
      ...comment,
      profiles: profiles?.find(p => p.id === comment.user_id)
    }));

    setComments(commentsWithProfiles);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsLoading(true);
    const { error } = await supabase
      .from("music_share_comments")
      .insert({
        music_share_id: musicShareId,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      toast.error("Failed to add comment");
      console.error(error);
    } else {
      setNewComment("");
      fetchComments();
    }
    setIsLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("music_share_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Failed to delete comment");
    } else {
      fetchComments();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Comments on {trackTitle} by {trackArtist}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {comments.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No comments yet. Be the first!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.profiles?.avatar_url || "/placeholder.svg"}
                  alt={comment.profiles?.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {comment.profiles?.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
                {user?.id === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
            disabled={isLoading}
          />
          <Button onClick={handleAddComment} disabled={isLoading || !newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
