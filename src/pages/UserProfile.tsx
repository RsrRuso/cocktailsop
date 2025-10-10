import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wine, Briefcase, Warehouse, Truck, Building2, Star, Heart, MessageCircle, Volume2, VolumeX, Play, Award, TrendingUp, Target, CheckCircle } from "lucide-react";
import FollowersDialog from "@/components/FollowersDialog";
import FollowingDialog from "@/components/FollowingDialog";
import { VenueVerification } from "@/components/VenueVerification";
import BadgeInfoDialog from "@/components/BadgeInfoDialog";
import CareerMetricsDialog from "@/components/CareerMetricsDialog";

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
  is_founder: boolean;
  is_verified: boolean;
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

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<"network" | "professional" | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfile();
      checkFollowStatus();
      fetchPosts();
      fetchReels();
    }
  }, [userId]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) setProfile(data);
  };

  const checkFollowStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const fetchPosts = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
  };

  const fetchReels = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("reels")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setReels(data);
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);
      
      // Decrement follower count for the followed user
      if (profile) {
        await supabase
          .from("profiles")
          .update({ follower_count: Math.max(0, profile.follower_count - 1) })
          .eq("id", userId);
      }
      
      // Decrement following count for current user
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("following_count")
        .eq("id", user.id)
        .single();
      
      if (currentProfile) {
        await supabase
          .from("profiles")
          .update({ following_count: Math.max(0, currentProfile.following_count - 1) })
          .eq("id", user.id);
      }
      
      setIsFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      // Increment follower count for the followed user
      if (profile) {
        await supabase
          .from("profiles")
          .update({ follower_count: profile.follower_count + 1 })
          .eq("id", userId);
      }
      
      // Increment following count for current user
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("following_count")
        .eq("id", user.id)
        .single();
      
      if (currentProfile) {
        await supabase
          .from("profiles")
          .update({ following_count: currentProfile.following_count + 1 })
          .eq("id", user.id);
      }
      
      setIsFollowing(true);
    }
    fetchProfile();
  };

  const handleMessage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userId) return;

    // Check if conversation already exists
    const { data: existingConversations } = await supabase
      .from("conversations")
      .select("*")
      .contains("participant_ids", [user.id])
      .contains("participant_ids", [userId]);

    let conversationId;

    if (existingConversations && existingConversations.length > 0) {
      conversationId = existingConversations[0].id;
    } else {
      // Create new conversation
      const { data: newConversation } = await supabase
        .from("conversations")
        .insert({ participant_ids: [user.id, userId] })
        .select()
        .single();
      
      conversationId = newConversation?.id;
    }

    if (conversationId) {
      navigate(`/messages/${conversationId}`);
    }
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

  const calculateNetworkReach = () => {
    if (!profile) return 0;
    
    // Base reach from followers (most important - direct audience)
    const followerReach = profile.follower_count * 1.5;
    
    // Secondary reach from following (networking)
    const followingReach = profile.following_count * 0.5;
    
    // Engagement multiplier from posts
    const totalPostEngagement = posts.reduce((sum, post) => sum + (post.like_count || 0) + (post.comment_count || 0), 0);
    const postEngagementBonus = Math.min(totalPostEngagement * 0.3, 500); // Cap at 500
    
    // View count from reels
    const totalReelViews = reels.reduce((sum, reel) => sum + (reel.view_count || 0), 0);
    const reelViewBonus = Math.min(totalReelViews * 0.1, 300); // Cap at 300
    
    const totalReach = Math.round(followerReach + followingReach + postEngagementBonus + reelViewBonus);
    return totalReach;
  };

  const calculateProfessionalScore = () => {
    if (!profile) return 0;
    
    // Base score from professional title (60% of total)
    const baseScore = getProfessionalBadge(profile.professional_title).score * 0.6;
    
    // Status bonuses
    let statusBonus = 0;
    if (profile.is_founder) statusBonus += 10;
    if (profile.is_verified) statusBonus += 8;
    
    // Badge level bonus
    const badgeBonus = {
      bronze: 0,
      silver: 5,
      gold: 10,
      platinum: 15
    }[profile.badge_level as string] || 0;
    
    // Content quality score (based on engagement rate)
    const avgPostEngagement = posts.length > 0 
      ? posts.reduce((sum, post) => sum + (post.like_count || 0) + (post.comment_count || 0), 0) / posts.length 
      : 0;
    const engagementScore = Math.min(avgPostEngagement * 0.5, 10); // Cap at 10 points
    
    // Activity score (having diverse content)
    let activityBonus = 0;
    if (posts.length > 0) activityBonus += 3;
    if (reels.length > 0) activityBonus += 3;
    
    const totalScore = Math.min(Math.round(baseScore + statusBonus + badgeBonus + engagementScore + activityBonus), 100);
    return totalScore;
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      {/* Cover Photo */}
      {profile.cover_url && (
        <div className="w-full h-48 overflow-hidden">
          <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 space-y-6" style={{ marginTop: profile.cover_url ? '-3rem' : '1.5rem' }}>
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="glass-hover"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

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

          <div className="flex gap-3">
            <Button 
              className={`flex-1 ${isFollowing ? 'glass-hover' : 'glow-primary'}`}
              variant={isFollowing ? 'outline' : 'default'}
              onClick={handleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button 
              className="flex-1 glass-hover"
              variant="outline"
              onClick={handleMessage}
            >
              Message
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass">
            <TabsTrigger value="posts">Posts</TabsTrigger>
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
                      {profile.is_founder && (
                        <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                          Founder
                        </span>
                      )}
                      {profile.is_verified && !profile.is_founder && (
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
                    <span className="text-sm font-semibold group-hover:scale-105 transition-transform">{calculateNetworkReach().toLocaleString()}</span>
                  </div>
                  <div 
                    className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => {
                      setSelectedMetric("professional");
                      setMetricsDialogOpen(true);
                    }}
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Professional Score</span>
                    <span className="text-sm font-semibold text-primary group-hover:scale-105 transition-transform">{calculateProfessionalScore()}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue Verification */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
              <VenueVerification userId={userId || ""} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      <FollowersDialog
        open={showFollowers}
        onOpenChange={setShowFollowers}
        userId={userId || ""}
      />

      <FollowingDialog
        open={showFollowing}
        onOpenChange={setShowFollowing}
        userId={userId || ""}
      />

      <BadgeInfoDialog
        open={badgeDialogOpen}
        onOpenChange={setBadgeDialogOpen}
        isFounder={profile?.is_founder}
        isVerified={profile?.is_verified}
        badgeLevel={profile?.badge_level as any}
        username={profile?.username}
        isOwnProfile={false}
      />

      <CareerMetricsDialog
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
        metricType={selectedMetric}
        currentValue={selectedMetric === "network" ? calculateNetworkReach() : calculateProfessionalScore()}
      />
    </div>
  );
};

export default UserProfile;