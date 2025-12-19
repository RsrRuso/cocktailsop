import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Global cache of online users - shared across all hook instances
let globalOnlineUsers = new Set<string>();
let globalChannel: any = null;
let subscriberCount = 0;

export const useUserOnlineStatus = (userId: string | null | undefined) => {
  const [isOnline, setIsOnline] = useState(() => userId ? globalOnlineUsers.has(userId) : false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    // Subscribe to global presence channel (only once)
    if (!globalChannel) {
      globalChannel = supabase.channel('specverse-platform-presence');
      
      globalChannel
        .on('presence', { event: 'sync' }, () => {
          const state = globalChannel.presenceState();
          const newOnlineUsers = new Set<string>();
          
          Object.values(state).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.user_id) {
                newOnlineUsers.add(presence.user_id);
              }
            });
          });
          
          globalOnlineUsers = newOnlineUsers;
          // Trigger re-render for all subscribers
          window.dispatchEvent(new CustomEvent('presence-sync'));
        })
        .subscribe();
    }
    
    subscriberCount++;

    // Check initial state
    setIsOnline(globalOnlineUsers.has(userId));

    // Listen for presence updates
    const handleSync = () => {
      setIsOnline(globalOnlineUsers.has(userId));
    };
    
    window.addEventListener('presence-sync', handleSync);

    return () => {
      window.removeEventListener('presence-sync', handleSync);
      subscriberCount--;
      
      // Clean up channel when no more subscribers
      if (subscriberCount === 0 && globalChannel) {
        supabase.removeChannel(globalChannel);
        globalChannel = null;
        globalOnlineUsers.clear();
      }
    };
  }, [userId]);

  return isOnline;
};
