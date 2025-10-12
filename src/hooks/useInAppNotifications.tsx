import { useState, useCallback } from 'react';
import { NotificationData } from '@/components/InAppNotification';
import { playNotificationSound } from '@/lib/notificationSound';

export const useInAppNotifications = () => {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback((
    title: string,
    message: string,
    type?: 'message' | 'like' | 'comment' | 'follow' | 'default'
  ) => {
    const notification: NotificationData = {
      id: Date.now().toString(),
      title,
      message,
      type: type || 'default',
      timestamp: new Date(),
    };

    console.log('[IN-APP NOTIFICATION] Creating notification:', notification);
    setCurrentNotification(notification);
    playNotificationSound(0.6);
    console.log('[IN-APP NOTIFICATION] Notification state updated');
  }, []);

  const closeNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  return {
    currentNotification,
    showNotification,
    closeNotification,
  };
};
