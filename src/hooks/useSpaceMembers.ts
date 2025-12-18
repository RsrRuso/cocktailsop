import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpaceMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export const useSpaceMembers = () => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const fetchMembers = useCallback(async (
    spaceId: string, 
    spaceType: 'workspace' | 'group' | 'team' | 'procurement' | 'fifo'
  ) => {
    setIsLoading(true);
    try {
      let data: any[] = [];
      
      switch (spaceType) {
        case 'workspace':
        case 'fifo':
          const { data: wsMembers } = await supabase
            .from('workspace_members')
            .select(`
              id,
              user_id,
              role,
              created_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('workspace_id', spaceId)
            .order('created_at', { ascending: true });
          data = wsMembers || [];
          break;
          
        case 'group':
          const { data: groupMembers } = await supabase
            .from('mixologist_group_members')
            .select(`
              id,
              user_id,
              role,
              joined_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('group_id', spaceId)
            .order('joined_at', { ascending: true });
          data = groupMembers || [];
          break;
          
        case 'team':
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select(`
              id,
              user_id,
              role,
              joined_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('team_id', spaceId)
            .order('joined_at', { ascending: true });
          data = teamMembers || [];
          break;
          
        case 'procurement':
          const { data: procMembers } = await supabase
            .from('procurement_workspace_members')
            .select(`
              id,
              user_id,
              role,
              created_at,
              profiles:user_id (
                id,
                username,
                full_name,
                avatar_url,
                is_verified
              )
            `)
            .eq('workspace_id', spaceId)
            .order('created_at', { ascending: true });
          data = procMembers || [];
          break;
      }
      
      const formattedMembers: SpaceMember[] = data.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role || 'member',
        joined_at: m.joined_at || m.created_at,
        profile: m.profiles
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
  }, []);

  const getMemberCount = useCallback(async (
    spaceId: string,
    spaceType: 'workspace' | 'group' | 'team' | 'procurement' | 'fifo'
  ): Promise<number> => {
    try {
      let count = 0;
      
      switch (spaceType) {
        case 'workspace':
        case 'fifo':
          const { count: wsCount } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', spaceId);
          count = wsCount || 0;
          break;
          
        case 'group':
          const { count: groupCount } = await supabase
            .from('mixologist_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', spaceId);
          count = groupCount || 0;
          break;
          
        case 'team':
          const { count: teamCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', spaceId);
          count = teamCount || 0;
          break;
          
        case 'procurement':
          const { count: procCount } = await supabase
            .from('procurement_workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', spaceId);
          count = procCount || 0;
          break;
      }
      
      return count;
    } catch (error) {
      console.error('Error getting member count:', error);
      return 0;
    }
  }, []);

  return { members, memberCount, isLoading, fetchMembers, getMemberCount };
};
