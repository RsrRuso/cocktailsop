import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MasterSpirit {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  bottle_size_ml: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useMasterSpirits = () => {
  const queryClient = useQueryClient();

  const { data: spirits, isLoading } = useQuery({
    queryKey: ['master-spirits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_spirits')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []) as MasterSpirit[];
    },
  });

  const createSpirit = useMutation({
    mutationFn: async (spirit: Omit<MasterSpirit, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('master_spirits')
        .insert([{ 
          ...spirit,
          user_id: user.id 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Spirit added to master list!");
    },
    onError: (error) => {
      toast.error("Failed to add spirit: " + error.message);
    },
  });

  const updateSpirit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MasterSpirit> }) => {
      const { data, error } = await supabase
        .from('master_spirits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Spirit updated!");
    },
    onError: (error) => {
      toast.error("Failed to update spirit: " + error.message);
    },
  });

  const deleteSpirit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('master_spirits')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      toast.success("Spirit deleted!");
    },
    onError: (error) => {
      toast.error("Failed to delete spirit: " + error.message);
    },
  });

  const calculateBottles = (liters: number, bottleSizeMl: number): number => {
    if (!liters || !bottleSizeMl) return 0;
    const totalMl = liters * 1000;
    return Math.ceil(totalMl / bottleSizeMl);
  };

  return {
    spirits,
    isLoading,
    createSpirit: createSpirit.mutate,
    updateSpirit: updateSpirit.mutate,
    deleteSpirit: deleteSpirit.mutate,
    calculateBottles,
  };
};
