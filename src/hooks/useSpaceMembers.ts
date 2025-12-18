import { useState, useCallback } from 'react';
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

const uniq = (arr: string[]) => Array.from(new Set(arr));

export const useSpaceMembers = () => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const fetchProfilesMap = useCallback(async (userIds: string[]) => {
    const ids = uniq(userIds).filter(Boolean);
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
      setIsLoading(true);
      try {
        let rows: MemberRow[] = [];

        switch (spaceType) {
          case 'workspace':
          case 'fifo': {
            const { data, error } = await supabase
              .from('workspace_members')
              .select('id, user_id, role, joined_at')
              .eq('workspace_id', spaceId)
              .order('joined_at', { ascending: true });

            if (error) throw error;
            rows = (data || []) as MemberRow[];
            break;
          }

          case 'group': {
            const { data, error } = await supabase
              .from('mixologist_group_members')
              .select('id, user_id, role, joined_at')
              .eq('group_id', spaceId)
              .order('joined_at', { ascending: true });

            if (error) throw error;
            rows = (data || []) as MemberRow[];
            break;
          }

          case 'team': {
            const { data, error } = await supabase
              .from('team_members')
              .select('id, user_id, role, joined_at')
              .eq('team_id', spaceId)
              .order('joined_at', { ascending: true });

            if (error) throw error;
            rows = (data || []) as MemberRow[];
            break;
          }

          case 'procurement': {
            const { data, error } = await supabase
              .from('procurement_workspace_members')
              .select('id, user_id, role, joined_at')
              .eq('workspace_id', spaceId)
              .order('joined_at', { ascending: true });

            if (error) throw error;
            rows = (data || []) as MemberRow[];
            break;
          }
        }

        const profileMap = await fetchProfilesMap(rows.map((r) => r.user_id));

        const formattedMembers: SpaceMember[] = rows.map((m) => ({
          id: m.id,
          user_id: m.user_id,
          role: m.role || 'member',
          joined_at: m.joined_at || new Date().toISOString(),
          profile: profileMap.get(m.user_id),
        }));

        setMembers(formattedMembers);
        setMemberCount(formattedMembers.length);
      } catch (error) {
        console.error('Error fetching space members:', error);
        setMembers([]);
        setMemberCount(0);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProfilesMap]
  );

  const getMemberCount = useCallback(async (spaceId: string, spaceType: SpaceType): Promise<number> => {
    try {
      let count = 0;

      switch (spaceType) {
        case 'workspace':
        case 'fifo': {
          const { count: wsCount, error } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', spaceId);
          if (error) throw error;
          count = wsCount || 0;
          break;
        }

        case 'group': {
          const { count: groupCount, error } = await supabase
            .from('mixologist_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', spaceId);
          if (error) throw error;
          count = groupCount || 0;
          break;
        }

        case 'team': {
          const { count: teamCount, error } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', spaceId);
          if (error) throw error;
          count = teamCount || 0;
          break;
        }

        case 'procurement': {
          const { count: procCount, error } = await supabase
            .from('procurement_workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', spaceId);
          if (error) throw error;
          count = procCount || 0;
          break;
        }
      }

      return count;
    } catch (error) {
      console.error('Error getting member count:', error);
      return 0;
    }
  }, []);

  return { members, memberCount, isLoading, fetchMembers, getMemberCount };
};
