import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  post_id?: string;
  reel_id?: string;
  story_id?: string;
  music_share_id?: string;
  event_id?: string;
  reference_user_id?: string;
}

// Module-level cache for instant loading
let notificationsCache: {
  data: Notification[];
  timestamp: number;
  userId: string;
} | null = null;

const CACHE_TIME = 1 * 60 * 1000; // 1 minute

export const useNotificationsData = () => {
  const [notifications, setNotifications] = useState<Notification[]>(notificationsCache?.data || []);
  const [isLoading, setIsLoading] = useState(!notificationsCache);
  const [userId, setUserId] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Get user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const fetchNotifications = useCallback(async (skipCache = false) => {
    if (!userId) return;

    // Use cache if valid
    if (!skipCache && notificationsCache && 
        notificationsCache.userId === userId &&
        Date.now() - notificationsCache.timestamp < CACHE_TIME) {
      setNotifications(notificationsCache.data);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .neq('type', 'message')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Update cache
      notificationsCache = {
        data: data as Notification[] || [],
        timestamp: Date.now(),
        userId
      };

      if (isMounted.current) {
        setNotifications(data as Notification[] || []);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (isMounted.current) setIsLoading(false);
    }
  }, [userId]);

  const refreshNotifications = useCallback(async () => {
    return fetchNotifications(true);
  }, [fetchNotifications]);

  // Invalidate cache (call when notifications are updated)
  const invalidateCache = useCallback(() => {
    notificationsCache = null;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (userId) {
      fetchNotifications();
    }
    return () => { isMounted.current = false; };
  }, [fetchNotifications, userId]);

  return { 
    notifications, 
    isLoading, 
    refreshNotifications, 
    invalidateCache,
    setNotifications,
    userId
  };
};

// Prefetch notifications for instant loading
export const prefetchNotificationsData = async () => {
  if (notificationsCache && Date.now() - notificationsCache.timestamp < CACHE_TIME) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .neq('type', 'message')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      notificationsCache = { 
        data: data as Notification[], 
        timestamp: Date.now(),
        userId: user.id
      };
    }
  } catch (e) {
    console.error('Notifications prefetch failed');
  }
};
