import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Trash2, Smile, Heart, ThumbsUp, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Reaction {
  user_id: string;
  emoji: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  reactions: Reaction[];
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const emojis = ["❤️", "😂", "😮", "😢", "🔥", "👏"];

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
      .order("created_at", { ascending: true });

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
            reactions: comment.reactions || [],
            profiles: profile || { username: "Unknown", avatar_url: null }
          };
        })
      );
      
      // Build comment tree
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];
      
      commentsWithProfiles.forEach((comment: Comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });
      
      commentsWithProfiles.forEach((comment: Comment) => {
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
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || loading) return;

    setLoading(true);
    const tableName = isReel ? "reel_comments" : "post_comments";
    
    const insertData = isReel 
      ? { reel_id: postId, user_id: currentUserId, content: newComment.trim(), parent_comment_id: replyingTo }
      : { post_id: postId, user_id: currentUserId, content: newComment.trim(), parent_comment_id: replyingTo };
    
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
      setReplyingTo(null);
      toast.success(replyingTo ? "Reply added!" : "Comment added!");
      fetchComments();
    }
    setLoading(false);
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    const tableName = isReel ? "reel_comments" : "post_comments";
    
    // Get current comment
    const { data: comment, error: fetchError } = await supabase
      .from(tableName as any)
      .select("reactions")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) return;

    const reactions = (comment as any).reactions || [];
    const existingReactionIndex = reactions.findIndex(
      (r: Reaction) => r.user_id === currentUserId && r.emoji === emoji
    );

    let updatedReactions;
    if (existingReactionIndex > -1) {
      // Remove reaction
      updatedReactions = reactions.filter((_: any, i: number) => i !== existingReactionIndex);
    } else {
      // Add reaction
      updatedReactions = [...reactions, { user_id: currentUserId, emoji }];
    }

    const { error } = await supabase
      .from(tableName as any)
      .update({ reactions: updatedReactions })
      .eq("id", commentId);

    if (error) {
      toast.error("Failed to update reaction");
    } else {
      fetchComments();
    }
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

  const renderComment = (comment: Comment, level: number = 0) => (
    <div key={comment.id} className={`flex gap-3 ${level > 0 ? 'ml-8 mt-3' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.profiles.avatar_url || undefined} />
        <AvatarFallback>{comment.profiles.username[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2">
        <div className="bg-muted/30 rounded-2xl px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{comment.profiles.username}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString()}
            </p>
          </div>
          <p className="text-sm mt-1">{comment.content}</p>
        </div>
        
        {/* Reactions display */}
        {comment.reactions && comment.reactions.length > 0 && (
          <div className="flex gap-1 items-center ml-2">
            {Object.entries(
              comment.reactions.reduce((acc: Record<string, number>, r: Reaction) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(comment.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded-full text-xs hover:bg-muted"
              >
                <span>{emoji}</span>
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4 ml-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-0 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <Smile className="w-3 h-3 mr-1" />
                React
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="top">
              <div className="flex gap-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(comment.id, emoji)}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-0 text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setReplyingTo(comment.id)}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            Reply
          </Button>

          {comment.user_id === currentUserId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteComment(comment.id)}
              className="h-6 px-0 text-xs font-semibold text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2">
            {comment.replies.map((reply) => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setReplyingTo(null);
    }}>
      <DialogContent className="glass max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t">
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg">
              <p className="text-sm text-muted-foreground">Replying to comment</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim() || loading}
              className="glow-primary self-end"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
