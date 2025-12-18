import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogOut, Settings, Sparkles, BadgeCheck } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getBadgeColor } from "@/lib/profileUtils";

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

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      {p.cover_url && (
        <div className="w-full h-40">
          <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 space-y-4" style={{ marginTop: p.cover_url ? '-2.5rem' : '1rem' }}>
        {/* Header */}
        <div className="glass rounded-xl p-4 border border-border/50">
          <div className="flex items-start gap-4">
            <div 
              className={`cursor-pointer ${hasStories ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full' : ''}`}
              onClick={() => hasStories && navigate('/stories')}
            >
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-bold truncate">{p.full_name || p.username}</h2>
                {isVerified && (
                  <div className="bg-blue-500 rounded-full p-0.5 flex-shrink-0">
                    <BadgeCheck className="w-4 h-4 text-white" fill="currentColor" strokeWidth={0} />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-sm">@{p.username}</p>
              {p.professional_title && (
                <p className="text-xs text-primary capitalize mt-0.5">{p.professional_title.replace(/_/g, " ")}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {p.bio && <p className="text-sm text-muted-foreground mt-3">{p.bio}</p>}

          {/* Current Status */}
          {userStatus && (
            <div className="mt-3 p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
              <p className="text-sm font-medium">
                {userStatus.emoji && <span className="mr-1">{userStatus.emoji}</span>}
                {userStatus.status_text}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold">{p.post_count}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <button className="text-center" onClick={() => setShowFollowers(true)}>
              <p className="text-lg font-bold">{p.follower_count}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </button>
            <button className="text-center" onClick={() => setShowFollowing(true)}>
              <p className="text-lg font-bold">{p.following_count}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button className="flex-1" size="sm" onClick={() => navigate("/profile/edit")}>
              <Settings className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              Status
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/create-story")}>
              Story
            </Button>
          </div>

          {/* Monetization */}
          <div className="mt-4">
            <Suspense fallback={<div className="h-10 animate-pulse bg-muted/20 rounded-lg" />}>
              <MonetizationHub userId={user.id} />
            </Suspense>
          </div>
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
