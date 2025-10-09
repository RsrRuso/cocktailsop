import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Send, Image as ImageIcon, X, Crop } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import ImageCropDialog from "@/components/ImageCropDialog";

interface ImageFile {
  file: File;
  preview: string;
  cropped?: string;
}

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    acceptedFiles.forEach((file) => {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 15MB`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [images.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    maxFiles: 10,
    multiple: true,
  });

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const openCropDialog = (index: number) => {
    setCurrentCropIndex(index);
    setCropDialogOpen(true);
  };

  const handleCropComplete = (croppedImage: string) => {
    if (currentCropIndex !== null) {
      setImages((prev) =>
        prev.map((img, i) =>
          i === currentCropIndex ? { ...img, cropped: croppedImage } : img
        )
      );
    }
  };

  const uploadToStorage = async (imageFile: ImageFile, userId: string, index: number) => {
    const fileExt = imageFile.file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${index}.${fileExt}`;
    
    // Convert base64 to blob
    const imageToUpload = imageFile.cropped || imageFile.preview;
    const blob = await fetch(imageToUpload).then((res) => res.blob());

    const { data, error } = await supabase.storage
      .from("posts")
      .upload(fileName, blob, {
        contentType: imageFile.file.type,
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("posts")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) {
      toast.error("Please add content or images");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Upload images to storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const url = await uploadToStorage(images[i], user.id, i);
        uploadedUrls.push(url);
        setUploadProgress(((i + 1) / images.length) * 100);
      }

      // Create post with uploaded image URLs
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content,
        media_urls: uploadedUrls,
      });

      if (error) throw error;

      toast.success("Post created successfully!");
      navigate("/home");
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
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
          <Button
            onClick={handlePost}
            disabled={loading || (!content.trim() && images.length === 0)}
            className="glow-primary"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Post
          </Button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="glass border-primary/20 min-h-[120px] text-lg resize-none"
          />

          {/* Drag and Drop Area */}
          {images.length === 0 && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                {isDragActive
                  ? "Drop images here..."
                  : "Drag and drop images, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground">
                Up to 10 images • Max 15MB each
              </p>
            </div>
          )}

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={image.cropped || image.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="w-8 h-8"
                        onClick={() => openCropDialog(index)}
                      >
                        <Crop className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="w-8 h-8"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {images.length < 10 && (
                  <div
                    {...getRootProps()}
                    className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input {...getInputProps()} />
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={currentCropIndex !== null ? images[currentCropIndex]?.preview : ""}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default CreatePost;
