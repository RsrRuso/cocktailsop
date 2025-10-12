import { queryClient } from './queryClient';
import { supabase } from '@/integrations/supabase/client';
import { deduplicateRequest } from './requestDeduplication';

// Prefetch story data for user
export const prefetchStories = async (userId: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['stories', userId],
    queryFn: () => deduplicateRequest(`stories-${userId}`, async () => {
      const { data } = await supabase
        .from('stories')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
      
      // Preload first story media for instant display
      if (data && data[0]) {
        const firstStory = data[0];
        firstStory.media_urls?.forEach((url: string, index: number) => {
          const mediaType = firstStory.media_types?.[index];
          if (!mediaType || mediaType.startsWith('image')) {
            const img = new Image();
            img.src = url;
          }
        });
      }
      
      return data || [];
    }),
    staleTime: 5 * 60 * 1000,
  });
};

// Prefetch profile data before navigation
export const prefetchProfile = async (userId: string) => {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['profile', userId],
      queryFn: () => deduplicateRequest(`profile-${userId}`, async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        return data;
      }),
      staleTime: 2 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['posts', userId],
      queryFn: () => deduplicateRequest(`posts-${userId}`, async () => {
        const { data } = await supabase
          .from('posts')
          .select('id, content, media_urls, like_count, comment_count, view_count, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(12);
        return data || [];
      }),
      staleTime: 2 * 60 * 1000,
    }),
  ]);
};

// Prefetch home feed
export const prefetchHomeFeed = async (region: string | null) => {
  await queryClient.prefetchQuery({
    queryKey: ['feed', region],
    queryFn: () => deduplicateRequest(`feed-${region}`, async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, full_name, avatar_url, professional_title, badge_level, region)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (region && region !== 'All') {
        query = query.eq('profiles.region', region);
      }

      const { data } = await query;
      return data || [];
    }),
    staleTime: 2 * 60 * 1000,
  });
};
