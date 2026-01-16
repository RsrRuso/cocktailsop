import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, Pin, Archive, Users, Mail, CheckCheck, Trash2, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { formatDistanceToNow } from "date-fns";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { useMessagesData } from "@/hooks/useMessagesData";
import { useAuth } from "@/contexts/AuthContext";
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
  lastMessage?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  is_group?: boolean;
  group_name?: string;
  group_avatar_url?: string;
}

// Memoized contact item for search results - avatar navigates to profile, rest starts chat
const ContactItem = memo(({ profile, onStartChat, onViewProfile }: { 
  profile: Profile; 
  onStartChat: (profile: Profile) => void;
  onViewProfile: (userId: string) => void;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
    {/* Avatar - navigates to profile */}
    <div 
      className="cursor-pointer shrink-0 active:scale-95 transition-transform"
      onClick={(e) => { e.stopPropagation(); onViewProfile(profile.id); }}
    >
      <OptimizedAvatar
        src={profile.avatar_url}
        alt={profile.username}
        fallback={profile.username?.[0]?.toUpperCase() || '?'}
        userId={profile.id}
        className="w-11 h-11"
      />
    </div>
    {/* Name/username - also navigates to profile */}
    <div 
      className="flex-1 min-w-0 cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onViewProfile(profile.id); }}
    >
      <p className="font-medium truncate text-sm">{profile.full_name || profile.username}</p>
      <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
    </div>
    {/* Message button - starts chat */}
    <button 
      className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors active:scale-95"
      onClick={(e) => { e.stopPropagation(); onStartChat(profile); }}
    >
      <MessageCircle className="w-4 h-4 text-primary" />
    </button>
  </div>
));
ContactItem.displayName = 'ContactItem';

// Memoized conversation item with delete
const ConversationItem = memo(({ conversation, onNavigate, onTogglePin, onDelete }: { 
  conversation: Conversation; 
  onNavigate: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const displayName = conversation.is_group 
    ? conversation.group_name 
    : conversation.otherUser?.full_name || conversation.otherUser?.username;

  return (
    <div className="relative group">
      <div
        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors active:scale-[0.99] ${
          conversation.unreadCount! > 0 ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
        } ${conversation.isPinned ? 'border-l-2 border-l-primary' : ''}`}
        onClick={() => onNavigate(conversation.id)}
        onContextMenu={(e) => { e.preventDefault(); setShowDelete(true); }}
      >
        <div className="relative shrink-0">
          {conversation.is_group ? (
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <OptimizedAvatar
              src={conversation.otherUser?.avatar_url}
              alt={conversation.otherUser?.username || 'User'}
              fallback={conversation.otherUser?.username?.[0]?.toUpperCase() || '?'}
              userId={conversation.otherUser?.id}
              className="w-11 h-11"
            />
          )}
          {conversation.unreadCount! > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {conversation.unreadCount! > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-medium truncate text-sm ${conversation.unreadCount! > 0 ? 'text-foreground' : 'text-foreground/80'}`}>
              {displayName || 'Unknown'}
            </p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })}
            </span>
          </div>
          <p className={`text-xs truncate ${conversation.unreadCount! > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground'}`}>
            {conversation.lastMessage || 'Start a conversation'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(conversation.id); }}
            className={`p-1.5 rounded-full ${conversation.isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
            className="p-1.5 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {showDelete && (
        <div className="absolute inset-0 bg-destructive/10 backdrop-blur-sm rounded-xl flex items-center justify-center gap-2 z-10">
          <Button size="sm" variant="destructive" onClick={() => { onDelete(conversation.id); setShowDelete(false); }} className="h-8">
            <Trash2 className="w-4 h-4 mr-1" />Delete
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDelete(false)} className="h-8">
            <X className="w-4 h-4 mr-1" />Cancel
          </Button>
        </div>
      )}
    </div>
  );
});
ConversationItem.displayName = 'ConversationItem';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('pinnedChats') || '[]')));
  const [archivedChats, setArchivedChats] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('archivedChats') || '[]')));
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const { conversations, isLoading, refreshConversations, setConversations } = useMessagesData(user?.id || null);

  // Fetch contacts when search query changes
  useEffect(() => {
    if (!searchQuery.trim() || !user?.id) {
      setContacts([]);
      return;
    }

    const searchContacts = async () => {
      setContactsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles_public')
          .select('id, username, full_name, avatar_url')
          .neq('id', user.id)
          .or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setContacts(data || []);
      } catch (err) {
        console.error('Error searching contacts:', err);
        setContacts([]);
      } finally {
        setContactsLoading(false);
      }
    };

    const debounce = setTimeout(searchContacts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  useEffect(() => { localStorage.setItem('pinnedChats', JSON.stringify([...pinnedChats])); }, [pinnedChats]);
  useEffect(() => { localStorage.setItem('archivedChats', JSON.stringify([...archivedChats])); }, [archivedChats]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('msg-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refreshConversations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refreshConversations]);

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await supabase.from("messages").update({ read: true }).eq("read", false).neq("sender_id", user.id);
    setConversations(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
  };

  const togglePin = useCallback((convId: string) => {
    setPinnedChats(prev => { const s = new Set(prev); s.has(convId) ? s.delete(convId) : s.add(convId); return s; });
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, isPinned: !c.isPinned } : c));
  }, [setConversations]);

  const deleteChat = useCallback(async (convId: string) => {
    // Delete all messages in this conversation first
    await supabase.from("messages").delete().eq("conversation_id", convId);
    // Then delete the conversation
    await supabase.from("conversations").delete().eq("id", convId);
    // Remove from local state immediately
    setConversations(prev => prev.filter(c => c.id !== convId));
    // Clean up localStorage
    setPinnedChats(prev => { const s = new Set(prev); s.delete(convId); return s; });
    setArchivedChats(prev => { const s = new Set(prev); s.delete(convId); return s; });
    toast.success("Chat deleted");
  }, [setConversations]);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(conv => {
        const matchesSearch = !searchQuery || 
          conv.otherUser?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (conv.is_group && conv.group_name?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch && (showArchived ? archivedChats.has(conv.id) : !archivedChats.has(conv.id));
      })
      .sort((a, b) => {
        if (pinnedChats.has(a.id) && !pinnedChats.has(b.id)) return -1;
        if (!pinnedChats.has(a.id) && pinnedChats.has(b.id)) return 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
  }, [conversations, searchQuery, showArchived, pinnedChats, archivedChats]);

  const totalUnread = useMemo(() => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [conversations]);
  const handleNavigate = useCallback((id: string) => navigate(`/messages/${id}`), [navigate]);

  // Filter contacts to exclude users who already have conversations
  const existingUserIds = useMemo(() => 
    new Set(conversations.map(c => c.otherUser?.id).filter(Boolean)),
    [conversations]
  );
  const newContacts = useMemo(() => 
    contacts.filter(c => !existingUserIds.has(c.id)),
    [contacts, existingUserIds]
  );

  const handleViewProfile = useCallback((userId: string) => navigate(`/user/${userId}`), [navigate]);

  const handleStartChat = useCallback(async (profile: Profile) => {
    if (!user?.id) return;
    
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, profile.id])
        .eq('is_group', false)
        .maybeSingle();

      if (existing) {
        navigate(`/messages/${existing.id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, profile.id],
          is_group: false,
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      navigate(`/messages/${newConv.id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('Could not start conversation');
    }
  }, [user?.id, navigate]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="pt-16 px-3 max-w-2xl mx-auto">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Neuron</h1>
            {totalUnread > 0 && <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{totalUnread}</span>}
          </div>
          <div className="flex gap-1">
            <Button onClick={() => navigate("/email")} size="icon" variant="ghost" className="h-8 w-8"><Mail className="w-4 h-4" /></Button>
            <Button onClick={() => setShowCreateGroup(true)} size="icon" variant="ghost" className="h-8 w-8"><Users className="w-4 h-4" /></Button>
            {totalUnread > 0 && <Button onClick={handleMarkAllAsRead} size="icon" variant="ghost" className="h-8 w-8"><CheckCheck className="w-4 h-4" /></Button>}
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 rounded-xl bg-muted/50 border-0" />
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setShowArchived(false)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${!showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
            <MessageCircle className="w-3 h-3" />Active
          </button>
          <button onClick={() => setShowArchived(true)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${showArchived ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
            <Archive className="w-3 h-3" />Archived
          </button>
        </div>
        {/* Contact List - Show when searching */}
        {searchQuery.trim() && newContacts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-1 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start new chat</span>
            </div>
            <div className="space-y-0.5 bg-muted/30 rounded-xl p-1">
              {contactsLoading ? (
                <div className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5"><div className="h-3 w-24 bg-muted rounded" /></div>
                </div>
              ) : (
                newContacts.map((contact) => (
                  <ContactItem key={contact.id} profile={contact} onStartChat={handleStartChat} onViewProfile={handleViewProfile} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Existing Conversations */}
        <div className="space-y-0.5">
          {searchQuery.trim() && filteredConversations.length > 0 && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Existing chats</span>
            </div>
          )}
          {isLoading && conversations.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5"><div className="h-3 w-24 bg-muted rounded" /><div className="h-2.5 w-32 bg-muted rounded" /></div>
              </div>
            ))
          ) : filteredConversations.length === 0 && (!searchQuery.trim() || newContacts.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3"><MessageCircle className="w-6 h-6 text-muted-foreground" /></div>
              <p className="text-muted-foreground text-sm">
                {searchQuery.trim() ? "No users found" : (showArchived ? "No archived chats" : "No conversations yet")}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} onNavigate={handleNavigate} onTogglePin={togglePin} onDelete={deleteChat} />
            ))
          )}
        </div>
      </div>
      <CreateGroupDialog open={showCreateGroup} onOpenChange={setShowCreateGroup} currentUserId={user?.id || ''} />
      <BottomNav />
    </div>
  );
};

export default Messages;
