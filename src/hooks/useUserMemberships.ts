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
const CACHE_TIME = 30000; // 30 seconds - reduced for faster updates

const STORAGE_PREFIX = 'user_memberships_cache_v1';
const LOCAL_CACHE_MAX_AGE = 1000 * 60 * 60 * 12; // 12h (usable for instant UI)

const readLocalCache = (userId: string | null): { data: Membership[]; timestamp: number } | null => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: Membership[]; timestamp?: number };
    if (!parsed?.data || !Array.isArray(parsed.data) || !parsed.timestamp) return null;
    return { data: parsed.data, timestamp: parsed.timestamp };
  } catch {
    return null;
  }
};

const writeLocalCache = (userId: string, data: Membership[]) => {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}:${userId}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // ignore
  }
};

// Export function to clear cache manually
export const clearMembershipCache = () => {
  membershipCache = null;
};

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    const hasFreshMemoryCache =
      !!(
        membershipCache &&
        membershipCache.userId === userId &&
        Date.now() - membershipCache.timestamp < CACHE_TIME
      );

    const localCache = readLocalCache(userId);
    const hasUsableLocalCache =
      !!(
        localCache &&
        localCache.data?.length &&
        Date.now() - localCache.timestamp < LOCAL_CACHE_MAX_AGE
      );

    // Hydrate instantly from local cache when available
    if (!hasFreshMemoryCache && hasUsableLocalCache) {
      setMemberships(localCache!.data);
      setIsLoading(false);
    }

    // Skip fetch if memory cache is fresh
    if (hasFreshMemoryCache) {
      setMemberships(membershipCache!.data);
      setIsLoading(false);
      return;
    }

    const fetchMemberships = async () => {
      // Only show loading when we have nothing to show
      if (!hasUsableLocalCache) setIsLoading(true);

      try {
        // Fetch ALL membership types in parallel for speed
        const [workspaceMemberRes, ownedWorkspacesRes, groupRes, teamRes, procurementRes] = await Promise.all([
          // Workspaces user is a member of
          supabase
            .from('workspace_members')
            .select('workspace_id, role, workspaces!inner(id, name, workspace_type)')
            .eq('user_id', userId),
          // Workspaces user owns (in case not in workspace_members)
          supabase
            .from('workspaces')
            .select('id, name, workspace_type')
            .eq('owner_id', userId),
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
        const processedWorkspaceIds = new Set<string>();

        // Process workspaces from member table - separate FIFO and store management
        if (workspaceMemberRes.data) {
          for (const w of workspaceMemberRes.data as any[]) {
            if (w.workspaces) {
              processedWorkspaceIds.add(w.workspace_id);
              const isFifo = w.workspaces.workspace_type === 'fifo';
              allMemberships.push({
                id: w.workspace_id,
                type: isFifo ? 'fifo' : 'workspace',
                name: w.workspaces.name,
                role: w.role,
                route: isFifo 
                  ? `/fifo-pin-access?workspace=${w.workspace_id}` 
                  : `/store-management-pin-access?workspace=${w.workspace_id}`,
                icon: isFifo ? '📊' : '🏪',
                color: isFifo 
                  ? 'from-rose-500/20 to-rose-600/20 border-rose-500/30'
                  : 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Add owned workspaces not already in members
        if (ownedWorkspacesRes.data) {
          for (const w of ownedWorkspacesRes.data as any[]) {
            if (!processedWorkspaceIds.has(w.id)) {
              const isFifo = w.workspace_type === 'fifo';
              allMemberships.push({
                id: w.id,
                type: isFifo ? 'fifo' : 'workspace',
                name: w.name,
                role: 'owner',
                route: isFifo 
                  ? `/fifo-pin-access?workspace=${w.id}` 
                  : `/store-management-pin-access?workspace=${w.id}`,
                icon: isFifo ? '📊' : '🏪',
                color: isFifo 
                  ? 'from-rose-500/20 to-rose-600/20 border-rose-500/30'
                  : 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
                memberCount: 0,
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
                route: `/batch-calculator-pin-access?group=${g.group_id}`,
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
        writeLocalCache(userId, allMemberships);
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
