import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Story {
  id: string;
  user_id: string;
  media_urls: string[];
  media_types: string[];
  profiles: {
    username: string;
    avatar_url: string | null;
    date_of_birth?: string | null;
  };
}

// Module-level cache for instant loading
let storiesCache: {
  data: Story[];
  timestamp: number;
  userHasStory: boolean;
} | null = null;

const CACHE_TIME = 2 * 60 * 1000; // 2 minutes

// Preload media for instant viewing
const preloadStoryMedia = (stories: Story[]) => {
  stories.slice(0, 5).forEach(story => {
    story.media_urls?.slice(0, 2).forEach((url, idx) => {
      const type = story.media_types?.[idx] || 'image';
      if (type.startsWith('video')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;
      } else {
        const img = new Image();
        img.src = url;
      }
    });
  });
};

export const useStoriesData = (userId?: string) => {
  const [stories, setStories] = useState<Story[]>(storiesCache?.data || []);
  const [isLoading, setIsLoading] = useState(!storiesCache);
  const [userHasStory, setUserHasStory] = useState(storiesCache?.userHasStory || false);
  const isMounted = useRef(true);

  const fetchStories = useCallback(async (skipCache = false) => {
    // Use cache if valid
    if (!skipCache && storiesCache && Date.now() - storiesCache.timestamp < CACHE_TIME) {
      setStories(storiesCache.data);
      setUserHasStory(storiesCache.userHasStory);
      setIsLoading(false);
      return;
    }

    try {
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_urls,
          media_types,
          profiles (username, avatar_url, date_of_birth)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group stories by user (only show one story circle per user)
      const userStoriesMap = new Map<string, Story>();
      storiesData?.forEach(story => {
        if (!userStoriesMap.has(story.user_id)) {
          userStoriesMap.set(story.user_id, story as Story);
        }
      });

      const uniqueStories = Array.from(userStoriesMap.values());
      
      // Check if current user has story
      const hasStory = userId ? uniqueStories.some(s => s.user_id === userId) : false;

      // Update cache
      storiesCache = {
        data: uniqueStories,
        timestamp: Date.now(),
        userHasStory: hasStory
      };

      // Preload media
      preloadStoryMedia(uniqueStories);

      if (isMounted.current) {
        setStories(uniqueStories);
        setUserHasStory(hasStory);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      if (isMounted.current) setIsLoading(false);
    }
  }, [userId]);

  const refreshStories = useCallback(() => {
    return fetchStories(true);
  }, [fetchStories]);

  // Invalidate cache (call when new story is created)
  const invalidateCache = useCallback(() => {
    storiesCache = null;
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchStories();
    return () => { isMounted.current = false; };
  }, [fetchStories]);

  return { stories, isLoading, userHasStory, refreshStories, invalidateCache };
};

// Prefetch stories for instant loading
export const prefetchStoriesData = async () => {
  if (storiesCache && Date.now() - storiesCache.timestamp < CACHE_TIME) return;

  try {
    const { data } = await supabase
      .from('stories')
      .select(`id, user_id, media_urls, media_types, profiles (username, avatar_url, date_of_birth)`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      const userStoriesMap = new Map<string, Story>();
      data.forEach(story => {
        if (!userStoriesMap.has(story.user_id)) {
          userStoriesMap.set(story.user_id, story as Story);
        }
      });
      
      const uniqueStories = Array.from(userStoriesMap.values());
      storiesCache = { data: uniqueStories, timestamp: Date.now(), userHasStory: false };
      preloadStoryMedia(uniqueStories);
    }
  } catch (e) {
    console.error('Stories prefetch failed');
  }
};
