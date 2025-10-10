import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOptimisticLike = (
  itemType: 'post' | 'reel',
  currentUserId: string | undefined
) => {
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

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
    async (itemId: string, onSuccess?: (isLiked: boolean) => void) => {
      if (!currentUserId) {
        toast.error(`Please login to like ${itemType}s`);
        return;
      }

      const isLiked = likedItems.has(itemId);

      // Optimistic update - instant feedback
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });

      onSuccess?.(!isLiked);

      // Background API call
      try {
        if (itemType === 'post') {
          if (isLiked) {
            const { error } = await supabase
              .from('post_likes')
              .delete()
              .eq('post_id', itemId)
              .eq('user_id', currentUserId);
            if (error) {
              console.error('Failed to unlike post:', error);
              throw error;
            }
            console.log('Post unliked successfully');
          } else {
            const { error } = await supabase
              .from('post_likes')
              .insert({ post_id: itemId, user_id: currentUserId });
            if (error) {
              console.error('Failed to like post:', error);
              throw error;
            }
            console.log('Post liked successfully');
          }
        } else {
          if (isLiked) {
            const { error } = await supabase
              .from('reel_likes')
              .delete()
              .eq('reel_id', itemId)
              .eq('user_id', currentUserId);
            if (error) {
              console.error('Failed to unlike reel:', error);
              throw error;
            }
            console.log('Reel unliked successfully');
          } else {
            const { error } = await supabase
              .from('reel_likes')
              .insert({ reel_id: itemId, user_id: currentUserId });
            if (error) {
              console.error('Failed to like reel:', error);
              throw error;
            }
            console.log('Reel liked successfully');
          }
        }
      } catch (error) {
        console.error('Like API call failed:', error);
        toast.error(`Failed to ${isLiked ? 'unlike' : 'like'} ${itemType}`);
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
        onSuccess?.(isLiked);
      }
    },
    [currentUserId, itemType, likedItems]
  );

  return { likedItems, fetchLikedItems, toggleLike };
};
