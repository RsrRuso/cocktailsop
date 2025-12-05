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

import { FeedItem } from "@/components/FeedItem";
import { useFeedData } from "@/hooks/useFeedData";
import { useOptimisticLike } from "@/hooks/useOptimisticLike";
import { useManagerRole } from "@/hooks/useManagerRole";
import { EventsTicker } from "@/components/EventsTicker";
import BirthdayFireworks from "@/components/BirthdayFireworks";
import MusicStatusBubble from "@/components/MusicStatusBubble";
import StatusRing from "@/components/StatusRing";
import UserStatusIndicator from "@/components/UserStatusIndicator";
import { useUserStatus } from "@/hooks/useUserStatus";
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
  const [selectedRegion, setSelectedRegion] = useState<string | null>(() => {
    return localStorage.getItem('selectedRegion') || null;
  });
  const [showLikes, setShowLikes] = useState(false);
  const [selectedLikesPostId, setSelectedLikesPostId] = useState("");
  const [isReelLikes, setIsReelLikes] = useState(false);
  const { isManager } = useManagerRole();
  const [showTopNav, setShowTopNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  
  // Update currentUser when profile changes
  useEffect(() => {
    if (profile) setCurrentUser(profile);
  }, [profile]);

  // Use cached user ID for hooks
  const { posts, reels, isLoading, refreshFeed, setPosts, setReels } = useFeedData(selectedRegion);
  const { likedItems: likedPosts, toggleLike: togglePostLike, fetchLikedItems: fetchLikedPosts } = useOptimisticLike('post', user?.id);
  const { likedItems: likedReels, toggleLike: toggleReelLike, fetchLikedItems: fetchLikedReels } = useOptimisticLike('reel', user?.id);
  
  // Get current user's status (including music status)
  const { data: currentUserStatus } = useUserStatus(user?.id);


  
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

  useEffect(() => {
    fetchStories();
    if (user?.id) {
      fetchLikedPosts();
      fetchLikedReels();
    }

    // Subscribe to count changes - FORCE refresh to bypass cache
    const postsChannel = supabase
      .channel('posts-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => refreshFeed(true))
      .subscribe();

    const reelsChannel = supabase
      .channel('reels-comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reels' }, () => refreshFeed(true))
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
      // Check if current user has an active story
      if (user?.id) {
        const { data: userStory } = await supabase
          .from("stories")
          .select("id")
          .eq("user_id", user.id)
          .gt("expires_at", new Date().toISOString())
          .limit(1);
        
        setHasActiveStory(!!userStory && userStory.length > 0);
      }

      // Fetch stories WITHOUT profile join
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, media_urls, media_types")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data) return;

      // Fetch profiles separately with birthday info
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, date_of_birth')
        .in('id', userIds);

      // Map profiles to stories
      const storiesWithProfiles = data.map(story => ({
        ...story,
        profiles: profiles?.find(p => p.id === story.user_id) || { username: 'Unknown', avatar_url: null, date_of_birth: null }
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

  const handleLikePost = useCallback((postId: string) => {
    togglePostLike(postId); // Database trigger + real-time subscription handle counts
  }, [togglePostLike]);

  const handleLikeReel = useCallback((reelId: string) => {
    toggleReelLike(reelId); // Database trigger + real-time subscription handle counts
  }, [toggleReelLike]);

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

  return (
    <div className="min-h-screen pb-20 pt-16">
      <TopNav isVisible={showTopNav} />

      {/* Stories */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          {/* Your Story */}
          <div className="flex flex-col items-center gap-2 min-w-fit">
            <BirthdayFireworks isBirthday={currentUser?.date_of_birth ? isBirthday(currentUser.date_of_birth) : false}>
              <div className="relative overflow-visible">
                {/* White glow when has active story - constant until expires */}
                {hasActiveStory && (
                  <div className="absolute inset-0 rounded-full bg-white/50 blur-md scale-110" />
                )}
                <button
                  onClick={() => navigate(hasActiveStory ? `/story/${user?.id}` : "/story-options")}
                  className={`relative group ${hasActiveStory ? 'ring-2 ring-white/80 rounded-full' : ''}`}
                >
                  <Avatar className="w-[84px] h-[84px] rounded-full">
                    <AvatarImage src={currentUser?.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="text-xl">{currentUser?.username?.[0] || "Y"}</AvatarFallback>
                  </Avatar>
                  {!hasActiveStory && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-md z-10">
                      <span className="text-primary-foreground text-sm font-bold leading-none">+</span>
                    </div>
                  )}
                  {currentUser?.date_of_birth && isBirthday(currentUser.date_of_birth) && (
                    <div className="absolute -top-1 -right-1 text-base z-10">🎂</div>
                  )}
                </button>
                {/* Add more button when story exists */}
                {hasActiveStory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/story-options");
                    }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background shadow-md z-20 active:scale-95 transition-transform"
                  >
                    <span className="text-primary-foreground text-base font-bold leading-none">+</span>
                  </button>
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
              <div key={story.id} className="flex flex-col items-center gap-2 min-w-[90px] pt-5">
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
                      <div className={`w-[84px] h-[84px] rounded-full overflow-hidden relative shadow-lg ${!isViewed ? 'ring-2 ring-white/80' : ''}`}>
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

      {/* Events Ticker */}
      {selectedRegion && (
        <div className="px-4">
          <EventsTicker region={selectedRegion} />
        </div>
      )}

      {/* Feed */}
      <div className="space-y-6">
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
              onFullscreen={() => {
                if (item.type === 'reel') {
                  navigate('/reels', {
                    state: {
                      scrollToReelId: item.id,
                      reelData: item
                    }
                  });
                }
              }}
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


      <BottomNav />
    </div>
  );
};

export default Home;
