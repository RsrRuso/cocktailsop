import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { FifoActivityRow, FifoEmployee, FifoInventoryRow, FifoItem, FifoStore, FifoTransferRow } from './types';

export function useFifoStores(userId?: string) {
  return useQuery({
    queryKey: ['fifo', 'stores', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FifoStore[]> => {
      const res = await supabase.from('fifo_stores').select('id, name, location, store_type').order('name');
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoStore[];
    },
  });
}

export function useFifoItems(userId?: string) {
  return useQuery({
    queryKey: ['fifo', 'items', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FifoItem[]> => {
      const res = await supabase
        .from('fifo_items')
        .select('id, name, brand, category, color_code, barcode, photo_url')
        .order('name');
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoItem[];
    },
  });
}

export function useFifoInventory(userId?: string) {
  return useQuery({
    queryKey: ['fifo', 'inventory', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FifoInventoryRow[]> => {
      const res = await supabase
        .from('fifo_inventory')
        .select(
          `
          id, item_id, store_id, quantity, expiration_date, received_date, batch_number, notes, priority_score, status, created_at,
          stores:fifo_stores!fifo_inventory_store_id_fkey(name, location, store_type),
          items:fifo_items!fifo_inventory_item_id_fkey(name, brand, category, color_code, barcode, photo_url)
        `,
        )
        .order('expiration_date', { ascending: true })
        .limit(500);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoInventoryRow[];
    },
  });
}

export function useFifoEmployees(userId?: string) {
  return useQuery({
    queryKey: ['fifo', 'employees', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FifoEmployee[]> => {
      const res = await supabase.from('fifo_employees').select('id, name, title').order('name');
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoEmployee[];
    },
  });
}

export function useFifoTransfers(userId?: string) {
  return useQuery({
    queryKey: ['fifo', 'transfers', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FifoTransferRow[]> => {
      const res = await supabase
        .from('fifo_transfers')
        .select(
          `
          id, inventory_id, from_store_id, to_store_id, quantity, transferred_by, transfer_date, status, notes, created_at,
          from_store:fifo_stores!fifo_transfers_from_store_id_fkey(name),
          to_store:fifo_stores!fifo_transfers_to_store_id_fkey(name),
          employees:fifo_employees!fifo_transfers_transferred_by_fkey(name),
          inventory:fifo_inventory!fifo_transfers_inventory_id_fkey(
            items:fifo_items!fifo_inventory_item_id_fkey(name, brand, category)
          )
        `,
        )
        .order('transfer_date', { ascending: false, nullsFirst: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoTransferRow[];
    },
  });
}

export function useFifoActivity(userId?: string) {
  return useQuery({
    queryKey: ['fifo', 'activity', userId],
    enabled: !!userId,
    queryFn: async (): Promise<FifoActivityRow[]> => {
      const res = await supabase
        .from('fifo_activity_log')
        .select(
          `
          id, action_type, inventory_id, store_id, employee_id, quantity_before, quantity_after, details, created_at,
          stores:fifo_stores!fifo_activity_log_store_id_fkey(name),
          employees:fifo_employees!fifo_activity_log_employee_id_fkey(name)
        `,
        )
        .order('created_at', { ascending: false })
        .limit(100);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as FifoActivityRow[];
    },
  });
}

