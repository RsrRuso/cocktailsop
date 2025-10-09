import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  delivered: boolean;
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
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initializeChat();
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      const channel = supabase
        .channel(`messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollToBottom();
            
            // Play notification sound
            if (payload.new.sender_id === currentUserId) {
              // Sent message sound
              const sentSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVKzn7K5fGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBQ==');
              sentSound.volume = 0.3;
              sentSound.play().catch(() => {});
            } else {
              // Received message sound
              const receivedSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVKzn7K5fGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBQ==');
              receivedSound.volume = 0.5;
              receivedSound.play().catch(() => {});
            }
            
            // Mark as read if from other user
            if (payload.new.sender_id !== currentUserId) {
              markAsRead(payload.new.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, currentUserId]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);

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
      setMessages(messagesData);
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

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (channelRef.current) {
      channelRef.current.track({
        user_id: currentUserId,
        online_at: new Date().toISOString(),
        typing: value.length > 0
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
            typing: false
          });
        }
      }, 1000);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        delivered: false
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return;
    }

    // Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    setNewMessage("");
    
    if (channelRef.current) {
      channelRef.current.track({
        user_id: currentUserId,
        online_at: new Date().toISOString(),
        typing: false
      });
    }
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
      <div className="glass border-b border-border/50 p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/messages")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {otherUser && (
          <>
            <div className="relative">
              <div className={`relative w-12 h-12 rounded-full p-[2px] transition-all duration-300 ${
                isOnline ? 'neon-green' : 'bg-border'
              }`}>
                <Avatar className={`w-full h-full border-2 border-background ${
                  isOnline ? 'animate-pulse' : ''
                }`}>
                  <AvatarImage src={otherUser.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">{otherUser.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full neon-green border-2 border-background"></div>
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
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 message-3d transition-all duration-300 ${
                message.sender_id === currentUserId
                  ? 'bg-primary text-primary-foreground'
                  : 'glass'
              }`}
            >
              <p className="text-sm break-words">{message.content}</p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${
                message.sender_id === currentUserId 
                  ? 'text-primary-foreground/70 justify-end' 
                  : 'text-muted-foreground'
              }`}>
                <span>
                  {new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {message.sender_id === currentUserId && (
                  <>
                    {message.read ? (
                      <CheckCheck className="w-3 h-3 neon-green-text" />
                    ) : message.delivered ? (
                      <CheckCheck className="w-3 h-3" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-border/50 p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 glass"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="neon-green"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
