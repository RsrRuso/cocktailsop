import { useSimpleQuery } from "@/lib/simpleQuery";
import { supabase } from "@/integrations/supabase/client";

export const useUserBirthday = (userId: string | null | undefined) => {
  return useSimpleQuery({
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
      
      // Check if birthday is today (or within 3 days for testing)
      const isBirthday = 
        birthDate.getMonth() === today.getMonth() && 
        Math.abs(birthDate.getDate() - today.getDate()) <= 3;
      
      return { isBirthday };
    },
    enabled: !!userId,
  });
};
