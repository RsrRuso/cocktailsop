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

// Prefetch home feed - prewarms the feed cache
export const prefetchHomeFeed = async (region: string | null) => {
  // Also prewarm the useFeedData cache by fetching directly
  try {
    const [postsRes, reelsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('id, user_id, content, media_urls, like_count, comment_count, view_count, repost_count, save_count, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('reels')
        .select('id, user_id, video_url, caption, like_count, comment_count, view_count, repost_count, save_count, created_at, music_url, music_track_id, mute_original_audio')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (postsRes.data && reelsRes.data) {
      // Get unique user IDs
      const userIds = [...new Set([...postsRes.data.map(p => p.user_id), ...reelsRes.data.map(r => r.user_id)])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, professional_title, badge_level, region')
        .in('id', userIds);

      // Warm the module-level cache that useFeedData uses
      const postsWithProfiles = postsRes.data.map(post => ({
        ...post,
        profiles: profiles?.find(p => p.id === post.user_id) || null
      }));
      
      const reelsWithProfiles = reelsRes.data.map(reel => ({
        ...reel,
        profiles: profiles?.find(p => p.id === reel.user_id) || null
      }));

      // Store in window for useFeedData to pick up
      (window as any).__feedPrefetch = {
        posts: postsWithProfiles,
        reels: reelsWithProfiles,
        timestamp: Date.now(),
        region
      };
    }
  } catch (e) {
    console.error('Feed prefetch failed');
  }
};
