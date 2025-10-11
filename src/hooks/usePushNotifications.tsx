import { useEffect, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const { toast } = useToast();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      if (isNative) {
        const result = await LocalNotifications.checkPermissions();
        setPermissionGranted(result.display === 'granted');
      } else {
        // Web browser - check browser Notification API
        if ('Notification' in window) {
          setPermissionGranted(Notification.permission === 'granted');
        }
      }
    } catch (error) {
      // Silently fail - feature not available
      console.log('Notifications not available in this environment');
    }
  };

  const requestPermission = async () => {
    try {
      if (isNative) {
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
      } else {
        // Web browser
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          const granted = permission === 'granted';
          setPermissionGranted(granted);

          if (granted) {
            toast({
              title: "Notifications Enabled",
              description: "You will now receive browser notifications",
            });
          } else {
            toast({
              title: "Notifications Disabled",
              description: "Please allow notifications in your browser",
              variant: "destructive",
            });
          }

          return granted;
        } else {
          toast({
            title: "Not Supported",
            description: "Notifications are not supported in this browser. They will work in the mobile app.",
          });
          return false;
        }
      }
    } catch (error) {
      toast({
        title: "Not Available",
        description: "Notifications are only available in the mobile app",
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
      if (isNative) {
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
      } else {
        // Web browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          });
        }
      }
    } catch (error) {
      // Silently fail
      console.log('Could not send notification');
    }
  };

  return {
    permissionGranted,
    requestPermission,
    sendNotification,
  };
};
