import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  profiles: any;
}

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  profiles: any;
}

export const useFeedData = (selectedRegion: string | null) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const requestCacheRef = useState(new Map<string, Promise<any>>())[0];

  const fetchPosts = useCallback(async () => {
    const cacheKey = `posts-${selectedRegion || 'all'}`;
    
    // Deduplicate concurrent requests
    if (requestCacheRef.has(cacheKey)) {
      return requestCacheRef.get(cacheKey);
    }

    const request = (async () => {
      try {
        let query = supabase
          .from("posts")
          .select("id, user_id, content, media_urls, like_count, comment_count, created_at, profiles(username, full_name, avatar_url, professional_title, badge_level, region)")
          .order("created_at", { ascending: false })
          .limit(10);

        if (selectedRegion && selectedRegion !== "All") {
          query = query.eq("profiles.region", selectedRegion);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (data) {
          setPosts(data);
          import('@/lib/indexedDBCache').then(({ setCache }) => {
            setCache('posts', 'home', data);
          });
        }
      } catch (error) {
        console.error('Fetch posts failed');
      } finally {
        requestCacheRef.delete(cacheKey);
      }
    })();

    requestCacheRef.set(cacheKey, request);
    return request;
  }, [selectedRegion]);

  const fetchReels = useCallback(async () => {
    const cacheKey = `reels-${selectedRegion || 'all'}`;
    
    if (requestCacheRef.has(cacheKey)) {
      return requestCacheRef.get(cacheKey);
    }

    const request = (async () => {
      try {
        let query = supabase
          .from("reels")
          .select("id, user_id, video_url, caption, like_count, comment_count, view_count, created_at, profiles(username, full_name, avatar_url, professional_title, badge_level, region)")
          .order("created_at", { ascending: false })
          .limit(10);

        if (selectedRegion && selectedRegion !== "All") {
          query = query.eq("profiles.region", selectedRegion);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (data) {
          setReels(data);
          import('@/lib/indexedDBCache').then(({ setCache }) => {
            setCache('reels', 'home', data);
          });
        }
      } catch (error) {
        console.error('Fetch reels failed');
      } finally {
        requestCacheRef.delete(cacheKey);
      }
    })();

    requestCacheRef.set(cacheKey, request);
    return request;
  }, [selectedRegion]);

  const refreshFeed = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchPosts(), fetchReels()]);
    setIsLoading(false);
  }, [fetchPosts, fetchReels]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  return { posts, reels, isLoading, refreshFeed, setPosts, setReels };
};
