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
    const img = imageRef.current;
    if (!canvas || !img) return;

    // Create ultra-high-quality output (2048x2048)
    const outputSize = 2048;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext("2d", { alpha: true, willReadFrequently: false });
    if (!ctx) return;

    // Enable image smoothing for best quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw high-res circular image
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const ratio = outputSize / 400; // Scale factor from canvas to output

    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      img,
      (-position.x * scale + (400 - scaledWidth) / 2) * ratio,
      (-position.y * scale + (400 - scaledHeight) / 2) * ratio,
      scaledWidth * ratio,
      scaledHeight * ratio
    );

    ctx.restore();

    // Export as high-quality PNG
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
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-center">Adjust Your Avatar</h2>
          <p className="text-sm text-center text-muted-foreground">
            Ultra HD Quality • 2048x2048px Output
          </p>
        </div>

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
            className="rounded-full cursor-move border-4 border-primary/30 shadow-2xl"
            style={{ width: 400, height: 400 }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
            <Move className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Drag to adjust position</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Zoom Level</label>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="shrink-0"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Slider
              value={[scale]}
              onValueChange={(values) => setScale(values[0])}
              min={0.5}
              max={3}
              step={0.05}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setScale(Math.min(3, scale + 0.1))}
              className="shrink-0"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50%</span>
            <span className="font-semibold text-primary">{Math.round(scale * 100)}%</span>
            <span>300%</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCrop} className="flex-1 glow-primary">
            Save High-Quality Avatar
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground">
          💡 Tip: Use zoom buttons for fine control • Image saves in ultra HD quality
        </p>
      </div>
    </div>
  );
};
