import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Smile, X, Trash2 } from "lucide-react";
import OptimizedAvatar from "./OptimizedAvatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StatusReactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusId: string;
  statusUserId: string;
  statusText: string;
  emoji?: string | null;
  reactionCount: number;
  replyCount: number;
}

interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface Reply {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const quickEmojis = ["❤️", "🔥", "👍", "😂", "😮", "🎉", "👏", "💯"];

const StatusReactionsDialog = ({
  open,
  onOpenChange,
  statusId,
  statusUserId,
  statusText,
  emoji,
  reactionCount,
  replyCount,
}: StatusReactionsDialogProps) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (open) {
      fetchReactions();
      fetchReplies();

      // Set up realtime subscriptions
      const reactionsChannel = supabase
        .channel(`status-reactions-${statusId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'status_reactions',
            filter: `status_id=eq.${statusId}`,
          },
          () => {
            fetchReactions();
          }
        )
        .subscribe();

      const repliesChannel = supabase
        .channel(`status-replies-${statusId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'status_replies',
            filter: `status_id=eq.${statusId}`,
          },
          () => {
            fetchReplies();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(reactionsChannel);
        supabase.removeChannel(repliesChannel);
      };
    }
  }, [open, statusId]);

  const fetchReactions = async () => {
    const { data, error } = await supabase
      .from("status_reactions")
      .select(`
        id,
        user_id,
        emoji,
        created_at,
        status_id,
        profiles!status_reactions_user_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("status_id", statusId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reactions:", error);
      return;
    }

    setReactions(data as any || []);
  };

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from("status_replies")
      .select(`
        id,
        user_id,
        content,
        created_at,
        status_id,
        profiles!status_replies_user_id_fkey (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("status_id", statusId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching replies:", error);
      return;
    }

    setReplies(data as any || []);
  };

  const handleReaction = async (selectedEmoji: string) => {
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please log in to react",
        variant: "destructive",
      });
      return;
    }

    const existingReaction = reactions.find(
      (r) => r.user_id === currentUserId && r.emoji === selectedEmoji
    );

    if (existingReaction) {
      // Optimistic update
      setReactions(reactions.filter(r => r.id !== existingReaction.id));
      
      // Remove reaction
      const { error } = await supabase
        .from("status_reactions")
        .delete()
        .eq("id", existingReaction.id);
      
      if (error) {
        console.error("Error removing reaction:", error);
        // Revert on error
        setReactions([...reactions]);
        toast({
          title: "Error",
          description: "Failed to remove reaction",
          variant: "destructive",
        });
      }
    } else {
      // Add reaction
      const { data, error } = await supabase
        .from("status_reactions")
        .insert({
          status_id: statusId,
          user_id: currentUserId,
          emoji: selectedEmoji,
        })
        .select(`
          id,
          user_id,
          emoji,
          created_at,
          status_id,
          profiles!status_reactions_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      // Ignore duplicate key errors - already reacted
      if (error && error.code !== '23505') {
        console.error("Error adding reaction:", error);
        toast({
          title: "Error",
          description: "Failed to add reaction",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setReactions([data as any, ...reactions]);
      } else if (!error || error.code === '23505') {
        // Duplicate key - refetch to get correct state
        fetchReactions();
      }
    }
  };

  const handleReply = async () => {
    if (!newReply.trim()) return;
    if (!currentUserId) {
      toast({
        title: "Authentication required",
        description: "Please log in to reply",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("status_replies")
        .insert({
          status_id: statusId,
          user_id: currentUserId,
          content: newReply.trim(),
        })
        .select(`
          id,
          user_id,
          content,
          created_at,
          status_id,
          profiles!status_replies_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        setReplies([...replies, data as any]);
        setNewReply("");
        toast({
          title: "Reply sent!",
        });
      }
    } catch (error: any) {
      console.error("Error adding reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase
      .from("status_replies")
      .delete()
      .eq("id", replyId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete reply",
        variant: "destructive",
      });
      return;
    }

    setReplies(replies.filter(r => r.id !== replyId));
    toast({
      title: "Reply deleted",
    });
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Status</DialogTitle>
        </DialogHeader>

        {/* Status Content */}
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            {emoji && <span className="text-2xl">{emoji}</span>}
            <p className="flex-1">{statusText}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {reactionCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" /> {replyCount}
            </span>
          </div>
        </div>

        {/* Quick Reactions */}
        <div className="flex items-center gap-2 p-2 glass rounded-xl flex-wrap">
          <Smile className="w-4 h-4 text-muted-foreground" />
          {quickEmojis.map((emojiOption) => {
            const userReacted = reactions.find(
              (r) => r.user_id === currentUserId && r.emoji === emojiOption
            );
            return (
              <Button
                key={emojiOption}
                variant={userReacted ? "default" : "ghost"}
                size="sm"
                className="text-xl h-10 w-10 p-0"
                onClick={() => handleReaction(emojiOption)}
              >
                {emojiOption}
              </Button>
            );
          })}
        </div>

        <Tabs defaultValue="replies" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="replies">
              Replies ({replyCount})
            </TabsTrigger>
            <TabsTrigger value="reactions">
              Reactions ({reactionCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="replies" className="flex-1 flex flex-col min-h-0 mt-4">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No replies yet. Be the first to reply!
                  </p>
                ) : (
                  replies.map((reply) => (
                    <div key={reply.id} className="glass rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <OptimizedAvatar
                          src={reply.profiles.avatar_url}
                          alt={reply.profiles.username}
                          fallback={reply.profiles.username[0].toUpperCase()}
                          userId={reply.user_id}
                          className="w-8 h-8"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-normal text-sm">{reply.profiles.full_name}</p>
                          <p className="text-sm break-words">{reply.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(reply.created_at).toLocaleString()}
                          </p>
                        </div>
                        {reply.user_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleDeleteReply(reply.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Reply Input */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Input
                placeholder="Write a reply..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                maxLength={200}
              />
              <Button onClick={handleReply} disabled={loading || !newReply.trim()}>
                Send
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reactions" className="flex-1 mt-4">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {Object.entries(groupedReactions).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reactions yet. Be the first to react!
                  </p>
                ) : (
                  Object.entries(groupedReactions).map(([emojiKey, emojiReactions]) => (
                    <div key={emojiKey} className="glass rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{emojiKey}</span>
                        <span className="text-sm text-muted-foreground">
                          {emojiReactions.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {emojiReactions.map((reaction) => (
                          <div key={reaction.id} className="flex items-center gap-2">
                            <OptimizedAvatar
                              src={reaction.profiles.avatar_url}
                              alt={reaction.profiles.username}
                              fallback={reaction.profiles.username[0].toUpperCase()}
                              userId={reaction.user_id}
                              className="w-6 h-6"
                            />
                            <span className="text-sm">{reaction.profiles.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StatusReactionsDialog;
