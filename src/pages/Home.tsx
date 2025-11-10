import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import ShareDialog from "@/components/ShareDialog";
import CommentsDialog from "@/components/CommentsDialog";
import LikesDialog from "@/components/LikesDialog";
import { ReelFullscreen } from "@/components/ReelFullscreen";
import { FeedItem } from "@/components/FeedItem";
import { useFeedData } from "@/hooks/useFeedData";
import { useOptimisticLike } from "@/hooks/useOptimisticLike";
import { useManagerRole } from "@/hooks/useManagerRole";
import { EventsTicker } from "@/components/EventsTicker";
import MusicTicker from "@/components/MusicTicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type FeedItem = (Post & { type: 'post' }) | (Reel & { type: 'reel'; content: string; media_urls: string[] });

const Home = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth(); // Use cached auth
  const [stories, setStories] = useState<Story[]>([]);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(profile); // Initialize with cached profile
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedPostContent, setSelectedPostContent] = useState<string>("");
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'reel'>('post');
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [isReelDialogOpen, setIsReelDialogOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [fullscreenReel, setFullscreenReel] = useState<FeedItem | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    return localStorage.getItem('selectedRegion') || null;
  });
  const [showLikes, setShowLikes] = useState(false);
  const [selectedLikesPostId, setSelectedLikesPostId] = useState("");
  const [isReelLikes, setIsReelLikes] = useState(false);
  const { isManager } = useManagerRole();
  
  // Update currentUser when profile changes
  useEffect(() => {
    if (profile) setCurrentUser(profile);
  }, [profile]);

  // Use cached user ID for hooks
  const { posts, reels, isLoading, refreshFeed, setPosts, setReels } = useFeedData(selectedRegion);
  const { likedItems: likedPosts, toggleLike: togglePostLike, fetchLikedItems: fetchLikedPosts } = useOptimisticLike('post', user?.id);
  const { likedItems: likedReels, toggleLike: toggleReelLike, fetchLikedItems: fetchLikedReels } = useOptimisticLike('reel', user?.id);

  
  // Memoize merged feed to avoid recalculation
  const feed = useMemo(() => {
    const mergedFeed: FeedItem[] = [
      ...posts.map(post => ({ ...post, type: 'post' as const })),
      ...reels.map(reel => ({ ...reel, type: 'reel' as const, content: reel.caption, media_urls: [reel.video_url] }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return mergedFeed;
  }, [posts, reels]);

  // Memoize filtered feed
  const filteredFeed = useMemo(() => {
    if (selectedRegion && selectedRegion !== "All") {
      return feed.filter(item => item.profiles && (item.profiles?.region === selectedRegion || item.profiles?.region === "All"));
    }
    return feed.filter(item => item.profiles !== null);
  }, [feed, selectedRegion]);

  useEffect(() => {
    fetchStories();
    if (user?.id) {
      fetchLikedPosts();
      fetchLikedReels();
    }

    // Subscribe to comment count changes
    const postsChannel = supabase
      .channel('posts-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => refreshFeed())
      .subscribe();

    const reelsChannel = supabase
      .channel('reels-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => refreshFeed())
      .subscribe();

    // Listen for region changes from TopNav
    const handleRegionChange = (e: CustomEvent) => {
      setSelectedRegion(e.detail);
    };
    window.addEventListener('regionChange' as any, handleRegionChange);

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reelsChannel);
      window.removeEventListener('regionChange' as any, handleRegionChange);
    };
  }, [user?.id, fetchLikedPosts, fetchLikedReels, refreshFeed]);

  // Merge posts and reels into unified feed
  const fetchStories = useCallback(async () => {
    try {
      // Fetch stories WITHOUT profile join
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, media_urls, media_types")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data) return;

      // Fetch profiles separately
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      // Map profiles to stories
      const storiesWithProfiles = data.map(story => ({
        ...story,
        profiles: profiles?.find(p => p.id === story.user_id) || { username: 'Unknown', avatar_url: null }
      }));

      setStories(storiesWithProfiles);

      // Fetch viewed stories for current user
      if (user?.id) {
        const { data: viewedData } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('user_id', user.id);
        
        if (viewedData) {
          setViewedStories(new Set(viewedData.map(v => v.story_id)));
        }
      }
    } catch (error) {
      // Error fetching stories
    }
  }, [user?.id]);

  const handleLikePost = (postId: string) => {
    togglePostLike(postId, (increment) => {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, like_count: Math.max(0, p.like_count + increment) } 
          : p
      ));
    });
  };

  const handleLikeReel = (reelId: string) => {
    toggleReelLike(reelId, (increment) => {
      setReels(prev => prev.map(r => 
        r.id === reelId 
          ? { ...r, like_count: Math.max(0, r.like_count + increment) } 
          : r
      ));
    });
  };

  const getBadgeColor = (level: string) => {
    const colors = {
      bronze: "from-amber-700 to-amber-500",
      silver: "from-gray-400 to-gray-200",
      gold: "from-yellow-500 to-yellow-300",
      platinum: "from-blue-400 to-purple-500",
    };
    return colors[level as keyof typeof colors] || colors.bronze;
  };

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
      toast.success("Post deleted successfully");
      refreshFeed();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error("Failed to delete post");
    }
  }, [refreshFeed]);

  const handleDeleteReel = async (reelId: string) => {
    if (!user?.id) {
      toast.error("Please login to delete reels");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this reel?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("reels")
        .delete()
        .eq("id", reelId)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Reel deleted successfully");
      refreshFeed();
    } catch (error: any) {
      console.error('Error deleting reel:', error);
      toast.error(error?.message || "Failed to delete reel");
    }
  };


  const handleToggleMute = useCallback((videoId: string) => {
    setMutedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="min-h-screen pb-20 pt-16">
      <TopNav />

      {/* Stories */}
      <div className="px-4 py-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          {/* Your Story */}
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <button
              onClick={() => navigate("/story-options")}
              className="relative group"
            >
              <div className="w-16 h-16 rounded-full glass border-2 border-border flex items-center justify-center">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={currentUser?.avatar_url || undefined} />
                  <AvatarFallback>{currentUser?.username?.[0] || "Y"}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background glow-primary">
                <span className="text-white text-lg font-bold">+</span>
              </div>
            </button>
            <span className="text-xs text-muted-foreground">Your Story</span>
          </div>

          {/* Other Stories */}
          {stories.map((story) => {
            const isViewed = viewedStories.has(story.id);
            return (
              <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px]">
                <button 
                  onClick={() => {
                    // Preload story images before navigation for instant display
                    navigate(`/story/${story.user_id}`);
                  }}
                  className="relative group cursor-pointer"
                >
                  {isViewed ? (
                    // Viewed story - dark blue ring
                    <>
                      <div className="absolute -inset-1 rounded-full bg-blue-900 opacity-50 blur group-hover:opacity-75 transition-all duration-300"></div>
                      <div className="relative rounded-full bg-blue-900 p-0.5 shadow-xl shadow-blue-900/50">
                        <div className="bg-background rounded-full p-0.5">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={story.profiles.avatar_url || undefined} />
                            <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Unviewed story - gradient ring
                    <>
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-75 blur group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                      <div className="relative rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-xl shadow-orange-500/50">
                        <div className="bg-background rounded-full p-0.5">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={story.profiles.avatar_url || undefined} />
                            <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </>
                  )}
                </button>
                <span className="text-xs text-foreground font-medium truncate w-full text-center">
                  {story.profiles.username}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Music Ticker */}
      <MusicTicker />

      {/* Events Ticker */}
      {selectedRegion && (
        <div className="px-4">
          <EventsTicker region={selectedRegion} />
        </div>
      )}

      {/* Feed */}
      <div className="space-y-6 px-4">
        {filteredFeed.length > 0 ? (
          filteredFeed.map((item) => (
            <FeedItem
              key={item.id}
              item={item}
              currentUserId={currentUser?.id}
              isLiked={item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)}
              mutedVideos={mutedVideos}
              onLike={() => item.type === 'post' ? handleLikePost(item.id) : handleLikeReel(item.id)}
              onDelete={() => item.type === 'post' ? handleDeletePost(item.id) : handleDeleteReel(item.id)}
              onEdit={() => item.type === 'post' ? navigate(`/edit-post/${item.id}`) : navigate(`/edit-reel/${item.id}`)}
              onComment={() => {
                setSelectedPostId(item.id);
                setSelectedPostType(item.type);
                setCommentsDialogOpen(true);
              }}
              onShare={() => {
                setSelectedPostId(item.id);
                setSelectedPostContent(item.type === 'post' ? item.content : item.caption);
                setSelectedPostType(item.type);
                setSelectedMediaUrls(item.media_urls || []);
                setShareDialogOpen(true);
              }}
              onToggleMute={handleToggleMute}
              onFullscreen={() => setFullscreenReel(item)}
              onViewLikes={() => {
                setSelectedLikesPostId(item.id);
                setIsReelLikes(item.type === 'reel');
                setShowLikes(true);
              }}
              getBadgeColor={getBadgeColor}
            />
          ))
        ) : (
          // Loading skeletons
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-64 w-full bg-muted rounded-xl" />
                <div className="flex gap-4">
                  <div className="h-8 w-16 bg-muted rounded" />
                  <div className="h-8 w-16 bg-muted rounded" />
                  <div className="h-8 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        postId={selectedPostId}
        postContent={selectedPostContent}
        postType={selectedPostType}
        mediaUrls={selectedMediaUrls}
      />
      
      <CommentsDialog
        open={commentsDialogOpen}
        onOpenChange={setCommentsDialogOpen}
        postId={selectedPostId}
        isReel={selectedPostType === 'reel'}
        onCommentChange={refreshFeed}
      />

      <LikesDialog
        open={showLikes}
        onOpenChange={setShowLikes}
        postId={selectedLikesPostId}
        isReel={isReelLikes}
      />

      {fullscreenReel && (
        <ReelFullscreen
          isOpen={!!fullscreenReel}
          onClose={() => setFullscreenReel(null)}
          videoUrl={fullscreenReel.media_urls[0]}
          postId={fullscreenReel.id}
          postType={fullscreenReel.type}
          content={fullscreenReel.type === 'post' ? fullscreenReel.content : fullscreenReel.caption}
          likeCount={fullscreenReel.like_count}
          commentCount={fullscreenReel.comment_count}
          isLiked={fullscreenReel.type === 'post' ? likedPosts.has(fullscreenReel.id) : likedReels.has(fullscreenReel.id)}
          isOwnPost={currentUser?.id === fullscreenReel.user_id}
          userId={fullscreenReel.user_id}
          onLike={() => {
            fullscreenReel.type === 'post' ? handleLikePost(fullscreenReel.id) : handleLikeReel(fullscreenReel.id);
          }}
          onComment={() => {
            setSelectedPostId(fullscreenReel.id);
            setCommentsDialogOpen(true);
          }}
          onShare={() => {
            setSelectedPostId(fullscreenReel.id);
            setSelectedPostContent(fullscreenReel.type === 'post' ? fullscreenReel.content : fullscreenReel.caption);
            setSelectedPostType(fullscreenReel.type);
            setSelectedMediaUrls(fullscreenReel.media_urls || []);
            setShareDialogOpen(true);
          }}
          onEdit={() => {
            navigate(fullscreenReel.type === 'post' ? `/edit-post/${fullscreenReel.id}` : `/edit-reel/${fullscreenReel.id}`);
          }}
          onDelete={() => {
            fullscreenReel.type === 'post' ? handleDeletePost(fullscreenReel.id) : handleDeleteReel(fullscreenReel.id);
            setFullscreenReel(null);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
