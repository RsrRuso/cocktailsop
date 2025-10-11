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
      // Validate MIME types
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/webm'];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (isVideo && !allowedVideoTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid video format. Please upload MP4 or WebM`);
        return;
      }
      
      if (isImage && !allowedImageTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid image format. Please upload JPEG, PNG, or WebP`);
        return;
      }
      
      if (!isVideo && !isImage) {
        toast.error(`${file.name}: Invalid file type. Please upload images or videos only`);
        return;
      }
      
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max ${isVideo ? '50' : '10'}MB`);
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

      for (let i = 0; i < selectedMedia.length; i++) {
        const file = selectedMedia[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        mediaTypes.push(file.type.startsWith('video') ? 'video' : 'image');
        
        toast.info(`Uploaded ${i + 1}/${selectedMedia.length}`);
      }

      // Check if user has an active story (within last 24 hours)
      const { data: existingStories, error: fetchError } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      if (existingStories && existingStories.length > 0) {
        // Add to the most recent story
        const existingStory = existingStories[0];
        const updatedMediaUrls = [...(existingStory.media_urls || []), ...uploadedUrls];
        const updatedMediaTypes = [...(existingStory.media_types || []), ...mediaTypes];

        const { error: updateError } = await supabase
          .from("stories")
          .update({
            media_urls: updatedMediaUrls,
            media_types: updatedMediaTypes,
          })
          .eq("id", existingStory.id);

        if (updateError) throw updateError;
        
        toast.success(`Added ${uploadedUrls.length} to your story! (${updatedMediaUrls.length} total)`);
      } else {
        // Create new story
        const { error: insertError } = await supabase
          .from("stories")
          .insert({
            user_id: user.id,
            media_urls: uploadedUrls,
            media_types: mediaTypes,
          });

        if (insertError) throw insertError;
        
        toast.success(`Story created with ${uploadedUrls.length} media!`);
      }

      navigate("/home");
    } catch (error: any) {
      toast.error(`Failed: ${error.message || 'Unknown error'}`);
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
