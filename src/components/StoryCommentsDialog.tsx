import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

interface StoryCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
}

const StoryCommentsDialog = ({ open, onOpenChange, storyId }: StoryCommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadComments();

      // Subscribe to new comments
      const channel = supabase
        .channel(`story-comments-${storyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'story_comments',
            filter: `story_id=eq.${storyId}`
          },
          () => {
            loadComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, storyId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("story_comments")
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles (username, avatar_url, full_name)
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setComments(data as any || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    if (!user?.id) {
      toast.error("Please login to comment");
      return;
    }

    setSubmitting(true);
    const content = newComment.trim();
    setNewComment("");

    try {
      const { error } = await supabase
        .from("story_comments")
        .insert({
          story_id: storyId,
          user_id: user.id,
          content
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
      setNewComment(content);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("story_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({comments.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                    <AvatarFallback>{comment.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{comment.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm mt-1.5 break-words leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            disabled={submitting}
            className="flex-1 h-11"
            autoComplete="off"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={submitting || !newComment.trim()}
            className="h-11 w-11 glow-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoryCommentsDialog;
