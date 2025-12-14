import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Send, Image as ImageIcon, X, Crop, Music, Music2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import ImageCropDialog from "@/components/ImageCropDialog";
import MusicSelector from "@/components/music-box/MusicSelector";

interface MediaFile {
  file: File;
  preview: string;
  cropped?: string;
  type: 'image' | 'audio';
}

const CreatePost = () => {
  const navigate = useNavigate();
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; artist: string; preview_url: string } | null>(null);

  const generateContent = async () => {
    if (!headline.trim()) {
      toast.error("Enter a headline first");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-post-generator', {
        body: { headline: headline.trim() }
      });

      if (error) throw error;

      if (data?.content) {
        setContent(data.content);
        toast.success("Content generated!");
      } else {
        throw new Error("No content generated");
      }
    } catch (error: any) {
      console.error("Error generating content:", error);
      if (error.message?.includes('429') || error.status === 429) {
        toast.error("Rate limit exceeded, try again later");
      } else if (error.message?.includes('402') || error.status === 402) {
        toast.error("AI credits exhausted");
      } else {
        toast.error("Failed to generate content");
      }
    } finally {
      setGenerating(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (mediaFiles.length + acceptedFiles.length > 10) {
      toast.error("Maximum 10 media files allowed");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
    
    for (const file of acceptedFiles) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Please upload images or audio files`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Maximum size is 15MB`);
        return;
      }
    }

    acceptedFiles.forEach((file) => {
      const isAudio = file.type.startsWith('audio/');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFiles((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
            type: isAudio ? 'audio' : 'image',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, [mediaFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
      "audio/*": [".mp3", ".wav", ".ogg", ".webm"],
    },
    maxFiles: 10,
    multiple: true,
  });

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openCropDialog = (index: number) => {
    setCurrentCropIndex(index);
    setCropDialogOpen(true);
  };

  const handleCropComplete = (croppedImage: string) => {
    if (currentCropIndex !== null) {
      setMediaFiles((prev) =>
        prev.map((media, i) =>
          i === currentCropIndex ? { ...media, cropped: croppedImage } : media
        )
      );
    }
  };

  const uploadToStorage = async (mediaFile: MediaFile, userId: string, index: number) => {
    const fileExt = mediaFile.file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${index}.${fileExt}`;
    
    let blob: Blob;
    
    if (mediaFile.type === 'audio') {
      blob = mediaFile.file;
    } else {
      const imageToUpload = mediaFile.cropped || mediaFile.preview;
      blob = await fetch(imageToUpload).then((res) => res.blob());
    }

    const { data, error } = await supabase.storage
      .from("posts")
      .upload(fileName, blob, {
        contentType: mediaFile.file.type,
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("posts")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handlePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Please add content or media files");
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

      const uploadedUrls: string[] = [];
      for (let i = 0; i < mediaFiles.length; i++) {
        const url = await uploadToStorage(mediaFiles[i], user.id, i);
        uploadedUrls.push(url);
        setUploadProgress(((i + 1) / mediaFiles.length) * 100);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content,
        media_urls: uploadedUrls,
        music_track_id: selectedMusic?.id || null,
        music_url: selectedMusic?.preview_url || null,
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
            disabled={loading || (!content.trim() && mediaFiles.length === 0)}
            className="glow-primary"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Post
          </Button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          {/* Music Selection Button */}
          <Button
            variant="outline"
            className="w-full glass-hover justify-start gap-3"
            onClick={() => setShowMusicSelector(true)}
          >
            <Music2 className="w-5 h-5 text-primary" />
            {selectedMusic ? (
              <span className="truncate">{selectedMusic.title} - {selectedMusic.artist}</span>
            ) : (
              <span className="text-muted-foreground">Add music from Music Box</span>
            )}
          </Button>

          {/* AI Headline Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="What's your post about? (headline for AI)"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="flex-1 glass border-primary/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && headline.trim()) {
                    e.preventDefault();
                    generateContent();
                  }
                }}
              />
              <Button
                onClick={generateContent}
                disabled={generating || !headline.trim()}
                variant="secondary"
                size="icon"
                className="shrink-0"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Type a topic and tap ✨ to generate content with AI
            </p>
          </div>

          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="glass border-primary/20 min-h-[140px] text-lg resize-none"
          />

          {/* Optional Media - Collapsible */}
          {mediaFiles.length === 0 && (
            <div
              {...getRootProps()}
              className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/20 hover:border-primary/40 bg-muted/30"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center justify-center gap-3">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                <Music className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isDragActive ? "Drop files..." : "Add photos or audio (optional)"}
                </span>
              </div>
            </div>
          )}

          {/* Media Grid */}
          {mediaFiles.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="relative group">
                    {media.type === 'image' ? (
                      <div className="aspect-square">
                        <img
                          src={media.cropped || media.preview}
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
                            onClick={() => removeMedia(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-primary/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                        <Music className="w-8 h-8 text-primary" />
                        <p className="text-xs text-center truncate w-full">{media.file.name}</p>
                        <audio src={media.preview} controls className="w-full" />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="w-8 h-8 mt-2"
                          onClick={() => removeMedia(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {mediaFiles.length < 10 && (
                  <div
                    {...getRootProps()}
                    className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
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
        imageSrc={currentCropIndex !== null && mediaFiles[currentCropIndex]?.type === 'image' ? mediaFiles[currentCropIndex]?.preview : ""}
        onCropComplete={handleCropComplete}
      />

      {/* Music Selector Dialog */}
      <MusicSelector
        open={showMusicSelector}
        onOpenChange={setShowMusicSelector}
        onSelect={(track) => {
          setSelectedMusic({
            id: track.id,
            title: track.title,
            artist: track.profiles?.username || 'Unknown',
            preview_url: track.preview_url || track.original_url
          });
          setShowMusicSelector(false);
          toast.success(`Added: ${track.title}`);
        }}
      />
    </div>
  );
};

export default CreatePost;
