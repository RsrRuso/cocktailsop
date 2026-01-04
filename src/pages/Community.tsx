import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, Hash, Users, MessageCircle, Search, 
  Megaphone, Bell, BellOff, MoreVertical,
  ArrowLeft, Globe, Lock, UserPlus, Pin
} from "lucide-react";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CommunityChannelList from "@/components/community/CommunityChannelList";
import CommunityDiscoverDialog from "@/components/community/CommunityDiscoverDialog";
import CommunityCreateChannelDialog from "@/components/community/CommunityCreateChannelDialog";
import CommunityChannelInfo from "@/components/community/CommunityChannelInfo";
import { CommunityMessageList } from "@/components/community/CommunityMessageList";
import { CommunityMessageInput } from "@/components/community/CommunityMessageInput";
import { CommunityPinnedMessage } from "@/components/community/CommunityPinnedMessage";
import { CommunityTypingIndicator } from "@/components/community/CommunityTypingIndicator";
import CommunityForwardDialog from "@/components/community/CommunityForwardDialog";
import { useCommunityChat } from "@/hooks/useCommunityChat";
import { motion, AnimatePresence } from "framer-motion";

interface Channel {
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

interface Membership {
  channel_id: string;
  role: string;
  is_muted: boolean;
}

interface Message {
  id: string;
  content: string | null;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [memberships, setMemberships] = useState<Map<string, Membership>>(new Map());
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [pinnedMessageIndex, setPinnedMessageIndex] = useState(0);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{userId: string, username: string}[]>([]);

  // Use optimized chat hook
  const {
    messages,
    pinnedMessages,
    loading: messagesLoading,
    sending,
    sendMessage,
    handleReaction,
    retryMessage,
    pinMessage,
    editMessage,
    deleteMessage,
  } = useCommunityChat(selectedChannel?.id || null, user?.id || null);

  // Handle channel from URL params
  useEffect(() => {
    const channelId = searchParams.get("channel");
    if (channelId && channels.length > 0) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        setSelectedChannel(channel);
        setShowMobileSidebar(false);
      }
    }
  }, [searchParams, channels]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchChannels();
    fetchMemberships();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [user, navigate]);

  useEffect(() => {
    if (selectedChannel) {
      setShowMobileSidebar(false);
    }
  }, [selectedChannel]);

  const fetchChannels = async () => {
    const { data, error } = await supabase
      .from("community_channels")
      .select("*")
      .order("is_official", { ascending: false })
      .order("member_count", { ascending: false });

    if (error) {
      console.error("Failed to load channels:", error);
      return;
    }

    setChannels(data || []);
  };

  const fetchMemberships = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("community_channel_members")
      .select("channel_id, role, is_muted")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to load memberships:", error);
      return;
    }

    const membershipMap = new Map<string, Membership>();
    data?.forEach((m) => membershipMap.set(m.channel_id, m as Membership));
    setMemberships(membershipMap);
  };

  const handleJoinChannel = async (channelId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("community_channel_members")
      .insert({ channel_id: channelId, user_id: user.id, role: "member" });

    if (error) {
      if (error.code === "23505") {
        toast.info("You're already a member of this channel");
      } else {
        toast.error("Failed to join channel");
      }
      return;
    }

    await supabase
      .from("community_channels")
      .update({ member_count: (channels.find(c => c.id === channelId)?.member_count || 0) + 1 })
      .eq("id", channelId);

    toast.success("Joined channel!");
    fetchMemberships();
    fetchChannels();
  };

  const handleLeaveChannel = async (channelId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("community_channel_members")
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to leave channel");
      return;
    }

    toast.success("Left channel");
    if (selectedChannel?.id === channelId) {
      setSelectedChannel(null);
      setShowMobileSidebar(true);
    }
    fetchMemberships();
    fetchChannels();
  };

  const handleSendMessage = useCallback(async (content: string, reply: any) => {
    if (!selectedChannel || !user) return false;

    const membership = memberships.get(selectedChannel.id);
    if (!membership) {
      toast.error("Join this channel to send messages");
      return false;
    }

    const { allowed, retryAfter } = checkRateLimit("community-message", user.id);
    if (!allowed) {
      toast.error("Slow down!", { description: `Wait ${Math.ceil((retryAfter || 5000) / 1000)}s` });
      return false;
    }

    const success = await sendMessage(content, reply);
    if (success) {
      setReplyTo(null);
    }
    return success;
  }, [selectedChannel, user, memberships, sendMessage]);

  const handlePinMessage = useCallback(async (messageId: string, pin: boolean) => {
    await pinMessage(messageId, pin);
    toast.success(pin ? "Message pinned" : "Message unpinned");
  }, [pinMessage]);

  const handleEditMessage = useCallback((message: Message) => {
    setEditingMessage(message);
  }, []);

  const handleDeleteMessage = useCallback(async () => {
    if (!deleteMessageId) return;
    const success = await deleteMessage(deleteMessageId);
    if (success) {
      toast.success("Message deleted");
    } else {
      toast.error("Failed to delete message");
    }
    setDeleteMessageId(null);
  }, [deleteMessageId, deleteMessage]);

  const isAdmin = useMemo(() => {
    if (!selectedChannel) return false;
    const membership = memberships.get(selectedChannel.id);
    return membership?.role === 'admin' || membership?.role === 'moderator';
  }, [selectedChannel, memberships]);

  const getChannelIcon = useCallback((channel: Channel) => {
    switch (channel.type) {
      case "announcement":
        return <Megaphone className="w-5 h-5" />;
      case "private":
        return <Lock className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  }, []);

  const filteredChannels = useMemo(() => 
    channels.filter((ch) =>
      ch.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [channels, searchQuery]);

  const joinedChannels = useMemo(() => 
    filteredChannels.filter((ch) => memberships.has(ch.id)), 
    [filteredChannels, memberships]);
  
  const discoverChannels = useMemo(() => 
    filteredChannels.filter((ch) => !memberships.has(ch.id)), 
    [filteredChannels, memberships]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <TopNav />

      <div className="h-[calc(100vh-140px)] mt-16 flex">
        {/* Sidebar - Channels List */}
        <AnimatePresence>
          {(showMobileSidebar || !isMobile) && (
            <motion.div
              initial={isMobile ? { x: -300 } : false}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`${
                isMobile ? "absolute z-50 h-full" : "relative"
              } w-full md:w-80 lg:w-96 bg-slate-800/50 backdrop-blur-xl border-r border-white/10 flex flex-col`}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-blue-400" />
                    Community
                  </h1>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowDiscoverDialog(true)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Globe className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowCreateDialog(true)}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <CommunityChannelList
                  channels={joinedChannels}
                  selectedChannel={selectedChannel}
                  memberships={memberships}
                  onSelectChannel={(ch) => setSelectedChannel(ch)}
                  onJoinChannel={handleJoinChannel}
                  onLeaveChannel={handleLeaveChannel}
                  getChannelIcon={getChannelIcon}
                  showJoinButton={false}
                />

                {discoverChannels.length > 0 && (
                  <>
                    <div className="px-4 py-2 mt-4">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                        Discover
                      </p>
                    </div>
                    <CommunityChannelList
                      channels={discoverChannels.slice(0, 5)}
                      selectedChannel={selectedChannel}
                      memberships={memberships}
                      onSelectChannel={(ch) => {
                        handleJoinChannel(ch.id);
                        setSelectedChannel(ch);
                      }}
                      onJoinChannel={handleJoinChannel}
                      onLeaveChannel={handleLeaveChannel}
                      getChannelIcon={getChannelIcon}
                      showJoinButton={true}
                    />
                    {discoverChannels.length > 5 && (
                      <Button
                        variant="ghost"
                        className="w-full text-blue-400 hover:text-blue-300"
                        onClick={() => setShowDiscoverDialog(true)}
                      >
                        View all {discoverChannels.length} channels
                      </Button>
                    )}
                  </>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-900/50">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="px-3 py-2 border-b border-white/10 bg-slate-800/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isMobile && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowMobileSidebar(true)}
                        className="text-white/70 hover:text-white h-8 w-8"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    )}
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowChannelInfo(true)}
                    >
                      <Avatar className="h-9 w-9 bg-blue-500/20">
                        {selectedChannel.avatar_url ? (
                          <AvatarImage src={selectedChannel.avatar_url} />
                        ) : (
                          <AvatarFallback className="bg-blue-500/20 text-blue-400">
                            {getChannelIcon(selectedChannel)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-white text-sm flex items-center gap-1.5">
                          {selectedChannel.name}
                          {selectedChannel.is_official && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-500/20 text-blue-400">
                              Official
                            </Badge>
                          )}
                        </h3>
                        <p className="text-[11px] text-white/50">
                          {selectedChannel.member_count} members
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white/70 hover:text-white h-8 w-8"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white/70 hover:text-white h-8 w-8"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-white/10">
                        <DropdownMenuItem
                          onClick={() => setShowChannelInfo(true)}
                          className="text-white hover:bg-white/10"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          View Members
                        </DropdownMenuItem>
                        {memberships.get(selectedChannel.id)?.is_muted ? (
                          <DropdownMenuItem className="text-white hover:bg-white/10">
                            <Bell className="w-4 h-4 mr-2" />
                            Unmute
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-white hover:bg-white/10">
                            <BellOff className="w-4 h-4 mr-2" />
                            Mute
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={() => handleLeaveChannel(selectedChannel.id)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          Leave Channel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Pinned Message Banner */}
              {pinnedMessages.length > 0 && (
                <CommunityPinnedMessage
                  messages={pinnedMessages}
                  currentIndex={pinnedMessageIndex}
                  onNavigate={() => setPinnedMessageIndex(prev => (prev + 1) % pinnedMessages.length)}
                  onDismiss={() => {}}
                  onUnpin={isAdmin ? (id) => handlePinMessage(id, false) : undefined}
                  canUnpin={isAdmin}
                />
              )}

              {/* Messages */}
              <CommunityMessageList
                messages={messages}
                userId={user?.id || ""}
                loading={messagesLoading}
                isAdmin={isAdmin}
                onReply={setReplyTo}
                onReaction={handleReaction}
                onRetry={retryMessage}
                onPin={handlePinMessage}
                onEdit={handleEditMessage}
                onDelete={(id) => setDeleteMessageId(id)}
                onForward={(msg) => setForwardingMessage(msg)}
              />

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <CommunityTypingIndicator typingUsers={typingUsers} />
              )}

              {/* Message Input */}
              {memberships.has(selectedChannel.id) ? (
                <CommunityMessageInput
                  onSend={handleSendMessage}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  sending={sending}
                />
              ) : (
                <div className="p-4 border-t border-white/10">
                  <Button
                    onClick={() => handleJoinChannel(selectedChannel.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Channel to Send Messages
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-white/40"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 opacity-40" />
                </div>
                <h2 className="text-lg font-medium mb-1">Welcome to Community</h2>
                <p className="text-sm">Select a channel to start chatting</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CommunityDiscoverDialog
        open={showDiscoverDialog}
        onOpenChange={setShowDiscoverDialog}
        channels={discoverChannels}
        onJoinChannel={(ch) => {
          handleJoinChannel(ch.id);
          setShowDiscoverDialog(false);
        }}
        getChannelIcon={getChannelIcon}
      />

      <CommunityCreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onChannelCreated={() => {
          fetchChannels();
          fetchMemberships();
          setShowCreateDialog(false);
        }}
      />

      {selectedChannel && (
        <CommunityChannelInfo
          open={showChannelInfo}
          onOpenChange={setShowChannelInfo}
          channel={selectedChannel}
          isMember={memberships.has(selectedChannel.id)}
          onJoin={() => handleJoinChannel(selectedChannel.id)}
          onLeave={() => handleLeaveChannel(selectedChannel.id)}
        />
      )}

      {/* Forward Dialog */}
      <CommunityForwardDialog
        open={!!forwardingMessage}
        onOpenChange={(open) => !open && setForwardingMessage(null)}
        message={forwardingMessage}
        userId={user?.id || ""}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Message</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
