import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  useEffect(() => {
    fetchConversations();
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

    if (data) {
      // Fetch profiles and unread counts for each conversation
      const conversationsWithData = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = conv.participant_ids.find((id: string) => id !== user.id);
          
          // Get other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", otherUserId)
            .single();

          // Get unread message count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: 'exact', head: true })
            .eq("conversation_id", conv.id)
            .eq("read", false)
            .neq("sender_id", user.id);

          return {
            ...conv,
            otherUser: profile,
            unreadCount: count || 0
          };
        })
      );

      setConversations(conversationsWithData);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4">
        {/* Header */}
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
          {conversations.length === 0 ? (
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
                className="glass-hover rounded-xl p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={conversation.otherUser?.avatar_url || undefined} />
                    <AvatarFallback>
                      {conversation.otherUser?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
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
