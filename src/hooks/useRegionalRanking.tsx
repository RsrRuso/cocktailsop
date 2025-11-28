import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { deduplicateRequest } from '@/lib/requestDeduplication';

interface RegionalRankingData {
  maxScore: number;
  userRank: number;
  totalUsers: number;
}

export const useRegionalRanking = (region: string | null, userScore: number) => {
  return useQuery({
    queryKey: ['regional-ranking', region, userScore],
    queryFn: async (): Promise<RegionalRankingData | null> => {
      if (!region) return null;

      const queryKey = `regional-ranking-${region}`;
      
      return deduplicateRequest(queryKey, async () => {
        let query = supabase
          .from('profiles')
          .select('career_score');
        
        if (region !== 'All') {
          query = query.eq('region', region);
        }
        
        const { data: regionalProfiles, error } = await query
          .order('career_score', { ascending: false });

        if (error || !regionalProfiles || regionalProfiles.length === 0) {
          return null;
        }

        const scores = regionalProfiles.map(p => p.career_score || 0);
        const maxScore = Math.max(...scores);
        const userRank = scores.findIndex(s => s <= userScore) + 1;
        
        return {
          maxScore,
          userRank,
          totalUsers: regionalProfiles.length
        };
      });
    },
    enabled: !!region && userScore > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - regional rankings don't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};
