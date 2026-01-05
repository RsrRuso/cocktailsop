import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { queryClient } from '../../../lib/queryClient';

export function useCreateFifoInventory(userId?: string) {
  return useMutation({
    mutationFn: async ({
      storeId,
      itemId,
      quantity,
      expirationDate,
      notes,
    }: {
      storeId: string;
      itemId: string;
      quantity: number;
      expirationDate: string;
      notes?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase.from('fifo_inventory').insert({
        user_id: userId,
        store_id: storeId,
        item_id: itemId,
        quantity,
        expiration_date: expirationDate,
        notes: notes ?? null,
      });
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'inventory'] });
    },
  });
}

export function useCreateFifoStore(userId?: string) {
  return useMutation({
    mutationFn: async ({ name, location, storeType }: { name: string; location?: string; storeType?: string }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase.from('fifo_stores').insert({
        user_id: userId,
        name,
        location: location ?? null,
        store_type: storeType ?? null,
      });
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'stores'] });
    },
  });
}

export function useCreateFifoItem(userId?: string) {
  return useMutation({
    mutationFn: async ({
      name,
      brand,
      category,
      barcode,
    }: {
      name: string;
      brand?: string;
      category?: string;
      barcode?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase.from('fifo_items').insert({
        user_id: userId,
        name,
        brand: brand ?? null,
        category: category ?? null,
        barcode: barcode ?? null,
      });
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'items'] });
    },
  });
}

export function useCreateFifoEmployee(userId?: string) {
  return useMutation({
    mutationFn: async ({ name, title }: { name: string; title: string }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase.from('fifo_employees').insert({ user_id: userId, name, title });
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'employees'] });
    },
  });
}

export function useCreateFifoTransfer(userId?: string) {
  return useMutation({
    mutationFn: async ({
      fromInventoryId,
      fromStoreId,
      toStoreId,
      quantity,
      transferredBy,
      notes,
    }: {
      fromInventoryId: string;
      fromStoreId: string;
      toStoreId: string;
      quantity: number;
      transferredBy: string;
      notes?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');

      // Load current inventory row
      const invRes = await supabase
        .from('fifo_inventory')
        .select('id, store_id, item_id, quantity, expiration_date, notes')
        .eq('id', fromInventoryId)
        .single();
      if (invRes.error) throw invRes.error;
      const inv: any = invRes.data;

      if (inv.store_id !== fromStoreId) throw new Error('Inventory row does not belong to selected from store.');
      if (inv.quantity < quantity) throw new Error(`Not enough quantity available. Available: ${inv.quantity}`);

      // Create transfer record
      const transferRes = await supabase
        .from('fifo_transfers')
        .insert({
          user_id: userId,
          inventory_id: inv.id,
          from_store_id: fromStoreId,
          to_store_id: toStoreId,
          quantity,
          transferred_by: transferredBy,
          notes: notes ?? null,
          status: 'completed',
        })
        .select('id')
        .single();
      if (transferRes.error) throw transferRes.error;

      // Deduct from source inventory row
      const newQty = Number(inv.quantity) - quantity;
      const updRes = await supabase
        .from('fifo_inventory')
        .update({ quantity: newQty, status: newQty <= 0 ? 'transferred' : 'active' })
        .eq('id', inv.id);
      if (updRes.error) throw updRes.error;

      // Add/merge into destination inventory row by (store_id,item_id,expiration_date)
      const destRes = await supabase
        .from('fifo_inventory')
        .select('id, quantity')
        .eq('store_id', toStoreId)
        .eq('item_id', inv.item_id)
        .eq('expiration_date', inv.expiration_date)
        .maybeSingle();
      if (destRes.error) throw destRes.error;

      if (destRes.data?.id) {
        const destQty = Number(destRes.data.quantity ?? 0) + quantity;
        const up2 = await supabase.from('fifo_inventory').update({ quantity: destQty, status: 'active' }).eq('id', destRes.data.id);
        if (up2.error) throw up2.error;
      } else {
        const ins2 = await supabase.from('fifo_inventory').insert({
          user_id: userId,
          store_id: toStoreId,
          item_id: inv.item_id,
          quantity,
          expiration_date: inv.expiration_date,
          notes: inv.notes ?? null,
          status: 'active',
        });
        if (ins2.error) throw ins2.error;
      }

      // Activity log
      const act = await supabase.from('fifo_activity_log').insert({
        user_id: userId,
        inventory_id: inv.id,
        store_id: fromStoreId,
        employee_id: transferredBy,
        action_type: 'transferred',
        quantity_before: inv.quantity,
        quantity_after: newQty,
        details: { to_store_id: toStoreId, transfer_id: transferRes.data.id, quantity },
      });
      if (act.error) throw act.error;

      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'transfers'] });
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'activity'] });
    },
  });
}

export function useUpdateFifoStore(userId?: string) {
  return useMutation({
    mutationFn: async ({ id, name, location, storeType }: { id: string; name: string; location?: string; storeType?: string }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase
        .from('fifo_stores')
        .update({ name, location: location ?? null, store_type: storeType ?? null })
        .eq('id', id);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'stores'] });
    },
  });
}

export function useUpdateFifoItem(userId?: string) {
  return useMutation({
    mutationFn: async ({
      id,
      name,
      brand,
      category,
      barcode,
    }: {
      id: string;
      name: string;
      brand?: string;
      category?: string;
      barcode?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase
        .from('fifo_items')
        .update({ name, brand: brand ?? null, category: category ?? null, barcode: barcode ?? null })
        .eq('id', id);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fifo', 'items'] });
    },
  });
}

