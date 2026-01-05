import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { FeedItem, PostLite, ReelLite } from './types';

async function fetchPosts(limit: number): Promise<PostLite[]> {
  // Try joined query first (preferred). If relationships aren’t configured, fallback to non-joined.
  const joined = await supabase
    .from('posts')
    .select(
      'id, user_id, content, media_urls, like_count, comment_count, created_at, profiles:profiles (id, username, full_name, avatar_url, professional_title, badge_level, region)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!joined.error && joined.data) return joined.data as unknown as PostLite[];

  const plain = await supabase
    .from('posts')
    .select('id, user_id, content, media_urls, like_count, comment_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (plain.error) throw plain.error;
  return (plain.data ?? []) as unknown as PostLite[];
}

async function fetchReels(limit: number): Promise<ReelLite[]> {
  const joined = await supabase
    .from('reels')
    .select(
      'id, user_id, video_url, caption, like_count, comment_count, view_count, created_at, profiles:profiles (id, username, full_name, avatar_url, professional_title, badge_level, region)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!joined.error && joined.data) return joined.data as unknown as ReelLite[];

  const plain = await supabase
    .from('reels')
    .select('id, user_id, video_url, caption, like_count, comment_count, view_count, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (plain.error) throw plain.error;
  return (plain.data ?? []) as unknown as ReelLite[];
}

export function useHomeFeed({ limit = 30 }: { limit?: number } = {}) {
  return useQuery({
    queryKey: ['home-feed', limit],
    queryFn: async (): Promise<FeedItem[]> => {
      const [posts, reels] = await Promise.all([fetchPosts(limit), fetchReels(Math.floor(limit / 2))]);
      const feed: FeedItem[] = [
        ...posts.map((p) => ({ ...p, type: 'post' as const })),
        ...reels.map((r) => ({
          ...r,
          type: 'reel' as const,
          media_urls: r.video_url ? [r.video_url] : [],
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return feed;
    },
  });
}

export function useExploreTop() {
  return useQuery({
    queryKey: ['explore-top'],
    queryFn: async () => {
      const [postsRes, profilesRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id, content, media_urls, like_count, comment_count, created_at')
          .order('like_count', { ascending: false })
          .limit(24),
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, follower_count')
          .order('follower_count', { ascending: false })
          .limit(30),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      return { posts: postsRes.data ?? [], profiles: profilesRes.data ?? [] };
    },
  });
}

