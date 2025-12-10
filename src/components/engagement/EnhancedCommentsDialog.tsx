import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Trash2, MessageCircle, Reply, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ContentType, Comment, getEngagementConfig } from '@/types/engagement';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHaptic } from '@/hooks/useHaptic';

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😍', '🙏', '👍', '🔥'];

interface EnhancedCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
  onCommentChange?: () => void;
}

export const EnhancedCommentsDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
  onCommentChange
}: EnhancedCommentsDialogProps) => {
  const { user } = useAuth();
  const haptic = useHaptic();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, string[]>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (open) {
      loadComments();
      textareaRef.current?.focus();

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
          () => loadComments()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, contentId, contentType]);

  useEffect(() => {
    setTotalComments(comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0));
  }, [comments]);

  const loadComments = async () => {
    try {
      setLoading(true);

      // Fetch comments without joining profiles (no FK relationship exists)
      const { data: commentsData, error: commentsError } = await supabase
        .from(config.tables.comments as any)
        .select(`id, user_id, content, created_at, parent_comment_id, reactions`)
        .eq(config.tables.idColumn, contentId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get unique user IDs and fetch their profiles separately
      const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .in('id', userIds);

      // Create a map for quick profile lookup
      const profilesMap = new Map<string, any>();
      (profilesData || []).forEach((p: any) => {
        profilesMap.set(p.id, p);
      });

      // Merge comments with profiles
      const commentsWithProfiles = commentsData.map((comment: any) => {
        const profile = profilesMap.get(comment.user_id) || {
          username: 'user',
          avatar_url: null,
          full_name: 'User'
        };
        return {
          ...comment,
          profiles: {
            username: profile.username || 'user',
            avatar_url: profile.avatar_url,
            full_name: profile.full_name || 'User'
          }
        };
      });

      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      commentsWithProfiles.forEach((comment: any) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      commentsWithProfiles.forEach((comment: any) => {
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || !user) return;

    const commentContent = newComment.trim();
    const parentId = replyingTo;
    
    // Clear input immediately for instant feedback
    setNewComment('');
    setReplyingTo(null);
    setSubmitting(true);
    
    // Optimistic update - add comment immediately to UI
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      content: commentContent,
      created_at: new Date().toISOString(),
      parent_comment_id: parentId || null,
      profiles: {
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        avatar_url: user.user_metadata?.avatar_url || null,
        full_name: user.user_metadata?.full_name || 'User',
      },
      replies: [],
    };

    if (parentId) {
      // Add reply to parent
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), optimisticComment] };
        }
        return c;
      }));
    } else {
      // Add as new root comment
      setComments(prev => [...prev, optimisticComment]);
    }

    try {
      const insertData: any = {
        [config.tables.idColumn]: contentId,
        user_id: user.id,
        content: commentContent,
      };

      if (parentId) {
        insertData.parent_comment_id = parentId;
      }

      const { error } = await supabase
        .from(config.tables.comments as any)
        .insert(insertData);

      if (error) throw error;
      
      // Realtime will update with the real comment
      onCommentChange?.();
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error('Failed to post comment');
      // Remove optimistic comment on error
      loadComments();
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
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete');
    }
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from(config.tables.comments as any)
        .update({ content: newContent })
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;
      setEditingId(null);
    } catch (err) {
      console.error('Error editing comment:', err);
      toast.error('Failed to update');
    }
  };

  const handleReaction = useCallback((commentId: string, emoji: string) => {
    haptic.mediumTap();
    setCommentReactions(prev => ({
      ...prev,
      [commentId]: [...(prev[commentId] || []), emoji]
    }));
    setShowEmojiPicker(null);
    toast.success(`Reacted with ${emoji}`);
  }, [haptic]);

  const handleLongPressStart = useCallback((commentId: string) => {
    longPressTimer.current = setTimeout(() => {
      haptic.heavyTap();
      setShowEmojiPicker(commentId);
    }, 400); // 400ms for long press
  }, [haptic]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSwipe = useCallback((commentId: string, info: PanInfo, comment: Comment) => {
    // Swipe left to reply (negative x)
    if (info.offset.x < -80) {
      haptic.lightTap();
      setReplyingTo(commentId);
      setNewComment(`@${comment.profiles.username} `);
      textareaRef.current?.focus();
    }
  }, [haptic]);


  const renderComment = (comment: Comment, depth: number = 0, index: number = 0) => {
    const isOwner = user && comment.user_id === user.id;
    const isEditing = editingId === comment.id;
    const isNew = comment.id.startsWith('temp-') || (Date.now() - new Date(comment.created_at).getTime()) < 3000;
    const reactions = commentReactions[comment.id] || [];
    const showingEmojis = showEmojiPicker === comment.id;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          x: 0, 
          scale: 1,
          boxShadow: isNew ? '0 0 20px rgba(168, 85, 247, 0.4)' : 'none'
        }}
        exit={{ opacity: 0, x: -30, scale: 0.9 }}
        transition={{ 
          type: 'spring',
          stiffness: 400,
          damping: 25,
          delay: index * 0.05 
        }}
        className={`${depth > 0 ? 'ml-6 sm:ml-8 mt-2 border-l-2 border-purple-500/30 pl-2 sm:pl-3' : 'mb-2'} ${isNew ? 'animate-pulse' : ''}`}
      >
        <motion.div 
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => handleSwipe(comment.id, info, comment)}
          onTouchStart={() => handleLongPressStart(comment.id)}
          onTouchEnd={handleLongPressEnd}
          onMouseDown={() => handleLongPressStart(comment.id)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          className={`group relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 cursor-grab active:cursor-grabbing ${
            isNew 
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50' 
              : 'bg-black/30 backdrop-blur-sm hover:bg-black/40 border border-white/10 hover:border-primary/30'
          }`}
        >
          {/* Swipe hint */}
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
            <Reply className="w-4 h-4 text-primary" />
          </div>

          {isNew && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: 2 }}
            />
          )}
          
          <div className="relative flex gap-2 sm:gap-3">
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
              <AvatarImage src={comment.profiles.avatar_url || undefined} />
              <AvatarFallback className="text-xs sm:text-sm bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                {comment.profiles.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="font-normal text-[10px] sm:text-xs text-white">{comment.profiles.full_name}</span>
                <span className="text-[10px] sm:text-xs text-white/60">
                  @{comment.profiles.username}
                </span>
                <span className="text-[10px] sm:text-xs text-white/60">•</span>
                <span className="text-[10px] sm:text-xs text-white/60">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    defaultValue={comment.content}
                    className="min-h-[60px] bg-black/50 border-white/20 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleEdit(comment.id, e.currentTarget.value);
                      }
                      if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={(e) => {
                      const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                      handleEdit(comment.id, textarea.value);
                    }}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm mt-0.5 whitespace-pre-wrap break-words text-white/90 leading-relaxed">{comment.content}</p>
              )}
              
              {/* Reactions display */}
              {reactions.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {reactions.map((emoji, idx) => (
                    <span key={idx} className="text-sm">{emoji}</span>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 text-white/70 hover:bg-purple-500/20 hover:text-purple-400 transition-colors"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setNewComment(`@${comment.profiles.username} `);
                    textareaRef.current?.focus();
                  }}
                >
                  <Reply className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" /> Reply
                </Button>
                
                {isOwner && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-white/70 hover:text-white">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/20">
                      <DropdownMenuItem onClick={() => setEditingId(comment.id)} className="text-white hover:bg-white/10">
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(comment.id)}
                        className="text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Emoji Picker on Long Press */}
          <AnimatePresence>
            {showingEmojis && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl rounded-full px-3 py-2 flex gap-1 border border-white/20 shadow-xl z-50"
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(comment.id, emoji)}
                    className="text-xl hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        <AnimatePresence>
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply, idx) => renderComment(reply, depth + 1, idx))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] sm:h-[75vh] w-[95vw] flex flex-col p-0 gap-0 !bg-transparent border-0 shadow-none overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 shrink-0 bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg font-semibold text-white drop-shadow-lg">Comments</DialogTitle>
              <span className="text-xs text-white/80 drop-shadow-lg">({totalComments})</span>
            </div>
          </div>
        </DialogHeader>


        {/* Scrollable Comments Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-white/50 mx-auto mb-3 drop-shadow-lg" />
                <p className="font-medium mb-1 text-white drop-shadow-lg">No comments yet</p>
                <p className="text-sm text-white/70 drop-shadow-lg">Be the first to comment!</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {comments.map((comment, idx) => renderComment(comment, 0, idx))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 shrink-0 bg-transparent">
          {replyingTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg mb-2">
              <Reply className="w-4 h-4" />
              Replying...
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="h-6 ml-auto text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Add comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 min-h-[44px] max-h-[100px] resize-none bg-black/40 backdrop-blur-lg border-0 text-sm text-white placeholder:text-white/50 rounded-2xl px-4 py-2.5"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || submitting}
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
