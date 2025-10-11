import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LogOut, Settings, Star, Trash2, Heart, MessageCircle, Volume2, VolumeX, Play, Phone, MessageSquare, Globe, Award, TrendingUp, Target, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FollowersDialog from "@/components/FollowersDialog";
import FollowingDialog from "@/components/FollowingDialog";
import { VenueVerification } from "@/components/VenueVerification";
import BadgeInfoDialog from "@/components/BadgeInfoDialog";
import CareerMetricsDialog from "@/components/CareerMetricsDialog";
import { getBadgeColor, getProfessionalBadge, calculateNetworkReach, calculateProfessionalScore } from "@/lib/profileUtils";

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
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_website: boolean;
}

interface UserRoles {
  isFounder: boolean;
  isVerified: boolean;
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
  const [userRoles, setUserRoles] = useState<UserRoles>({ isFounder: false, isVerified: false });
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<"network" | "professional" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      
      setCurrentUserId(user.id);
      await Promise.all([
        fetchProfile(user.id),
        fetchStories(user.id),
        fetchPosts(user.id),
        fetchReels(user.id)
      ]);
      setIsLoading(false);
    };
    
    initializeProfile();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setCoverUrl(data.cover_url || "");
      
      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.id);
      
      if (rolesData) {
        setUserRoles({
          isFounder: rolesData.some(r => r.role === 'founder'),
          isVerified: rolesData.some(r => r.role === 'verified')
        });
      }
    }
  };

  const fetchPosts = async (userId: string) => {
    const { data } = await supabase
      .from("posts")
      .select("id, content, media_urls, like_count, comment_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (data) setPosts(data);
  };

  const fetchReels = async (userId: string) => {
    const { data } = await supabase
      .from("reels")
      .select("id, video_url, caption, like_count, comment_count, view_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12);

    if (data) setReels(data);
  };

  const fetchStories = async (uid?: string) => {
    const userIdToUse = uid || currentUserId;
    if (!userIdToUse) return;

    const { data } = await supabase
      .from("stories")
      .select("id, media_urls, media_types, created_at, expires_at")
      .eq("user_id", userIdToUse)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(6);

    if (data) setStories(data);
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


  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="px-4 py-6 space-y-6">
          <div className="glass rounded-xl p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

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
              <Avatar 
                className={`w-24 h-24 avatar-glow ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(profile.badge_level)} cursor-pointer transition-transform hover:scale-105 ${stories.length > 0 ? 'ring-4 ring-primary' : ''}`}
                onClick={() => {
                  if (stories.length > 0) {
                    navigate(`/story/${currentUserId}`);
                  } else {
                    setShowAvatarDialog(true);
                  }
                }}
              >
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

          {/* Contact Links */}
          {(profile.show_phone && profile.phone) || (profile.show_whatsapp && profile.whatsapp) || (profile.show_website && profile.website) ? (
            <div className="flex flex-wrap gap-2">
              {profile.show_phone && profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{profile.phone}</span>
                </a>
              )}
              {profile.show_whatsapp && profile.whatsapp && (
                <a
                  href={`https://wa.me/${profile.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span>WhatsApp</span>
                </a>
              )}
              {profile.show_website && profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors"
                >
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Website</span>
                </a>
              )}
            </div>
          ) : null}

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
                  >
                    <video
                      src={reel.video_url}
                      className="w-full h-full object-cover"
                      muted={!mutedVideos.has(reel.id)}
                      playsInline
                      loop
                      autoPlay
                      onClick={() => navigate('/reels')}
                    />
                    
                    {/* View Count - Always Visible */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-sm font-semibold drop-shadow-lg z-10">
                      <Play className="w-4 h-4 fill-white" />
                      <span>{reel.view_count || 0}</span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMutedVideos(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(reel.id)) {
                            newSet.delete(reel.id);
                          } else {
                            newSet.add(reel.id);
                          }
                          return newSet;
                        });
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 z-10"
                    >
                      {mutedVideos.has(reel.id) ? (
                        <Volume2 className="w-3 h-3 text-white" />
                      ) : (
                        <VolumeX className="w-3 h-3 text-white" />
                      )}
                    </button>
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
            {/* Professional Growth Guidelines */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-bold text-lg">Professional Growth Guidelines</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Verify Your Work Experience</p>
                    <p className="text-xs text-muted-foreground">Add venues where you've worked to build credibility</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Build Your Network</p>
                    <p className="text-xs text-muted-foreground">Connect with industry professionals to increase your reach</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Showcase Your Skills</p>
                    <p className="text-xs text-muted-foreground">Share posts and reels demonstrating your expertise</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Badge with 3D Green Effect */}
            <div className="glass rounded-xl p-4 space-y-6 border border-border/50">
              <div>
                <h3 className="font-bold text-2xl mb-2">Professional Badge</h3>
                <p className="text-sm text-muted-foreground">
                  Your badge evolves with verified experience and achievements
                </p>
              </div>

              {profile.professional_title && (() => {
                const badge = getProfessionalBadge(profile.professional_title);
                const BadgeIcon = badge.icon;
                return (
                  <div className="relative">
                    <div className="relative rounded-3xl p-8 bg-gradient-to-br from-green-600 via-emerald-500 to-green-400 overflow-hidden group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                         style={{
                           boxShadow: '0 20px 60px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                           transform: 'perspective(1000px) rotateX(2deg)',
                         }}>
                      {/* 3D Effect Layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                      <div className="absolute -inset-4 bg-gradient-to-r from-green-400/30 via-emerald-400/30 to-green-500/30 blur-xl group-hover:blur-2xl transition-all duration-500" 
                           style={{ zIndex: -1 }} />
                      
                      {/* Stars */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        {badge.score >= 90 && (
                          <>
                            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg"
                                 style={{ boxShadow: '0 4px 12px rgba(250, 204, 21, 0.6)' }}>
                              <Star className="w-4 h-4 fill-yellow-900 text-yellow-900" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg"
                                 style={{ boxShadow: '0 4px 12px rgba(250, 204, 21, 0.6)' }}>
                              <Star className="w-4 h-4 fill-yellow-900 text-yellow-900" />
                            </div>
                          </>
                        )}
                        {badge.score >= 85 && badge.score < 90 && (
                          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg"
                               style={{ boxShadow: '0 4px 12px rgba(250, 204, 21, 0.6)' }}>
                            <Star className="w-4 h-4 fill-yellow-900 text-yellow-900" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center relative">
                        {/* Icon Container with 3D Effect */}
                        <div className="w-32 h-32 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center mb-4 relative"
                             style={{
                               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
                               transform: 'translateZ(20px)',
                             }}>
                          <BadgeIcon className="w-16 h-16 text-white drop-shadow-lg" strokeWidth={1.5} />
                        </div>
                        
                        {/* Score Badge with 3D Green Effect */}
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center relative group-hover:scale-110 transition-transform duration-300"
                             style={{
                               boxShadow: '0 10px 25px rgba(34, 197, 94, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                               transform: 'translateZ(30px)',
                             }}>
                          <span className="text-3xl font-bold text-white drop-shadow-lg">{badge.score}</span>
                        </div>
                        
                        <h4 className="text-2xl font-bold text-white mt-4 capitalize drop-shadow-lg">
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
                  <div 
                    className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => setBadgeDialogOpen(true)}
                  >
                    <span className="text-sm text-muted-foreground">Badge Status</span>
                    <div className="flex items-center gap-2">
                      {userRoles.isFounder && (
                        <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                          Founder
                        </span>
                      )}
                      {userRoles.isVerified && !userRoles.isFounder && (
                        <span className="text-xs font-semibold text-primary">
                          Verified
                        </span>
                      )}
                      <Badge className={`bg-gradient-to-r ${getBadgeColor(profile.badge_level)} border-0 text-white capitalize group-hover:scale-105 transition-transform`}>
                        {profile.badge_level}
                      </Badge>
                    </div>
                  </div>
                  <div 
                    className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => {
                      setSelectedMetric("network");
                      setMetricsDialogOpen(true);
                    }}
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Network Reach</span>
                    <span className="text-sm font-semibold group-hover:scale-105 transition-transform">{profile ? calculateNetworkReach(profile, posts, reels).toLocaleString() : 0}</span>
                  </div>
                  <div 
                    className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => {
                      setSelectedMetric("professional");
                      setMetricsDialogOpen(true);
                    }}
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Professional Score</span>
                    <span className="text-sm font-semibold text-primary group-hover:scale-105 transition-transform">{profile ? calculateProfessionalScore(profile, userRoles, posts, reels, stories) : 0}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Verification */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
              <VenueVerification userId={currentUserId} />
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

      <BadgeInfoDialog
        open={badgeDialogOpen}
        onOpenChange={setBadgeDialogOpen}
        isFounder={userRoles.isFounder}
        isVerified={userRoles.isVerified}
        badgeLevel={profile?.badge_level as any}
        username={profile?.username}
        isOwnProfile={true}
      />

      <CareerMetricsDialog
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
        metricType={selectedMetric}
        currentValue={selectedMetric === "network" ? (profile ? calculateNetworkReach(profile, posts, reels) : 0) : (profile ? calculateProfessionalScore(profile, userRoles, posts, reels, stories) : 0)}
      />

      {/* Avatar Photo Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative w-full aspect-square flex items-center justify-center">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-9xl font-bold text-white/80">{profile.username[0]}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
