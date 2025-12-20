import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  music_url?: string | null;
  music_track_id?: string | null;
  mute_original_audio?: boolean | null;
  is_image_reel?: boolean | null;
  music_tracks?: {
    title: string;
    artist?: string | null;
    preview_url?: string | null;
    original_url?: string | null;
    profiles?: { username: string } | null;
  } | null;
  profiles: any;
}

// Cache for feed data - persisted across navigations (module-level singleton)
let feedCache: { posts: Post[]; reels: Reel[]; timestamp: number; region: string | null } | null = null;
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes for instant loads - aggressive caching
const INITIAL_LIMIT = 6; // Balanced for faster first paint

// Aggressive localStorage cache for instant cold starts
const STORAGE_KEY = 'feed_cache_v2';
const loadFromStorage = (): typeof feedCache => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_TIME) return parsed;
    }
  } catch {}
  return null;
};

const saveToStorage = (cache: typeof feedCache) => {
  try {
    if (cache) localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
};

// Initialize from localStorage on module load
if (!feedCache) feedCache = loadFromStorage();

const hydrateReelsMusicTracks = async (input: Reel[]) => {
  const missingUrls = Array.from(
    new Set(input.filter(r => !r.music_tracks && r.music_url).map(r => r.music_url))
  ) as string[];

  if (missingUrls.length === 0) return input;

  const { data: tracks } = await supabase
    .from('music_tracks')
    .select('title, artist, preview_url, original_url, profiles:uploaded_by(username)')
    .in('original_url', missingUrls);

  const byUrl = new Map((tracks || []).map((t: any) => [t.original_url, t]));

  return input.map(r => {
    if (r.music_tracks) return r;
    if (!r.music_url) return r;
    const found = byUrl.get(r.music_url);
    return found ? ({ ...r, music_tracks: found } as Reel) : r;
  });
};

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
  // INSTANT: Never show loading if we have ANY cache, even if stale
  const [isLoading, setIsLoading] = useState(() => !feedCache && !loadFromStorage());

  const fetchPosts = useCallback(async () => {
    try {
      // Fetch posts WITHOUT expensive profile joins, but include music fields
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, user_id, content, media_urls, like_count, comment_count, view_count, repost_count, save_count, created_at, music_url, music_track_id")
        .order("created_at", { ascending: false })
        .limit(INITIAL_LIMIT);

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
          music_url, music_track_id, mute_original_audio, is_image_reel,
          music_tracks:music_track_id(title, artist, preview_url, original_url, profiles:uploaded_by(username))
        `)
        .order("created_at", { ascending: false })
        .limit(INITIAL_LIMIT);

      if (error) throw error;
      if (!reelsData) return;

      // Fetch profiles separately in ONE query
      const userIds = [...new Set(reelsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, professional_title, badge_level, region')
        .in('id', userIds);

      // Map profiles to reels
      const reelsWithProfiles: Reel[] = (reelsData as any[]).map(reel => ({
        ...reel,
        profiles: profiles?.find(p => p.id === reel.user_id) || null
      }));

      const hydrated = await hydrateReelsMusicTracks(reelsWithProfiles);

      // Filter by region if needed
      const filteredReels = selectedRegion && selectedRegion !== "All"
        ? hydrated.filter(r => r.profiles?.region === selectedRegion || r.profiles?.region === "All")
        : hydrated;

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

      // Hydrate cached reels music labels in background (so "Added Music" becomes the real track title)
      void (async () => {
        try {
          const updated = await hydrateReelsMusicTracks(feedCache!.reels);
          feedCache = { ...feedCache!, reels: updated };
          setReels(updated);
        } catch {
          // ignore
        }
      })();

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
    
    // Persist to localStorage for instant cold starts
    saveToStorage(feedCache);
    
    setIsLoading(false);
  }, [fetchPosts, fetchReels, selectedRegion]);

  useEffect(() => {
    // Only fetch once on mount, not when refreshFeed changes
    refreshFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  // Realtime subscriptions for instant updates when content is published
  const debounceRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const debouncedRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Invalidate cache and force refresh
        feedCache = null;
        refreshFeed(true);
      }, 500); // Small debounce to batch rapid updates
    };

    // Subscribe to new posts
    const postsChannel = supabase
      .channel('feed-posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        debouncedRefresh
      )
      .subscribe();

    // Subscribe to new reels
    const reelsChannel = supabase
      .channel('feed-reels-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reels' },
        debouncedRefresh
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reelsChannel);
    };
  }, [refreshFeed]);

  return { posts, reels, isLoading, refreshFeed, setPosts, setReels };
};
