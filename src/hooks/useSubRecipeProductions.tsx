import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubRecipeProduction {
  id: string;
  sub_recipe_id: string;
  quantity_produced_ml: number;
  produced_by_user_id?: string;
  produced_by_name?: string;
  production_date: string;
  expiration_date?: string;
  notes?: string;
  group_id?: string;
  created_at: string;
}

export const useSubRecipeProductions = (subRecipeId?: string) => {
  const queryClient = useQueryClient();

  // Fetch productions for a specific sub-recipe or all
  const { data: productions, isLoading } = useQuery({
    queryKey: ['sub-recipe-productions', subRecipeId],
    queryFn: async (): Promise<SubRecipeProduction[]> => {
      let query = supabase
        .from('sub_recipe_productions')
        .select('*')
        .order('production_date', { ascending: false });

      if (subRecipeId) {
        query = query.eq('sub_recipe_id', subRecipeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SubRecipeProduction[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Create new production batch
  const createProduction = useMutation({
    mutationFn: async (production: Omit<SubRecipeProduction, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get producer name if not provided
      let producerName = production.produced_by_name;
      if (!producerName) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          producerName = profile.full_name || profile.username || user.email?.split('@')[0] || 'Unknown';
        }
      }

      const { data, error } = await supabase
        .from('sub_recipe_productions')
        .insert({
          sub_recipe_id: production.sub_recipe_id,
          quantity_produced_ml: production.quantity_produced_ml,
          produced_by_user_id: user.id,
          produced_by_name: producerName,
          production_date: production.production_date || new Date().toISOString(),
          expiration_date: production.expiration_date || null,
          notes: production.notes || null,
          group_id: production.group_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipe-productions'] });
      toast.success("Production batch recorded!");
    },
    onError: (error) => {
      toast.error("Failed to record production: " + error.message);
    },
  });

  // Update production
  const updateProduction = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubRecipeProduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('sub_recipe_productions')
        .update({
          quantity_produced_ml: updates.quantity_produced_ml,
          expiration_date: updates.expiration_date || null,
          notes: updates.notes || null,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipe-productions'] });
      toast.success("Production batch updated!");
    },
    onError: (error) => {
      toast.error("Failed to update production: " + error.message);
    },
  });

  // Delete production
  const deleteProduction = useMutation({
    mutationFn: async (productionId: string) => {
      const { error } = await supabase
        .from('sub_recipe_productions')
        .delete()
        .eq('id', productionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-recipe-productions'] });
      toast.success("Production batch deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete production: " + error.message);
    },
  });

  // Get total produced for a sub-recipe (sum of all productions)
  const getTotalProduced = (recipeId: string) => {
    return (productions || [])
      .filter(p => p.sub_recipe_id === recipeId)
      .reduce((sum, p) => sum + Number(p.quantity_produced_ml), 0);
  };

  // Get productions grouped by sub-recipe with aggregated totals
  const getProductionsByRecipe = () => {
    const grouped: Record<string, { 
      totalProduced: number; 
      productions: SubRecipeProduction[];
      latestExpiration?: string;
      earliestExpiration?: string;
    }> = {};

    (productions || []).forEach(p => {
      if (!grouped[p.sub_recipe_id]) {
        grouped[p.sub_recipe_id] = { totalProduced: 0, productions: [] };
      }
      grouped[p.sub_recipe_id].totalProduced += Number(p.quantity_produced_ml);
      grouped[p.sub_recipe_id].productions.push(p);
      
      // Track expiration dates
      if (p.expiration_date) {
        if (!grouped[p.sub_recipe_id].earliestExpiration || 
            p.expiration_date < grouped[p.sub_recipe_id].earliestExpiration!) {
          grouped[p.sub_recipe_id].earliestExpiration = p.expiration_date;
        }
        if (!grouped[p.sub_recipe_id].latestExpiration || 
            p.expiration_date > grouped[p.sub_recipe_id].latestExpiration!) {
          grouped[p.sub_recipe_id].latestExpiration = p.expiration_date;
        }
      }
    });

    return grouped;
  };

  // Check if any production is expired or expiring soon
  const getExpirationStatus = (recipeId: string) => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    const recipeProductions = (productions || []).filter(p => p.sub_recipe_id === recipeId && p.expiration_date);
    
    const expired = recipeProductions.some(p => new Date(p.expiration_date!) < now);
    const expiringSoon = recipeProductions.some(p => {
      const expDate = new Date(p.expiration_date!);
      return expDate >= now && expDate <= threeDaysFromNow;
    });

    if (expired) return { status: 'expired', color: 'text-destructive', bg: 'bg-destructive/10' };
    if (expiringSoon) return { status: 'expiring-soon', color: 'text-orange-500', bg: 'bg-orange-500/10' };
    return { status: 'fresh', color: 'text-green-500', bg: 'bg-green-500/10' };
  };

  return {
    productions,
    isLoading,
    createProduction: createProduction.mutateAsync ? 
      (data: Omit<SubRecipeProduction, 'id' | 'created_at'>, options?: { onSuccess?: (data: any) => void }) => {
        if (options?.onSuccess) {
          createProduction.mutateAsync(data).then(options.onSuccess);
        } else {
          createProduction.mutate(data);
        }
      } : createProduction.mutate,
    updateProduction: updateProduction.mutate,
    deleteProduction: deleteProduction.mutate,
    getTotalProduced,
    getProductionsByRecipe,
    getExpirationStatus,
  };
};
