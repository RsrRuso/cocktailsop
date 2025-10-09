import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface CoverPhotoCropperProps {
  imageUrl: string;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
}

export const CoverPhotoCropper = ({ imageUrl, onCropComplete, onCancel }: CoverPhotoCropperProps) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [imageUrl]);

  useEffect(() => {
    drawCanvas();
  }, [zoom, position]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cover photo aspect ratio 16:9
    const cropWidth = canvas.width;
    const cropHeight = canvas.height;

    ctx.clearRect(0, 0, cropWidth, cropHeight);
    
    // Draw image
    const scale = zoom;
    const imgWidth = img.width * scale;
    const imgHeight = img.height * scale;
    
    ctx.drawImage(
      img,
      position.x,
      position.y,
      imgWidth,
      imgHeight
    );

    // Draw overlay with crop area
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, cropWidth, cropHeight);
    
    // Clear the crop area
    ctx.clearRect(0, 0, cropWidth, cropHeight);
    ctx.drawImage(
      img,
      position.x,
      position.y,
      imgWidth,
      imgHeight
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-4">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          Adjust Your Cover Photo
        </h2>
        
        <div
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ aspectRatio: "16/9", maxHeight: "60vh" }}
        >
          <canvas
            ref={canvasRef}
            width={1200}
            height={675}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="glass rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-white" />
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCancel}
              className="glass border-white/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCrop}
              className="glow-primary"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>

        <p className="text-white/70 text-sm text-center">
          Drag to reposition • Use slider to zoom • 16:9 aspect ratio
        </p>
      </div>
    </div>
  );
};