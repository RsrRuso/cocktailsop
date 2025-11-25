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
    <div key={comment.id} className={`${level > 0 ? 'ml-6 sm:ml-8 mt-2' : 'mt-2 sm:mt-3'}`}>
      <div className="flex gap-2 sm:gap-3">
        <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0">
          <AvatarImage src={comment.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{comment.profiles.username[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted/30 rounded-2xl px-3 py-2 active:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-xs sm:text-sm">{comment.profiles.username}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
            <p className="text-xs sm:text-sm break-words">{comment.content}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mt-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(comment.id)}
              className="h-8 sm:h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Reply
            </Button>

            {comment.user_id === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="h-8 sm:h-7 px-2 text-xs font-semibold text-destructive hover:text-destructive active:scale-95 transition-transform"
              >
                <Trash2 className="w-3 h-3 mr-1" />
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
      <DialogContent className="w-[96vw] sm:max-w-lg h-[75vh] sm:h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
          <DialogTitle className="text-base sm:text-lg">Comments</DialogTitle>
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
            <div className="pb-3 sm:pb-4">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t shrink-0 bg-background">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg mb-2">
              <p className="text-xs sm:text-sm text-muted-foreground">Replying to comment</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={submitting}
              className="flex-1 min-h-[44px] max-h-[100px] resize-none text-sm sm:text-base"
              rows={1}
            />
            <Button
              type="submit"
              disabled={submitting || !newComment.trim() || !user}
              className="glow-primary self-end h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0"
              size="icon"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
