import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSimpleQuery } from '@/lib/simpleQuery';

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
  const messagesChannelRef = useRef<any>(null);
  const pendingMessagesRef = useRef<Map<string, Message>>(new Map());

  const markAsRead = useCallback(async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ read: true, delivered: true })
      .eq('id', messageId);
  }, []);

  const markUnreadAsDelivered = useCallback(async () => {
    if (!conversationId || !currentUser) return;
    
    await supabase
      .from('messages')
      .update({ delivered: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUser.id)
      .eq('delivered', false);
  }, [conversationId, currentUser]);

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
          // Mark unread messages as delivered when other user comes online
          markUnreadAsDelivered();
        } else {
          setIsOnline(false);
          setIsTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== currentUser.id) {
          setIsOnline(true);
          // Mark unread messages as delivered when other user joins
          markUnreadAsDelivered();
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

          if (newMsg.sender_id !== currentUser.id) {
            supabase
              .from('messages')
              .update({ delivered: true })
              .eq('id', newMsg.id)
              .then(() => {});

            // Play loud notification sound
            const audio = new Audio('/notification.wav');
            audio.volume = 0.9;
            audio.play().catch(() => {});

            // Create push notification using service worker if available
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification('New message from ' + otherUser?.full_name, {
                  body: newMsg.content,
                  icon: otherUser?.avatar_url || '/icon-192.png',
                  badge: '/icon-192.png',
                  tag: 'message-' + newMsg.id,
                  requireInteraction: false,
                  silent: false,
                  data: {
                    url: `/message-thread/${conversationId}`,
                    type: 'message',
                  }
                });
              });
            } else if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
              new Notification('New message from ' + otherUser?.full_name, {
                body: newMsg.content,
                icon: otherUser?.avatar_url || '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'message-' + newMsg.id,
                requireInteraction: false,
              });
            }

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
          const deletedId = payload.old?.id;
          if (deletedId) {
            setMessages((prev) => {
              const filtered = prev.filter((msg) => msg.id !== deletedId);
              return filtered;
            });
          }
        }
      )
      .subscribe();

    messagesChannelRef.current = messagesChannel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
      }
    };
  }, [conversationId, currentUser, markUnreadAsDelivered, markAsRead, otherUser]);

  const initializeChat = useCallback(async () => {
    if (!conversationId) return;

    const [conversationResult, messagesResult] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),
    ]);

    if (conversationResult.data && currentUser) {
      const otherUserId = conversationResult.data.participant_ids.find(
        (id: string) => id !== currentUser.id
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      setOtherUser(profile);
    }

    if (messagesResult.data && currentUser) {
      setMessages(
        messagesResult.data.map((msg: any) => ({
          ...msg,
          reactions: (msg.reactions as Reaction[]) || [],
        }))
      );

      const unreadIds = messagesResult.data
        .filter((msg) => !msg.read && msg.sender_id !== currentUser.id)
        .map((msg) => msg.id);

      if (unreadIds.length > 0) {
        // Batch mark as read
        requestAnimationFrame(() => {
          supabase.from('messages').update({ read: true }).in('id', unreadIds);
        });
      }
    }
  }, [conversationId, currentUser]);

  const updateTypingStatus = useCallback((typing: boolean) => {
    if (channelRef.current && currentUser) {
      channelRef.current.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString(),
        typing,
      });
    }
  }, [currentUser]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const reactions = message.reactions || [];
    
    // First, remove any existing reaction from this user (enforce one emoji per user)
    const userExistingReaction = reactions.find((r) => r.user_ids.includes(currentUser.id));
    let cleanedReactions = reactions;
    
    if (userExistingReaction) {
      // Remove user from their previous reaction
      cleanedReactions = reactions.map((r) => ({
        ...r,
        user_ids: r.user_ids.filter((id) => id !== currentUser.id)
      })).filter((r) => r.user_ids.length > 0);
    }
    
    // Now handle the new emoji
    const existingReaction = cleanedReactions.find((r) => r.emoji === emoji);

    let updatedReactions;
    if (existingReaction) {
      // If clicking the same emoji they had, remove it (toggle off)
      if (userExistingReaction && userExistingReaction.emoji === emoji) {
        updatedReactions = cleanedReactions;
      } else {
        // Add user to this emoji
        existingReaction.user_ids.push(currentUser.id);
        updatedReactions = cleanedReactions;
      }
    } else {
      // Create new reaction entry with this user
      updatedReactions = [...cleanedReactions, { emoji, user_ids: [currentUser.id] }];
    }

    // Optimistic update
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, reactions: updatedReactions } : msg
      )
    );

    // Background sync
    requestAnimationFrame(async () => {
      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating reaction:', error);
        // Revert on error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reactions: message.reactions } : msg
          )
        );
      }
    });
  }, [currentUser, messages]);

  const handleDelete = useCallback(async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);

    // Optimistically remove from UI immediately
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

    // Background deletion
    requestAnimationFrame(async () => {
      if (message?.media_url) {
        try {
          const urlParts = message.media_url.split('/');
          const filePath = urlParts.slice(-2).join('/');
          await supabase.storage.from('stories').remove([filePath]);
        } catch (error) {
          console.error('Error deleting media file:', error);
        }
      }

      const { error } = await supabase.from('messages').delete().eq('id', messageId);
      if (error) {
        console.error('Error deleting message:', error);
        // Revert optimistic update on error
        if (message) {
          setMessages((prev) => [...prev, message].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ));
        }
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
    });
  }, [messages, toast]);

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
