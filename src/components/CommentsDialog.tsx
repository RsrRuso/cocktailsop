import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  isReel?: boolean;
}

const CommentsDialog = ({ open, onOpenChange, postId, isReel = false }: CommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCurrentUser();
      fetchComments();

      // Set up realtime subscription
      const reelChannel = isReel ? supabase
        .channel(`reel-comments-${postId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reel_comments',
            filter: `reel_id=eq.${postId}`
          },
          () => fetchComments()
        )
        .subscribe() : null;

      const postChannel = !isReel ? supabase
        .channel(`comments-${postId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_comments',
            filter: `post_id=eq.${postId}`
          },
          () => fetchComments()
        )
        .subscribe() : null;

      return () => {
        if (reelChannel) supabase.removeChannel(reelChannel);
        if (postChannel) supabase.removeChannel(postChannel);
      };
    }
  }, [open, postId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchComments = async () => {
    const tableName = isReel ? "reel_comments" : "post_comments";
    const columnName = isReel ? "reel_id" : "post_id";
    
    const { data: commentsData } = await supabase
      .from(tableName as any)
      .select("*")
      .eq(columnName, postId)
      .order("created_at", { ascending: false });

    if (commentsData) {
      // Fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        commentsData.map(async (comment: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profile || { username: "Unknown", avatar_url: null }
          };
        })
      );
      setComments(commentsWithProfiles);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || loading) return;

    setLoading(true);
    const tableName = isReel ? "reel_comments" : "post_comments";
    
    const insertData = isReel 
      ? { reel_id: postId, user_id: currentUserId, content: newComment.trim() }
      : { post_id: postId, user_id: currentUserId, content: newComment.trim() };
    
    console.log('Inserting comment:', { tableName, insertData });
    
    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData as any)
      .select();

    if (error) {
      console.error('Failed to add comment:', error);
      toast.error(`Failed to add comment: ${error.message}`);
    } else {
      console.log('Comment added successfully:', data);
      
      // Get post/reel owner to send notification
      const ownerTable = isReel ? 'reels' : 'posts';
      const { data: itemData } = await supabase
        .from(ownerTable)
        .select('user_id')
        .eq('id', postId)
        .single();

      // Get current user info for notification
      const { data: userData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();

      // Create notification if commenter is not the owner
      if (itemData && userData && itemData.user_id !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: itemData.user_id,
          type: 'comment',
          content: `${userData.username} commented on your ${isReel ? 'reel' : 'post'}`,
          read: false
        });
      }
      
      setNewComment("");
      toast.success("Comment added!");
      fetchComments();
    }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const tableName = isReel ? "reel_comments" : "post_comments";
    
    console.log('Deleting comment:', { tableName, commentId });
    
    const { error } = await supabase
      .from(tableName as any)
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error('Failed to delete comment:', error);
      toast.error(`Failed to delete comment: ${error.message}`);
    } else {
      console.log('Comment deleted successfully');
      toast.success("Comment deleted");
      fetchComments();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.profiles.avatar_url || undefined} />
                  <AvatarFallback>{comment.profiles.username[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{comment.profiles.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
                {comment.user_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            className="flex-1"
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || loading}
            className="glow-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
