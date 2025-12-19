import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <div key={comment.id} className={`${level > 0 ? 'ml-10 mt-3' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-white/10 text-white">{comment.profiles.username[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">{comment.profiles.username}</span>
            <span className="text-xs text-white/50">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-white/90 mt-0.5 break-words">{comment.content}</p>

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-xs text-white/50 hover:text-white/70 font-medium"
            >
              Reply
            </button>

            {comment.user_id === user?.id && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-xs text-red-400/70 hover:text-red-400 font-medium"
              >
                Delete
              </button>
            )}
          </div>

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => renderComment(reply, level + 1))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[100vw] sm:max-w-lg h-[60vh] sm:h-[55vh] flex flex-col p-0 gap-0 bg-transparent border-0 shadow-none [&>button]:hidden !rounded-none">
        {/* Instagram-style header - minimal */}
        <DialogHeader className="px-4 py-3 shrink-0">
          <DialogTitle className="flex items-center justify-center gap-2 text-sm font-semibold text-white">
            Comments
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-white/60">
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs mt-1 opacity-70">Start the conversation.</p>
            </div>
          ) : (
            <div className="pb-4 space-y-4">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        {/* Instagram-style input */}
        <form onSubmit={handleSubmit} className="px-4 py-3 shrink-0">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/60">Replying to comment</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 text-xs text-white/60 hover:text-white p-0"
              >
                Cancel
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={submitting}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/40 focus:outline-none"
            />
            <Button
              type="submit"
              disabled={submitting || !newComment.trim() || !user}
              variant="ghost"
              className="text-primary font-semibold text-sm p-0 h-auto hover:bg-transparent disabled:opacity-30"
            >
              Post
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
