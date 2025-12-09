import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOptimisticLike = (
  itemType: 'post' | 'reel',
  currentUserId: string | undefined
) => {
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const likedItemsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  likedItemsRef.current = likedItems;

  const fetchLikedItems = useCallback(async () => {
    if (!currentUserId) return;

    if (itemType === 'post') {
      const { data } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId);

      if (data) {
        const newSet = new Set(data.map((item) => item.post_id));
        setLikedItems(newSet);
        likedItemsRef.current = newSet;
      }
    } else {
      const { data } = await supabase
        .from('reel_likes')
        .select('reel_id')
        .eq('user_id', currentUserId);

      if (data) {
        const newSet = new Set(data.map((item) => item.reel_id));
        setLikedItems(newSet);
        likedItemsRef.current = newSet;
      }
    }
  }, [currentUserId, itemType]);

  const toggleLike = useCallback(
    async (itemId: string) => {
      if (!currentUserId) {
        toast.error(`Please login to like ${itemType}s`);
        return;
      }

      // Prevent duplicate requests using ref (not state, to avoid race conditions)
      if (processingRef.current.has(itemId)) {
        return;
      }

      // Use ref for immediate check (avoids stale closure)
      const isLiked = likedItemsRef.current.has(itemId);

      // Mark as processing
      processingRef.current.add(itemId);

      // Optimistic UI update for liked state only - DB trigger handles count
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        likedItemsRef.current = newSet;
        return newSet;
      });

      try {
        if (itemType === 'post') {
          if (isLiked) {
            const { error } = await supabase
              .from('post_likes')
              .delete()
              .eq('post_id', itemId)
              .eq('user_id', currentUserId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('post_likes')
              .insert({ post_id: itemId, user_id: currentUserId });
            if (error && error.code !== '23505') throw error;
          }
        } else {
          if (isLiked) {
            const { error } = await supabase
              .from('reel_likes')
              .delete()
              .eq('reel_id', itemId)
              .eq('user_id', currentUserId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('reel_likes')
              .insert({ reel_id: itemId, user_id: currentUserId });
            if (error && error.code !== '23505') throw error;
          }
        }
      } catch (error: any) {
        console.error('[LIKE] Error:', error);
        toast.error(`Failed to ${isLiked ? 'unlike' : 'like'}`);
        
        // Revert liked state on error
        setLikedItems((prev) => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.add(itemId);
          } else {
            newSet.delete(itemId);
          }
          likedItemsRef.current = newSet;
          return newSet;
        });
      } finally {
        processingRef.current.delete(itemId);
      }
    },
    [currentUserId, itemType] // Removed likedItems from deps - using ref instead
  );

  return { likedItems, fetchLikedItems, toggleLike };
};
