import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Music, 
  Upload, 
  X, 
  Play, 
  Pause, 
  FileAudio,
  Sparkles,
  Tag,
  Folder,
  CheckCircle2,
  Loader2,
  CloudUpload,
  Headphones,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface AdvancedMusicUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: {
    title: string;
    category: string;
    tags: string[];
    file: File;
  }) => Promise<void>;
  uploading?: boolean;
}

const CATEGORIES = [
  { value: 'beat', label: 'Beat', icon: '🎵', color: 'from-purple-500 to-pink-500' },
  { value: 'ambient', label: 'Ambient', icon: '🌊', color: 'from-blue-500 to-cyan-500' },
  { value: 'jingle', label: 'Jingle', icon: '🔔', color: 'from-yellow-500 to-orange-500' },
  { value: 'voice', label: 'Voice', icon: '🎤', color: 'from-green-500 to-emerald-500' },
  { value: 'sfx', label: 'Effects', icon: '💥', color: 'from-red-500 to-rose-500' },
  { value: 'other', label: 'Other', icon: '🎧', color: 'from-gray-500 to-slate-500' },
];

const POPULAR_TAGS = ['trending', 'viral', 'lofi', 'chill', 'upbeat', 'dramatic', 'funny', 'motivational'];

export function AdvancedMusicUploadDialog({ 
  open, 
  onOpenChange, 
  onUpload,
  uploading = false 
}: AdvancedMusicUploadDialogProps) {
  const [step, setStep] = useState<'upload' | 'details' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset state when closing
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setTitle("");
        setCategory("other");
        setTags([]);
        setTagInput("");
        setUploadProgress(0);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setIsPlaying(false);
      }, 300);
    }
  }, [open]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    // Auto-fill title from filename
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
    setTitle(nameWithoutExt);
    
    // Get audio duration
    const audio = new Audio(URL.createObjectURL(selectedFile));
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };
    
    setStep('details');
  };

  const handlePlayPause = () => {
    if (!file) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(file));
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 5) {
      setTags([...tags, cleanTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload({
        title: title.trim(),
        category,
        tags,
        file
      });
      setUploadProgress(100);
      setStep('success');
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[95vh] max-h-[95vh] bg-background/95 backdrop-blur-xl">
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <CloudUpload className="w-5 h-5 text-primary-foreground" />
              </div>
              Upload Sound
            </DrawerTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-safe">
          <AnimatePresence mode="wait">
            {/* Step 1: File Upload */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative h-64 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
                    isDragging 
                      ? "border-primary bg-primary/10 scale-[1.02]" 
                      : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                  
                  <div className="relative h-full flex flex-col items-center justify-center gap-4 p-6">
                    <motion.div
                      animate={isDragging ? { scale: 1.1, rotate: 10 } : { scale: 1, rotate: 0 }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                    >
                      <FileAudio className="w-10 h-10 text-primary" />
                    </motion.div>
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {isDragging ? "Drop it here!" : "Drag & Drop Audio"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        or tap to browse your files
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      {['MP3', 'WAV', 'M4A', 'OGG'].map(format => (
                        <Badge key={format} variant="secondary" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileSelect(selectedFile);
                    }}
                    className="hidden"
                  />
                </div>

                {/* Tips */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Tips for great uploads
                  </h4>
                  <div className="grid gap-2">
                    {[
                      'Keep clips under 60 seconds for best engagement',
                      'High quality audio (320kbps+) sounds best',
                      'Catchy hooks in the first 5 seconds work great',
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* File Preview */}
                {file && (
                  <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handlePlayPause}
                        className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-primary-foreground" />
                        ) : (
                          <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          {audioDuration && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Headphones className="w-3 h-3" />
                                {formatDuration(audioDuration)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setFile(null);
                          setStep('upload');
                          if (audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current = null;
                          }
                        }}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Waveform Animation */}
                    <div className="flex items-end justify-center gap-1 h-12 mt-4">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 bg-primary/40 rounded-full"
                          animate={isPlaying ? {
                            height: [
                              `${20 + Math.random() * 60}%`,
                              `${40 + Math.random() * 50}%`,
                              `${20 + Math.random() * 60}%`
                            ]
                          } : {
                            height: `${30 + Math.sin(i * 0.5) * 20}%`
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: isPlaying ? Infinity : 0,
                            delay: i * 0.02
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Sound Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your sound a catchy name"
                    className="h-12 text-base rounded-xl"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Folder className="w-4 h-4 text-primary" />
                    Category
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={cn(
                          "relative p-3 rounded-xl border-2 transition-all text-left",
                          category === cat.value
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-xl mb-2",
                          cat.color
                        )}>
                          {cat.icon}
                        </div>
                        <span className="text-sm font-medium">{cat.label}</span>
                        {category === cat.value && (
                          <motion.div
                            layoutId="categoryCheck"
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    Tags (up to 5)
                  </Label>
                  
                  {/* Added tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge 
                          key={tag} 
                          variant="secondary"
                          className="pl-2 pr-1 py-1 gap-1 text-sm"
                        >
                          #{tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="w-4 h-4 rounded-full hover:bg-foreground/10 flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tag input */}
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput) {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      placeholder="Add a tag..."
                      className="h-11 rounded-xl"
                      maxLength={20}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => addTag(tagInput)}
                      disabled={!tagInput || tags.length >= 5}
                      className="h-11 px-4 rounded-xl"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Popular tags */}
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TAGS.filter(t => !tags.includes(t)).slice(0, 6).map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        disabled={tags.length >= 5}
                        className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="text-foreground font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={uploading || !file || !title.trim()}
                  className="w-full h-14 text-base font-semibold rounded-xl gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Sound
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Your sound will be reviewed before being published
                </p>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center space-y-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/30"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>

                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Upload Complete!</h2>
                  <p className="text-muted-foreground">
                    Your sound has been submitted for review
                  </p>
                </div>

                <div className="w-full max-w-xs space-y-3">
                  <Button 
                    onClick={() => onOpenChange(false)} 
                    className="w-full h-12 rounded-xl"
                  >
                    Done
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setStep('upload')}
                    className="w-full h-12 rounded-xl"
                  >
                    Upload Another
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
