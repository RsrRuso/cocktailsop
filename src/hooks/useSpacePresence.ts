import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OnlineUser {
  user_id: string;
  online_at: string;
}

interface PresenceState {
  [spaceKey: string]: OnlineUser[];
}

export const useSpacePresence = (
  userId: string | null,
  spaces: Array<{ id: string; type: string }>
) => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!userId || spaces.length === 0) return;

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Create presence channels for each space
    spaces.forEach(space => {
      const channelName = `space-presence-${space.type}-${space.id}`;
      const channel = supabase.channel(channelName);

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
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

          setOnlineUsers(prev => ({
            ...prev,
            [`${space.type}-${space.id}`]: users,
          }));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: userId,
              online_at: new Date().toISOString(),
            });
          }
        });

      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [userId, JSON.stringify(spaces)]);

  const getOnlineCount = (type: string, id: string) => {
    const users = onlineUsers[`${type}-${id}`] || [];
    return users.length;
  };

  const getOnlineUsers = (type: string, id: string) => {
    return onlineUsers[`${type}-${id}`] || [];
  };

  const isUserOnline = (type: string, id: string, checkUserId: string) => {
    const users = onlineUsers[`${type}-${id}`] || [];
    return users.some(u => u.user_id === checkUserId);
  };

  return { onlineUsers, getOnlineCount, getOnlineUsers, isUserOnline };
};

// Global platform presence - tracks all signed in users
export const usePlatformPresence = (userId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel('specverse-platform-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
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

        setOnlineUsers(users);
        setIsOnline(users.some(u => u.user_id === userId));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
          setIsOnline(true);
        }
      });

    channelRef.current = channel;

    // Handle visibility change - track when user leaves/returns
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && channelRef.current) {
        await channelRef.current.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsOnline(false);
    };
  }, [userId]);

  const isUserOnPlatform = (checkUserId: string) => {
    return onlineUsers.some(u => u.user_id === checkUserId);
  };

  return { 
    onlineUsers, 
    isOnline, 
    onlineCount: onlineUsers.length,
    isUserOnPlatform 
  };
};
