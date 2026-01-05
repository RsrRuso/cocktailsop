import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { FifoInventoryRow, FifoItem, FifoStore } from './types';

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

