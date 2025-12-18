import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogOut, Sparkles, Share2, TrendingUp, Link as LinkIcon, AtSign, Settings } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getBadgeColor } from "@/lib/profileUtils";
import { VerifiedBadge } from "@/components/VerifiedBadge";

// Lazy load components
const ProfileFeedTab = lazy(() => import("@/components/profile/ProfileFeedTab"));
const ProfileStoriesTab = lazy(() => import("@/components/profile/ProfileStoriesTab"));
const ProfileGrowthTab = lazy(() => import("@/components/profile/ProfileGrowthTab"));
const ProfileSavedTab = lazy(() => import("@/components/profile/ProfileSavedTab"));
const ProfileMembershipDoors = lazy(() => import("@/components/ProfileMembershipDoors").then(m => ({ default: m.ProfileMembershipDoors })));
const MonetizationHub = lazy(() => import("@/components/monetization").then(m => ({ default: m.MonetizationHub })));
const CreateStatusDialog = lazy(() => import("@/components/CreateStatusDialog"));

const TabLoader = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isLoading } = useAuth();
  
  const locationState = location.state as { openSaves?: boolean } | null;
  const [activeTab, setActiveTab] = useState(locationState?.openSaves ? "saved" : "feed");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [hasStories, setHasStories] = useState(false);
  const [contentCount, setContentCount] = useState(0);

  // Fetch minimal data on mount
  useEffect(() => {
    if (!user?.id) return;
    
    // Check verified
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'verified')
      .maybeSingle()
      .then(({ data }) => setIsVerified(!!data));
    
    // Check status
    (supabase as any)
      .from('user_statuses')
      .select('status_text, emoji, expires_at')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => setUserStatus(data));
    
    // Check stories
    supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .then(({ count }) => setHasStories((count || 0) > 0));
    
    // Count posts and reels
    Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('reels').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    ]).then(([postsRes, reelsRes]) => {
      const postsCount = postsRes.count || 0;
      const reelsCount = reelsRes.count || 0;
      setContentCount(postsCount + reelsCount);
    });
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  if (isLoading && !profile) {
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

  if (!user) return null;

  const p = {
    username: profile?.username || 'User',
    full_name: profile?.full_name || '',
    bio: profile?.bio,
    avatar_url: profile?.avatar_url,
    cover_url: profile?.cover_url,
    badge_level: profile?.badge_level || 'bronze',
    follower_count: profile?.follower_count || 0,
    following_count: profile?.following_count || 0,
    post_count: profile?.post_count || 0,
    professional_title: profile?.professional_title,
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/user/${user.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${p.full_name || p.username}'s Profile`,
          url: profileUrl,
        });
      } catch {
        navigator.clipboard.writeText(profileUrl);
        toast.success("Profile link copied!");
      }
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="px-4 pt-4 space-y-4">
        {/* Instagram-style Header */}
        <div className="space-y-4">
          {/* Top row: Avatar + Stats */}
          <div className="flex items-center gap-6">
            {/* Avatar with story ring */}
            <div className="relative flex-shrink-0">
              <div 
                className={`cursor-pointer ${hasStories ? 'p-[3px] rounded-full bg-gradient-to-tr from-primary via-primary/70 to-primary' : ''}`}
                onClick={() => hasStories && navigate('/stories')}
              >
                <div className={hasStories ? 'p-[2px] bg-background rounded-full' : ''}>
                  <OptimizedAvatar
                    src={p.avatar_url}
                    alt={p.username}
                    fallback={p.username[0]}
                    userId={user.id}
                    className={`w-20 h-20 bg-gradient-to-br ${getBadgeColor(p.badge_level)}`}
                    showStatus={true}
                    showAddButton={true}
                    onAddStatusClick={() => setShowStatusDialog(true)}
                  />
                </div>
              </div>
              
              {/* Status pill */}
              {userStatus && (
                <div className="absolute -top-2 -left-1 bg-muted/90 backdrop-blur-sm border border-border rounded-lg px-2 py-0.5 text-[10px] font-medium max-w-[80px] truncate">
                  {userStatus.emoji} {userStatus.status_text}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex-1 flex items-center justify-around">
              <div className="text-center">
                <p className="text-lg font-bold">{contentCount}</p>
                <p className="text-xs text-muted-foreground">posts</p>
              </div>
              <button className="text-center" onClick={() => setShowFollowers(true)}>
                <p className="text-lg font-bold">{p.follower_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">followers</p>
              </button>
              <button className="text-center" onClick={() => setShowFollowing(true)}>
                <p className="text-lg font-bold">{p.following_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">following</p>
              </button>
            </div>
          </div>

          {/* Name + Verified */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold">{p.full_name || p.username}</h2>
              {isVerified && <VerifiedBadge size="sm" />}
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            
            {/* Role/Title */}
            {p.professional_title && (
              <p className="text-sm text-muted-foreground capitalize">
                {p.professional_title.replace(/_/g, " ")}
              </p>
            )}
            
            {/* Bio */}
            {p.bio && (
              <p className="text-sm leading-relaxed">{p.bio}</p>
            )}
            
            {/* Website link placeholder */}
            {profile?.website_url && (
              <a 
                href={profile.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary font-medium"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {profile.website_url.replace(/^https?:\/\//, '')}
              </a>
            )}
            
            {/* Username handle */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <AtSign className="w-3.5 h-3.5" />
              <span>{p.username}</span>
            </div>
          </div>

          {/* Professional Dashboard Card */}
          <div className="bg-muted/30 border border-border rounded-xl p-3">
            <p className="font-semibold text-sm">Professional dashboard</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>{p.follower_count > 0 ? `${((p.follower_count * 1.07).toFixed(1))}K` : '0'} views in the last 30 days.</span>
            </div>
          </div>

          {/* Action Buttons - Instagram style */}
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold"
              onClick={() => navigate("/profile/edit")}
            >
              Edit profile
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-semibold"
              onClick={handleShareProfile}
            >
              Share profile
            </Button>
          </div>

          {/* Additional actions row */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowStatusDialog(true)}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Status
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate("/create-story")}>
              Story
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Monetization */}
          <Suspense fallback={<div className="h-10 animate-pulse bg-muted/20 rounded-lg" />}>
            <MonetizationHub userId={user.id} />
          </Suspense>
        </div>

        {/* Doors */}
        <Suspense fallback={<div className="h-16 animate-pulse bg-muted/20 rounded-xl" />}>
          <ProfileMembershipDoors userId={user.id} />
        </Suspense>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-3">
            <Suspense fallback={<TabLoader />}>
              <ProfileFeedTab userId={user.id} profile={profile} />
            </Suspense>
          </TabsContent>

          <TabsContent value="saved" className="mt-3">
            <Suspense fallback={<TabLoader />}>
              <ProfileSavedTab userId={user.id} />
            </Suspense>
          </TabsContent>

          <TabsContent value="stories" className="mt-3">
            <Suspense fallback={<TabLoader />}>
              <ProfileStoriesTab userId={user.id} />
            </Suspense>
          </TabsContent>

          <TabsContent value="growth" className="mt-3">
            <Suspense fallback={<TabLoader />}>
              <ProfileGrowthTab userId={user.id} profile={profile} userRoles={{ isFounder: false, isVerified }} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      {/* Dialogs */}
      {showFollowers && (
        <Suspense fallback={null}>
          <LazyFollowersDialog open={showFollowers} onOpenChange={setShowFollowers} userId={user.id} />
        </Suspense>
      )}
      {showFollowing && (
        <Suspense fallback={null}>
          <LazyFollowingDialog open={showFollowing} onOpenChange={setShowFollowing} userId={user.id} />
        </Suspense>
      )}
      {showStatusDialog && (
        <Suspense fallback={null}>
          <CreateStatusDialog
            open={showStatusDialog}
            onOpenChange={(open) => {
              setShowStatusDialog(open);
              if (!open) {
                (supabase as any)
                  .from('user_statuses')
                  .select('status_text, emoji, expires_at')
                  .eq('user_id', user.id)
                  .gt('expires_at', new Date().toISOString())
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
                  .then(({ data }: any) => setUserStatus(data));
              }
            }}
            userId={user.id}
          />
        </Suspense>
      )}
    </div>
  );
};

const LazyFollowersDialog = lazy(() => import("@/components/FollowersDialog"));
const LazyFollowingDialog = lazy(() => import("@/components/FollowingDialog"));

export default Profile;
