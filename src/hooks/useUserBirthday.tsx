import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserBirthday = (userId: string | null | undefined) => {
  return useQuery({
    queryKey: ['user-birthday', userId],
    queryFn: async () => {
      if (!userId) return { isBirthday: false };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', userId)
        .maybeSingle();
      
      if (error || !data?.date_of_birth) {
        return { isBirthday: false };
      }
  
      const birthDate = new Date(data.date_of_birth);
      const today = new Date();
      
      const isBirthday = 
        birthDate.getMonth() === today.getMonth() && 
        Math.abs(birthDate.getDate() - today.getDate()) <= 3;
      
      return { isBirthday };
    },
    enabled: !!userId && userId.length > 10, // Only run for valid UUIDs
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: false, // Don't retry failed requests
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
