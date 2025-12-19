import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OnlineStatusIndicatorProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface OnlineUser {
  user_id: string;
  online_at: string;
}

// Global cache for online users to avoid multiple subscriptions
let globalOnlineUsers: OnlineUser[] = [];
let globalChannel: any = null;
let subscribers = new Set<() => void>();
let currentTrackedUserId: string | null = null;

const initGlobalPresence = (trackUserId?: string | null) => {
  // Store the user ID to track
  if (trackUserId) {
    currentTrackedUserId = trackUserId;
  }

  if (globalChannel) {
    // If channel exists and we have a new user to track, track them
    if (trackUserId && globalChannel.state === 'joined') {
      globalChannel.track({
        user_id: trackUserId,
        online_at: new Date().toISOString(),
      });
    }
    return;
  }

  globalChannel = supabase.channel('specverse-global-presence');

  globalChannel
    .on('presence', { event: 'sync' }, () => {
      const state = globalChannel.presenceState();
      const users: OnlineUser[] = [];
      
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.user_id) {
            users.push({
              user_id: presence.user_id,
              online_at: presence.online_at,
            });
          }
        });
      });

      globalOnlineUsers = users;
      // Notify all subscribers
      subscribers.forEach(callback => callback());
    })
    .subscribe(async (status) => {
      // Track the current user when channel is ready
      if (status === 'SUBSCRIBED' && currentTrackedUserId) {
        await globalChannel.track({
          user_id: currentTrackedUserId,
          online_at: new Date().toISOString(),
        });
      }
    });
};

export const OnlineStatusIndicator = ({ 
  userId, 
  size = 'sm', 
  showLabel = false,
  className 
}: OnlineStatusIndicatorProps) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    initGlobalPresence();

    const updateStatus = () => {
      setIsOnline(globalOnlineUsers.some(u => u.user_id === userId));
    };

    // Initial check
    updateStatus();

    // Subscribe to updates
    subscribers.add(updateStatus);

    return () => {
      subscribers.delete(updateStatus);
    };
  }, [userId]);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const labelSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div 
        className={cn(
          'rounded-full transition-colors duration-300',
          sizeClasses[size],
          isOnline 
            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
            : 'bg-gray-500/50'
        )}
      />
      {showLabel && (
        <span className={cn(
          'font-medium transition-colors duration-300',
          labelSizes[size],
          isOnline ? 'text-emerald-400' : 'text-muted-foreground'
        )}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

// Hook to check if a specific user is online
export const useUserOnlineStatus = (userId: string | null) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    initGlobalPresence();

    const updateStatus = () => {
      setIsOnline(globalOnlineUsers.some(u => u.user_id === userId));
    };

    updateStatus();
    subscribers.add(updateStatus);

    return () => {
      subscribers.delete(updateStatus);
    };
  }, [userId]);

  return isOnline;
};

// Hook to track current user's presence on the platform
export const useTrackPresence = (userId: string | null) => {
  useEffect(() => {
    if (!userId) return;

    // Initialize and track on the same global channel
    initGlobalPresence(userId);

    // Handle visibility change - re-track when user returns
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && globalChannel) {
        await globalChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Don't remove channel - it's shared globally
    };
  }, [userId]);
};
