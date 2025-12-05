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

  // Audio setup for music status - auto-play when dialog opens with loop
  useEffect(() => {
    if (open && status?.music_preview_url) {
      audioRef.current = new Audio(status.music_preview_url);
      audioRef.current.volume = 0.5;
      audioRef.current.loop = true; // Enable looping for continuous playback
      
      // Auto-play when dialog opens
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log('Auto-play blocked:', err);
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        audioRef.current = null;
      }
    };
  }, [open, status?.music_preview_url]);

  const togglePlay = () => {
    // Create audio if it doesn't exist
    if (!audioRef.current && status?.music_preview_url) {
      audioRef.current = new Audio(status.music_preview_url);
      audioRef.current.volume = 0.5;
      audioRef.current.loop = true; // Enable looping
    }
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.log('Playback error:', err));
    }
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
      <DialogContent className="sm:max-w-md max-h-[90vh] p-0 overflow-hidden flex flex-col bg-transparent border-none shadow-none backdrop-blur-xl">
        {/* Header - Transparent */}
        <div className="flex items-center gap-3 p-4">
          <Avatar className="w-10 h-10 ring-2 ring-white/20">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-white/10">{userProfile?.username?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-white">{userProfile?.username || "User"}</p>
            <p className="text-xs text-white/60">Status</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Content - Transparent */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
          {status.music_track_name ? (
            // Music Status - Transparent
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-white/20">
                {status.music_album_art ? (
                  <img src={status.music_album_art} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Music2 className="w-12 h-12 text-white" />
                  </div>
                )}
                {status.music_preview_url && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/40 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-12 h-12 text-white drop-shadow-lg" />
                    ) : (
                      <Play className="w-12 h-12 text-white drop-shadow-lg" />
                    )}
                  </button>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-xl text-white">{status.music_track_name}</p>
                <p className="text-white/70">{status.music_artist}</p>
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
              <p className="text-xl font-medium text-white">{status.status_text}</p>
            </div>
          )}
        </div>

        {/* Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex gap-2 px-4 py-2 flex-wrap">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span
                key={emoji}
                className="px-2 py-1 bg-white/10 rounded-full text-sm flex items-center gap-1 text-white"
              >
                {emoji} {count as number}
              </span>
            ))}
          </div>
        )}

        {/* Actions - Frameless */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likeMutation.mutate()}
            className="flex items-center gap-2 text-white hover:bg-white/10"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            <span className="text-white">{status.like_count || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-2 text-white hover:bg-white/10">
            <MessageCircle className="w-5 h-5" />
            <span>{comments.length}</span>
          </Button>
          <div className="relative ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-white hover:bg-white/10"
            >
              <Smile className="w-5 h-5" />
            </Button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute bottom-full right-0 mb-2 bg-black/80 backdrop-blur-lg border border-white/20 rounded-xl p-2 shadow-lg flex gap-1"
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
              <p className="text-center text-white/50 text-sm py-4">
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
                  <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-white/20">
                    <AvatarImage src={c.profiles?.avatar_url} />
                    <AvatarFallback className="bg-white/10 text-white">{c.profiles?.username?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
                      <p className="font-semibold text-sm text-white">{c.profiles?.username || "User"}</p>
                      {editingComment === c.id ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="h-8 text-sm bg-white/10 border-white/20 text-white"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateCommentMutation.mutate({ id: c.id, content: editText })}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-white/90">{c.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                      <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                      <button
                        onClick={() => setReplyingTo(c.id)}
                        className="hover:text-white flex items-center gap-1"
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                      <button
                        onClick={() => {
                          setEditingComment(c.id);
                          setEditText(c.content);
                        }}
                        className="hover:text-white flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="hover:text-red-400 flex items-center gap-1"
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

        {/* Comment Input - Transparent */}
        <div className="p-4 border-t border-white/10">
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 text-sm text-white/50">
              <Reply className="w-4 h-4" />
              <span>Replying to comment</span>
              <button onClick={() => setReplyingTo(null)} className="ml-auto text-white/70 hover:text-white">
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
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!comment.trim() || addCommentMutation.isPending}
              size="icon"
              className="bg-white/20 hover:bg-white/30 text-white"
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