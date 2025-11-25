import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Edit2, Trash2, Send, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  reaction_count: number;
  reply_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

interface UnifiedAdvancedCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  currentUserId: string | undefined;
}

const UnifiedAdvancedCommentsDialog = ({
  open,
  onOpenChange,
  eventId,
  currentUserId,
}: UnifiedAdvancedCommentsDialogProps) => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && eventId) {
      fetchComments();
      fetchLikedComments();
    }
  }, [open, eventId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_comment_id,
          reaction_count,
          reply_count,
          profiles!event_comments_user_id_fkey(username, avatar_url, full_name)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setComments(data as any);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
    setLoading(false);
  };

  const fetchLikedComments = async () => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from("event_comment_reactions")
        .select("comment_id")
        .eq("user_id", currentUserId);

      if (data) {
        setLikedComments(new Set(data.map((r) => r.comment_id)));
      }
    } catch (err) {
      console.error("Error fetching liked comments:", err);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("event_comments").insert({
        event_id: eventId,
        user_id: currentUserId,
        content: newComment.trim(),
        parent_comment_id: replyTo?.id || null,
      });

      if (error) throw error;

      setNewComment("");
      setReplyTo(null);
      await fetchComments();
      toast.success(replyTo ? "Reply posted!" : "Comment posted!");
    } catch (err) {
      console.error("Error posting comment:", err);
      toast.error("Failed to post comment");
    }
    setSubmitting(false);
  };

  const handleEditComment = async () => {
    if (!editContent.trim() || !editingComment || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_comments")
        .update({ content: editContent.trim() })
        .eq("id", editingComment.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setEditingComment(null);
      setEditContent("");
      await fetchComments();
      toast.success("Comment updated!");
    } catch (err) {
      console.error("Error updating comment:", err);
      toast.error("Failed to update comment");
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      await fetchComments();
      toast.success("Comment deleted!");
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Failed to delete comment");
    }
    setSubmitting(false);
  };

  const handleToggleLike = async (commentId: string) => {
    if (!currentUserId) return;

    const isLiked = likedComments.has(commentId);

    // Optimistic update
    setLikedComments((prev) => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, reaction_count: c.reaction_count + (isLiked ? -1 : 1) }
          : c
      )
    );

    try {
      if (isLiked) {
        await supabase
          .from("event_comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);
      } else {
        await supabase.from("event_comment_reactions").insert({
          comment_id: commentId,
          user_id: currentUserId,
          reaction_type: "like",
        });
      }
    } catch (err) {
      // Revert on error
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(commentId);
        } else {
          newSet.delete(commentId);
        }
        return newSet;
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, reaction_count: c.reaction_count + (isLiked ? 1 : -1) }
            : c
        )
      );
      console.error("Error toggling like:", err);
      toast.error("Failed to update like");
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingComment?.id === comment.id;
    const isLiked = likedComments.has(comment.id);
    const replies = comments.filter((c) => c.parent_comment_id === comment.id);

    return (
      <div key={comment.id} className={`${isReply ? "ml-8 sm:ml-14" : ""} mb-3 sm:mb-4`}>
        <div className="flex gap-2 sm:gap-3 group">
          <Avatar
            className="w-9 h-9 sm:w-11 sm:h-11 cursor-pointer shrink-0 active:scale-95 transition-transform"
            onClick={() => {
              navigate(`/user/${comment.user_id}`);
              onOpenChange(false);
            }}
          >
            <AvatarImage src={comment.profiles.avatar_url || undefined} />
            <AvatarFallback className="text-sm font-semibold bg-primary/10">
              {comment.profiles.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="bg-accent/30 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 active:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <p
                    className="font-semibold text-xs sm:text-sm cursor-pointer hover:underline truncate"
                    onClick={() => {
                      navigate(`/user/${comment.user_id}`);
                      onOpenChange(false);
                    }}
                  >
                    {comment.profiles.full_name}
                  </p>
                  <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>

                {currentUserId === comment.user_id && !isEditing && (
                  <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-7 sm:w-7"
                      onClick={() => {
                        setEditingComment(comment);
                        setEditContent(comment.content);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-7 sm:w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] resize-none text-sm sm:text-base"
                    placeholder="Edit your comment..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleEditComment} disabled={submitting}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm break-words">{comment.content}</p>
              )}
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mt-2 px-2">
              <button
                className="flex items-center gap-1.5 group/like active:scale-95 transition-transform"
                onClick={() => handleToggleLike(comment.id)}
              >
                <Heart
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-all ${
                    isLiked
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground group-hover/like:text-red-500"
                  }`}
                />
                {comment.reaction_count > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {comment.reaction_count}
                  </span>
                )}
              </button>

              {!isReply && (
                <button
                  className="flex items-center gap-1.5 group/reply active:scale-95 transition-transform"
                  onClick={() => setReplyTo(comment)}
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover/reply:text-primary transition-colors" />
                  {comment.reply_count > 0 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {comment.reply_count}
                    </span>
                  )}
                </button>
              )}
            </div>

            {replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-2xl h-[75vh] sm:h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-xl">
            <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6" />
            Comments ({comments.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-3 sm:px-6 py-3 sm:py-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm sm:text-base">No comments yet</p>
              <p className="text-xs sm:text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-1 sm:space-y-2">
              {topLevelComments.map((comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-3 sm:p-6 shrink-0 bg-background">
          {replyTo && (
            <div className="mb-2 sm:mb-3 flex items-center gap-2 text-xs sm:text-sm bg-accent/30 rounded-lg px-3 py-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground truncate flex-1">
                Replying to <span className="font-semibold">{replyTo.profiles.full_name}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => setReplyTo(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <Avatar className="w-9 h-9 sm:w-10 sm:h-10 shrink-0">
              <AvatarImage src={currentUserId ? undefined : undefined} />
              <AvatarFallback className="text-xs sm:text-sm font-semibold bg-primary/10">
                {currentUserId ? "U" : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? "Write a reply..." : "Write a comment..."}
                className="min-h-[44px] max-h-[100px] resize-none text-sm sm:text-base"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                className="shrink-0 h-11 w-11 sm:h-12 sm:w-12"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 ml-10 sm:ml-12">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedAdvancedCommentsDialog;
