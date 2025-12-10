import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Trash2, MessageCircle, Reply, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ContentType, Comment, getEngagementConfig } from "@/types/engagement";
import { useIsMobile } from "@/hooks/use-mobile";

interface UnifiedCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
  onCommentChange?: () => void;
}

const UnifiedCommentsDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
  onCommentChange
}: UnifiedCommentsDialogProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (open) {
      loadComments();

      // Real-time subscription
      const channel = supabase
        .channel(`comments-${contentId}-${contentType}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: config.tables.comments,
            filter: `${config.tables.idColumn}=eq.${contentId}`
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
  }, [open, contentId, contentType]);

  const loadComments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from(config.tables.comments as any)
        .select(`
          id,
          user_id,
          content,
          created_at,
          parent_comment_id,
          reactions,
          profiles (username, avatar_url, full_name)
        `)
        .eq(config.tables.idColumn, contentId)
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
            parent.replies = parent.replies || [];
            parent.replies.push(commentMap.get(comment.id)!);
          }
        } else {
          rootComments.push(commentMap.get(comment.id)!);
        }
      });

      setComments(rootComments);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const insertData: any = {
        [config.tables.idColumn]: contentId,
        user_id: user.id,
        content: newComment.trim(),
      };

      if (replyingTo) {
        insertData.parent_comment_id = replyingTo;
      }

      const { error } = await supabase
        .from(config.tables.comments as any)
        .insert(insertData);

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      toast.success("Comment added!");
      onCommentChange?.();
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from(config.tables.comments as any)
        .delete()
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success("Comment deleted!");
      onCommentChange?.();
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error("Failed to delete comment");
    }
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isOwner = user && comment.user_id === user.id;

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 md:ml-8 mt-2' : ''}>
        <div className="flex gap-2 md:gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={comment.profiles.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{comment.profiles.username[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-xs md:text-sm">{comment.profiles.full_name || comment.profiles.username}</span>
              <span className="text-[10px] md:text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm mt-1 break-words">{comment.content}</p>
            <div className="flex items-center gap-1 md:gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  setReplyingTo(comment.id);
                  setNewComment(`@${comment.profiles.username} `);
                }}
              >
                <Reply className="w-3 h-3 mr-1" /> Reply
              </Button>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
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

  const commentsContent = (
    <>
      <ScrollArea className="flex-1 pr-2 md:pr-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t pt-3 md:pt-4 space-y-2 pb-safe">
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 text-xs md:text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Reply className="w-4 h-4" />
              <span>Replying to comment</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReplyingTo(null);
                setNewComment('');
              }}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 min-h-[48px] md:min-h-[60px] max-h-[100px] text-base resize-none"
            disabled={submitting}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] max-h-[85vh] flex flex-col px-4">
          <DrawerHeader className="px-0 pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-5 h-5" />
              {getContentLabel()} Comments
            </DrawerTitle>
          </DrawerHeader>
          {commentsContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {getContentLabel()} Comments
          </DialogTitle>
        </DialogHeader>
        {commentsContent}
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedCommentsDialog;
