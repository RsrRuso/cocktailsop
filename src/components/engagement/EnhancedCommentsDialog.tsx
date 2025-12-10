import React, { useState, useEffect, useRef } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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


  const renderComment = (comment: Comment, depth: number = 0, index: number = 0) => {
    const isOwner = user && comment.user_id === user.id;
    const isEditing = editingId === comment.id;
    const isNew = comment.id.startsWith('temp-') || (Date.now() - new Date(comment.created_at).getTime()) < 3000;

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
        <div className={`group relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
          isNew 
            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50' 
            : 'bg-card/30 hover:bg-card/50 border border-border/50 hover:border-primary/30'
        }`}>
          {isNew && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: 2 }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          
          <div className="relative flex gap-2 sm:gap-3">
            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
              <AvatarImage src={comment.profiles.avatar_url || undefined} />
              <AvatarFallback className="text-xs sm:text-sm bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                {comment.profiles.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <span className="font-normal text-[10px] sm:text-xs">{comment.profiles.full_name}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  @{comment.profiles.username}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">•</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    defaultValue={comment.content}
                    className="min-h-[60px] bg-background/50"
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
                <p className="text-xs sm:text-sm mt-0.5 whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">{comment.content}</p>
              )}
              
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 hover:bg-purple-500/10 hover:text-purple-500 transition-colors"
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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingId(comment.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(comment.id)}
                        className="text-destructive"
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
        </div>
        
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
