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

// Module-level cache for instant loading
let recipesCache: Map<string, { data: BatchRecipe[]; timestamp: number }> = new Map();
const CACHE_TIME = 2 * 60 * 1000; // 2 minutes

const getCacheKey = (groupId?: string | null, staffMode?: boolean) => 
  `${groupId || 'personal'}-${staffMode ? 'staff' : 'user'}`;

export const useBatchRecipes = (groupId?: string | null, staffMode?: boolean) => {
  const queryClient = useQueryClient();
  const cacheKey = getCacheKey(groupId, staffMode);
  const cached = recipesCache.get(cacheKey);
  const hasValidCache = cached && Date.now() - cached.timestamp < CACHE_TIME;

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['batch-recipes', groupId, staffMode],
    queryFn: async (): Promise<BatchRecipe[]> => {
      // Staff mode (PIN access): fetch via backend function to bypass RLS safely
      if (staffMode && groupId) {
        const raw = sessionStorage.getItem("batch_calculator_staff_session");
        const pin = raw ? (JSON.parse(raw)?.pin as string | undefined) : undefined;

        if (!pin) return [];

        const { data, error } = await supabase.functions.invoke("batch-staff-recipes", {
          body: { groupId, pin },
        });

        if (error) throw error;

        const rows = (data as any)?.recipes || [];
        const result = rows.map((recipe: any) => ({
          ...recipe,
          ingredients: recipe.ingredients as unknown as BatchIngredient[],
        })) as BatchRecipe[];
        recipesCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Fetch batch recipes
      const { data: batchData, error: batchError } = await supabase
        .from('batch_recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (batchError) throw batchError;
      
      // Also fetch cocktail SOPs and convert them to batch recipe format
      const { data: sopsData, error: sopsError } = await supabase
        .from('cocktail_sops')
        .select('id, drink_name, recipe, total_ml, created_at, updated_at, user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Cast to any to handle group_id which may not be in generated types yet
      const filtered = (batchData || []).filter((recipe: any) => {
        if (groupId) {
          return recipe.group_id === groupId;
        } else {
          // Show personal recipes (no group) belonging to the user
          return recipe.group_id === null && recipe.user_id === user.id;
        }
      });
      
      const batchRecipes = filtered.map((recipe: any) => ({
        ...recipe,
        ingredients: recipe.ingredients as unknown as BatchIngredient[]
      })) as BatchRecipe[];

      // Convert cocktail SOPs to BatchRecipe format (only for personal recipes view)
      const sopRecipes: BatchRecipe[] = !groupId && !sopsError && sopsData ? sopsData.map((sop: any) => {
        // Parse recipe JSON to extract ingredients
        const recipeData = sop.recipe as any[] || [];
        const ingredients: BatchIngredient[] = recipeData.map((ing: any, index: number) => ({
          id: `sop-ing-${index}`,
          name: ing.ingredient || ing.name || '',
          amount: String(ing.amount || ing.ml || ''),
          unit: ing.unit || 'ml'
        }));

        return {
          id: `sop-${sop.id}`,
          recipe_name: sop.drink_name,
          description: `Cocktail SOP - ${sop.total_ml}ml total`,
          current_serves: 1,
          ingredients,
          group_id: null,
          created_at: sop.created_at,
          updated_at: sop.updated_at,
        };
      }) : [];

      // Combine batch recipes and SOP recipes, avoiding duplicates by name
      const allRecipes = [...batchRecipes];
      sopRecipes.forEach(sopRecipe => {
        const exists = allRecipes.some(r => 
          r.recipe_name.toLowerCase() === sopRecipe.recipe_name.toLowerCase()
        );
        if (!exists) {
          allRecipes.push(sopRecipe);
        }
      });
      
      recipesCache.set(cacheKey, { data: allRecipes, timestamp: Date.now() });
      return allRecipes;
    },
    initialData: hasValidCache ? cached.data : undefined,
    staleTime: CACHE_TIME,
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
      recipesCache.clear();
      queryClient.invalidateQueries({ queryKey: ['batch-recipes'] });
      toast.success("Recipe template saved!");

      // Notify all mixologist group members using SECURITY DEFINER function
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user?.id)
        .single();

      // If recipe has a group_id, notify that group
      if (data.group_id && profile) {
        await supabase.rpc('notify_batch_group_members', {
          p_group_id: data.group_id,
          p_notification_type: 'recipe_created',
          p_content: `${profile.username} created a new recipe: ${data.recipe_name}`,
          p_submitter_id: user?.id
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to save recipe: " + error.message);
    },
  });

  const updateRecipe = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BatchRecipe> }) => {
      // Update the recipe template
      const { error } = await supabase
        .from('batch_recipes')
        .update({
          recipe_name: updates.recipe_name,
          description: updates.description,
          current_serves: updates.current_serves,
          ingredients: updates.ingredients as any,
        })
        .eq('id', id);
      
      if (error) throw error;

      // Cascade update to all linked batch productions
      if (updates.recipe_name || updates.current_serves) {
        const cascadeUpdates: any = {};
        if (updates.recipe_name) cascadeUpdates.batch_name = updates.recipe_name;
        if (updates.current_serves) cascadeUpdates.target_serves = updates.current_serves;
        
        await supabase
          .from('batch_productions')
          .update(cascadeUpdates)
          .eq('recipe_id', id);
      }

      return { id, ...updates };
    },
    onSuccess: () => {
      recipesCache.clear();
      queryClient.invalidateQueries({ queryKey: ['batch-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['batch-productions'] });
      toast.success("Recipe and all linked productions updated!");
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
      recipesCache.clear();
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