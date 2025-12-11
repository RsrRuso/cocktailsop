import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Video, X, CheckCircle2, Zap, Music2, Loader2, VolumeX, Volume2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import { useAutoMusicExtraction } from "@/hooks/useAutoMusicExtraction";
import MusicSelector from "@/components/music-box/MusicSelector";
import { compressVideo, needsCompression, getFileSizeMB, CompressionProgress } from "@/lib/videoCompression";

const CreateReel = () => {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ id: string; title: string; artist: string; preview_url: string } | null>(null);
  const [muteOriginalAudio, setMuteOriginalAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { uploadState, uploadSingle } = usePowerfulUpload();
  const { extractAndAnalyzeAudio, isExtracting, extractionProgress } = useAutoMusicExtraction();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync audio with video playback
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    
    if (!video || !selectedMusic) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (audio && selectedMusic) {
        audio.currentTime = video.currentTime;
        audio.play().catch(console.error);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      audio?.pause();
    };

    const handleSeeked = () => {
      if (audio && selectedMusic) {
        audio.currentTime = video.currentTime;
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      audio?.pause();
      if (audio) audio.currentTime = 0;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selectedMusic]);

  // Update video muted state when muteOriginalAudio or selectedMusic changes
  useEffect(() => {
    if (videoRef.current) {
      // When music is selected, always mute original by default
      if (selectedMusic) {
        videoRef.current.muted = muteOriginalAudio;
      } else {
        videoRef.current.muted = false;
      }
    }
  }, [muteOriginalAudio, selectedMusic]);

  // Auto-mute original audio when music is selected
  useEffect(() => {
    if (selectedMusic) {
      setMuteOriginalAudio(true);
    }
  }, [selectedMusic]);

  // Cleanup audio on unmount or music change
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

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
    if (isSubmitting || uploadState.isUploading || isCompressing) {
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

      let videoToUpload = selectedVideo;

      // Compress video if needed (over 50MB)
      if (needsCompression(selectedVideo)) {
        const originalSize = getFileSizeMB(selectedVideo);
        toast.info(`Compressing ${originalSize.toFixed(1)}MB video...`);
        setIsCompressing(true);
        
        try {
          videoToUpload = await compressVideo(selectedVideo, 45, (progress) => {
            setCompressionProgress(progress);
          });
          
          const newSize = getFileSizeMB(videoToUpload);
          toast.success(`Compressed to ${newSize.toFixed(1)}MB`);
        } catch (compressError) {
          console.error('Compression failed:', compressError);
          toast.error("Compression failed. Please try a smaller video.");
          setIsCompressing(false);
          setIsSubmitting(false);
          return;
        }
        
        setIsCompressing(false);
        setCompressionProgress(null);
      }

      // Upload using powerful upload system
      const result = await uploadSingle('reels', user.id, videoToUpload);
      
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
        mute_original_audio: muteOriginalAudio,
      });

      // Ignore duplicate key errors (already uploaded)
      if (dbError && dbError.code !== '23505') {
        throw dbError;
      }

      toast.success("Reel uploaded successfully!");

      // Save audio to Music Box instantly (no extraction needed - video URL works as audio)
      if (!selectedMusic && selectedVideo) {
        // Fire and forget - don't wait
        extractAndAnalyzeAudio(result.publicUrl, selectedVideo.name);
      }
      
      // Reset form and navigate immediately
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
            disabled={isSubmitting || uploadState.isUploading || isCompressing || !previewUrl}
            className="glow-primary"
            size="sm"
          >
            {isCompressing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Compressing
              </>
            ) : isSubmitting || uploadState.isUploading ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                {uploadState.isUploading ? 'Uploading' : 'Saving...'}
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
                  ref={videoRef}
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  muted={selectedMusic ? muteOriginalAudio : false}
                  playsInline
                  loop
                />
                
                {/* Synced Audio for selected music */}
                {selectedMusic && (
                  <audio
                    ref={audioRef}
                    src={selectedMusic.preview_url}
                    loop
                    preload="auto"
                  />
                )}

                {/* Play/Pause overlay */}
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </div>
                </button>

                {/* Music indicator when playing */}
                {selectedMusic && isPlaying && (
                  <div className="absolute bottom-4 left-4 right-4 glass rounded-lg px-3 py-2 flex items-center gap-2 animate-pulse">
                    <Music2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium truncate">{selectedMusic.title}</span>
                    <span className="text-xs text-muted-foreground">- {selectedMusic.artist}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    audioRef.current?.pause();
                    setPreviewUrl("");
                    setSelectedVideo(null);
                    setSelectedMusic(null);
                    setIsPlaying(false);
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

              {/* Mute Original Audio Toggle - Only show when music is selected */}
              {selectedMusic && (
                <button
                  onClick={() => setMuteOriginalAudio(!muteOriginalAudio)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    muteOriginalAudio 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-card/50 border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {muteOriginalAudio ? (
                      <VolumeX className="w-5 h-5 text-primary" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {muteOriginalAudio ? 'Original audio muted' : 'Mute original video audio'}
                    </span>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${
                    muteOriginalAudio ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <div className={`w-4 h-4 mt-1 rounded-full bg-white transition-transform ${
                      muteOriginalAudio ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </div>
                </button>
              )}

              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="glass border-primary/20 min-h-[100px]"
                disabled={uploadState.isUploading}
              />

              {/* Compression Progress */}
              {isCompressing && compressionProgress && (
                <div className="glass rounded-xl p-6 space-y-4 border border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                      <div>
                        <p className="font-semibold text-sm">Compressing Video</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {compressionProgress.stage}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                        {Math.round(compressionProgress.progress)}%
                      </p>
                    </div>
                  </div>
                  <Progress value={compressionProgress.progress} className="h-3" />
                </div>
              )}

              {/* Upload Progress */}
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
