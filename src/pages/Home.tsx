import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItem } from "@/components/FeedItem";
import { useFeedData } from "@/hooks/useFeedData";
import { useEngagement } from "@/hooks/useEngagement";
import { useStoriesData } from "@/hooks/useStoriesData";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useVerifiedUsers } from "@/hooks/useVerifiedUsers";
import BirthdayFireworks from "@/components/BirthdayFireworks";
import UserStatusIndicator from "@/components/UserStatusIndicator";
import { Camera, MessageCircle, Music } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Lazy load non-critical dialogs only
const ShareDialog = lazy(() => import("@/components/ShareDialog"));
const LikesDialog = lazy(() => import("@/components/LikesDialog"));
const EventsTicker = lazy(() => import("@/components/EventsTicker").then(m => ({ default: m.EventsTicker })));
const CreateStatusDialog = lazy(() => import("@/components/CreateStatusDialog"));
const MusicStatusDialog = lazy(() => import("@/components/MusicStatusDialog"));

// Story skeleton for instant UI
const StorySkeleton = () => (
  <div className="flex gap-3 px-4 py-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5">
        <Skeleton className="w-[88px] h-[88px] rounded-full" />
        <Skeleton className="w-14 h-3" />
      </div>
    ))}
  </div>
);

// Feed skeleton for instant UI
const FeedSkeleton = () => (
  <div className="space-y-4 px-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
        <Skeleton className="w-full h-48 rounded-lg" />
        <div className="flex gap-4">
          <Skeleton className="w-16 h-6" />
          <Skeleton className="w-16 h-6" />
        </div>
      </div>
    ))}
  </div>
);

interface Story {
  id: string;
  user_id: string;
  media_urls: string[];
  media_types: string[];
  profiles: {
    username: string;
    avatar_url: string | null;
    date_of_birth?: string | null;
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
  
  // Use shared stories hook with caching
  const { stories, isLoading: storiesLoading, userHasStory, refreshStories } = useStoriesData(user?.id);
  
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(profile); // Initialize with cached profile
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'reel'>('post');
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [isReelDialogOpen, setIsReelDialogOpen] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    return localStorage.getItem('selectedRegion') || null;
  });
  const [showLikes, setShowLikes] = useState(false);
  const [selectedLikesPostId, setSelectedLikesPostId] = useState("");
  const [isReelLikes, setIsReelLikes] = useState(false);
  const [showTopNav, setShowTopNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  
  // Update currentUser when profile changes
  useEffect(() => {
    if (profile) setCurrentUser(profile);
  }, [profile]);

  // Use cached user ID for hooks
  const { posts, reels, isLoading, refreshFeed, setPosts, setReels } = useFeedData(selectedRegion);
  
  // Unified count change handler for posts
  const handlePostCountChange = useCallback((postId: string, type: 'like' | 'save' | 'repost', delta: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      if (type === 'like') return { ...p, like_count: Math.max(0, (p.like_count || 0) + delta) };
      if (type === 'save') return { ...p, save_count: Math.max(0, ((p as any).save_count || 0) + delta) };
      if (type === 'repost') return { ...p, repost_count: Math.max(0, ((p as any).repost_count || 0) + delta) };
      return p;
    }));
  }, [setPosts]);
  
  // Unified count change handler for reels
  const handleReelCountChange = useCallback((reelId: string, type: 'like' | 'save' | 'repost', delta: number) => {
    setReels(prev => prev.map(r => {
      if (r.id !== reelId) return r;
      if (type === 'like') return { ...r, like_count: Math.max(0, (r.like_count || 0) + delta) };
      if (type === 'save') return { ...r, save_count: Math.max(0, ((r as any).save_count || 0) + delta) };
      if (type === 'repost') return { ...r, repost_count: Math.max(0, ((r as any).repost_count || 0) + delta) };
      return r;
    }));
  }, [setReels]);
  
  // Use unified engagement hooks for posts and reels
  const postEngagement = useEngagement('post', user?.id, handlePostCountChange);
  const reelEngagement = useEngagement('reel', user?.id, handleReelCountChange);
  
  // Get current user's status (including music status)
  const { data: currentUserStatus } = useUserStatus(user?.id);


  
  // Get all user IDs from feed for verified status
  const feedUserIds = useMemo(() => 
    [...posts.map(p => p.user_id), ...reels.map(r => r.user_id)].filter(Boolean)
  , [posts, reels]);
  
  const { isVerified: isUserVerified } = useVerifiedUsers(feedUserIds);
  
  // Memoize merged feed to avoid recalculation
  const feed = useMemo(() => {
    const mergedFeed: FeedItem[] = [
      ...posts.map(post => ({ 
        ...post, 
        type: 'post' as const,
        profiles: post.profiles ? { ...post.profiles, is_verified: isUserVerified(post.user_id) } : null
      })),
      ...reels.map(reel => ({ 
        ...reel, 
        type: 'reel' as const, 
        content: reel.caption, 
        media_urls: [reel.video_url],
        profiles: reel.profiles ? { ...reel.profiles, is_verified: isUserVerified(reel.user_id) } : null
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return mergedFeed;
  }, [posts, reels, isUserVerified]);

  // Memoize filtered feed
  const filteredFeed = useMemo(() => {
    if (selectedRegion && selectedRegion !== "All") {
      return feed.filter(item => item.profiles && (item.profiles?.region === selectedRegion || item.profiles?.region === "All"));
    }
    return feed.filter(item => item.profiles !== null);
  }, [feed, selectedRegion]);

  // Scroll detection for auto-hide nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setShowTopNav(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide nav
        setShowTopNav(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show nav
        setShowTopNav(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Fetch viewed stories for the current user
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchViewedStories = async () => {
      const { data } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id);
      if (data) setViewedStories(new Set(data.map(v => v.story_id)));
    };
    
    fetchViewedStories();
    // Note: engagement is now fetched automatically by useEngagement hook when userId changes
  }, [user?.id]);

  // Realtime subscriptions (only for stories - feed handled in useFeedData)
  useEffect(() => {
    const storiesChannel = supabase
      .channel('stories-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => refreshStories())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, () => refreshStories())
      .subscribe();

    const handleRegionChange = (e: CustomEvent) => setSelectedRegion(e.detail);
    window.addEventListener('regionChange' as any, handleRegionChange);

    return () => {
      supabase.removeChannel(storiesChannel);
      window.removeEventListener('regionChange' as any, handleRegionChange);
    };
  }, [refreshStories]);

  const getBadgeColor = (level: string) => {
    const colors = {
      bronze: "from-amber-700 to-amber-500",
      silver: "from-gray-400 to-gray-200",
      gold: "from-yellow-500 to-yellow-300",
      platinum: "from-blue-400 to-purple-500",
    };
    return colors[level as keyof typeof colors] || colors.bronze;
  };

  // Check if it's someone's birthday
  const isBirthday = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return false;
    const today = new Date();
    const birthday = new Date(dateOfBirth);
    
    // Use UTC to avoid timezone issues
    const todayMonth = today.getUTCMonth();
    const todayDate = today.getUTCDate();
    const birthdayMonth = birthday.getUTCMonth();
    const birthdayDate = birthday.getUTCDate();
    
    return birthdayMonth === todayMonth && birthdayDate === todayDate;
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

  // Show skeletons only on very first load when no cached data exists
  // Otherwise show stale data immediately while refreshing in background
  const showSkeleton = (isLoading || storiesLoading) && stories.length === 0 && feed.length === 0;
  
  if (showSkeleton) {
    return (
      <div className="min-h-screen pb-20 pt-16">
        <TopNav isVisible={showTopNav} />
        <StorySkeleton />
        <FeedSkeleton />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 pt-16">
      <TopNav isVisible={showTopNav} />

      {/* Stories */}
      <div className="px-3 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3">
          {/* Your Story */}
          <div className="flex flex-col items-center gap-1.5 min-w-fit">
            <BirthdayFireworks isBirthday={currentUser?.date_of_birth ? isBirthday(currentUser.date_of_birth) : false}>
              <div className="relative overflow-visible">
                {/* White glow when has active story - constant until expires */}
                {userHasStory && (
                  <div className="absolute inset-0 rounded-full bg-white/50 blur-md scale-110" />
                )}
                <button
                  onClick={() => navigate(userHasStory ? `/story/${user?.id}` : "/story-options")}
                  className={`relative group ${userHasStory ? 'ring-2 ring-white/80 rounded-full' : ''}`}
                >
                  <Avatar className="w-[88px] h-[88px] rounded-full">
                    <AvatarImage src={currentUser?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-xl">{currentUser?.username?.[0] || "Y"}</AvatarFallback>
                  </Avatar>
                  {!userHasStory && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-md z-10 cursor-pointer">
                          <span className="text-primary-foreground text-sm font-bold leading-none">+</span>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44 bg-black/80 border-0">
                        <DropdownMenuItem onClick={() => navigate("/create/story")} className="cursor-pointer text-white/90">
                          <Camera className="w-4 h-4 mr-2 opacity-70" />
                          Story
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowStatusDialog(true)} className="cursor-pointer text-white/90">
                          <MessageCircle className="w-4 h-4 mr-2 opacity-70" />
                          Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowMusicDialog(true)} className="cursor-pointer text-white/90">
                          <Music className="w-4 h-4 mr-2 opacity-70" />
                          Music
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {currentUser?.date_of_birth && isBirthday(currentUser.date_of_birth) && (
                    <div className="absolute -top-1 -right-1 text-base z-10">🎂</div>
                  )}
                </button>
                {/* Add more button when story exists */}
                {userHasStory && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-md z-20 active:scale-95 transition-transform"
                      >
                        <span className="text-primary-foreground text-base font-bold leading-none">+</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 bg-black/80 border-0">
                      <DropdownMenuItem onClick={() => navigate("/create/story")} className="cursor-pointer text-white/90">
                        <Camera className="w-4 h-4 mr-2 opacity-70" />
                        Story
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowStatusDialog(true)} className="cursor-pointer text-white/90">
                        <MessageCircle className="w-4 h-4 mr-2 opacity-70" />
                        Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowMusicDialog(true)} className="cursor-pointer text-white/90">
                        <Music className="w-4 h-4 mr-2 opacity-70" />
                        Music
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </BirthdayFireworks>
            <span className="text-xs text-muted-foreground font-medium">Your Story</span>
          </div>

          {/* Other Stories - Live Preview (exclude current user's stories) */}
          {stories.filter(s => s.user_id !== user?.id).map((story) => {
            const isViewed = viewedStories.has(story.id);
            const hasBirthday = isBirthday(story.profiles.date_of_birth);
            const previewMedia = story.media_urls?.[0];
            const previewType = story.media_types?.[0];
            const isVideo = previewType?.startsWith('video');
            
            return (
              <div key={story.id} className="flex flex-col items-center gap-1.5 min-w-[92px] pt-4">
                <BirthdayFireworks isBirthday={hasBirthday}>
                  <div className="relative">
                    {/* User Status Indicator */}
                    <UserStatusIndicator userId={story.user_id} size="sm" />
                    
                    <button 
                      onClick={() => navigate(`/story/${story.user_id}`)}
                      className="relative group cursor-pointer"
                    >
                      {/* White glow for new/unviewed stories - constant until viewed */}
                      {!isViewed && (
                        <>
                          <div className="absolute -inset-2 rounded-full bg-white/60 blur-lg" />
                          <div className="absolute -inset-1 rounded-full bg-white/50 blur-sm" />
                        </>
                      )}
                      
                      {/* Live Preview Content */}
                      <div className={`w-[88px] h-[88px] rounded-full overflow-hidden relative shadow-lg ${!isViewed ? 'ring-2 ring-white/80' : ''}`}>
                        {previewMedia ? (
                          <>
                            {isVideo ? (
                              <video
                                src={previewMedia}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                src={previewMedia}
                                alt={story.profiles.username}
                                className="w-full h-full object-cover"
                              />
                            )}
                            
                            {/* Video indicator */}
                            {isVideo && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[5px] border-l-white border-y-[3px] border-y-transparent ml-0.5" />
                              </div>
                            )}
                          </>
                        ) : (
                          <Avatar className="w-full h-full rounded-full">
                            <AvatarImage src={story.profiles.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="text-lg">{story.profiles.username[0]}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      
                      {/* Birthday badge */}
                      {hasBirthday && (
                        <div className="absolute -top-1 -right-1 text-base z-10">🎂</div>
                      )}
                    </button>
                  </div>
                </BirthdayFireworks>
                <span className="text-xs text-foreground/90 font-medium truncate w-full text-center max-w-[80px]">
                  {story.profiles.username}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Events Ticker - lazy loaded */}
      {selectedRegion && (
        <Suspense fallback={null}>
          <div className="px-4">
            <EventsTicker region={selectedRegion} />
          </div>
        </Suspense>
      )}

      {/* Feed */}
      <div className="space-y-6">
        {filteredFeed.length > 0 ? (
          filteredFeed.map((item) => (
            <FeedItem
              key={item.id}
              item={item}
              currentUserId={currentUser?.id}
              isLiked={item.type === 'post' ? postEngagement.isLiked(item.id) : reelEngagement.isLiked(item.id)}
              isSaved={item.type === 'post' ? postEngagement.isSaved(item.id) : reelEngagement.isSaved(item.id)}
              isReposted={item.type === 'post' ? postEngagement.isReposted(item.id) : reelEngagement.isReposted(item.id)}
              mutedVideos={mutedVideos}
              onLike={() => item.type === 'post' ? postEngagement.toggleLike(item.id) : reelEngagement.toggleLike(item.id)}
              onSave={() => item.type === 'post' ? postEngagement.toggleSave(item.id) : reelEngagement.toggleSave(item.id)}
              onRepost={() => item.type === 'post' ? postEngagement.toggleRepost(item.id) : reelEngagement.toggleRepost(item.id)}
              onDelete={() => item.type === 'post' ? handleDeletePost(item.id) : handleDeleteReel(item.id)}
              onEdit={() => item.type === 'post' ? navigate(`/edit-post/${item.id}`) : navigate(`/edit-reel/${item.id}`)}
              onComment={() => {}}
              onShare={() => {
                setSelectedPostId(item.id);
                setSelectedPostType(item.type);
                setSelectedMediaUrls(item.media_urls || []);
                setShareDialogOpen(true);
              }}
              onToggleMute={handleToggleMute}
              onFullscreen={() => {
                if (item.type === 'reel') {
                  navigate('/reels', { state: { scrollToReelId: item.id, reelData: item } });
                }
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

      <Suspense fallback={null}>
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          postId={selectedPostId}
          postContent=""
          postType={selectedPostType}
          mediaUrls={selectedMediaUrls}
        />
      </Suspense>
      

      <Suspense fallback={null}>
        <LikesDialog
          open={showLikes}
          onOpenChange={setShowLikes}
          postId={selectedLikesPostId}
          isReel={isReelLikes}
        />
      </Suspense>

      {/* Status and Music Dialogs */}
      <Suspense fallback={null}>
        {showStatusDialog && (
          <CreateStatusDialog
            open={showStatusDialog}
            onOpenChange={setShowStatusDialog}
            userId={user?.id}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {showMusicDialog && (
          <MusicStatusDialog
            open={showMusicDialog}
            onOpenChange={setShowMusicDialog}
          />
        )}
      </Suspense>

      <BottomNav />
    </div>
  );
};

export default Home;
