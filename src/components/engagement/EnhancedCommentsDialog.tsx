import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MessageCircle, Send, Heart, MoreVertical, Trash2, Edit2, Reply, Brain, Sparkles, TrendingUp, Zap, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  content_id: string;
  content_type: string;
  parent_comment_id: string | null;
  profiles: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
  likes: number;
  replies?: Comment[];
}

interface AISuggestions {
  positive: string[];
  negative: string[];
  questions: string[];
}

interface AIInsights {
  totalComments: number;
  engagementRate: number;
  topCommenter: Comment | null;
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface EnhancedCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: string;
  onCommentChange?: () => void;
}

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
  const [aiInsights, setAiInsights] = useState<AIInsights>({
    totalComments: 0,
    engagementRate: 0,
    topCommenter: null,
    sentimentAnalysis: {
      positive: 0,
      negative: 0,
      neutral: 0,
    },
  });

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('content_id', contentId)
        .eq('content_type', contentType)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to load comments. Please try again.');
        return;
      }

      if (data) {
        const commentsWithReplies = await Promise.all(
          data.map(async (comment) => {
            const { data: repliesData, error: repliesError } = await supabase
              .from('comments')
              .select(`
                *,
                profiles (
                  username,
                  avatar_url,
                  full_name
                )
              `)
              .eq('content_id', contentId)
              .eq('content_type', contentType)
              .eq('parent_comment_id', comment.id)
              .order('created_at', { ascending: true });

            if (repliesError) {
              console.error('Error fetching replies:', repliesError);
              return comment;
            }

            return { ...comment, replies: repliesData || [] };
          })
        );

        setComments(commentsWithReplies as Comment[]);
        calculateAIInsights(commentsWithReplies as Comment[]);
      }
    } finally {
      setLoading(false);
    }
  }, [contentId, contentType]);

  const calculateAIInsights = (comments: Comment[]) => {
    const totalComments = comments.length;
    const positiveSentiment = comments.filter((comment) => comment.content.length > 10).length;
    const negativeSentiment = comments.filter((comment) => comment.content.length <= 5).length;
    const engagementRate = totalComments > 0 ? (positiveSentiment / totalComments) * 100 : 0;
    const topCommenter = comments.sort((a, b) => b.content.length - a.content.length)[0] || null;

    setAiInsights({
      totalComments,
      engagementRate,
      topCommenter,
      sentimentAnalysis: {
        positive: positiveSentiment,
        negative: negativeSentiment,
        neutral: totalComments - positiveSentiment - negativeSentiment,
      },
    });
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments, contentId, contentType]);

  const handleSubmitComment = async () => {
    if (!user || submitting) return;

    setSubmitting(true);
    try {
      const { data: comment, error } = await supabase
        .from('comments')
        .insert([
          {
            content: newComment,
            user_id: user.id,
            content_id: contentId,
            content_type: contentType,
            parent_comment_id: replyingTo,
          },
        ])
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            full_name
          )
        `)
        .single();

      if (error) {
        console.error('Error submitting comment:', error);
        toast.error('Failed to submit comment. Please try again.');
        return;
      }

      if (comment) {
        setComments((prevComments) => {
          if (replyingTo) {
            return prevComments.map((c) => {
              if (c.id === replyingTo) {
                return { ...c, replies: [...(c.replies || []), comment] };
              }
              return c;
            });
          } else {
            return [...prevComments, comment];
          }
        });
        setNewComment('');
        setReplyingTo(null);
        onCommentChange?.();
        calculateAIInsights([...comments, comment]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    // Implement like functionality here
    toast.success('Liked!');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        toast.error('Failed to delete comment. Please try again.');
        return;
      }

      setComments((prevComments) => prevComments.filter((comment) => comment.id !== commentId));
      onCommentChange?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ content: editContent })
        .eq('id', editingComment)
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            full_name
          )
        `)
        .single();

      if (error) {
        console.error('Error updating comment:', error);
        toast.error('Failed to update comment. Please try again.');
        return;
      }

      if (data) {
        setComments((prevComments) =>
          prevComments.map((comment) => (comment.id === editingComment ? { ...comment, content: data.content } : comment))
        );
        setEditingComment(null);
        setEditContent('');
        onCommentChange?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAISuggestions = async (text: string) => {
    if (!text.trim()) {
      setAiSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: AISuggestions = await response.json();
      setAiSuggestions([...result.positive, ...result.negative, ...result.questions]);
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
      toast.error('Failed to get AI suggestions. Please try again.');
      setAiSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewComment(text);
    setShowSuggestions(true);

    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      fetchAISuggestions(text);
    }, 500);
  };

  const renderComment = (comment: Comment, level: number, idx: number) => (
    <motion.div
      key={comment.id}
      layout
      className={`ml-${level * 4} sm:ml-${level * 6} pl-0 sm:pl-4 border-l border-border/50 last:border-none`}
    >
      <Card className="bg-transparent border-none shadow-none">
        <div className="flex items-start space-x-3">
          <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
            <AvatarImage src={comment.profiles?.avatar_url} alt={comment.profiles?.username} />
            <AvatarFallback>{comment.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium leading-none">{comment.profiles?.full_name || comment.profiles?.username}</div>
              <div className="flex-shrink-0 space-x-1 text-muted-foreground">
                <Button variant="ghost" size="icon" className="hover:bg-secondary/50">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="relative group">
                  <MoreVertical className="w-4 h-4" />
                  <div className="absolute top-full right-0 mt-1 z-10 hidden group-hover:block w-40 bg-secondary rounded-md shadow-md border border-border overflow-hidden">
                    {user?.id === comment.user_id && (
                      <>
                        <Button
                          variant="ghost"
                          className="justify-start w-full hover:bg-secondary/50 data-[state=open]:bg-secondary/50"
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="justify-start w-full hover:bg-secondary/50 data-[state=open]:bg-secondary/50"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      className="justify-start w-full hover:bg-secondary/50 data-[state=open]:bg-secondary/50"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                  </div>
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <time dateTime={comment.created_at} title={new Date(comment.created_at).toLocaleDateString()}>
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </time>
            </div>
            {editingComment === comment.id ? (
              <div className="mt-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Edit your comment..."
                  className="mb-2"
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingComment(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleUpdateComment} disabled={submitting}>
                    Update
                  </Button>
                </div>
              </div>
            ) : (
              <motion.p layout className="text-sm mt-2 text-foreground">
                {comment.content}
              </motion.p>
            )}
            <AnimatePresence>
              {comment.replies &&
                comment.replies.map((reply, idx) => (
                  <motion.div layout key={reply.id}>
                    {renderComment(reply, level + 1, idx)}
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] w-[98vw] sm:w-full flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-purple-500/5">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-1.5 sm:p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl">AI-Powered Comments</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">{aiInsights.totalComments} conversations</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline">Live AI</span>
            </Badge>
          </div>
        </DialogHeader>

        {/* AI Insights - Compact */}
        {comments.length > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20">
                <Zap className="w-3 h-3 text-purple-500" />
                <span className="text-xs font-bold text-purple-500">{aiInsights.engagementRate.toFixed(0)}%</span>
              </div>
              {aiInsights.topCommenter && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-blue-500">@{aiInsights.topCommenter.profiles.username}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Scrollable Comments Area */}
        <div className="relative flex-1 min-h-0">
          {/* Top Gradient Fade */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/90 to-transparent z-10 pointer-events-none"></div>
          
          {/* Scroll Indicator Top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
              className="text-purple-500"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-30">
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </div>
          
          
          <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar-advanced">
            <div className="px-4 sm:px-6 pt-6 pb-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-4 inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30"></div>
                <MessageCircle className="relative w-16 h-16 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1 text-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {comments.map((comment, idx) => renderComment(comment, 0, idx))}
            </AnimatePresence>
          )}
            </div>
          </div>
        </div>

        {/* Comment Form */}
        <div className="px-4 sm:px-6 py-4 border-t border-border/50 shrink-0">
          {replyingTo && (
            <div className="mb-3 p-3 rounded-md bg-secondary text-sm">
              Replying to{' '}
              <Button variant="link" size="sm" onClick={() => setReplyingTo(null)}>
                @{comments.find((c) => c.id === replyingTo)?.profiles?.username}
                <Edit2 className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
          <div className="relative">
            <Textarea
              value={newComment}
              onChange={handleInputChange}
              placeholder="Add your comment..."
              className="pr-12"
            />
            <div className="absolute top-2 right-2 flex items-center space-x-2">
              {loadingSuggestions ? (
                <Sparkles className="animate-spin w-4 h-4 text-muted-foreground" />
              ) : (
                <Wand2
                  className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                />
              )}
              <Button size="sm" onClick={handleSubmitComment} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {showSuggestions && aiSuggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">AI Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((suggestion, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => {
                      setNewComment(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
