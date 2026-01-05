import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryClient } from '../../../lib/queryClient';
import type { PurchaseOrderItemInput } from './types';

export function useCreatePurchaseOrder(userId?: string, workspaceId?: string | null) {
  return useMutation({
    mutationFn: async (input: {
      supplierName?: string;
      orderNumber?: string;
      orderDate?: string;
      notes?: string;
      documentPath?: string | null;
      items: PurchaseOrderItemInput[];
    }) => {
      if (!userId) throw new Error('Not signed in');
      const cleanItems = (input.items ?? [])
        .map((it) => ({
          item_code: (it.item_code ?? '').trim() || null,
          item_name: it.item_name.trim(),
          quantity: Number(it.quantity ?? 0),
          price_per_unit: Number(it.price_per_unit ?? 0),
          price_total: Number(it.quantity ?? 0) * Number(it.price_per_unit ?? 0),
        }))
        .filter((it) => it.item_name.length > 0);

      if (cleanItems.length === 0) throw new Error('Add at least one item');

      const total = cleanItems.reduce((sum, it) => sum + (it.price_total ?? 0), 0);

      const poRes = await supabase
        .from('purchase_orders')
        .insert({
          user_id: userId,
          workspace_id: workspaceId ?? null,
          supplier_name: input.supplierName?.trim() || null,
          order_number: input.orderNumber?.trim() || null,
          order_date: input.orderDate ?? null,
          notes: input.notes?.trim() || null,
          document_url: input.documentPath ?? null,
          total_amount: total,
          status: 'draft',
        } as any)
        .select('id')
        .single();
      if (poRes.error) throw poRes.error;

      const itemsRes = await supabase.from('purchase_order_items').insert(
        cleanItems.map((it) => ({
          purchase_order_id: poRes.data.id,
          item_code: it.item_code,
          item_name: it.item_name,
          quantity: it.quantity,
          price_per_unit: it.price_per_unit,
          price_total: it.price_total,
        })) as any,
      );
      if (itemsRes.error) throw itemsRes.error;

      return poRes.data.id as string;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'purchase_orders'] });
    },
  });
}

export function useUpdateMasterItem(userId?: string, workspaceId?: string | null) {
  return useMutation({
    mutationFn: async (input: { id: string; unit?: string | null; category?: string | null; last_price?: number | null }) => {
      if (!userId) throw new Error('Not signed in');

      // Soft guard: only allow updates to rows in current scope
      let q = supabase.from('purchase_order_master_items').update({
        unit: input.unit ?? null,
        category: input.category ?? null,
        last_price: input.last_price ?? null,
        updated_at: new Date().toISOString(),
      } as any);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.eq('user_id', userId).is('workspace_id', null);

      const res = await q.eq('id', input.id);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_master_items'] });
    },
  });
}

async function upsertMasterItem({
  userId,
  workspaceId,
  itemName,
  unit,
  unitPrice,
}: {
  userId: string;
  workspaceId?: string | null;
  itemName: string;
  unit?: string | null;
  unitPrice?: number | null;
}) {
  const normalizedName = itemName.trim();
  if (!normalizedName) return null;

  let existingQuery = supabase.from('purchase_order_master_items').select('id, item_name').ilike('item_name', normalizedName);
  if (workspaceId) existingQuery = existingQuery.eq('workspace_id', workspaceId);
  else existingQuery = existingQuery.eq('user_id', userId).is('workspace_id', null);

  const existing = await existingQuery.maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    // Optionally update last_price/unit
    if (unitPrice != null || unit) {
      const upd = await supabase
        .from('purchase_order_master_items')
        .update({ last_price: unitPrice ?? null, unit: unit ?? null, updated_at: new Date().toISOString() } as any)
        .eq('id', existing.data.id);
      if (upd.error) throw upd.error;
    }
    return existing.data.id as string;
  }

  const ins = await supabase
    .from('purchase_order_master_items')
    .insert({
      user_id: userId,
      workspace_id: workspaceId ?? null,
      item_name: normalizedName,
      unit: unit ?? null,
      last_price: unitPrice ?? null,
    } as any)
    .select('id')
    .single();
  if (ins.error) throw ins.error;
  return ins.data.id as string;
}

async function recomputeReceivedRecordTotals({
  userId,
  workspaceId,
  recordId,
}: {
  userId: string;
  workspaceId?: string | null;
  recordId: string;
}) {
  let q = supabase
    .from('purchase_order_received_items')
    .select('quantity, total_price')
    .eq('record_id', recordId)
    .limit(5000);

  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  else q = q.eq('user_id', userId).is('workspace_id', null);

  const res = await q;
  if (res.error) throw res.error;
  const rows = res.data ?? [];
  const totalItems = rows.length;
  const totalQty = rows.reduce((sum: number, r: any) => sum + Number(r.quantity ?? 0), 0);
  const totalValue = rows.reduce((sum: number, r: any) => sum + Number(r.total_price ?? 0), 0);

  let upd = supabase.from('po_received_records').update({
    total_items: totalItems,
    total_quantity: totalQty,
    total_value: totalValue,
  } as any);
  if (workspaceId) upd = upd.eq('workspace_id', workspaceId);
  else upd = upd.eq('user_id', userId).is('workspace_id', null);

  const updRes = await upd.eq('id', recordId);
  if (updRes.error) throw updRes.error;
}

export function useAddReceivedItem(userId?: string, workspaceId?: string | null) {
  return useMutation({
    mutationFn: async (input: {
      recordId: string;
      documentNumber?: string | null;
      receivedDate?: string | null;
      item_name: string;
      quantity: number;
      unit?: string | null;
      unit_price?: number | null;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const name = input.item_name.trim();
      if (!name) throw new Error('Item name is required');
      const qty = Number(input.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantity must be > 0');
      const unitPrice = input.unit_price != null ? Number(input.unit_price) : null;
      const totalPrice = unitPrice != null ? qty * unitPrice : null;

      const masterId = await upsertMasterItem({
        userId,
        workspaceId,
        itemName: name,
        unit: input.unit ?? null,
        unitPrice,
      });

      const ins = await supabase.from('purchase_order_received_items').insert({
        user_id: userId,
        workspace_id: workspaceId ?? null,
        record_id: input.recordId,
        document_number: input.documentNumber ?? null,
        received_date: input.receivedDate ?? undefined,
        item_name: name,
        quantity: qty,
        unit: input.unit ?? null,
        unit_price: unitPrice,
        total_price: totalPrice,
        master_item_id: masterId,
        is_received: true,
      } as any);
      if (ins.error) throw ins.error;

      await recomputeReceivedRecordTotals({ userId, workspaceId, recordId: input.recordId });
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_received_records'] });
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_received_items'] });
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_master_items'] });
    },
  });
}

export function useDeleteReceivedItem(userId?: string, workspaceId?: string | null) {
  return useMutation({
    mutationFn: async (input: { id: string; recordId: string }) => {
      if (!userId) throw new Error('Not signed in');
      let del = supabase.from('purchase_order_received_items').delete();
      if (workspaceId) del = del.eq('workspace_id', workspaceId);
      else del = del.eq('user_id', userId).is('workspace_id', null);
      const res = await del.eq('id', input.id);
      if (res.error) throw res.error;
      await recomputeReceivedRecordTotals({ userId, workspaceId, recordId: input.recordId });
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_received_records'] });
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_received_items'] });
    },
  });
}

export function useCreateReceivedRecord(userId?: string, workspaceId?: string | null) {
  return useMutation({
    mutationFn: async (input: {
      supplierName?: string;
      documentNumber?: string;
      receivedDate?: string;
      totalValue?: number;
      documentPath?: string | null;
      documentName?: string | null;
      documentMimeType?: string | null;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase.from('po_received_records').insert({
        user_id: userId,
        workspace_id: workspaceId ?? null,
        supplier_name: input.supplierName?.trim() || null,
        document_number: input.documentNumber?.trim() || null,
        received_date: input.receivedDate ?? null,
        total_value: input.totalValue ?? 0,
        status: 'completed',
        variance_data: input.documentPath
          ? {
              document: {
                path: input.documentPath,
                name: input.documentName ?? null,
                mimeType: input.documentMimeType ?? null,
              },
            }
          : null,
      } as any);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['proc', 'po_received_records'] });
    },
  });
}

