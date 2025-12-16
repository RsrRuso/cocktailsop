import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
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

const CACHE_TIME = 30 * 1000; // 30 seconds for notifications (more time-sensitive)

export const useNotificationsData = (userId: string | null) => {
  const [notifications, setNotifications] = useState<Notification[]>(
    notificationsCache?.userId === userId ? notificationsCache.data : []
  );
  const [isLoading, setIsLoading] = useState(
    !notificationsCache || notificationsCache.userId !== userId
  );
  const isMounted = useRef(true);

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

  const refreshNotifications = useCallback(() => {
    return fetchNotifications(true);
  }, [fetchNotifications]);

  const invalidateCache = useCallback(() => {
    notificationsCache = null;
  }, []);

  // Add notification to cache (for real-time updates)
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev.filter(n => n.id !== notification.id)];
      if (notificationsCache) {
        notificationsCache.data = updated;
      }
      return updated;
    });
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    
    if (notificationsCache) {
      notificationsCache.data = notificationsCache.data.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (notificationsCache) {
      notificationsCache.data = notificationsCache.data.map(n => ({ ...n, read: true }));
    }
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();
    return () => { isMounted.current = false; };
  }, [fetchNotifications]);

  return { 
    notifications, 
    isLoading, 
    refreshNotifications, 
    invalidateCache,
    addNotification,
    markAsRead,
    markAllAsRead,
    setNotifications
  };
};

// Prefetch notifications for instant loading
export const prefetchNotificationsData = async (userId: string) => {
  if (notificationsCache && notificationsCache.userId === userId && 
      Date.now() - notificationsCache.timestamp < CACHE_TIME) return;

  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .neq('type', 'message')
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      notificationsCache = {
        data: data as Notification[],
        timestamp: Date.now(),
        userId
      };
    }
  } catch (e) {
    console.error('Notifications prefetch failed');
  }
};

// Get unread count from cache
export const getUnreadNotificationsCount = (): number => {
  if (!notificationsCache) return 0;
  return notificationsCache.data.filter(n => !n.read).length;
};
