import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../../../lib/queryClient';
import { supabase } from '../../../lib/supabase';
import { env } from '../../../lib/env';
import type { BatchIngredient } from './types';

function toNum(v: string) {
  const n = Number(String(v).trim().replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function useCreateBatchRecipe(userId?: string) {
  return useMutation({
    mutationFn: async (input: { recipe_name: string; description?: string; current_serves: number; ingredients: BatchIngredient[] }) => {
      if (!userId) throw new Error('Not signed in');
      const name = input.recipe_name.trim();
      if (!name) throw new Error('Recipe name is required');
      const serves = Number(input.current_serves ?? 1);
      if (!Number.isFinite(serves) || serves <= 0) throw new Error('Serves must be > 0');
      const ings = (input.ingredients ?? []).filter((i) => i.name.trim().length > 0);
      if (ings.length === 0) throw new Error('Add at least one ingredient');

      const res = await supabase.from('batch_recipes').insert({
        user_id: userId,
        recipe_name: name,
        description: input.description?.trim() || null,
        current_serves: serves,
        ingredients: JSON.parse(JSON.stringify(ings)),
      } as any);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batch', 'recipes'] });
    },
  });
}

export function useUpdateBatchRecipe(userId?: string) {
  return useMutation({
    mutationFn: async (input: { id: string; recipe_name: string; description?: string; current_serves: number; ingredients: BatchIngredient[] }) => {
      if (!userId) throw new Error('Not signed in');
      const name = input.recipe_name.trim();
      if (!name) throw new Error('Recipe name is required');
      const serves = Number(input.current_serves ?? 1);
      if (!Number.isFinite(serves) || serves <= 0) throw new Error('Serves must be > 0');
      const ings = (input.ingredients ?? []).filter((i) => i.name.trim().length > 0);
      if (ings.length === 0) throw new Error('Add at least one ingredient');

      const res = await supabase
        .from('batch_recipes')
        .update({
          recipe_name: name,
          description: input.description?.trim() || null,
          current_serves: serves,
          ingredients: JSON.parse(JSON.stringify(ings)),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', input.id)
        .eq('user_id', userId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batch', 'recipes'] });
    },
  });
}

export function useDeleteBatchRecipe(userId?: string) {
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase.from('batch_recipes').delete().eq('id', input.id).eq('user_id', userId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batch', 'recipes'] });
    },
  });
}

export function useCreateBatchProduction(userId?: string) {
  return useMutation({
    mutationFn: async (input: {
      recipe: { id: string; recipe_name: string; current_serves: number; ingredients: BatchIngredient[] };
      group_id?: string | null;
      target_serves: number;
      target_liters: number;
      produced_by_name?: string;
      notes?: string;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const targetServes = Number(input.target_serves ?? 0);
      if (!Number.isFinite(targetServes) || targetServes <= 0) throw new Error('Target serves must be > 0');
      const targetLiters = Number(input.target_liters ?? 0);
      if (!Number.isFinite(targetLiters) || targetLiters < 0) throw new Error('Target liters must be >= 0');

      const factor = targetServes / Number(input.recipe.current_serves ?? 1);

      const prodRes = await supabase
        .from('batch_productions')
        .insert({
          recipe_id: input.recipe.id,
          user_id: userId,
          batch_name: input.recipe.recipe_name,
          target_serves: targetServes,
          target_liters: targetLiters,
          produced_by_name: input.produced_by_name?.trim() || null,
          notes: input.notes?.trim() || null,
          group_id: input.group_id ?? null,
        } as any)
        .select('id')
        .single();
      if (prodRes.error) throw prodRes.error;

      const productionId = prodRes.data.id as string;

      const ings = (input.recipe.ingredients ?? []).filter((i) => i.name.trim().length > 0);
      const rows = ings.map((ing) => {
        const original = toNum(ing.amount);
        const scaled = original * factor;
        return {
          production_id: productionId,
          ingredient_name: ing.name,
          original_amount: original,
          scaled_amount: scaled,
          unit: ing.unit || 'ml',
        };
      });

      const insIng = await supabase.from('batch_production_ingredients').insert(rows as any);
      if (insIng.error) throw insIng.error;

      // Prefer web link for QR view; native can still open the record.
      const base = env.webBaseUrl?.trim();
      const qrUrl = base ? `${base.replace(/\/$/, '')}/batch-view/${productionId}` : null;
      if (qrUrl) {
        await supabase.from('batch_productions').update({ qr_code_data: qrUrl } as any).eq('id', productionId);
      }

      return productionId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['batch', 'productions'] });
    },
  });
}

