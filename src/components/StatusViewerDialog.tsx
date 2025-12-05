import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, MessageCircle, Send, X,
  Smile, Reply, Trash2, Edit2, Music2, Play, Pause,
  Volume2, VolumeX, RotateCcw, ExternalLink
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
    music_spotify_url?: string | null;
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
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Reset states when dialog opens/closes
  useEffect(() => {
    if (open) {
      // If no preview URL, set error state immediately (no toast needed)
      const hasPreview = !!status?.music_preview_url;
      setAudioError(!hasPreview && !!status?.music_track_name);
      setAudioLoaded(false);
      setIsPlaying(false);
    } else {
      setShowComments(false);
      setShowEmojiPicker(false);
      setReplyingTo(null);
      setEditingComment(null);
      setIsPlaying(false);
    }
  }, [open, status?.music_preview_url, status?.music_track_name]);

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      setAudioLoaded(true);
      setAudioError(false);
    };

    const handleError = () => {
      setAudioError(true);
      setAudioLoaded(false);
      setIsPlaying(false);
    };

    const handleEnded = () => {
      // Loop playback
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [status?.music_preview_url]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    const audio = audioRef.current;
    if (!audio || audioError || !status?.music_preview_url) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Silently handle - no toast, just show unavailable state
        setAudioError(true);
      });
    }
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const audio = audioRef.current;
    if (!audio || !status?.music_preview_url) return;
    
    audio.currentTime = 0;
    audio.play().catch(() => {
      setAudioError(true);
    });
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  };

  const handleCommentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowComments(!showComments);
    if (!showComments) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
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
        .select(`*, profiles:user_id (username, avatar_url)`)
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
    onError: () => toast.error("Failed to update like"),
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
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !status?.id) throw new Error('Not authenticated');
      
      const existing = reactions.find((r: any) => r.user_id === user.id && r.emoji === emoji);
      if (existing) {
        await (supabase
          .from('status_reactions' as any)
          .delete()
          .eq('status_id', status.id)
          .eq('user_id', user.id)
          .eq('emoji', emoji) as any);
      } else {
        await (supabase
          .from('status_reactions' as any)
          .insert({ status_id: status.id, user_id: user.id, emoji }) as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-reactions', status?.id] });
      setShowEmojiPicker(false);
    },
    onError: () => toast.error("Failed to add reaction"),
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await (supabase.from('status_comments' as any).delete().eq('id', commentId) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', status?.id] });
      toast.success("Comment deleted");
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
      toast.success("Comment updated");
    },
  });

  const handleSubmitComment = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment);
  };

  // Group reactions by emoji
  const reactionCounts = (reactions as { emoji: string; user_id: string }[]).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!status) return null;

  const isMusicStatus = !!status.music_track_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg max-h-[95vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-gradient-to-b from-black/95 via-black/90 to-black/95 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden audio element */}
        {status.music_preview_url && (
          <audio
            ref={audioRef}
            src={status.music_preview_url}
            preload="auto"
            loop
          />
        )}

        {/* Header with glassmorphism */}
        <div className="flex items-center gap-3 p-4 bg-white/5 border-b border-white/10">
          <Avatar className="w-11 h-11 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold">
              {userProfile?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-bold text-white text-base">{userProfile?.username || "User"}</p>
            <p className="text-xs text-emerald-400/80 font-medium">
              {isMusicStatus ? "🎵 Listening now" : "Status"}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => {
              e.stopPropagation();
              onOpenChange(false);
            }} 
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Music Status Content */}
          {isMusicStatus ? (
            <div className="p-6 flex flex-col items-center">
              {/* Album Art with Controls */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative group"
              >
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-cyan-500/30 rounded-3xl blur-2xl opacity-60" />
                
                {/* Album art */}
                <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                  {status.music_album_art ? (
                    <img 
                      src={status.music_album_art} 
                      alt={status.music_track_name || ''} 
                      className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-105' : 'scale-100'}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center">
                      <Music2 className="w-20 h-20 text-white/80" />
                    </div>
                  )}
                  
                  {/* Play overlay */}
                  <button
                    onClick={togglePlay}
                    disabled={audioError}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 hover:bg-black/50 transition-all"
                  >
                    {audioError ? (
                      <div className="text-center text-white/60">
                        <Music2 className="w-10 h-10 mx-auto mb-1" />
                        <span className="text-xs">Preview unavailable</span>
                      </div>
                    ) : isPlaying ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Pause className="w-8 h-8 text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/50"
                      >
                        <Play className="w-8 h-8 text-white ml-1" />
                      </motion.div>
                    )}
                  </button>

                  {/* Playing indicator */}
                  {isPlaying && !audioError && (
                    <div className="absolute bottom-3 left-3 flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-emerald-400 rounded-full"
                          animate={{ height: [8, 16, 8] }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Track info */}
              <div className="text-center mt-6 space-y-1">
                <h3 className="font-bold text-xl text-white">{status.music_track_name}</h3>
                <p className="text-white/60 font-medium">{status.music_artist}</p>
              </div>

              {/* Audio controls */}
              {status.music_preview_url && !audioError && (
                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  {status.music_spotify_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        window.open(status.music_spotify_url!, '_blank');
                      }}
                      className="w-10 h-10 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Text/Emoji Status */
            <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
              {status.emoji && (
                <motion.span
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-7xl block mb-4"
                >
                  {status.emoji}
                </motion.span>
              )}
              <p className="text-xl font-medium text-white text-center max-w-xs">{status.status_text}</p>
            </div>
          )}

          {/* Reactions Display */}
          {Object.keys(reactionCounts).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 px-4 py-3 flex-wrap justify-center"
            >
              {Object.entries(reactionCounts).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-full text-sm flex items-center gap-1.5 text-white cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    addReactionMutation.mutate(emoji);
                  }}
                >
                  <span className="text-base">{emoji}</span>
                  <span className="font-medium">{count as number}</span>
                </span>
              ))}
            </motion.div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="border-t border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-center gap-2">
            {/* Like Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                likeMutation.mutate();
              }}
              className={`flex items-center gap-2 rounded-full px-4 ${isLiked ? 'bg-red-500/20 text-red-400' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} />
              <span className="font-medium">{status.like_count || 0}</span>
            </Button>

            {/* Comment Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCommentsClick}
              className={`flex items-center gap-2 rounded-full px-4 ${showComments ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <MessageCircle className={`w-5 h-5 ${showComments ? 'fill-white/30' : ''}`} />
              <span className="font-medium">{comments.length}</span>
            </Button>

            {/* Emoji Picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`rounded-full px-4 ${showEmojiPicker ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              >
                <Smile className="w-5 h-5" />
              </Button>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl"
                  >
                    <div className="flex gap-1">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            addReactionMutation.mutate(emoji);
                          }}
                          className="text-2xl hover:scale-125 active:scale-95 transition-transform p-1.5 hover:bg-white/10 rounded-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/10"
            >
              <ScrollArea className="max-h-[300px]">
                <div className="p-4 space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-white/40 text-sm py-6">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((c: any) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex gap-3 ${c.parent_comment_id ? 'ml-10' : ''}`}
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-white/10">
                          <AvatarImage src={c.profiles?.avatar_url} />
                          <AvatarFallback className="bg-white/10 text-white text-xs">
                            {c.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2">
                            <p className="font-semibold text-sm text-white">{c.profiles?.username || "User"}</p>
                            {editingComment === c.id ? (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="h-8 text-sm bg-white/10 border-white/20 text-white"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCommentMutation.mutate({ id: c.id, content: editText });
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600"
                                >
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-white/80 mt-0.5">{c.content}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40 px-1">
                            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingTo(c.id);
                              }}
                              className="hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingComment(c.id);
                                setEditText(c.content);
                              }}
                              className="hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCommentMutation.mutate(c.id);
                              }}
                              className="hover:text-red-400 flex items-center gap-1 transition-colors"
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
              <div className="p-4 border-t border-white/10 bg-white/5">
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-white/50">
                    <Reply className="w-4 h-4" />
                    <span>Replying to comment</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyingTo(null);
                      }} 
                      className="ml-auto text-white/70 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    ref={commentInputRef}
                    placeholder="Write a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        handleSubmitComment();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full px-4"
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!comment.trim() || addCommentMutation.isPending}
                    size="icon"
                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white w-10 h-10"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default StatusViewerDialog;