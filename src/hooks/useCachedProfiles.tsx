import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name?: string;
  badge_level?: string;
}

/**
 * Hook to batch and cache profile fetches
 * Prevents duplicate requests and reduces API calls
 */
export const useCachedProfiles = () => {
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const pendingFetches = useRef<Set<string>>(new Set());
  const fetchQueue = useRef<Set<string>>(new Set());
  const fetchTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchProfiles = useCallback(async (userIds: string[]) => {
    // Filter out already cached and pending IDs
    const uncachedIds = userIds.filter(
      id => !profiles.has(id) && !pendingFetches.current.has(id)
    );

    if (uncachedIds.length === 0) {
      return;
    }

    // Add to pending
    uncachedIds.forEach(id => pendingFetches.current.add(id));

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name, badge_level')
        .in('id', uncachedIds);

      if (error) throw error;

      if (data) {
        setProfiles(prev => {
          const newMap = new Map(prev);
          data.forEach(profile => newMap.set(profile.id, profile));
          return newMap;
        });
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      // Remove from pending
      uncachedIds.forEach(id => pendingFetches.current.delete(id));
    }
  }, [profiles]);

  // Batch profile fetches to reduce API calls
  const queueProfileFetch = useCallback((userId: string) => {
    fetchQueue.current.add(userId);

    // Clear existing timer
    if (fetchTimer.current) {
      clearTimeout(fetchTimer.current);
    }

    // Batch fetches after 50ms
    fetchTimer.current = setTimeout(() => {
      const idsToFetch = Array.from(fetchQueue.current);
      fetchQueue.current.clear();
      fetchProfiles(idsToFetch);
    }, 50);
  }, [fetchProfiles]);

  const getProfile = useCallback((userId: string): Profile | null => {
    const cached = profiles.get(userId);
    
    if (!cached && !pendingFetches.current.has(userId)) {
      queueProfileFetch(userId);
    }

    return cached || null;
  }, [profiles, queueProfileFetch]);

  return { getProfile, fetchProfiles };
};
