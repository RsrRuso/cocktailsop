import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Video, X, CheckCircle2, Zap, Music2 } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import MusicSelector from "@/components/music-box/MusicSelector";

const CreateReel = () => {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; artist: string; preview_url: string } | null>(null);
  const { uploadState, uploadSingle } = usePowerfulUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate video file type - accept all common video formats
    const allowedTypes = [
      'video/mp4', 
      'video/webm', 
      'video/quicktime',  // .mov (iPhone)
      'video/x-msvideo',  // .avi
      'video/3gpp',       // .3gp (Android)
      'video/x-matroska', // .mkv
      'video/mpeg',       // .mpeg
      'video/x-m4v'       // .m4v
    ];
    
    // More lenient - accept any video format
    if (!file.type.startsWith('video/')) {
      toast.error("Please upload a video file");
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      toast.error("Video size should be less than 200MB");
      return;
    }

    setSelectedVideo(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      toast.success("Video loaded!");
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".webm"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleCreateReel = async () => {
    // Prevent double submission
    if (isSubmitting || uploadState.isUploading) {
      return;
    }

    if (!selectedVideo) {
      toast.error("Please select a video");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Upload using powerful upload system
      const result = await uploadSingle('reels', user.id, selectedVideo);
      
      if (result.error) {
        throw result.error;
      }

      // Save to database with duplicate check
      const { error: dbError } = await supabase.from("reels").insert({
        user_id: user.id,
        video_url: result.publicUrl,
        caption: caption || "",
        thumbnail_url: result.publicUrl,
        music_track_id: selectedMusic?.id || null,
        music_url: selectedMusic?.preview_url || null,
      });

      // Ignore duplicate key errors (already uploaded)
      if (dbError && dbError.code !== '23505') {
        throw dbError;
      }

      toast.success("Reel uploaded successfully!");
      
      // Reset form and navigate
      setPreviewUrl("");
      setSelectedVideo(null);
      setCaption("");
      navigate("/reels");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-xl font-bold">Create Reel</h1>
          <Button
            onClick={handleCreateReel}
            disabled={isSubmitting || uploadState.isUploading || !previewUrl}
            className="glow-primary"
            size="sm"
          >
            {isSubmitting || uploadState.isUploading ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                {isSubmitting ? 'Saving...' : 'Uploading'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Share
              </>
            )}
          </Button>
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Video Preview or Upload Area */}
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-[9/16] max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
                <video
                  src={previewUrl}
                  controls
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setPreviewUrl("");
                    setSelectedVideo(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center z-10 hover:bg-red-600 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Music Selection */}
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

              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="glass border-primary/20 min-h-[100px]"
                disabled={uploadState.isUploading}
              />

              {uploadState.isUploading && (
                <div className="glass rounded-xl p-6 space-y-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {uploadState.progress === 100 ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 animate-in zoom-in" />
                      ) : (
                        <Zap className="w-6 h-6 text-primary animate-pulse" />
                      )}
                      <div>
                        <p className="font-semibold text-sm">{uploadState.stage}</p>
                        <p className="text-xs text-muted-foreground">
                          {uploadState.progress < 100 ? "Please wait..." : "Complete!"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {Math.round(uploadState.progress)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Progress value={uploadState.progress} className="h-3" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`aspect-[9/16] max-w-sm mx-auto border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/30 hover:border-primary/50 bg-gradient-to-br from-purple-600/20 to-pink-500/20"
                }`}
              >
                <input {...getInputProps()} />
                <Video
                  className={`w-20 h-20 mb-4 ${
                    isDragActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  strokeWidth={1.5}
                />
                <p className="text-sm font-medium mb-1 px-4 text-center">
                  {isDragActive
                    ? "Drop video here..."
                    : "Drag and drop a video, or click to select"}
                </p>
                <p className="text-xs text-muted-foreground px-4 text-center flex items-center justify-center gap-2">
                  <Zap className="w-3 h-3 text-primary" />
                  <span>All video formats • Smart compression • Max 200MB</span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => toast.info("Record feature coming soon!")}
                  className="flex-1 glass-hover h-12"
                  variant="outline"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Record
                </Button>

                <div {...getRootProps()} className="flex-1">
                  <input {...getInputProps()} />
                  <Button className="w-full glass-hover h-12" variant="outline">
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default CreateReel;
