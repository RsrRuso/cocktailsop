import { useCallback } from 'react';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const showNotification = useCallback(async (
    title: string,
    body: string,
    options?: NotificationOptions
  ) => {
    if (!('Notification' in window)) {
      toast.info(title, { description: body });
      return;
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      new Notification(title, { body, ...options });
    } else {
      toast.info(title, { description: body });
    }
  }, []);

  return { showNotification, requestPermission };
};
