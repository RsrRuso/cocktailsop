import { memo } from "react";
import { NotificationItem } from "./NotificationItem";

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
}

export const NotificationGroup = memo(({ title, notifications, onNotificationClick, startIndex }: NotificationGroupProps) => {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="sticky top-0 z-10 py-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
          {title}
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
