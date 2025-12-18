import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Membership {
  id: string;
  type: 'workspace' | 'group' | 'team' | 'procurement' | 'fifo';
  name: string;
  role?: string;
  route: string;
  icon: string;
  color: string;
}

export const useUserMemberships = (userId: string | null) => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      setIsLoading(true);
      const allMemberships: Membership[] = [];

      try {
        // Fetch workspace memberships (store management)
        const { data: workspaces } = await supabase
          .from('workspace_members')
          .select('id, workspace_id, role, workspaces(id, name)')
          .eq('user_id', userId);

        if (workspaces) {
          workspaces.forEach((w: any) => {
            if (w.workspaces) {
              allMemberships.push({
                id: w.workspace_id,
                type: 'workspace',
                name: w.workspaces.name,
                role: w.role,
                route: '/store-management',
                icon: '🏪',
                color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
              });
            }
          });
        }

        // Fetch mixologist group memberships
        const { data: groups } = await supabase
          .from('mixologist_group_members')
          .select('id, group_id, role, mixologist_groups(id, name)')
          .eq('user_id', userId);

        if (groups) {
          groups.forEach((g: any) => {
            if (g.mixologist_groups) {
              allMemberships.push({
                id: g.group_id,
                type: 'group',
                name: g.mixologist_groups.name,
                role: g.role,
                route: '/batch-calculator',
                icon: '🍸',
                color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
              });
            }
          });
        }

        // Fetch team memberships
        const { data: teams } = await supabase
          .from('team_members')
          .select('id, team_id, role, teams(id, name)')
          .eq('user_id', userId);

        if (teams) {
          teams.forEach((t: any) => {
            if (t.teams) {
              allMemberships.push({
                id: t.team_id,
                type: 'team',
                name: t.teams.name,
                role: t.role,
                route: '/task-manager',
                icon: '👥',
                color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
              });
            }
          });
        }

        // Fetch procurement workspace memberships
        const { data: procurement } = await supabase
          .from('procurement_workspace_members')
          .select('id, workspace_id, role, procurement_workspaces(id, name)')
          .eq('user_id', userId);

        if (procurement) {
          procurement.forEach((p: any) => {
            if (p.procurement_workspaces) {
              allMemberships.push({
                id: p.workspace_id,
                type: 'procurement',
                name: p.procurement_workspaces.name,
                role: p.role,
                route: '/purchase-orders',
                icon: '📦',
                color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30',
              });
            }
          });
        }

        setMemberships(allMemberships);
      } catch (error) {
        console.error('Error fetching memberships:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberships();
  }, [userId]);

  return { memberships, isLoading };
};
