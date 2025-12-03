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
  group_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const useBatchRecipes = (groupId?: string | null) => {
  const queryClient = useQueryClient();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['batch-recipes', groupId],
    queryFn: async (): Promise<BatchRecipe[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch all user's recipes and filter client-side to avoid TypeScript deep instantiation issue
      const { data, error } = await supabase
        .from('batch_recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Cast to any to handle group_id which may not be in generated types yet
      const filtered = (data || []).filter((recipe: any) => {
        if (groupId) {
          return recipe.group_id === groupId;
        } else {
          // Show personal recipes (no group) belonging to the user
          return recipe.group_id === null && recipe.user_id === user.id;
        }
      });
      
      return filtered.map((recipe: any) => ({
        ...recipe,
        ingredients: recipe.ingredients as unknown as BatchIngredient[]
      })) as BatchRecipe[];
    },
  });

  const createRecipe = useMutation({
    mutationFn: async (recipe: { recipe_name: string; description?: string; current_serves: number; ingredients: BatchIngredient[]; group_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('batch_recipes')
        .insert([{ 
          recipe_name: recipe.recipe_name,
          description: recipe.description,
          current_serves: recipe.current_serves,
          ingredients: JSON.parse(JSON.stringify(recipe.ingredients)),
          group_id: recipe.group_id || null,
          user_id: user.id 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['batch-recipes'] });
      toast.success("Recipe template saved!");

      // Notify all mixologist group members
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id)
        .single();

      const { data: userGroups } = await supabase
        .from('mixologist_group_members')
        .select('group_id')
        .eq('user_id', user?.id || '');

      if (userGroups && profile) {
        for (const userGroup of userGroups) {
          const { data: members } = await supabase
            .from('mixologist_group_members')
            .select('user_id')
            .eq('group_id', userGroup.group_id)
            .neq('user_id', user?.id || '');

          if (members) {
            for (const member of members) {
              await supabase.from('notifications').insert({
                user_id: member.user_id,
                type: 'recipe_created',
                content: `${profile.username} created a new recipe: ${data.recipe_name}`,
                read: false
              });
            }
          }
        }
      }
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