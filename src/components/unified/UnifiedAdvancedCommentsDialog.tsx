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
      <div key={comment.id} className={`${isReply ? "ml-6 sm:ml-10" : ""} mb-2 sm:mb-2.5`}>
        <div className="flex gap-2 group">
          <Avatar
            className="w-7 h-7 sm:w-9 sm:h-9 cursor-pointer shrink-0 active:scale-95 transition-transform ring-2 ring-transparent group-hover:ring-primary/20"
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
            <div className="relative bg-card/30 hover:bg-card/50 rounded-2xl px-2.5 py-2 border border-border/30 hover:border-primary/30 active:bg-card/60 transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between mb-0.5 gap-1.5">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                  <p
                    className="font-semibold text-[11px] sm:text-xs cursor-pointer hover:underline truncate"
                    onClick={() => {
                      navigate(`/user/${comment.user_id}`);
                      onOpenChange(false);
                    }}
                  >
                    {comment.profiles.full_name}
                  </p>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>

                {currentUserId === comment.user_id && !isEditing && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
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
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="relative space-y-1.5">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[50px] resize-none text-xs sm:text-sm bg-card/50 border-primary/20"
                    placeholder="Edit comment..."
                  />
                  <div className="flex gap-1.5 justify-end">
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
                <p className="relative text-[11px] sm:text-xs break-words">{comment.content}</p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mt-1 px-1">
              <button
                className="flex items-center gap-1 group/like active:scale-95 transition-transform"
                onClick={() => handleToggleLike(comment.id)}
              >
                <Heart
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                    isLiked
                      ? "fill-red-500 text-red-500"
                      : "text-muted-foreground group-hover/like:text-red-500"
                  }`}
                />
                {comment.reaction_count > 0 && (
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                    {comment.reaction_count}
                  </span>
                )}
              </button>

              {!isReply && (
                <button
                  className="flex items-center gap-1 group/reply active:scale-95 transition-transform"
                  onClick={() => setReplyTo(comment)}
                >
                  <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground group-hover/reply:text-primary transition-colors" />
                  {comment.reply_count > 0 && (
                    <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
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
      <DialogContent className="w-[95vw] sm:max-w-xl h-[50vh] sm:h-[55vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 border-primary/20 shadow-2xl">
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

        <ScrollArea className="flex-1 px-2 sm:px-3 py-2 min-h-0">
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
            <div className="space-y-1.5">
              {topLevelComments.map((comment) => renderComment(comment))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-primary/20 p-2 shrink-0 bg-background/80 backdrop-blur-sm sticky bottom-0">
          {replyTo && (
            <div className="mb-1.5 flex items-center gap-1 text-[9px] sm:text-[10px] bg-primary/10 rounded-lg px-2 py-1 border border-primary/20">
              <MessageCircle className="w-2.5 h-2.5 text-primary shrink-0" />
              <span className="text-primary font-medium truncate flex-1">
                Replying to {replyTo.profiles.full_name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0"
                onClick={() => setReplyTo(null)}
              >
                <X className="w-2.5 h-2.5" />
              </Button>
            </div>
          )}

          <div className="flex gap-1.5">
            <Avatar className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 ring-2 ring-primary/10">
              <AvatarImage src={currentUserId ? undefined : undefined} />
              <AvatarFallback className="text-[9px] sm:text-[10px] font-semibold bg-gradient-to-br from-primary/10 to-primary/5">
                {currentUserId ? "U" : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-1.5">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? "Write reply..." : "Add comment..."}
                className="min-h-[36px] max-h-[72px] resize-none text-xs bg-card/50 border-primary/20 focus:border-primary/40 transition-colors py-2 px-3"
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
                className="shrink-0 h-[36px] w-[36px] bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 active:scale-95 transition-transform"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedAdvancedCommentsDialog;
