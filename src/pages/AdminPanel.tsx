import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const setAsFounder = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_founder: true, is_verified: true })
      .eq("id", currentUserId);

    if (error) {
      toast.error("Failed to update founder status");
      return;
    }

    toast.success("You are now a founder! 👑");
    fetchCurrentUser();
    setTimeout(() => navigate("/home"), 1500);
  };

  const removeFounder = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_founder: false })
      .eq("id", currentUserId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success("Founder status removed");
    fetchCurrentUser();
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <Shield className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage your verification status</p>
          </div>

          {profile && (
            <div className="space-y-4">
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Username</span>
                  <span className="font-semibold">{profile.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <Badge variant={profile.is_verified ? "default" : "secondary"}>
                    {profile.is_verified ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Founder</span>
                  <Badge variant={profile.is_founder ? "default" : "secondary"}>
                    {profile.is_founder ? "Yes ✨" : "No"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {!profile.is_founder ? (
                  <Button
                    onClick={setAsFounder}
                    className="w-full gap-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:opacity-90"
                    size="lg"
                  >
                    <Crown className="w-5 h-5" />
                    Set as Founder
                  </Button>
                ) : (
                  <Button
                    onClick={removeFounder}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Remove Founder Status
                  </Button>
                )}

                <Button
                  onClick={() => navigate("/home")}
                  variant="outline"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminPanel;
