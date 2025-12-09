import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo, Redo, Trash2, Eraser, Pen, Highlighter, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: "pen" | "highlighter" | "pencil" | "eraser";
}

interface DrawingCanvasProps {
  width: number;
  height: number;
  onSave: (paths: DrawingPath[]) => void;
  onClose: () => void;
}

const colors = [
  "#FFFFFF", "#000000", "#FF3B30", "#FF9500", "#FFCC00", 
  "#34C759", "#007AFF", "#5856D6", "#AF52DE", "#FF2D92"
];

const tools = [
  { id: "pen" as const, icon: Pen, name: "Pen" },
  { id: "highlighter" as const, icon: Highlighter, name: "Highlighter" },
  { id: "pencil" as const, icon: Pencil, name: "Pencil" },
  { id: "eraser" as const, icon: Eraser, name: "Eraser" },
];

export function DrawingCanvas({ width, height, onSave, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<"pen" | "highlighter" | "pencil" | "eraser">("pen");
  const [currentColor, setCurrentColor] = useState("#FFFFFF");
  const [brushWidth, setBrushWidth] = useState(5);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [undoStack, setUndoStack] = useState<DrawingPath[][]>([]);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const redrawCanvas = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);

      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }

      ctx.strokeStyle = path.tool === "eraser" ? "rgba(0,0,0,1)" : path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      if (path.tool === "highlighter") {
        ctx.globalAlpha = 0.4;
      } else if (path.tool === "pencil") {
        ctx.globalAlpha = 0.8;
      } else {
        ctx.globalAlpha = 1;
      }

      if (path.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }, [paths, width, height, getContext]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCoords = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    const coords = getCoords(e);
    setIsDrawing(true);
    setCurrentPath({
      points: [coords],
      color: currentColor,
      width: currentTool === "highlighter" ? brushWidth * 3 : brushWidth,
      tool: currentTool,
    });
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;

    const coords = getCoords(e);
    setCurrentPath({
      ...currentPath,
      points: [...currentPath.points, coords],
    });

    // Live drawing preview
    const ctx = getContext();
    if (!ctx || currentPath.points.length < 1) return;

    const lastPoint = currentPath.points[currentPath.points.length - 1];
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = currentTool === "eraser" ? "rgba(0,0,0,1)" : currentColor;
    ctx.lineWidth = currentTool === "highlighter" ? brushWidth * 3 : brushWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    if (currentTool === "highlighter") {
      ctx.globalAlpha = 0.4;
    } else if (currentTool === "pencil") {
      ctx.globalAlpha = 0.8;
    }

    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    }

    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  const stopDrawing = () => {
    if (currentPath && currentPath.points.length > 1) {
      setUndoStack([...undoStack, paths]);
      setPaths([...paths, currentPath]);
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      setPaths(undoStack[undoStack.length - 1]);
      setUndoStack(undoStack.slice(0, -1));
    } else if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    }
  };

  const handleClear = () => {
    setUndoStack([...undoStack, paths]);
    setPaths([]);
  };

  const handleSave = () => {
    onSave(paths);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      {/* Top Controls */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onClose} className="text-white">
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleUndo} className="text-white">
            <Undo className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} className="text-white">
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
        <Button onClick={handleSave} className="bg-primary">
          Done
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="max-w-full max-h-full touch-none"
          style={{ 
            width: "100%", 
            height: "auto",
            maxHeight: "calc(100vh - 250px)"
          }}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {/* Bottom Controls */}
      <div className="p-4 space-y-4">
        {/* Tools */}
        <div className="flex items-center justify-center gap-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                currentTool === tool.id 
                  ? "bg-white text-black" 
                  : "bg-white/20 text-white"
              )}
            >
              <tool.icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Brush Width */}
        <div className="flex items-center gap-4 px-4">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ 
              backgroundColor: currentColor,
              transform: `scale(${brushWidth / 10})`,
            }} 
          />
          <Slider
            value={[brushWidth]}
            min={1}
            max={30}
            step={1}
            onValueChange={(v) => setBrushWidth(v[0])}
            className="flex-1"
          />
        </div>

        {/* Colors */}
        <div className="flex items-center justify-center gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className={cn(
                "w-8 h-8 rounded-full border-2 transition-all",
                currentColor === color 
                  ? "border-white scale-125" 
                  : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
