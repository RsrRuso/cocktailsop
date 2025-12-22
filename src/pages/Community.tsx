import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Send, Plus, Hash, Users, MessageCircle, Search, 
  Megaphone, Settings, Pin, Bell, BellOff, MoreVertical,
  ArrowLeft, Smile, Paperclip, Image, Reply, Check, CheckCheck,
  Globe, Lock, UserPlus, Trash2, Edit2
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import CommunityChannelList from "@/components/community/CommunityChannelList";
import CommunityDiscoverDialog from "@/components/community/CommunityDiscoverDialog";
import CommunityCreateChannelDialog from "@/components/community/CommunityCreateChannelDialog";
import CommunityChannelInfo from "@/components/community/CommunityChannelInfo";
import { EmojiReactionPicker } from "@/components/EmojiReactionPicker";
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

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  reply_to: string | null;
  is_pinned: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  reply_message?: Message | null;
}

interface Membership {
  channel_id: string;
  role: string;
  is_muted: boolean;
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [memberships, setMemberships] = useState<Map<string, Membership>>(new Map());
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      fetchMessages();
      setShowMobileSidebar(false);

      // Realtime subscription for messages
      const messageChannel = supabase
        .channel(`community-messages-${selectedChannel.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "community_messages",
            filter: `channel_id=eq.${selectedChannel.id}`,
          },
          () => fetchMessages()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
      };
    }
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const fetchMessages = async () => {
    if (!selectedChannel) return;

    const { data, error } = await supabase
      .from("community_messages")
      .select("*")
      .eq("channel_id", selectedChannel.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Failed to load messages:", error);
      return;
    }

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(data?.map((m) => m.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name")
      .in("id", userIds);

    const profileMap = new Map<string, any>(profiles?.map((p) => [p.id, p]) || []);

    // Fetch reply messages
    const replyIds = data?.filter((m) => m.reply_to).map((m) => m.reply_to) || [];
    const { data: replyMessages } = replyIds.length > 0
      ? await supabase
          .from("community_messages")
          .select("*")
          .in("id", replyIds as string[])
      : { data: [] };

    const replyMap = new Map<string, any>(replyMessages?.map((m) => [m.id, m]) || []);

    const messagesWithProfiles: Message[] = data?.map((msg) => ({
      ...msg,
      reactions: (typeof msg.reactions === 'object' && msg.reactions !== null && !Array.isArray(msg.reactions)) 
        ? msg.reactions as Record<string, string[]> 
        : {},
      profile: profileMap.get(msg.user_id),
      reply_message: msg.reply_to ? replyMap.get(msg.reply_to) : null,
    })) || [];

    setMessages(messagesWithProfiles);
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

    // Update member count
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;

    const membership = memberships.get(selectedChannel.id);
    if (!membership) {
      toast.error("Join this channel to send messages");
      return;
    }

    const { allowed, retryAfter } = checkRateLimit("community-message", user.id);
    if (!allowed) {
      toast.error("Slow down!", { description: `Wait ${Math.ceil((retryAfter || 5000) / 1000)}s` });
      return;
    }

    const { error } = await supabase.from("community_messages").insert({
      channel_id: selectedChannel.id,
      user_id: user.id,
      content: newMessage.trim(),
      reply_to: replyTo?.id || null,
    });

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const reactions = { ...message.reactions };
    const userReactions = reactions[emoji] || [];

    if (userReactions.includes(user.id)) {
      reactions[emoji] = userReactions.filter((id) => id !== user.id);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji] = [...userReactions, user.id];
    }

    await supabase
      .from("community_messages")
      .update({ reactions })
      .eq("id", messageId);

    setSelectedMessageForReaction(null);
    fetchMessages();
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
    return format(date, "MMM d, HH:mm");
  };

  const getChannelIcon = (channel: Channel) => {
    switch (channel.type) {
      case "announcement":
        return <Megaphone className="w-5 h-5" />;
      case "private":
        return <Lock className="w-5 h-5" />;
      default:
        return <Hash className="w-5 h-5" />;
    }
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const joinedChannels = filteredChannels.filter((ch) => memberships.has(ch.id));
  const discoverChannels = filteredChannels.filter((ch) => !memberships.has(ch.id));

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
              <div className="p-4 border-b border-white/10 bg-slate-800/30 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowMobileSidebar(true)}
                        className="text-white/70 hover:text-white"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    )}
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                      onClick={() => setShowChannelInfo(true)}
                    >
                      <Avatar className="h-10 w-10 bg-blue-500/20">
                        {selectedChannel.avatar_url ? (
                          <AvatarImage src={selectedChannel.avatar_url} />
                        ) : (
                          <AvatarFallback className="bg-blue-500/20 text-blue-400">
                            {getChannelIcon(selectedChannel)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          {selectedChannel.name}
                          {selectedChannel.is_official && (
                            <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400">
                              Official
                            </Badge>
                          )}
                        </h3>
                        <p className="text-xs text-white/50">
                          {selectedChannel.member_count} members
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white/70 hover:text-white"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white/70 hover:text-white"
                        >
                          <MoreVertical className="w-5 h-5" />
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

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {messages.length === 0 && (
                    <div className="text-center py-20 text-white/40">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet. Be the first to say hi!</p>
                    </div>
                  )}
                  {messages.map((message, idx) => {
                    const isOwn = message.user_id === user?.id;
                    const showAvatar = idx === 0 || messages[idx - 1].user_id !== message.user_id;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        {showAvatar ? (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={message.profile?.avatar_url || ""} />
                            <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                              {message.profile?.username?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}

                        <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                          {showAvatar && (
                            <div className={`flex items-center gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                              <span className="text-sm font-medium text-white/80">
                                {message.profile?.full_name || message.profile?.username || "Unknown"}
                              </span>
                              <span className="text-xs text-white/40">
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                          )}

                          {/* Reply preview */}
                          {message.reply_message && (
                            <div className={`text-xs px-3 py-1 mb-1 rounded-lg bg-white/5 border-l-2 border-blue-400 text-white/50 ${isOwn ? "mr-0" : "ml-0"}`}>
                              <span className="font-medium text-blue-400">
                                {message.reply_message.user_id === user?.id ? "You" : "Reply"}
                              </span>
                              <p className="truncate">{message.reply_message.content}</p>
                            </div>
                          )}

                          <div
                            className={`relative px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-blue-600 text-white rounded-br-md"
                                : "bg-white/10 text-white rounded-bl-md"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>

                            {/* Message actions */}
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${
                                isOwn ? "-left-20" : "-right-20"
                              }`}
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white/50 hover:text-white"
                                onClick={() => setReplyTo(message)}
                              >
                                <Reply className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-white/50 hover:text-white"
                                onClick={() => setSelectedMessageForReaction(message.id)}
                              >
                                <Smile className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Reactions */}
                          {Object.keys(message.reactions).length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                              {Object.entries(message.reactions).map(([emoji, users]) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReaction(message.id, emoji)}
                                  className={`h-6 px-2 text-xs rounded-full ${
                                    users.includes(user?.id || "")
                                      ? "bg-blue-500/30 text-white"
                                      : "bg-white/10 text-white/70"
                                  }`}
                                >
                                  {emoji} {users.length}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Emoji Picker */}
              {selectedMessageForReaction && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50">
                  <EmojiReactionPicker
                    onSelect={(emoji) => handleReaction(selectedMessageForReaction, emoji)}
                    onClose={() => setSelectedMessageForReaction(null)}
                  />
                </div>
              )}

              {/* Reply Preview */}
              {replyTo && (
                <div className="px-4 py-2 border-t border-white/10 bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-blue-400" />
                    <div className="text-sm">
                      <span className="text-blue-400 font-medium">
                        Replying to {replyTo.profile?.username || "message"}
                      </span>
                      <p className="text-white/50 truncate max-w-xs">
                        {replyTo.content}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setReplyTo(null)}
                    className="text-white/50 hover:text-white h-8 w-8"
                  >
                    ×
                  </Button>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-white/10 bg-slate-800/30">
                {memberships.has(selectedChannel.id) ? (
                  <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white/50 hover:text-white flex-shrink-0"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-12"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-white/50 hover:text-white h-8 w-8"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="w-5 h-5" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleJoinChannel(selectedChannel.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Channel to Send Messages
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/40">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h2 className="text-xl font-semibold mb-2">Welcome to Community</h2>
                <p className="text-sm">Select a channel to start chatting</p>
              </div>
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

      <BottomNav />
    </div>
  );
}
