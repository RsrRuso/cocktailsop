import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Reply, ThumbsUp, Trash2, Edit2, Send } from 'lucide-react';
import { toast } from 'sonner';
import OptimizedAvatar from './OptimizedAvatar';
import { scheduleEventReminder } from '@/lib/eventReminders';

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

export const EventCommentsDialog = ({ eventId, eventTitle, eventDate, open, onOpenChange }: EventCommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

    // Check if comment indicates attendance and schedule reminder
    const attendanceKeywords = ['i\'m going', 'im going', 'i am going', 'count me in', 'i\'ll be there', 'ill be there'];
    if (attendanceKeywords.some(keyword => commentText.toLowerCase().includes(keyword))) {
      const scheduled = await scheduleEventReminder(eventTitle, eventDate || null);
      if (scheduled) {
        toast.success('Comment posted! Reminder saved on device');
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
      // Remove reaction
      updatedReactions = reactions.filter(r => !(r.user_id === currentUserId && r.emoji === emoji));
    } else {
      // Add reaction
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

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = comment.user_id === currentUserId;
    const isEditing = editingCommentId === comment.id;

    const reactions = comment.reactions || [];
    const emojiCounts = reactions.reduce((acc, reaction) => {
      acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-12 mt-2' : ''}`}>
        <OptimizedAvatar
          src={comment.profiles?.avatar_url}
          alt={comment.profiles?.username || 'User'}
          className="w-8 h-8"
          showStatus={false}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {comment.profiles?.username || 'Anonymous'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCommentId(null);
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

              <div className="flex items-center gap-2 flex-wrap">
                {['👍', '❤️', '😊'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleReaction(comment.id, emoji)}
                  >
                    {emoji} {emojiCounts[emoji] || 0}
                  </Button>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyToId(comment.id)}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>

                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditContent(comment.content);
                      }}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments: {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
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
        </ScrollArea>

        <div className="px-6 pb-6 border-t pt-4 flex-shrink-0">
          {replyToId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Reply className="w-4 h-4" />
              <span>Replying to comment</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setReplyToId(null)}
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
              className="min-h-[80px]"
            />
            <Button onClick={handleSubmitComment} size="icon" className="flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
