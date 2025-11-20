import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Download, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface GarnishCanvasProps {
  garnishImage: string | null;
  onUpdate: (imageData: string) => void;
}

const GarnishCanvas = ({ garnishImage, onUpdate }: GarnishCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;

    // Draw base (glass circle)
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = "14px Arial";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText("Glass Top View", 200, 320);
    ctx.fillText("Drag to place garnish elements", 200, 340);

    if (garnishImage) {
      const img = new Image();
      img.src = garnishImage;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke([{x, y}]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const lastPoint = currentStroke[currentStroke.length - 1];
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setCurrentStroke([...currentStroke, {x, y}]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL("image/png");
      setHistory([...history, imageData]);
      onUpdate(imageData);
    }
    
    setCurrentStroke([]);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(200, 200, 100, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = "14px Arial";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText("Glass Top View", 200, 320);
    ctx.fillText("Drag to place garnish elements", 200, 340);

    onUpdate("");
    setHistory([]);
    toast.success("Canvas cleared");
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (newHistory.length > 0) {
      const img = new Image();
      img.src = newHistory[newHistory.length - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        onUpdate(newHistory[newHistory.length - 1]);
      };
    } else {
      handleClear();
    }

    toast.success("Undone");
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "garnish-placement.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Downloaded");
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-medium">Garnish Placement</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={history.length === 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border-2 border-dashed border-muted rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="cursor-crosshair bg-background"
            style={{ width: "100%", height: "auto", maxWidth: "400px" }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Draw on the glass to show where garnishes should be placed. The circle represents the top view of the glass.
        </p>
      </div>
    </Card>
  );
};

export default GarnishCanvas;
