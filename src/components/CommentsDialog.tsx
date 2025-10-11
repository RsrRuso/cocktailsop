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
}

const CommentsDialog = ({ open, onOpenChange, postId, isReel = false }: CommentsDialogProps) => {
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
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const renderComment = (comment: Comment, level: number = 0) => (
    <div key={comment.id} className={`${level > 0 ? 'ml-8 mt-2' : 'mt-3'}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.profiles.avatar_url || undefined} />
          <AvatarFallback>{comment.profiles.username[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="bg-muted/30 rounded-2xl px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{comment.profiles.username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
            <p className="text-sm break-words">{comment.content}</p>
          </div>

          <div className="flex items-center gap-3 mt-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(comment.id)}
              className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              Reply
            </Button>

            {comment.user_id === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(comment.id)}
                className="h-7 px-2 text-xs font-semibold text-destructive hover:text-destructive"
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
      <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Comments</DialogTitle>
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
            <div className="pb-4">
              {comments.map((comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg mb-2">
              <p className="text-sm text-muted-foreground">Replying to comment</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 text-xs"
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
              className="flex-1 min-h-[42px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              type="submit"
              disabled={submitting || !newComment.trim() || !user}
              className="glow-primary self-end"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
