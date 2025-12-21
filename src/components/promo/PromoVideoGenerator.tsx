import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Download, Play, Pause, RefreshCw, Sparkles, 
  Video, CheckCircle2, Loader2
} from "lucide-react";
import { toast } from "sonner";

interface PromoVideoProps {
  toolName: string;
  toolDescription: string;
  features: string[];
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
}

export function PromoVideoGenerator({
  toolName,
  toolDescription,
  features,
  gradientFrom,
  gradientTo,
  icon
}: PromoVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const animationRef = useRef<number>();
  const frameRef = useRef(0);

  const totalFrames = 150; // 5 seconds at 30fps

  const drawFrame = (frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const progress = frame / totalFrames;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, gradientFrom);
    gradient.addColorStop(1, gradientTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(frame * 0.02 + i) * 0.5 + 0.5) * width;
      const y = ((frame * 2 + i * 50) % (height + 100)) - 50;
      const size = 3 + Math.sin(i) * 2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.sin(frame * 0.1 + i) * 0.1})`;
      ctx.fill();
    }

    // Center icon area
    const centerY = height * 0.35;
    
    // Icon container with animation
    const iconScale = 1 + Math.sin(frame * 0.1) * 0.05;
    const iconSize = 80 * iconScale;
    
    ctx.save();
    ctx.translate(width / 2, centerY);
    ctx.scale(iconScale, iconScale);
    
    // Icon background
    ctx.beginPath();
    ctx.roundRect(-40, -40, 80, 80, 20);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    
    // Icon text placeholder
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 0);
    
    ctx.restore();

    // Title with fade-in
    const titleOpacity = Math.min(1, progress * 3);
    ctx.fillStyle = `rgba(255, 255, 255, ${titleOpacity})`;
    ctx.font = 'bold 32px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(toolName, width / 2, height * 0.55);

    // Description with staggered fade-in
    const descOpacity = Math.min(1, Math.max(0, (progress - 0.15) * 3));
    ctx.fillStyle = `rgba(255, 255, 255, ${descOpacity * 0.8})`;
    ctx.font = '16px system-ui';
    
    // Word wrap description
    const words = toolDescription.split(' ');
    let line = '';
    let y = height * 0.62;
    const maxWidth = width * 0.8;
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), width / 2, y);
        line = word + ' ';
        y += 22;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line.trim(), width / 2, y);

    // Features with staggered animation
    features.forEach((feature, index) => {
      const featureProgress = Math.max(0, (progress - 0.3 - index * 0.1) * 4);
      const featureOpacity = Math.min(1, featureProgress);
      const featureX = width / 2 + (1 - featureProgress) * 50;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${featureOpacity * 0.9})`;
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`✓ ${feature}`, featureX, height * 0.75 + index * 24);
    });

    // CTA at the end
    if (progress > 0.7) {
      const ctaOpacity = Math.min(1, (progress - 0.7) * 5);
      const ctaScale = 0.9 + ctaOpacity * 0.1;
      
      ctx.save();
      ctx.translate(width / 2, height * 0.92);
      ctx.scale(ctaScale, ctaScale);
      
      ctx.beginPath();
      ctx.roundRect(-80, -18, 160, 36, 18);
      ctx.fillStyle = `rgba(255, 255, 255, ${ctaOpacity})`;
      ctx.fill();
      
      ctx.fillStyle = gradientFrom;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Try It Now →', 0, 0);
      
      ctx.restore();
    }

    // Platform branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Powered by LAB Platform', width / 2, height - 20);
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    setProgress(0);
    setVideoBlob(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGenerating(false);
      return;
    }

    try {
      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        throw new Error('Video recording not supported in this browser');
      }

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setIsGenerating(false);
        setProgress(100);
        toast.success("Promo video generated!", {
          description: "Click download to save your video"
        });
      };

      mediaRecorder.start();

      // Animate frames
      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise(resolve => setTimeout(resolve, 33)); // ~30fps
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error("Failed to generate video", {
        description: "Try using Chrome or Edge browser"
      });
      setIsGenerating(false);
    }
  };

  const playPreview = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    setIsPlaying(true);
    frameRef.current = 0;

    const animate = () => {
      if (frameRef.current < totalFrames) {
        drawFrame(frameRef.current);
        frameRef.current++;
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        frameRef.current = 0;
      }
    };

    animate();
  };

  const downloadVideo = () => {
    if (!videoBlob) return;

    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolName.toLowerCase().replace(/\s+/g, '-')}-promo.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Video downloaded!");
  };

  useEffect(() => {
    // Draw initial frame
    drawFrame(0);
  }, [toolName, toolDescription, features]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="w-4 h-4" />
          Promo Video Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas Preview */}
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <canvas
            ref={canvasRef}
            width={360}
            height={640}
            className="w-full max-w-[360px] mx-auto"
            style={{ aspectRatio: '9/16' }}
          />
          
          {/* Play overlay */}
          {!isGenerating && !isPlaying && (
            <button
              onClick={playPreview}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </button>
          )}

          {/* Playing indicator */}
          {isPlaying && (
            <button
              onClick={playPreview}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 rounded text-white text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Playing
              </div>
            </button>
          )}
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating video...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={generateVideo}
            disabled={isGenerating || isPlaying}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
          
          {videoBlob && (
            <Button
              variant="outline"
              onClick={downloadVideo}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>

        {videoBlob && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            Video ready for download!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
