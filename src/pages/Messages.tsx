import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Conversation {
  id: string;
  participant_ids: string[];
  last_message_at: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
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
      .select(`
        id,
        participant_ids,
        last_message_at
      `)
      .contains("participant_ids", [user.id])
      .order("last_message_at", { ascending: false });

    if (data) {
      setConversations(data);
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
                className="glass-hover rounded-xl p-4 flex items-center gap-3 cursor-pointer message-3d neon-green border border-[hsl(var(--neon-green))]"
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold neon-green-text">Conversation</p>
                  <p className="text-sm text-muted-foreground truncate">
                    Tap to view messages
                  </p>
                </div>
                <Send className="w-5 h-5 neon-green-text" />
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
