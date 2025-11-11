import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOptimisticLike = (
  itemType: 'post' | 'reel',
  currentUserId: string | undefined
) => {
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());

  const fetchLikedItems = useCallback(async () => {
    if (!currentUserId) return;

    if (itemType === 'post') {
      const { data } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId);

      if (data) {
        setLikedItems(new Set(data.map((item) => item.post_id)));
      }
    } else {
      const { data } = await supabase
        .from('reel_likes')
        .select('reel_id')
        .eq('user_id', currentUserId);

      if (data) {
        setLikedItems(new Set(data.map((item) => item.reel_id)));
      }
    }
  }, [currentUserId, itemType]);

  const toggleLike = useCallback(
    async (itemId: string, updateCount?: (increment: number) => void) => {
      if (!currentUserId) {
        toast.error(`Please login to like ${itemType}s`);
        return;
      }

      // Prevent duplicate requests
      if (processingRef.current.has(itemId)) {
        return;
      }

      const isLiked = likedItems.has(itemId);
      const increment = isLiked ? -1 : 1;

      // Mark as processing
      processingRef.current.add(itemId);

      // Optimistic updates - instant feedback
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });

      // Update count immediately
      updateCount?.(increment);

      // Background API call
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
            // Ignore duplicate key errors (23505) - already liked
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
            // Ignore duplicate key errors (23505) - already liked
            if (error && error.code !== '23505') throw error;
          }
        }
      } catch (error: any) {
        console.error('Like error:', error);
        toast.error(`Failed to ${isLiked ? 'unlike' : 'like'}`);
        
        // Revert on error
        setLikedItems((prev) => {
          const newSet = new Set(prev);
          if (isLiked) {
            newSet.add(itemId);
          } else {
            newSet.delete(itemId);
          }
          return newSet;
        });
        updateCount?.(-increment);
      } finally {
        // Remove from processing
        processingRef.current.delete(itemId);
      }
    },
    [currentUserId, itemType, likedItems]
  );

  return { likedItems, fetchLikedItems, toggleLike };
};
