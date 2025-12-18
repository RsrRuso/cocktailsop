import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Membership {
  id: string;
  type: 'workspace' | 'group' | 'team' | 'procurement' | 'fifo';
  name: string;
  role?: string;
  route: string;
  icon: string;
  color: string;
  memberCount: number;
}

// Cache memberships across renders
let membershipCache: { userId: string; data: Membership[]; timestamp: number } | null = null;
const CACHE_TIME = 120000; // 2 minutes

export const useUserMemberships = (userId: string | null) => {
  const [memberships, setMemberships] = useState<Membership[]>(() => {
    // Initialize from cache if valid
    if (membershipCache && membershipCache.userId === userId && 
        Date.now() - membershipCache.timestamp < CACHE_TIME) {
      return membershipCache.data;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    // Not loading if we have valid cache
    return !(membershipCache && membershipCache.userId === userId && 
             Date.now() - membershipCache.timestamp < CACHE_TIME);
  });

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    // Skip fetch if cache is valid
    if (membershipCache && membershipCache.userId === userId && 
        Date.now() - membershipCache.timestamp < CACHE_TIME) {
      setMemberships(membershipCache.data);
      setIsLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      setIsLoading(true);
      
      try {
        // Fetch ALL membership types in parallel for speed
        const [workspaceRes, groupRes, teamRes, procurementRes] = await Promise.all([
          // Store management workspaces (non-fifo)
          supabase
            .from('workspace_members')
            .select('workspace_id, role, workspaces!inner(id, name, workspace_type)')
            .eq('user_id', userId),
          // Mixologist groups
          supabase
            .from('mixologist_group_members')
            .select('group_id, role, mixologist_groups!inner(id, name)')
            .eq('user_id', userId),
          // Teams
          supabase
            .from('team_members')
            .select('team_id, role, teams!inner(id, name)')
            .eq('user_id', userId),
          // Procurement workspaces
          supabase
            .from('procurement_workspace_members')
            .select('workspace_id, role, procurement_workspaces!inner(id, name)')
            .eq('user_id', userId),
        ]);

        const allMemberships: Membership[] = [];

        // Process workspaces - separate FIFO and store management
        if (workspaceRes.data) {
          for (const w of workspaceRes.data as any[]) {
            if (w.workspaces) {
              const isFifo = w.workspaces.workspace_type === 'fifo';
              allMemberships.push({
                id: w.workspace_id,
                type: isFifo ? 'fifo' : 'workspace',
                name: w.workspaces.name,
                role: w.role,
                route: isFifo 
                  ? `/inventory-manager?workspace=${w.workspace_id}` 
                  : `/store-management?workspace=${w.workspace_id}`,
                icon: isFifo ? '📊' : '🏪',
                color: isFifo 
                  ? 'from-rose-500/20 to-rose-600/20 border-rose-500/30'
                  : 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
                memberCount: 0, // Will be fetched if needed
              });
            }
          }
        }

        // Process groups
        if (groupRes.data) {
          for (const g of groupRes.data as any[]) {
            if (g.mixologist_groups) {
              allMemberships.push({
                id: g.group_id,
                type: 'group',
                name: g.mixologist_groups.name,
                role: g.role,
                route: `/batch-calculator?group=${g.group_id}`,
                icon: '🍸',
                color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Process teams
        if (teamRes.data) {
          for (const t of teamRes.data as any[]) {
            if (t.teams) {
              allMemberships.push({
                id: t.team_id,
                type: 'team',
                name: t.teams.name,
                role: t.role,
                route: `/task-manager?team=${t.team_id}`,
                icon: '👥',
                color: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Process procurement
        if (procurementRes.data) {
          for (const p of procurementRes.data as any[]) {
            if (p.procurement_workspaces) {
              allMemberships.push({
                id: p.workspace_id,
                type: 'procurement',
                name: p.procurement_workspaces.name,
                role: p.role,
                route: `/purchase-orders?workspace=${p.workspace_id}`,
                icon: '📦',
                color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Cache the results
        membershipCache = { userId, data: allMemberships, timestamp: Date.now() };
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
