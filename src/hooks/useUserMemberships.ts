import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { preloadUserSpaces } from './useSpaceMembers';

export interface Membership {
  id: string;
  type: 'workspace' | 'group' | 'team' | 'procurement' | 'fifo' | 'labops';
  name: string;
  role?: string;
  route: string;
  icon: string;
  color: string;
  memberCount: number;
}

export interface HiddenSpace {
  id: string;
  space_id: string;
  space_type: string;
  hidden_at: string;
}

// Cache memberships across renders - long TTL, refresh in background
let membershipCache: { userId: string; data: Membership[]; timestamp: number } | null = null;
let hiddenSpacesCache: { userId: string; data: HiddenSpace[]; timestamp: number } | null = null;
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes - show cached, refresh in background
const STALE_TIME = 30 * 1000; // 30 seconds - trigger background refresh

// Export function to clear cache manually
export const clearMembershipCache = () => {
  membershipCache = null;
  hiddenSpacesCache = null;
};

export const useUserMemberships = (userId: string | null) => {
  const [memberships, setMemberships] = useState<Membership[]>(() => {
    // Initialize from cache if valid
    if (membershipCache && membershipCache.userId === userId && 
        Date.now() - membershipCache.timestamp < CACHE_TIME) {
      return membershipCache.data;
    }
    return [];
  });
  const [hiddenSpaces, setHiddenSpaces] = useState<HiddenSpace[]>(() => {
    if (hiddenSpacesCache && hiddenSpacesCache.userId === userId &&
        Date.now() - hiddenSpacesCache.timestamp < CACHE_TIME) {
      return hiddenSpacesCache.data;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    // Not loading if we have valid cache
    return !(membershipCache && membershipCache.userId === userId && 
             Date.now() - membershipCache.timestamp < CACHE_TIME);
  });

  const fetchHiddenSpaces = useCallback(async () => {
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('hidden_user_spaces')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching hidden spaces:', error);
      return [];
    }
    
    const spaces = data || [];
    hiddenSpacesCache = { userId, data: spaces, timestamp: Date.now() };
    setHiddenSpaces(spaces);
    return spaces;
  }, [userId]);

  const hideSpace = useCallback(async (spaceId: string, spaceType: string) => {
    if (!userId) return false;
    
    const { error } = await supabase
      .from('hidden_user_spaces')
      .insert({
        user_id: userId,
        space_id: spaceId,
        space_type: spaceType,
      });
    
    if (error) {
      console.error('Error hiding space:', error);
      return false;
    }
    
    // Update local state
    const newHidden: HiddenSpace = {
      id: crypto.randomUUID(),
      space_id: spaceId,
      space_type: spaceType,
      hidden_at: new Date().toISOString(),
    };
    setHiddenSpaces(prev => [...prev, newHidden]);
    hiddenSpacesCache = { userId, data: [...(hiddenSpacesCache?.data || []), newHidden], timestamp: Date.now() };
    return true;
  }, [userId]);

  const restoreSpace = useCallback(async (spaceId: string, spaceType: string) => {
    if (!userId) return false;
    
    const { error } = await supabase
      .from('hidden_user_spaces')
      .delete()
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('space_type', spaceType);
    
    if (error) {
      console.error('Error restoring space:', error);
      return false;
    }
    
    // Update local state
    setHiddenSpaces(prev => prev.filter(h => !(h.space_id === spaceId && h.space_type === spaceType)));
    if (hiddenSpacesCache) {
      hiddenSpacesCache.data = hiddenSpacesCache.data.filter(h => !(h.space_id === spaceId && h.space_type === spaceType));
    }
    return true;
  }, [userId]);

  const restoreAllSpaces = useCallback(async () => {
    if (!userId) return false;
    
    const { error } = await supabase
      .from('hidden_user_spaces')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error restoring all spaces:', error);
      return false;
    }
    
    setHiddenSpaces([]);
    hiddenSpacesCache = { userId, data: [], timestamp: Date.now() };
    return true;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setHiddenSpaces([]);
      setIsLoading(false);
      return;
    }

    const cached = membershipCache && membershipCache.userId === userId;
    const now = Date.now();
    const isFresh = cached && now - membershipCache!.timestamp < STALE_TIME;
    const isValid = cached && now - membershipCache!.timestamp < CACHE_TIME;

    // Fetch hidden spaces first
    fetchHiddenSpaces();

    // Show cached data instantly
    if (cached) {
      setMemberships(membershipCache!.data);
      // Preload space members in background
      preloadUserSpaces(membershipCache!.data.map(m => ({ id: m.id, type: m.type })));
    }

    // If cache is fresh, skip fetch entirely
    if (isFresh) {
      setIsLoading(false);
      return;
    }

    // If cache is valid but stale, refresh in background (no loading state)
    if (isValid) {
      setIsLoading(false);
    }

    const fetchMemberships = async () => {
      setIsLoading(true);
      
      try {
        // Fetch ALL membership types in parallel for speed
        // Split into two Promise.all to avoid TypeScript deep instantiation issues
        const [workspaceMemberRes, ownedWorkspacesRes, groupRes, ownedGroupsRes, teamRes] = await Promise.all([
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
          // Mixologist groups user is a member of
          supabase
            .from('mixologist_group_members')
            .select('group_id, role, mixologist_groups!inner(id, name)')
            .eq('user_id', userId),
          // Mixologist groups user created (in case not in members)
          supabase
            .from('mixologist_groups')
            .select('id, name')
            .eq('created_by', userId),
          // Teams
          supabase
            .from('team_members')
            .select('team_id, role, teams!inner(id, name)')
            .eq('user_id', userId),
        ]);

        // Fetch procurement and lab ops memberships
        const procurementRes = await supabase
          .from('procurement_workspace_members')
          .select('workspace_id, role, procurement_workspaces!inner(id, name)')
          .eq('user_id', userId);
        
        const ownedProcurementRes = await supabase
          .from('procurement_workspaces')
          .select('id, name')
          .eq('owner_id', userId);
        
        // Fetch Lab Ops data using dynamic approach to avoid TS deep type instantiation
        let labOpsStaffData: any[] | null = null;
        let ownedLabOpsData: any[] | null = null;
        
        try {
          const staffResult = await (supabase as any)
            .from('lab_ops_staff')
            .select('outlet_id, role, lab_ops_outlets(id, name)')
            .eq('user_id', userId)
            .eq('is_active', true);
          labOpsStaffData = staffResult.data;
          
          // lab_ops_outlets uses user_id as owner field, not owner_id
          const ownedResult = await (supabase as any)
            .from('lab_ops_outlets')
            .select('id, name')
            .eq('user_id', userId);
          ownedLabOpsData = ownedResult.data;
        } catch (e) {
          console.error('Error fetching lab ops memberships:', e);
        }

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

        // Process groups from membership table
        const processedGroupIds = new Set<string>();
        if (groupRes.data) {
          for (const g of groupRes.data as any[]) {
            if (g.mixologist_groups) {
              processedGroupIds.add(g.group_id);
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

        // Add created groups not already in members (creator/owner)
        if (ownedGroupsRes.data) {
          for (const g of ownedGroupsRes.data as any[]) {
            if (!processedGroupIds.has(g.id)) {
              allMemberships.push({
                id: g.id,
                type: 'group',
                name: g.name,
                role: 'owner',
                route: `/batch-calculator-pin-access?group=${g.id}`,
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

        // Process procurement from membership table
        const processedProcurementIds = new Set<string>();
        if (procurementRes.data) {
          for (const p of procurementRes.data as any[]) {
            if (p.procurement_workspaces) {
              processedProcurementIds.add(p.workspace_id);
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

        // Add owned procurement workspaces not already in members
        if (ownedProcurementRes.data) {
          for (const p of ownedProcurementRes.data as any[]) {
            if (!processedProcurementIds.has(p.id)) {
              allMemberships.push({
                id: p.id,
                type: 'procurement',
                name: p.name,
                role: 'owner',
                route: `/purchase-orders?workspace=${p.id}`,
                icon: '📦',
                color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Process Lab Ops from staff table
        const processedLabOpsIds = new Set<string>();
        if (labOpsStaffData) {
          for (const l of labOpsStaffData as any[]) {
            if (l.lab_ops_outlets) {
              processedLabOpsIds.add(l.outlet_id);
              allMemberships.push({
                id: l.outlet_id,
                type: 'labops',
                name: l.lab_ops_outlets.name,
                role: l.role,
                route: `/lab-ops-staff-pin-access?outlet=${l.outlet_id}`,
                icon: '🧪',
                color: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Add owned Lab Ops outlets not already in staff
        if (ownedLabOpsData) {
          for (const l of ownedLabOpsData as any[]) {
            if (!processedLabOpsIds.has(l.id)) {
              allMemberships.push({
                id: l.id,
                type: 'labops',
                name: l.name,
                role: 'owner',
                route: `/lab-ops-staff-pin-access?outlet=${l.id}`,
                icon: '🧪',
                color: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
                memberCount: 0,
              });
            }
          }
        }

        // Cache the results
        membershipCache = { userId, data: allMemberships, timestamp: Date.now() };
        setMemberships(allMemberships);
        
        // Preload space members for all memberships
        preloadUserSpaces(allMemberships.map(m => ({ id: m.id, type: m.type })));
      } catch (error) {
        console.error('Error fetching memberships:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMemberships();
  }, [userId, fetchHiddenSpaces]);

  // Filter out hidden spaces for the visible memberships
  const visibleMemberships = memberships.filter(
    m => !hiddenSpaces.some(h => h.space_id === m.id && h.space_type === m.type)
  );

  // Get hidden memberships for restore dialog
  const hiddenMemberships = memberships.filter(
    m => hiddenSpaces.some(h => h.space_id === m.id && h.space_type === m.type)
  );

  return { 
    memberships: visibleMemberships, 
    allMemberships: memberships,
    hiddenMemberships,
    hiddenSpaces,
    isLoading,
    hideSpace,
    restoreSpace,
    restoreAllSpaces,
  };
};
