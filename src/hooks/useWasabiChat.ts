import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Message {
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
}

export interface ChatInfo {
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

// Cache for chat data
const chatCache = new Map<string, { messages: Message[]; chatInfo: ChatInfo; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export const useWasabiChat = (conversationId: string | undefined) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  // Try to load from cache first
  useEffect(() => {
    if (!conversationId) return;
    
    const cached = chatCache.get(conversationId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setMessages(cached.messages);
      setChatInfo(cached.chatInfo);
      setLoading(false);
    }
  }, [conversationId]);

  const fetchChatInfo = useCallback(async () => {
    if (!conversationId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to use chat');
        navigate('/auth');
        return null;
      }
      setCurrentUserId(user.id);

      // Check membership
      const { data: membership, error: membershipError } = await supabase
        .from('wasabi_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        toast.error("You don't have access to this chat");
        navigate('/wasabi');
        return null;
      }

      const { data: conv, error } = await supabase
        .from('wasabi_conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) throw error;
      if (!conv) {
        toast.error('Chat not found');
        navigate('/wasabi');
        return null;
      }

      let info: ChatInfo = {
        id: conv.id,
        name: conv.name,
        is_group: conv.is_group,
        avatar_url: conv.avatar_url,
      };

      if (!conv.is_group) {
        const { data: otherMember } = await supabase
          .from('wasabi_members')
          .select('user_id')
          .eq('conversation_id', conversationId)
          .neq('user_id', user.id)
          .maybeSingle();

        if (otherMember) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .eq('id', otherMember.user_id)
            .maybeSingle();
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
      return info;
    } catch (error: any) {
      console.error('Error fetching chat info:', error);
      const msg = String(error?.message || error);
      toast.error(msg.includes('row-level security') 
        ? "You don't have access to this chat" 
        : 'Failed to load chat'
      );
      return null;
    }
  }, [conversationId, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check membership
      const { data: membership } = await supabase
        .from('wasabi_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('wasabi_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Batch fetch profiles for efficiency
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Batch fetch reactions
      const messageIds = (data || []).map(m => m.id);
      const { data: allReactions } = await supabase
        .from('wasabi_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds);

      const reactionsMap = new Map<string, { emoji: string; user_id: string }[]>();
      allReactions?.forEach(r => {
        if (!reactionsMap.has(r.message_id)) {
          reactionsMap.set(r.message_id, []);
        }
        reactionsMap.get(r.message_id)!.push({ emoji: r.emoji, user_id: r.user_id });
      });

      // Build messages with details
      const messagesWithDetails: Message[] = (data || []).map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id),
        reactions: reactionsMap.get(msg.id) || [],
      }));

      setMessages(messagesWithDetails);

      // Update cache
      const currentChatInfo = chatCache.get(conversationId)?.chatInfo;
      if (currentChatInfo) {
        chatCache.set(conversationId, {
          messages: messagesWithDetails,
          chatInfo: currentChatInfo,
          timestamp: Date.now(),
        });
      }

      // Update last read
      await supabase
        .from('wasabi_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (
    content: string,
    replyToId?: string | null
  ) => {
    if (!content.trim() || !currentUserId || !conversationId) return false;

    if (!navigator.onLine) {
      toast.error("You're offline", { description: 'Reconnect to send messages' });
      return false;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('wasabi_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim(),
          message_type: 'text',
          reply_to_id: replyToId || null,
        });

      if (error) throw error;

      await supabase
        .from('wasabi_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      const msg = String(error?.message || error);
      toast.error(
        msg.includes('row-level security')
          ? "You can't send messages in this chat"
          : 'Failed to send message'
      );
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId, currentUserId]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      const { data: existing } = await supabase
        .from('wasabi_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        await supabase.from('wasabi_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('wasabi_reactions').insert({
          message_id: messageId,
          user_id: currentUserId,
          emoji
        });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  }, [currentUserId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await supabase
        .from('wasabi_messages')
        .update({ is_deleted: true, content: null })
        .eq('id', messageId);
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  }, []);

  // Initialize and subscribe
  useEffect(() => {
    if (!conversationId || hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const info = await fetchChatInfo();
      if (info) {
        chatCache.set(conversationId, {
          messages: [],
          chatInfo: info,
          timestamp: Date.now(),
        });
      }
      await fetchMessages();
    };

    init();

    const channel = supabase
      .channel(`wasabi-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wasabi_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => fetchMessages()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wasabi_reactions',
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      hasInitialized.current = false;
    };
  }, [conversationId, fetchChatInfo, fetchMessages]);

  return {
    messages,
    chatInfo,
    loading,
    sending,
    currentUserId,
    sendMessage,
    handleReaction,
    deleteMessage,
    refresh: fetchMessages,
  };
};
