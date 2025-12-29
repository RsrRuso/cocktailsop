import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Play, Pause, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface FeatureSection {
  title: string;
  features: string[];
  icon: string;
}

const SPECVERSE_FEATURES: FeatureSection[] = [
  {
    title: "📱 Social Feed",
    icon: "🏠",
    features: [
      "Scroll through posts & reels from people you follow",
      "Like, comment, save & repost content",
      "Share posts via DM or external apps",
      "View engagement insights on your posts"
    ]
  },
  {
    title: "📸 Create Content",
    icon: "✨",
    features: [
      "Post photos with filters & captions",
      "Create short-form Reels with music",
      "Share 24h Stories with stickers",
      "Go Live to your followers"
    ]
  },
  {
    title: "💬 Messaging",
    icon: "💌",
    features: [
      "Direct messages with friends",
      "Group chats with custom names",
      "Voice messages & media sharing",
      "Pin important conversations"
    ]
  },
  {
    title: "🎵 Music Hub",
    icon: "🎧",
    features: [
      "Browse trending music tracks",
      "Upload your own music library",
      "Share songs with friends",
      "Add music to your reels & stories"
    ]
  },
  {
    title: "🔍 Discover",
    icon: "🌍",
    features: [
      "Explore trending posts & reels",
      "Search users & hashtags",
      "Discover new creators to follow",
      "Region-based content filtering"
    ]
  },
  {
    title: "👤 Profile",
    icon: "⭐",
    features: [
      "Customize your bio & avatar",
      "View your posts, reels & saved",
      "Track followers & following",
      "Professional dashboard & stats"
    ]
  },
  {
    title: "🏆 Community",
    icon: "🤝",
    features: [
      "Join topic-based channels",
      "Create public or private groups",
      "React with emojis & reply to messages",
      "Pin announcements"
    ]
  },
  {
    title: "🔔 Notifications",
    icon: "📢",
    features: [
      "Real-time push notifications",
      "Likes, comments & follows",
      "DM alerts & mentions",
      "Customizable preferences"
    ]
  }
];

const SpecVersePromoVideo = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const animationRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  const PRIMARY_GREEN = "#22c55e";
  const LIGHT_GREEN = "#4ade80";
  const DARK_GREEN = "#16a34a";
  const WHITE = "#ffffff";
  const DARK_BG = "#0a1a0f";

  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const totalFrames = 600; // 20 seconds at 30fps
    const sectionDuration = totalFrames / (SPECVERSE_FEATURES.length + 2); // +2 for intro and outro

    // Calculate current section
    const currentSection = Math.floor(frame / sectionDuration);
    const sectionProgress = (frame % sectionDuration) / sectionDuration;

    // Dark gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, DARK_BG);
    gradient.addColorStop(0.5, "#0d2818");
    gradient.addColorStop(1, DARK_BG);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated floating particles
    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(frame * 0.01 + i * 1.5) * 0.5 + 0.5) * width;
      const y = ((frame * 0.5 + i * 50) % (height + 50)) - 25;
      const size = 2 + Math.sin(i * 0.5) * 2;
      const alpha = 0.2 + Math.sin(frame * 0.02 + i) * 0.15;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
      ctx.fill();
    }

    // Glowing orbs
    for (let i = 0; i < 5; i++) {
      const orbX = width * 0.2 + (i * width * 0.15);
      const orbY = height * 0.3 + Math.sin(frame * 0.015 + i * 2) * 50;
      const orbRadius = 80 + Math.sin(frame * 0.02 + i) * 20;
      
      const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius);
      orbGradient.addColorStop(0, "rgba(34, 197, 94, 0.15)");
      orbGradient.addColorStop(1, "rgba(34, 197, 94, 0)");
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Content based on section
    if (currentSection === 0) {
      // INTRO
      const scale = 0.8 + sectionProgress * 0.2;
      const alpha = Math.min(1, sectionProgress * 2);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // Logo glow
      ctx.shadowColor = PRIMARY_GREEN;
      ctx.shadowBlur = 40 + Math.sin(frame * 0.1) * 10;

      // Main title
      ctx.fillStyle = WHITE;
      ctx.font = "bold 120px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SpecVerse", 0, -50);

      ctx.shadowBlur = 0;

      // Tagline
      ctx.fillStyle = LIGHT_GREEN;
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillText("Your Social Universe", 0, 50);

      // Subtitle
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "24px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect • Create • Inspire", 0, 100);

      ctx.restore();
    } else if (currentSection <= SPECVERSE_FEATURES.length) {
      // FEATURE SECTIONS
      const feature = SPECVERSE_FEATURES[currentSection - 1];
      const slideIn = Math.min(1, sectionProgress * 3);
      const fadeOut = sectionProgress > 0.8 ? (1 - sectionProgress) * 5 : 1;

      ctx.save();
      ctx.globalAlpha = fadeOut;

      // Section icon (large, faded)
      ctx.font = `${200 + Math.sin(frame * 0.05) * 10}px sans-serif`;
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.1 * fadeOut;
      ctx.fillText(feature.icon, width / 2, height / 2);

      ctx.globalAlpha = fadeOut;

      // Section title with glow
      ctx.shadowColor = PRIMARY_GREEN;
      ctx.shadowBlur = 20;
      ctx.fillStyle = WHITE;
      ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      const titleX = width / 2 + (1 - slideIn) * -200;
      ctx.fillText(feature.title, titleX, 160);
      ctx.shadowBlur = 0;

      // Features list with staggered animation
      const featureStartY = 280;
      const featureSpacing = 80;

      feature.features.forEach((feat, i) => {
        const featureDelay = i * 0.1;
        const featureProgress = Math.max(0, Math.min(1, (sectionProgress - featureDelay) * 4));
        const featureX = width / 2 + (1 - featureProgress) * 100;
        
        ctx.globalAlpha = featureProgress * fadeOut;
        
        // Feature bullet (green dot)
        ctx.beginPath();
        ctx.arc(width / 2 - 280, featureStartY + i * featureSpacing, 8, 0, Math.PI * 2);
        ctx.fillStyle = PRIMARY_GREEN;
        ctx.fill();

        // Feature text
        ctx.fillStyle = WHITE;
        ctx.font = "28px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(feat, width / 2 - 250, featureStartY + i * featureSpacing + 8);
      });

      // Section number indicator
      ctx.globalAlpha = 0.5 * fadeOut;
      ctx.fillStyle = PRIMARY_GREEN;
      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${currentSection} / ${SPECVERSE_FEATURES.length}`, width - 60, height - 40);

      ctx.restore();
    } else {
      // OUTRO
      const scale = 0.9 + Math.sin(frame * 0.05) * 0.05;
      const alpha = Math.min(1, sectionProgress * 2);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // Final CTA glow
      ctx.shadowColor = PRIMARY_GREEN;
      ctx.shadowBlur = 50;

      ctx.fillStyle = WHITE;
      ctx.font = "bold 80px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Join SpecVerse", 0, -60);

      ctx.shadowBlur = 0;

      // CTA button simulation
      const btnWidth = 400;
      const btnHeight = 70;
      const btnGradient = ctx.createLinearGradient(-btnWidth/2, 40, btnWidth/2, 40 + btnHeight);
      btnGradient.addColorStop(0, PRIMARY_GREEN);
      btnGradient.addColorStop(1, DARK_GREEN);
      
      ctx.fillStyle = btnGradient;
      ctx.beginPath();
      ctx.roundRect(-btnWidth/2, 40, btnWidth, btnHeight, 35);
      ctx.fill();

      ctx.fillStyle = WHITE;
      ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
      ctx.fillText("Start Your Journey", 0, 85);

      // Footer text
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.fillText("Connect with creators worldwide", 0, 160);

      ctx.restore();
    }

    // SpecVerse watermark (always visible after intro)
    if (currentSection > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = PRIMARY_GREEN;
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("SpecVerse", 40, height - 40);
    }
  }, []);

  const playPreview = useCallback(() => {
    if (isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    const totalFrames = 600;
    
    const animate = () => {
      drawFrame(frameRef.current);
      frameRef.current = (frameRef.current + 1) % totalFrames;
      setProgress((frameRef.current / totalFrames) * 100);
      
      if (frameRef.current < totalFrames - 1 || isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [isPlaying, drawFrame]);

  const resetPreview = () => {
    frameRef.current = 0;
    setProgress(0);
    drawFrame(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsPlaying(false);
  };

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(blob);
        toast.success("Promo video generated successfully!");
      };

      mediaRecorder.start();

      const totalFrames = 600;
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise((resolve) => setTimeout(resolve, 33));
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SpecVerse-Promo.webm";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Video downloaded!");
  };

  useEffect(() => {
    drawFrame(0);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawFrame]);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur border-primary/20">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="w-6 h-6 text-primary" />
          SpecVerse Promo Video Generator
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-2">
          20-second promotional video showcasing all platform features
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Canvas Preview */}
        <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl shadow-primary/10">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full aspect-video"
          />
          {isGenerating && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-medium">Generating video...</p>
                <p className="text-primary">{Math.round(progress)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress)}% complete
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={playPreview}
            variant="outline"
            className="gap-2"
            disabled={isGenerating}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? "Pause" : "Preview"}
          </Button>

          <Button
            onClick={resetPreview}
            variant="outline"
            className="gap-2"
            disabled={isGenerating}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>

          <Button
            onClick={generateVideo}
            disabled={isGenerating}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Generate Video"}
          </Button>

          {videoBlob && (
            <Button
              onClick={downloadVideo}
              variant="secondary"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          )}
        </div>

        {/* Feature Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border/50">
          {SPECVERSE_FEATURES.map((section, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center"
            >
              <p className="text-2xl mb-1">{section.icon}</p>
              <p className="text-xs font-medium text-foreground/80">{section.title.replace(/[^\w\s]/gi, '').trim()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecVersePromoVideo;
