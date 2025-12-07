import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import ShareDialog from "@/components/ShareDialog";
import { FeedItem } from "@/components/FeedItem";
import { useFeedData } from "@/hooks/useFeedData";
import { useOptimisticLike } from "@/hooks/useOptimisticLike";
import { EventsTicker } from "@/components/EventsTicker";
import { Plus } from "lucide-react";

interface Story {
  id: string;
  user_id: string;
  media_urls: string[];
  media_types: string[];
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    professional_title: string | null;
    badge_level: string;
    region: string | null;
  };
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
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    professional_title: string | null;
    badge_level: string;
    region: string | null;
  };
}

type FeedItemType = (Post & { type: 'post' }) | (Reel & { type: 'reel'; content: string; media_urls: string[] });

// Memoized Story Item for performance
const StoryItem = memo(({ story, onClick }: { story: Story; onClick: () => void }) => {
  const previewMedia = story.media_urls?.[0];
  const isVideo = story.media_types?.[0]?.startsWith('video');
  
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 min-w-[72px]">
      <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/60 p-0.5 bg-gradient-to-br from-primary to-purple-500">
        <div className="w-full h-full rounded-full overflow-hidden bg-background">
          {previewMedia ? (
            isVideo ? (
              <video src={previewMedia} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={previewMedia} alt="" className="w-full h-full object-cover" loading="lazy" />
            )
          ) : (
            <Avatar className="w-full h-full">
              <AvatarImage src={story.profiles.avatar_url || undefined} />
              <AvatarFallback>{story.profiles.username?.[0]}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">
        {story.profiles.username}
      </span>
    </button>
  );
});
StoryItem.displayName = 'StoryItem';

// Memoized Your Story button
const YourStoryButton = memo(({ avatarUrl, username, hasStory, onClick }: { 
  avatarUrl?: string | null; 
  username?: string; 
  hasStory: boolean;
  onClick: () => void;
}) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 min-w-[72px]">
    <div className="relative">
      <div className={`w-16 h-16 rounded-full overflow-hidden ${hasStory ? 'ring-2 ring-primary p-0.5 bg-gradient-to-br from-primary to-purple-500' : 'ring-2 ring-muted'}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-background">
          <Avatar className="w-full h-full">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback>{username?.[0] || 'Y'}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      {!hasStory && (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
          <Plus className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </div>
    <span className="text-[10px] text-muted-foreground">Your Story</span>
  </button>
));
YourStoryButton.displayName = 'YourStoryButton';

// Loading skeleton
const FeedSkeleton = memo(() => (
  <div className="space-y-4 px-3">
    {[1, 2].map(i => (
      <div key={i} className="animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-24" />
            <div className="h-2 bg-muted rounded w-16" />
          </div>
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    ))}
  </div>
));
FeedSkeleton.displayName = 'FeedSkeleton';

const getBadgeColor = (level: string) => {
  const colors: Record<string, string> = {
    bronze: "from-amber-700 to-amber-500",
    silver: "from-gray-400 to-gray-200",
    gold: "from-yellow-500 to-yellow-300",
    platinum: "from-blue-400 to-purple-500",
  };
  return colors[level] || colors.bronze;
};

const Home = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPostContent, setSelectedPostContent] = useState("");
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'reel'>('post');
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => 
    localStorage.getItem('selectedRegion')
  );
  const [hasActiveStory, setHasActiveStory] = useState(false);

  const { posts, reels, isLoading, refreshFeed } = useFeedData(selectedRegion);
  const { likedItems: likedPosts, toggleLike: togglePostLike, fetchLikedItems: fetchLikedPosts } = useOptimisticLike('post', user?.id);
  const { likedItems: likedReels, toggleLike: toggleReelLike, fetchLikedItems: fetchLikedReels } = useOptimisticLike('reel', user?.id);

  // Memoize merged feed
  const feed = useMemo(() => {
    const merged: FeedItemType[] = [
      ...posts.map(post => ({ ...post, type: 'post' as const })),
      ...reels.map(reel => ({ ...reel, type: 'reel' as const, content: reel.caption, media_urls: [reel.video_url] }))
    ];
    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts, reels]);

  // Filter feed by region
  const filteredFeed = useMemo(() => {
    if (!selectedRegion || selectedRegion === "All") {
      return feed.filter(item => item.profiles);
    }
    return feed.filter(item => 
      item.profiles && (item.profiles.region === selectedRegion || item.profiles.region === "All")
    );
  }, [feed, selectedRegion]);

  // Fetch stories - lightweight
  const fetchStories = useCallback(async () => {
    if (!user?.id) return;
    
    const [storiesRes, userStoryRes] = await Promise.all([
      supabase
        .from("stories")
        .select("id, user_id, media_urls, media_types")
        .gt("expires_at", new Date().toISOString())
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("stories")
        .select("id")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
    ]);

    setHasActiveStory(!!(userStoryRes.data?.length));

    if (storiesRes.data?.length) {
      const userIds = [...new Set(storiesRes.data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      setStories(storiesRes.data.map(story => ({
        ...story,
        profiles: profiles?.find(p => p.id === story.user_id) || { username: 'User', avatar_url: null }
      })));
    }
  }, [user?.id]);

  // Initial data fetch
  useEffect(() => {
    fetchStories();
    if (user?.id) {
      fetchLikedPosts();
      fetchLikedReels();
    }
  }, [user?.id, fetchStories, fetchLikedPosts, fetchLikedReels]);

  // Realtime subscriptions - lightweight
  useEffect(() => {
    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => refreshFeed(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => refreshFeed(true))
      .subscribe();

    const handleRegionChange = (e: CustomEvent) => setSelectedRegion(e.detail);
    window.addEventListener('regionChange' as any, handleRegionChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('regionChange' as any, handleRegionChange);
    };
  }, [refreshFeed]);

  // Handlers
  const handleLike = useCallback((id: string, type: 'post' | 'reel') => {
    if (type === 'post') togglePostLike(id);
    else toggleReelLike(id);
  }, [togglePostLike, toggleReelLike]);

  const handleDelete = useCallback(async (id: string, type: 'post' | 'reel') => {
    if (!confirm("Delete this " + type + "?")) return;
    const { error } = await supabase.from(type === 'post' ? 'posts' : 'reels').delete().eq('id', id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      refreshFeed(true);
    }
  }, [refreshFeed]);

  const handleToggleMute = useCallback((videoId: string) => {
    setMutedVideos(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }, []);

  const handleShare = useCallback((item: FeedItemType) => {
    setSelectedPostId(item.id);
    setSelectedPostContent(item.content || '');
    setSelectedPostType(item.type);
    setSelectedMediaUrls(item.media_urls || []);
    setShareDialogOpen(true);
  }, []);

  const handleStoryClick = useCallback((userId: string) => {
    navigate(`/story/${userId}`);
  }, [navigate]);

  const handleYourStoryClick = useCallback(() => {
    navigate(hasActiveStory ? `/story/${user?.id}` : "/story-options");
  }, [navigate, hasActiveStory, user?.id]);

  return (
    <div className="min-h-screen pb-20 pt-14 bg-background">
      <TopNav />

      {/* Stories - Compact */}
      <div className="px-3 py-2 overflow-x-auto scrollbar-hide border-b border-border/50">
        <div className="flex gap-3">
          <YourStoryButton
            avatarUrl={profile?.avatar_url}
            username={profile?.username}
            hasStory={hasActiveStory}
            onClick={handleYourStoryClick}
          />
          {stories.map(story => (
            <StoryItem
              key={story.id}
              story={story}
              onClick={() => handleStoryClick(story.user_id)}
            />
          ))}
        </div>
      </div>

      {/* Events Ticker */}
      {selectedRegion && <EventsTicker region={selectedRegion} />}

      {/* Feed */}
      <div className="divide-y divide-border/30">
        {isLoading ? (
          <FeedSkeleton />
        ) : filteredFeed.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No posts yet</p>
          </div>
        ) : (
          filteredFeed.map(item => (
            <FeedItem
              key={item.id}
              item={item}
              currentUserId={user?.id}
              isLiked={item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)}
              mutedVideos={mutedVideos}
              onLike={() => handleLike(item.id, item.type)}
              onDelete={() => handleDelete(item.id, item.type)}
              onEdit={() => navigate(item.type === 'post' ? `/edit-post/${item.id}` : `/edit-reel/${item.id}`)}
              onComment={() => {}}
              onShare={() => handleShare(item)}
              onToggleMute={handleToggleMute}
              onFullscreen={() => item.type === 'reel' && navigate(`/reels?id=${item.id}`)}
              onViewLikes={() => {}}
              getBadgeColor={getBadgeColor}
            />
          ))
        )}
      </div>

      <BottomNav />

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        postId={selectedPostId}
        postContent={selectedPostContent}
        mediaUrls={selectedMediaUrls}
      />
    </div>
  );
};

export default Home;