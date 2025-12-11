import { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
  Smile, Reply, Trash2, Edit2, Music2, ExternalLink
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
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Reset states when dialog closes or status changes
  useEffect(() => {
    if (!open) {
      setShowComments(false);
      setShowEmojiPicker(false);
      setReplyingTo(null);
      setEditingComment(null);
      setOptimisticLiked(null);
      setOptimisticLikeCount(null);
    }
  }, [open]);

  // Reset optimistic state when status changes
  useEffect(() => {
    setOptimisticLiked(null);
    setOptimisticLikeCount(null);
  }, [status?.id]);


  const handleCommentsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowComments(!showComments);
    if (!showComments) {
      setTimeout(() => commentInputRef.current?.focus(), 100);
    }
  };

  // Check if current user liked the status
  const { data: isLikedFromDb } = useQuery({
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

  // Use optimistic state if available, otherwise use DB state
  const isLiked = optimisticLiked !== null ? optimisticLiked : isLikedFromDb;
  const displayLikeCount = optimisticLikeCount !== null ? optimisticLikeCount : (status?.like_count || 0);

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

  // Like mutation with instant optimistic update
  const likeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !status?.id) throw new Error('Not authenticated');
      
      const currentlyLiked = optimisticLiked !== null ? optimisticLiked : isLikedFromDb;
      
      if (currentlyLiked) {
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
    onMutate: async () => {
      // Instant optimistic update
      const currentlyLiked = optimisticLiked !== null ? optimisticLiked : isLikedFromDb;
      const currentCount = optimisticLikeCount !== null ? optimisticLikeCount : (status?.like_count || 0);
      
      setOptimisticLiked(!currentlyLiked);
      setOptimisticLikeCount(currentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-liked', status?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
    },
    onError: () => {
      // Revert on error
      setOptimisticLiked(null);
      setOptimisticLikeCount(null);
      toast.error("Failed to update like");
    },
  });

  // Add comment mutation with optimistic update
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !status?.id) throw new Error('Not authenticated');
      
      const { data, error } = await (supabase
        .from('status_comments' as any)
        .insert({
          status_id: status.id,
          user_id: user.id,
          content,
          parent_comment_id: replyingTo,
        })
        .select(`*, profiles:user_id (username, avatar_url)`)
        .single() as any);
      
      if (error) throw error;
      return data;
    },
    onMutate: async (content) => {
      // Optimistic update - add comment immediately
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        content,
        user_id: user.id,
        status_id: status?.id,
        parent_comment_id: replyingTo,
        created_at: new Date().toISOString(),
        profiles: {
          username: 'You',
          avatar_url: null,
        }
      };
      
      queryClient.setQueryData(['status-comments', status?.id], (old: any[]) => 
        [...(old || []), optimisticComment]
      );
      
      setComment("");
      setReplyingTo(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', status?.id] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['status-comments', status?.id] });
      toast.error("Failed to add comment");
    },
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Pure transparent backdrop - no frame */}
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={() => onOpenChange(false)}
        />
        <DialogPrimitive.Content 
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onClick={(e) => e.stopPropagation()}
        >

        {/* Frameless Header - floating */}
        <div className="relative flex items-center gap-3 p-4 z-10">
          <Avatar className="w-11 h-11 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/30">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold">
              {userProfile?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-bold text-white text-base">{userProfile?.username || "User"}</p>
            <p className="text-xs text-emerald-400 font-medium">
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
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-11 h-11"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Content - Full screen centered */}
        <div className="relative flex-1 overflow-y-auto flex flex-col items-center justify-center pt-4 pb-24 z-10">
          {/* Music Status Content */}
          {isMusicStatus ? (
            <div className="p-6 flex flex-col items-center">
              {/* Spotify Embed Player - like Music page */}
              {status.music_spotify_url && (
                <div className="w-full max-w-[300px] mb-4">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${status.music_spotify_url.split('/track/')[1]?.split('?')[0]}?utm_source=generator&autoplay=1`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="encrypted-media; autoplay; clipboard-write"
                    title="Spotify Player"
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Fallback Album Art if no Spotify URL */}
              {!status.music_spotify_url && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative group"
                >
                  <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-cyan-500/30 rounded-3xl blur-2xl opacity-60" />
                  <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                    {status.music_album_art ? (
                      <img 
                        src={status.music_album_art} 
                        alt={status.music_track_name || ''} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center">
                        <Music2 className="w-20 h-20 text-white/80" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center text-white/60">
                        <Music2 className="w-10 h-10 mx-auto mb-1" />
                        <span className="text-xs">Open in Spotify to play</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Track info with running marquee */}
              <div className="text-center mt-6 space-y-1 max-w-[280px] overflow-hidden">
                <div className="overflow-hidden">
                  <h3 className={`font-bold text-xl text-white whitespace-nowrap ${(status.music_track_name?.length || 0) > 20 ? 'animate-marquee' : ''}`}>
                    {status.music_track_name}
                  </h3>
                </div>
                <p className="text-white/60 font-medium truncate">{status.music_artist}</p>
              </div>

              {/* Text status if exists alongside music */}
              {status.status_text && !status.status_text.startsWith('🎵') && (
                <div className="mt-4 px-4 py-2 bg-white/5 rounded-xl">
                  <p className="text-white/80 text-sm text-center">{status.status_text}</p>
                  {status.emoji && <span className="text-2xl block text-center mt-1">{status.emoji}</span>}
                </div>
              )}

              {/* Open in Spotify button */}
              {status.music_spotify_url && !status.music_spotify_url.includes('/embed/') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(status.music_spotify_url!, '_blank');
                  }}
                  className="mt-4 px-6 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm font-medium">Open in Spotify</span>
                </button>
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

        {/* Actions Bar - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-8 z-20">
          <div className="flex items-center justify-center gap-3">
            {/* Like Button - larger touch target */}
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                likeMutation.mutate();
              }}
              className={`flex items-center gap-2 rounded-full px-6 py-3 h-auto transition-all duration-150 ${isLiked ? 'bg-red-500/20 text-red-400 scale-105' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            >
              <Heart className={`w-6 h-6 transition-all duration-150 ${isLiked ? 'fill-red-500 scale-110' : ''}`} />
              <span className="font-semibold text-base">{displayLikeCount}</span>
            </Button>

            {/* Comment Button - larger */}
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={handleCommentsClick}
              className={`flex items-center gap-2 rounded-full px-6 py-3 h-auto ${showComments ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
            >
              <MessageCircle className={`w-6 h-6 ${showComments ? 'fill-white/30' : ''}`} />
              <span className="font-semibold text-base">{comments.length}</span>
            </Button>

            {/* Emoji Picker - larger */}
            <div className="relative">
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`rounded-full px-5 py-3 h-auto ${showEmojiPicker ? 'bg-white/15 text-white' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              >
                <Smile className="w-6 h-6" />
              </Button>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute bottom-full right-0 mb-3 bg-black/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl"
                  >
                    <div className="flex gap-2">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            addReactionMutation.mutate(emoji);
                          }}
                          className="text-2xl hover:scale-125 active:scale-95 transition-transform p-2 hover:bg-white/10 rounded-xl"
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

        {/* Comments Section - slides up from bottom */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-background/95 backdrop-blur-xl border-t border-border/30 rounded-t-3xl z-30"
            >
              <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3" />
              <ScrollArea className="max-h-[60vh]">
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default StatusViewerDialog;