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
import { CreateEventDialog } from "@/components/CreateEventDialog";
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
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
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

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(reelsChannel);
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
    } catch (error) {
      console.error('Fetch stories failed');
    }
  }, []);

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
    try {
      const { error } = await supabase
        .from("reels")
        .delete()
        .eq("id", reelId);

      if (error) throw error;
      toast.success("Reel deleted successfully");
      refreshFeed();
    } catch (error) {
      console.error('Error deleting reel:', error);
      toast.error("Failed to delete reel");
    }
  };

  const regions = [
    { name: "All", flag: "🌐", gradient: "from-gray-600 to-gray-400" },
    { name: "USA", flag: "🇺🇸", gradient: "from-pink-600 to-pink-400" },
    { name: "UK", flag: "🇬🇧", gradient: "from-blue-600 to-purple-500" },
    { name: "Europe", flag: "🇪🇺", gradient: "from-green-600 to-teal-500" },
    { name: "Asia", flag: "🌏", gradient: "from-orange-600 to-amber-700" },
    { name: "Middle East", flag: "🌍", gradient: "from-yellow-600 to-orange-500" },
    { name: "Africa", flag: "🌍", gradient: "from-purple-600 to-pink-500" },
  ];

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
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px]">
              <button 
                onClick={() => {
                  // Preload story images before navigation for instant display
                  navigate(`/story/${story.user_id}`);
                }}
                className="relative group cursor-pointer"
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-75 blur group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                <div className="relative rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-xl shadow-orange-500/50">
                  <div className="bg-background rounded-full p-0.5">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={story.profiles.avatar_url || undefined} />
                      <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </button>
              <span className="text-xs text-foreground font-medium truncate w-full text-center">
                {story.profiles.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Music Ticker */}
      <MusicTicker />

      {/* Music Library Update - Hidden */}
      {/* {isManager && (
        <div className="px-4 py-2">
          <button
            onClick={() => navigate("/update-music-library")}
            className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600/20 to-green-400/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold">Update Music Library</h2>
                <p className="text-xs text-muted-foreground">Sync 50 royalty-free tracks</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )} */}

      {/* Explore by Region */}
      <div className="px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-accent/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold">
                    {selectedRegion ? `${regions.find(r => r.name === selectedRegion)?.flag} ${selectedRegion}` : 'Explore by Region'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedRegion ? 'Viewing regional content' : 'Discover content worldwide'}
                  </p>
                </div>
              </div>
              <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-[calc(100vw-2rem)] max-w-md mx-4 glass border border-border/50 shadow-2xl z-50 bg-background/95 backdrop-blur-xl"
            align="center"
          >
            {isManager && (
              <div className="p-2 border-b border-border/50">
                <CreateEventDialog />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 p-2">
              {regions.map((region) => (
                <DropdownMenuItem
                  key={region.name}
                  className={`cursor-pointer rounded-xl p-4 bg-gradient-to-br ${region.gradient} relative overflow-hidden group transition-all hover:scale-105 focus:scale-105 ${selectedRegion === region.name ? 'ring-2 ring-white' : ''}`}
                  onClick={() => {
                    setSelectedRegion(region.name);
                    toast.success(`Now showing content from ${region.name}`);
                  }}
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="text-3xl">{region.flag}</span>
                    <span className="text-sm font-bold text-white">{region.name}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
              onDelete={() => item.type === 'post' ? handleDeletePost(item.id) : toast.info("Reel deletion coming soon")}
              onEdit={() => navigate(`/edit-post/${item.id}`)}
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
