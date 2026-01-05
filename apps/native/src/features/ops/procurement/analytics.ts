import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

export type PriceHistoryRow = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  item_name: string;
  previous_price: number | null;
  current_price: number;
  change_amount: number | null;
  change_pct: number | null;
  changed_at: string;
};

export function usePoPriceHistory(userId?: string, workspaceId?: string | null) {
  return useQuery({
    queryKey: ['proc', 'po_price_history', userId, workspaceId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<PriceHistoryRow[]> => {
      let q = supabase
        .from('po_price_history')
        .select('id, user_id, workspace_id, item_name, previous_price, current_price, change_amount, change_pct, changed_at')
        .order('changed_at', { ascending: false })
        .limit(200);

      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.eq('user_id', userId!).is('workspace_id', null);

      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as PriceHistoryRow[];
    },
  });
}

export type ProcurementOverview = {
  purchaseOrdersCount: number;
  purchaseOrdersTotal: number;
  receivedRecordsCount: number;
  receivedTotal: number;
  lastReceivedDate: string | null;
};

export function useProcurementOverview(userId?: string, workspaceId?: string | null) {
  return useQuery({
    queryKey: ['proc', 'overview', userId, workspaceId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<ProcurementOverview> => {
      // Purchase orders
      let poQ = supabase.from('purchase_orders').select('total_amount, created_at', { count: 'exact' });
      if (workspaceId) poQ = poQ.eq('workspace_id', workspaceId);
      else poQ = poQ.eq('user_id', userId!).is('workspace_id', null);
      const poRes = await poQ;
      if (poRes.error) throw poRes.error;
      const poRows = poRes.data ?? [];
      const purchaseOrdersCount = poRes.count ?? poRows.length;
      const purchaseOrdersTotal = poRows.reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);

      // Received records
      let rrQ = supabase.from('po_received_records').select('total_value, received_date', { count: 'exact' });
      if (workspaceId) rrQ = rrQ.eq('workspace_id', workspaceId);
      else rrQ = rrQ.eq('user_id', userId!).is('workspace_id', null);
      const rrRes = await rrQ;
      if (rrRes.error) throw rrRes.error;
      const rrRows = rrRes.data ?? [];
      const receivedRecordsCount = rrRes.count ?? rrRows.length;
      const receivedTotal = rrRows.reduce((s: number, r: any) => s + Number(r.total_value ?? 0), 0);
      const lastReceivedDate = rrRows
        .map((r: any) => r.received_date as string | null)
        .filter(Boolean)
        .sort()
        .pop() ?? null;

      return { purchaseOrdersCount, purchaseOrdersTotal, receivedRecordsCount, receivedTotal, lastReceivedDate };
    },
  });
}

