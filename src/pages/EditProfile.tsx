import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Save, Camera } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      .maybeSingle();

    if (data) {
      setProfile({
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        professional_title: data.professional_title || "",
      });
      setAvatarUrl(data.avatar_url || "");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let finalAvatarUrl = avatarUrl;

    // Upload avatar if a new file was selected
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Note: This is a placeholder URL since storage bucket doesn't exist yet
      // In production, you would create a storage bucket and upload the file
      toast.info("Avatar upload feature requires storage bucket setup");
    }

    const updateData: any = {
      username: profile.username,
      full_name: profile.full_name,
      bio: profile.bio,
      avatar_url: finalAvatarUrl,
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
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-32 h-32 ring-4 ring-primary/30">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-3xl">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all glow-primary"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Click the camera icon to upload a high-quality avatar (max 5MB)
            </p>
          </div>

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
