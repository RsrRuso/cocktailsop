import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOptimizedProfileData } from "@/hooks/useOptimizedProfile";
import { Loader2 } from "lucide-react";
import { useRegionalRanking } from "@/hooks/useRegionalRanking";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import MusicTicker from "@/components/MusicTicker";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LogOut, Settings, Star, Trash2, Heart, MessageCircle, Volume2, VolumeX, Play, Phone, MessageSquare, Globe, Award, TrendingUp, Target, CheckCircle, Sparkles, BadgeCheck, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FollowersDialog from "@/components/FollowersDialog";
import FollowingDialog from "@/components/FollowingDialog";
import { VenueVerification } from "@/components/VenueVerification";
import BadgeInfoDialog from "@/components/BadgeInfoDialog";
import CareerMetricsDialog from "@/components/CareerMetricsDialog";
import CreateStatusDialog from "@/components/CreateStatusDialog";
import { useUserStatus } from "@/hooks/useUserStatus";
import { getBadgeColor, getProfessionalBadge, calculateNetworkReach, calculateProfessionalScore } from "@/lib/profileUtils";
import { AddExperienceDialog } from "@/components/AddExperienceDialog";
import { AddCertificationDialog } from "@/components/AddCertificationDialog";
import { AddRecognitionDialog } from "@/components/AddRecognitionDialog";
import { AddCompetitionDialog } from "@/components/AddCompetitionDialog";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { calculateCareerScore } from "@/lib/careerMetrics";
import BirthdayConfetti from "@/components/BirthdayConfetti";
import BirthdayBadge from "@/components/BirthdayBadge";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  professional_title: string | null;
  badge_level: string;
  region: string | null;
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
  const { user, profile: authProfile, isLoading: authLoading } = useAuth();
  
  // Use optimized hook for all data
  const { 
    profile: queryProfile, 
    posts, 
    reels, 
    experiences, 
    certifications, 
    recognitions,
    competitions,
    stories, 
    userRoles, 
    refetchAll 
  } = useOptimizedProfileData(user?.id || null);
  
  // Use query profile first (more complete), then auth profile as fallback
  const fetchedProfile = queryProfile || authProfile;
  
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [showAddCertification, setShowAddCertification] = useState(false);
  const [showAddRecognition, setShowAddRecognition] = useState(false);
  const { data: userStatus, refetch: refetchStatus } = useUserStatus(user?.id || null);
  
  // Calculate birthday from profile data directly (no extra request)
  const birthdayData = useMemo(() => {
    const dob = fetchedProfile?.date_of_birth || authProfile?.date_of_birth;
    if (!dob) return { isBirthday: false };
    const birthDate = new Date(dob);
    const today = new Date();
    const isBirthday = birthDate.getMonth() === today.getMonth() && 
      Math.abs(birthDate.getDate() - today.getDate()) <= 3;
    return { isBirthday };
  }, [fetchedProfile?.date_of_birth, authProfile?.date_of_birth]);

  // Calculate career score (memoized)
  const careerMetrics = useMemo(() => {
    if (!experiences || !certifications || !recognitions || !competitions) {
      return { rawScore: 0, metrics: {} };
    }
    return calculateCareerScore(experiences, certifications, recognitions, competitions);
  }, [experiences, certifications, recognitions, competitions]);

  // Fetch regional ranking with caching and deduplication
  const { data: regionalData } = useRegionalRanking(
    fetchedProfile?.region || null,
    careerMetrics.rawScore
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (fetchedProfile?.cover_url) {
      setCoverUrl(fetchedProfile.cover_url);
    }
  }, [fetchedProfile]);

  // Update career score in database (debounced to prevent excessive writes)
  useEffect(() => {
    const updateCareerScore = async () => {
      if (!fetchedProfile || !user?.id || careerMetrics.rawScore === 0) return;

      await supabase
        .from('profiles')
        .update({ career_score: careerMetrics.rawScore })
        .eq('id', user.id);
    };

    const timeoutId = setTimeout(updateCareerScore, 1000); // Debounce 1 second
    return () => clearTimeout(timeoutId);
  }, [careerMetrics.rawScore, fetchedProfile, user?.id]);

  const fetchStories = async () => {
    if (!user?.id) return;
    refetchAll();
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

  // Only show loading if auth is still initializing
  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Redirect to auth if no user after loading
  if (!user && !authLoading) {
    navigate("/auth");
    return null;
  }

  // Create profile with fallback values for instant display
  const profile = fetchedProfile || {
    id: user?.id || '',
    username: user?.user_metadata?.username || 'User',
    full_name: user?.user_metadata?.full_name || '',
    bio: null,
    avatar_url: null,
    cover_url: null,
    professional_title: null,
    badge_level: 'bronze',
    region: null,
    follower_count: 0,
    following_count: 0,
    post_count: 0,
    phone: null,
    whatsapp: null,
    website: null,
    show_phone: false,
    show_whatsapp: false,
    show_website: false,
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <BirthdayConfetti isActive={birthdayData?.isBirthday || false} />
      <TopNav />
      <MusicTicker />
      
      {/* Cover Photo */}
      {coverUrl && (
        <div className="w-full h-48 cover-3d">
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 space-y-6" style={{ marginTop: coverUrl ? '-3rem' : '1.5rem' }}>
        {/* Profile Header */}
        <div className="glass rounded-xl p-4 space-y-6 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`cursor-pointer transition-transform hover:scale-105 ${stories.length > 0 ? 'ring-4 ring-primary rounded-full' : ''}`}
                  onClick={() => setShowAvatarDialog(true)}
                >
                  <OptimizedAvatar
                    src={profile.avatar_url}
                    alt={profile.username}
                    fallback={profile.username[0]}
                    userId={user?.id || ""}
                    className={`w-24 h-24 avatar-3d ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(profile.badge_level)}`}
                    showStatus={true}
                    showAddButton={true}
                    onAddStatusClick={() => setShowStatusDialog(true)}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  {/* Verification badge */}
                  {(userRoles.isFounder || userRoles.isVerified) && (
                    <div 
                      className="cursor-pointer flex-shrink-0"
                      onClick={() => setBadgeDialogOpen(true)}
                    >
                      {userRoles.isFounder ? (
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-[2px] opacity-75 group-hover:opacity-100 transition-opacity" />
                          <div className="relative w-5 h-5 bg-gradient-to-br from-cyan-200 via-blue-400 to-purple-500 transform rotate-45 rounded-[2px] shadow-md flex items-center justify-center">
                            <div className="w-1 h-1 bg-white rounded-full" />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-500 rounded-full p-0.5 shadow-sm">
                          <BadgeCheck className="w-4 h-4 text-white" fill="currentColor" strokeWidth={0} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  @{profile.username}
                  <BirthdayBadge userId={user?.id} />
                </p>
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

          <div className="space-y-2">
            <Button 
              className="w-full glow-primary"
              onClick={() => navigate("/profile/edit")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowStatusDialog(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {userStatus ? "Update Status" : "Share Status"}
            </Button>
            
            {userStatus && (
              <div className="text-center p-3 rounded-lg glass border border-border/50">
                <p className="text-sm font-medium flex items-center justify-center gap-2">
                  {userStatus.emoji && <span className="text-xl">{userStatus.emoji}</span>}
                  {userStatus.status_text}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Expires {new Date(userStatus.expires_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            {[...posts.map(p => ({ ...p, type: 'post' })), ...reels.map(r => ({ ...r, type: 'reel' }))]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .length === 0 ? (
              <div className="glass rounded-xl p-4 text-center text-muted-foreground border border-border/50">
                <p>No posts or reels yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...posts.map(p => ({ ...p, type: 'post' })), ...reels.map(r => ({ ...r, type: 'reel' }))]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((item: any) => (
                    item.type === 'post' ? (
                      <div key={`post-${item.id}`} className="glass rounded-xl p-4 space-y-3 border border-border/50">
                        {item.content && <p className="text-sm">{item.content}</p>}
                        {item.media_urls && item.media_urls.length > 0 && (
                          <div className={`grid gap-2 ${item.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {item.media_urls.map((url, idx) => (
                              <img key={idx} src={url} alt="Post" className="w-full rounded-lg object-cover" />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" /> {item.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" /> {item.comment_count || 0}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div 
                        key={`reel-${item.id}`} 
                        className="overflow-hidden cursor-pointer"
                        onClick={() => navigate('/reels', { 
                          state: { 
                            scrollToReelId: item.id,
                            reelData: item 
                          } 
                        })}
                      >
                        <video
                          src={item.video_url}
                          className="w-full aspect-[9/16] object-cover"
                          muted
                          playsInline
                          loop
                          autoPlay
                        />
                        <div className="p-4 space-y-2">
                          {item.caption && <p className="text-sm">{item.caption}</p>}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Play className="w-4 h-4" strokeWidth={1.5} /> {item.view_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" strokeWidth={1.5} /> {item.like_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" strokeWidth={1.5} /> {item.comment_count || 0}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMutedVideos(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(item.id)) {
                                    newSet.delete(item.id);
                                  } else {
                                    newSet.add(item.id);
                                  }
                                  return newSet;
                                });
                              }}
                              className="ml-auto"
                            >
                              {mutedVideos.has(item.id) ? (
                                <Volume2 className="w-4 h-4" />
                              ) : (
                                <VolumeX className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
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
                      onClick={() => navigate(`/story/${user?.id}`)}
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
                    <span className="text-sm font-semibold text-primary group-hover:scale-105 transition-transform">{profile ? calculateProfessionalScore(profile, userRoles, posts, reels, stories) : 0}/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Career KPIs Summary */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Career Development Score</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMetricsDialogOpen(true)}
                  className="text-xs"
                >
                  View Details
                </Button>
              </div>
              
              {(() => {
  const metrics = calculateCareerScore(
    experiences,
    certifications,
    recognitions,
    competitions,
    regionalData?.maxScore,
    regionalData?.userRank,
    regionalData?.totalUsers
  );
                return (
                  <>
                    {/* Score and Badge */}
                    <div className="text-center p-4 glass rounded-lg border border-border/50">
                      <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                        {metrics.score}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {metrics.regionalRank} {profile.region && profile.region !== 'All' ? `in ${profile.region}` : 'globally'}
                      </div>
                      <Badge className={`${metrics.badge.color} text-sm px-3 py-1`}>
                        {metrics.badge.level} - {metrics.badge.description}
                      </Badge>
                    </div>

                    {/* KPIs Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-blue-500" />
                          <span className="text-xs text-muted-foreground">Working Places</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.workingPlaces}</div>
                      </div>
                      
                      <div className="glass rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">Years Experience</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.totalYears}</div>
                      </div>
                      
                      <div className="glass rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-purple-500" />
                          <span className="text-xs text-muted-foreground">Projects</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.projectsCompleted}</div>
                      </div>
                      
                      <div className="glass rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">Diplomas</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.diplomas}</div>
                      </div>
                      
                      <div className="glass rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-muted-foreground">Certificates</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.certificates}</div>
                      </div>
                      
                      <div className="glass rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-pink-500" />
                          <span className="text-xs text-muted-foreground">Recognitions</span>
                        </div>
                        <div className="text-2xl font-bold">{metrics.recognitions}</div>
                      </div>
                    </div>

                    {/* Add Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAddCertification(true)}
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Add Certification/Diploma
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAddRecognition(true)}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Add Recognition
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Work Experience Timeline */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Experience & Projects
              </h4>
              <ExperienceTimeline
                experiences={experiences}
                userId={user?.id || ""}
                onUpdate={() => refetchAll()}
                isOwnProfile={true}
              />
            </div>

            {/* Venue Verification */}
            <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
              <VenueVerification userId={user?.id || ""} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      <FollowersDialog
        open={showFollowers}
        onOpenChange={setShowFollowers}
        userId={user?.id || ""}
      />

      <FollowingDialog
        open={showFollowing}
        onOpenChange={setShowFollowing}
        userId={user?.id || ""}
      />

      <BadgeInfoDialog
        open={badgeDialogOpen}
        onOpenChange={setBadgeDialogOpen}
        isFounder={userRoles.isFounder}
        isVerified={userRoles.isVerified}
        badgeLevel={profile?.badge_level as any}
        username={profile?.username}
        isOwnProfile={true}
        professionalScore={profile ? calculateProfessionalScore(profile, userRoles, posts, reels, stories) : undefined}
      />

      <CareerMetricsDialog
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
        metrics={calculateCareerScore(
          experiences, 
          certifications, 
          recognitions,
          competitions,
          regionalData?.maxScore,
          regionalData?.userRank,
          regionalData?.totalUsers
        )}
      />

      <AddExperienceDialog
        open={showAddExperience}
        onOpenChange={setShowAddExperience}
        userId={user?.id || ""}
        onSuccess={() => refetchAll()}
      />

      <AddCertificationDialog
        open={showAddCertification}
        onOpenChange={setShowAddCertification}
        userId={user?.id || ""}
        onSuccess={() => refetchAll()}
      />

      <AddRecognitionDialog
        open={showAddRecognition}
        onOpenChange={setShowAddRecognition}
        userId={user?.id || ""}
        onSuccess={() => refetchAll()}
      />

      <CreateStatusDialog
        open={showStatusDialog}
        onOpenChange={(open) => {
          setShowStatusDialog(open);
          if (!open) refetchStatus();
        }}
        userId={user?.id || ""}
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
