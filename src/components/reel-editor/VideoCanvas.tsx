import { useEffect, RefObject } from 'react';
import { VideoState, Filters, Adjustments, TextOverlay, Sticker, Drawing, LayoutMode } from '@/hooks/useVideoEditor';

interface VideoCanvasProps {
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
  videoRef,
  canvasRef,
  videoState,
  filters,
  adjustments,
  textOverlays,
  stickers,
  drawings,
  layoutMode,
}: VideoCanvasProps) {
  
  // Apply filters and render overlays
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Apply filters
        ctx.filter = `
          brightness(${filters.brightness}%)
          contrast(${filters.contrast}%)
          saturate(${filters.saturation}%)
          hue-rotate(${filters.hue}deg)
          brightness(${100 + adjustments.brightness}%)
          contrast(${100 + adjustments.contrast}%)
          saturate(${100 + adjustments.saturation}%)
        `;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reset filter for overlays
        ctx.filter = 'none';

        // Draw text overlays
        textOverlays.forEach(text => {
          ctx.font = `${text.fontSize}px ${text.fontFamily}`;
          ctx.fillStyle = text.color;
          ctx.fillText(text.text, text.x, text.y);
        });

        // Draw stickers
        stickers.forEach(sticker => {
          ctx.font = `${sticker.size}px Arial`;
          ctx.fillText(sticker.content, sticker.x, sticker.y);
        });

        // Draw drawings
        drawings.forEach(drawing => {
          drawing.paths.forEach(path => {
            if (path.length < 2) return;
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
          });
        });
      }
      requestAnimationFrame(render);
    };

    render();
  }, [videoRef, canvasRef, filters, adjustments, textOverlays, stickers, drawings]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoState.duration > 0 ? videoRef.current?.src : undefined}
        className="hidden"
        controls={false}
      />
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
