import { useEffect, useState } from 'react';
import { X, Bell, MessageCircle, Heart, UserPlus, UserCheck } from 'lucide-react';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type?: 'message' | 'like' | 'comment' | 'follow' | 'new_user' | 'default';
  timestamp: Date;
}

interface InAppNotificationProps {
  notification: NotificationData | null;
  onClose: () => void;
  autoCloseDelay?: number;
}

export const InAppNotification = ({ 
  notification, 
  onClose, 
  autoCloseDelay = 5000 
}: InAppNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (notification) {
      setShouldRender(true);
      // Trigger animation after render
      setTimeout(() => setIsVisible(true), 10);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
          onClose();
        }, 300);
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [notification, autoCloseDelay, onClose]);

  const getIcon = () => {
    switch (notification?.type) {
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-purple-500" />;
      case 'new_user':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  if (!shouldRender || !notification) return null;

  return (
    <div
      className={`fixed top-20 right-4 z-[100] max-w-sm w-full transition-all duration-300 ${
        isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : '-translate-y-full opacity-0 scale-95'
      }`}
    >
      <div className="glass rounded-2xl p-4 shadow-2xl border border-primary/20 backdrop-blur-xl animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1 truncate">
              {notification.title}
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {notification.message}
            </p>
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => {
                setShouldRender(false);
                onClose();
              }, 300);
            }}
            className="shrink-0 p-1 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
