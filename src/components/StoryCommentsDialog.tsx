import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { commentSchema } from "@/lib/validation";

interface StoryCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  onCommentAdded?: () => void;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

interface CurrentUserProfile {
  username: string;
  avatar_url: string | null;
  full_name: string;
}

const StoryCommentsDialog = ({ open, onOpenChange, storyId, onCommentAdded }: StoryCommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (open && storyId) {
      fetchComments();
    }
  }, [open, storyId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      
      // Fetch user profile for optimistic updates
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url, full_name")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setCurrentUserProfile(profile);
      }
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("story_comments")
      .select(`
        id,
        user_id,
        content,
        created_at,
        profiles (username, avatar_url, full_name)
      `)
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComments(data as any);
    }
    setLoading(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    // Validate input
    const validation = commentSchema.safeParse({ content: newComment });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Instant optimistic update with real user data or fallback
    const tempComment: Comment = {
      id: 'temp-' + Date.now(),
      user_id: currentUserId,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      profiles: currentUserProfile || { username: 'You', avatar_url: null, full_name: 'You' }
    };
    
    setComments(prev => [tempComment, ...prev]);
    const commentText = newComment.trim();
    setNewComment("");
    onCommentAdded?.(); // Increment count instantly

    // Background API call - no await, instant UI
    (async () => {
      try {
        const { data, error } = await supabase
          .from("story_comments")
          .insert({
            story_id: storyId,
            user_id: currentUserId,
            content: commentText,
          })
          .select();
        
        if (error) {
          console.error('Story comment error:', error.code);
          toast.error("Failed to post comment");
          setComments(prev => prev.filter(c => c.id !== tempComment.id));
          setNewComment(commentText);
        } else if (data && data.length > 0) {
          console.log('Story comment posted');
        }
      } catch (err) {
        console.error('Comment failed');
        toast.error("Failed to post comment");
        setComments(prev => prev.filter(c => c.id !== tempComment.id));
        setNewComment(commentText);
      }
    })();
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("story_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      toast.error("Failed to delete comment");
    } else {
      toast.success("Comment deleted");
      fetchComments();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments
          </DialogTitle>
          <DialogDescription>
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                    <AvatarFallback>{comment.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{comment.profiles.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {comment.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm mt-1.5 break-words leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmitComment} className="flex gap-2 p-4 border-t bg-background/95 backdrop-blur">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            disabled={submitting}
            className="flex-1 h-11 bg-muted/50 border-0 focus-visible:ring-1"
            autoComplete="off"
            autoFocus
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={submitting || !newComment.trim()}
            className="h-11 w-11 glow-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoryCommentsDialog;
