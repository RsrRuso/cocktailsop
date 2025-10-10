import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useFeed = () => {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const [postsRes, reelsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*, profiles(username, full_name, avatar_url, professional_title, badge_level, region)')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('reels')
          .select('*, profiles(username, full_name, avatar_url, professional_title, badge_level, region)')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      const posts = postsRes.data || [];
      const reels = reelsRes.data || [];

      return {
        posts,
        reels,
        feed: [
          ...posts.map(p => ({ ...p, type: 'post' as const })),
          ...reels.map(r => ({ ...r, type: 'reel' as const, content: r.caption, media_urls: [r.video_url] }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStories = () => {
  return useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stories')
        .select('*, profiles(username, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useLikes = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['likes', userId],
    queryFn: async () => {
      if (!userId) return { posts: new Set(), reels: new Set() };
      
      const [postLikes, reelLikes] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', userId),
        supabase.from('reel_likes').select('reel_id').eq('user_id', userId),
      ]);

      return {
        posts: new Set(postLikes.data?.map(l => l.post_id) || []),
        reels: new Set(reelLikes.data?.map(l => l.reel_id) || []),
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
};
