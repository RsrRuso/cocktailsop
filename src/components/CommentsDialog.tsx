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
  parent_comment_id: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  isReel?: boolean;
  onCommentChange?: () => void;
}

const CommentsDialog = ({ open, onOpenChange, postId, isReel = false, onCommentChange }: CommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tableName = isReel ? "reel_comments" : "post_comments";
  const columnName = isReel ? "reel_id" : "post_id";

  useEffect(() => {
    if (open) {
      loadComments();
      
      // Subscribe to new comments
      const channel = supabase
        .channel(`comments-${postId}-${isReel}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `${columnName}=eq.${postId}`
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
  }, [open, postId, isReel]);

  const loadComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from(tableName as any)
        .select(`
          id,
          user_id,
          content,
          created_at,
          parent_comment_id,
          profiles (username, avatar_url)
        `)
        .eq(columnName, postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Build comment tree
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      (data || []).forEach((comment: any) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      (data || []).forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies?.push(commentMap.get(comment.id)!);
          }
        } else {
          rootComments.push(commentMap.get(comment.id)!);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedComment = newComment.trim();
    
    if (!trimmedComment) {
      toast.error("Comment cannot be empty");
      return;
    }
    
    if (!user?.id) {
      toast.error("Please login to comment");
      return;
    }

    setSubmitting(true);
    const content = trimmedComment;
    setNewComment("");

    try {
      const insertData = {
        [columnName]: postId,
        user_id: user.id,
        content,
        parent_comment_id: replyingTo
      };

      const { error } = await supabase
        .from(tableName)
        .insert(insertData as any);

      if (error) throw error;
      
      setReplyingTo(null);
      onCommentChange?.();
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
        .from(tableName as any)
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment deleted");
      onCommentChange?.();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const renderComment = (comment: Comment, level: number = 0) => (
    <div key={comment.id} className={`${level > 0 ? 'ml-4 sm:ml-6 mt-1.5' : 'mt-1.5 sm:mt-2'}`}>
      <div className="group flex gap-2">
        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
          <AvatarImage src={comment.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-[10px] sm:text-xs bg-gradient-to-br from-primary/10 to-primary/5">{comment.profiles.username[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-card/30 hover:bg-card/50 rounded-2xl px-2.5 py-2 border border-border/30 hover:border-primary/30 active:bg-card/60 transition-all relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center gap-1.5 mb-0.5 flex-wrap">
              <p className="font-semibold text-[11px] sm:text-xs">{comment.profiles.username}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
            <p className="relative text-[11px] sm:text-xs break-words">{comment.content}</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 mt-1 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(comment.id)}
              className="h-6 sm:h-7 px-1.5 text-[10px] sm:text-xs font-semibold text-muted-foreground hover:text-primary active:scale-95 transition-all"
            >
              <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
              Reply
            </Button>

            {comment.user_id === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="h-6 sm:h-7 px-1.5 text-[10px] sm:text-xs font-semibold text-destructive hover:text-destructive active:scale-95 transition-all"
              >
                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                Delete
              </Button>
            )}
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <div>
              {comment.replies.map((reply) => renderComment(reply, level + 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-lg h-[60vh] sm:h-[65vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <DialogHeader className="px-3 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-primary/20 shrink-0 bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Comments</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-2 sm:px-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-primary border-r-primary"></div>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <div className="relative inline-block mb-2">
                <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl"></div>
                <MessageCircle className="relative w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
              </div>
              <p className="text-xs sm:text-sm font-medium">No comments yet</p>
              <p className="text-[10px] sm:text-xs opacity-70">Be the first to comment!</p>
            </div>
          ) : (
            <div className="pb-2 sm:pb-3">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t border-primary/20 shrink-0 bg-gradient-to-r from-background to-primary/5">
          {replyingTo && (
            <div className="flex items-center justify-between bg-primary/10 px-2.5 py-1.5 rounded-lg mb-2 border border-primary/20">
              <p className="text-[10px] sm:text-xs text-primary font-medium">Replying...</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 text-[10px] sm:text-xs px-2"
              >
                Cancel
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write reply..." : "Add comment..."}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={submitting}
              className="flex-1 min-h-[38px] max-h-[80px] resize-none text-xs sm:text-sm bg-card/50 border-primary/20 focus:border-primary/40 transition-colors"
              rows={1}
            />
            <Button
              type="submit"
              disabled={submitting || !newComment.trim() || !user}
              className="bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 self-end h-[38px] w-[38px] sm:h-10 sm:w-10 flex-shrink-0 active:scale-95 transition-transform"
              size="icon"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
