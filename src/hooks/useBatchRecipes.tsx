import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchIngredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface BatchRecipe {
  id: string;
  recipe_name: string;
  description?: string;
  current_serves: number;
  ingredients: BatchIngredient[];
  created_at: string;
  updated_at: string;
}

export const useBatchRecipes = () => {
  const queryClient = useQueryClient();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['batch-recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batch_recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(recipe => ({
        ...recipe,
        ingredients: recipe.ingredients as unknown as BatchIngredient[]
      })) as BatchRecipe[];
    },
  });

  const createRecipe = useMutation({
    mutationFn: async (recipe: Omit<BatchRecipe, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('batch_recipes')
        .insert([{ 
          recipe_name: recipe.recipe_name,
          description: recipe.description,
          current_serves: recipe.current_serves,
          ingredients: recipe.ingredients as any,
          user_id: user.id 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-recipes'] });
      toast.success("Recipe template saved!");
    },
    onError: (error) => {
      toast.error("Failed to save recipe: " + error.message);
    },
  });

  const updateRecipe = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BatchRecipe> }) => {
      const { data, error } = await supabase
        .from('batch_recipes')
        .update({
          recipe_name: updates.recipe_name,
          description: updates.description,
          current_serves: updates.current_serves,
          ingredients: updates.ingredients as any,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-recipes'] });
      toast.success("Recipe updated!");
    },
    onError: (error) => {
      toast.error("Failed to update recipe: " + error.message);
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('batch_recipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-recipes'] });
      toast.success("Recipe deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete recipe: " + error.message);
    },
  });

  return {
    recipes,
    isLoading,
    createRecipe: createRecipe.mutate,
    updateRecipe: updateRecipe.mutate,
    deleteRecipe: deleteRecipe.mutate,
  };
};