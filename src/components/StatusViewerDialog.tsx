import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, X, MoreHorizontal,
  Smile, Reply, Trash2, Edit2, Music2, Play, Pause
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StatusViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: {
    id: string;
    user_id: string;
    status_text?: string | null;
    emoji?: string | null;
    music_track_name?: string | null;
    music_artist?: string | null;
    music_album_art?: string | null;
    music_preview_url?: string | null;
    like_count?: number;
    comment_count?: number;
  } | null;
  userProfile?: {
    username?: string;
    avatar_url?: string;
  } | null;
}

const quickEmojis = ["❤️", "😂", "😮", "😢", "😍", "🙏", "👍", "🔥"];

const StatusViewerDialog = ({ open, onOpenChange, status, userProfile }: StatusViewerDialogProps) => {
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Audio setup for music status
  useEffect(() => {
    if (status?.music_preview_url) {
      audioRef.current = new Audio(status.music_preview_url);
      audioRef.current.volume = 0.5;
      audioRef.current.addEventListener('ended', () => setIsPlaying(false));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [status?.music_preview_url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Check if current user liked the status
  const { data: isLiked } = useQuery({
    queryKey: ['status-liked', status?.id],
    queryFn: async () => {
      if (!status?.id) return false;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await (supabase
        .from('status_likes' as any)
        .select('id')
        .eq('status_id', status.id)
        .eq('user_id', user.id)
        .maybeSingle() as any);
      return !!data;
    },
    enabled: !!status?.id && open,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['status-comments', status?.id],
    queryFn: async () => {
      if (!status?.id) return [];
      const { data } = await (supabase
        .from('status_comments' as any)
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('status_id', status.id)
        .order('created_at', { ascending: true }) as any);
      return data || [];
    },
    enabled: !!status?.id && open,
  });

  // Fetch reactions
  const { data: reactions = [] } = useQuery({
    queryKey: ['status-reactions', status?.id],
    queryFn: async () => {
      if (!status?.id) return [];
      const { data } = await (supabase
        .from('status_reactions' as any)
        .select('emoji, user_id')
        .eq('status_id', status.id) as any);
      return data || [];
    },
    enabled: !!status?.id && open,
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !status?.id) throw new Error('Not authenticated');
      
      if (isLiked) {
        await (supabase
          .from('status_likes' as any)
          .delete()
          .eq('status_id', status.id)
          .eq('user_id', user.id) as any);
      } else {
        await (supabase
          .from('status_likes' as any)
          .insert({ status_id: status.id, user_id: user.id }) as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-liked', status?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !status?.id) throw new Error('Not authenticated');
      
      await (supabase
        .from('status_comments' as any)
        .insert({
          status_id: status.id,
          user_id: user.id,
          content,
          parent_comment_id: replyingTo,
        }) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', status?.id] });
      setComment("");
      setReplyingTo(null);
      toast({ title: "Comment added" });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !status?.id) throw new Error('Not authenticated');
      
      // Toggle reaction
      const existing = reactions.find(r => r.user_id === user.id && r.emoji === emoji);
      if (existing) {
        await supabase
          .from('status_reactions')
          .delete()
          .eq('status_id', status.id)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
      } else {
        await supabase
          .from('status_reactions')
          .insert({ status_id: status.id, user_id: user.id, emoji });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-reactions', status?.id] });
      setShowEmojiPicker(false);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await (supabase.from('status_comments' as any).delete().eq('id', commentId) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', status?.id] });
      toast({ title: "Comment deleted" });
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await (supabase.from('status_comments' as any).update({ content }).eq('id', id) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', status?.id] });
      setEditingComment(null);
      setEditText("");
      toast({ title: "Comment updated" });
    },
  });

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment);
  };

  // Group reactions by emoji
  const reactionCounts = (reactions as { emoji: string; user_id: string }[]).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!status) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Avatar className="w-10 h-10">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback>{userProfile?.username?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{userProfile?.username || "User"}</p>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Content */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[200px] bg-gradient-to-br from-primary/5 to-accent/5">
          {status.music_track_name ? (
            // Music Status
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-lg">
                {status.music_album_art ? (
                  <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Music2 className="w-10 h-10 text-white" />
                  </div>
                )}
                {status.music_preview_url && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white" />
                    )}
                  </button>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{status.music_track_name}</p>
                <p className="text-muted-foreground">{status.music_artist}</p>
              </div>
            </div>
          ) : (
            // Text Status
            <div className="text-center">
              {status.emoji && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-6xl block mb-4"
                >
                  {status.emoji}
                </motion.span>
              )}
              <p className="text-xl font-medium">{status.status_text}</p>
            </div>
          )}
        </div>

        {/* Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex gap-2 px-4 py-2 flex-wrap">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span
                key={emoji}
                className="px-2 py-1 bg-secondary/50 rounded-full text-sm flex items-center gap-1"
              >
                {emoji} {count as number}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likeMutation.mutate()}
            className="flex items-center gap-2"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{status.like_count || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span>{comments.length}</span>
          </Button>
          <div className="relative ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5" />
            </Button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full right-0 mb-2 bg-background border rounded-xl p-2 shadow-lg flex gap-1"
                >
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addReactionMutation.mutate(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Comments */}
        <ScrollArea className="flex-1 max-h-[250px]">
          <div className="p-4 space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((c: any) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${c.parent_comment_id ? 'ml-8' : ''}`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={c.profiles?.avatar_url} />
                    <AvatarFallback>{c.profiles?.username?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-secondary/50 rounded-xl px-3 py-2">
                      <p className="font-semibold text-sm">{c.profiles?.username || "User"}</p>
                      {editingComment === c.id ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateCommentMutation.mutate({ id: c.id, content: editText })}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm">{c.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      <button
                        onClick={() => setReplyingTo(c.id)}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                      <button
                        onClick={() => {
                          setEditingComment(c.id);
                          setEditText(c.content);
                        }}
                        className="hover:text-foreground flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="hover:text-destructive flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Comment Input */}
        <div className="p-4 border-t">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Reply className="w-4 h-4" />
              <span>Replying to comment</span>
              <button onClick={() => setReplyingTo(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              className="flex-1"
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!comment.trim() || addCommentMutation.isPending}
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

export default StatusViewerDialog;