import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Send, Heart, Edit2, Trash2, Reply, Brain, Sparkles, TrendingUp, Zap, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  reaction_count?: number;
  reply_count?: number;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
  replies?: Comment[];
}

interface EnhancedCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: 'post' | 'reel' | 'story' | 'music_share' | 'event';
  onCommentChange?: () => void;
}

const getTableConfig = (contentType: string) => {
  const configs: Record<string, { table: string; idColumn: string; reactionsTable?: string }> = {
    post: { table: 'post_comments', idColumn: 'post_id' },
    reel: { table: 'reel_comments', idColumn: 'reel_id' },
    story: { table: 'story_comments', idColumn: 'story_id' },
    music_share: { table: 'music_share_comments', idColumn: 'music_share_id' },
    event: { table: 'event_comments', idColumn: 'event_id', reactionsTable: 'event_comment_reactions' },
  };
  return configs[contentType] || configs.post;
};

export const EnhancedCommentsDialog = ({
  open,
  onOpenChange,
  contentId,
  contentType,
  onCommentChange,
}: EnhancedCommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>();

  const config = getTableConfig(contentType);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(config.table as any)
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_comment_id,
          reaction_count,
          reply_count,
          profiles(username, avatar_url, full_name)
        `)
        .eq(config.idColumn, contentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Organize comments with replies
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      (data || []).forEach((comment: any) => {
        const formattedComment: Comment = {
          ...comment,
          replies: [],
        };
        commentMap.set(comment.id, formattedComment);
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
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && contentId) {
      fetchComments();
    }
  }, [open, contentId, contentType]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || !user || submitting) return;

    setSubmitting(true);
    try {
      const insertData: any = {
        [config.idColumn]: contentId,
        user_id: user.id,
        content: newComment.trim(),
      };

      if (replyingTo) {
        insertData.parent_comment_id = replyingTo;
      }

      const { error } = await supabase
        .from(config.table as any)
        .insert(insertData);

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      setShowSuggestions(false);
      await fetchComments();
      toast.success('Comment posted!');
    } catch (err) {
      console.error('Error posting comment:', err);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from(config.table as any)
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await fetchComments();
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingComment || !editContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from(config.table as any)
        .update({ content: editContent.trim() })
        .eq('id', editingComment);

      if (error) throw error;

      setEditingComment(null);
      setEditContent('');
      await fetchComments();
      toast.success('Comment updated');
    } catch (err) {
      console.error('Error updating comment:', err);
      toast.error('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAISuggestions = async (text: string, force = false) => {
    if (text.trim().length < 10 && !force) {
      setAiSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-comment-rewrite', {
        body: { text: text.trim() },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        setAiSuggestions(data.suggestions);
        setShowSuggestions(true);
      } else {
        setAiSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setAiSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewComment(text);

    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    if (text.trim().length >= 10) {
      suggestionTimeoutRef.current = setTimeout(() => {
        fetchAISuggestions(text);
      }, 1500);
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setNewComment(suggestion);
    setShowSuggestions(false);
  };

  const renderComment = (comment: Comment, level: number = 0) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${level > 0 ? 'ml-8 pl-4 border-l-2 border-border/30' : ''}`}
    >
      <div className="flex gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.profiles?.avatar_url || ''} />
          <AvatarFallback>{comment.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">{comment.profiles?.full_name || comment.profiles?.username}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            {user?.id === comment.user_id && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(comment.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit} disabled={submitting}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm">{comment.content}</p>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(comment.id)}
                  className="h-7 px-2"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                {comment.reply_count > 0 && (
                  <span className="text-xs text-muted-foreground">{comment.reply_count} replies</span>
                )}
              </div>
            </>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.replies.map((reply) => renderComment(reply, level + 1))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const totalComments = comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-purple-500/5">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse" />
                <div className="relative p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-xl">AI-Powered Comments</DialogTitle>
                <p className="text-sm text-muted-foreground">{totalComments} conversations</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline">Live AI</span>
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable Comments Area */}
        <div className="relative flex-1 min-h-0">
          {/* Top Gradient */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/90 to-transparent z-10 pointer-events-none" />

          <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar-advanced">
            <div className="px-6 pt-6 pb-6 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
                  </div>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-16">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-1">No comments yet</p>
                  <p className="text-sm text-muted-foreground">Start the conversation!</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {comments.map((comment) => renderComment(comment))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/90 to-transparent z-10 pointer-events-none" />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t border-border/50 p-4 space-y-3 shrink-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20"
            >
              <Reply className="w-4 h-4" />
              <span>Replying to comment</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="ml-auto h-6 w-6 p-0"
              >
                ×
              </Button>
            </motion.div>
          )}

          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <Textarea
                value={newComment}
                onChange={handleInputChange}
                placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmit();
                  }
                }}
              />

              {/* AI Suggestions */}
              <AnimatePresence>
                {showSuggestions && aiSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full mb-2 left-0 right-0 z-50"
                  >
                    <Card className="p-3 space-y-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 backdrop-blur-xl shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                          AI Suggestions
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchAISuggestions(newComment, true)}
                          disabled={loadingSuggestions}
                          className="h-6 px-2 ml-auto"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          <span className="text-xs">New</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                        {aiSuggestions.map((suggestion, idx) => (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => applySuggestion(suggestion)}
                            type="button"
                            className="w-full text-left p-3 rounded-lg bg-card/50 hover:bg-card border border-border/50 hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-start gap-2">
                              <Sparkles className="w-3 h-3 text-pink-500 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <p className="text-sm text-foreground/90 group-hover:text-foreground transition-colors">
                                {suggestion}
                              </p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
            Press <kbd className="px-1.5 py-0.5 text-xs bg-accent rounded">Ctrl</kbd> +{' '}
            <kbd className="px-1.5 py-0.5 text-xs bg-accent rounded">Enter</kbd> to send
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
