import { memo } from "react";
import { NotificationItem } from "./NotificationItem";
import { Briefcase, Users } from "lucide-react";

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

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  startIndex: number;
  category?: 'work' | 'social' | 'all';
}

export const NotificationGroup = memo(({ title, notifications, onNotificationClick, startIndex, category }: NotificationGroupProps) => {
  if (notifications.length === 0) return null;

  const getCategoryIcon = () => {
    if (category === 'work') return <Briefcase className="w-3 h-3" />;
    if (category === 'social') return <Users className="w-3 h-3" />;
    return null;
  };

  const getCategoryColor = () => {
    if (category === 'work') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (category === 'social') return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-10 py-2 px-1 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getCategoryColor()}`}>
          {getCategoryIcon()}
          {title}
        </span>
        <span className="text-xs text-muted-foreground">
          {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
        </span>
      </div>
      <div className="space-y-2">
        {notifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClick={onNotificationClick}
            index={startIndex + index}
          />
        ))}
      </div>
    </div>
  );
});

NotificationGroup.displayName = "NotificationGroup";
