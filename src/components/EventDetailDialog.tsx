import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, CheckCircle, Send, Pencil, Trash2, Smile, Reply, MoreVertical, CalendarPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { scheduleEventReminder, addToCalendar } from '@/lib/eventReminders';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  region: string;
  user_id: string;
  like_count?: number;
  comment_count?: number;
  attendee_count?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  reactions: Array<{ emoji: string; user_id: string }>;
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
  onEventUpdated?: () => void;
}

export const EventDetailDialog = ({ event, open, onOpenChange, onEventUpdated }: EventDetailDialogProps) => {
  const { user } = useAuth();
  const [hasLiked, setHasLiked] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  useEffect(() => {
    if (event && open && user) {
      fetchEventData();
      setEditTitle(event.title);
      setEditDescription(event.description || '');
      setEditDate(event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '');
      setIsEditing(false);
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
        .order('created_at', { ascending: true })
    ]);

    if (eventRes.data) {
      setLikeCount(eventRes.data.like_count || 0);
      setCommentCount(eventRes.data.comment_count || 0);
      setAttendeeCount(eventRes.data.attendee_count || 0);
    }

    if (commentsRes.data) {
      setComments(commentsRes.data.map(c => ({
        ...c,
        reactions: (c.reactions as unknown as Array<{ emoji: string; user_id: string }>) || []
      })) as Comment[]);
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
        
        // Schedule reminder and suggest calendar
        const scheduled = await scheduleEventReminder(event.title, event.event_date);
        
        // Show suggestion to add to calendar
        toast.success("You're going!", {
          action: {
            label: 'Add to Calendar',
            onClick: async () => {
              const added = await addToCalendar(event.title, event.event_date, event.description || undefined);
              if (added) {
                toast.success('Added to calendar!');
              } else {
                toast.error('Could not add to calendar');
              }
            },
          },
          duration: 6000,
        });
      }
    }
  };

  const handleSubmitComment = async () => {
    if (!event || !user || !newComment.trim()) return;

    setIsSubmitting(true);
    const commentText = newComment.trim();
    const { data, error } = await supabase
      .from('event_comments')
      .insert({ 
        event_id: event.id, 
        user_id: user.id, 
        content: commentText,
        parent_comment_id: replyToId 
      })
      .select('*, profiles!event_comments_user_id_fkey(username, avatar_url, full_name)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, {
        ...data,
        reactions: (data.reactions as unknown as Array<{ emoji: string; user_id: string }>) || []
      } as Comment]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
      setReplyToId(null);
      
      // Check if comment indicates attendance
      const attendanceKeywords = ['i\'m going', 'im going', 'i am going', 'count me in', 'i\'ll be there', 'ill be there'];
      if (attendanceKeywords.some(keyword => commentText.toLowerCase().includes(keyword))) {
        const scheduled = await scheduleEventReminder(event.title, event.event_date);
        
        toast.success('Comment added!', {
          action: {
            label: 'Add to Calendar',
            onClick: async () => {
              const added = await addToCalendar(event.title, event.event_date, event.description || undefined);
              if (added) {
                toast.success('Added to calendar!');
              } else {
                toast.error('Could not add to calendar');
              }
            },
          },
          duration: 6000,
        });
      } else {
        toast.success('Comment added!');
      }
    } else {
      toast.error('Failed to add comment');
    }
    setIsSubmitting(false);
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!user) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const reactions = comment.reactions || [];
    const existingReaction = reactions.find(r => r.user_id === user.id && r.emoji === emoji);

    let newReactions;
    if (existingReaction) {
      newReactions = reactions.filter(r => !(r.user_id === user.id && r.emoji === emoji));
    } else {
      newReactions = [...reactions, { emoji, user_id: user.id }];
    }

    const { error } = await supabase
      .from('event_comments')
      .update({ reactions: newReactions })
      .eq('id', commentId);

    if (!error) {
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, reactions: newReactions } : c
      ));
    }
    setShowEmojiPicker(null);
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    const { error } = await supabase
      .from('event_comments')
      .update({ content: editCommentContent.trim() })
      .eq('id', commentId)
      .eq('user_id', user?.id);

    if (!error) {
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, content: editCommentContent.trim() } : c
      ));
      setEditingCommentId(null);
      setEditCommentContent('');
      toast.success('Comment updated!');
    } else {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('event_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user?.id);

    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => Math.max(0, prev - 1));
      toast.success('Comment deleted!');
    } else {
      toast.error('Failed to delete comment');
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isOwner = user && comment.user_id === user.id;
    const isEditing = editingCommentId === comment.id;
    const reactionCounts: Record<string, number> = {};
    
    (comment.reactions || []).forEach(r => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });

    const replyToComment = comments.find(c => c.id === comment.parent_comment_id);

    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-8 mt-2' : ''}`}>
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
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditingCommentId(comment.id);
                    setEditCommentContent(comment.content);
                  }}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteComment(comment.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {replyToComment && (
            <p className="text-xs text-muted-foreground mb-1">
              Replying to @{replyToComment.profiles?.username}
            </p>
          )}
          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <Input
                value={editCommentContent}
                onChange={(e) => setEditCommentContent(e.target.value)}
                className="flex-1 h-8"
              />
              <Button size="sm" onClick={() => handleEditComment(comment.id)}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingCommentId(null);
                setEditCommentContent('');
              }}>Cancel</Button>
            </div>
          ) : (
            <p className="text-sm mt-1">{comment.content}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Popover open={showEmojiPicker === comment.id} onOpenChange={(open) => setShowEmojiPicker(open ? comment.id : null)}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  <Smile className="w-3 h-3 mr-1" /> React
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="flex gap-1">
                  {['👍', '❤️', '😂', '😮', '😢', '🎉'].map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReaction(comment.id, emoji)}
                      className="h-8 w-8 p-0"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => {
                setReplyToId(comment.id);
                setNewComment(`@${comment.profiles?.username} `);
              }}
            >
              <Reply className="w-3 h-3 mr-1" /> Reply
            </Button>
          </div>
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex gap-1 mt-2">
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <Button
                  key={emoji}
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => handleReaction(comment.id, emoji)}
                >
                  {emoji} {count}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleUpdateEvent = async () => {
    if (!event || !user) return;

    const { error } = await supabase
      .from('events')
      .update({
        title: editTitle,
        description: editDescription,
        event_date: editDate || null,
      })
      .eq('id', event.id)
      .eq('user_id', user.id);

    if (!error) {
      toast.success('Event updated!');
      setIsEditing(false);
      onEventUpdated?.();
    } else {
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !user) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id)
      .eq('user_id', user.id);

    if (!error) {
      toast.success('Event deleted!');
      onOpenChange(false);
      onEventUpdated?.();
    } else {
      toast.error('Failed to delete event');
    }
    setShowDeleteDialog(false);
  };

  const isCreator = event && user && event.user_id === user.id;

  if (!event) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <div className="p-6 flex-shrink-0">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
                {isCreator && !isEditing && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-hidden px-6 pb-6 flex flex-col">
            <div className="flex flex-col gap-4 flex-shrink-0">
              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-date">Event Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateEvent}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
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
                    <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">Comments ({commentCount})</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-4 min-h-0">
                      <div className="space-y-4 pb-4">
                        {comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No comments yet. Be the first to comment!
                          </p>
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
                    </div>

                    {/* Comment Input */}
                    <div className="pt-4 border-t space-y-2 flex-shrink-0">
                    {replyToId && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Reply className="w-4 h-4" />
                        Replying to comment
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setReplyToId(null);
                            setNewComment('');
                          }}
                          className="h-6"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
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
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
