import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import type { BatchProductionIngredientLite, BatchProductionLite, BatchRecipeLite, MixologistGroupLite } from './types';
import type { BatchStaffSession } from './staffSession';

export function useMixologistGroups(userId?: string) {
  return useQuery({
    queryKey: ['batch', 'groups', userId],
    enabled: !!userId,
    queryFn: async (): Promise<MixologistGroupLite[]> => {
      // First get group IDs where user is a member - explicit membership filter
      const membershipsRes = await supabase
        .from('mixologist_group_members')
        .select('group_id')
        .eq('user_id', userId!);
      
      if (membershipsRes.error) throw membershipsRes.error;
      if (!membershipsRes.data || membershipsRes.data.length === 0) return [];
      
      const groupIds = membershipsRes.data.map(m => m.group_id);
      
      // Then fetch only those groups user is member of
      const res = await supabase
        .from('mixologist_groups')
        .select('id, name, description, created_by, created_at')
        .in('id', groupIds)
        .order('created_at', { ascending: false });
      
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as MixologistGroupLite[];
    },
  });
}

export function useBatchRecipes(userId?: string, opts?: { staffSession?: BatchStaffSession | null; groupId?: string | null }) {
  return useQuery({
    queryKey: ['batch', 'recipes', userId ?? null, opts?.staffSession?.group?.id ?? null, opts?.groupId ?? null],
    enabled: !!userId || !!opts?.staffSession?.group?.id,
    queryFn: async (): Promise<BatchRecipeLite[]> => {
      // Staff mode: use edge function to bypass RLS safely
      if (opts?.staffSession?.group?.id && opts?.staffSession?.pin) {
        const { data, error } = await supabase.functions.invoke('batch-staff-recipes', {
          body: { groupId: opts.staffSession.group.id, pin: opts.staffSession.pin },
        });
        if (error) throw error;
        const rows = (data as any)?.recipes || [];
        return rows as BatchRecipeLite[];
      }

      // Build query with explicit filtering - only show personal or group-specific recipes
      let q = supabase
        .from('batch_recipes')
        .select('id, user_id, recipe_name, description, current_serves, ingredients, created_at, updated_at, group_id')
        .order('created_at', { ascending: false });
      
      if (opts?.groupId) {
        // Show recipes for specific group only
        q = q.eq('group_id', opts.groupId);
      } else {
        // Show personal recipes only (no group, owned by user)
        q = q.is('group_id', null).eq('user_id', userId!);
      }
      
      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as BatchRecipeLite[];
    },
  });
}

export function useBatchProductions(
  userId?: string,
  groupId?: string | null,
  opts?: { staffSession?: BatchStaffSession | null; recipeId?: string },
) {
  return useQuery({
    queryKey: ['batch', 'productions', userId ?? null, groupId ?? null, opts?.staffSession?.group?.id ?? null, opts?.recipeId ?? null],
    enabled: !!userId || !!opts?.staffSession?.group?.id,
    queryFn: async (): Promise<BatchProductionLite[]> => {
      // Staff mode: use edge function to bypass RLS safely
      if (opts?.staffSession?.group?.id && opts?.staffSession?.pin) {
        const { data, error } = await supabase.functions.invoke('batch-staff-productions', {
          body: { groupId: opts.staffSession.group.id, pin: opts.staffSession.pin, recipeId: opts.recipeId },
        });
        if (error) throw error;
        const rows = (data as any)?.productions || [];
        return rows as BatchProductionLite[];
      }

      let q = supabase
        .from('batch_productions')
        .select('id, recipe_id, user_id, group_id, batch_name, target_serves, target_liters, production_date, produced_by_name, produced_by_email, qr_code_data, notes, created_at')
        .order('production_date', { ascending: false })
        .limit(100);
      if (opts?.recipeId) q = q.eq('recipe_id', opts.recipeId);
      if (groupId) q = q.eq('group_id', groupId);
      else q = q.is('group_id', null);
      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as BatchProductionLite[];
    },
  });
}

export function useBatchProductionById(userId?: string, productionId?: string, opts?: { staffSession?: BatchStaffSession | null }) {
  return useQuery({
    queryKey: ['batch', 'production', userId ?? null, productionId ?? null, opts?.staffSession?.group?.id ?? null],
    enabled: (!!userId || !!opts?.staffSession?.group?.id) && !!productionId,
    queryFn: async (): Promise<BatchProductionLite | null> => {
      if (opts?.staffSession?.group?.id && opts?.staffSession?.pin) {
        const { data, error } = await supabase.functions.invoke('batch-staff-productions', {
          body: { groupId: opts.staffSession.group.id, pin: opts.staffSession.pin },
        });
        if (error) throw error;
        const rows = ((data as any)?.productions || []) as BatchProductionLite[];
        return rows.find((r) => r.id === productionId) ?? null;
      }

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

export function useProductionIngredients(productionId?: string, opts?: { staffSession?: BatchStaffSession | null }) {
  return useQuery({
    queryKey: ['batch', 'production_ingredients', productionId ?? null, opts?.staffSession?.group?.id ?? null],
    enabled: !!productionId,
    queryFn: async (): Promise<BatchProductionIngredientLite[]> => {
      if (opts?.staffSession?.group?.id && opts?.staffSession?.pin) {
        const { data, error } = await supabase.functions.invoke('batch-staff-production-ingredients', {
          body: { groupId: opts.staffSession.group.id, pin: opts.staffSession.pin, productionId },
        });
        if (error) throw error;
        const rows = (data as any)?.ingredients || [];
        return rows as BatchProductionIngredientLite[];
      }

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

