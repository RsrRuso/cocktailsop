import { useSimpleQuery } from "@/lib/simpleQuery";
import { supabase } from "@/integrations/supabase/client";

export const useUserStatus = (userId: string | null | undefined) => {
  return useSimpleQuery({
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('user_status')
        .select('*, reaction_count, reply_count')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (error && (error as any).code !== 'PGRST116') {
        console.error('Error fetching status:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!userId,
  });
};
