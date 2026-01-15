import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchProductionLoss {
  id: string;
  production_id: string;
  ingredient_name: string;
  loss_amount_ml: number;
  loss_reason: string | null;
  notes: string | null;
  recorded_by_user_id: string | null;
  recorded_by_name: string | null;
  created_at: string;
}

export const LOSS_REASONS = [
  { value: 'spillage', label: 'Spillage' },
  { value: 'evaporation', label: 'Evaporation' },
  { value: 'measurement_error', label: 'Measurement Error' },
  { value: 'equipment_residue', label: 'Equipment Residue' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'overpouring', label: 'Over-pouring' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
] as const;

export const useBatchProductionLosses = (productionId?: string) => {
  const queryClient = useQueryClient();

  // Fetch losses for a specific production or all
  const { data: losses, isLoading } = useQuery({
    queryKey: ['batch-production-losses', productionId],
    queryFn: async (): Promise<BatchProductionLoss[]> => {
      let query = supabase
        .from('batch_production_losses')
        .select('*')
        .order('created_at', { ascending: false });

      if (productionId) {
        query = query.eq('production_id', productionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BatchProductionLoss[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch all losses for discrepancies page
  const { data: allLosses, isLoading: isLoadingAll } = useQuery({
    queryKey: ['all-batch-production-losses'],
    queryFn: async (): Promise<(BatchProductionLoss & { 
      production?: { batch_name: string; recipe_id: string; production_date: string } 
    })[]> => {
      const { data, error } = await supabase
        .from('batch_production_losses')
        .select(`
          *,
          production:batch_productions(batch_name, recipe_id, production_date)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
    enabled: !productionId, // Only fetch all when no specific productionId
    staleTime: 2 * 60 * 1000,
  });

  // Record a new loss
  const recordLoss = useMutation({
    mutationFn: async (loss: {
      production_id: string;
      ingredient_name: string;
      loss_amount_ml: number;
      loss_reason?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle();

      const recordedByName = profile?.full_name || profile?.username || user.email?.split('@')[0] || 'Unknown';

      const { data, error } = await supabase
        .from('batch_production_losses')
        .insert({
          production_id: loss.production_id,
          ingredient_name: loss.ingredient_name,
          loss_amount_ml: loss.loss_amount_ml,
          loss_reason: loss.loss_reason || null,
          notes: loss.notes || null,
          recorded_by_user_id: user.id,
          recorded_by_name: recordedByName,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-production-losses'] });
      queryClient.invalidateQueries({ queryKey: ['all-batch-production-losses'] });
      toast.success("Loss recorded successfully");
    },
    onError: (error) => {
      toast.error("Failed to record loss: " + error.message);
    },
  });

  // Delete a loss
  const deleteLoss = useMutation({
    mutationFn: async (lossId: string) => {
      const { error } = await supabase
        .from('batch_production_losses')
        .delete()
        .eq('id', lossId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-production-losses'] });
      queryClient.invalidateQueries({ queryKey: ['all-batch-production-losses'] });
      toast.success("Loss deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  // Get total loss for a production
  const getTotalLoss = (prodId: string) => {
    return (losses || [])
      .filter(l => l.production_id === prodId)
      .reduce((sum, l) => sum + Number(l.loss_amount_ml), 0);
  };

  // Get losses grouped by ingredient
  const getLossesByIngredient = () => {
    const grouped: Record<string, { totalLoss: number; losses: BatchProductionLoss[] }> = {};
    
    (allLosses || losses || []).forEach(l => {
      const key = l.ingredient_name.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = { totalLoss: 0, losses: [] };
      }
      grouped[key].totalLoss += Number(l.loss_amount_ml);
      grouped[key].losses.push(l);
    });

    return grouped;
  };

  return {
    losses,
    allLosses,
    isLoading,
    isLoadingAll,
    recordLoss: recordLoss.mutate,
    deleteLoss: deleteLoss.mutate,
    getTotalLoss,
    getLossesByIngredient,
    isRecording: recordLoss.isPending,
  };
};
