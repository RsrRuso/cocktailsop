import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Video, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreateReel = () => {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate video file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid video format. Please upload MP4, WebM, or QuickTime");
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
    if (!selectedVideo) {
      toast.error("Please select a video");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setUploadStage("Preparing");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Simulate preparing stage
      for (let i = 0; i <= 15; i += 3) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const fileExt = selectedVideo.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      setUploadProgress(20);
      setUploadStage("Uploading");

      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 70) {
            clearInterval(uploadInterval);
            return 70;
          }
          return prev + 5;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(fileName, selectedVideo, {
          contentType: selectedVideo.type,
          upsert: false,
        });

      clearInterval(uploadInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(75);
      setUploadStage("Processing");

      // Smooth transition through processing
      for (let i = 75; i <= 85; i += 2) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      const { data: { publicUrl } } = supabase.storage
        .from("reels")
        .getPublicUrl(fileName);

      setUploadProgress(90);
      setUploadStage("Saving");

      const { error: dbError } = await supabase.from("reels").insert({
        user_id: user.id,
        video_url: publicUrl,
        caption: caption || "",
        thumbnail_url: publicUrl,
      });

      if (dbError) throw dbError;

      // Final completion
      for (let i = 90; i <= 100; i += 2) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setUploadStage("Done!");
      
      toast.success("Reel uploaded successfully!");
      
      // Reset form after successful upload
      setTimeout(() => {
        setPreviewUrl("");
        setSelectedVideo(null);
        setCaption("");
      }, 1000);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Upload failed: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setUploadStage("");
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
            disabled={loading || !previewUrl}
            className="glow-primary"
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Share
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

              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="glass border-primary/20 min-h-[100px]"
              />

              {loading && (
                <div className="glass rounded-xl p-6 space-y-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {uploadProgress === 100 ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 animate-in zoom-in" />
                      ) : (
                        <div className="relative w-6 h-6">
                          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                          <div 
                            className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{uploadStage}</p>
                        <p className="text-xs text-muted-foreground">Please wait...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Progress value={uploadProgress} className="h-3" />
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {['Prepare', 'Upload', 'Process', 'Save'].map((stage, idx) => {
                      const stageProgress = (idx + 1) * 25;
                      const isActive = uploadProgress >= stageProgress - 20;
                      const isComplete = uploadProgress >= stageProgress;
                      
                      return (
                        <div key={stage} className="text-center space-y-1">
                          <div className={`w-2 h-2 rounded-full mx-auto transition-all duration-300 ${
                            isComplete ? 'bg-green-500 scale-125' : 
                            isActive ? 'bg-primary animate-pulse' : 
                            'bg-muted'
                          }`} />
                          <p className={`transition-colors duration-200 ${
                            isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                          }`}>{stage}</p>
                        </div>
                      );
                    })}
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
                <p className="text-xs text-muted-foreground px-4 text-center">
                  MP4, MOV, AVI, WebM • Max 200MB
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
    </div>
  );
};

export default CreateReel;
