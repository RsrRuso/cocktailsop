import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function useThread(conversationId: string) {
  return useQuery({
    queryKey: ['thread', conversationId],
    queryFn: async (): Promise<MessageRow[]> => {
      const res = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as MessageRow[];
    },
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      senderId,
      content,
    }: {
      conversationId: string;
      senderId: string;
      content: string;
    }) => {
      const res = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: senderId, content })
        .select('id, conversation_id, sender_id, content, created_at')
        .single();
      if (res.error) throw res.error;
      return res.data as unknown as MessageRow;
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['thread', vars.conversationId] });
      await queryClient.invalidateQueries({ queryKey: ['conversations', vars.senderId] });
    },
  });
}

