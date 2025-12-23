import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FeedItem } from "@/components/FeedItem";
import { useEngagement } from "@/hooks/useEngagement";
import { getBadgeColor } from "@/lib/profileUtils";
import { Loader2 } from "lucide-react";

interface ProfileFeedTabProps {
  userId: string;
  profile: any;
}

const ProfileFeedTab = ({ userId, profile }: ProfileFeedTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());

  // Unified count change handler for posts
  const handlePostCountChange = useCallback((postId: string, type: 'like' | 'save' | 'repost', delta: number) => {
    setPosts(old => 
      old.map(p => {
        if (p.id !== postId) return p;
        if (type === 'like') return { ...p, like_count: Math.max(0, (p.like_count || 0) + delta) };
        if (type === 'save') return { ...p, save_count: Math.max(0, (p.save_count || 0) + delta) };
        if (type === 'repost') return { ...p, repost_count: Math.max(0, (p.repost_count || 0) + delta) };
        return p;
      })
    );
  }, []);
  
  // Unified count change handler for reels
  const handleReelCountChange = useCallback((reelId: string, type: 'like' | 'save' | 'repost', delta: number) => {
    setReels(old => 
      old.map(r => {
        if (r.id !== reelId) return r;
        if (type === 'like') return { ...r, like_count: Math.max(0, (r.like_count || 0) + delta) };
        if (type === 'save') return { ...r, save_count: Math.max(0, (r.save_count || 0) + delta) };
        if (type === 'repost') return { ...r, repost_count: Math.max(0, (r.repost_count || 0) + delta) };
        return r;
      })
    );
  }, []);

  const postEngagement = useEngagement('post', userId, handlePostCountChange);
  const reelEngagement = useEngagement('reel', userId, handleReelCountChange);

  const fetchData = useCallback(async () => {
    try {
      const [postsRes, reelsRes] = await Promise.all([
        supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        supabase.from('reels').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      ]);
      
      setPosts(postsRes.data || []);
      setReels(reelsRes.data || []);
    } catch (err) {
      console.error('Error fetching profile feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    fetchData();
    postEngagement.fetchEngagement();
    reelEngagement.fetchEngagement();
  }, [userId]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;
      toast.success("Post deleted");
      setPosts(p => p.filter(post => post.id !== postId));
    } catch {
      toast.error("Failed to delete post");
    }
  }, []);

  const handleDeleteReel = useCallback(async (reelId: string) => {
    if (!window.confirm("Are you sure you want to delete this reel?")) return;
    try {
      const { error } = await supabase.from("reels").delete().eq("id", reelId);
      if (error) throw error;
      toast.success("Reel deleted");
      setReels(r => r.filter(reel => reel.id !== reelId));
    } catch {
      toast.error("Failed to delete reel");
    }
  }, []);

  const handleToggleMute = useCallback((videoId: string) => {
    setMutedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) newSet.delete(videoId);
      else newSet.add(videoId);
      return newSet;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allItems = [
    ...posts.map(p => ({ ...p, type: 'post' as const, profiles: { ...profile } })), 
    ...reels.map(r => ({ ...r, type: 'reel' as const, content: r.caption, media_urls: [r.video_url], profiles: { ...profile } }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (allItems.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No posts or reels yet</p>
      </div>
    );
  }

  return (
    <div>
      {allItems.map((item: any) => (
        <FeedItem
          key={`${item.type}-${item.id}`}
          item={item}
          currentUserId={userId}
          isLiked={item.type === 'post' ? postEngagement.isLiked(item.id) : reelEngagement.isLiked(item.id)}
          isSaved={item.type === 'post' ? postEngagement.isSaved(item.id) : reelEngagement.isSaved(item.id)}
          isReposted={item.type === 'post' ? postEngagement.isReposted(item.id) : reelEngagement.isReposted(item.id)}
          mutedVideos={mutedVideos}
          onLike={() => item.type === 'post' ? postEngagement.toggleLike(item.id) : reelEngagement.toggleLike(item.id)}
          onSave={() => item.type === 'post' ? postEngagement.toggleSave(item.id) : reelEngagement.toggleSave(item.id)}
          onRepost={() => item.type === 'post' ? postEngagement.toggleRepost(item.id) : reelEngagement.toggleRepost(item.id)}
          onDelete={() => item.type === 'post' ? handleDeletePost(item.id) : handleDeleteReel(item.id)}
          onEdit={() => navigate(item.type === 'post' ? `/post/${item.id}/edit` : `/reel/${item.id}/edit`)}
          onComment={() => fetchData()}
          onShare={() => {}}
          onToggleMute={handleToggleMute}
          onFullscreen={() => navigate('/reels', { state: { scrollToReelId: item.id } })}
          getBadgeColor={getBadgeColor}
        />
      ))}
    </div>
  );
};

export default ProfileFeedTab;
