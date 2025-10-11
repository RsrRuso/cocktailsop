import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useGlobalPresence = (
  userId: string | undefined,
  username: string | undefined,
  avatarUrl: string | null | undefined
) => {
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId || !username) return;

    const presenceChannel = supabase.channel('global-typing', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          username: username,
          avatar_url: avatarUrl || null,
          typing: false,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = presenceChannel;

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [userId, username, avatarUrl]);

  const setTyping = async (isTyping: boolean) => {
    if (!channelRef.current || !userId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await channelRef.current.track({
      user_id: userId,
      username: username,
      avatar_url: avatarUrl || null,
      typing: isTyping,
      online_at: new Date().toISOString(),
    });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(async () => {
        await channelRef.current?.track({
          user_id: userId,
          username: username,
          avatar_url: avatarUrl || null,
          typing: false,
          online_at: new Date().toISOString(),
        });
      }, 3000);
    }
  };

  return { setTyping };
};
