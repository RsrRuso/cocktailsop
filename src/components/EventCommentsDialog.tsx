import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Reply, Trash2, Edit2, Send, X, Heart, Smile, ThumbsUp, Sparkles, Flame } from 'lucide-react';
import { toast } from 'sonner';
import OptimizedAvatar from './OptimizedAvatar';
import { scheduleEventReminder, addToCalendar } from '@/lib/eventReminders';
import { motion, AnimatePresence } from 'framer-motion';

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

const REACTION_EMOJIS = ['👍', '❤️', '😊', '🔥', '✨', '👏'];

export const EventCommentsDialog = ({ eventId, eventTitle, eventDate, open, onOpenChange }: EventCommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

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

    // Check if comment indicates attendance
    const attendanceKeywords = ['i\'m going', 'im going', 'i am going', 'count me in', 'i\'ll be there', 'ill be there'];
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

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!currentUserId) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const reactions = comment.reactions || [];
    const existingReaction = reactions.find(r => r.user_id === currentUserId && r.emoji === emoji);

    let updatedReactions;
    if (existingReaction) {
      updatedReactions = reactions.filter(r => !(r.user_id === currentUserId && r.emoji === emoji));
    } else {
      updatedReactions = [...reactions, { emoji, user_id: currentUserId }];
    }

    const { error } = await supabase
      .from('event_comments')
      .update({ reactions: updatedReactions })
      .eq('id', commentId);

    if (error) {
      toast.error('Failed to update reaction');
      return;
    }

    setShowReactionPicker(null);
    fetchComments();
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

  const getReactionIcon = (emoji: string) => {
    switch (emoji) {
      case '❤️': return <Heart className="w-3 h-3" />;
      case '🔥': return <Flame className="w-3 h-3" />;
      case '✨': return <Sparkles className="w-3 h-3" />;
      default: return null;
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = comment.user_id === currentUserId;
    const isEditing = editingCommentId === comment.id;

    const reactions = comment.reactions || [];
    const emojiCounts = reactions.reduce((acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasUserReacted = (emoji: string) => reactions.some(r => r.user_id === currentUserId && r.emoji === emoji);
    const totalReactions = Object.values(emojiCounts).reduce((a, b) => a + b, 0);

    return (
      <motion.div 
        key={comment.id} 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : ''}`}
      >
        <OptimizedAvatar
          src={comment.profiles?.avatar_url}
          alt={comment.profiles?.username || 'User'}
          className="w-9 h-9 ring-1 ring-white/10"
          showStatus={false}
          userId={comment.user_id}
          showOnlineIndicator={true}
        />
        <div className="flex-1 space-y-2">
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
                className="w-full min-h-[60px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-white/20"
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

              {/* Compact reaction display */}
              {totalReactions > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {Object.entries(emojiCounts).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(comment.id, emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                        hasUserReacted(emoji) 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{count}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons - Instagram style */}
              <div className="flex items-center gap-3 pt-1">
                {/* Quick reactions */}
                <div className="relative">
                  <button
                    onClick={() => setShowReactionPicker(showReactionPicker === comment.id ? null : comment.id)}
                    className="text-white/50 hover:text-white/80 transition-colors"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  
                  <AnimatePresence>
                    {showReactionPicker === comment.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                        className="absolute bottom-full left-0 mb-2 flex gap-1 bg-black/90 backdrop-blur-xl rounded-full px-2 py-1.5 border border-white/10 shadow-xl z-50"
                      >
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(comment.id, emoji)}
                            className={`w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-all hover:scale-125 ${
                              hasUserReacted(emoji) ? 'bg-white/20' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setReplyToId(comment.id)}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" />
                  Reply
                </button>

                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 bg-black/80 backdrop-blur-2xl border-0 shadow-2xl overflow-hidden">
        {/* Header - Frameless with blur */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 text-white/70" />
            <span className="font-medium text-white">{eventTitle}</span>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Comments list */}
        <ScrollArea className="flex-1 px-5">
          <div className="space-y-5 pb-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/50 text-sm">No comments yet</p>
                <p className="text-white/30 text-xs mt-1">Be the first to comment!</p>
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

        {/* Input area - Floating style */}
        <div className="px-4 pb-4 pt-2 flex-shrink-0">
          {replyToId && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs text-white/50 mb-2 px-1"
            >
              <Reply className="w-3 h-3" />
              <span>Replying to comment</span>
              <button
                onClick={() => setReplyToId(null)}
                className="text-white/70 hover:text-white ml-auto"
              >
                Cancel
              </button>
            </motion.div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                className="w-full bg-white/5 border-0 rounded-full px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
            >
              <Send className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
