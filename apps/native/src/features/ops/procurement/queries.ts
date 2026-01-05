import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { MasterItemLite, ProcurementWorkspace, PurchaseOrderLite, ReceivedItemLite, ReceivedRecordLite } from './types';

export function useProcurementWorkspaces(userId?: string) {
  return useQuery({
    queryKey: ['proc', 'workspaces', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProcurementWorkspace[]> => {
      const res = await supabase.from('procurement_workspaces').select('*').order('created_at', { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as ProcurementWorkspace[];
    },
  });
}

export function usePurchaseOrders(userId?: string, workspaceId?: string | null) {
  return useQuery({
    queryKey: ['proc', 'purchase_orders', userId, workspaceId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<PurchaseOrderLite[]> => {
      let q = supabase
        .from('purchase_orders')
        .select('id, user_id, workspace_id, order_number, supplier_name, order_date, total_amount, status, notes, document_url, created_at')
        .order('created_at', { ascending: false });

      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.eq('user_id', userId!).is('workspace_id', null);

      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as PurchaseOrderLite[];
    },
  });
}

export function usePOMasterItems(userId?: string, workspaceId?: string | null) {
  return useQuery({
    queryKey: ['proc', 'po_master_items', userId, workspaceId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<MasterItemLite[]> => {
      let q = supabase
        .from('purchase_order_master_items')
        .select('id, user_id, workspace_id, item_name, unit, category, last_price, created_at, updated_at')
        .order('item_name', { ascending: true });

      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.eq('user_id', userId!).is('workspace_id', null);

      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as MasterItemLite[];
    },
  });
}

export function usePOReceivedRecords(userId?: string, workspaceId?: string | null) {
  return useQuery({
    queryKey: ['proc', 'po_received_records', userId, workspaceId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<ReceivedRecordLite[]> => {
      let q = supabase
        .from('po_received_records')
        .select('id, user_id, workspace_id, supplier_name, document_number, received_date, total_items, total_quantity, total_value, status, variance_data, created_at')
        .order('received_date', { ascending: false })
        .limit(200);

      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.eq('user_id', userId!).is('workspace_id', null);

      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as ReceivedRecordLite[];
    },
  });
}

export function usePOReceivedItemsForRecord(userId?: string, workspaceId?: string | null, recordId?: string | null) {
  return useQuery({
    queryKey: ['proc', 'po_received_items', userId, workspaceId ?? null, recordId ?? null],
    enabled: !!userId && !!recordId,
    queryFn: async (): Promise<ReceivedItemLite[]> => {
      let q = supabase
        .from('purchase_order_received_items')
        .select(
          'id, user_id, workspace_id, record_id, document_number, is_received, item_name, quantity, unit, unit_price, total_price, received_date, created_at',
        )
        .eq('record_id', recordId!)
        .order('created_at', { ascending: false })
        .limit(500);

      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.eq('user_id', userId!).is('workspace_id', null);

      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as ReceivedItemLite[];
    },
  });
}

