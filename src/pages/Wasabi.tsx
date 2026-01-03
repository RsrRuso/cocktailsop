import { useState, useMemo, useCallback } from "react";
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
import { useWasabiData, WasabiConversation, CommunityChannel } from "@/hooks/useWasabiData";

const Wasabi = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

  const {
    conversations,
    channels,
    memberships,
    currentUserId,
    loading,
    channelsLoading,
    fetchConversations,
    fetchChannels,
  } = useWasabiData();

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

  const formatMessageTime = useCallback((dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  }, []);

  const getDisplayName = useCallback((conv: WasabiConversation) => {
    if (conv.is_group) return conv.name || 'Group Chat';
    return conv.other_user?.full_name || conv.other_user?.username || 'Unknown';
  }, []);

  const getAvatarUrl = useCallback((conv: WasabiConversation) => {
    if (conv.is_group) return conv.avatar_url;
    return conv.other_user?.avatar_url;
  }, []);

  const getLastMessagePreview = useCallback((conv: WasabiConversation) => {
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
  }, [currentUserId]);

  const getChannelIcon = useCallback((channel: CommunityChannel) => {
    switch (channel.type) {
      case "announcement": return <Megaphone className="w-5 h-5" />;
      case "private": return <Lock className="w-5 h-5" />;
      default: return <Hash className="w-5 h-5" />;
    }
  }, []);

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

  const renderConversationItem = useCallback((conv: WasabiConversation) => (
    <motion.div
      key={conv.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-3 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors"
      onClick={() => navigate(`/wasabi/${conv.id}`)}
    >
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={getAvatarUrl(conv) || ''} />
          <AvatarFallback className={conv.is_group ? 'bg-green-600' : 'bg-primary'}>
            {conv.is_group ? (
              <Users className="w-6 h-6 text-white" />
            ) : (
              getDisplayName(conv).charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        {conv.pinned && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <Pin className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-medium text-white truncate">
            {getDisplayName(conv)}
          </h3>
          <span className="text-xs text-white/50 ml-2 flex-shrink-0">
            {formatMessageTime(conv.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60 truncate">
            {getLastMessagePreview(conv)}
          </p>
          {conv.unread_count > 0 && (
            <Badge className="ml-2 bg-green-600 hover:bg-green-600 text-white text-xs px-2 py-0.5">
              {conv.unread_count}
            </Badge>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="text-white/50 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); handleTogglePin(conv.id, conv.pinned); }}
            className="text-white hover:bg-white/10"
          >
            <Pin className="w-4 h-4 mr-2" />
            {conv.pinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); handleToggleArchive(conv.id, conv.archived); }}
            className="text-white hover:bg-white/10"
          >
            <Archive className="w-4 h-4 mr-2" />
            {conv.archived ? 'Unarchive' : 'Archive'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  ), [navigate, getAvatarUrl, getDisplayName, formatMessageTime, getLastMessagePreview, handleTogglePin, handleToggleArchive]);

  const renderChannelItem = useCallback((channel: CommunityChannel, isJoined: boolean) => (
    <div
      key={channel.id}
      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
      onClick={() => navigate(`/community?channel=${channel.id}`)}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        channel.is_official ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-white/10"
      )}>
        {channel.avatar_url ? (
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={channel.avatar_url} />
            <AvatarFallback>{getChannelIcon(channel)}</AvatarFallback>
          </Avatar>
        ) : (
          getChannelIcon(channel)
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white truncate">{channel.name}</h3>
          {channel.is_official && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Official
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/60 truncate">{channel.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Users className="w-3 h-3 text-white/40" />
          <span className="text-xs text-white/40">{channel.member_count || 0} members</span>
        </div>
      </div>

      {!isJoined && (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={(e) => { e.stopPropagation(); handleJoinChannel(channel.id); }}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Join
        </Button>
      )}
    </div>
  ), [navigate, getChannelIcon, handleJoinChannel]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20 pt-16">
      <TopNav />
      
      {/* Header */}
      <div className="sticky top-16 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
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
                  {filteredConversations.map(renderConversationItem)}
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
                <div className="px-4 py-4 space-y-6">
                  {/* Joined Channels */}
                  {joinedChannels.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Your Channels
                      </h3>
                      <div className="space-y-2">
                        {joinedChannels.map(ch => renderChannelItem(ch, true))}
                      </div>
                    </div>
                  )}

                  {/* Discover Channels */}
                  {discoverChannels.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Discover
                      </h3>
                      <div className="space-y-2">
                        {discoverChannels.map(ch => renderChannelItem(ch, false))}
                      </div>
                    </div>
                  )}

                  {filteredChannels.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Globe className="w-16 h-16 text-white/20 mb-4" />
                      <h3 className="font-semibold text-white mb-1">No channels found</h3>
                      <p className="text-sm text-white/50 mb-4">Create a new channel or search differently</p>
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

      <WasabiNewChatDialog 
        open={newChatOpen} 
        onOpenChange={setNewChatOpen}
        onChatCreated={(chatId) => {
          setNewChatOpen(false);
          navigate(`/wasabi/${chatId}`);
        }}
      />

      <WasabiNewGroupDialog 
        open={newGroupOpen} 
        onOpenChange={setNewGroupOpen}
        onGroupCreated={(groupId) => {
          setNewGroupOpen(false);
          navigate(`/wasabi/${groupId}`);
        }}
      />

      <CommunityCreateChannelDialog 
        open={createChannelOpen} 
        onOpenChange={setCreateChannelOpen}
        onChannelCreated={() => {
          setCreateChannelOpen(false);
          fetchChannels();
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Wasabi;
