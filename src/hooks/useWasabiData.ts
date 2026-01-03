import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

const CACHE_TTL = 300000; // 5 minutes

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

  const convsDebounceRef = useRef<number | null>(null);
  const channelsDebounceRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (convsDebounceRef.current) window.clearTimeout(convsDebounceRef.current);
      if (channelsDebounceRef.current) window.clearTimeout(channelsDebounceRef.current);
    };
  }, []);

  const fetchConversations = useCallback(async (showLoading = true) => {
    const cachedConvs = getCache<WasabiConversation[]>(CACHE_KEYS.conversations);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      if (showLoading && !cachedConvs) {
        setLoading(true);
      }

      // Memberships + conversation meta (single query)
      const { data: membershipsData, error: memberError } = await supabase
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
        .limit(50);

      if (memberError) throw memberError;

      const membershipRows = membershipsData || [];
      const convRows = membershipRows
        .map((m: any) => ({ membership: m, conv: m.wasabi_conversations as any }))
        .filter((x) => Boolean(x.conv?.id));

      const convIds = convRows.map((x) => x.conv.id as string);

      // Batch: last messages (single query, then pick latest per conversation)
      const lastMessageByConv = new Map<string, any>();
      if (convIds.length) {
        const limit = Math.min(Math.max(convIds.length * 5, 25), 300);
        const { data: recentMessages, error: recentErr } = await supabase
          .from('wasabi_messages')
          .select('conversation_id, content, message_type, sender_id, created_at')
          .in('conversation_id', convIds)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (recentErr) throw recentErr;

        for (const msg of recentMessages || []) {
          if (!lastMessageByConv.has(msg.conversation_id)) {
            lastMessageByConv.set(msg.conversation_id, msg);
          }
        }
      }

      // Batch: other user profiles for 1:1 conversations
      const oneToOneConvIds = convRows
        .filter((x) => !x.conv.is_group)
        .map((x) => x.conv.id as string);

      const otherUserByConv = new Map<string, WasabiConversation['other_user']>();

      if (oneToOneConvIds.length) {
        const { data: otherMembers, error: otherErr } = await supabase
          .from('wasabi_members')
          .select('conversation_id, user_id')
          .in('conversation_id', oneToOneConvIds)
          .neq('user_id', user.id);

        if (otherErr) throw otherErr;

        const otherUserIds = Array.from(
          new Set((otherMembers || []).map((m: any) => m.user_id).filter(Boolean))
        ) as string[];

        if (otherUserIds.length) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', otherUserIds);

          if (profErr) throw profErr;

          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

          for (const m of otherMembers || []) {
            if (!otherUserByConv.has(m.conversation_id)) {
              otherUserByConv.set(
                m.conversation_id,
                (profileMap.get(m.user_id) as any) || undefined
              );
            }
          }
        }
      }

      // Build conversations (fast path: no unread counts yet)
      const conversationsData: WasabiConversation[] = convRows.map(({ membership, conv }) => {
        const last = lastMessageByConv.get(conv.id);

        return {
          id: conv.id,
          name: conv.name,
          is_group: conv.is_group,
          avatar_url: conv.avatar_url,
          last_message_at: last?.created_at || conv.last_message_at,
          last_message: last
            ? {
                content: last.content,
                message_type: last.message_type,
                sender_id: last.sender_id,
              }
            : undefined,
          unread_count: 0,
          other_user: conv.is_group ? undefined : otherUserByConv.get(conv.id),
          muted: membership.muted,
          archived: membership.archived,
          pinned: conv.pinned,
        };
      });

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

      // Background: unread counts (doesn't block UI)
      if (convIds.length) {
        const lastReadMap = new Map<string, string>();
        for (const m of membershipRows as any[]) {
          const id = (m.wasabi_conversations as any)?.id;
          if (id) lastReadMap.set(id, m.last_read_at);
        }

        const queue = [...convIds];
        const results = new Map<string, number>();
        const workerCount = Math.min(5, queue.length);

        void (async () => {
          await Promise.all(
            Array.from({ length: workerCount }).map(async () => {
              while (queue.length) {
                const convId = queue.shift();
                if (!convId) return;

                const lastReadAt = lastReadMap.get(convId) || '1970-01-01';
                const { count, error } = await supabase
                  .from('wasabi_messages')
                  .select('id', { count: 'exact', head: true })
                  .eq('conversation_id', convId)
                  .neq('sender_id', user.id)
                  .gt('created_at', lastReadAt);

                if (!error) results.set(convId, count || 0);
              }
            })
          );

          if (!isMountedRef.current || results.size === 0) return;

          setConversations((prev) => {
            const next = prev.map((c) => ({
              ...c,
              unread_count: results.has(c.id)
                ? (results.get(c.id) as number)
                : c.unread_count,
            }));
            setCache(CACHE_KEYS.conversations, next);
            return next;
          });
        })();
      }
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

    const scheduleConversations = () => {
      if (convsDebounceRef.current) window.clearTimeout(convsDebounceRef.current);
      convsDebounceRef.current = window.setTimeout(() => {
        fetchConversations(false);
      }, 350);
    };

    const scheduleChannels = () => {
      if (channelsDebounceRef.current) window.clearTimeout(channelsDebounceRef.current);
      channelsDebounceRef.current = window.setTimeout(() => {
        fetchChannels(false);
      }, 350);
    };

    const channel = supabase
      .channel('wasabi-updates-main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wasabi_messages' },
        scheduleConversations
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages' },
        scheduleChannels
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
