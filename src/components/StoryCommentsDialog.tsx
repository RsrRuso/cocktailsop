import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      
      // Successfully posted
      toast.success("Comment posted!");
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
      <DialogContent className="w-[96vw] sm:max-w-md h-[75vh] sm:h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Comments ({comments.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-3 sm:px-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm sm:text-base">No comments yet</p>
              <p className="text-xs sm:text-sm">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-muted/50 transition-colors active:bg-muted/70"
                >
                  <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{comment.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs sm:text-sm truncate">{comment.profiles.full_name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-7 sm:w-7 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm mt-1 sm:mt-1.5 break-words leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 p-3 sm:p-4 border-t shrink-0 bg-background">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            disabled={submitting}
            className="flex-1 min-h-[44px] max-h-[100px] resize-none text-sm sm:text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={submitting || !newComment.trim()}
            className="h-11 w-11 sm:h-12 sm:w-12 glow-primary flex-shrink-0"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoryCommentsDialog;
