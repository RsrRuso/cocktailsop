import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Global cache for verified users - persists across components
const verifiedUsersCache = new Map<string, boolean>();
let lastFetch = 0;
const CACHE_TIME = 300000; // 5 minutes

export const useVerifiedUsers = (userIds: string[]) => {
  const [verifiedMap, setVerifiedMap] = useState<Map<string, boolean>>(new Map());
  const fetchedRef = useRef<Set<string>>(new Set());
  
  const fetchVerifiedStatus = useCallback(async (ids: string[]) => {
    // Filter to only unfetched ids
    const unfetchedIds = ids.filter(id => 
      id && !verifiedUsersCache.has(id) && !fetchedRef.current.has(id)
    );
    
    if (unfetchedIds.length === 0) {
      // All from cache
      const cached = new Map<string, boolean>();
      ids.forEach(id => {
        if (id && verifiedUsersCache.has(id)) {
          cached.set(id, verifiedUsersCache.get(id)!);
        }
      });
      setVerifiedMap(cached);
      return;
    }
    
    // Mark as being fetched
    unfetchedIds.forEach(id => fetchedRef.current.add(id));
    
    try {
      // Batch fetch verified roles for all users
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'verified')
        .in('user_id', unfetchedIds);
      
      // Update cache
      const verifiedSet = new Set(data?.map(r => r.user_id) || []);
      unfetchedIds.forEach(id => {
        verifiedUsersCache.set(id, verifiedSet.has(id));
      });
      
      // Build result map
      const result = new Map<string, boolean>();
      ids.forEach(id => {
        if (id && verifiedUsersCache.has(id)) {
          result.set(id, verifiedUsersCache.get(id)!);
        }
      });
      setVerifiedMap(result);
      lastFetch = Date.now();
    } catch (error) {
      console.error('Error fetching verified status:', error);
    }
  }, []);
  
  useEffect(() => {
    const validIds = userIds.filter(Boolean);
    if (validIds.length > 0) {
      // Debounce to avoid multiple rapid calls
      const timer = setTimeout(() => fetchVerifiedStatus(validIds), 50);
      return () => clearTimeout(timer);
    }
  }, [userIds.join(','), fetchVerifiedStatus]);
  
  const isVerified = useCallback((userId: string) => {
    return verifiedMap.get(userId) || verifiedUsersCache.get(userId) || false;
  }, [verifiedMap]);
  
  return { isVerified, verifiedMap };
};

// Simple helper to check single user
export const checkUserVerified = async (userId: string): Promise<boolean> => {
  if (verifiedUsersCache.has(userId)) {
    return verifiedUsersCache.get(userId)!;
  }
  
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'verified')
    .maybeSingle();
  
  const isVerified = !!data;
  verifiedUsersCache.set(userId, isVerified);
  return isVerified;
};
