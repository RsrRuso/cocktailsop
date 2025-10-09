import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Wine, Briefcase, ChefHat, Warehouse, Truck, Building2, Star, Trash2, Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FollowersDialog from "@/components/FollowersDialog";
import FollowingDialog from "@/components/FollowingDialog";

interface Profile {
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  professional_title: string | null;
  badge_level: string;
  follower_count: number;
  following_count: number;
  post_count: number;
}

interface Story {
  id: string;
  media_urls: string[];
  media_types: string[];
  created_at: string;
  expires_at: string;
}

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
}

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    fetchProfile();
    fetchStories();
    fetchPosts();
    fetchReels();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setCoverUrl(data.cover_url || "");
      setCurrentUserId(user.id);
      
      // Preload story images for instant display
      fetchStories();
    }
  };

  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  const fetchReels = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("reels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setReels(data);
  };

  const fetchStories = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      // Preload all story images immediately for instant display
      data.forEach(story => {
        story.media_urls?.forEach((url: string) => {
          const img = new Image();
          img.src = url;
        });
      });
      setStories(data);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      // Get the story first to delete media from storage
      const { data: story } = await supabase
        .from("stories")
        .select("media_urls")
        .eq("id", storyId)
        .single();

      // Delete from database
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", storyId);

      if (error) throw error;

      // Delete media files from storage
      if (story?.media_urls) {
        const filePaths = story.media_urls.map((url: string) => {
          const urlParts = url.split('/stories/');
          return urlParts[1];
        }).filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage
            .from('stories')
            .remove(filePaths);
        }
      }

      toast.success("Story deleted");
      fetchStories();
    } catch (error) {
      console.error('Error deleting story:', error);
      toast.error("Failed to delete story");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
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

  const getProfessionalBadge = (title: string | null) => {
    if (!title) return { icon: Briefcase, gradient: "from-pink-600 to-orange-500", score: 0 };
    
    const badges: Record<string, { icon: any; gradient: string; score: number }> = {
      mixologist: { icon: Wine, gradient: "from-pink-600 to-orange-500", score: 94 },
      bartender: { icon: Wine, gradient: "from-blue-600 to-purple-500", score: 88 },
      sommelier: { icon: Wine, gradient: "from-orange-600 to-amber-700", score: 96 },
      bar_manager: { icon: Warehouse, gradient: "from-pink-500 to-orange-600", score: 92 },
      beverage_director: { icon: Building2, gradient: "from-purple-600 to-pink-500", score: 95 },
      consultant: { icon: Briefcase, gradient: "from-green-600 to-teal-500", score: 90 },
      brand_ambassador: { icon: Building2, gradient: "from-yellow-600 to-orange-500", score: 87 },
      manufacturer: { icon: Warehouse, gradient: "from-blue-600 to-cyan-500", score: 85 },
      distributor: { icon: Truck, gradient: "from-purple-600 to-indigo-500", score: 83 },
      investor: { icon: Building2, gradient: "from-green-600 to-emerald-600", score: 91 },
    };
    
    return badges[title] || { icon: Briefcase, gradient: "from-pink-600 to-orange-500", score: 75 };
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      {/* Cover Photo */}
      {coverUrl && (
        <div className="w-full h-48 overflow-hidden">
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 space-y-6" style={{ marginTop: coverUrl ? '-3rem' : '1.5rem' }}>
        {/* Profile Header */}
        <div className="glass rounded-xl p-4 space-y-6 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className={`w-24 h-24 avatar-glow ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(profile.badge_level)}`}>
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">{profile.username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                <p className="text-muted-foreground">@{profile.username}</p>
                <p className="text-sm text-primary capitalize mt-1">
                  {profile.professional_title?.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="glass-hover"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          )}

          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold">{posts.length}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <button 
              className="text-center hover:opacity-70 transition-opacity"
              onClick={() => setShowFollowers(true)}
            >
              <p className="text-2xl font-bold">{profile.follower_count}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </button>
            <button 
              className="text-center hover:opacity-70 transition-opacity"
              onClick={() => setShowFollowing(true)}
            >
              <p className="text-2xl font-bold">{profile.following_count}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </button>
          </div>

          <Button 
            className="w-full glow-primary"
            onClick={() => navigate("/profile/edit")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            {posts.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center text-muted-foreground border border-border/50">
                <p>No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="glass rounded-xl p-4 space-y-3 border border-border/50">
                    {post.content && <p className="text-sm">{post.content}</p>}
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className={`grid gap-2 ${post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {post.media_urls.map((url, idx) => (
                          <img key={idx} src={url} alt="Post" className="w-full rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> {post.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {post.comment_count || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stories" className="mt-4">
            {stories.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center text-muted-foreground border border-border/50">
                <p>No active stories</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {stories.map((story) => (
                  <div key={story.id} className="relative glass rounded-xl overflow-hidden group">
                    <img 
                      src={story.media_urls[0]} 
                      alt="Story" 
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => navigate(`/story/${currentUserId}`)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(story.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {story.media_urls.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {story.media_urls.length} items
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-4">
            {reels.length === 0 ? (
              <div className="glass rounded-xl p-4 text-center text-muted-foreground border border-border/50">
                <p>No reels yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {reels.map((reel) => (
                  <div 
                    key={reel.id} 
                    className="aspect-[9/16] relative overflow-hidden cursor-pointer group"
                    onClick={() => navigate('/reels')}
                  >
                    <video
                      src={reel.video_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 left-2 right-2 space-y-1">
                        {reel.caption && (
                          <p className="text-xs text-white line-clamp-2">{reel.caption}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-white">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {reel.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {reel.comment_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="growth" className="mt-4 space-y-4">
            <div className="glass rounded-xl p-4 space-y-6 border border-border/50">
              <div>
                <h3 className="font-bold text-2xl mb-2">Professional Badge System</h3>
                <p className="text-sm text-muted-foreground">
                  Dynamic badges that evolve with your career, verified achievements, and professional growth.
                </p>
              </div>

              {profile.professional_title && (() => {
                const badge = getProfessionalBadge(profile.professional_title);
                const BadgeIcon = badge.icon;
                return (
                  <div className="relative">
                    <div className={`glass-hover rounded-3xl p-8 bg-gradient-to-br ${badge.gradient} relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-105`}>
                      <div className="absolute top-4 right-4 flex gap-2">
                        {badge.score >= 90 && (
                          <>
                            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                              <Star className="w-4 h-4 fill-yellow-900 text-yellow-900" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                              <Star className="w-4 h-4 fill-yellow-900 text-yellow-900" />
                            </div>
                          </>
                        )}
                        {badge.score >= 85 && badge.score < 90 && (
                          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                            <Star className="w-4 h-4 fill-yellow-900 text-yellow-900" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-2xl">
                          <BadgeIcon className="w-16 h-16 text-white" strokeWidth={1.5} />
                        </div>
                        
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                          <span className="text-2xl font-bold text-white">{badge.score}</span>
                        </div>
                        
                        <h4 className="text-2xl font-bold text-white mt-4 capitalize">
                          {profile.professional_title.replace(/_/g, " ")}
                        </h4>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Career Metrics</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center glass rounded-lg p-3 border border-border/50">
                    <span className="text-sm text-muted-foreground">Badge Level</span>
                    <Badge className={`bg-gradient-to-r ${getBadgeColor(profile.badge_level)} border-0 text-white capitalize`}>
                      {profile.badge_level}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center glass rounded-lg p-3 border border-border/50">
                    <span className="text-sm text-muted-foreground">Network Reach</span>
                    <span className="text-sm font-semibold">{profile.follower_count + profile.following_count}</span>
                  </div>
                  <div className="flex justify-between items-center glass rounded-lg p-3 border border-border/50">
                    <span className="text-sm text-muted-foreground">Professional Score</span>
                    <span className="text-sm font-semibold text-primary">{getProfessionalBadge(profile.professional_title).score}/100</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      <FollowersDialog
        open={showFollowers}
        onOpenChange={setShowFollowers}
        userId={currentUserId}
      />

      <FollowingDialog
        open={showFollowing}
        onOpenChange={setShowFollowing}
        userId={currentUserId}
      />
    </div>
  );
};

export default Profile;
