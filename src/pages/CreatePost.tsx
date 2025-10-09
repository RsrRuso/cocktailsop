import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Image, X } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    files.forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 15MB`);
        return;
      }

      setSelectedImages(prev => [...prev, file]);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      toast.error("Please add content or images");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        content: content,
        media_urls: previewUrls,
      });

    if (error) {
      toast.error("Failed to create post");
    } else {
      toast.success("Post created successfully!");
      navigate("/home");
    }
    setLoading(false);
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
          <h1 className="text-xl font-bold">Create Post</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="glass border-primary/20 min-h-[200px] text-lg resize-none"
          />

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-40 object-cover rounded-xl" />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              className="glass-hover flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedImages.length >= 5}
            >
              <Image className="w-5 h-5 mr-2" />
              {selectedImages.length >= 5 ? "Max 5 Images" : "Add Photo"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            📸 High-quality images supported • Max 15MB per image
          </p>

          <Button
            onClick={handlePost}
            disabled={loading || (!content.trim() && selectedImages.length === 0)}
            className="w-full glow-primary h-12"
          >
            <Send className="w-5 h-5 mr-2" />
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
