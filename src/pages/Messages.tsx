import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Send, Search, Pin, Archive, MoreVertical, Clock, Users, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ConversationItem } from "@/components/ConversationItem";

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
  lastMessage?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  is_group?: boolean;
  group_name?: string;
  group_avatar_url?: string;
  memberCount?: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());
  const [archivedChats, setArchivedChats] = useState<Set<string>>(new Set());
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { showNotification } = useInAppNotificationContext();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    initUser();
    
    fetchConversations().finally(() => setIsLoading(false));

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          const newMessage = payload.new as any;
          
          // Only send push notification if message is from someone else
          if (user && newMessage.sender_id !== user.id) {
            // Fetch sender profile for notification
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', newMessage.sender_id)
              .single();
            
            if (senderProfile) {
              showNotification(
                senderProfile.full_name,
                newMessage.content.substring(0, 100),
                'message'
              );
            }
          }
          
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
      const otherUserIds = data
        .filter(conv => !conv.is_group)
        .map(conv => conv.participant_ids.find((id: string) => id !== user.id))
        .filter(Boolean);

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

      // Get last message for each conversation
      const lastMessagesMap = new Map<string, string>();
      for (const conv of data) {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, media_type")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (lastMsg) {
          const preview = lastMsg.media_type 
            ? `📎 ${lastMsg.media_type === 'image' ? 'Photo' : lastMsg.media_type === 'video' ? 'Video' : lastMsg.media_type === 'voice' ? 'Voice message' : 'File'}`
            : lastMsg.content.substring(0, 50);
          lastMessagesMap.set(conv.id, preview);
        }
      }

      const conversationsWithData = data.map((conv) => {
        const otherUserId = conv.participant_ids.find((id: string) => id !== user.id);
        return {
          ...conv,
          otherUser: conv.is_group ? undefined : profilesMap.get(otherUserId),
          unreadCount: unreadCountsMap.get(conv.id) || 0,
          lastMessage: lastMessagesMap.get(conv.id),
          isPinned: pinnedChats.has(conv.id),
          isArchived: archivedChats.has(conv.id),
          memberCount: conv.participant_ids.length,
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

  const togglePin = (convId: string) => {
    setPinnedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
  };

  const toggleArchive = (convId: string) => {
    setArchivedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
  };

  // Memoize filtered conversations to prevent recalculation
  const filteredConversations = useMemo(() => {
    return conversations
      .filter(conv => {
        const matchesSearch = searchQuery === "" || 
          conv.otherUser?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.is_group && conv.group_name?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesArchive = showArchived ? conv.isArchived : !conv.isArchived;
        
        return matchesSearch && matchesArchive;
      })
      .sort((a, b) => {
        // Pinned chats first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by last message time
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
  }, [conversations, searchQuery, showArchived]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/98 to-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4">
        <div className="flex items-center justify-between py-3 sm:py-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Neuron
            </h1>
            <Button
              size="sm"
              variant="ghost"
              className="glass backdrop-blur-xl rounded-full px-2 sm:px-3 py-1 border border-primary/30 hover:scale-105 transition-all h-7 sm:h-8"
            >
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary ml-1 hidden sm:inline">Smart Features</span>
              <span className="text-xs font-semibold text-primary ml-1 sm:hidden">AI</span>
            </Button>
          </div>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap">
            <Button 
              onClick={() => navigate("/email")}
              size="sm"
              className="glass bg-accent/20 hover:bg-accent/30 hover:scale-105 transition-all h-8 text-xs shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 sm:mr-2" />
              <span className="hidden sm:inline">Email</span>
            </Button>
            <Button 
              onClick={() => setShowCreateGroup(true)}
              size="sm"
              className="glass bg-primary/20 hover:bg-primary/30 hover:scale-105 transition-all h-8 text-xs shrink-0"
            >
              <Users className="w-3.5 h-3.5 sm:mr-2" />
              <span className="hidden sm:inline">New Group</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="glass hover:scale-105 transition-all h-8 text-xs shrink-0"
            >
              {showArchived ? 'Active' : 'Archived'}
            </Button>
          </div>
        </div>

        {/* Search with modern styling */}
        <div className="relative mb-3 sm:mb-4">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 sm:pl-11 glass backdrop-blur-xl border-border/30 focus:border-primary/50 transition-all rounded-full h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>

        {/* Stats with improved design */}
        {!showArchived && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="glass backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-border/10 hover:scale-105 transition-all">
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{conversations.filter(c => !c.isArchived).length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 sm:mt-1">Active</p>
            </div>
            <div className="glass backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-border/10 hover:scale-105 transition-all">
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-accent to-primary bg-clip-text text-transparent">{conversations.filter(c => c.unreadCount! > 0).length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 sm:mt-1">Unread</p>
            </div>
            <div className="glass backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-border/10 hover:scale-105 transition-all">
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{pinnedChats.size}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 sm:mt-1">Pinned</p>
            </div>
          </div>
        )}

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
          ) : filteredConversations.length === 0 ? (
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
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`relative group glass-hover rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] backdrop-blur-xl border ${
                  conversation.isPinned ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10 border-primary/30' : 'border-border/10'
                }`}
              >
                <div
                  className="p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3 cursor-pointer"
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                >
                <div className="relative shrink-0">
                  {conversation.is_group ? (
                    conversation.group_avatar_url ? (
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden glass border-2 border-primary/20">
                        <img 
                          src={conversation.group_avatar_url} 
                          alt={conversation.group_name || 'Group'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full glass flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                      </div>
                    )
                  ) : (
                    <OptimizedAvatar
                      src={conversation.otherUser?.avatar_url}
                      alt={conversation.otherUser?.username || 'User'}
                      fallback={conversation.otherUser?.username?.[0]?.toUpperCase() || '?'}
                      userId={conversation.otherUser?.id}
                      className={`w-12 h-12 sm:w-16 sm:h-16 ${conversation.unreadCount! > 0 ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''}`}
                    />
                  )}
                  {conversation.isPinned && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                      <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                    </div>
                  )}
                </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5 sm:mb-1">
                      <p className={`text-sm sm:text-base font-semibold truncate ${conversation.unreadCount! > 0 ? 'text-foreground' : ''}`}>
                        {conversation.is_group 
                          ? conversation.group_name 
                          : (conversation.otherUser?.full_name || 'Unknown User')}
                      </p>
                      <p className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5 sm:gap-1">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}</span>
                        <span className="sm:hidden">{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}</span>
                      </p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-0.5 sm:mb-1">
                      {conversation.is_group 
                        ? `${conversation.memberCount} members`
                        : `@${conversation.otherUser?.username || 'unknown'}`}
                    </p>
                    
                    {conversation.lastMessage && (
                      <p className={`text-xs sm:text-sm truncate ${conversation.unreadCount! > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conversation.lastMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
                    {conversation.unreadCount! > 0 && (
                      <Badge variant="default" className="bg-primary glow-primary text-xs h-5 min-w-[20px] sm:h-6 sm:min-w-[24px]">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass backdrop-blur-xl">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin(conversation.id); }}>
                          <Pin className="w-4 h-4 mr-2" />
                          {conversation.isPinned ? 'Unpin' : 'Pin'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleArchive(conversation.id); }}>
                          <Archive className="w-4 h-4 mr-2" />
                          {conversation.isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))
          )}
        </div>
      </div>

      <CreateGroupDialog 
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserId={currentUser?.id || ''}
      />

      <BottomNav />
    </div>
  );
};

export default Messages;
