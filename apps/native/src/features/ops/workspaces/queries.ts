import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { FifoActivityLite, WorkspaceLite } from './types';

async function safeSelectWorkspacesOwned(userId: string) {
  // Prefer schema with workspace_type; fall back if column doesn't exist.
  const withType = await supabase
    .from('workspaces')
    .select('id, name, description, owner_id, created_at, workspace_type')
    .eq('owner_id', userId)
    .eq('workspace_type', 'fifo')
    .order('created_at', { ascending: false });
  if (!withType.error) return withType.data ?? [];

  const withoutType = await supabase
    .from('workspaces')
    .select('id, name, description, owner_id, created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (withoutType.error) throw withoutType.error;
  return (withoutType.data ?? []).map((w: any) => ({ ...w, workspace_type: null }));
}

async function safeSelectWorkspacesMember(userId: string) {
  const withType = await (supabase as any)
    .from('workspace_members')
    .select('workspace:workspaces!inner(id, name, description, owner_id, created_at, workspace_type)')
    .eq('user_id', userId)
    .eq('workspace.workspace_type', 'fifo');
  if (!withType.error) return (withType.data ?? []).map((m: any) => m.workspace).filter(Boolean);

  const withoutType = await (supabase as any)
    .from('workspace_members')
    .select('workspace:workspaces!inner(id, name, description, owner_id, created_at)')
    .eq('user_id', userId);
  if (withoutType.error) throw withoutType.error;
  return (withoutType.data ?? []).map((m: any) => ({ ...m.workspace, workspace_type: null })).filter(Boolean);
}

export function useFifoWorkspaces(userId?: string) {
  return useQuery({
    queryKey: ['ops', 'fifoWorkspaces', userId],
    enabled: !!userId,
    queryFn: async (): Promise<WorkspaceLite[]> => {
      if (!userId) return [];

      const [owned, member] = await Promise.all([
        safeSelectWorkspacesOwned(userId),
        safeSelectWorkspacesMember(userId),
      ]);

      const unique = Array.from(new Map([...owned, ...member].map((w: any) => [w.id, w])).values());

      const enriched = await Promise.all(
        unique.map(async (w: any) => {
          const [memberCount, storeCount] = await Promise.all([
            supabase.from('workspace_members').select('id', { count: 'exact', head: true }).eq('workspace_id', w.id),
            supabase.from('fifo_stores').select('id', { count: 'exact', head: true }).eq('workspace_id', w.id),
          ]);
          return {
            ...(w as WorkspaceLite),
            member_count: memberCount.count ?? 0,
            store_count: storeCount.count ?? 0,
          };
        }),
      );

      return enriched as WorkspaceLite[];
    },
  });
}

export function useFifoWorkspaceActivity(workspaceId?: string) {
  return useQuery({
    queryKey: ['ops', 'fifoWorkspaceActivity', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<FifoActivityLite[]> => {
      if (!workspaceId) return [];
      const res = await supabase
        .from('fifo_activity_log')
        .select('id, action_type, created_at, user_id, quantity_before, quantity_after, details')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoActivityLite[];
    },
  });
}

