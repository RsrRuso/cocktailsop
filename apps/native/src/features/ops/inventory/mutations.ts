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

