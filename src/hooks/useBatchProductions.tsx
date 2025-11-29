import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchProduction {
  id: string;
  recipe_id: string;
  batch_name: string;
  target_serves: number;
  target_liters: number;
  production_date: string;
  produced_by_name?: string;
  produced_by_email?: string;
  produced_by_user_id?: string;
  qr_code_data?: string;
  notes?: string;
  group_id?: string;
  created_at: string;
}

export interface BatchProductionIngredient {
  id: string;
  production_id: string;
  ingredient_name: string;
  original_amount: number;
  scaled_amount: number;
  unit: string;
}

export const useBatchProductions = (recipeId?: string, groupId?: string | null) => {
  const queryClient = useQueryClient();

  const { data: productions, isLoading } = useQuery({
    queryKey: ['batch-productions', recipeId, groupId],
    queryFn: async () => {
      let query = supabase
        .from('batch_productions')
        .select('*')
        .order('production_date', { ascending: false });
      
      if (recipeId) {
        query = query.eq('recipe_id', recipeId);
      }

      // Filter by group_id when a group is selected
      if (groupId) {
        query = query.eq('group_id', groupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BatchProduction[];
    },
  });

  const createProduction = useMutation({
    mutationFn: async ({
      production,
      ingredients
    }: {
      production: Omit<BatchProduction, 'id' | 'created_at'>;
      ingredients: Omit<BatchProductionIngredient, 'id' | 'production_id'>[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: { user: profile } } = await supabase.auth.getUser();
      const producedByEmail = profile?.email || '';

      const { data: productionData, error: productionError } = await supabase
        .from('batch_productions')
        .insert([{
          ...production,
          user_id: user.id,
          produced_by_email: producedByEmail,
        }])
        .select()
        .single();
      
      if (productionError) throw productionError;

      const ingredientsWithProduction = ingredients.map(ing => ({
        ...ing,
        production_id: productionData.id,
      }));

      const { error: ingredientsError } = await supabase
        .from('batch_production_ingredients')
        .insert(ingredientsWithProduction);
      
      if (ingredientsError) throw ingredientsError;

      // Update QR code data with production ID
      const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const qrUrl = `${appUrl}/batch-view/${productionData.id}`;
      
      await supabase
        .from('batch_productions')
        .update({ qr_code_data: qrUrl })
        .eq('id', productionData.id);

      return productionData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-productions'] });
      toast.success("Batch production recorded!");
    },
    onError: (error) => {
      toast.error("Failed to record production: " + error.message);
    },
  });

  const updateProduction = useMutation({
    mutationFn: async ({
      productionId,
      productionUpdates,
      ingredients,
    }: {
      productionId: string;
      productionUpdates: Partial<Omit<BatchProduction, 'id' | 'created_at'>>;
      ingredients: Omit<BatchProductionIngredient, 'id' | 'production_id'>[];
    }) => {
      // Delete old ingredients first
      const { error: deleteError } = await supabase
        .from('batch_production_ingredients')
        .delete()
        .eq('production_id', productionId);

      if (deleteError) throw deleteError;

      // Insert new ingredients
      const ingredientsWithProduction = ingredients.map((ing) => ({
        ...ing,
        production_id: productionId,
      }));

      const { error: insertError } = await supabase
        .from('batch_production_ingredients')
        .insert(ingredientsWithProduction);

      if (insertError) throw insertError;

      // Update production metadata
      const { data, error: updateError } = await supabase
        .from('batch_productions')
        .update(productionUpdates)
        .eq('id', productionId)
        .select()
        .maybeSingle();

      if (updateError) throw updateError;
      return data as BatchProduction | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-productions'] });
      toast.success('Batch production updated!');
    },
    onError: (error: any) => {
      toast.error('Failed to update production: ' + (error.message || 'Unknown error'));
    },
  });

  const deleteProduction = useMutation({
    mutationFn: async (productionId: string) => {
      // Delete ingredients first
      const { error: ingredientsError } = await supabase
        .from('batch_production_ingredients')
        .delete()
        .eq('production_id', productionId);

      if (ingredientsError) throw ingredientsError;

      // Delete production row
      const { error: productionError } = await supabase
        .from('batch_productions')
        .delete()
        .eq('id', productionId);

      if (productionError) throw productionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-productions'] });
      toast.success('Batch production deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete production: ' + (error.message || 'Unknown error'));
    },
  });

  const getProductionIngredients = async (productionId: string) => {
    const { data, error } = await supabase
      .from('batch_production_ingredients')
      .select('*')
      .eq('production_id', productionId);
    
    if (error) throw error;
    return data as BatchProductionIngredient[];
  };

  return {
    productions,
    isLoading,
    createProduction: createProduction.mutate,
    updateProduction: updateProduction.mutate,
    deleteProduction: deleteProduction.mutate,
    getProductionIngredients,
  };
};