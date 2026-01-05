import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { BatchProductionIngredientLite, BatchProductionLite, BatchRecipeLite, MixologistGroupLite } from './types';

export function useMixologistGroups(userId?: string) {
  return useQuery({
    queryKey: ['batch', 'groups', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MixologistGroupLite[]> => {
      // RLS already restricts to groups user can see
      const res = await supabase.from('mixologist_groups').select('id, name, description, created_by, created_at').order('created_at', { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as MixologistGroupLite[];
    },
  });
}

export function useBatchRecipes(userId?: string) {
  return useQuery({
    queryKey: ['batch', 'recipes', userId],
    enabled: !!userId,
    queryFn: async (): Promise<BatchRecipeLite[]> => {
      const res = await supabase
        .from('batch_recipes')
        .select('id, user_id, recipe_name, description, current_serves, ingredients, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as BatchRecipeLite[];
    },
  });
}

export function useBatchProductions(userId?: string, groupId?: string | null) {
  return useQuery({
    queryKey: ['batch', 'productions', userId, groupId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<BatchProductionLite[]> => {
      let q = supabase
        .from('batch_productions')
        .select('id, recipe_id, user_id, group_id, batch_name, target_serves, target_liters, production_date, produced_by_name, produced_by_email, qr_code_data, notes, created_at')
        .order('production_date', { ascending: false })
        .limit(100);
      if (groupId) q = q.eq('group_id', groupId);
      else q = q.is('group_id', null);
      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as BatchProductionLite[];
    },
  });
}

export function useBatchProductionById(userId?: string, productionId?: string) {
  return useQuery({
    queryKey: ['batch', 'production', userId, productionId ?? null],
    enabled: !!userId && !!productionId,
    queryFn: async (): Promise<BatchProductionLite | null> => {
      const res = await supabase
        .from('batch_productions')
        .select('id, recipe_id, user_id, group_id, batch_name, target_serves, target_liters, production_date, produced_by_name, produced_by_email, qr_code_data, notes, created_at')
        .eq('id', productionId!)
        .maybeSingle();
      if (res.error) throw res.error;
      return (res.data ?? null) as unknown as BatchProductionLite | null;
    },
  });
}

export function useProductionIngredients(productionId?: string) {
  return useQuery({
    queryKey: ['batch', 'production_ingredients', productionId ?? null],
    enabled: !!productionId,
    queryFn: async (): Promise<BatchProductionIngredientLite[]> => {
      const res = await supabase
        .from('batch_production_ingredients')
        .select('id, production_id, ingredient_name, original_amount, scaled_amount, unit, created_at')
        .eq('production_id', productionId!)
        .order('created_at', { ascending: true });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as BatchProductionIngredientLite[];
    },
  });
}

