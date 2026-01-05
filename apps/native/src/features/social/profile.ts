import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export type ProfileRow = {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  professional_title: string | null;
  badge_level: string | null;
  follower_count: number | null;
  following_count: number | null;
  post_count: number | null;
};

export function useMyProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', 'me', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!userId) return null;
      const res = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, professional_title, badge_level, follower_count, following_count, post_count')
        .eq('id', userId)
        .maybeSingle();
      if (res.error) throw res.error;
      return (res.data ?? null) as unknown as ProfileRow | null;
    },
  });
}

export function useMyCounts(userId?: string) {
  return useQuery({
    queryKey: ['profile', 'counts', userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ posts: number; reels: number }> => {
      if (!userId) return { posts: 0, reels: 0 };
      const [postsRes, reelsRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('reels').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (reelsRes.error) throw reelsRes.error;
      return { posts: postsRes.count ?? 0, reels: reelsRes.count ?? 0 };
    },
  });
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ['user-posts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await supabase
        .from('posts')
        .select('id, content, media_urls, created_at, like_count, comment_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(60);
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });
}

export function useUserReels(userId: string) {
  return useQuery({
    queryKey: ['user-reels', userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await supabase
        .from('reels')
        .select('id, video_url, caption, created_at, like_count, comment_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(60);
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });
}

