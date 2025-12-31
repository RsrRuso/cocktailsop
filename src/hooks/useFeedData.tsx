import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { preloadFeedAvatars } from '@/lib/avatarCache';

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
const CACHE_TIME = 60 * 60 * 1000; // 1 hour for instant loads - very aggressive caching
const INITIAL_LIMIT = 8; // Slightly more for better first paint experience

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
  // Initialize from prefetch or localStorage immediately
  initFromPrefetch();
  const storedCache = loadFromStorage();
  
  // Use ANY available cache for instant display (even if region mismatches - filter later)
  const initialPosts = feedCache?.posts || storedCache?.posts || [];
  const initialReels = feedCache?.reels || storedCache?.reels || [];
  
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [reels, setReels] = useState<Reel[]>(initialReels);
  // INSTANT: Never show loading if we have ANY cached data
  const [isLoading, setIsLoading] = useState(initialPosts.length === 0 && initialReels.length === 0);

  // Fetch posts and reels together for speed
  const fetchFeed = useCallback(async () => {
    if (!navigator.onLine) {
      return { posts: posts.length > 0 ? posts : [], reels: reels.length > 0 ? reels : [] };
    }
    
    try {
      // Fetch posts and reels in parallel
      const [postsResult, reelsResult] = await Promise.all([
        supabase
          .from("posts")
          .select("id, user_id, content, media_urls, like_count, comment_count, view_count, repost_count, save_count, created_at, music_url, music_track_id")
          .order("created_at", { ascending: false })
          .limit(INITIAL_LIMIT),
        supabase
          .from("reels")
          .select(`id, user_id, video_url, caption, like_count, comment_count, view_count, repost_count, save_count, created_at, music_url, music_track_id, mute_original_audio, is_image_reel, music_tracks:music_track_id(title, artist, preview_url, original_url, profiles:uploaded_by(username))`)
          .order("created_at", { ascending: false })
          .limit(INITIAL_LIMIT)
      ]);

      const postsData = postsResult.data || [];
      const reelsData = reelsResult.data || [];

      // Collect all unique user IDs from both posts and reels
      const allUserIds = [...new Set([
        ...postsData.map(p => p.user_id),
        ...reelsData.map(r => r.user_id)
      ])];

      // Single profiles fetch for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, professional_title, badge_level, region')
        .in('id', allUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map profiles to posts
      const postsWithProfiles = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null
      }));

      // Map profiles to reels
      const reelsWithProfiles: Reel[] = (reelsData as any[]).map(reel => ({
        ...reel,
        profiles: profilesMap.get(reel.user_id) || null
      }));

      // Preload avatars
      preloadFeedAvatars([...postsWithProfiles, ...reelsWithProfiles]);

      // Hydrate music tracks (non-blocking)
      const hydratedReels = await hydrateReelsMusicTracks(reelsWithProfiles);

      // Filter by region
      const filteredPosts = selectedRegion && selectedRegion !== "All"
        ? postsWithProfiles.filter(p => p.profiles?.region === selectedRegion || p.profiles?.region === "All")
        : postsWithProfiles;

      const filteredReels = selectedRegion && selectedRegion !== "All"
        ? hydratedReels.filter(r => r.profiles?.region === selectedRegion || r.profiles?.region === "All")
        : hydratedReels;

      setPosts(filteredPosts);
      setReels(filteredReels);
      
      return { posts: filteredPosts, reels: filteredReels };
    } catch (error) {
      return { posts: posts.length > 0 ? posts : [], reels: reels.length > 0 ? reels : [] };
    }
  }, [selectedRegion, posts, reels]);

  const refreshFeed = useCallback(async (forceRefresh: boolean = false) => {
    // Instant display from cache - skip network completely if valid
    if (!forceRefresh && isCacheValid(selectedRegion)) {
      if (posts.length === 0) setPosts(feedCache!.posts);
      if (reels.length === 0) setReels(feedCache!.reels);
      setIsLoading(false);

      // Hydrate cached reels music labels in background
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
    
    const result = await fetchFeed();
    
    // Update cache
    feedCache = {
      posts: result.posts || [],
      reels: result.reels || [],
      timestamp: Date.now(),
      region: selectedRegion
    };
    
    // Persist to localStorage for instant cold starts
    saveToStorage(feedCache);
    
    setIsLoading(false);
  }, [fetchFeed, selectedRegion]);

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
