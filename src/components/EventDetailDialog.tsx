import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, CheckCircle, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  region: string;
  like_count?: number;
  comment_count?: number;
  attendee_count?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  } | null;
}

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventDetailDialog = ({ event, open, onOpenChange }: EventDetailDialogProps) => {
  const { user } = useAuth();
  const [hasLiked, setHasLiked] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event && open && user) {
      fetchEventData();
    }
  }, [event?.id, open, user]);

  const fetchEventData = async () => {
    if (!event || !user) return;

    // Fetch engagement status
    const [likeRes, attendRes] = await Promise.all([
      supabase.from('event_likes').select('id').eq('event_id', event.id).eq('user_id', user.id).single(),
      supabase.from('event_attendees').select('id').eq('event_id', event.id).eq('user_id', user.id).single()
    ]);

    setHasLiked(!!likeRes.data);
    setIsAttending(!!attendRes.data);

    // Fetch updated counts and comments
    const [eventRes, commentsRes] = await Promise.all([
      supabase.from('events').select('like_count, comment_count, attendee_count').eq('id', event.id).single(),
      supabase.from('event_comments')
        .select('*, profiles!event_comments_user_id_fkey(username, avatar_url, full_name)')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false })
    ]);

    if (eventRes.data) {
      setLikeCount(eventRes.data.like_count || 0);
      setCommentCount(eventRes.data.comment_count || 0);
      setAttendeeCount(eventRes.data.attendee_count || 0);
    }

    if (commentsRes.data) {
      setComments(commentsRes.data as Comment[]);
    }
  };

  const handleLike = async () => {
    if (!event || !user) return;

    if (hasLiked) {
      const { error } = await supabase
        .from('event_likes')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (!error) {
        setHasLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        toast.success('Like removed');
      }
    } else {
      const { error } = await supabase
        .from('event_likes')
        .insert({ event_id: event.id, user_id: user.id });

      if (!error) {
        setHasLiked(true);
        setLikeCount(prev => prev + 1);
        toast.success('Event liked!');
      }
    }
  };

  const handleAttendance = async () => {
    if (!event || !user) return;

    if (isAttending) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (!error) {
        setIsAttending(false);
        setAttendeeCount(prev => Math.max(0, prev - 1));
        toast.success('Removed from attendees');
      }
    } else {
      const { error } = await supabase
        .from('event_attendees')
        .insert({ event_id: event.id, user_id: user.id });

      if (!error) {
        setIsAttending(true);
        setAttendeeCount(prev => prev + 1);
        toast.success("You're going!");
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!event || !user || !newComment.trim()) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('event_comments')
      .insert({ event_id: event.id, user_id: user.id, content: newComment.trim() })
      .select('*, profiles!event_comments_user_id_fkey(username, avatar_url, full_name)')
      .single();

    if (!error && data) {
      setComments(prev => [data as Comment, ...prev]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
      toast.success('Comment added!');
    } else {
      toast.error('Failed to add comment');
    }
    setIsSubmitting(false);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Event Details */}
          <div className="space-y-2">
            {event.event_date && (
              <p className="text-sm text-muted-foreground">
                📅 {new Date(event.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
            <p className="text-sm text-muted-foreground">📍 {event.region}</p>
            {event.description && (
              <p className="text-foreground mt-4">{event.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 py-4 border-y">
            <Button
              variant={hasLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="flex-1"
            >
              <Heart className={`w-4 h-4 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
              Like {likeCount > 0 && `(${likeCount})`}
            </Button>
            <Button
              variant={isAttending ? "default" : "outline"}
              size="sm"
              onClick={handleAttendance}
              className="flex-1"
            >
              <CheckCircle className={`w-4 h-4 mr-2 ${isAttending ? 'fill-current' : ''}`} />
              I'll Go {attendeeCount > 0 && `(${attendeeCount})`}
            </Button>
          </div>

          {/* Comments Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Comments ({commentCount})</span>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {comment.profiles?.avatar_url ? (
                          <img
                            src={comment.profiles.avatar_url}
                            alt={comment.profiles.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold">
                            {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {comment.profiles?.full_name || comment.profiles?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Comment Input */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 min-h-[60px] max-h-[120px]"
                disabled={isSubmitting}
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
