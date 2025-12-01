import { useEffect, RefObject } from 'react';
import { VideoState, Filters, Adjustments, TextOverlay, Sticker, Drawing, LayoutMode } from '@/hooks/useVideoEditor';

interface VideoCanvasProps {
  videoUrl: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  videoState: VideoState;
  filters: Filters;
  adjustments: Adjustments;
  textOverlays: TextOverlay[];
  stickers: Sticker[];
  drawings: Drawing[];
  layoutMode: LayoutMode;
}

export function VideoCanvas({
  videoUrl,
  videoRef,
  canvasRef,
  videoState,
  filters,
  adjustments,
  textOverlays,
  stickers,
  drawings,
}: VideoCanvasProps) {
  
  // Initialize video and canvas rendering
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoUrl) return;

    video.src = videoUrl;
    video.load();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA && !video.paused) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        // Apply filters via CSS filter
        ctx.filter = `
          brightness(${filters.brightness}%)
          contrast(${filters.contrast}%)
          saturate(${filters.saturation}%)
          hue-rotate(${filters.hue}deg)
        `.trim().replace(/\s+/g, ' ');

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset filter for overlays
        ctx.filter = 'none';

        // Draw text overlays
        textOverlays.forEach(text => {
          ctx.save();
          ctx.font = `${text.fontSize}px ${text.fontFamily}`;
          ctx.fillStyle = text.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Add text stroke for better visibility
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = 2;
          ctx.strokeText(text.text, text.x, text.y);
          ctx.fillText(text.text, text.x, text.y);
          ctx.restore();
        });

        // Draw stickers (emojis)
        stickers.forEach(sticker => {
          ctx.save();
          ctx.font = `${sticker.size}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sticker.content, sticker.x, sticker.y);
          ctx.restore();
        });

        // Draw drawings
        drawings.forEach(drawing => {
          drawing.paths.forEach(path => {
            if (path.length < 2) return;
            ctx.save();
            ctx.strokeStyle = drawing.color;
            ctx.lineWidth = drawing.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
              ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
            ctx.restore();
          });
        });
      }
      
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [videoUrl, videoRef, canvasRef, filters, adjustments, textOverlays, stickers, drawings]);

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (videoState.isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [videoState.isPlaying, videoRef]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="hidden"
        controls={false}
        loop
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{ maxHeight: '70vh' }}
      />
    </div>
  );
}
