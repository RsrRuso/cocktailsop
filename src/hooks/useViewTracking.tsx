import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useViewTracking = (
  itemType: 'post' | 'reel',
  itemId: string | undefined,
  userId: string | undefined,
  enabled: boolean = true
) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!enabled || !itemId || !userId || hasTracked.current) return;

    const trackView = async () => {
      try {
        // Insert view record (unique constraint prevents duplicates)
        if (itemType === 'post') {
          const { error } = await supabase
            .from('post_views')
            .insert({
              post_id: itemId,
              user_id: userId,
            });
          
          if (error && !error.message.includes('duplicate key')) {
            // Error tracking post view
          }
        } else {
          const { error } = await supabase
            .from('reel_views')
            .insert({
              reel_id: itemId,
              user_id: userId,
            });
          
          if (error && !error.message.includes('duplicate key')) {
            // Error tracking reel view
          }
        }

        hasTracked.current = true;
      } catch (error: any) {
        // Ignore unique constraint errors (user already viewed this item)
      }
    };

    // Track view after a short delay to ensure genuine view
    const timer = setTimeout(trackView, 2000);

    return () => clearTimeout(timer);
  }, [itemId, userId, itemType, enabled]);
};
