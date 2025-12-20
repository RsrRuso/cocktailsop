import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Scalable Presence System
 * 
 * Instead of one global channel with 10k users, this uses:
 * 1. Database-based "last_seen" for general online status
 * 2. Context-based channels for specific rooms (conversations, pages)
 * 3. Batched queries to check multiple users at once
 * 
 * This scales to 10k+ users without overloading realtime connections.
 */

// Cache for online status with TTL
interface CacheEntry {
  isOnline: boolean;
  timestamp: number;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes = considered online
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache
const BATCH_DELAY_MS = 100; // Batch requests within 100ms

// Global cache and batch queue
const onlineCache = new Map<string, CacheEntry>();
let pendingUserIds: Set<string> = new Set();
let batchTimeout: NodeJS.Timeout | null = null;
let batchPromise: Promise<void> | null = null;
let subscribers = new Map<string, Set<(isOnline: boolean) => void>>();

// Process batch of user IDs
const processBatch = async () => {
  const userIds = Array.from(pendingUserIds);
  pendingUserIds = new Set();
  batchTimeout = null;
  batchPromise = null;

  if (userIds.length === 0) return;

  try {
    // Query last_seen from profiles or user_locations table
    const { data, error } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .in('id', userIds);

    if (error) throw error;

    const now = Date.now();
    const results = new Map<string, boolean>();

    // Check each user's last activity
    data?.forEach((profile) => {
      const lastSeen = new Date(profile.updated_at).getTime();
      const isOnline = (now - lastSeen) < ONLINE_THRESHOLD_MS;
      results.set(profile.id, isOnline);
      
      // Update cache
      onlineCache.set(profile.id, {
        isOnline,
        timestamp: now,
      });
    });

    // Mark users not found as offline
    userIds.forEach((userId) => {
      if (!results.has(userId)) {
        onlineCache.set(userId, {
          isOnline: false,
          timestamp: now,
        });
        results.set(userId, false);
      }
    });

    // Notify subscribers
    results.forEach((isOnline, userId) => {
      const userSubscribers = subscribers.get(userId);
      userSubscribers?.forEach((callback) => callback(isOnline));
    });
  } catch (error) {
    console.error('Error checking online status:', error);
  }
};

// Queue a user ID for batch checking
const queueUserCheck = (userId: string) => {
  pendingUserIds.add(userId);
  
  if (!batchTimeout) {
    batchPromise = new Promise((resolve) => {
      batchTimeout = setTimeout(async () => {
        await processBatch();
        resolve();
      }, BATCH_DELAY_MS);
    });
  }
  
  return batchPromise;
};

/**
 * Hook to check if a user is online (scalable version)
 * Uses database last_seen instead of realtime for general status
 */
export const useScalableOnlineStatus = (userId: string | null | undefined) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    // Check cache first
    const cached = onlineCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      setIsOnline(cached.isOnline);
      return;
    }

    // Subscribe to updates for this user
    if (!subscribers.has(userId)) {
      subscribers.set(userId, new Set());
    }
    subscribers.get(userId)!.add(setIsOnline);

    // Queue for batch check
    queueUserCheck(userId);

    return () => {
      const userSubs = subscribers.get(userId);
      if (userSubs) {
        userSubs.delete(setIsOnline);
        if (userSubs.size === 0) {
          subscribers.delete(userId);
        }
      }
    };
  }, [userId]);

  return isOnline;
};

/**
 * Hook to track current user's presence
 * Updates last_seen in database periodically instead of realtime
 */
export const useTrackPresenceScalable = (userId: string | null) => {
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_INTERVAL = 60 * 1000; // Update every minute

  const updatePresence = useCallback(async () => {
    if (!userId) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;
    
    lastUpdateRef.current = now;

    try {
      await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Initial update
    updatePresence();

    // Update on visibility change (when user returns to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    // Update on user activity
    const handleActivity = () => {
      updatePresence();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('click', handleActivity, { passive: true });
    document.addEventListener('keydown', handleActivity, { passive: true });

    // Periodic update while active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    }, UPDATE_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      clearInterval(interval);
    };
  }, [userId, updatePresence]);
};

/**
 * Hook for room-based realtime presence (for conversations, specific pages)
 * Use this ONLY when you need true realtime (e.g., typing indicators)
 */
export const useRoomPresence = (roomId: string | null, userId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    // Create room-specific channel (max ~100 users per room typically)
    const channelName = `room-presence:${roomId}`;
    channelRef.current = supabase.channel(channelName, {
      config: {
        presence: { key: userId },
      },
    });

    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current.presenceState();
        const users: string[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) users.push(p.user_id);
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId, userId]);

  const isUserOnline = useCallback((checkUserId: string) => {
    return onlineUsers.includes(checkUserId);
  }, [onlineUsers]);

  return { onlineUsers, isUserOnline };
};

/**
 * Check multiple users' online status at once (for lists)
 */
export const checkMultipleOnlineStatus = async (userIds: string[]): Promise<Map<string, boolean>> => {
  const results = new Map<string, boolean>();
  const now = Date.now();
  const toFetch: string[] = [];

  // Check cache first
  userIds.forEach((userId) => {
    const cached = onlineCache.get(userId);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      results.set(userId, cached.isOnline);
    } else {
      toFetch.push(userId);
    }
  });

  // Fetch uncached users
  if (toFetch.length > 0) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, updated_at')
        .in('id', toFetch);

      data?.forEach((profile) => {
        const lastSeen = new Date(profile.updated_at).getTime();
        const isOnline = (now - lastSeen) < ONLINE_THRESHOLD_MS;
        results.set(profile.id, isOnline);
        onlineCache.set(profile.id, { isOnline, timestamp: now });
      });

      // Mark missing as offline
      toFetch.forEach((userId) => {
        if (!results.has(userId)) {
          results.set(userId, false);
          onlineCache.set(userId, { isOnline: false, timestamp: now });
        }
      });
    } catch (error) {
      console.error('Error checking multiple online status:', error);
    }
  }

  return results;
};
