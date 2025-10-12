import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Eye, Send, UserMinus, Image, Video, Music, MessageSquare, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import { TestNotificationButton } from "@/components/TestNotificationButton";
import { NotificationTestPanel } from "@/components/NotificationTestPanel";
import { LocalNotifications } from '@capacitor/local-notifications';

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  post_id?: string | null;
  reel_id?: string | null;
  story_id?: string | null;
  music_share_id?: string | null;
  event_id?: string | null;
  reference_user_id?: string | null;
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const { showNotification } = useInAppNotificationContext();

  useEffect(() => {
    // Request notification permissions
    const requestPermissions = async () => {
      try {
        const result = await LocalNotifications.requestPermissions();
        console.log('Notification permissions:', result);
      } catch (error) {
        console.log('Notification permissions not available on web');
      }
    };
    
    requestPermissions();
    fetchNotifications();
    
    // Set up realtime subscription for new notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          fetchNotifications();
          
          const newNotification = payload.new as Notification;
          
          // Send in-app notification for ALL types
          showNotification(
            'New Notification',
            newNotification.content,
            newNotification.type as any
          );
          
          // Send mobile push notification
          try {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: 'New Notification',
                  body: newNotification.content,
                  id: Math.floor(Math.random() * 1000000),
                  schedule: { at: new Date(Date.now() + 100) },
                  sound: 'default',
                  attachments: undefined,
                  actionTypeId: '',
                  extra: { type: newNotification.type }
                }
              ]
            });
          } catch (error) {
            console.log('Local notifications not available:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showNotification]);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("id, type, content, read, created_at, post_id, reel_id, story_id, music_share_id, event_id, reference_user_id")
      .eq("user_id", user.id)
      .neq("type", "message")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data);
  };

  const handleMarkAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      toast.error("Failed to mark all as read");
    } else {
      toast.success("All notifications marked as read");
      fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'unfollow':
        return <UserMinus className="w-5 h-5 text-orange-500" />;
      case 'profile_view':
        return <Eye className="w-5 h-5 text-purple-500" />;
      case 'message':
        return <Send className="w-5 h-5 text-cyan-500" />;
      case 'new_post':
        return <Image className="w-5 h-5 text-blue-400" />;
      case 'new_reel':
        return <Video className="w-5 h-5 text-pink-500" />;
      case 'new_music':
        return <Music className="w-5 h-5 text-green-400" />;
      case 'new_story':
        return <MessageSquare className="w-5 h-5 text-yellow-500" />;
      case 'new_user':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);
      fetchNotifications();
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
        if (notification.post_id) {
          navigate(`/post/${notification.post_id}`);
        } else if (notification.reel_id) {
          navigate('/reels'); // Reels page will auto-play the specific reel if needed
        } else if (notification.story_id && notification.reference_user_id) {
          navigate(`/story/${notification.reference_user_id}`);
        }
        break;
      
      case 'follow':
      case 'unfollow':
      case 'profile_view':
        if (notification.reference_user_id) {
          navigate(`/user/${notification.reference_user_id}`);
        }
        break;
      
      case 'new_post':
      case 'new_reel':
      case 'new_story':
      case 'new_music':
        if (notification.reference_user_id) {
          navigate(`/user/${notification.reference_user_id}`);
        }
        break;
      
      case 'new_user':
        // Extract username from content (e.g., "🎉 New user registered: username")
        const usernameMatch = notification.content.match(/: (.+)$/);
        if (usernameMatch) {
          const username = usernameMatch[1];
          // Fetch user ID by username
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
          
          if (data) {
            navigate(`/user/${data.id}`);
          }
        }
        break;
      
      default:
        // For other notification types, stay on notifications page
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-4">
        <NotificationTestPanel />
        
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Notifications</h2>
          {notifications.some(n => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="glass-hover"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full glass-hover flex items-center justify-center">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`glass rounded-xl p-4 cursor-pointer hover:glass-hover transition-all ${
                  !notification.read ? "border-l-4 border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{notification.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TestNotificationButton />
      <BottomNav />
    </div>
  );
};

export default Notifications;
