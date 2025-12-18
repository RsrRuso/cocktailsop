import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  [spaceKey: string]: number; // online count per space
}

export const useSpacePresence = (
  userId: string | null,
  spaces: Array<{ id: string; type: string }>
) => {
  const [onlineCounts, setOnlineCounts] = useState<PresenceState>({});
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
      const channelName = `presence-${space.type}-${space.id}`;
      const channel = supabase.channel(channelName);

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCounts(prev => ({
            ...prev,
            [`${space.type}-${space.id}`]: count,
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
    return onlineCounts[`${type}-${id}`] || 0;
  };

  return { onlineCounts, getOnlineCount };
};
