import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Camera } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import { AvatarCropper } from "@/components/AvatarCropper";
import { CoverPhotoCropper } from "@/components/CoverPhotoCropper";

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string>("");
  const [showCropper, setShowCropper] = useState(false);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [tempCoverUrl, setTempCoverUrl] = useState<string>("");
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [croppedCoverBlob, setCroppedCoverBlob] = useState<Blob | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    professional_title: "",
    region: "All",
    phone: "",
    whatsapp: "",
    website: "",
    date_of_birth: "",
    show_phone: true,
    show_whatsapp: true,
    show_website: true,
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
        region: data.region || "All",
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        website: data.website || "",
        date_of_birth: data.date_of_birth || "",
        show_phone: data.show_phone ?? true,
        show_whatsapp: data.show_whatsapp ?? true,
        show_website: data.show_website ?? true,
      });
      setAvatarUrl(data.avatar_url || "");
      setCoverUrl(data.cover_url || "");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size should be less than 10MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatarUrl(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (blob: Blob) => {
    setCroppedBlob(blob);
    const url = URL.createObjectURL(blob);
    setAvatarUrl(url);
    setShowCropper(false);
    toast.success("Avatar cropped! Click Save to update your profile.");
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("Image size should be less than 15MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempCoverUrl(reader.result as string);
        setShowCoverCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverCropComplete = (blob: Blob) => {
    setCroppedCoverBlob(blob);
    const url = URL.createObjectURL(blob);
    setCoverUrl(url);
    setShowCoverCropper(false);
    toast.success("Cover photo cropped! Click Save to update your profile.");
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let finalAvatarUrl = avatarUrl;
    let finalCoverUrl = coverUrl;

    // Upload avatar and cover if new cropped images exist
    const processImages = async () => {
      const updates: any = {
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        region: profile.region,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        website: profile.website,
        date_of_birth: profile.date_of_birth || null,
        show_phone: profile.show_phone,
        show_whatsapp: profile.show_whatsapp,
        show_website: profile.show_website,
      };

      if (profile.professional_title) {
        updates.professional_title = profile.professional_title;
      }

      // Process avatar
      if (croppedBlob) {
        const avatarReader = new FileReader();
        await new Promise((resolve) => {
          avatarReader.onloadend = () => {
            updates.avatar_url = avatarReader.result as string;
            resolve(null);
          };
          avatarReader.readAsDataURL(croppedBlob);
        });
      } else {
        updates.avatar_url = finalAvatarUrl;
      }

      // Process cover
      if (croppedCoverBlob) {
        const coverReader = new FileReader();
        await new Promise((resolve) => {
          coverReader.onloadend = () => {
            updates.cover_url = coverReader.result as string;
            resolve(null);
          };
          coverReader.readAsDataURL(croppedCoverBlob);
        });
      } else {
        updates.cover_url = finalCoverUrl;
      }

      return updates;
    };

    const updates = await processImages();

    const { error } = await supabase
      .from("profiles")
      .update(updates)
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

      {showCropper && tempAvatarUrl && (
        <AvatarCropper
          imageUrl={tempAvatarUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setTempAvatarUrl("");
          }}
        />
      )}

      {showCoverCropper && tempCoverUrl && (
        <CoverPhotoCropper
          imageUrl={tempCoverUrl}
          onCropComplete={handleCoverCropComplete}
          onCancel={() => {
            setShowCoverCropper(false);
            setTempCoverUrl("");
          }}
        />
      )}

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
          {/* Cover Photo Upload */}
          <div className="space-y-4">
            <label className="text-sm font-medium">Cover Photo</label>
            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-muted">
              {coverUrl ? (
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No cover photo
                </div>
              )}
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all glow-primary"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Click camera to upload high-quality cover photo (max 15MB)<br/>
              Image will be cropped to 16:9 format
            </p>
          </div>

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
              Click camera to upload high-quality avatar (max 10MB)<br/>
              Image will be cropped to circular format
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
            <label className="text-sm font-medium">Region</label>
            <Select
              value={profile.region}
              onValueChange={(value) => setProfile({ ...profile, region: value })}
            >
              <SelectTrigger className="glass border-primary/20">
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="All">All Regions 🌐</SelectItem>
                <SelectItem value="USA">USA 🇺🇸</SelectItem>
                <SelectItem value="UK">UK 🇬🇧</SelectItem>
                <SelectItem value="Europe">Europe 🇪🇺</SelectItem>
                <SelectItem value="Asia">Asia 🌏</SelectItem>
                <SelectItem value="Middle East">Middle East 🌍</SelectItem>
                <SelectItem value="Africa">Africa 🌍</SelectItem>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <Input
              type="date"
              value={profile.date_of_birth}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                const today = new Date();
                const age = today.getFullYear() - selectedDate.getFullYear();
                if (age < 18) {
                  toast.error("You must be at least 18 years old");
                  return;
                }
                setProfile({ ...profile, date_of_birth: e.target.value });
              }}
              max={new Date().toISOString().split('T')[0]}
              className="glass border-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Used to celebrate your birthday with fireworks on your profile
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1234567890"
                className="glass border-primary/20"
              />
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="show-phone"
                  checked={profile.show_phone}
                  onCheckedChange={(checked) => setProfile({ ...profile, show_phone: checked })}
                />
                <Label htmlFor="show-phone" className="text-sm text-muted-foreground">
                  Show phone number on profile
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Number</label>
              <Input
                type="tel"
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                placeholder="+1234567890"
                className="glass border-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US, +44 for UK, +971 for UAE)
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="show-whatsapp"
                  checked={profile.show_whatsapp}
                  onCheckedChange={(checked) => setProfile({ ...profile, show_whatsapp: checked })}
                />
                <Label htmlFor="show-whatsapp" className="text-sm text-muted-foreground">
                  Show WhatsApp on profile
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              <Input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                className="glass border-primary/20"
              />
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="show-website"
                  checked={profile.show_website}
                  onCheckedChange={(checked) => setProfile({ ...profile, show_website: checked })}
                />
                <Label htmlFor="show-website" className="text-sm text-muted-foreground">
                  Show website on profile
                </Label>
              </div>
            </div>
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
