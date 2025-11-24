import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentType, getEngagementConfig } from '@/types/engagement';

export const useUnifiedEngagement = (
  contentType: ContentType,
  currentUserId: string | undefined
) => {
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (currentUserId) {
      fetchLikedItems();
    }
  }, [currentUserId, contentType]);

  const fetchLikedItems = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data } = await supabase
        .from(config.tables.likes as any)
        .select(config.tables.idColumn)
        .eq('user_id', currentUserId);

      if (data) {
        setLikedItems(new Set(data.map((item: any) => item[config.tables.idColumn])));
      }
    } catch (err) {
      console.error(`Error fetching liked ${contentType}s:`, err);
    }
  }, [currentUserId, contentType]);

  const toggleLike = useCallback(
    async (itemId: string) => {
      if (!currentUserId) {
        toast.error(`Please login to like ${contentType}s`);
        return;
      }

      // Prevent duplicate requests
      if (processingRef.current.has(itemId)) {
        return;
      }

      const isLiked = likedItems.has(itemId);

      // Mark as processing
      processingRef.current.add(itemId);

      // Optimistic UI update - database trigger handles counts
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(itemId);
        } else {
          newSet.add(itemId);
        }
        return newSet;
      });

      // Database operation
      try {
        console.log(`[LIKE] ${isLiked ? 'Unliking' : 'Liking'} ${contentType} ${itemId}`);
        
        if (isLiked) {
          const { error } = await supabase
            .from(config.tables.likes as any)
            .delete()
            .eq(config.tables.idColumn, itemId)
            .eq('user_id', currentUserId);
          if (error) throw error;
        } else {
          const insertData: any = {
            [config.tables.idColumn]: itemId,
            user_id: currentUserId
          };
          
          const { error } = await supabase
            .from(config.tables.likes as any)
            .insert(insertData);
          
          // Ignore duplicate key errors (23505) - already liked
          if (error && error.code !== '23505') {
            throw error;
          }
        }
      } catch (error: any) {
        console.error(`[LIKE] Error toggling ${contentType} like:`, error);
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
      } finally {
        // Remove from processing
        processingRef.current.delete(itemId);
      }
    },
    [currentUserId, contentType, likedItems, config]
  );

  return { likedItems, fetchLikedItems, toggleLike };
};
