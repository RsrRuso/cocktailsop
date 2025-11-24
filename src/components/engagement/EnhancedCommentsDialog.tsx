import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Send, Trash2, MessageCircle, Reply, MoreVertical, Brain, Sparkles, TrendingUp, Heart, Zap, Wand2 } from 'lucide-react';
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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiInsights, setAiInsights] = useState({
    totalComments: 0,
    engagementRate: 0,
    topCommenter: null as Comment | null,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);

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

  const fetchAISuggestions = async (text: string, forceNew = false) => {
    if (text.trim().length < 10) {
      setAiSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    console.log('Fetching AI suggestions for:', text);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-comment-rewrite', {
        body: { 
          text: text.trim(), 
          context: `${contentType} comment`,
          timestamp: Date.now()
        }
      });

      console.log('AI response:', data, error);

      if (error) {
        console.error('AI suggestion error:', error);
        throw error;
      }
      
      if (data?.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        setShowSuggestions(true);
        console.log('AI suggestions set:', data.suggestions);
      } else {
        console.log('No suggestions returned');
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

  const handleTextChange = (text: string) => {
    setNewComment(text);
    
    // Clear previous suggestions if text is too short
    if (text.trim().length < 10) {
      setAiSuggestions([]);
      setShowSuggestions(false);
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      return;
    }
    
    // Debounce AI suggestions
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = window.setTimeout(() => {
      fetchAISuggestions(text, false);
    }, 1500);
  };

  const applySuggestion = (suggestion: string) => {
    setNewComment(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, []);

  const renderComment = (comment: Comment, depth: number = 0, index: number = 0) => {
    const isOwner = user && comment.user_id === user.id;
    const isEditing = editingId === comment.id;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className={depth > 0 ? 'ml-6 sm:ml-8 mt-2 border-l-2 border-purple-500/20 pl-2 sm:pl-3' : 'mb-2'}
      >
        <div className="group relative p-2.5 sm:p-3 rounded-xl bg-card/30 hover:bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-200">
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
                <span className="font-semibold text-xs sm:text-sm">{comment.profiles.full_name}</span>
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
      <DialogContent className="max-w-3xl h-[95vh] sm:h-[90vh] w-[98vw] sm:w-[95vw] md:w-full flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-purple-500/5 overflow-hidden">
        <DialogHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-1 sm:p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-base sm:text-xl">AI-Powered Comments</DialogTitle>
                <p className="text-[10px] sm:text-sm text-muted-foreground">{aiInsights.totalComments} conversations</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
              <Brain className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">Live AI</span>
            </Badge>
          </div>
        </DialogHeader>

        {/* AI Insights - Compact */}
        {comments.length > 0 && (
          <div className="px-3 sm:px-6 py-1.5 sm:py-2 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 whitespace-nowrap">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-500" />
                <span className="text-[10px] sm:text-xs font-bold text-purple-500">{aiInsights.engagementRate.toFixed(0)}%</span>
              </div>
              {aiInsights.topCommenter && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 whitespace-nowrap">
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                  <span className="text-[10px] sm:text-xs font-medium text-blue-500">@{aiInsights.topCommenter.profiles.username}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Scrollable Comments Area */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          {/* Top Gradient Fade */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/90 to-transparent z-10 pointer-events-none"></div>
          
          {/* Bottom Gradient Fade */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/90 to-transparent z-10 pointer-events-none"></div>

          <div className="h-full w-full overflow-y-auto custom-scrollbar-advanced"  style={{ scrollBehavior: 'smooth' }}>
            <div className="px-3 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 space-y-2 sm:space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="relative mb-3 sm:mb-4 inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30"></div>
                <MessageCircle className="relative w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1 text-sm sm:text-base text-foreground">No comments yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {comments.map((comment, idx) => renderComment(comment, 0, idx))}
            </AnimatePresence>
          )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border/50 p-3 sm:p-4 space-y-2 sm:space-y-3 shrink-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
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
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => handleTextChange(e.target.value)}
                className="flex-1 min-h-[60px] sm:min-h-[80px] max-h-[120px] resize-none bg-background/50 pr-10 text-sm sm:text-base"
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmit();
                  }
                }}
              />
              
              {/* AI Indicator */}
              {loadingSuggestions && (
                <div className="absolute top-2 right-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Wand2 className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                  </motion.div>
                </div>
              )}
              
              {/* AI Suggestions Popup */}
              <AnimatePresence>
                {showSuggestions && aiSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full mb-2 left-0 right-0 z-50 max-w-full"
                  >
                    <Card className="p-2 sm:p-3 space-y-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 backdrop-blur-xl shadow-2xl">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                        <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" />
                        <span className="text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                          AI Suggestions
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchAISuggestions(newComment, true)}
                          disabled={loadingSuggestions}
                          className="h-5 sm:h-6 px-1.5 sm:px-2 ml-auto"
                        >
                          <Wand2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                          <span className="text-[10px] sm:text-xs">New</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="space-y-1 sm:space-y-1.5 max-h-[150px] sm:max-h-[200px] overflow-y-auto custom-scrollbar">
                        {aiSuggestions.map((suggestion, idx) => (
                          <motion.button
                            key={`${idx}-${suggestion.slice(0, 20)}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => applySuggestion(suggestion)}
                            type="button"
                            className="w-full text-left p-2 sm:p-3 rounded-lg bg-card/50 hover:bg-card border border-border/50 hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-start gap-1.5 sm:gap-2">
                              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-500 mt-0.5 sm:mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <p className="text-[11px] sm:text-sm text-foreground/90 group-hover:text-foreground transition-colors leading-relaxed">
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
            Press <kbd className="px-1.5 py-0.5 text-xs bg-accent rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-accent rounded">Enter</kbd> to send
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
