import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Search, Plus, MessageCircle, Users, Pin, 
  Archive, MoreVertical, Hash, Megaphone, Globe, Lock, 
  UserPlus, TrendingUp, Star, Zap
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { WasabiNewChatDialog } from "@/components/wasabi/WasabiNewChatDialog";
import { WasabiNewGroupDialog } from "@/components/wasabi/WasabiNewGroupDialog";
import CommunityCreateChannelDialog from "@/components/community/CommunityCreateChannelDialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface WasabiConversation {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  last_message_at: string | null;
  last_message?: {
    content: string | null;
    message_type: string;
    sender_id: string;
  };
  unread_count: number;
  other_user?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  muted: boolean;
  archived: boolean;
  pinned: boolean;
}

interface CommunityChannel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  type: string;
  category: string;
  member_count: number;
  is_official: boolean;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
}

interface ChannelMembership {
  channel_id: string;
  role: string;
  is_muted: boolean;
}

const Wasabi = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chats");
  const [conversations, setConversations] = useState<WasabiConversation[]>([]);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [memberships, setMemberships] = useState<Map<string, ChannelMembership>>(new Map());
  const [loading, setLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: membershipsData, error: memberError } = await supabase
        .from('wasabi_members')
        .select(`
          conversation_id,
          muted,
          archived,
          last_read_at,
          wasabi_conversations (
            id, name, is_group, avatar_url, last_message_at, pinned, created_by
          )
        `)
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false });

      if (memberError) throw memberError;

      const conversationsData: WasabiConversation[] = [];

      for (const membership of membershipsData || []) {
        const conv = membership.wasabi_conversations as any;
        if (!conv) continue;

        const { data: lastMessage } = await supabase
          .from('wasabi_messages')
          .select('content, message_type, sender_id, created_at')
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabase
          .from('wasabi_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .gt('created_at', membership.last_read_at || '1970-01-01');

        let otherUser = null;
        if (!conv.is_group) {
          const { data: otherMember } = await supabase
            .from('wasabi_members')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .single();

          if (otherMember) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', otherMember.user_id)
              .single();
            otherUser = profile;
          }
        }

        conversationsData.push({
          id: conv.id,
          name: conv.name,
          is_group: conv.is_group,
          avatar_url: conv.avatar_url,
          last_message_at: lastMessage?.created_at || conv.last_message_at,
          last_message: lastMessage ? {
            content: lastMessage.content,
            message_type: lastMessage.message_type,
            sender_id: lastMessage.sender_id
          } : undefined,
          unread_count: unreadCount || 0,
          other_user: otherUser,
          muted: membership.muted,
          archived: membership.archived,
          pinned: conv.pinned
        });
      }

      conversationsData.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const aTime = new Date(a.last_message_at || 0).getTime();
        const bTime = new Date(b.last_message_at || 0).getTime();
        return bTime - aTime;
      });

      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("community_channels")
        .select("*")
        .order("is_official", { ascending: false })
        .order("member_count", { ascending: false });

      if (error) throw error;
      setChannels(data || []);

      // Fetch memberships
      const { data: memberData } = await supabase
        .from("community_channel_members")
        .select("channel_id, role, is_muted")
        .eq("user_id", user.id);

      const membershipMap = new Map<string, ChannelMembership>();
      memberData?.forEach((m) => membershipMap.set(m.channel_id, m as ChannelMembership));
      setMemberships(membershipMap);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchChannels();

    const channel = supabase
      .channel('wasabi-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wasabi_messages' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages' },
        () => fetchChannels()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, fetchChannels]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (conv.archived !== showArchived) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const name = conv.is_group 
          ? conv.name 
          : (conv.other_user?.full_name || conv.other_user?.username || '');
        return name?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [conversations, searchQuery, showArchived]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const joinedChannels = filteredChannels.filter((ch) => memberships.has(ch.id));
  const discoverChannels = filteredChannels.filter((ch) => !memberships.has(ch.id));

  const formatMessageTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  };

  const getDisplayName = (conv: WasabiConversation) => {
    if (conv.is_group) return conv.name || 'Group Chat';
    return conv.other_user?.full_name || conv.other_user?.username || 'Unknown';
  };

  const getAvatarUrl = (conv: WasabiConversation) => {
    if (conv.is_group) return conv.avatar_url;
    return conv.other_user?.avatar_url;
  };

  const getLastMessagePreview = (conv: WasabiConversation) => {
    if (!conv.last_message) return 'No messages yet';
    const isOwn = conv.last_message.sender_id === currentUserId;
    const prefix = isOwn ? 'You: ' : '';
    switch (conv.last_message.message_type) {
      case 'image': return `${prefix}📷 Photo`;
      case 'video': return `${prefix}🎥 Video`;
      case 'audio': return `${prefix}🎵 Audio`;
      case 'voice': return `${prefix}🎤 Voice message`;
      case 'document': return `${prefix}📄 Document`;
      default: return `${prefix}${conv.last_message.content || ''}`;
    }
  };

  const getChannelIcon = (channel: CommunityChannel) => {
    switch (channel.type) {
      case "announcement": return <Megaphone className="w-5 h-5" />;
      case "private": return <Lock className="w-5 h-5" />;
      default: return <Hash className="w-5 h-5" />;
    }
  };

  const handleTogglePin = async (convId: string, currentPinned: boolean) => {
    try {
      await supabase
        .from('wasabi_conversations')
        .update({ pinned: !currentPinned })
        .eq('id', convId);
      fetchConversations();
      toast.success(currentPinned ? 'Unpinned' : 'Pinned');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleToggleArchive = async (convId: string, currentArchived: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase
        .from('wasabi_members')
        .update({ archived: !currentArchived })
        .eq('conversation_id', convId)
        .eq('user_id', user.id);
      fetchConversations();
      toast.success(currentArchived ? 'Unarchived' : 'Archived');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleJoinChannel = async (channelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("community_channel_members")
      .insert({ channel_id: channelId, user_id: user.id, role: "member" });

    if (error) {
      if (error.code === "23505") {
        toast.info("Already a member");
      } else {
        toast.error("Failed to join");
      }
      return;
    }

    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      await supabase
        .from("community_channels")
        .update({ member_count: (channel.member_count || 0) + 1 })
        .eq("id", channelId);
    }

    toast.success("Joined channel!");
    fetchChannels();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20 pt-16">
      <TopNav />
      
      {/* Header */}
      <div className="sticky top-16 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/ops-tools')} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Wasabi</h1>
                <p className="text-xs text-white/50">Team & Community Chat</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {activeTab === "chats" && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowArchived(!showArchived)}
                  className={cn("text-white/70 hover:text-white", showArchived && 'text-green-400')}
                >
                  <Archive className="w-5 h-5" />
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
                  <DropdownMenuItem onClick={() => setNewChatOpen(true)} className="text-white hover:bg-white/10">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setNewGroupOpen(true)} className="text-white hover:bg-white/10">
                    <Users className="w-4 h-4 mr-2" />
                    New Group
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateChannelOpen(true)} className="text-white hover:bg-white/10">
                    <Hash className="w-4 h-4 mr-2" />
                    Create Channel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
            <TabsList className="w-full bg-white/5 border border-white/10">
              <TabsTrigger value="chats" className="flex-1 data-[state=active]:bg-green-600 data-[state=active]:text-white text-white/70">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="community" className="flex-1 data-[state=active]:bg-green-600 data-[state=active]:text-white text-white/70">
                <Globe className="w-4 h-4 mr-2" />
                Community
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder={activeTab === "chats" ? "Search chats..." : "Search channels..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "chats" ? (
          <motion.div
            key="chats"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScrollArea className="h-[calc(100vh-280px)]">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                  <MessageCircle className="w-16 h-16 text-white/20 mb-4" />
                  <h3 className="font-semibold text-white mb-1">
                    {showArchived ? 'No archived chats' : 'No conversations yet'}
                  </h3>
                  <p className="text-sm text-white/50 mb-4">
                    {showArchived ? 'Archived chats will appear here' : 'Start a new chat to connect'}
                  </p>
                  {!showArchived && (
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => setNewChatOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start a Chat
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredConversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer active:bg-white/10 transition-colors"
                      onClick={() => navigate(`/wasabi/${conv.id}`)}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={getAvatarUrl(conv) || ''} />
                          <AvatarFallback className={conv.is_group ? 'bg-green-600' : 'bg-blue-600'}>
                            {conv.is_group ? (
                              <Users className="w-5 h-5 text-white" />
                            ) : (
                              getDisplayName(conv).charAt(0).toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white truncate flex items-center gap-1">
                            {getDisplayName(conv)}
                            {conv.pinned && <Pin className="w-3 h-3 text-white/50" />}
                          </span>
                          <span className={cn(
                            "text-xs shrink-0",
                            conv.unread_count > 0 ? "text-green-400 font-semibold" : "text-white/40"
                          )}>
                            {formatMessageTime(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-sm text-white/50 truncate">
                            {getLastMessagePreview(conv)}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-green-600 text-white text-xs px-1.5 min-w-[20px] h-5">
                              {conv.unread_count > 99 ? '99+' : conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="shrink-0 text-white/50 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(conv.id, conv.pinned);
                          }} className="text-white hover:bg-white/10">
                            <Pin className="w-4 h-4 mr-2" />
                            {conv.pinned ? 'Unpin' : 'Pin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleToggleArchive(conv.id, conv.archived);
                          }} className="text-white hover:bg-white/10">
                            <Archive className="w-4 h-4 mr-2" />
                            {conv.archived ? 'Unarchive' : 'Archive'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="community"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ScrollArea className="h-[calc(100vh-280px)]">
              {channelsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                </div>
              ) : (
                <div className="px-2 py-2">
                  {/* Joined Channels */}
                  {joinedChannels.length > 0 && (
                    <>
                      <p className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Your Channels
                      </p>
                      <div className="space-y-1">
                        {joinedChannels.map((channel) => (
                          <motion.div
                            key={channel.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                            onClick={() => navigate(`/community?channel=${channel.id}`)}
                          >
                            <Avatar className="h-12 w-12 bg-green-500/20">
                              {channel.avatar_url ? (
                                <AvatarImage src={channel.avatar_url} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-green-500/30 to-emerald-500/30 text-green-400">
                                  {getChannelIcon(channel)}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white truncate">
                                  {channel.name}
                                </span>
                                {channel.is_official && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-0">
                                    Official
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <Users className="w-3 h-3" />
                                <span>{channel.member_count}</span>
                                {channel.description && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate">{channel.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Discover Channels */}
                  {discoverChannels.length > 0 && (
                    <>
                      <p className="px-3 py-2 mt-4 text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Discover Channels
                      </p>
                      <div className="space-y-1">
                        {discoverChannels.map((channel) => (
                          <motion.div
                            key={channel.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                            onClick={() => handleJoinChannel(channel.id)}
                          >
                            <Avatar className="h-12 w-12">
                              {channel.avatar_url ? (
                                <AvatarImage src={channel.avatar_url} />
                              ) : (
                                <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400">
                                  {getChannelIcon(channel)}
                                </AvatarFallback>
                              )}
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white truncate">
                                  {channel.name}
                                </span>
                                {channel.is_official && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border-0">
                                    Official
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-white/50 truncate">
                                {channel.description || "Tap to join"}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                                <Users className="w-3 h-3" />
                                <span>{channel.member_count} members</span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinChannel(channel.id);
                              }}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Join
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}

                  {joinedChannels.length === 0 && discoverChannels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                      <Globe className="w-16 h-16 text-white/20 mb-4" />
                      <h3 className="font-semibold text-white mb-1">No channels yet</h3>
                      <p className="text-sm text-white/50 mb-4">
                        Create a channel to start community discussions
                      </p>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => setCreateChannelOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Channel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <WasabiNewChatDialog 
        open={newChatOpen} 
        onOpenChange={setNewChatOpen}
        onChatCreated={(chatId) => navigate(`/wasabi/${chatId}`)}
      />
      <WasabiNewGroupDialog 
        open={newGroupOpen} 
        onOpenChange={setNewGroupOpen}
        onGroupCreated={(groupId) => navigate(`/wasabi/${groupId}`)}
      />
      <CommunityCreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        onChannelCreated={() => {
          fetchChannels();
          setCreateChannelOpen(false);
        }}
      />
      
      <BottomNav />
    </div>
  );
};

export default Wasabi;
