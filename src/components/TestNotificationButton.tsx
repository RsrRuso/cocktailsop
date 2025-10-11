import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useInAppNotificationContext } from '@/contexts/InAppNotificationContext';

export const TestNotificationButton = () => {
  const { showNotification } = useInAppNotificationContext();

  const testNotifications = [
    { title: 'New Message', message: 'Hey! How are you doing?', type: 'message' as const },
    { title: 'New Like', message: 'Someone liked your post', type: 'like' as const },
    { title: 'New Comment', message: 'Great content! Keep it up 👍', type: 'comment' as const },
    { title: 'New Follower', message: 'John started following you', type: 'follow' as const },
  ];

  const handleTest = () => {
    const randomNotif = testNotifications[Math.floor(Math.random() * testNotifications.length)];
    showNotification(randomNotif.title, randomNotif.message, randomNotif.type);
  };

  return (
    <Button
      onClick={handleTest}
      variant="outline"
      className="fixed bottom-24 right-4 z-50 glass shadow-lg"
    >
      <Bell className="w-4 h-4 mr-2" />
      Test Notification
    </Button>
  );
};
