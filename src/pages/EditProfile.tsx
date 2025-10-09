import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    professional_title: "",
  });

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
      .single();

    if (data) {
      setProfile({
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        professional_title: data.professional_title || "",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updateData: any = {
      username: profile.username,
      full_name: profile.full_name,
      bio: profile.bio,
    };

    if (profile.professional_title) {
      updateData.professional_title = profile.professional_title;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
      navigate("/profile");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="username"
              className="glass border-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="John Doe"
              className="glass border-primary/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Professional Title</label>
            <Select
              value={profile.professional_title}
              onValueChange={(value) => setProfile({ ...profile, professional_title: value })}
            >
              <SelectTrigger className="glass border-primary/20">
                <SelectValue placeholder="Select your profession" />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="mixologist">Mixologist</SelectItem>
                <SelectItem value="bartender">Bartender</SelectItem>
                <SelectItem value="sommelier">Sommelier</SelectItem>
                <SelectItem value="bar_manager">Bar Manager</SelectItem>
                <SelectItem value="beverage_director">Beverage Director</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
                <SelectItem value="brand_ambassador">Brand Ambassador</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="investor">Investor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              className="glass border-primary/20 min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full glow-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
