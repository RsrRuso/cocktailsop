import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileGrowthTab from "@/components/profile/ProfileGrowthTab";
import BottomNav from "@/components/BottomNav";

const ProfileGrowth = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-white">Professional Growth</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <ProfileGrowthTab 
          userId={user.id} 
          profile={profile}
          userRoles={{ isFounder: false, isVerified: false }}
        />
      </div>

      <BottomNav />
    </main>
  );
};

export default ProfileGrowth;
