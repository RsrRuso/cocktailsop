import { useEffect, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const { toast } = useToast();
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const result = await LocalNotifications.checkPermissions();
      setPermissionGranted(result.display === 'granted');
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setPermissionGranted(granted);

      if (granted) {
        toast({
          title: "Notifications Enabled",
          description: "You will now receive push notifications on your device",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Please enable notifications in your device settings",
          variant: "destructive",
        });
      }

      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permissions",
        variant: "destructive",
      });
      return false;
    }
  };

  const sendNotification = async (title: string, body: string, data?: any) => {
    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            sound: 'notification.wav',
            extra: data,
            smallIcon: 'ic_stat_icon_config_sample',
            iconColor: '#FF6B6B',
          },
        ],
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return {
    permissionGranted,
    requestPermission,
    sendNotification,
  };
};
