import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryClient } from '../../../lib/queryClient';
import type { ProcurementStaffLite } from './types';

export function useProcurementWorkspaceRole(userId?: string, workspaceId?: string) {
  return useQuery({
    queryKey: ['proc', 'workspace_role', userId, workspaceId],
    enabled: !!userId && !!workspaceId,
    queryFn: async (): Promise<'owner' | 'admin' | 'member' | null> => {
      if (!userId || !workspaceId) return null;

      const ws = await supabase.from('procurement_workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
      if (ws.error) throw ws.error;
      if (ws.data?.owner_id === userId) return 'owner';

      const mem = await (supabase as any)
        .from('procurement_workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();
      if (mem.error) throw mem.error;
      return (mem.data?.role as any) ?? null;
    },
  });
}

export function useProcurementStaff(workspaceId?: string) {
  return useQuery({
    queryKey: ['proc', 'staff', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<ProcurementStaffLite[]> => {
      if (!workspaceId) return [];
      const res = await supabase
        .from('procurement_staff')
        .select('id, workspace_id, user_id, full_name, role, pin_code, permissions, is_active, created_at, updated_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as ProcurementStaffLite[];
    },
  });
}

export function useCreateProcurementStaff(workspaceId?: string) {
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      role: string;
      pin_code: string;
      permissions: Record<string, boolean>;
      is_active: boolean;
    }) => {
      if (!workspaceId) throw new Error('Select a workspace');
      const pin = input.pin_code.trim();
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');
      const name = input.full_name.trim();
      if (!name) throw new Error('Name is required');

      const res = await supabase.from('procurement_staff').insert({
        workspace_id: workspaceId,
        full_name: name,
        role: input.role || 'staff',
        pin_code: pin,
        permissions: input.permissions ?? { can_create_po: true, can_receive: true },
        is_active: Boolean(input.is_active),
      } as any);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'staff', workspaceId] });
    },
  });
}

export function useUpdateProcurementStaff(workspaceId?: string) {
  return useMutation({
    mutationFn: async (input: {
      id: string;
      full_name: string;
      role: string;
      pin_code: string;
      permissions: Record<string, boolean>;
      is_active: boolean;
    }) => {
      if (!workspaceId) throw new Error('Select a workspace');
      const pin = input.pin_code.trim();
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits');
      const name = input.full_name.trim();
      if (!name) throw new Error('Name is required');

      const res = await supabase
        .from('procurement_staff')
        .update({
          full_name: name,
          role: input.role || 'staff',
          pin_code: pin,
          permissions: input.permissions ?? { can_create_po: true, can_receive: true },
          is_active: Boolean(input.is_active),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', input.id)
        .eq('workspace_id', workspaceId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'staff', workspaceId] });
    },
  });
}

export function useSetProcurementStaffActive(workspaceId?: string) {
  return useMutation({
    mutationFn: async (input: { id: string; is_active: boolean }) => {
      if (!workspaceId) throw new Error('Select a workspace');
      const res = await supabase
        .from('procurement_staff')
        .update({ is_active: Boolean(input.is_active), updated_at: new Date().toISOString() } as any)
        .eq('id', input.id)
        .eq('workspace_id', workspaceId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'staff', workspaceId] });
    },
  });
}

