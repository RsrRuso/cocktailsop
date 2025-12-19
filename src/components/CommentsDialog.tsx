import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Heart, Pencil, Trash2 } from "lucide-react";

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
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [swipedCommentId, setSwipedCommentId] = useState<string | null>(null);

  const tableName = isReel ? "reel_comments" : "post_comments";
  const columnName = isReel ? "reel_id" : "post_id";

  useEffect(() => {
    if (open) {
      loadComments();
      
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
      setSwipedCommentId(null);
      onCommentChange?.();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    
    try {
      const { error } = await supabase
        .from(tableName as any)
        .update({ content: editContent.trim() })
        .eq("id", commentId);

      if (error) throw error;
      
      toast.success("Comment updated");
      setEditingComment(null);
      setEditContent("");
      loadComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  // Double tap to like comment
  const lastTapRef = useRef<{ [key: string]: number }>({});
  
  const handleDoubleTap = useCallback((commentId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[commentId] || 0;
    
    if (now - lastTap < 300) {
      // Double tap - toggle like
      setLikedComments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(20);
          }
        }
        return newSet;
      });
    }
    lastTapRef.current[commentId] = now;
  }, []);

  // Swipe handler
  const handleDragEnd = (commentId: string, info: PanInfo) => {
    if (info.offset.x < -60) {
      setSwipedCommentId(commentId);
    } else {
      setSwipedCommentId(null);
    }
  };

  const renderComment = (comment: Comment, level: number = 0) => {
    const isOwner = comment.user_id === user?.id;
    const isLiked = likedComments.has(comment.id);
    const isSwiped = swipedCommentId === comment.id && isOwner;
    const isEditing = editingComment === comment.id;

    return (
      <div key={comment.id} className={`${level > 0 ? 'ml-10 mt-3' : ''}`}>
        <div className="relative overflow-hidden">
          {/* Swipe actions - only for owner */}
          {isOwner && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2">
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isSwiped ? 1 : 0, scale: isSwiped ? 1 : 0.8 }}
                onClick={() => {
                  setEditingComment(comment.id);
                  setEditContent(comment.content);
                  setSwipedCommentId(null);
                }}
                className="w-8 h-8 rounded-full bg-blue-500/90 flex items-center justify-center"
              >
                <Pencil className="w-4 h-4 text-white" />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isSwiped ? 1 : 0, scale: isSwiped ? 1 : 0.8 }}
                transition={{ delay: 0.05 }}
                onClick={() => handleDelete(comment.id)}
                className="w-8 h-8 rounded-full bg-red-500/90 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          )}

          {/* Comment content - swipeable */}
          <motion.div
            drag={isOwner ? "x" : false}
            dragConstraints={{ left: -80, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => handleDragEnd(comment.id, info)}
            animate={{ x: isSwiped ? -80 : 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={() => handleDoubleTap(comment.id)}
            className="flex gap-3 bg-transparent relative z-10 cursor-pointer"
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={comment.profiles.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-white/10 text-white">
                {comment.profiles.username[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">{comment.profiles.username}</span>
                <span className="text-[11px] text-white/40">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false })}
                </span>
              </div>
              
              {isEditing ? (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 bg-white/10 text-white text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white/30"
                    autoFocus
                  />
                  <button
                    onClick={() => handleEdit(comment.id)}
                    className="text-xs text-primary font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent("");
                    }}
                    className="text-xs text-white/50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="text-sm text-white/90 mt-0.5 break-words">{comment.content}</p>
              )}
            </div>

            {/* Like indicator */}
            <div className="flex flex-col items-center justify-center pr-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLiked ? 'liked' : 'not-liked'}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.5 }}
                  transition={{ type: "spring", damping: 15, stiffness: 400 }}
                >
                  <Heart 
                    className={`w-3.5 h-3.5 transition-colors ${
                      isLiked ? 'text-red-500 fill-red-500' : 'text-white/30'
                    }`}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[100vw] sm:max-w-lg h-[60vh] sm:h-[55vh] flex flex-col p-0 gap-0 bg-transparent border-0 shadow-none [&>button]:hidden !rounded-none">
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
