import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Loader2, ScanLine, FlipHorizontal, ImageIcon, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedItem {
  item_code: string;
  item_name: string;
  unit: string;
  quantity: number;
  price_per_unit: number;
  price_total: number;
}

interface ParsedOrder {
  doc_no: string | null;
  doc_date: string | null;
  location: string | null;
  items: ParsedItem[];
  total_amount: number;
}

interface DocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTextExtracted: (text: string) => void;
  onDataExtracted?: (data: ParsedOrder) => void;
  title?: string;
}

export function DocumentScanner({ 
  open, 
  onOpenChange, 
  onTextExtracted,
  onDataExtracted,
  title = "Scan Document"
}: DocumentScannerProps) {
  const [step, setStep] = useState<'choose' | 'camera' | 'preview' | 'processing'>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error("Camera access denied");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open && step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [open, step, startCamera, stopCamera]);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
      setStep('preview');
      stopCamera();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      setStep('preview');
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedImage(null);
    setStep('choose');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const processImageWithAI = async () => {
    if (!capturedImage) return;
    
    setStep('processing');
    setProgress(10);
    setProgressText('Preparing image...');

    try {
      // Extract base64 data from data URL
      const base64Match = capturedImage.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        throw new Error('Invalid image format');
      }
      
      const mimeType = `image/${base64Match[1]}`;
      const base64Data = base64Match[2];
      
      setProgress(30);
      setProgressText('Sending to AI...');

      // Call the edge function with image data
      const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
        body: {
          imageBase64: base64Data,
          imageMimeType: mimeType
        }
      });

      setProgress(80);
      setProgressText('Processing results...');

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to process image');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to parse document');
      }

      setProgress(100);
      setProgressText('Complete!');

      const parsedData = data.data as ParsedOrder;
      
      // If onDataExtracted callback is provided, use it for structured data
      if (onDataExtracted) {
        onDataExtracted(parsedData);
      }
      
      // Also provide text representation for backward compatibility
      const textOutput = formatParsedDataAsText(parsedData);
      onTextExtracted(textOutput);
      
      toast.success(`AI extracted ${parsedData.items?.length || 0} items`);
      handleClose();
      
    } catch (error) {
      console.error('AI Processing Error:', error);
      setProgressText('Error processing image');
      toast.error(error instanceof Error ? error.message : 'Failed to process image');
      // Go back to preview so user can retry
      setTimeout(() => {
        setStep('preview');
        setProgress(0);
        setProgressText('');
      }, 2000);
    }
  };

  const formatParsedDataAsText = (data: ParsedOrder): string => {
    let text = '';
    
    if (data.doc_no) text += `DocNo ${data.doc_no} `;
    if (data.doc_date) text += `Doct : ${data.doc_date} `;
    if (data.location) text += `LocnCode ${data.location}\n`;
    
    text += '\nSno Item Code Item Name Group Packing Unit Qty/MinLyl Rate Value\n';
    text += '----------------------------------------------------------------\n';
    
    data.items?.forEach((item, index) => {
      text += `${index + 1} ${item.item_code || ''} ${item.item_name} ${item.unit} ${item.quantity} ${item.price_per_unit} ${item.price_total}\n`;
    });
    
    return text;
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setStep('choose');
    setProgress(0);
    setProgressText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Scan or upload a document to extract items using AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Choose method step */}
          {step === 'choose' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-2 text-sm text-primary mb-4">
                <Sparkles className="h-4 w-4" />
                <span>Powered by AI for accurate extraction</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-3 border-2 hover:border-primary"
                  onClick={() => setStep('camera')}
                >
                  <Camera className="h-10 w-10 text-primary" />
                  <span className="font-medium">Use Camera</span>
                  <span className="text-xs text-muted-foreground">Take a photo</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-32 flex flex-col gap-3 border-2 hover:border-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-10 w-10 text-primary" />
                  <span className="font-medium">Upload Image</span>
                  <span className="text-xs text-muted-foreground">From gallery</span>
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {step === 'camera' && (
            <div className="relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full rounded-lg bg-black aspect-[4/3] object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanner overlay */}
              <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-lg pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
              
              <p className="text-center text-sm text-muted-foreground mt-2">
                Position the document within the frame
              </p>
              
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
                  Back
                </Button>
                <Button variant="outline" onClick={toggleCamera}>
                  <FlipHorizontal className="h-4 w-4" />
                </Button>
                <Button onClick={captureImage} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && capturedImage && (
            <div className="space-y-4">
              <img 
                src={capturedImage} 
                alt="Captured document" 
                className="w-full rounded-lg max-h-[400px] object-contain bg-muted"
              />
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={retake} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={processImageWithAI} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extract with AI
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <Sparkles className="h-5 w-5 text-primary absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {progressText} {progress > 0 && `${progress}%`}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                AI is analyzing your document...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
