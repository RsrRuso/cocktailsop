import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const scheduleEventReminder = async (eventTitle: string, eventDate: string | null) => {
  // Only works on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications only available on native platforms');
    return;
  }

  try {
    // Request permission
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Schedule notification for the event
    if (eventDate) {
      const eventDateTime = new Date(eventDate);
      const reminderTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000); // 1 hour before

      if (reminderTime > new Date()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Event Reminder',
              body: `"${eventTitle}" starts in 1 hour!`,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: reminderTime },
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: null,
            },
          ],
        });
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
  return false;
};
