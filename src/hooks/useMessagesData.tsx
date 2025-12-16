import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  participant_ids: string[];
  last_message_at: string;
  otherUser?: Profile;
  unreadCount?: number;
  lastMessage?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  is_group?: boolean;
  group_name?: string;
  group_avatar_url?: string;
}

// Module-level cache for instant loading
let conversationsCache: {
  data: Conversation[];
  timestamp: number;
  userId: string;
} | null = null;

const CACHE_TIME = 60 * 1000; // 1 minute

export const useMessagesData = (userId: string | null) => {
  const [conversations, setConversations] = useState<Conversation[]>(
    conversationsCache?.userId === userId ? conversationsCache.data : []
  );
  const [isLoading, setIsLoading] = useState(
    !conversationsCache || conversationsCache.userId !== userId
  );
  const isMounted = useRef(true);

  // Get pinned/archived from localStorage
  const getPinnedChats = () => {
    const saved = localStorage.getItem('pinnedChats');
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
  };

  const getArchivedChats = () => {
    const saved = localStorage.getItem('archivedChats');
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
  };

  const fetchConversations = useCallback(async (skipCache = false) => {
    if (!userId) return;

    // Use cache if valid
    if (!skipCache && conversationsCache && 
        conversationsCache.userId === userId &&
        Date.now() - conversationsCache.timestamp < CACHE_TIME) {
      setConversations(conversationsCache.data);
      setIsLoading(false);
      return;
    }

    try {
      const { data: convData, error } = await supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at, is_group, group_name, group_avatar_url')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false })
        .limit(30);

      if (error || !convData?.length) {
        setConversations([]);
        setIsLoading(false);
        conversationsCache = { data: [], timestamp: Date.now(), userId };
        return;
      }

      // Get other user IDs
      const otherUserIds = convData
        .filter(conv => !conv.is_group)
        .map(conv => conv.participant_ids.find((id: string) => id !== userId))
        .filter(Boolean) as string[];

      // Batch fetch profiles
      const { data: profiles } = otherUserIds.length > 0
        ? await supabase.from('profiles').select('id, username, avatar_url, full_name').in('id', otherUserIds)
        : { data: [] };

      const profilesMap = new Map<string, Profile>();
      profiles?.forEach(p => profilesMap.set(p.id, p as Profile));

      const pinnedChats = getPinnedChats();
      const archivedChats = getArchivedChats();

      const conversationsWithData: Conversation[] = convData.map((conv) => {
        const otherUserId = conv.participant_ids.find((id: string) => id !== userId);
        return {
          id: conv.id,
          participant_ids: conv.participant_ids,
          last_message_at: conv.last_message_at,
          is_group: conv.is_group,
          group_name: conv.group_name,
          group_avatar_url: conv.group_avatar_url,
          otherUser: conv.is_group ? undefined : profilesMap.get(otherUserId!),
          unreadCount: 0,
          lastMessage: '',
          isPinned: pinnedChats.has(conv.id),
          isArchived: archivedChats.has(conv.id),
        };
      });

      // Update cache
      conversationsCache = {
        data: conversationsWithData,
        timestamp: Date.now(),
        userId
      };

      if (isMounted.current) {
        setConversations(conversationsWithData);
        setIsLoading(false);
      }

      // Load additional data in background (last messages & unread counts)
      loadAdditionalData(convData.map(c => c.id), userId, conversationsWithData);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (isMounted.current) setIsLoading(false);
    }
  }, [userId]);

  const loadAdditionalData = async (convIds: string[], uid: string, baseData: Conversation[]) => {
    try {
      const [lastMsgsResults, unreadResults] = await Promise.all([
        Promise.all(convIds.slice(0, 15).map(id =>
          supabase.from('messages').select('content, media_type').eq('conversation_id', id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle()
        )),
        Promise.all(convIds.slice(0, 15).map(id =>
          supabase.from('messages').select('*', { count: 'exact', head: true })
            .eq('conversation_id', id).eq('read', false).neq('sender_id', uid)
        ))
      ]);

      const updates: { [key: string]: { lastMessage?: string; unreadCount?: number } } = {};

      lastMsgsResults.forEach((result, idx) => {
        if (result.data) {
          const msg = result.data;
          updates[convIds[idx]] = {
            ...updates[convIds[idx]],
            lastMessage: msg.media_type
              ? `📎 ${msg.media_type === 'image' ? 'Photo' : msg.media_type === 'video' ? 'Video' : 'File'}`
              : msg.content?.substring(0, 40) || ''
          };
        }
      });

      unreadResults.forEach((result, idx) => {
        updates[convIds[idx]] = {
          ...updates[convIds[idx]],
          unreadCount: result.count || 0
        };
      });

      const updatedData = baseData.map(conv => ({
        ...conv,
        lastMessage: updates[conv.id]?.lastMessage || conv.lastMessage,
        unreadCount: updates[conv.id]?.unreadCount ?? conv.unreadCount,
      }));

      // Update cache with additional data
      conversationsCache = {
        data: updatedData,
        timestamp: Date.now(),
        userId: uid
      };

      if (isMounted.current) {
        setConversations(updatedData);
      }
    } catch (e) {
      console.error('Error loading additional message data');
    }
  };

  const refreshConversations = useCallback(() => {
    return fetchConversations(true);
  }, [fetchConversations]);

  const invalidateCache = useCallback(() => {
    conversationsCache = null;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchConversations();
    return () => { isMounted.current = false; };
  }, [fetchConversations]);

  return { conversations, isLoading, refreshConversations, invalidateCache, setConversations };
};

// Prefetch messages for instant loading
export const prefetchMessagesData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const userId = user.id;
    if (conversationsCache && conversationsCache.userId === userId && 
        Date.now() - conversationsCache.timestamp < CACHE_TIME) return;

    const { data: convData } = await supabase
      .from('conversations')
      .select('id, participant_ids, last_message_at, is_group, group_name, group_avatar_url')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false })
      .limit(30);

    if (convData?.length) {
      const otherUserIds = convData
        .filter(conv => !conv.is_group)
        .map(conv => conv.participant_ids.find((id: string) => id !== userId))
        .filter(Boolean) as string[];

      const { data: profiles } = otherUserIds.length > 0
        ? await supabase.from('profiles').select('id, username, avatar_url, full_name').in('id', otherUserIds)
        : { data: [] };

      const profilesMap = new Map();
      profiles?.forEach(p => profilesMap.set(p.id, p));

      const pinnedChats = new Set<string>(JSON.parse(localStorage.getItem('pinnedChats') || '[]'));
      const archivedChats = new Set<string>(JSON.parse(localStorage.getItem('archivedChats') || '[]'));

      conversationsCache = {
        data: convData.map(conv => ({
          id: conv.id,
          participant_ids: conv.participant_ids,
          last_message_at: conv.last_message_at,
          is_group: conv.is_group,
          group_name: conv.group_name,
          group_avatar_url: conv.group_avatar_url,
          otherUser: conv.is_group ? undefined : profilesMap.get(conv.participant_ids.find((id: string) => id !== userId)),
          unreadCount: 0,
          lastMessage: '',
          isPinned: pinnedChats.has(conv.id),
          isArchived: archivedChats.has(conv.id),
        })),
        timestamp: Date.now(),
        userId
      };
    }
  } catch (e) {
    console.error('Messages prefetch failed');
  }
};
