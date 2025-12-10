import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import MusicTicker from "@/components/MusicTicker";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Award, TrendingUp, Target, CheckCircle, Briefcase } from "lucide-react";
import FollowersDialog from "@/components/FollowersDialog";
import FollowingDialog from "@/components/FollowingDialog";
import { VenueVerification } from "@/components/VenueVerification";
import BadgeInfoDialog from "@/components/BadgeInfoDialog";
import CareerMetricsDialog from "@/components/CareerMetricsDialog";
import AvatarClickMenu from "@/components/AvatarClickMenu";
import { getBadgeColor, getProfessionalBadge, calculateNetworkReach, calculateProfessionalScore } from "@/lib/profileUtils";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { useCareerMetrics } from "@/hooks/useCareerMetrics";
import BirthdayConfetti from "@/components/BirthdayConfetti";
import BirthdayBadge from "@/components/BirthdayBadge";
import { useUserBirthday } from "@/hooks/useUserBirthday";
import { FeedItem } from "@/components/FeedItem";
import { useLike } from "@/hooks/useLike";

interface Profile {
  id: string;
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

interface UserRoles {
  isFounder: boolean;
  isVerified: boolean;
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

// UserProfileFeed component - uses FeedItem for consistent engagement logic
const UserProfileFeed = ({ 
  posts, 
  reels, 
  profile, 
  currentUserId, 
  mutedVideos, 
  setMutedVideos,
  navigate 
}: { 
  posts: Post[]; 
  reels: Reel[]; 
  profile: Profile;
  currentUserId?: string;
  mutedVideos: Set<string>;
  setMutedVideos: React.Dispatch<React.SetStateAction<Set<string>>>;
  navigate: (path: string, options?: any) => void;
}) => {
  const { likedItems: likedPosts, toggleLike: togglePostLike } = useLike('post', currentUserId);
  const { likedItems: likedReels, toggleLike: toggleReelLike } = useLike('reel', currentUserId);

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
  }, [setMutedVideos]);

  const feedItems = [...posts.map(p => ({ 
    ...p, 
    type: 'post' as const,
    profiles: {
      id: profile.id || '',
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      badge_level: profile.badge_level,
      professional_title: profile.professional_title
    }
  })), ...reels.map(r => ({ 
    ...r, 
    type: 'reel' as const,
    content: r.caption,
    media_urls: [r.video_url],
    profiles: {
      id: profile.id || '',
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      badge_level: profile.badge_level,
      professional_title: profile.professional_title
    }
  }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (feedItems.length === 0) {
    return (
      <div className="glass rounded-xl p-4 text-center text-muted-foreground border border-border/50">
        <p>No posts or reels yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedItems.map((item) => (
        <FeedItem
          key={`${item.type}-${item.id}`}
          item={item}
          currentUserId={currentUserId || ''}
          isLiked={item.type === 'post' ? likedPosts.has(item.id) : likedReels.has(item.id)}
          mutedVideos={mutedVideos}
          onLike={() => item.type === 'post' ? togglePostLike(item.id) : toggleReelLike(item.id)}
          onDelete={() => {}}
          onEdit={() => {}}
          onComment={() => {}}
          onShare={() => {}}
          onToggleMute={handleToggleMute}
          onFullscreen={() => navigate('/reels', { state: { scrollToReelId: item.id, reelData: item } })}
          onViewLikes={() => {}}
          getBadgeColor={getBadgeColor}
        />
      ))}
    </div>
  );
};

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoles>({ isFounder: false, isVerified: false });
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [hasStory, setHasStory] = useState(false);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [recognitions, setRecognitions] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [examCertificates, setExamCertificates] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { data: birthdayData } = useUserBirthday(userId || null);
  
  // Use live career metrics hook
  const { metrics: liveCareerMetrics } = useCareerMetrics(userId || null);

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    initUser();

    if (userId) {
      // Fetch all data in parallel for faster loading
      Promise.all([
        fetchProfile(),
        checkFollowStatus(),
        fetchPosts(),
        fetchReels(),
        checkForStory(),
        fetchExperiences(),
        fetchCertifications(),
        fetchRecognitions(),
        fetchCompetitions(),
        fetchExamCertificates(),
      ]).then(() => {
        // Track view after data loads to avoid blocking
        trackProfileView();
      });
    }
  }, [userId]);

  const fetchExamCertificates = async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('exam_certificates')
      .select('*, exam_categories(*), exam_badge_levels(*)')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });
    
    if (data) setExamCertificates(data);
  };

  const trackProfileView = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === userId) return; // Don't track own profile views

    // Insert profile view (will trigger notification via database trigger)
    await supabase
      .from("profile_views")
      .insert({
        viewer_id: user.id,
        viewed_profile_id: userId
      });
  };

  const checkForStory = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("stories")
      .select("id")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    setHasStory(!!data);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      
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
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setPosts(data);
  };

  const fetchReels = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("reels")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setReels(data);
  };

  const fetchExperiences = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("work_experiences")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false});

    if (data) setExperiences(data);
  };

  const fetchCertifications = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("certifications")
      .select("*")
      .eq("user_id", userId)
      .order("issue_date", { ascending: false });
    
    if (data) setCertifications(data);
  };

  const fetchRecognitions = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("recognitions")
      .select("*")
      .eq("user_id", userId)
      .order("issue_date", { ascending: false });
    
    if (data) setRecognitions(data);
  };

  const fetchCompetitions = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from("competitions")
      .select("*")
      .eq("user_id", userId)
      .order("competition_date", { ascending: false });
    
    if (data) setCompetitions(data);
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
      
      setIsFollowing(false);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: userId });
      
      setIsFollowing(true);
    }
    fetchProfile();
  };

  const handleMessage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userId) return;

      // Check if conversation already exists
      const { data: existingConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("*")
        .contains("participant_ids", [user.id])
        .contains("participant_ids", [userId]);

      if (fetchError) {
        console.error("Error fetching conversations:", fetchError);
        return;
      }

      let conversationId;

      if (existingConversations && existingConversations.length > 0) {
        conversationId = existingConversations[0].id;
      } else {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from("conversations")
          .insert({ participant_ids: [user.id, userId] })
          .select()
          .single();
        
        if (createError) {
          console.error("Error creating conversation:", createError);
          return;
        }
        
        conversationId = newConversation?.id;
      }

      if (conversationId) {
        navigate(`/messages/${conversationId}`);
      }
    } catch (error) {
      console.error("Error in handleMessage:", error);
    }
  };


  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <BirthdayConfetti isActive={birthdayData?.isBirthday || false} />
      <TopNav />
      <MusicTicker />
      
      {/* Cover Photo */}
      {profile.cover_url && (
        <div className="w-full h-48 cover-3d">
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
              <AvatarClickMenu
                userId={userId!}
                avatarUrl={profile.avatar_url}
                username={profile.username}
                hasStory={hasStory}
              >
                <OptimizedAvatar
                  src={profile.avatar_url}
                  alt={profile.username}
                  fallback={profile.username[0]}
                  userId={userId!}
                  className={`w-24 h-24 avatar-3d ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(profile.badge_level)} cursor-pointer`}
                  showStatus={true}
                />
              </AvatarClickMenu>
              <div>
                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  @{profile.username}
                  <BirthdayBadge userId={userId} />
                </p>
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
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <UserProfileFeed 
              posts={posts} 
              reels={reels} 
              profile={profile}
              currentUserId={currentUser?.id}
              mutedVideos={mutedVideos}
              setMutedVideos={setMutedVideos}
              navigate={navigate}
            />
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
                    onClick={() => setMetricsDialogOpen(true)}
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Network Reach</span>
                    <span className="text-sm font-semibold group-hover:scale-105 transition-transform">{profile ? calculateNetworkReach(profile, posts, reels).toLocaleString() : 0}</span>
                  </div>
                  <div 
                    className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => setMetricsDialogOpen(true)}
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Professional Score</span>
                    <span className="text-sm font-semibold text-primary group-hover:scale-105 transition-transform">{profile ? calculateProfessionalScore(profile, userRoles, posts, reels, []) : 0}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Certificates */}
            {examCertificates.length > 0 && (
              <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Exam Certificates
                </h4>
                <div className="space-y-2">
                  {examCertificates.map((cert: any) => {
                    const getBadgeCertColor = (level: string) => {
                      const colors: Record<string, string> = {
                        'Bronze': 'bg-amber-700 text-white',
                        'Silver': 'bg-slate-400 text-white',
                        'Gold': 'bg-yellow-500 text-black',
                        'Platinum': 'bg-gradient-to-r from-slate-300 to-slate-500 text-white',
                        'Diamond': 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
                      };
                      return colors[level] || 'bg-muted';
                    };
                    
                    return (
                      <div 
                        key={cert.id}
                        className="flex items-center gap-3 p-3 rounded-lg glass border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/certificate/${cert.id}`)}
                      >
                        <div className={`p-2 rounded-full shrink-0 ${getBadgeCertColor(cert.exam_badge_levels?.name || '')}`}>
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{cert.exam_categories?.name}</span>
                            <Badge className={`text-[10px] ${getBadgeCertColor(cert.exam_badge_levels?.name || '')}`}>
                              {cert.exam_badge_levels?.name}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Score: {cert.score}% • {new Date(cert.issued_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Work Experience Timeline */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Experience & Projects
              </h4>
              <ExperienceTimeline
                experiences={experiences}
                userId={userId || ""}
                onUpdate={fetchExperiences}
                isOwnProfile={false}
              />
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
        isFounder={userRoles.isFounder}
        isVerified={userRoles.isVerified}
        badgeLevel={profile?.badge_level as any}
        username={profile?.username}
        isOwnProfile={false}
        professionalScore={profile ? calculateProfessionalScore(profile, userRoles, posts, reels, []) : undefined}
      />

      <CareerMetricsDialog
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
        metrics={liveCareerMetrics}
      />
    </div>
  );
};

export default UserProfile;