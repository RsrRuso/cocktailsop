import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, Pin, Archive, Clock, Users, Sparkles, Mail, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import { formatDistanceToNow } from "date-fns";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { motion, AnimatePresence } from "framer-motion";

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
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('pinnedChats');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [archivedChats, setArchivedChats] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('archivedChats');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { showNotification } = useInAppNotificationContext();

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('pinnedChats', JSON.stringify([...pinnedChats]));
  }, [pinnedChats]);

  useEffect(() => {
    localStorage.setItem('archivedChats', JSON.stringify([...archivedChats]));
  }, [archivedChats]);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        fetchConversations(user.id);
      } else {
        navigate("/auth");
      }
    };
    initUser();

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
          
          if (user && newMessage.sender_id !== user.id) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', newMessage.sender_id)
              .single();
            
            if (senderProfile) {
              showNotification(
                senderProfile.full_name,
                newMessage.content?.substring(0, 100) || 'New message',
                'message'
              );
            }
          }
          
          if (user) fetchConversations(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = useCallback(async (userId: string) => {
    try {
      // Fetch conversations
      const { data: convData, error } = await supabase
        .from("conversations")
        .select("*")
        .contains("participant_ids", [userId])
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (error || !convData?.length) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      // Get all other user IDs for non-group conversations
      const otherUserIds = convData
        .filter(conv => !conv.is_group)
        .map(conv => conv.participant_ids.find((id: string) => id !== userId))
        .filter(Boolean) as string[];

      // Batch fetch profiles
      const profilesPromise = otherUserIds.length > 0 
        ? supabase.from("profiles").select("id, username, avatar_url, full_name").in("id", otherUserIds)
        : Promise.resolve({ data: [] });

      // Batch fetch last messages - use a single query with conversation IDs
      const convIds = convData.map(c => c.id);
      
      // Execute in parallel
      const [profilesResult] = await Promise.all([profilesPromise]);
      
      const profilesMap = new Map<string, Profile>();
      profilesResult.data?.forEach(p => profilesMap.set(p.id, p as Profile));

      // Map conversations with data - defer expensive operations
      const conversationsWithData: Conversation[] = convData.map((conv) => {
        const otherUserId = conv.participant_ids.find((id: string) => id !== userId);
        const otherUser = otherUserId ? profilesMap.get(otherUserId) : undefined;
        return {
          id: conv.id,
          participant_ids: conv.participant_ids,
          last_message_at: conv.last_message_at,
          is_group: conv.is_group,
          group_name: conv.group_name,
          group_avatar_url: conv.group_avatar_url,
          otherUser: conv.is_group ? undefined : otherUser,
          unreadCount: 0,
          lastMessage: '',
          isPinned: pinnedChats.has(conv.id),
          isArchived: archivedChats.has(conv.id),
          memberCount: conv.participant_ids.length,
        };
      });

      setConversations(conversationsWithData);
      setIsLoading(false);

      // Lazy load unread counts and last messages (non-blocking)
      setTimeout(() => {
        loadAdditionalData(convIds, userId, conversationsWithData);
      }, 0);

    } catch (err) {
      console.error('Error fetching conversations:', err);
      setIsLoading(false);
    }
  }, [pinnedChats, archivedChats]);

  const loadAdditionalData = async (convIds: string[], userId: string, existingConvs: Conversation[]) => {
    // Batch load last messages for all conversations at once
    const lastMessagesPromises = convIds.map(id => 
      supabase
        .from("messages")
        .select("content, media_type")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    const unreadPromises = convIds.map(id =>
      supabase
        .from("messages")
        .select("*", { count: 'exact', head: true })
        .eq("conversation_id", id)
        .eq("read", false)
        .neq("sender_id", userId)
    );

    const [lastMsgsResults, unreadResults] = await Promise.all([
      Promise.all(lastMessagesPromises),
      Promise.all(unreadPromises)
    ]);

    const lastMessagesMap = new Map<string, string>();
    const unreadCountsMap = new Map<string, number>();

    lastMsgsResults.forEach((result, idx) => {
      if (result.data) {
        const msg = result.data;
        const preview = msg.media_type 
          ? `📎 ${msg.media_type === 'image' ? 'Photo' : msg.media_type === 'video' ? 'Video' : msg.media_type === 'voice' ? 'Voice' : 'File'}`
          : msg.content?.substring(0, 50) || '';
        lastMessagesMap.set(convIds[idx], preview);
      }
    });

    unreadResults.forEach((result, idx) => {
      unreadCountsMap.set(convIds[idx], result.count || 0);
    });

    setConversations(prev => prev.map(conv => ({
      ...conv,
      lastMessage: lastMessagesMap.get(conv.id) || conv.lastMessage,
      unreadCount: unreadCountsMap.get(conv.id) ?? conv.unreadCount,
      isPinned: pinnedChats.has(conv.id),
      isArchived: archivedChats.has(conv.id),
    })));
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("read", false)
      .neq("sender_id", currentUser.id);
    
    setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
  };

  const togglePin = useCallback((convId: string) => {
    setPinnedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
    setConversations(prev => prev.map(c => 
      c.id === convId ? { ...c, isPinned: !c.isPinned } : c
    ));
  }, []);

  const toggleArchive = useCallback((convId: string) => {
    setArchivedChats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
    setConversations(prev => prev.map(c => 
      c.id === convId ? { ...c, isArchived: !c.isArchived } : c
    ));
  }, []);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(conv => {
        const matchesSearch = searchQuery === "" || 
          conv.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.is_group && conv.group_name?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesArchive = showArchived ? conv.isArchived : !conv.isArchived;
        
        return matchesSearch && matchesArchive;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
  }, [conversations, searchQuery, showArchived]);

  const totalUnread = useMemo(() => 
    conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0), 
    [conversations]
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-3 sm:px-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-3 gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Neuron
            </h1>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button 
              onClick={() => navigate("/email")}
              size="sm"
              variant="ghost"
              className="h-8 px-2 sm:px-3"
            >
              <Mail className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => setShowCreateGroup(true)}
              size="sm"
              variant="ghost"
              className="h-8 px-2 sm:px-3"
            >
              <Users className="w-4 h-4" />
            </Button>
            {totalUnread > 0 && (
              <Button 
                onClick={handleMarkAllAsRead}
                size="sm"
                variant="ghost"
                className="h-8 px-2 sm:px-3"
              >
                <CheckCheck className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>

        {/* Quick Stats */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button 
            onClick={() => setShowArchived(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              !showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Active ({conversations.filter(c => !c.isArchived).length})
          </button>
          <button 
            onClick={() => setShowArchived(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
              showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Archived ({archivedChats.size})
          </button>
          {pinnedChats.size > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground shrink-0">
              <Pin className="w-3.5 h-3.5" />
              {pinnedChats.size} Pinned
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="space-y-1">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {showArchived ? "No archived chats" : "No conversations yet"}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredConversations.map((conversation, idx) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                    conversation.unreadCount! > 0 
                      ? 'bg-primary/5 hover:bg-primary/10' 
                      : 'hover:bg-muted/50'
                  } ${conversation.isPinned ? 'border-l-2 border-l-primary' : ''}`}
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {conversation.is_group ? (
                      conversation.group_avatar_url ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                          <img 
                            src={conversation.group_avatar_url} 
                            alt={conversation.group_name || 'Group'} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                      )
                    ) : (
                      <OptimizedAvatar
                        src={conversation.otherUser?.avatar_url}
                        alt={conversation.otherUser?.username || 'User'}
                        fallback={conversation.otherUser?.username?.[0]?.toUpperCase() || '?'}
                        userId={conversation.otherUser?.id}
                        className="w-12 h-12"
                      />
                    )}
                    {conversation.unreadCount! > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {conversation.unreadCount! > 9 ? '9+' : conversation.unreadCount}
                      </span>
                    )}
                    {conversation.isPinned && (
                      <Pin className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-primary" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${conversation.unreadCount! > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                        {conversation.is_group 
                          ? conversation.group_name 
                          : (conversation.otherUser?.full_name || 'Unknown')}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${conversation.unreadCount! > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {conversation.lastMessage || (conversation.is_group ? `${conversation.memberCount} members` : `@${conversation.otherUser?.username || ''}`)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePin(conversation.id); }}
                      className="p-1.5 rounded-full hover:bg-muted"
                    >
                      <Pin className={`w-3.5 h-3.5 ${conversation.isPinned ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleArchive(conversation.id); }}
                      className="p-1.5 rounded-full hover:bg-muted"
                    >
                      <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {currentUser && (
        <CreateGroupDialog 
          open={showCreateGroup} 
          onOpenChange={setShowCreateGroup}
          currentUserId={currentUser.id}
        />
      )}
      <BottomNav />
    </div>
  );
};

export default Messages;
