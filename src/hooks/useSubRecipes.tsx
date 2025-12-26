import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubRecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

export interface SubRecipe {
  id: string;
  name: string;
  description?: string;
  total_yield_ml: number;
  ingredients: SubRecipeIngredient[];
  user_id: string;
  group_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubRecipeDepletion {
  id: string;
  sub_recipe_id: string;
  production_id?: string;
  amount_used_ml: number;
  ingredient_breakdown: SubRecipeIngredient[];
  depleted_by_user_id?: string;
  depleted_at: string;
  notes?: string;
}

export const useSubRecipes = (groupId?: string | null) => {
  const queryClient = useQueryClient();

  const { data: subRecipes, isLoading } = useQuery({
    queryKey: ['sub-recipes', groupId],
    queryFn: async (): Promise<SubRecipe[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('sub_recipes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter client-side to handle group membership
      const filtered = (data || []).filter((recipe: any) => {
        if (groupId) {
          return recipe.group_id === groupId;
        }
        return recipe.group_id === null && recipe.user_id === user.id;
      });
      
      return filtered.map((recipe: any) => ({
        ...recipe,
        ingredients: recipe.ingredients as unknown as SubRecipeIngredient[]
      })) as SubRecipe[];
    },
  });

  // Fetch depletions for sub-recipes
  const { data: depletions } = useQuery({
    queryKey: ['sub-recipe-depletions'],
    queryFn: async (): Promise<SubRecipeDepletion[]> => {
      const { data, error } = await supabase
        .from('sub_recipe_depletions')
        .select('*')
        .order('depleted_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        ingredient_breakdown: d.ingredient_breakdown as SubRecipeIngredient[]
      }));
    },
  });

  const createSubRecipe = useMutation({
    mutationFn: async (recipe: { 
      name: string; 
      description?: string; 
      total_yield_ml: number; 
      ingredients: SubRecipeIngredient[]; 
      group_id?: string | null 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert sub-recipe
      const { data: subRecipe, error } = await supabase
        .from('sub_recipes')
        .insert([{ 
          name: recipe.name,
          description: recipe.description,
          total_yield_ml: recipe.total_yield_ml,
          ingredients: JSON.parse(JSON.stringify(recipe.ingredients)),
          group_id: recipe.group_id || null,
          user_id: user.id 
        }])
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
          category: 'Sub-Recipe',
          bottle_size_ml: recipe.total_yield_ml,
          source_type: 'sub_recipe',
          source_id: subRecipe.id,
          unit: 'ml',
          user_id: user.id
        });
      }

      return subRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Sub-recipe created and added to spirits list!");
    },
    onError: (error) => {
      toast.error("Failed to create sub-recipe: " + error.message);
    },
  });

  const updateSubRecipe = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SubRecipe> }) => {
      const { error } = await supabase
        .from('sub_recipes')
        .update({
          name: updates.name,
          description: updates.description,
          total_yield_ml: updates.total_yield_ml,
          ingredients: updates.ingredients as any,
        })
        .eq('id', id);
      
      if (error) throw error;

      // Update master spirits if name or yield changed
      if (updates.name || updates.total_yield_ml) {
        const updateData: any = {};
        if (updates.name) updateData.name = updates.name;
        if (updates.total_yield_ml) updateData.bottle_size_ml = updates.total_yield_ml;
        
        await supabase
          .from('master_spirits')
          .update(updateData)
          .eq('source_id', id)
          .eq('source_type', 'sub_recipe');
      }

      return { id, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Sub-recipe updated!");
    },
    onError: (error) => {
      toast.error("Failed to update sub-recipe: " + error.message);
    },
  });

  const deleteSubRecipe = useMutation({
    mutationFn: async (id: string) => {
      // Also delete from master spirits
      await supabase
        .from('master_spirits')
        .delete()
        .eq('source_id', id)
        .eq('source_type', 'sub_recipe');

      const { error } = await supabase
        .from('sub_recipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Sub-recipe deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete sub-recipe: " + error.message);
    },
  });

  // Record sub-recipe usage/depletion
  const recordDepletion = useMutation({
    mutationFn: async ({ 
      subRecipeId, 
      amountUsedMl, 
      productionId,
      notes 
    }: { 
      subRecipeId: string; 
      amountUsedMl: number;
      productionId?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the sub-recipe to calculate breakdown
      const subRecipe = subRecipes?.find(r => r.id === subRecipeId);
      if (!subRecipe) throw new Error("Sub-recipe not found");

      const breakdown = calculateBreakdown(subRecipe, amountUsedMl);

      const { data, error } = await supabase
        .from('sub_recipe_depletions')
        .insert({
          sub_recipe_id: subRecipeId,
          production_id: productionId || null,
          amount_used_ml: amountUsedMl,
          ingredient_breakdown: JSON.parse(JSON.stringify(breakdown)),
          depleted_by_user_id: user.id,
          notes: notes || null
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipe-depletions'] });
      toast.success("Sub-recipe depletion recorded!");
    },
    onError: (error) => {
      toast.error("Failed to record depletion: " + error.message);
    },
  });

  // Calculate ingredient breakdown for a given amount of sub-recipe
  const calculateBreakdown = (subRecipe: SubRecipe, amountMl: number) => {
    const ratio = amountMl / subRecipe.total_yield_ml;
    return subRecipe.ingredients.map(ing => ({
      ...ing,
      scaled_amount: parseFloat((ing.amount * ratio).toFixed(2))
    }));
  };

  // Get sub-recipe by ID (used for ingredient lookup in batch calculator)
  const getSubRecipeById = (id: string) => {
    return subRecipes?.find(r => r.id === id);
  };

  // Get sub-recipe by name (used when selecting ingredient in batch calculator)
  const getSubRecipeByName = (name: string) => {
    return subRecipes?.find(r => r.name.toLowerCase() === name.toLowerCase());
  };

  // Get total depletion for a sub-recipe
  const getTotalDepletion = (subRecipeId: string) => {
    return (depletions || [])
      .filter(d => d.sub_recipe_id === subRecipeId)
      .reduce((sum, d) => sum + d.amount_used_ml, 0);
  };

  return {
    subRecipes,
    depletions,
    isLoading,
    createSubRecipe: createSubRecipe.mutate,
    updateSubRecipe: updateSubRecipe.mutate,
    deleteSubRecipe: deleteSubRecipe.mutate,
    recordDepletion: recordDepletion.mutate,
    calculateBreakdown,
    getSubRecipeById,
    getSubRecipeByName,
    getTotalDepletion,
  };
};
