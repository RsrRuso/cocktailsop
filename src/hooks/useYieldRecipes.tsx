import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface YieldRecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface YieldRecipePrepStep {
  id: string;
  step_number: number;
  description: string;
}

export interface YieldRecipe {
  id: string;
  user_id: string;
  name: string;
  mode: 'solid' | 'liquid';
  input_ingredients: YieldRecipeIngredient[];
  prep_steps: YieldRecipePrepStep[];
  raw_weight: number | null;
  prepared_weight: number | null;
  final_yield_ml: number | null;
  total_cost: number;
  unit: string;
  yield_percentage: number | null;
  wastage: number | null;
  cost_per_unit: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useYieldRecipes = () => {
  const queryClient = useQueryClient();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['yield-recipes'],
    queryFn: async (): Promise<YieldRecipe[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('yield_recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        mode: r.mode as 'solid' | 'liquid',
        input_ingredients: (r.input_ingredients as YieldRecipeIngredient[]) || [],
        prep_steps: (r.prep_steps || []) as YieldRecipePrepStep[]
      }));
    },
  });

  const saveRecipe = useMutation({
    mutationFn: async (recipe: Omit<YieldRecipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: yieldRecipe, error } = await supabase
        .from('yield_recipes')
        .insert({
          user_id: user.id,
          name: recipe.name,
          mode: recipe.mode,
          input_ingredients: JSON.parse(JSON.stringify(recipe.input_ingredients)),
          prep_steps: JSON.parse(JSON.stringify(recipe.prep_steps || [])),
          raw_weight: recipe.raw_weight,
          prepared_weight: recipe.prepared_weight,
          final_yield_ml: recipe.final_yield_ml,
          total_cost: recipe.total_cost,
          unit: recipe.unit,
          yield_percentage: recipe.yield_percentage,
          wastage: recipe.wastage,
          cost_per_unit: recipe.cost_per_unit,
          notes: recipe.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-add to master spirits list
      const { data: existing } = await supabase
        .from('master_spirits')
        .select('id')
        .eq('name', recipe.name)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('master_spirits').insert({
          name: recipe.name,
          category: recipe.mode === 'solid' ? 'Yield Product' : 'Infusion',
          bottle_size_ml: recipe.final_yield_ml || 0,
          source_type: 'yield_calculator',
          source_id: yieldRecipe.id,
          unit: recipe.unit,
          yield_percentage: recipe.yield_percentage,
          cost_per_unit: recipe.cost_per_unit,
          user_id: user.id
        });
      }

      return yieldRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Yield recipe saved and added to spirits list!");
    },
    onError: (error) => {
      toast.error("Failed to save recipe: " + error.message);
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      // Also delete from master spirits
      await supabase
        .from('master_spirits')
        .delete()
        .eq('source_id', id)
        .eq('source_type', 'yield_calculator');

      const { error } = await supabase
        .from('yield_recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Recipe deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  return {
    recipes,
    isLoading,
    saveRecipe: saveRecipe.mutate,
    deleteRecipe: deleteRecipe.mutate,
    isSaving: saveRecipe.isPending,
    isDeleting: deleteRecipe.isPending,
  };
};
