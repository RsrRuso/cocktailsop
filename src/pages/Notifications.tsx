import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Volume2, RefreshCw, Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useInAppNotificationContext } from "@/contexts/InAppNotificationContext";
import { LocalNotifications } from '@capacitor/local-notifications';
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NotificationSoundPicker } from "@/components/NotificationSoundPicker";
import { NotificationGroup } from "@/components/notifications/NotificationGroup";
import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";
import { EmptyNotifications } from "@/components/notifications/EmptyNotifications";
import { isWorkNotification } from "@/components/notifications/NotificationItem";
import { motion, AnimatePresence } from "framer-motion";
import { isToday, isYesterday, isThisWeek, parseISO } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotificationsData, Notification } from "@/hooks/useNotificationsData";

type FilterType = 'all' | 'work' | 'social';

const Notifications = () => {
  const { notifications, isLoading, refreshNotifications, setNotifications } = useNotificationsData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
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

  // Filter notifications by type
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return dedupedNotifications;
    if (filter === 'work') return dedupedNotifications.filter(n => isWorkNotification(n.type));
    return dedupedNotifications.filter(n => !isWorkNotification(n.type));
  }, [dedupedNotifications, filter]);

  // Group notifications by time and category
  const groupedNotifications = useMemo(() => {
    const groups: {
      todayWork: Notification[];
      todaySocial: Notification[];
      yesterdayWork: Notification[];
      yesterdaySocial: Notification[];
      thisWeekWork: Notification[];
      thisWeekSocial: Notification[];
      earlierWork: Notification[];
      earlierSocial: Notification[];
    } = {
      todayWork: [],
      todaySocial: [],
      yesterdayWork: [],
      yesterdaySocial: [],
      thisWeekWork: [],
      thisWeekSocial: [],
      earlierWork: [],
      earlierSocial: [],
    };

    filteredNotifications.forEach((notification) => {
      const date = parseISO(notification.created_at);
      const isWork = isWorkNotification(notification.type);
      
      if (isToday(date)) {
        if (isWork) groups.todayWork.push(notification);
        else groups.todaySocial.push(notification);
      } else if (isYesterday(date)) {
        if (isWork) groups.yesterdayWork.push(notification);
        else groups.yesterdaySocial.push(notification);
      } else if (isThisWeek(date)) {
        if (isWork) groups.thisWeekWork.push(notification);
        else groups.thisWeekSocial.push(notification);
      } else {
        if (isWork) groups.earlierWork.push(notification);
        else groups.earlierSocial.push(notification);
      }
    });

    return groups;
  }, [filteredNotifications]);

  // Count stats
  const workCount = dedupedNotifications.filter(n => isWorkNotification(n.type)).length;
  const socialCount = dedupedNotifications.filter(n => !isWorkNotification(n.type)).length;
  const unreadCount = dedupedNotifications.filter(n => !n.read).length;

  const handleTestNotification = async () => {
    await showPushNotification(
      "Test Notification 🔔",
      "This is a test notification with sound!",
      { icon: "/icon-192.png", requireInteraction: false, silent: false }
    );
    toast.success("Test notification sent!");
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setIsRefreshing(false);
    toast.success("Refreshed");
  }, [refreshNotifications]);

  useEffect(() => {
    const setupSubscription = async () => {
      if (subscriptionRef.current) {
        await supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      try {
        await LocalNotifications.requestPermissions();
      } catch (error) {}
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      subscriptionRef.current = supabase
        .channel(`notifications-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            const newNotification = payload.new as Notification;
            
            if (processedNotificationsRef.current.has(newNotification.id)) return;
            processedNotificationsRef.current.add(newNotification.id);
            
            if (processedNotificationsRef.current.size > 100) {
              const items = Array.from(processedNotificationsRef.current);
              processedNotificationsRef.current = new Set(items.slice(-50));
            }
            
            refreshNotifications();
            showNotification('New Notification', newNotification.content, newNotification.type as any);
            
            await showPushNotification('New Notification', newNotification.content, {
              tag: newNotification.id,
              data: { type: newNotification.type, url: window.location.origin + '/notifications' },
              silent: false
            });
            
            try {
              await LocalNotifications.schedule({
                notifications: [{
                  title: 'New Notification',
                  body: newNotification.content,
                  id: Math.floor(Math.random() * 1000000),
                  schedule: { at: new Date(Date.now() + 100) },
                  sound: 'default',
                  attachments: undefined,
                  actionTypeId: '',
                  extra: { type: newNotification.type }
                }]
              });
            } catch (error) {}
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
  }, [refreshNotifications, showNotification, showPushNotification]);

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
      refreshNotifications();
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
      refreshNotifications();
    }

    // Navigation logic (same as before)
    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.reel_id) navigate('/reels', { state: { scrollToReelId: notification.reel_id, showLivestreamComments: true } });
      else if (notification.post_id) navigate(`/post/${notification.post_id}`);
      else if (notification.story_id && notification.reference_user_id) navigate(`/story/${notification.reference_user_id}`);
      else if (notification.music_share_id) navigate('/thunder');
      else if (notification.event_id) navigate(`/event/${notification.event_id}`);
    } else if (notification.type === 'access_request') navigate('/access-approval');
    else if (notification.type === 'stock_alert') navigate('/all-inventory');
    else if (notification.type === 'fifo_alert') navigate('/inventory-manager');
    else if (['inventory_transfer', 'inventory_receiving', 'spot_check'].includes(notification.type)) navigate('/inventory-transactions');
    else if (notification.type === 'internal_email') navigate('/email');
    else if (['batch_submission', 'batch_edit', 'batch_delete', 'recipe_created', 'member_added'].includes(notification.type)) navigate('/batch-calculator');
    else if (notification.type === 'certificate_earned') navigate(notification.reference_user_id ? `/user/${notification.reference_user_id}` : '/exam-center');
    else if (['follow', 'unfollow', 'profile_view'].includes(notification.type) && notification.reference_user_id) navigate(`/user/${notification.reference_user_id}`);
    else if (notification.type === 'new_user') navigate('/explore');
    else if (notification.type === 'new_post' && notification.post_id) navigate(`/post/${notification.post_id}`);
    else if ((notification.type === 'new_reel' || notification.reel_id) && notification.reel_id) navigate('/reels', { state: { scrollToReelId: notification.reel_id, showLivestreamComments: true } });
    else if (notification.type === 'new_story' && notification.reference_user_id) navigate(`/story/${notification.reference_user_id}`);
    else if (['new_event', 'event_attendance'].includes(notification.type) && notification.event_id) navigate(`/event/${notification.event_id}`);
    else if (notification.post_id) navigate(`/post/${notification.post_id}`);
    else if (notification.story_id && notification.reference_user_id) navigate(`/story/${notification.reference_user_id}`);
    else if (notification.music_share_id) navigate('/thunder');
    else if (notification.event_id) navigate(`/event/${notification.event_id}`);
    else if (notification.reference_user_id) navigate(`/user/${notification.reference_user_id}`);
  };

  let runningIndex = 0;

  const renderTimeSection = (
    title: string,
    workNotifs: Notification[],
    socialNotifs: Notification[]
  ) => {
    const hasWork = workNotifs.length > 0 && (filter === 'all' || filter === 'work');
    const hasSocial = socialNotifs.length > 0 && (filter === 'all' || filter === 'social');
    
    if (!hasWork && !hasSocial) return null;

    return (
      <div className="space-y-4">
        {/* Time Header */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border/50" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
            {title}
          </span>
          <div className="h-px flex-1 bg-border/50" />
        </div>

        {/* Work Notifications */}
        {hasWork && (
          <>
            <NotificationGroup
              title="Work"
              notifications={workNotifs}
              onNotificationClick={handleNotificationClick}
              startIndex={runningIndex}
              category="work"
            />
            {(runningIndex += workNotifs.length, null)}
          </>
        )}

        {/* Social Notifications */}
        {hasSocial && (
          <>
            <NotificationGroup
              title="Social"
              notifications={socialNotifs}
              onNotificationClick={handleNotificationClick}
              startIndex={runningIndex}
              category="social"
            />
            {(runningIndex += socialNotifs.length, null)}
          </>
        )}
      </div>
    );
  };

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
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="h-9 w-9 rounded-full">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <NotificationSoundPicker trigger={<Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><Volume2 className="w-4 h-4" /></Button>} />
            <Button variant="ghost" size="icon" onClick={handleTestNotification} className="h-9 w-9 rounded-full"><Bell className="w-4 h-4" /></Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-9 px-3 rounded-full text-xs font-medium">
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Read all
              </Button>
            )}
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10 bg-card/50 backdrop-blur-sm rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All ({dedupedNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="work" className="rounded-lg text-xs font-medium data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" />
              Work ({workCount})
            </TabsTrigger>
            <TabsTrigger value="social" className="rounded-lg text-xs font-medium data-[state=active]:bg-pink-500 data-[state=active]:text-white flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Social ({socialCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NotificationSkeleton />
            </motion.div>
          ) : filteredNotifications.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyNotifications />
            </motion.div>
          ) : (
            <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {renderTimeSection("Today", groupedNotifications.todayWork, groupedNotifications.todaySocial)}
              {renderTimeSection("Yesterday", groupedNotifications.yesterdayWork, groupedNotifications.yesterdaySocial)}
              {renderTimeSection("This Week", groupedNotifications.thisWeekWork, groupedNotifications.thisWeekSocial)}
              {renderTimeSection("Earlier", groupedNotifications.earlierWork, groupedNotifications.earlierSocial)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;
