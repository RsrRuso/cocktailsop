import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  view_count: number;
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

// Cache for feed data
let feedCache: { posts: Post[]; reels: Reel[]; timestamp: number; region: string | null } | null = null;
const CACHE_TIME = 60000; // 1 minute

export const useFeedData = (selectedRegion: string | null) => {
  const [posts, setPosts] = useState<Post[]>(() => {
    // Initialize from cache if valid
    if (feedCache && Date.now() - feedCache.timestamp < CACHE_TIME && feedCache.region === selectedRegion) {
      return feedCache.posts;
    }
    return [];
  });
  const [reels, setReels] = useState<Reel[]>(() => {
    if (feedCache && Date.now() - feedCache.timestamp < CACHE_TIME && feedCache.region === selectedRegion) {
      return feedCache.reels;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      // Fetch posts WITHOUT expensive profile joins
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, user_id, content, media_urls, like_count, comment_count, view_count, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!postsData) return;

      // Fetch profiles separately in ONE query
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, professional_title, badge_level, region')
        .in('id', userIds);

      // Map profiles to posts
      const postsWithProfiles = postsData.map(post => ({
        ...post,
        profiles: profiles?.find(p => p.id === post.user_id) || null
      }));

      // Filter by region if needed
      const filteredPosts = selectedRegion && selectedRegion !== "All"
        ? postsWithProfiles.filter(p => p.profiles?.region === selectedRegion || p.profiles?.region === "All")
        : postsWithProfiles;

      setPosts(filteredPosts);
      return filteredPosts;
    } catch (error) {
      console.error('Fetch posts failed');
      return [];
    }
  }, [selectedRegion]);

  const fetchReels = useCallback(async () => {
    try {
      // Fetch reels WITHOUT expensive profile joins
      const { data: reelsData, error } = await supabase
        .from("reels")
        .select("id, user_id, video_url, caption, like_count, comment_count, view_count, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!reelsData) return;

      // Fetch profiles separately in ONE query
      const userIds = [...new Set(reelsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, professional_title, badge_level, region')
        .in('id', userIds);

      // Map profiles to reels
      const reelsWithProfiles = reelsData.map(reel => ({
        ...reel,
        profiles: profiles?.find(p => p.id === reel.user_id) || null
      }));

      // Filter by region if needed
      const filteredReels = selectedRegion && selectedRegion !== "All"
        ? reelsWithProfiles.filter(r => r.profiles?.region === selectedRegion || r.profiles?.region === "All")
        : reelsWithProfiles;

      setReels(filteredReels);
      return filteredReels;
    } catch (error) {
      console.error('Fetch reels failed');
      return [];
    }
  }, [selectedRegion]);

  const refreshFeed = useCallback(async () => {
    // Check cache first
    if (feedCache && Date.now() - feedCache.timestamp < CACHE_TIME && feedCache.region === selectedRegion) {
      setPosts(feedCache.posts);
      setReels(feedCache.reels);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [fetchedPosts, fetchedReels] = await Promise.all([fetchPosts(), fetchReels()]);
    
    // Update cache
    feedCache = {
      posts: fetchedPosts || [],
      reels: fetchedReels || [],
      timestamp: Date.now(),
      region: selectedRegion
    };
    
    setIsLoading(false);
  }, [fetchPosts, fetchReels, selectedRegion]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  return { posts, reels, isLoading, refreshFeed, setPosts, setReels };
};
