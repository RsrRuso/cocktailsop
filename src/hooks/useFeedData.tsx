import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
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
  created_at: string;
  profiles: any;
}

export const useFeedData = (selectedRegion: string | null) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      let query = supabase
        .from("posts")
        .select("id, user_id, content, media_urls, comment_count, created_at, profiles(username, full_name, avatar_url, professional_title, badge_level, region)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (selectedRegion && selectedRegion !== "All") {
        query = query.or(`profiles.region.eq.${selectedRegion},profiles.region.eq.All`);
      }

      const { data: postsData } = await query;
      
      if (postsData) {
        // Fetch actual like counts for each post
        const postsWithLikeCounts = await Promise.all(
          postsData.map(async (post) => {
            const { count } = await supabase
              .from("post_likes")
              .select("*", { count: 'exact', head: true })
              .eq("post_id", post.id);
            
            return {
              ...post,
              like_count: count || 0
            };
          })
        );
        
        setPosts(postsWithLikeCounts);
      }
    } catch (error) {
      console.error('Fetch posts failed');
    }
  }, [selectedRegion]);

  const fetchReels = useCallback(async () => {
    try {
      let query = supabase
        .from("reels")
        .select("id, user_id, video_url, caption, comment_count, view_count, created_at, profiles(username, full_name, avatar_url, professional_title, badge_level, region)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (selectedRegion && selectedRegion !== "All") {
        query = query.or(`profiles.region.eq.${selectedRegion},profiles.region.eq.All`);
      }

      const { data: reelsData } = await query;
      
      if (reelsData) {
        // Fetch actual like counts for each reel
        const reelsWithLikeCounts = await Promise.all(
          reelsData.map(async (reel) => {
            const { count } = await supabase
              .from("reel_likes")
              .select("*", { count: 'exact', head: true })
              .eq("reel_id", reel.id);
            
            return {
              ...reel,
              like_count: count || 0
            };
          })
        );
        
        setReels(reelsWithLikeCounts);
      }
    } catch (error) {
      console.error('Fetch reels failed');
    }
  }, [selectedRegion]);

  const refreshFeed = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchPosts(), fetchReels()]);
    setIsLoading(false);
  }, [fetchPosts, fetchReels]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  return { posts, reels, isLoading, refreshFeed, setPosts, setReels };
};
