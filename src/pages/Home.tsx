import { useEffect, useState, useMemo, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ShareDialog from "@/components/ShareDialog";
import CommentsDialog from "@/components/CommentsDialog";
import { ReelFullscreen } from "@/components/ReelFullscreen";
import { LazyImage } from "@/components/LazyImage";
import { useFeedData } from "@/hooks/useFeedData";
import { useOptimisticLike } from "@/hooks/useOptimisticLike";

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
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedPostContent, setSelectedPostContent] = useState<string>("");
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'reel'>('post');
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [isReelDialogOpen, setIsReelDialogOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [fullscreenReel, setFullscreenReel] = useState<FeedItem | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  // Use custom hooks for data fetching and likes
  const { posts, reels, isLoading, refreshFeed, setPosts, setReels } = useFeedData(selectedRegion);
  const { likedItems: likedPosts, toggleLike: togglePostLike, fetchLikedItems: fetchLikedPosts } = useOptimisticLike('post', currentUser?.id);
  const { likedItems: likedReels, toggleLike: toggleReelLike, fetchLikedItems: fetchLikedReels } = useOptimisticLike('reel', currentUser?.id);
  
  // Memoize merged feed to avoid recalculation
  const feed = useMemo(() => {
    const mergedFeed: FeedItem[] = [
      ...posts.map(post => ({ ...post, type: 'post' as const })),
      ...reels.map(reel => ({ ...reel, type: 'reel' as const, content: reel.caption, media_urls: [reel.video_url] }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return mergedFeed;
  }, [posts, reels]);

  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      // Dynamic import for IndexedDB cache - faster than localStorage
      const { getCache } = await import('@/lib/indexedDBCache');
      
      // Load from IndexedDB cache INSTANTLY (much faster than localStorage)
      try {
        const [cachedStories, cachedPosts, cachedReels] = await Promise.all([
          getCache('stories', 'home'),
          getCache('posts', 'home'),
          getCache('reels', 'home')
        ]);
        
        if (cachedStories && isMounted) setStories(cachedStories);
        if (cachedPosts && isMounted) setPosts(cachedPosts);
        if (cachedReels && isMounted) setReels(cachedReels);
      } catch (e) {
        console.log('Cache load skipped');
      }
      
      // Fetch user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile && isMounted) {
        setCurrentUser(profile);
      }
      
      // Fetch all data in parallel with background updates
      Promise.all([
        fetchStories(),
        refreshFeed(),
        fetchLikedPosts(),
        fetchLikedReels()
      ]).then(() => {
        if (isMounted) setIsInitialLoad(false);
      });
    };

    initializeData();

    // Only subscribe to main data tables after initial load
    const storiesChannel = supabase
      .channel('home-stories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => fetchStories()
      )
      .subscribe();

    const feedChannel = supabase
      .channel('home-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => refreshFeed()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reels'
        },
        () => refreshFeed()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(feedChannel);
    };
  }, []);

  // Merge posts and reels into unified feed
  // Fetch stories
  const fetchStories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, media_urls, media_types, created_at, expires_at, profiles(username, avatar_url)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      if (data) {
        setStories(data);
        // Cache in IndexedDB for instant load
        import('@/lib/indexedDBCache').then(({ setCache }) => {
          setCache('stories', 'home', data);
        });
      }
    } catch (error) {
      console.error('Fetch stories failed');
    }
  }, []);

  const handleLikePost = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    await togglePostLike(postId, (newIsLiked) => {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, like_count: newIsLiked ? p.like_count + 1 : Math.max(0, p.like_count - 1) } 
          : p
      ));
    });
  };

  const handleLikeReel = async (reelId: string) => {
    await toggleReelLike(reelId, (newIsLiked) => {
      setReels(prev => prev.map(r => 
        r.id === reelId 
          ? { ...r, like_count: newIsLiked ? r.like_count + 1 : Math.max(0, r.like_count - 1) } 
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

  // Filter feed based on selected region using actual profile region data
  const filteredFeed = selectedRegion && selectedRegion !== "All" 
    ? feed.filter(item => item.profiles?.region === selectedRegion || item.profiles?.region === "All")
    : feed;

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

      {/* Feed */}
      <div className="space-y-6 px-4">
        {filteredFeed.length > 0 ? (
          filteredFeed.map((item) => (
            <div key={item.id} className="glass rounded-xl p-2 space-y-3 border border-border/50">
              {/* Header */}
              <div className="flex items-center gap-3 px-2 pt-2">
                <div className="relative">
                  <Avatar className={`w-10 h-10 avatar-glow ring-1 ring-offset-1 ring-offset-background bg-gradient-to-br ${getBadgeColor(item.profiles.badge_level)}`}>
                    <AvatarImage src={item.profiles.avatar_url || undefined} />
                    <AvatarFallback>{item.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{item.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.profiles.professional_title?.replace(/_/g, " ")}
                  </p>
                </div>
                
                {currentUser && item.user_id === currentUser.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="glass-hover p-2 rounded-xl">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass">
                      {item.type === 'post' && (
                        <DropdownMenuItem 
                          onClick={() => navigate(`/edit-post/${item.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Post
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => item.type === 'post' ? handleDeletePost(item.id) : toast.info("Reel deletion coming soon")}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Content */}
              {'content' in item && item.content && (
                <p className="text-sm px-2">{item.content}</p>
              )}

              {/* Media */}
              {item.media_urls && item.media_urls.length > 0 && (
                <div className={`grid gap-1 ${item.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {item.media_urls.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden">
                      {item.type === 'reel' || url.includes('.mp4') || url.includes('video') ? (
                        <div className="relative">
                          <video 
                            src={url} 
                            loop
                            playsInline
                            muted={!mutedVideos.has(item.id + url)}
                            autoPlay
                            preload="metadata"
                            className="w-full h-auto max-h-96 object-cover cursor-pointer"
                            onClick={() => setFullscreenReel(item)}
                          />
                          
                          {/* Mute button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMutedVideos(prev => {
                                const newSet = new Set(prev);
                                const videoId = item.id + url;
                                if (newSet.has(videoId)) {
                                  newSet.delete(videoId);
                                } else {
                                  newSet.add(videoId);
                                }
                                return newSet;
                              });
                            }}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
                          >
                            {mutedVideos.has(item.id + url) ? (
                              <Volume2 className="w-4 h-4 text-white" />
                            ) : (
                              <VolumeX className="w-4 h-4 text-white" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <img
                          src={url} 
                          alt="Post media"
                          loading="lazy"
                          className="w-full h-auto object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-6 px-2 pb-1">
                <button 
                  onClick={() => item.type === 'post' ? handleLikePost(item.id) : handleLikeReel(item.id)}
                  className={`flex items-center gap-2 transition-all hover:scale-110 ${
                    (item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)) 
                      ? 'text-red-500' 
                      : 'text-muted-foreground hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${(item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)) ? 'fill-current' : ''}`} />
                  <span className="text-sm font-bold min-w-[20px]">{item.like_count || 0}</span>
                </button>
                <button 
                  onClick={() => {
                    setSelectedPostId(item.id);
                    setCommentsDialogOpen(true);
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all hover:scale-110"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-bold min-w-[20px]">{item.comment_count || 0}</span>
                </button>
                <button 
                  onClick={() => {
                    setSelectedPostId(item.id);
                    setSelectedPostContent(item.type === 'post' ? item.content : item.caption);
                    setSelectedPostType(item.type);
                    setSelectedMediaUrls(item.media_urls || []);
                    setShareDialogOpen(true);
                  }}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all hover:scale-110"
                >
                  <Send className="w-5 h-5" />
                  <span className="text-xs">Send</span>
                </button>
              </div>
            </div>
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
        isReel={feed.find(f => f.id === selectedPostId)?.type === 'reel'}
        onCommentAdded={() => {
          const item = feed.find(f => f.id === selectedPostId);
          if (item?.type === 'post') {
            setPosts(posts.map(p => p.id === selectedPostId ? { ...p, comment_count: p.comment_count + 1 } : p));
          } else if (item?.type === 'reel') {
            setReels(reels.map(r => r.id === selectedPostId ? { ...r, comment_count: r.comment_count + 1 } : r));
          }
        }}
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
