import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Volume2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import { LocalNotifications } from '@capacitor/local-notifications';
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NotificationSoundPicker } from "@/components/NotificationSoundPicker";
import { NotificationGroup } from "@/components/notifications/NotificationGroup";
import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";
import { EmptyNotifications } from "@/components/notifications/EmptyNotifications";
import { motion, AnimatePresence } from "framer-motion";
import { isToday, isYesterday, isThisWeek, parseISO } from "date-fns";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useInAppNotificationContext();
  const { showNotification: showPushNotification } = usePushNotifications();
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  const subscriptionRef = useRef<any>(null);

  // Deduplicate notifications
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

  // Group notifications by time
  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const earlier: Notification[] = [];

    dedupedNotifications.forEach((notification) => {
      const date = parseISO(notification.created_at);
      
      if (isToday(date)) {
        today.push(notification);
      } else if (isYesterday(date)) {
        yesterday.push(notification);
      } else if (isThisWeek(date)) {
        thisWeek.push(notification);
      } else {
        earlier.push(notification);
      }
    });

    return { today, yesterday, thisWeek, earlier };
  }, [dedupedNotifications]);

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

  const fetchNotifications = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .neq("type", "message")
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) setNotifications(data as Notification[]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications(false);
    toast.success("Refreshed");
  }, [fetchNotifications]);

  useEffect(() => {
    const setupSubscription = async () => {
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      try {
        await LocalNotifications.requestPermissions();
      } catch (error) {
        // Notification permissions not available on web
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      fetchNotifications();
      
      subscriptionRef.current = supabase
        .channel(`notifications-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            const newNotification = payload.new as Notification;
            
            if (processedNotificationsRef.current.has(newNotification.id)) {
              return;
            }
            processedNotificationsRef.current.add(newNotification.id);
            
            if (processedNotificationsRef.current.size > 100) {
              const items = Array.from(processedNotificationsRef.current);
              processedNotificationsRef.current = new Set(items.slice(-50));
            }
            
            fetchNotifications(false);
            
            showNotification(
              'New Notification',
              newNotification.content,
              newNotification.type as any
            );
            
            await showPushNotification(
              'New Notification',
              newNotification.content,
              {
                tag: newNotification.id,
                data: {
                  type: newNotification.type,
                  url: window.location.origin + '/notifications'
                },
                silent: false
              }
            );
            
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
      toast.success("All marked as read");
      fetchNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notification.id);
      fetchNotifications(false);
    }

    // Navigation logic
    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.reel_id) {
        navigate('/reels', { state: { scrollToReelId: notification.reel_id, showLivestreamComments: true } });
      } else if (notification.post_id) {
        navigate(`/post/${notification.post_id}`);
      } else if (notification.story_id && notification.reference_user_id) {
        navigate(`/story/${notification.reference_user_id}`);
      } else if (notification.music_share_id) {
        navigate('/thunder');
      } else if (notification.event_id) {
        navigate(`/event/${notification.event_id}`);
      }
    } else if (notification.type === 'access_request') {
      navigate('/access-approval');
    } else if (notification.type === 'stock_alert') {
      navigate('/all-inventory');
    } else if (notification.type === 'fifo_alert') {
      navigate('/inventory-manager');
    } else if (notification.type === 'inventory_transfer' || notification.type === 'inventory_receiving' || notification.type === 'spot_check') {
      navigate('/inventory-transactions');
    } else if (notification.type === 'internal_email') {
      navigate('/email');
    } else if (notification.type === 'batch_submission' || notification.type === 'batch_edit' || notification.type === 'batch_delete' || notification.type === 'recipe_created') {
      navigate('/batch-calculator');
    } else if (notification.type === 'member_added') {
      navigate('/batch-calculator');
    } else if (notification.type === 'certificate_earned') {
      if (notification.reference_user_id) {
        navigate(`/user/${notification.reference_user_id}`);
      } else {
        navigate('/exam-center');
      }
    } else if (notification.type === 'follow' || notification.type === 'unfollow') {
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
      navigate('/reels', { state: { scrollToReelId: notification.reel_id, showLivestreamComments: true } });
    } else if (notification.type === 'new_story' && notification.reference_user_id) {
      navigate(`/story/${notification.reference_user_id}`);
    } else if (notification.type === 'new_event' && notification.event_id) {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.type === 'event_attendance' && notification.event_id) {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.post_id) {
      navigate(`/post/${notification.post_id}`);
    } else if (notification.story_id && notification.reference_user_id) {
      navigate(`/story/${notification.reference_user_id}`);
    } else if (notification.music_share_id) {
      navigate('/thunder');
    } else if (notification.event_id) {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.reference_user_id) {
      navigate(`/user/${notification.reference_user_id}`);
    }
  };

  const unreadCount = dedupedNotifications.filter(n => !n.read).length;
  let runningIndex = 0;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Activity
            </h1>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground"
              >
                {unreadCount}
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 rounded-full"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <NotificationSoundPicker 
              trigger={
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Volume2 className="w-4 h-4" />
                </Button>
              }
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTestNotification}
              className="h-9 w-9 rounded-full"
            >
              <Bell className="w-4 h-4" />
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-9 px-3 rounded-full text-xs font-medium"
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Read all
              </Button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <NotificationSkeleton />
            </motion.div>
          ) : dedupedNotifications.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyNotifications />
            </motion.div>
          ) : (
            <motion.div
              key="notifications"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {groupedNotifications.today.length > 0 && (
                <NotificationGroup
                  title="Today"
                  notifications={groupedNotifications.today}
                  onNotificationClick={handleNotificationClick}
                  startIndex={runningIndex}
                />
              )}
              {(runningIndex += groupedNotifications.today.length, null)}

              {groupedNotifications.yesterday.length > 0 && (
                <NotificationGroup
                  title="Yesterday"
                  notifications={groupedNotifications.yesterday}
                  onNotificationClick={handleNotificationClick}
                  startIndex={runningIndex}
                />
              )}
              {(runningIndex += groupedNotifications.yesterday.length, null)}

              {groupedNotifications.thisWeek.length > 0 && (
                <NotificationGroup
                  title="This Week"
                  notifications={groupedNotifications.thisWeek}
                  onNotificationClick={handleNotificationClick}
                  startIndex={runningIndex}
                />
              )}
              {(runningIndex += groupedNotifications.thisWeek.length, null)}

              {groupedNotifications.earlier.length > 0 && (
                <NotificationGroup
                  title="Earlier"
                  notifications={groupedNotifications.earlier}
                  onNotificationClick={handleNotificationClick}
                  startIndex={runningIndex}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
