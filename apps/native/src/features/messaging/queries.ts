import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export type ConversationRow = {
  id: string;
  participant_ids: string[];
  last_message_at: string | null;
  created_at: string | null;
  is_group?: boolean;
  group_name?: string | null;
  group_avatar_url?: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
};

export type ProfileLite = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type ConversationPreview = {
  id: string;
  other?: ProfileLite | null;
  last?: { content: string; created_at: string } | null;
  isGroup?: boolean;
  groupName?: string | null;
  groupAvatarUrl?: string | null;
  unreadCount?: number;
};

export function useConversations(userId?: string) {
  return useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationPreview[]> => {
      if (!userId) return [];
      const convRes = await supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at, created_at, is_group, group_name, group_avatar_url')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (convRes.error) throw convRes.error;
      const conversations = (convRes.data ?? []) as unknown as ConversationRow[];
      if (conversations.length === 0) return [];

      const ids = conversations.map((c) => c.id);

      const msgRes = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false })
        .limit(200);
      if (msgRes.error) throw msgRes.error;
      const messages = (msgRes.data ?? []) as unknown as MessageRow[];

      const lastByConv = new Map<string, MessageRow>();
      for (const m of messages) {
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      }

      const otherIds = Array.from(
        new Set(
          conversations
            .flatMap((c) => c.participant_ids)
            .filter((id) => id && id !== userId),
        ),
      );

      const profilesById = new Map<string, ProfileLite>();
      if (otherIds.length > 0) {
        const profRes = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', otherIds);
        if (profRes.error) throw profRes.error;
        for (const p of (profRes.data ?? []) as unknown as ProfileLite[]) profilesById.set(p.id, p);
      }

      return conversations.map((c) => {
        const otherId = c.participant_ids.find((id) => id !== userId);
        const last = lastByConv.get(c.id);
        return {
          id: c.id,
          other: otherId ? profilesById.get(otherId) ?? null : null,
          last: last ? { content: last.content, created_at: last.created_at } : null,
          isGroup: c.is_group ?? false,
          groupName: c.group_name ?? null,
          groupAvatarUrl: c.group_avatar_url ?? null,
          unreadCount: 0,
        };
      });
    },
  });
}

// Search users for new conversations
export function useSearchUsers(query: string, userId?: string) {
  return useQuery({
    queryKey: ['search-users', query],
    enabled: !!query && query.length >= 2 && !!userId,
    queryFn: async () => {
      if (!userId || !query) return [];
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, username, full_name, avatar_url')
        .neq('id', userId)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
  });
}

// Create or get existing conversation
export function useCreateConversation(userId?: string) {
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!userId) throw new Error('Not signed in');

      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [userId, otherUserId])
        .eq('is_group', false)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [userId, otherUserId],
          is_group: false,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
  });
}

