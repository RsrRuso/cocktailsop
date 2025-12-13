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
  repost_count: number;
  save_count: number;
  created_at: string;
  music_url?: string | null;
  music_track_id?: string | null;
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
  repost_count: number;
  save_count: number;
  created_at: string;
  profiles: any;
}

// Cache for feed data - persisted across navigations (module-level singleton)
let feedCache: { posts: Post[]; reels: Reel[]; timestamp: number; region: string | null } | null = null;
const CACHE_TIME = 300000; // 5 minutes for instant loads

// Initialize from prefetch if available
const initFromPrefetch = () => {
  const prefetch = (window as any).__feedPrefetch;
  if (prefetch && !feedCache) {
    feedCache = prefetch;
    delete (window as any).__feedPrefetch;
  }
};

// Check cache validity helper
const isCacheValid = (region: string | null) => {
  initFromPrefetch(); // Check for prefetched data first
  return feedCache && 
    Date.now() - feedCache.timestamp < CACHE_TIME && 
    feedCache.region === region;
};

export const useFeedData = (selectedRegion: string | null) => {
  // Initialize from cache immediately for instant display - compute once
  const hasValidCache = useMemo(() => isCacheValid(selectedRegion), [selectedRegion]);
  
  const [posts, setPosts] = useState<Post[]>(() => hasValidCache ? feedCache!.posts : []);
  const [reels, setReels] = useState<Reel[]>(() => hasValidCache ? feedCache!.reels : []);
  const [isLoading, setIsLoading] = useState(!hasValidCache); // Instant if cached

  const fetchPosts = useCallback(async () => {
    try {
      // Fetch posts WITHOUT expensive profile joins, but include music fields
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, user_id, content, media_urls, like_count, comment_count, view_count, repost_count, save_count, created_at, music_url, music_track_id")
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
      // Fetch reels WITH music track info
      const { data: reelsData, error } = await supabase
        .from("reels")
        .select(`
          id, user_id, video_url, caption, like_count, comment_count, view_count, repost_count, save_count, created_at,
          music_url, music_track_id, mute_original_audio,
          music_tracks:music_track_id(title, preview_url, profiles:uploaded_by(username))
        `)
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

  const refreshFeed = useCallback(async (forceRefresh: boolean = false) => {
    // Instant display from cache - skip network completely if valid
    if (!forceRefresh && isCacheValid(selectedRegion)) {
      if (posts.length === 0) setPosts(feedCache!.posts);
      if (reels.length === 0) setReels(feedCache!.reels);
      setIsLoading(false);
      return;
    }

    // Only show loading if no cached data to display
    if (!feedCache) setIsLoading(true);
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
    // Only fetch once on mount, not when refreshFeed changes
    refreshFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  return { posts, reels, isLoading, refreshFeed, setPosts, setReels };
};
