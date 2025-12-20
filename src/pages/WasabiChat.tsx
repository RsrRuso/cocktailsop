import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Send, Paperclip, Mic, MoreVertical, Phone, Video, 
  Image as ImageIcon, FileText, Camera, Users, Check, CheckCheck,
  Smile, Reply, Forward, Trash2, Star, X, Square, Play, Pause,
  Download, File, Loader2
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWasabiMedia } from "@/hooks/useWasabiMedia";

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  sender_id: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: string | null;
  reply_to?: Message;
  sender?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  reactions?: { emoji: string; user_id: string }[];
  is_read?: boolean;
}

interface ChatInfo {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_url: string | null;
  other_user?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  members?: { user_id: string; role: string; username?: string }[];
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const WasabiChat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecordingVoice,
    voiceDuration,
    isUploading,
    startVoiceRecording,
    stopVoiceRecording,
    cancelVoiceRecording,
    handleFileSelect,
    formatDuration
  } = useWasabiMedia({
    conversationId: conversationId || '',
    currentUserId,
    onMessageSent: () => {
      // Messages will be updated via realtime subscription
    }
  });

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const fetchChatInfo = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: conv, error } = await supabase
        .from('wasabi_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      let info: ChatInfo = {
        id: conv.id,
        name: conv.name,
        is_group: conv.is_group,
        avatar_url: conv.avatar_url
      };

      if (!conv.is_group) {
        const { data: otherMember } = await supabase
          .from('wasabi_members')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .single();

        if (otherMember) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', otherMember.user_id)
            .single();
          info.other_user = profile || undefined;
        }
      } else {
        const { data: members } = await supabase
          .from('wasabi_members')
          .select('user_id, role')
          .eq('conversation_id', conversationId);
        info.members = members || [];
      }

      setChatInfo(info);
    } catch (error) {
      console.error('Error fetching chat info:', error);
      toast.error('Failed to load chat');
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('wasabi_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles and reactions
      const messagesWithDetails: Message[] = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();

          const { data: reactions } = await supabase
            .from('wasabi_reactions')
            .select('emoji, user_id')
            .eq('message_id', msg.id);

          let replyTo: Message | undefined;
          if (msg.reply_to_id) {
            const { data: replyData } = await supabase
              .from('wasabi_messages')
              .select('id, content, message_type, sender_id')
              .eq('id', msg.reply_to_id)
              .single();
            if (replyData) {
              const { data: replySender } = await supabase
                .from('profiles')
                .select('username, full_name')
                .eq('id', replyData.sender_id)
                .single();
              replyTo = { ...replyData, sender: replySender } as Message;
            }
          }

          return {
            ...msg,
            sender: profile,
            reactions: reactions || [],
            reply_to: replyTo
          };
        })
      );

      setMessages(messagesWithDetails);
      
      // Update last read
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('wasabi_members')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchChatInfo();
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`wasabi-chat-${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'wasabi_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => fetchMessages()
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'wasabi_reactions'
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchChatInfo, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !conversationId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('wasabi_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: newMessage.trim(),
          message_type: 'text',
          reply_to_id: replyingTo?.id || null
        });

      if (error) throw error;

      // Update conversation last message time
      await supabase
        .from('wasabi_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      setNewMessage("");
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('wasabi_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        await supabase
          .from('wasabi_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('wasabi_reactions')
          .insert({
            message_id: messageId,
            user_id: currentUserId,
            emoji
          });
      }
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await supabase
        .from('wasabi_messages')
        .update({ is_deleted: true, content: null })
        .eq('id', messageId);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const getDisplayName = () => {
    if (chatInfo?.is_group) return chatInfo.name || 'Group Chat';
    return chatInfo?.other_user?.full_name || chatInfo?.other_user?.username || 'Unknown';
  };

  const getAvatarUrl = () => {
    if (chatInfo?.is_group) return chatInfo.avatar_url;
    return chatInfo?.other_user?.avatar_url;
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatMessageDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/wasabi')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-10 h-10">
          <AvatarImage src={getAvatarUrl() || ''} />
          <AvatarFallback className={chatInfo?.is_group ? 'bg-green-600' : 'bg-primary'}>
            {chatInfo?.is_group ? (
              <Users className="w-5 h-5 text-white" />
            ) : (
              getDisplayName().charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{getDisplayName()}</h1>
          <p className="text-xs text-muted-foreground">
            {chatInfo?.is_group 
              ? `${chatInfo.members?.length || 0} members`
              : 'tap for info'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View contact</DropdownMenuItem>
              <DropdownMenuItem>Search</DropdownMenuItem>
              <DropdownMenuItem>Mute notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Clear chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                    {date}
                  </span>
                </div>

                {/* Messages */}
                {msgs.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex mb-1",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 relative group",
                          isOwn 
                            ? "bg-green-600 text-white rounded-br-sm" 
                            : "bg-muted rounded-bl-sm",
                          msg.is_deleted && "italic opacity-60"
                        )}
                        onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : msg.id)}
                      >
                        {/* Reply preview */}
                        {msg.reply_to && !msg.is_deleted && (
                          <div className={cn(
                            "text-xs px-2 py-1 rounded mb-1 border-l-2",
                            isOwn 
                              ? "bg-green-700/50 border-white/50" 
                              : "bg-background/50 border-primary"
                          )}>
                            <span className="font-semibold">
                              {msg.reply_to.sender?.full_name || msg.reply_to.sender?.username}
                            </span>
                            <p className="truncate opacity-80">{msg.reply_to.content}</p>
                          </div>
                        )}

                        {/* Message content */}
                        {msg.is_deleted ? (
                          <p className="text-sm italic">🚫 This message was deleted</p>
                        ) : msg.message_type === 'voice' ? (
                          <div className="flex items-center gap-2 min-w-[150px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (playingAudio === msg.id) {
                                  audioRef.current?.pause();
                                  setPlayingAudio(null);
                                } else {
                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                  }
                                  const audio = new Audio(msg.media_url || '');
                                  audio.onended = () => setPlayingAudio(null);
                                  audio.play();
                                  audioRef.current = audio;
                                  setPlayingAudio(msg.id);
                                }
                              }}
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                isOwn ? "bg-white/20" : "bg-primary/20"
                              )}
                            >
                              {playingAudio === msg.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4 ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="flex gap-0.5">
                                {[...Array(20)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={cn(
                                      "w-0.5 rounded-full",
                                      isOwn ? "bg-white/40" : "bg-muted-foreground/40"
                                    )}
                                    style={{ height: `${Math.random() * 16 + 4}px` }}
                                  />
                                ))}
                              </div>
                            </div>
                            <Mic className="w-4 h-4 opacity-60" />
                          </div>
                        ) : msg.message_type === 'image' ? (
                          <img 
                            src={msg.media_url || ''} 
                            alt="Shared image"
                            className="max-w-[250px] rounded-lg cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(msg.media_url || '', '_blank');
                            }}
                          />
                        ) : msg.message_type === 'video' ? (
                          <video 
                            src={msg.media_url || ''} 
                            controls
                            className="max-w-[250px] rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : msg.message_type === 'document' ? (
                          <a 
                            href={msg.media_url || ''} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg",
                              isOwn ? "bg-white/10" : "bg-muted"
                            )}
                          >
                            <File className="w-8 h-8" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{msg.content || 'Document'}</p>
                              <p className="text-xs opacity-60">Tap to open</p>
                            </div>
                            <Download className="w-4 h-4" />
                          </a>
                        ) : (
                          <p className="text-sm break-words">{msg.content}</p>
                        )}

                        {/* Time and status */}
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOwn ? "text-white/70" : "text-muted-foreground"
                        )}>
                          <span className="text-[10px]">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                          {isOwn && !msg.is_deleted && (
                            <CheckCheck className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={cn(
                            "absolute -bottom-3 flex gap-0.5",
                            isOwn ? "left-0" : "right-0"
                          )}>
                            {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => (
                              <span 
                                key={emoji}
                                className="bg-muted rounded-full px-1.5 py-0.5 text-xs shadow border"
                              >
                                {emoji} {msg.reactions?.filter(r => r.emoji === emoji).length}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick actions */}
                        {selectedMessage === msg.id && !msg.is_deleted && (
                          <div className={cn(
                            "absolute top-full mt-1 flex items-center gap-1 bg-popover rounded-lg shadow-lg p-1 z-10",
                            isOwn ? "right-0" : "left-0"
                          )}>
                            {QUICK_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReaction(msg.id, emoji);
                                }}
                                className="hover:bg-muted rounded p-1 text-lg"
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingTo(msg);
                                setSelectedMessage(null);
                                inputRef.current?.focus();
                              }}
                              className="hover:bg-muted rounded p-1.5"
                            >
                              <Reply className="w-4 h-4" />
                            </button>
                            {isOwn && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(msg.id);
                                  setSelectedMessage(null);
                                }}
                                className="hover:bg-destructive/20 rounded p-1.5 text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-2">
          <div className="w-1 h-10 bg-green-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-500 font-semibold">
              Replying to {replyingTo.sender?.full_name || replyingTo.sender?.username}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyingTo.content}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Voice Recording UI */}
      {isRecordingVoice && (
        <div className="sticky bottom-0 bg-red-500 px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={cancelVoiceRecording}
            className="text-white hover:bg-white/20"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-white font-medium">{formatDuration(voiceDuration)}</span>
            <span className="text-white/80">Recording...</span>
          </div>
          <Button 
            size="icon" 
            onClick={stopVoiceRecording}
            className="bg-white text-red-500 hover:bg-white/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Input */}
      {!isRecordingVoice && (
        <div className="sticky bottom-0 bg-background border-t px-4 py-3">
          {/* Hidden file inputs */}
          <input 
            ref={imageInputRef}
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input 
            ref={videoInputRef}
            type="file" 
            accept="video/*" 
            className="hidden" 
            onChange={(e) => handleFileSelect(e, 'video')}
          />
          <input 
            ref={documentInputRef}
            type="file" 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" 
            className="hidden" 
            onChange={(e) => handleFileSelect(e, 'document')}
          />

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-2" /> Gallery
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                  <Video className="w-4 h-4 mr-2" /> Video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
                  <FileText className="w-4 h-4 mr-2" /> Document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              ref={inputRef}
              placeholder="Type a message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1"
              disabled={isUploading}
            />

            {newMessage.trim() ? (
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={sending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-5 h-5" />
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={startVoiceRecording}
                disabled={isUploading}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WasabiChat;
