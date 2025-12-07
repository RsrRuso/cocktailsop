import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus, Eye, Send, UserMinus, Image, Video, Music, MessageSquare, UserCheck, Calendar, CalendarCheck, Settings, Package, FlaskConical, ClipboardList, Trash2, Users, Award } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import { LocalNotifications } from '@capacitor/local-notifications';
import { usePushNotifications } from "@/hooks/usePushNotifications";

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

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const { showNotification } = useInAppNotificationContext();
  const { showNotification: showPushNotification } = usePushNotifications();
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const subscriptionRef = useRef<any>(null);
  const dedupedNotifications = useMemo(() => {
    const seen = new Set<string>();
    const result: Notification[] = [];

    for (const n of notifications) {
      const key = [
        n.type,
        n.content,
        n.post_id || "",
        n.reel_id || "",
        n.story_id || "",
        n.music_share_id || "",
        n.event_id || "",
        n.reference_user_id || "",
        new Date(n.created_at).toISOString().slice(0, 19)
      ].join("|");

      if (!seen.has(key)) {
        seen.add(key);
        result.push(n);
      }
    }

    return result;
  }, [notifications]);

  const handleTestNotification = async () => {
    await showPushNotification(
      "Test Notification 🔔",
      "This is a test notification with sound! Your PWA notifications are working.",
      {
        icon: "/icon-192.png",
        requireInteraction: false,
        silent: false
      }
    );
    toast.success("Test notification sent!");
  };

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .neq("type", "message")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data as Notification[]);
  }, []);

  useEffect(() => {
    const setupSubscription = async () => {
      // Clean up existing subscription first
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      // Request notification permissions
      try {
        await LocalNotifications.requestPermissions();
      } catch (error) {
        // Notification permissions not available on web
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      fetchNotifications();
      
      // Set up realtime subscription for new notifications - ONLY for current user
      subscriptionRef.current = supabase
        .channel(`notifications-${user.id}-${Date.now()}`) // Add timestamp for uniqueness
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}` // Only listen to notifications for current user
          },
          async (payload) => {
            const newNotification = payload.new as Notification;
            
            // Deduplicate notifications
            if (processedNotificationsRef.current.has(newNotification.id)) {
              return;
            }
            processedNotificationsRef.current.add(newNotification.id);
            
            // Clean up old processed IDs (keep last 100)
            if (processedNotificationsRef.current.size > 100) {
              const items = Array.from(processedNotificationsRef.current);
              processedNotificationsRef.current = new Set(items.slice(-50));
            }
            
            fetchNotifications();
            
            // Send in-app notification for ALL types
            showNotification(
              'New Notification',
              newNotification.content,
              newNotification.type as any
            );
            
            // Send PWA push notification with sound
            await showPushNotification(
              'New Notification',
              newNotification.content,
              {
                tag: newNotification.id, // Use notification ID as tag to prevent duplicates
                data: {
                  type: newNotification.type,
                  url: window.location.origin + '/notifications'
                },
                silent: false // Enable sound
              }
            );
            
            // Send mobile push notification (Capacitor)
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
              // Local notifications not available on web
            }
          }
        )
        .subscribe();
    };
    
    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchNotifications, showNotification, showPushNotification]);


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
      case 'new_event':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'event_attendance':
        return <CalendarCheck className="w-5 h-5 text-indigo-500" />;
      case 'new_user':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'access_request':
        return <Settings className="w-5 h-5 text-orange-500" />;
      case 'stock_alert':
        return <Package className="w-5 h-5 text-red-500" />;
      case 'batch_submission':
        return <FlaskConical className="w-5 h-5 text-blue-500" />;
      case 'batch_edit':
        return <ClipboardList className="w-5 h-5 text-yellow-500" />;
      case 'batch_delete':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      case 'recipe_created':
        return <ClipboardList className="w-5 h-5 text-green-500" />;
      case 'member_added':
        return <Users className="w-5 h-5 text-cyan-500" />;
      case 'certificate_earned':
        return <Award className="w-5 h-5 text-amber-500" />;
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

    // Navigate based on notification type and reference IDs
    if (notification.type === 'access_request') {
      navigate('/access-approval');
    } else if (notification.type === 'stock_alert') {
      // General low-stock alert → go to all inventory overview
      navigate('/all-inventory');
    } else if (notification.type === 'fifo_alert') {
      // FIFO expiry alert → open FIFO / inventory manager view
      navigate('/inventory-manager');
    } else if (notification.type === 'inventory_transfer' || notification.type === 'inventory_receiving' || notification.type === 'spot_check') {
      // All inventory operations → live transactions feed
      navigate('/inventory-transactions');
    } else if (notification.type === 'internal_email') {
      // Internal email notification → open email page
      navigate('/email');
    } else if (notification.type === 'batch_submission' || notification.type === 'batch_edit' || notification.type === 'batch_delete' || notification.type === 'recipe_created') {
      // Batch-related notifications → open batch calculator
      navigate('/batch-calculator');
    } else if (notification.type === 'member_added') {
      // Member added → open batch calculator groups tab
      navigate('/batch-calculator');
    } else if (notification.type === 'certificate_earned') {
      // Certificate earned → navigate to the user's profile to see their achievement
      if (notification.reference_user_id) {
        navigate(`/user/${notification.reference_user_id}`);
      } else {
        navigate('/exam-center');
      }
    } else if (notification.type === 'follow' || notification.type === 'unfollow') {
      // For follow/unfollow notifications, navigate to the user's profile
      if (notification.reference_user_id) {
        navigate(`/user/${notification.reference_user_id}`);
      }
    } else if (notification.type === 'profile_view') {
      if (notification.reference_user_id) {
        navigate(`/user/${notification.reference_user_id}`);
      }
    } else if (notification.type === 'new_user') {
      navigate('/explore');
    } else if (notification.type === 'new_post' && notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.type === 'new_reel' && notification.reel_id) {
      navigate('/reels', { state: { scrollToReelId: notification.reel_id, showLivestreamComments: true } });
    } else if (notification.reel_id) {
      // Any reel-related notification (like, comment on reel)
      navigate('/reels', { state: { scrollToReelId: notification.reel_id, showLivestreamComments: true } });
    } else if (notification.type === 'new_story' && notification.reference_user_id) {
      navigate(`/story/${notification.reference_user_id}`);
    } else if (notification.type === 'new_event' && notification.event_id) {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.type === 'event_attendance' && notification.event_id) {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.post_id) {
      // Generic post-related notification
      navigate(`/post/${notification.post_id}`);
    } else if (notification.story_id && notification.reference_user_id) {
      navigate(`/story/${notification.reference_user_id}`);
    } else if (notification.music_share_id) {
      navigate('/thunder');
    } else if (notification.event_id) {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.reference_user_id) {
      // Fallback: any notification with reference_user_id goes to that user's profile
      navigate(`/user/${notification.reference_user_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Notifications</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              className="glass-hover"
            >
              <Bell className="w-4 h-4 mr-2" />
              Test
            </Button>
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
            {dedupedNotifications.map((notification) => (
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

      <BottomNav />
    </div>
  );
};

export default Notifications;
