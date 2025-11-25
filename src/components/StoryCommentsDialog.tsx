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
      <DialogContent className="w-[95vw] sm:max-w-md h-[50vh] sm:h-[55vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 border-primary/20 shadow-2xl">
        <DialogHeader className="px-3 sm:px-4 pt-2.5 sm:pt-3 pb-1.5 sm:pb-2 border-b border-primary/20 shrink-0 bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
            <div className="p-1 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Comments
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">({comments.length})</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-2 sm:px-3 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-4 sm:py-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-6 w-6 border-2 border-transparent border-t-primary border-r-primary"></div>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 sm:py-6 text-muted-foreground">
              <div className="relative inline-block mb-1.5">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl"></div>
                <MessageCircle className="relative w-7 h-7 sm:w-8 sm:h-8 opacity-30" />
              </div>
              <p className="text-xs sm:text-sm font-medium">No comments yet</p>
              <p className="text-[10px] sm:text-xs opacity-70">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-1.5 py-2">
              {comments.map((comment, idx) => (
                <div
                  key={comment.id}
                  className="group relative flex gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-card/30 hover:bg-card/60 border border-border/30 hover:border-primary/30 transition-all duration-200 active:scale-[0.98]"
                  style={{
                    animationDelay: `${idx * 0.02}s`,
                    animation: 'fadeInUp 0.3s ease-out forwards',
                    opacity: 0
                  }}
                >
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  
                  <Avatar className="relative w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px] sm:text-[10px] bg-gradient-to-br from-primary/10 to-primary/5">
                      {comment.profiles.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[10px] sm:text-xs truncate">{comment.profiles.full_name}</p>
                        <p className="text-[8px] sm:text-[9px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {comment.user_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs mt-0.5 break-words leading-relaxed text-foreground/90">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-1.5 p-2 border-t border-primary/20 shrink-0 bg-background/80 backdrop-blur-sm sticky bottom-0">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add comment..."
            disabled={submitting}
            className="flex-1 min-h-[36px] max-h-[72px] resize-none text-xs bg-card/50 border-primary/20 focus:border-primary/40 transition-colors py-2 px-3"
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
            className="h-[36px] w-[36px] bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 flex-shrink-0 active:scale-95 transition-transform"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoryCommentsDialog;
