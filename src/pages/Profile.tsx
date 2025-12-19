import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Settings, Grid3X3, Bookmark, PlaySquare, Sparkles, Film, LogOut, DollarSign, Link as LinkIcon } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ProfileMembershipDoors } from "@/components/ProfileMembershipDoors";

// Lazy load tabs and dialogs
const ProfileFeedTab = lazy(() => import("@/components/profile/ProfileFeedTab"));
const ProfileSavedTab = lazy(() => import("@/components/profile/ProfileSavedTab"));
const ProfessionalDashboard = lazy(() => import("@/components/profile/ProfessionalDashboard"));
const CreateStatusDialog = lazy(() => import("@/components/CreateStatusDialog"));

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [isVerified, setIsVerified] = useState(false);
  const [stats, setStats] = useState({ posts: 0, reels: 0 });
  const [showStatusDialog, setShowStatusDialog] = useState(false);

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
    
    // Count posts and reels
    Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('reels').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    ]).then(([postsRes, reelsRes]) => {
      setStats({
        posts: postsRes.count || 0,
        reels: reelsRes.count || 0
      });
    });
  }, [user?.id]);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
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
    follower_count: profile?.follower_count || 0,
    following_count: profile?.following_count || 0,
  };

  const totalPosts = stats.posts + stats.reels;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Cover Background */}
      <div className="relative h-32">
        {p.cover_url ? (
          <img src={p.cover_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-semibold text-white drop-shadow-lg">{p.username}</h1>
            {isVerified && <VerifiedBadge size="xs" />}
          </div>
          
          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 text-white/90 hover:text-white">
                <Settings className="w-5 h-5 drop-shadow-lg" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-white/10">
              <DropdownMenuItem onClick={() => navigate("/profile/edit")} className="text-white/90">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => setShowStatusDialog(true)} className="text-white/90">
                <Sparkles className="w-4 h-4 mr-2" />
                Set Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/create-story")} className="text-white/90">
                <Film className="w-4 h-4 mr-2" />
                Add Story
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => navigate("/monetization")} className="text-white/90">
                <DollarSign className="w-4 h-4 mr-2" />
                Monetization
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="px-4 -mt-10 relative z-10">
        {/* Profile Header - Instagram Style */}
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <OptimizedAvatar
            src={p.avatar_url}
            alt={p.username}
            fallback={p.username[0]}
            userId={user.id}
            className="w-20 h-20 flex-shrink-0"
            showStatus={false}
            showAddButton={false}
          />

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{totalPosts}</p>
              <p className="text-[11px] text-white/50">posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{p.follower_count.toLocaleString()}</p>
              <p className="text-[11px] text-white/50">followers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">{p.following_count.toLocaleString()}</p>
              <p className="text-[11px] text-white/50">following</p>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mb-4">
          
          {/* Professional title */}
          {profile?.professional_title && (
            <p className="text-sm text-white/50 capitalize mt-0.5">
              {profile.professional_title.replace(/_/g, " ")}
            </p>
          )}
          
          {p.bio && (
            <p className="text-sm text-white/70 mt-1 leading-relaxed">{p.bio}</p>
          )}
          
          {/* Website link */}
          {profile?.show_website && profile?.website && (
            <a 
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary font-medium mt-1"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Professional Dashboard */}
        <div className="mb-4">
          <Suspense fallback={<div className="h-16 animate-pulse bg-white/5 rounded-xl" />}>
            <ProfessionalDashboard userId={user.id} />
          </Suspense>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => navigate("/profile/edit")}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Edit profile
          </button>
          <button 
            onClick={() => {
              const url = `${window.location.origin}/user/${user.id}`;
              navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
            className="flex-1 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Share profile
          </button>
        </div>

        {/* Membership Doors - No lazy load for instant display */}
        <div className="mt-2 mb-4">
          <ProfileMembershipDoors userId={user.id} />
        </div>
        {/* Tab Icons */}
        <div className="flex border-t border-white/10">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 flex justify-center ${activeTab === 'posts' ? 'border-t border-white text-white' : 'text-white/40'}`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('reels')}
            className={`flex-1 py-3 flex justify-center ${activeTab === 'reels' ? 'border-t border-white text-white' : 'text-white/40'}`}
          >
            <PlaySquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 flex justify-center ${activeTab === 'saved' ? 'border-t border-white text-white' : 'text-white/40'}`}
          >
            <Bookmark className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-1">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          }>
            {(activeTab === 'posts' || activeTab === 'reels') && <ProfileFeedTab userId={user.id} profile={profile} />}
            {activeTab === 'saved' && <ProfileSavedTab userId={user.id} />}
          </Suspense>
        </div>
      </div>

      <BottomNav />

      {/* Status Dialog */}
      {showStatusDialog && (
        <Suspense fallback={null}>
          <CreateStatusDialog
            open={showStatusDialog}
            onOpenChange={setShowStatusDialog}
            userId={user.id}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Profile;
