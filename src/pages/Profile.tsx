import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Wine, Briefcase, ChefHat, Warehouse, Truck, Building2, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  professional_title: string | null;
  badge_level: string;
  follower_count: number;
  following_count: number;
  post_count: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetchProfile();
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

    if (data) setProfile(data);
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

      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="glass rounded-2xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className={`w-24 h-24 avatar-glow ring-4 ring-offset-4 ring-offset-background bg-gradient-to-br ${getBadgeColor(profile.badge_level)}`}>
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
              <p className="text-2xl font-bold">{profile.post_count}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.follower_count}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile.following_count}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
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
          <TabsList className="grid w-full grid-cols-3 glass">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
              <p>No posts yet</p>
            </div>
          </TabsContent>

          <TabsContent value="reels" className="mt-4">
            <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
              <p>No reels yet</p>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="mt-4 space-y-4">
            <div className="glass rounded-2xl p-6 space-y-6">
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
                  <div className="flex justify-between items-center glass rounded-xl p-4">
                    <span className="text-sm text-muted-foreground">Badge Level</span>
                    <Badge className={`bg-gradient-to-r ${getBadgeColor(profile.badge_level)} border-0 text-white capitalize`}>
                      {profile.badge_level}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center glass rounded-xl p-4">
                    <span className="text-sm text-muted-foreground">Network Reach</span>
                    <span className="text-sm font-semibold">{profile.follower_count + profile.following_count}</span>
                  </div>
                  <div className="flex justify-between items-center glass rounded-xl p-4">
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
    </div>
  );
};

export default Profile;
