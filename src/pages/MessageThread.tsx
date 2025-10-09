import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Check, CheckCheck, Smile, Reply, Edit2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Reaction {
  emoji: string;
  user_ids: string[];
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  delivered: boolean;
  reactions: Reaction[];
  reply_to_id: string | null;
  edited: boolean;
  edited_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface PresenceState {
  presence_ref: string;
  user_id: string;
  online_at: string;
  typing?: boolean;
}

const MessageThread = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initializeChat();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    // Set up presence channel
    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state: any = presenceChannel.presenceState();
        const otherUserPresence: any = Object.values(state).find(
          (presence: any) => presence[0]?.user_id !== currentUser.id
        );
        
        if (otherUserPresence && otherUserPresence[0]) {
          setIsOnline(true);
          setIsTyping(otherUserPresence[0].typing || false);
        } else {
          setIsOnline(false);
          setIsTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== currentUser.id) {
          setIsOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== currentUser.id) {
          setIsOnline(false);
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      });

    channelRef.current = presenceChannel;

    // Set up messages channel
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              reactions: (newMsg.reactions as Reaction[]) || [],
            },
          ]);
          scrollToBottom();

          // Mark as delivered
          if (newMsg.sender_id !== currentUser.id) {
            supabase
              .from('messages')
              .update({ delivered: true })
              .eq('id', newMsg.id)
              .then(() => {});

            // Play notification sound
            const receivedSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVKzn7K5fGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBQ==');
            receivedSound.volume = 0.5;
            receivedSound.play().catch(() => {});

            markAsRead(newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id
                ? {
                    ...updatedMsg,
                    reactions: (updatedMsg.reactions as Reaction[]) || [],
                  }
                : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
      supabase.removeChannel(messagesChannel);
    };
  }, [conversationId, currentUser]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUser(user);

    // Get conversation and other user
    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (conversation) {
      const otherUserId = conversation.participant_ids.find((id: string) => id !== user.id);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();
      
      setOtherUser(profile);
    }

    // Fetch messages
    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesData) {
      setMessages(
        messagesData.map((msg: any) => ({
          ...msg,
          reactions: (msg.reactions as Reaction[]) || [],
        }))
      );
      scrollToBottom();
      
      // Mark all unread messages as read
      const unreadIds = messagesData
        .filter(msg => !msg.read && msg.sender_id !== user.id)
        .map(msg => msg.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", messageId);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (channelRef.current) {
      channelRef.current.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString(),
        typing: value.length > 0,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      }, 1000);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !conversationId) return;

    try {
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: newMessage.trim(),
        delivered: false,
      };

      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
      }

      if (editingMessage) {
        // Update existing message
        const { error } = await supabase
          .from("messages")
          .update({
            content: newMessage.trim(),
            edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq("id", editingMessage.id);

        if (error) throw error;
        setEditingMessage(null);
      } else {
        // Create new message
        const { error } = await supabase.from("messages").insert(messageData);
        if (error) throw error;
      }

      setNewMessage("");
      setReplyingTo(null);
      
      // Update typing status
      if (channelRef.current) {
        channelRef.current.track({
          user_id: currentUser.id,
          online_at: new Date().toISOString(),
          typing: false,
        });
      }

      // Update last message timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const reactions = message.reactions || [];
    const existingReaction = reactions.find((r) => r.emoji === emoji);

    let updatedReactions;
    if (existingReaction) {
      // Toggle reaction
      if (existingReaction.user_ids.includes(currentUser.id)) {
        existingReaction.user_ids = existingReaction.user_ids.filter(
          (id) => id !== currentUser.id
        );
        if (existingReaction.user_ids.length === 0) {
          updatedReactions = reactions.filter((r) => r.emoji !== emoji);
        } else {
          updatedReactions = reactions;
        }
      } else {
        existingReaction.user_ids.push(currentUser.id);
        updatedReactions = reactions;
      }
    } else {
      updatedReactions = [...reactions, { emoji, user_ids: [currentUser.id] }];
    }

    const { error } = await supabase
      .from("messages")
      .update({ reactions: updatedReactions })
      .eq("id", messageId);

    if (error) console.error("Error updating reaction:", error);
    setShowEmojiPicker(null);
  };

  const handleUnsend = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const startEdit = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="glass backdrop-blur-xl border-b border-primary/20 p-4 flex items-center gap-3 glow-primary">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/messages")}
          className="glass"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {otherUser && (
          <>
            <div 
              className="relative cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate(`/profile/${otherUser.id}`)}
            >
              <div className={`relative w-12 h-12 rounded-full p-[2px] transition-all duration-300 ${
                isOnline ? 'neon-green animate-pulse' : 'bg-border'
              }`}>
                <Avatar className="w-full h-full border-2 border-background avatar-glow">
                  <AvatarImage src={otherUser.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">{otherUser.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full neon-green border-2 border-background animate-pulse"></div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{otherUser.full_name}</p>
              {isTyping ? (
                <p className="text-sm neon-green-text animate-pulse">typing...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isOnline ? 'Online' : '@' + otherUser.username}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser?.id;
          const showAvatar = !isOwn;
          const repliedMessage = message.reply_to_id
            ? messages.find((m) => m.id === message.reply_to_id)
            : null;

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 group`}
            >
              {showAvatar && otherUser && (
                <Avatar 
                  className="w-8 h-8 shrink-0 avatar-glow cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => navigate(`/profile/${otherUser.id}`)}
                >
                  <AvatarImage src={otherUser.avatar_url || ""} />
                  <AvatarFallback>
                    {otherUser.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col max-w-[70%]">
                <div
                  className={`${
                    isOwn ? "bg-primary/20 backdrop-blur-lg border border-primary/30 glow-primary" : "glass glow-accent"
                  } rounded-2xl px-4 py-2 message-3d relative group`}
                >
                  {repliedMessage && (
                    <div className="mb-2 pb-2 border-b border-border/30 text-xs opacity-70">
                      <div className="flex items-center gap-1">
                        <Reply className="w-3 h-3" />
                        <span>Replying to:</span>
                      </div>
                      <p className="truncate">{repliedMessage.content}</p>
                    </div>
                  )}
                  <p className="text-sm break-words">{message.content}</p>
                  {message.edited && (
                    <span className="text-xs opacity-50 italic ml-2">edited</span>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isOwn && (
                      <div className="flex items-center gap-1">
                        {message.read ? (
                          <CheckCheck className="w-3 h-3 text-neon-green glow-accent" />
                        ) : message.delivered ? (
                          <CheckCheck className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Message Actions */}
                  <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 glass"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                    >
                      <Smile className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 glass"
                      onClick={() => setReplyingTo(message)}
                    >
                      <Reply className="h-3 w-3" />
                    </Button>
                    {isOwn && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 glass"
                          onClick={() => startEdit(message)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 glass"
                          onClick={() => handleUnsend(message.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Emoji Picker */}
                  {showEmojiPicker === message.id && (
                    <div className="absolute bottom-full mb-2 glass backdrop-blur-xl rounded-lg p-2 flex gap-1 z-10 border border-primary/20 glow-primary">
                      {["❤️", "👍", "😂", "😮", "😢", "🔥"].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="hover:scale-125 transition-transform text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Reactions Display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {message.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleReaction(message.id, reaction.emoji)}
                        className={`glass backdrop-blur-lg rounded-full px-2 py-0.5 text-xs flex items-center gap-1 hover:scale-110 transition-transform ${
                          reaction.user_ids.includes(currentUser?.id || "")
                            ? "ring-1 ring-primary glow-primary"
                            : ""
                        }`}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-[10px] opacity-70">
                          {reaction.user_ids.length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t glass backdrop-blur-xl border-primary/20">
        {replyingTo && (
          <div className="mb-2 glass backdrop-blur-lg rounded-lg p-2 flex items-center justify-between border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4" />
              <span className="opacity-70">Replying to:</span>
              <span className="truncate max-w-[200px]">{replyingTo.content}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {editingMessage && (
          <div className="mb-2 glass backdrop-blur-lg rounded-lg p-2 flex items-center justify-between border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Edit2 className="w-4 h-4" />
              <span className="opacity-70">Editing message</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={cancelEdit}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            className="flex-1 glass backdrop-blur-lg border-primary/30"
          />
          <Button onClick={handleSend} size="icon" className="shrink-0 glow-primary neon-green">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;