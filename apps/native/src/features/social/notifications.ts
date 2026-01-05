import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  content: string;
  read: boolean | null;
  created_at: string;
};

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationRow[]> => {
      if (!userId) return [];
      const res = await supabase
        .from('notifications')
        .select('id, user_id, type, content, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as NotificationRow[];
    },
  });
}

