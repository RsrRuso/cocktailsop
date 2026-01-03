import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WasabiConversation {
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

export interface CommunityChannel {
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

export interface ChannelMembership {
  channel_id: string;
  role: string;
  is_muted: boolean;
}

// Session storage keys
const CACHE_KEYS = {
  conversations: 'wasabi_conversations_cache',
  channels: 'wasabi_channels_cache',
  memberships: 'wasabi_memberships_cache',
  timestamp: 'wasabi_cache_timestamp',
};

const CACHE_TTL = 30000; // 30 seconds

const getCache = <T>(key: string): T | null => {
  try {
    const timestamp = sessionStorage.getItem(CACHE_KEYS.timestamp);
    if (timestamp && Date.now() - parseInt(timestamp) > CACHE_TTL) {
      return null;
    }
    const cached = sessionStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCache = <T>(key: string, data: T): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString());
  } catch {
    // Storage full or unavailable
  }
};

export const useWasabiData = () => {
  const [conversations, setConversations] = useState<WasabiConversation[]>(() => 
    getCache<WasabiConversation[]>(CACHE_KEYS.conversations) || []
  );
  const [channels, setChannels] = useState<CommunityChannel[]>(() =>
    getCache<CommunityChannel[]>(CACHE_KEYS.channels) || []
  );
  const [memberships, setMemberships] = useState<Map<string, ChannelMembership>>(() => {
    const cached = getCache<[string, ChannelMembership][]>(CACHE_KEYS.memberships);
    return cached ? new Map(cached) : new Map();
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!getCache(CACHE_KEYS.conversations));
  const [channelsLoading, setChannelsLoading] = useState(!getCache(CACHE_KEYS.channels));

  const fetchConversations = useCallback(async (showLoading = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (showLoading && !getCache(CACHE_KEYS.conversations)) {
        setLoading(true);
      }

      // Optimized: Single query with join for better performance
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

      // Batch fetch last messages for all conversations
      const convIds = (membershipsData || [])
        .map(m => (m.wasabi_conversations as any)?.id)
        .filter(Boolean);

      // Get unread counts in parallel
      const unreadResults = await Promise.all(convIds.map(async (convId: string) => {
        const membership = membershipsData?.find(m => (m.wasabi_conversations as any)?.id === convId);
        const { count } = await supabase
          .from('wasabi_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id)
          .gt('created_at', membership?.last_read_at || '1970-01-01');
        return { convId, count: count || 0 };
      }));

      // Build unread map
      const unreadMap = new Map(unreadResults.map(r => [r.convId, r.count]));

      // Build conversations with details
      const conversationsData: WasabiConversation[] = [];

      for (const membership of membershipsData || []) {
        const conv = membership.wasabi_conversations as any;
        if (!conv) continue;

        // Fetch last message for this conversation
        const { data: lastMessage } = await supabase
          .from('wasabi_messages')
          .select('content, message_type, sender_id, created_at')
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

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
          unread_count: unreadMap.get(conv.id) || 0,
          other_user: otherUser,
          muted: membership.muted,
          archived: membership.archived,
          pinned: conv.pinned
        });
      }

      // Sort: pinned first, then by last message time
      conversationsData.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const aTime = new Date(a.last_message_at || 0).getTime();
        const bTime = new Date(b.last_message_at || 0).getTime();
        return bTime - aTime;
      });

      setConversations(conversationsData);
      setCache(CACHE_KEYS.conversations, conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChannels = useCallback(async (showLoading = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (showLoading && !getCache(CACHE_KEYS.channels)) {
        setChannelsLoading(true);
      }

      const [channelsResult, membershipsResult] = await Promise.all([
        supabase
          .from('community_channels')
          .select('*')
          .order('is_official', { ascending: false })
          .order('member_count', { ascending: false }),
        supabase
          .from('community_channel_members')
          .select('channel_id, role, is_muted')
          .eq('user_id', user.id)
      ]);

      if (channelsResult.error) throw channelsResult.error;

      setChannels(channelsResult.data || []);
      setCache(CACHE_KEYS.channels, channelsResult.data || []);

      const membershipMap = new Map<string, ChannelMembership>();
      membershipsResult.data?.forEach((m) => 
        membershipMap.set(m.channel_id, m as ChannelMembership)
      );
      setMemberships(membershipMap);
      setCache(CACHE_KEYS.memberships, Array.from(membershipMap.entries()));
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchConversations(false), fetchChannels(false)]);
  }, [fetchConversations, fetchChannels]);

  // Initial load and realtime subscription
  useEffect(() => {
    fetchConversations();
    fetchChannels();

    const channel = supabase
      .channel('wasabi-updates-main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wasabi_messages' },
        () => fetchConversations(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages' },
        () => fetchChannels(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, fetchChannels]);

  return {
    conversations,
    channels,
    memberships,
    currentUserId,
    loading,
    channelsLoading,
    refresh,
    fetchConversations,
    fetchChannels,
  };
};

// Prefetch function for instant loading
export const prefetchWasabiData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if already cached recently
    const timestamp = sessionStorage.getItem(CACHE_KEYS.timestamp);
    if (timestamp && Date.now() - parseInt(timestamp) < CACHE_TTL) {
      return;
    }

    // Parallel fetch
    const [membershipsData, channelsData] = await Promise.all([
      supabase
        .from('wasabi_members')
        .select(`
          conversation_id,
          muted,
          archived,
          last_read_at,
          wasabi_conversations (
            id, name, is_group, avatar_url, last_message_at, pinned
          )
        `)
        .eq('user_id', user.id)
        .order('last_read_at', { ascending: false })
        .limit(20),
      supabase
        .from('community_channels')
        .select('*')
        .order('is_official', { ascending: false })
        .limit(20)
    ]);

    if (channelsData.data) {
      setCache(CACHE_KEYS.channels, channelsData.data);
    }

    // Simple conversation cache for instant display
    if (membershipsData.data) {
      const quickConvs = membershipsData.data
        .filter(m => m.wasabi_conversations)
        .map(m => {
          const conv = m.wasabi_conversations as any;
          return {
            id: conv.id,
            name: conv.name,
            is_group: conv.is_group,
            avatar_url: conv.avatar_url,
            last_message_at: conv.last_message_at,
            unread_count: 0,
            muted: m.muted,
            archived: m.archived,
            pinned: conv.pinned,
          };
        });
      setCache(CACHE_KEYS.conversations, quickConvs);
    }
  } catch (error) {
    console.error('Prefetch error:', error);
  }
};
