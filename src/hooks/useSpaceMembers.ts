import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileLite {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
}

interface SpaceMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: ProfileLite;
}

type SpaceType = 'workspace' | 'group' | 'team' | 'procurement' | 'fifo';

type MemberRow = {
  id: string;
  user_id: string;
  role: string | null;
  joined_at: string | null;
};

// Global cache for members per space - persists across renders
const membersCache = new Map<string, { members: SpaceMember[]; timestamp: number }>();
const memberCountCache = new Map<string, { count: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - show cached, refresh in background

const getCacheKey = (spaceId: string, spaceType: SpaceType) => `${spaceType}-${spaceId}`;

const fetchMemberRows = async (spaceId: string, spaceType: SpaceType): Promise<MemberRow[]> => {
  switch (spaceType) {
    case 'workspace':
    case 'fifo': {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, joined_at')
        .eq('workspace_id', spaceId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MemberRow[];
    }
    case 'group': {
      const { data, error } = await supabase
        .from('mixologist_group_members')
        .select('id, user_id, role, joined_at')
        .eq('group_id', spaceId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MemberRow[];
    }
    case 'team': {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, user_id, role, joined_at')
        .eq('team_id', spaceId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MemberRow[];
    }
    case 'procurement': {
      const { data, error } = await supabase
        .from('procurement_workspace_members')
        .select('id, user_id, role, joined_at')
        .eq('workspace_id', spaceId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MemberRow[];
    }
  }
};

const fetchMemberCount = async (spaceId: string, spaceType: SpaceType): Promise<number> => {
  switch (spaceType) {
    case 'workspace':
    case 'fifo': {
      const { count, error } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', spaceId);
      if (error) throw error;
      return count || 0;
    }
    case 'group': {
      const { count, error } = await supabase
        .from('mixologist_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', spaceId);
      if (error) throw error;
      return count || 0;
    }
    case 'team': {
      const { count, error } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', spaceId);
      if (error) throw error;
      return count || 0;
    }
    case 'procurement': {
      const { count, error } = await supabase
        .from('procurement_workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', spaceId);
      if (error) throw error;
      return count || 0;
    }
  }
};

// Preload all spaces for a user (call once on profile load)
export const preloadUserSpaces = async (memberships: { id: string; type: SpaceType }[]) => {
  const now = Date.now();
  const toFetch = memberships.filter((m) => {
    const key = getCacheKey(m.id, m.type);
    const cached = membersCache.get(key);
    return !cached || now - cached.timestamp > CACHE_TTL;
  });

  if (toFetch.length === 0) return;

  // Fetch all in parallel
  await Promise.all(
    toFetch.map(async (m) => {
      const key = getCacheKey(m.id, m.type);
      try {
        const rows = await fetchMemberRows(m.id, m.type);

        // Fetch profiles
        const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
        let profileMap = new Map<string, ProfileLite>();
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', userIds);
          profileMap = new Map((profiles || []).map((p: any) => [p.id, { ...p, is_verified: false }]));
        }

        const members: SpaceMember[] = rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role || 'member',
          joined_at: r.joined_at || new Date().toISOString(),
          profile: profileMap.get(r.user_id),
        }));

        membersCache.set(key, { members, timestamp: Date.now() });
        memberCountCache.set(key, { count: members.length, timestamp: Date.now() });
      } catch (e) {
        console.error('Preload failed for', key, e);
      }
    })
  );
};

export const useSpaceMembers = () => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const fetchingRef = useRef<string | null>(null);

  const fetchProfilesMap = useCallback(async (userIds: string[]) => {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0) return new Map<string, ProfileLite>();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', ids);

    if (error) throw error;

    return new Map<string, ProfileLite>(
      (data || []).map((p: any) => [p.id, { ...p, is_verified: false } as ProfileLite])
    );
  }, []);

  const fetchMembers = useCallback(
    async (spaceId: string, spaceType: SpaceType) => {
      const key = getCacheKey(spaceId, spaceType);
      const cached = membersCache.get(key);
      const now = Date.now();

      // Show cached data instantly if available
      if (cached) {
        setMembers(cached.members);
        setMemberCount(cached.members.length);
        
        // If cache is fresh, don't refetch
        if (now - cached.timestamp < CACHE_TTL) {
          setIsLoading(false);
          return;
        }
        // Cache is stale - refresh in background (don't show loading)
      } else {
        // No cache - show loading
        setIsLoading(true);
        setMembers([]);
        setMemberCount(0);
      }

      // Prevent duplicate fetches
      if (fetchingRef.current === key) return;
      fetchingRef.current = key;

      try {
        const rows = await fetchMemberRows(spaceId, spaceType);
        const profileMap = await fetchProfilesMap(rows.map((r) => r.user_id));

        const formattedMembers: SpaceMember[] = rows.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role || 'member',
          joined_at: m.joined_at || new Date().toISOString(),
          profile: profileMap.get(m.user_id),
        }));

        // Update cache
        membersCache.set(key, { members: formattedMembers, timestamp: Date.now() });
        memberCountCache.set(key, { count: formattedMembers.length, timestamp: Date.now() });

        // Only update state if this is still the current fetch
        if (fetchingRef.current === key) {
          setMembers(formattedMembers);
          setMemberCount(formattedMembers.length);
        }
      } catch (error) {
        console.error('Error fetching space members:', error);
        if (!cached) {
          setMembers([]);
          setMemberCount(0);
        }
      } finally {
        if (fetchingRef.current === key) {
          fetchingRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [fetchProfilesMap]
  );

  const getMemberCount = useCallback(async (spaceId: string, spaceType: SpaceType): Promise<number> => {
    const key = getCacheKey(spaceId, spaceType);
    const cached = memberCountCache.get(key);
    const now = Date.now();

    // Return cached count instantly if available
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.count;
    }

    try {
      const count = await fetchMemberCount(spaceId, spaceType);
      memberCountCache.set(key, { count, timestamp: Date.now() });
      return count;
    } catch (error) {
      console.error('Error getting member count:', error);
      return cached?.count || 0;
    }
  }, []);

  // Get cached members instantly (no fetch)
  const getCachedMembers = useCallback((spaceId: string, spaceType: SpaceType): SpaceMember[] | null => {
    const key = getCacheKey(spaceId, spaceType);
    return membersCache.get(key)?.members || null;
  }, []);

  return { members, memberCount, isLoading, fetchMembers, getMemberCount, getCachedMembers };
};
