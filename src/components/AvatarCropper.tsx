import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Move } from "lucide-react";

interface AvatarCropperProps {
  imageUrl: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export const AvatarCropper = ({ imageUrl, onCropComplete, onCancel }: AvatarCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Center the image initially
      const canvas = canvasRef.current;
      if (canvas) {
        const size = Math.min(img.width, img.height);
        setPosition({
          x: (img.width - size) / 2,
          y: (img.height - size) / 2,
        });
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;
    drawCanvas();
  }, [scale, position, imageLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 400; // Canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw image scaled and positioned
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      img,
      -position.x * scale + (size - scaledWidth) / 2,
      -position.y * scale + (size - scaledHeight) / 2,
      scaledWidth,
      scaledHeight
    );

    ctx.restore();

    // Draw circular border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
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

    // Create high-quality output
    const outputSize = 1024; // High-resolution output
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Draw scaled version for high quality
    ctx.drawImage(canvas, 0, 0, outputSize, outputSize);

    outputCanvas.toBlob(
      (blob) => {
        if (blob) onCropComplete(blob);
      },
      "image/png",
      1.0 // Maximum quality
    );
  };

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-6 space-y-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center">Adjust Your Avatar</h2>

        <div
          className="relative mx-auto"
          style={{ width: 400, height: 400 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            className="rounded-full cursor-move border-4 border-primary/30"
            style={{ width: 400, height: 400 }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Move className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Drag to adjust</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={(values) => setScale(values[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Zoom: {Math.round(scale * 100)}%
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCrop} className="flex-1 glow-primary">
            Save Avatar
          </Button>
        </div>
      </div>
    </div>
  );
};
