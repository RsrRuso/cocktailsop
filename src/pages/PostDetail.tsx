import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FeedItem } from "@/components/FeedItem";
import UnifiedCommentsDialog from "@/components/unified/UnifiedCommentsDialog";
import UnifiedLikesDialog from "@/components/unified/UnifiedLikesDialog";
import ShareDialog from "@/components/ShareDialog";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useUnifiedEngagement } from "@/hooks/useUnifiedEngagement";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [mutedVideos] = useState(new Set<string>());
  
  // Use unified engagement hook
  const { likedItems, toggleLike } = useUnifiedEngagement('post', user?.id);
  const isLiked = id ? likedItems.has(id) : false;

  useEffect(() => {
    if (id) {
      fetchPost();
    }

    // Real-time subscription for post updates (like/comment counts)
    const postChannel = supabase
      .channel(`post-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${id}`
        },
        (payload: any) => {
          // Update counts from database trigger updates
          setPost((prev: any) => ({
            ...prev,
            like_count: payload.new.like_count,
            comment_count: payload.new.comment_count
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
    };
  }, [id]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url,
          professional_title,
          badge_level
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching post:", error);
      toast.error("Post not found");
      navigate("/home");
    } else {
      setPost({ ...data, type: 'post' });
    }
    setIsLoading(false);
  };

  const handleLike = () => {
    if (id) {
      toggleLike(id);
    }
  };

  const handleDelete = async () => {
    if (!user || !post || post.user_id !== user.id) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      navigate("/home");
    }
  };

  const getBadgeColor = (level: string) => {
    const colors = {
      bronze: "from-amber-600 to-amber-400",
      silver: "from-gray-400 to-gray-200",
      gold: "from-yellow-500 to-yellow-300",
      platinum: "from-blue-400 to-purple-400",
      diamond: "from-cyan-400 to-blue-600"
    };
    return colors[level as keyof typeof colors] || colors.bronze;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="glass rounded-xl p-6 animate-pulse">
            <div className="h-20 bg-muted rounded-lg mb-4" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 glass-hover px-4 py-2 rounded-xl mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <FeedItem
          item={post}
          currentUserId={user?.id}
          isLiked={isLiked}
          mutedVideos={mutedVideos}
          onLike={handleLike}
          onDelete={handleDelete}
          onEdit={() => navigate(`/edit-post/${post.id}`)}
          onComment={() => setShowComments(true)}
          onShare={() => setShowShare(true)}
          onToggleMute={() => {}}
          onFullscreen={() => {}}
          onViewLikes={() => setShowLikes(true)}
          getBadgeColor={getBadgeColor}
        />
      </div>

      {showComments && (
        <UnifiedCommentsDialog
          open={showComments}
          onOpenChange={setShowComments}
          contentType="post"
          contentId={post.id}
          onCommentChange={() => {
            fetchPost();
          }}
        />
      )}

      {showLikes && (
        <UnifiedLikesDialog
          open={showLikes}
          onOpenChange={setShowLikes}
          contentType="post"
          contentId={post.id}
        />
      )}

      {showShare && (
        <ShareDialog
          open={showShare}
          onOpenChange={setShowShare}
          postId={post.id}
          postContent={post.content || ''}
          mediaUrls={post.media_urls || []}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default PostDetail;
