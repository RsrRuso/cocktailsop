import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface AdvancedStoryCommentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  onCommentAdded?: () => void;
}

export function AdvancedStoryComments({
  open,
  onOpenChange,
  storyId,
  onCommentAdded,
}: AdvancedStoryCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch comments
  useEffect(() => {
    if (!open || !storyId) return;
    fetchComments();
  }, [open, storyId]);

  // Real-time comment updates
  useEffect(() => {
    if (!open || !storyId) return;

    const channel = supabase
      .channel(`story-comments-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'story_comments',
          filter: `story_id=eq.${storyId}`,
        },
        async (payload) => {
          // Fetch the complete comment with profile
          const { data } = await supabase
            .from('story_comments')
            .select('*, profiles(username, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setComments(prev => [...prev, data as Comment]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, storyId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('story_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as Comment[]);
      
      // Scroll to bottom after loading
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('story_comments')
        .insert({
          story_id: storyId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;

      // Update comment count - fetch current, increment, and update
      const { data: storyData } = await supabase
        .from('stories')
        .select('comment_count')
        .eq('id', storyId)
        .single();

      if (storyData) {
        await supabase
          .from('stories')
          .update({ comment_count: (storyData.comment_count || 0) + 1 })
          .eq('id', storyId);
      }

      // Optimistically add to UI (real-time will handle it, but this is faster)
      setComments(prev => [...prev, data as Comment]);
      setNewComment('');
      onCommentAdded?.();
      
      // Scroll to show new comment
      setTimeout(scrollToBottom, 100);

    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <ScrollArea ref={scrollRef} className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.profiles.avatar_url || ''} />
                    <AvatarFallback>
                      {comment.profiles.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {comment.profiles.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm break-words">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              disabled={isSubmitting}
              className="flex-1"
              maxLength={500}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
