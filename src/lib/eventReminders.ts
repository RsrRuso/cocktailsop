import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const scheduleEventReminder = async (eventTitle: string, eventDate: string | null) => {
  // Only works on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Request permission
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
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

export const addToCalendar = async (
  eventTitle: string,
  eventDate: string | null,
  description?: string
) => {
  if (!eventDate) return false;

  const eventDateTime = new Date(eventDate);
  const endDateTime = new Date(eventDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

  // Create .ics file download (works on all platforms)
  const icsContent = generateICSFile(eventTitle, eventDateTime, endDateTime, description);
  downloadICSFile(icsContent, `${eventTitle}.ics`);
  return true;
};

const generateICSFile = (
  title: string,
  startDate: Date,
  endDate: Date,
  description?: string
): string => {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spec Verse//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description || title}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

const downloadICSFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
