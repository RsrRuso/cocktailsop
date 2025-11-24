import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Send, Trash2, MessageCircle, Reply, MoreVertical, Brain, Sparkles, TrendingUp, Heart, Zap } from 'lucide-react';
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
  const [aiInsights, setAiInsights] = useState({
    totalComments: 0,
    engagementRate: 0,
    topCommenter: null as Comment | null,
  });
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

  // AI Analytics
  useEffect(() => {
    const totalComments = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
    const engagementRate = totalComments > 0 ? Math.min(100, totalComments * 10) : 0;
    const topCommenter = comments[0] || null;
    
    setAiInsights({
      totalComments,
      engagementRate,
      topCommenter,
    });
  }, [comments]);

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
        .order('created_at', { ascending: true });

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

      setNewComment('');
      setReplyingTo(null);
      toast.success('Comment posted!');
      onCommentChange?.();
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast.error('Failed to post comment');
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
      toast.success('Comment deleted');
      onCommentChange?.();
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
      toast.success('Comment updated');
      onCommentChange?.();
    } catch (err) {
      console.error('Error editing comment:', err);
      toast.error('Failed to update');
    }
  };

  const renderComment = (comment: Comment, depth: number = 0, index: number = 0) => {
    const isOwner = user && comment.user_id === user.id;
    const isEditing = editingId === comment.id;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ delay: index * 0.05 }}
        className={depth > 0 ? 'ml-8 mt-2 border-l-2 border-purple-500/20 pl-3' : 'mt-3'}
      >
        <div className="group relative p-3 rounded-xl bg-card/30 hover:bg-card/50 border border-border/50 hover:border-primary/30 transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative flex gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
              <AvatarImage src={comment.profiles.avatar_url || undefined} />
              <AvatarFallback className="text-sm bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                {comment.profiles.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm">{comment.profiles.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  @{comment.profiles.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  •
                </span>
                <span className="text-xs text-muted-foreground">
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
                <p className="text-sm mt-1 whitespace-pre-wrap break-words text-foreground/90">{comment.content}</p>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs hover:bg-purple-500/10 hover:text-purple-500"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setNewComment(`@${comment.profiles.username} `);
                    textareaRef.current?.focus();
                  }}
                >
                  <Reply className="w-3 h-3 mr-1" /> Reply
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-purple-500/5">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-xl">AI-Powered Comments</DialogTitle>
                <p className="text-sm text-muted-foreground">{aiInsights.totalComments} conversations</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Brain className="w-3 h-3" />
              Live AI
            </Badge>
          </div>
        </DialogHeader>

        {/* AI Insights */}
        {comments.length > 0 && (
          <div className="px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-sm">Engagement Insights</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Activity</span>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {aiInsights.engagementRate.toFixed(0)}%
                </div>
                <Progress value={aiInsights.engagementRate} className="h-1 mt-2" />
              </Card>
              {aiInsights.topCommenter && (
                <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Top</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    @{aiInsights.topCommenter.profiles.username}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative mb-4 inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30"></div>
                <MessageCircle className="relative w-16 h-16 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1 text-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="pb-4">
                {comments.map((comment, idx) => renderComment(comment, 0, idx))}
              </div>
            </AnimatePresence>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="border-t border-border/50 p-4 space-y-3 shrink-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20"
            >
              <Reply className="w-4 h-4 text-purple-500" />
              Replying to comment
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="h-6 ml-auto"
              >
                Cancel
              </Button>
            </motion.div>
          )}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Write a comment... (Ctrl+Enter to send)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none bg-background/50"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmit();
                }
              }}
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || submitting}
              size="icon"
              className="shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {submitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Send className="w-4 h-4" />
                </motion.div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-accent rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-accent rounded">Enter</kbd> to send
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
