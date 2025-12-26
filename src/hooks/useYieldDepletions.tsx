import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface YieldIngredientBreakdown {
  name: string;
  amount: number;
  unit: string;
}

export interface YieldDepletion {
  id: string;
  master_spirit_id: string;
  production_id?: string;
  amount_used_ml: number;
  ingredient_breakdown: YieldIngredientBreakdown[];
  depleted_by_user_id?: string;
  depleted_at: string;
  notes?: string;
  user_id: string;
}

export const useYieldDepletions = () => {
  const queryClient = useQueryClient();

  // Fetch all yield depletions
  const { data: depletions, isLoading } = useQuery({
    queryKey: ['yield-depletions'],
    queryFn: async (): Promise<YieldDepletion[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('yield_depletions')
        .select('*')
        .eq('user_id', user.id)
        .order('depleted_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        ingredient_breakdown: (d.ingredient_breakdown as YieldIngredientBreakdown[]) || []
      }));
    },
  });

  // Get yield products from master spirits (source_type = 'yield_calculator')
  const { data: yieldProducts } = useQuery({
    queryKey: ['yield-products'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('master_spirits')
        .select('*')
        .eq('user_id', user.id)
        .eq('source_type', 'yield_calculator')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Record yield product usage/depletion
  const recordDepletion = useMutation({
    mutationFn: async ({ 
      masterSpiritId, 
      masterSpiritName,
      amountUsedMl, 
      productionId,
      ingredientBreakdown,
      notes 
    }: { 
      masterSpiritId: string; 
      masterSpiritName?: string;
      amountUsedMl: number;
      productionId?: string;
      ingredientBreakdown?: YieldIngredientBreakdown[];
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('yield_depletions')
        .insert({
          master_spirit_id: masterSpiritId,
          production_id: productionId || null,
          amount_used_ml: amountUsedMl,
          ingredient_breakdown: ingredientBreakdown ? JSON.parse(JSON.stringify(ingredientBreakdown)) : [],
          depleted_by_user_id: user.id,
          notes: notes || null,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield-depletions'] });
      toast.success("Yield product depletion recorded!");
    },
    onError: (error) => {
      toast.error("Failed to record depletion: " + error.message);
    },
  });

  // Get total depletion for a yield product
  const getTotalDepletion = (masterSpiritId: string) => {
    return (depletions || [])
      .filter(d => d.master_spirit_id === masterSpiritId)
      .reduce((sum, d) => sum + Number(d.amount_used_ml), 0);
  };

  // Get yield product by name from master spirits
  const getYieldProductByName = (name: string) => {
    return yieldProducts?.find(p => p.name.toLowerCase() === name.toLowerCase());
  };

  // Get all depletions for a specific production
  const getDepletionsForProduction = (productionId: string) => {
    return (depletions || []).filter(d => d.production_id === productionId);
  };

  return {
    depletions,
    yieldProducts,
    isLoading,
    recordDepletion: recordDepletion.mutate,
    getTotalDepletion,
    getYieldProductByName,
    getDepletionsForProduction,
  };
};