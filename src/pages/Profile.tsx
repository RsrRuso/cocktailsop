import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Settings, Sparkles, Phone, MessageSquare, Globe, BadgeCheck } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getBadgeColor, getAbbreviatedName } from "@/lib/profileUtils";
import BirthdayBadge from "@/components/BirthdayBadge";

// Lazy load heavy components
const FollowersDialog = lazy(() => import("@/components/FollowersDialog"));
const FollowingDialog = lazy(() => import("@/components/FollowingDialog"));
const BadgeInfoDialog = lazy(() => import("@/components/BadgeInfoDialog"));
const CreateStatusDialog = lazy(() => import("@/components/CreateStatusDialog"));
const ProfileFeedTab = lazy(() => import("@/components/profile/ProfileFeedTab"));
const ProfileStoriesTab = lazy(() => import("@/components/profile/ProfileStoriesTab"));
const ProfileGrowthTab = lazy(() => import("@/components/profile/ProfileGrowthTab"));
const ProfileSavedTab = lazy(() => import("@/components/profile/ProfileSavedTab"));
const ProfileMembershipDoors = lazy(() => import("@/components/ProfileMembershipDoors").then(m => ({ default: m.ProfileMembershipDoors })));
const MonetizationHub = lazy(() => import("@/components/monetization").then(m => ({ default: m.MonetizationHub })));

// Simple loading fallback
const TabLoader = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isLoading: authLoading } = useAuth();
  
  const locationState = location.state as { openSaves?: boolean } | null;
  const [activeTab, setActiveTab] = useState(locationState?.openSaves ? "saved" : "feed");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [userRoles, setUserRoles] = useState({ isFounder: false, isVerified: false });
  const [stories, setStories] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);

  // Fetch minimal data needed for header on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchMinimalData = async () => {
      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (rolesData) {
        setUserRoles({
          isFounder: rolesData.some(r => r.role === 'founder'),
          isVerified: rolesData.some(r => r.role === 'verified')
        });
      }
      
      // Fetch status using RPC or direct query with cast
      const { data: statusData } = await (supabase as any)
        .from('user_statuses')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (statusData) setUserStatus(statusData);
      
      // Fetch stories count
      const { data: storiesData } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString());
      
      setStories(storiesData || []);
      
      // Fetch post count
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      setPostCount(count || 0);
    };
    
    fetchMinimalData();
  }, [user?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Show loading only if no cached profile
  if (authLoading && !profile) {
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

  // Safe profile with defaults
  const safeProfile = {
    id: profile?.id || user.id,
    username: profile?.username || user.user_metadata?.username || 'User',
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    bio: profile?.bio || null,
    avatar_url: profile?.avatar_url || null,
    cover_url: profile?.cover_url || null,
    professional_title: profile?.professional_title || null,
    badge_level: profile?.badge_level || 'bronze',
    region: profile?.region || null,
    follower_count: profile?.follower_count || 0,
    following_count: profile?.following_count || 0,
    post_count: profile?.post_count || postCount,
    phone: profile?.phone || null,
    whatsapp: profile?.whatsapp || null,
    website: profile?.website || null,
    show_phone: profile?.show_phone || false,
    show_whatsapp: profile?.show_whatsapp || false,
    show_website: profile?.show_website || false,
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      {/* Cover Photo */}
      {safeProfile.cover_url && (
        <div className="w-full h-48 cover-3d">
          <img src={safeProfile.cover_url} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 space-y-6" style={{ marginTop: safeProfile.cover_url ? '-3rem' : '1.5rem' }}>
        {/* Profile Header - Always visible instantly */}
        <div className="glass rounded-xl p-4 space-y-6 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`cursor-pointer transition-transform hover:scale-105 ${stories.length > 0 ? 'ring-4 ring-primary rounded-full' : ''}`}
                  onClick={() => setShowAvatarDialog(true)}
                >
                  <OptimizedAvatar
                    src={safeProfile.avatar_url}
                    alt={safeProfile.username}
                    fallback={safeProfile.username[0]}
                    userId={user.id}
                    className={`w-24 h-24 avatar-3d ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(safeProfile.badge_level)}`}
                    showStatus={true}
                    showAddButton={true}
                    onAddStatusClick={() => setShowStatusDialog(true)}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-bold">{getAbbreviatedName(safeProfile.full_name) || safeProfile.username}</h2>
                  {(userRoles.isFounder || userRoles.isVerified) && (
                    <div 
                      className="cursor-pointer flex-shrink-0"
                      onClick={() => setBadgeDialogOpen(true)}
                    >
                      {userRoles.isFounder ? (
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-[2px] opacity-75" />
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
                  @{safeProfile.username}
                  <BirthdayBadge userId={user.id} />
                </p>
                <p className="text-sm text-primary capitalize mt-1">
                  {safeProfile.professional_title?.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="glass-hover">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          {safeProfile.bio && <p className="text-sm text-muted-foreground">{safeProfile.bio}</p>}

          {/* Contact Links */}
          {(safeProfile.show_phone && safeProfile.phone) || (safeProfile.show_whatsapp && safeProfile.whatsapp) || (safeProfile.show_website && safeProfile.website) ? (
            <div className="flex flex-wrap gap-2">
              {safeProfile.show_phone && safeProfile.phone && (
                <a href={`tel:${safeProfile.phone}`} className="flex items-center gap-2 px-3 py-2 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>{safeProfile.phone}</span>
                </a>
              )}
              {safeProfile.show_whatsapp && safeProfile.whatsapp && (
                <a href={`https://wa.me/${safeProfile.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-2 px-3 py-2 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span>WhatsApp</span>
                </a>
              )}
              {safeProfile.show_website && safeProfile.website && (
                <a href={safeProfile.website.startsWith('http') ? safeProfile.website : `https://${safeProfile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Website</span>
                </a>
              )}
            </div>
          ) : null}

          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold">{safeProfile.post_count}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <button className="text-center hover:opacity-70 transition-opacity" onClick={() => setShowFollowers(true)}>
              <p className="text-2xl font-bold">{safeProfile.follower_count}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </button>
            <button className="text-center hover:opacity-70 transition-opacity" onClick={() => setShowFollowing(true)}>
              <p className="text-2xl font-bold">{safeProfile.following_count}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </button>
          </div>

          <div className="space-y-2">
            <Button className="w-full glow-primary" onClick={() => navigate("/profile/edit")}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            
            <Button variant="outline" className="w-full" onClick={() => setShowStatusDialog(true)}>
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

          {/* Monetization inside header */}
          <Suspense fallback={<div className="h-12 animate-pulse bg-muted/20 rounded-lg" />}>
            <MonetizationHub userId={user.id} />
          </Suspense>
        </div>

        {/* Lazy loaded sections */}
        <Suspense fallback={<TabLoader />}>
          <ProfileMembershipDoors userId={user.id} />
        </Suspense>

        {/* Content Tabs - Lazy loaded */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <ProfileFeedTab userId={user.id} profile={safeProfile} />
            </Suspense>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <ProfileSavedTab userId={user.id} />
            </Suspense>
          </TabsContent>

          <TabsContent value="stories" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <ProfileStoriesTab userId={user.id} />
            </Suspense>
          </TabsContent>

          <TabsContent value="growth" className="mt-4">
            <Suspense fallback={<TabLoader />}>
              <ProfileGrowthTab userId={user.id} profile={safeProfile} userRoles={userRoles} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />

      {/* Lazy loaded dialogs */}
      <Suspense fallback={null}>
        {showFollowers && (
          <FollowersDialog open={showFollowers} onOpenChange={setShowFollowers} userId={user.id} />
        )}
        {showFollowing && (
          <FollowingDialog open={showFollowing} onOpenChange={setShowFollowing} userId={user.id} />
        )}
        {badgeDialogOpen && (
          <BadgeInfoDialog
            open={badgeDialogOpen}
            onOpenChange={setBadgeDialogOpen}
            isFounder={userRoles.isFounder}
            isVerified={userRoles.isVerified}
            badgeLevel={safeProfile.badge_level as any}
            username={safeProfile.username}
            isOwnProfile={true}
          />
        )}
        {showStatusDialog && (
          <CreateStatusDialog
            open={showStatusDialog}
            onOpenChange={(open) => {
              setShowStatusDialog(open);
              if (!open) {
                // Refetch status
                (supabase as any)
                  .from('user_statuses')
                  .select('*')
                  .eq('user_id', user.id)
                  .gt('expires_at', new Date().toISOString())
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single()
                  .then(({ data }: any) => setUserStatus(data));
              }
            }}
            userId={user.id}
          />
        )}
      </Suspense>

      {/* Avatar Photo Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative w-full aspect-square flex items-center justify-center">
            {safeProfile.avatar_url ? (
              <img 
                src={safeProfile.avatar_url} 
                alt={safeProfile.full_name || safeProfile.username}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-9xl font-bold text-white/80">{safeProfile.username[0]}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
