import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type ConversationRow = {
  id: string;
  participant_ids: string[];
  last_message_at: string | null;
  created_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
};

export function useConversations(userId?: string) {
  return useQuery({
    queryKey: ['conversations', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConversationPreview[]> => {
      if (!userId) return [];
      const convRes = await supabase
        .from('conversations')
        .select('id, participant_ids, last_message_at, created_at')
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
        };
      });
    },
  });
}

