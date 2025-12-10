import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ContentType = 'post' | 'reel' | 'story' | 'event' | 'music_share';

interface LikeConfig {
  table: string;
  idColumn: string;
}

const LIKE_CONFIGS: Record<ContentType, LikeConfig> = {
  post: { table: 'post_likes', idColumn: 'post_id' },
  reel: { table: 'reel_likes', idColumn: 'reel_id' },
  story: { table: 'story_likes', idColumn: 'story_id' },
  event: { table: 'event_likes', idColumn: 'event_id' },
  music_share: { table: 'music_share_likes', idColumn: 'music_share_id' },
};

export const useLike = (
  contentType: ContentType,
  userId: string | undefined,
  onLikeCountChange?: (itemId: string, delta: number) => void
) => {
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const likedRef = useRef<Set<string>>(new Set());
  const config = LIKE_CONFIGS[contentType];

  // Sync ref with state
  useEffect(() => {
    likedRef.current = likedItems;
  }, [likedItems]);

  // Fetch initial liked state
  const fetchLikedItems = useCallback(async () => {
    if (!userId) return;

    try {
      // Use 'as any' to bypass strict typing for dynamic table names
      const { data, error } = await supabase
        .from(config.table as any)
        .select(config.idColumn)
        .eq('user_id', userId);

      if (error) {
        console.error(`[LIKE] Error fetching liked ${contentType}s:`, error);
        return;
      }

      if (data) {
        const ids = (data as any[]).map(item => item[config.idColumn] as string);
        const newSet = new Set(ids);
        setLikedItems(newSet);
        likedRef.current = newSet;
      }
    } catch (err) {
      console.error(`[LIKE] Exception fetching liked ${contentType}s:`, err);
    }
  }, [userId, config.table, config.idColumn, contentType]);

  // Toggle like state
  const toggleLike = useCallback(async (itemId: string) => {
    if (!userId) {
      toast.error('Please login to like');
      return;
    }

    // Prevent rapid duplicate clicks
    if (processingRef.current.has(itemId)) {
      console.log(`[LIKE] Already processing ${itemId}, skipping`);
      return;
    }

    // Use ref for immediate value (avoids stale closure)
    const wasLiked = likedRef.current.has(itemId);

    // Mark as processing
    processingRef.current.add(itemId);

    // Optimistic update - UI changes immediately
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (wasLiked) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      likedRef.current = newSet;
      return newSet;
    });

    // Optimistic count update
    onLikeCountChange?.(itemId, wasLiked ? -1 : 1);

    try {
      if (wasLiked) {
        // Unlike - use 'as any' for dynamic table name
        const { error } = await supabase
          .from(config.table as any)
          .delete()
          .eq(config.idColumn, itemId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Like - use 'as any' for dynamic table name
        const insertData = {
          [config.idColumn]: itemId,
          user_id: userId,
        };

        const { error } = await supabase
          .from(config.table as any)
          .insert(insertData);

        // Ignore duplicate key error (already liked)
        if (error && error.code !== '23505') throw error;
      }
    } catch (error: unknown) {
      console.error(`[LIKE] Error toggling like:`, error);
      toast.error(wasLiked ? 'Failed to unlike' : 'Failed to like');

      // Revert optimistic update on error
      setLikedItems(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        likedRef.current = newSet;
        return newSet;
      });

      // Revert count
      onLikeCountChange?.(itemId, wasLiked ? 1 : -1);
    } finally {
      processingRef.current.delete(itemId);
    }
  }, [userId, config.table, config.idColumn, onLikeCountChange]);

  // Check if item is liked
  const isLiked = useCallback((itemId: string) => likedItems.has(itemId), [likedItems]);

  return { likedItems, isLiked, toggleLike, fetchLikedItems };
};
