import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

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

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      .order("last_message_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const otherUserIds = data.map(conv => 
        conv.participant_ids.find((id: string) => id !== user.id)
      ).filter(Boolean);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", otherUserIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      // Get unread counts for each conversation
      const unreadCountsMap = new Map<string, number>();
      for (const conv of data) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: 'exact', head: true })
          .eq("conversation_id", conv.id)
          .eq("read", false)
          .neq("sender_id", user.id);
        
        unreadCountsMap.set(conv.id, count || 0);
      }

      const conversationsWithData = data.map((conv) => {
        const otherUserId = conv.participant_ids.find((id: string) => id !== user.id);
        return {
          ...conv,
          otherUser: profilesMap.get(otherUserId),
          unreadCount: unreadCountsMap.get(conv.id) || 0
        };
      });

      setConversations(conversationsWithData);
    }
  };

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("read", false)
      .neq("sender_id", user.id);
    
    fetchConversations();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold">Messages</h1>
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
                  <OptimizedAvatar
                    src={conversation.otherUser?.avatar_url}
                    alt={conversation.otherUser?.username || 'User'}
                    fallback={conversation.otherUser?.username?.[0]?.toUpperCase() || '?'}
                    userId={conversation.otherUser?.id}
                    className="w-14 h-14"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {conversation.otherUser?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{conversation.otherUser?.username || 'unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {conversation.unreadCount! > 0 && (
                    <Badge variant="default" className="bg-primary">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                  <Send className="w-5 h-5 text-muted-foreground" />
                </div>
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
