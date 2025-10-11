import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Reaction {
  emoji: string;
  user_ids: string[];
}

export interface Message {
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
  media_url?: string;
  media_type?: 'image' | 'video' | 'voice' | 'document';
}

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

export const useMessageThread = (conversationId: string | undefined, currentUser: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

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
      .on('presence', { event: 'join' }, ({ key }) => {
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
          try {
            const newMsg = payload.new as any;
            
            // Prevent duplicate messages
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              
              return [
                ...prev,
                {
                  ...newMsg,
                  reactions: Array.isArray(newMsg.reactions) ? newMsg.reactions : [],
                },
              ];
            });

            if (newMsg.sender_id !== currentUser.id) {
              supabase
                .from('messages')
                .update({ delivered: true })
                .eq('id', newMsg.id)
                .then(() => {});

              const receivedSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVKzn7K5fGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBQ==');
              receivedSound.volume = 1.0;
              receivedSound.play().catch(() => {});

              if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                new Notification('New message from ' + otherUser?.full_name, {
                  body: newMsg.content || 'Sent a media file',
                  icon: otherUser?.avatar_url || '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: 'message-' + newMsg.id,
                  requireInteraction: false,
                });
              }

              markAsRead(newMsg.id);
            }
          } catch (error) {
            // Silently handle parse errors
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
          try {
            const updatedMsg = payload.new as any;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMsg.id
                  ? {
                      ...updatedMsg,
                      reactions: Array.isArray(updatedMsg.reactions) ? updatedMsg.reactions : [],
                    }
                  : msg
              )
            );
          } catch (error) {
            // Silently handle parse errors
            return;
          }
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
  }, [conversationId, currentUser, otherUser]);

  const initializeChat = async () => {
    if (!conversationId) return;

    const { data: conversationData } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationData && currentUser) {
      const otherUserId = conversationData.participant_ids.find(
        (id: string) => id !== currentUser.id
      );

      // Fetch other user profile and messages in parallel
      const [profileResult, messagesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', otherUserId)
          .single(),
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100),
      ]);

      if (profileResult.data) {
        setOtherUser(profileResult.data);
      }

      if (messagesResult.data && currentUser) {
        setMessages(
          messagesResult.data.map((msg: any) => ({
            ...msg,
            reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
          }))
        );

        const unreadIds = messagesResult.data
          .filter((msg) => !msg.read && msg.sender_id !== currentUser.id)
          .map((msg) => msg.id);

        if (unreadIds.length > 0) {
          supabase.from('messages').update({ read: true }).in('id', unreadIds).then(() => {});
        }
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from('messages').update({ read: true }).eq('id', messageId);
  };

  const updateTypingStatus = (typing: boolean) => {
    if (channelRef.current && currentUser) {
      channelRef.current.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString(),
        typing,
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

    await supabase
      .from('messages')
      .update({ reactions: updatedReactions })
      .eq('id', messageId);
  };

  const handleDelete = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);

    if (message?.media_url) {
      try {
        const urlParts = message.media_url.split('/');
        const filePath = urlParts.slice(-2).join('/');
        await supabase.storage.from('stories').remove([filePath]);
      } catch (error) {
        // Silently fail media deletion
      }
    }

    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    }
  };

  return {
    messages,
    setMessages,
    otherUser,
    isOnline,
    isTyping,
    initializeChat,
    updateTypingStatus,
    handleReaction,
    handleDelete,
  };
};