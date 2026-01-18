import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title?: string;
  message?: string;
  content?: string;
  reference_id?: string | null;
  reference_type?: string | null;
  actor_id?: string | null;
  is_read?: boolean;
  read?: boolean | null;
  created_at: string;
  actor?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationRow[]> => {
      if (!userId) return [];
      const res = await supabase
        .from('notifications')
        .select(`
          id, 
          user_id, 
          type, 
          title,
          message,
          reference_id,
          reference_type,
          actor_id,
          is_read, 
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (res.error) throw res.error;
      
      // Fetch actor profiles
      const actorIds = [...new Set((res.data ?? []).map((n: any) => n.actor_id).filter(Boolean))];
      const actorMap = new Map<string, any>();

      if (actorIds.length > 0) {
        const { data: actors } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', actorIds);
        (actors ?? []).forEach((a: any) => actorMap.set(a.id, a));
      }

      return (res.data ?? []).map((n: any) => ({
        ...n,
        actor: n.actor_id ? actorMap.get(n.actor_id) ?? null : null,
      }));
    },
    staleTime: 30_000,
  });
}

export function useUnreadCount(userId?: string) {
  return useQuery({
    queryKey: ['unread-notifications', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead(userId?: string) {
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications', userId] });
    },
  });
}

export function useMarkAllNotificationsRead(userId?: string) {
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications', userId] });
    },
  });
}

