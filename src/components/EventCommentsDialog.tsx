import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Reply, Trash2, Edit2, Send, X, Heart } from 'lucide-react';
import { toast } from 'sonner';
import OptimizedAvatar from './OptimizedAvatar';
import { scheduleEventReminder, addToCalendar } from '@/lib/eventReminders';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  event_id: string;
  parent_comment_id: string | null;
  created_at: string;
  reactions: Reaction[] | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface EventCommentsDialogProps {
  eventId: string | null;
  eventTitle: string;
  eventDate?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventCommentsDialog = ({ eventId, eventTitle, eventDate, open, onOpenChange }: EventCommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const lastTapRef = useRef<{ time: number; commentId: string | null }>({ time: 0, commentId: null });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (eventId && open) {
      fetchComments();
    }
  }, [eventId, open]);

  const fetchComments = async () => {
    if (!eventId) return;

    const { data, error } = await supabase
      .from('event_comments')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments((data || []) as unknown as Comment[]);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !eventId || !currentUserId) return;

    const commentText = newComment.trim();
    const { error } = await supabase.from('event_comments').insert({
      content: commentText,
      event_id: eventId,
      user_id: currentUserId,
      parent_comment_id: replyToId,
    });

    if (error) {
      toast.error('Failed to post comment');
      return;
    }

    setNewComment('');
    setReplyToId(null);
    fetchComments();

    const attendanceKeywords = ["i'm going", 'im going', 'i am going', 'count me in', "i'll be there", 'ill be there'];
    if (attendanceKeywords.some(keyword => commentText.toLowerCase().includes(keyword))) {
      await scheduleEventReminder(eventTitle, eventDate || null);
      const added = await addToCalendar(eventTitle, eventDate || null);
      
      if (added) {
        toast.success('Comment posted! Event saved to calendar');
      } else {
        toast.success('Comment posted!');
      }
    } else {
      toast.success('Comment posted!');
    }
  };

  const handleDoubleTapLike = async (commentId: string) => {
    if (!currentUserId) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const reactions = comment.reactions || [];
    const hasLiked = reactions.some(r => r.user_id === currentUserId && r.emoji === '❤️');

    let updatedReactions;
    if (hasLiked) {
      updatedReactions = reactions.filter(r => !(r.user_id === currentUserId && r.emoji === '❤️'));
      setLikedComments(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      updatedReactions = [...reactions, { emoji: '❤️', user_id: currentUserId }];
      setLikedComments(prev => new Set(prev).add(commentId));
    }

    const { error } = await supabase
      .from('event_comments')
      .update({ reactions: updatedReactions })
      .eq('id', commentId);

    if (!error) {
      fetchComments();
    }
  };

  const handleTap = (commentId: string) => {
    const now = Date.now();
    const { time, commentId: lastId } = lastTapRef.current;
    
    if (now - time < 300 && lastId === commentId) {
      // Double tap detected
      handleDoubleTapLike(commentId);
      lastTapRef.current = { time: 0, commentId: null };
    } else {
      lastTapRef.current = { time: now, commentId };
    }
  };

  const handleSwipeEnd = (commentId: string, info: PanInfo) => {
    if (info.offset.x > 80) {
      // Swipe right - Reply
      setReplyToId(commentId);
    } else if (info.offset.x < -80) {
      // Swipe left - Like
      handleDoubleTapLike(commentId);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from('event_comments')
      .update({ content: editContent })
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to update comment');
      return;
    }

    toast.success('Comment updated!');
    setEditingCommentId(null);
    setEditContent('');
    fetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('event_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to delete comment');
      return;
    }

    toast.success('Comment deleted!');
    fetchComments();
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = comment.user_id === currentUserId;
    const isEditing = editingCommentId === comment.id;
    const reactions = comment.reactions || [];
    const likeCount = reactions.filter(r => r.emoji === '❤️').length;
    const hasLiked = reactions.some(r => r.user_id === currentUserId && r.emoji === '❤️');
    const x = useMotionValue(0);
    const replyOpacity = useTransform(x, [0, 80], [0, 1]);
    const likeOpacity = useTransform(x, [-80, 0], [1, 0]);

    return (
      <div key={comment.id} className={`relative ${isReply ? 'ml-10 mt-3' : ''}`}>
        {/* Swipe indicators */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <motion.div style={{ opacity: replyOpacity }} className="text-primary">
            <Reply className="w-5 h-5" />
          </motion.div>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <motion.div style={{ opacity: likeOpacity }} className="text-red-500">
            <Heart className="w-5 h-5 fill-current" />
          </motion.div>
        </div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => handleSwipeEnd(comment.id, info)}
          onClick={() => handleTap(comment.id)}
          style={{ x }}
          className="flex gap-3 bg-transparent relative z-10 py-2"
        >
          <OptimizedAvatar
            src={comment.profiles?.avatar_url}
            alt={comment.profiles?.username || 'User'}
            className="w-9 h-9"
            showStatus={false}
            userId={comment.user_id}
            showOnlineIndicator={true}
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-white">
                {comment.profiles?.username || 'Anonymous'}
              </span>
              <span className="text-[10px] text-white/40">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[60px] bg-white/5 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditComment(comment.id)}
                    className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-full"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditContent('');
                    }}
                    className="px-3 py-1.5 bg-white/10 text-white/70 text-xs rounded-full"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/90 leading-relaxed">{comment.content}</p>
                
                {/* Inline engagement - minimal */}
                <div className="flex items-center gap-4 pt-1">
                  {likeCount > 0 && (
                    <span className={`text-xs ${hasLiked ? 'text-red-400' : 'text-white/40'}`}>
                      ❤️ {likeCount}
                    </span>
                  )}
                  
                  {isOwner && (
                    <div className="flex items-center gap-3 ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCommentId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="text-[10px] text-white/40"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComment(comment.id);
                        }}
                        className="text-[10px] text-red-400/60"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Heart animation on double tap */}
          <AnimatePresence>
            {likedComments.has(comment.id) && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="w-12 h-12 text-red-500 fill-current" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 bg-transparent border-0 shadow-none [&>button]:hidden">
        {/* Transparent overlay with blur */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xl rounded-2xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-5 h-5 text-white/60" />
              <span className="font-medium text-white/90">{eventTitle}</span>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Gesture hint */}
          <div className="px-5 pb-2">
            <p className="text-[10px] text-white/30 text-center">
              Double-tap to like • Swipe right to reply • Swipe left to like
            </p>
          </div>

          {/* Comments list */}
          <ScrollArea className="flex-1 px-5">
            <div className="space-y-2 pb-4">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">No comments yet</p>
                  <p className="text-white/20 text-xs mt-1">Be the first to comment!</p>
                </div>
              ) : (
                <>
                  {comments
                    .filter(c => !c.parent_comment_id)
                    .map((comment) => (
                      <div key={comment.id}>
                        {renderComment(comment)}
                        {comments
                          .filter(c => c.parent_comment_id === comment.id)
                          .map(reply => renderComment(reply, true))}
                      </div>
                    ))}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 flex-shrink-0">
            <AnimatePresence>
              {replyToId && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-xs text-white/50 mb-2 px-1 overflow-hidden"
                >
                  <Reply className="w-3 h-3" />
                  <span>Replying to comment</span>
                  <button
                    onClick={() => setReplyToId(null)}
                    className="text-white/70 ml-auto"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                className="flex-1 bg-white/5 rounded-full px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
              <button 
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
              >
                <Send className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
