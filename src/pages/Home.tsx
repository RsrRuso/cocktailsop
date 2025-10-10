import { useState, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ShareDialog from "@/components/ShareDialog";
import CommentsDialog from "@/components/CommentsDialog";
import OptimizedAvatar from "@/components/OptimizedAvatar";

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [selectedPostContent, setSelectedPostContent] = useState("");
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'reel'>('post');
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());

  // Fetch current user with aggressive caching
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    staleTime: Infinity, // User profile rarely changes
  });

  // Fetch stories
  const { data: stories = [] } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stories')
        .select('*, profiles(username, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch feed data
  const { data: feedData } = useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      const [postsRes, reelsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*, profiles(username, full_name, avatar_url, professional_title, badge_level, region)')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('reels')
          .select('*, profiles(username, full_name, avatar_url, professional_title, badge_level, region)')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      const posts = postsRes.data || [];
      const reels = reelsRes.data || [];

      return {
        posts,
        reels,
        feed: [
          ...posts.map(p => ({ ...p, type: 'post' as const })),
          ...reels.map(r => ({ ...r, type: 'reel' as const, content: r.caption, media_urls: [r.video_url] }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      };
    },
    staleTime: 3 * 60 * 1000,
  });

  // Fetch likes
  const { data: likesData } = useQuery({
    queryKey: ['likes', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return { posts: new Set(), reels: new Set() };
      
      const [postLikes, reelLikes] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', currentUser.id),
        supabase.from('reel_likes').select('reel_id').eq('user_id', currentUser.id),
      ]);

      return {
        posts: new Set(postLikes.data?.map(l => l.post_id) || []),
        reels: new Set(reelLikes.data?.map(l => l.reel_id) || []),
      };
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const feed = feedData?.feed || [];
  const likedPosts = likesData?.posts || new Set();
  const likedReels = likesData?.reels || new Set();

  // Optimistic like post mutation
  const likePostMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser!.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: currentUser!.id });
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      // Optimistic update
      queryClient.setQueryData(['likes', currentUser?.id], (old: any) => {
        const newPosts = new Set(old?.posts || []);
        isLiked ? newPosts.delete(postId) : newPosts.add(postId);
        return { ...old, posts: newPosts };
      });
    },
  });

  // Optimistic like reel mutation
  const likeReelMutation = useMutation({
    mutationFn: async ({ reelId, isLiked }: { reelId: string; isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from('reel_likes').delete().eq('reel_id', reelId).eq('user_id', currentUser!.id);
      } else {
        await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: currentUser!.id });
      }
    },
    onMutate: async ({ reelId, isLiked }) => {
      queryClient.setQueryData(['likes', currentUser?.id], (old: any) => {
        const newReels = new Set(old?.reels || []);
        isLiked ? newReels.delete(reelId) : newReels.add(reelId);
        return { ...old, reels: newReels };
      });
    },
  });

  const handleLikePost = useCallback((postId: string) => {
    if (!currentUser) {
      toast.error("Please login to like posts");
      return;
    }
    const isLiked = likedPosts.has(postId);
    likePostMutation.mutate({ postId, isLiked });
  }, [currentUser, likedPosts, likePostMutation]);

  const handleLikeReel = useCallback((reelId: string) => {
    if (!currentUser) {
      toast.error("Please login to like reels");
      return;
    }
    const isLiked = likedReels.has(reelId);
    likeReelMutation.mutate({ reelId, isLiked });
  }, [currentUser, likedReels, likeReelMutation]);

  const getBadgeColor = useCallback((level: string) => {
    const colors = {
      bronze: "from-amber-700 to-amber-500",
      silver: "from-gray-400 to-gray-200",
      gold: "from-yellow-500 to-yellow-300",
      platinum: "from-blue-400 to-purple-500",
    };
    return colors[level as keyof typeof colors] || colors.bronze;
  }, []);

  const handleDeletePost = async (postId: string) => {
    toast.success("Post deleted");
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    await supabase.from("posts").delete().eq("id", postId);
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

  const filteredFeed = useMemo(() => 
    selectedRegion && selectedRegion !== "All" 
      ? feed.filter(item => item.profiles?.region === selectedRegion || item.profiles?.region === "All")
      : feed,
    [feed, selectedRegion]
  );

  return (
    <div className="min-h-screen pb-20 pt-16">
      <TopNav />

      {/* Stories */}
      <div className="px-4 py-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <button onClick={() => navigate("/story-options")} className="relative group">
              <div className="w-16 h-16 rounded-full glass border-2 border-border flex items-center justify-center">
                <OptimizedAvatar
                  src={currentUser?.avatar_url}
                  alt="You"
                  className="w-14 h-14"
                />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background glow-primary">
                <span className="text-white text-lg font-bold">+</span>
              </div>
            </button>
            <span className="text-xs text-muted-foreground">Your Story</span>
          </div>

          {stories.map((story: any) => (
            <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px]">
              <button 
                onClick={() => navigate(`/story/${story.user_id}`)}
                className="relative group"
              >
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-75 blur group-hover:opacity-100 transition-all animate-pulse" />
                <div className="relative rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-xl">
                  <div className="bg-background rounded-full p-0.5">
                    <OptimizedAvatar
                      src={story.profiles.avatar_url}
                      alt={story.profiles.username}
                      className="w-16 h-16"
                    />
                  </div>
                </div>
              </button>
              <span className="text-xs font-medium truncate w-full text-center">
                {story.profiles.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Region Filter */}
      <div className="px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold">
                    {selectedRegion ? `${regions.find(r => r.name === selectedRegion)?.flag} ${selectedRegion}` : 'Explore by Region'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedRegion ? 'Regional content' : 'Worldwide'}
                  </p>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[calc(100vw-2rem)] glass">
            <div className="grid grid-cols-2 gap-2 p-2">
              {regions.map((region) => (
                <DropdownMenuItem
                  key={region.name}
                  className={`cursor-pointer rounded-xl p-4 bg-gradient-to-br ${region.gradient} hover:scale-105`}
                  onClick={() => setSelectedRegion(region.name)}
                >
                  <div className="flex items-center gap-3 z-10">
                    <span className="text-3xl">{region.flag}</span>
                    <span className="text-sm font-bold text-white">{region.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Feed */}
      <div className="space-y-6 px-4">
        {filteredFeed.map((item: any) => (
          <div key={item.id} className="glass rounded-3xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/user/${item.user_id}`)}>
                <OptimizedAvatar
                  src={item.profiles?.avatar_url}
                  alt={item.profiles?.username}
                  className="w-10 h-10"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{item.profiles?.full_name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${getBadgeColor(item.profiles?.badge_level)} text-white font-bold`}>
                      {item.profiles?.badge_level?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">@{item.profiles?.username}</p>
                </div>
              </div>
              {currentUser && item.user_id === currentUser.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 hover:bg-primary/10 rounded-full">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass">
                    {item.type === 'post' && (
                      <DropdownMenuItem onClick={() => navigate(`/edit-post/${item.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDeletePost(item.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Content */}
            {item.content && <p className="text-sm">{item.content}</p>}

            {/* Media */}
            {item.type === 'post' && item.media_urls?.[0] && (
              <div className="rounded-2xl overflow-hidden">
                <img src={item.media_urls[0]} alt="Post" className="w-full object-cover max-h-96" loading="lazy" />
              </div>
            )}

            {item.type === 'reel' && (
              <div className="rounded-2xl overflow-hidden aspect-video relative">
                <video 
                  src={item.video_url} 
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  muted={!mutedVideos.has(item.id)}
                />
                <button
                  onClick={() => {
                    setMutedVideos(prev => {
                      const newSet = new Set(prev);
                      newSet.has(item.id) ? newSet.delete(item.id) : newSet.add(item.id);
                      return newSet;
                    });
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                >
                  {mutedVideos.has(item.id) ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white" />}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => item.type === 'post' ? handleLikePost(item.id) : handleLikeReel(item.id)}
                  className="flex items-center gap-2 group"
                >
                  <Heart className={`w-6 h-6 group-hover:scale-110 transition-all ${
                    (item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)) 
                      ? 'fill-red-500 text-red-500' 
                      : ''
                  }`} />
                  <span className="text-sm font-medium">{item.like_count || 0}</span>
                </button>
                <button 
                  onClick={() => {
                    setSelectedPostId(item.id);
                    setSelectedPostType(item.type);
                    setCommentsDialogOpen(true);
                  }}
                  className="flex items-center gap-2 group"
                >
                  <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-all" />
                  <span className="text-sm font-medium">{item.comment_count || 0}</span>
                </button>
              </div>
              <button 
                onClick={() => {
                  setSelectedPostId(item.id);
                  setSelectedPostContent(item.content || '');
                  setSelectedPostType(item.type);
                  setSelectedMediaUrls(item.media_urls || []);
                  setShareDialogOpen(true);
                }}
                className="p-2 hover:bg-primary/10 rounded-full"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
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
      />

      <BottomNav />
    </div>
  );
};

export default Home;
