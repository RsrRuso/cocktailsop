import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Camera, X } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreateStory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];
    let processedCount = 0;

    files.forEach((file) => {
      const maxSize = file.type.startsWith('video') ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max ${file.type.startsWith('video') ? '50' : '15'}MB`);
        return;
      }

      validFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result as string);
        processedCount++;
        
        if (processedCount === validFiles.length) {
          setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
          setSelectedMedia(prev => [...prev, ...validFiles]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} media file(s) added!`);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedia(selectedMedia.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleCreateStory = async () => {
    if (selectedMedia.length === 0) {
      toast.error("Please select media for your story");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      // Upload files to storage
      const uploadedUrls: string[] = [];
      const mediaTypes: string[] = [];

      for (const file of selectedMedia) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        mediaTypes.push(file.type.startsWith('video') ? 'video' : 'image');
      }

      // Create story with uploaded URLs
      const { error } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_urls: uploadedUrls,
          media_types: mediaTypes,
        });

      if (error) throw error;

      toast.success("Story added successfully!");
      navigate("/home");
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error("Failed to create story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Add Story</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-8 space-y-6 text-center">
          {previewUrls.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    {selectedMedia[index]?.type.startsWith('video') ? (
                      <video src={url} className="w-full h-48 object-cover rounded-xl" />
                    ) : (
                      <img src={url} alt={`Preview ${index + 1}`} className="w-full h-48 object-cover rounded-xl" />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{previewUrls.length} media file(s) added</p>
            </div>
          ) : (
            <>
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-xl shadow-orange-500/50">
                <Camera className="w-16 h-16 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">Create Your Story</h2>
                <p className="text-muted-foreground">
                  Share a moment that disappears after 24 hours
                </p>
              </div>
            </>
          )}

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => toast.info("Camera feature coming soon!")}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload from Gallery
            </Button>

            <Button
              onClick={handleCreateStory}
              disabled={loading || previewUrls.length === 0}
              className="w-full glow-primary h-14"
            >
              {loading ? "Creating..." : `Share Story (${previewUrls.length})`}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            📸 Images: 15MB max • 🎥 Videos: 50MB max • High quality preserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
