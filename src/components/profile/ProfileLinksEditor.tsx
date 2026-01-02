import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { smartUpload } from "@/lib/uploadUtils";
import { AvatarCropper } from "@/components/AvatarCropper";
import { 
  Plus, 
  Trash2, 
  Link, 
  ImagePlus, 
  GripVertical,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Globe,
  MessageCircle,
  Music,
  ShoppingBag,
  Mail,
  MapPin
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileLink {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon_url: string | null;
  icon_type: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

const ICON_TYPES = [
  { value: "custom", label: "Custom Icon", icon: Link },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "twitter", label: "Twitter / X", icon: Twitter },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "tiktok", label: "TikTok", icon: Music },
  { value: "website", label: "Website", icon: Globe },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "shop", label: "Shop", icon: ShoppingBag },
  { value: "email", label: "Email", icon: Mail },
  { value: "location", label: "Location", icon: MapPin },
];

const getIconComponent = (iconType: string) => {
  const found = ICON_TYPES.find(t => t.value === iconType);
  return found?.icon || Link;
};

interface ProfileLinksEditorProps {
  userId: string;
}

const ProfileLinksEditor = ({ userId }: ProfileLinksEditorProps) => {
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Icon upload state
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [tempIconUrl, setTempIconUrl] = useState<string>("");
  const [showIconCropper, setShowIconCropper] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLinks();
  }, [userId]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_links")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLoading(false);
    }
  };

  const addLink = async () => {
    setSaving(true);
    try {
      const newLink = {
        user_id: userId,
        title: "New Link",
        url: "",
        icon_type: "custom",
        sort_order: links.length,
        is_visible: true,
      };

      const { data, error } = await supabase
        .from("profile_links")
        .insert(newLink)
        .select()
        .single();

      if (error) throw error;
      setLinks([...links, data]);
      toast.success("Link added!");
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Failed to add link");
    } finally {
      setSaving(false);
    }
  };

  const updateLink = async (id: string, updates: Partial<ProfileLink>) => {
    try {
      const { error } = await supabase
        .from("profile_links")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      
      setLinks(links.map(link => 
        link.id === id ? { ...link, ...updates } : link
      ));
    } catch (error) {
      console.error("Error updating link:", error);
      toast.error("Failed to update link");
    }
  };

  const deleteLink = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profile_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setLinks(links.filter(link => link.id !== id));
      toast.success("Link deleted!");
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link");
    } finally {
      setSaving(false);
    }
  };

  const handleIconChange = (linkId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      setEditingLinkId(linkId);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempIconUrl(reader.result as string);
        setShowIconCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIconCropComplete = async (blob: Blob) => {
    if (!editingLinkId) return;
    
    setSaving(true);
    try {
      const file = new File([blob], "link-icon.png", { type: blob.type || "image/png" });
      const result = await smartUpload("avatars", userId, file);
      
      if (result.error || !result.publicUrl) {
        throw result.error || new Error("Upload failed");
      }

      await updateLink(editingLinkId, { icon_url: result.publicUrl, icon_type: "custom" });
      toast.success("Icon uploaded!");
    } catch (error) {
      console.error("Error uploading icon:", error);
      toast.error("Failed to upload icon");
    } finally {
      setSaving(false);
      setShowIconCropper(false);
      setTempIconUrl("");
      setEditingLinkId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-muted rounded-xl" />
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showIconCropper && tempIconUrl && (
        <AvatarCropper
          imageUrl={tempIconUrl}
          onCropComplete={handleIconCropComplete}
          onCancel={() => {
            setShowIconCropper(false);
            setTempIconUrl("");
            setEditingLinkId(null);
          }}
        />
      )}

      <input
        ref={iconInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (editingLinkId) {
            handleIconChange(editingLinkId, e);
          }
        }}
        className="hidden"
      />

      {links.map((link, index) => {
        const IconComponent = getIconComponent(link.icon_type);
        
        return (
          <div 
            key={link.id}
            className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4"
          >
            <div className="flex items-start gap-3">
              {/* Icon Section */}
              <div className="relative flex-shrink-0">
                <div 
                  className="w-14 h-14 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    if (link.icon_type === "custom") {
                      setEditingLinkId(link.id);
                      iconInputRef.current?.click();
                    }
                  }}
                >
                  {link.icon_url && link.icon_type === "custom" ? (
                    <img src={link.icon_url} alt="Link icon" className="w-full h-full object-cover" />
                  ) : (
                    <IconComponent className="w-6 h-6 text-primary" />
                  )}
                </div>
                {link.icon_type === "custom" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLinkId(link.id);
                      iconInputRef.current?.click();
                    }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all"
                  >
                    <ImagePlus className="w-3 h-3 text-primary-foreground" />
                  </button>
                )}
              </div>

              {/* Content Section */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={link.title}
                    onChange={(e) => updateLink(link.id, { title: e.target.value })}
                    placeholder="Link Title"
                    className="glass border-primary/20 font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteLink(link.id)}
                    disabled={saving}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <Input
                  value={link.url}
                  onChange={(e) => updateLink(link.id, { url: e.target.value })}
                  placeholder="https://example.com"
                  className="glass border-primary/20"
                />

                <div className="flex items-center gap-4 flex-wrap">
                  <Select
                    value={link.icon_type}
                    onValueChange={(value) => updateLink(link.id, { icon_type: value })}
                  >
                    <SelectTrigger className="w-40 glass border-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {ICON_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`visible-${link.id}`}
                      checked={link.is_visible}
                      onCheckedChange={(checked) => updateLink(link.id, { is_visible: checked })}
                    />
                    <Label htmlFor={`visible-${link.id}`} className="text-sm text-muted-foreground">
                      Show on profile
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Button
        variant="outline"
        className="w-full border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5"
        onClick={addLink}
        disabled={saving}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Link
      </Button>

      {links.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">
          No links added yet. Click "Add Link" to add your first link.
        </p>
      )}
    </div>
  );
};

export default ProfileLinksEditor;
