import { useState, useCallback } from 'react';
import { NotificationData } from '@/components/InAppNotification';
import { playNotificationSound } from '@/lib/notificationSound';

export const useInAppNotifications = () => {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback((
    title: string,
    message: string,
    type?: 'message' | 'like' | 'comment' | 'follow' | 'new_user' | 'transaction' | 'receiving' | 'default',
    onClick?: () => void
  ) => {
    const notification: NotificationData = {
      id: Date.now().toString(),
      title,
      message,
      type: type || 'default',
      timestamp: new Date(),
      onClick,
    };

    setCurrentNotification(notification);
    playNotificationSound(0.9);
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
