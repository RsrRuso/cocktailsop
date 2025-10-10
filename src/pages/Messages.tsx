import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Search, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  participant_ids: string[];
  last_message_at: string;
  otherUser?: Profile;
  unreadCount?: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations().finally(() => setIsLoading(false));

    let updateTimeout: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => fetchConversations(), 1000);
    };

    const messagesChannel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      clearTimeout(updateTimeout);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .select("*")
      .contains("participant_ids", [user.id])
      .order("last_message_at", { ascending: false });

    if (data && data.length > 0) {
      const otherUserIds = data.map(conv => 
        conv.participant_ids.find((id: string) => id !== user.id)
      ).filter(Boolean);

      // Fetch all profiles and unread counts in parallel
      const [profilesData, unreadCountsData] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .in("id", otherUserIds),
        Promise.all(
          data.map(conv =>
            supabase
              .from("messages")
              .select("*", { count: 'exact', head: true })
              .eq("conversation_id", conv.id)
              .eq("read", false)
              .neq("sender_id", user.id)
          )
        )
      ]);

      const profilesMap = new Map(
        profilesData.data?.map(p => [p.id, p]) || []
      );

      const conversationsWithData = data.map((conv, index) => {
        const otherUserId = conv.participant_ids.find((id: string) => id !== user.id);
        return {
          ...conv,
          otherUser: profilesMap.get(otherUserId),
          unreadCount: unreadCountsData[index].count || 0
        };
      });

      setConversations(conversationsWithData);
    }
  };

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("read", false)
      .neq("sender_id", user.id);

    if (error) {
      toast.error("Failed to mark all as read");
    } else {
      toast.success("All messages marked as read");
      fetchConversations();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold">Messages</h1>
          {conversations.some(c => c.unreadCount && c.unreadCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="glass-hover"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-border/50"
          />
        </div>

        {/* Conversations List */}
        <div className="space-y-2">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center space-y-4 mt-8">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Messages Yet</h3>
                <p className="text-muted-foreground text-sm">
                  Start a conversation with beverage professionals
                </p>
              </div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="glass-hover rounded-xl p-4 flex items-center gap-3 cursor-pointer message-3d transition-all duration-300"
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="relative">
                  <div className="relative w-14 h-14 rounded-full p-[2px] neon-green">
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarImage 
                        src={conversation.otherUser?.avatar_url || undefined}
                        loading="eager"
                      />
                      <AvatarFallback className="text-sm">
                        {conversation.otherUser?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center neon-green animate-pulse">
                      <span className="text-xs font-bold text-primary-foreground">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {conversation.otherUser?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{conversation.otherUser?.username || 'unknown'}
                  </p>
                </div>
                <Send className="w-5 h-5 text-muted-foreground" />
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Messages;
