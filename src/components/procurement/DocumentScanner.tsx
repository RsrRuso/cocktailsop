import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, Loader2, ScanLine, FlipHorizontal, Upload, ImageIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { createWorker } from 'tesseract.js';

interface DocumentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTextExtracted: (text: string) => void;
  title?: string;
}

export function DocumentScanner({ 
  open, 
  onOpenChange, 
  onTextExtracted,
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
      const imageData = canvas.toDataURL('image/png');
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
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setStep('processing');
    setProgress(0);
    setProgressText('Initializing OCR...');

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setProgressText('Recognizing text...');
          } else if (m.status === 'loading language traineddata') {
            setProgressText('Loading language data...');
            setProgress(Math.round(m.progress * 50));
          }
        }
      });

      setProgressText('Analyzing document...');
      const { data: { text } } = await worker.recognize(capturedImage);
      
      await worker.terminate();
      
      onTextExtracted(text);
      handleClose();
    } catch (error) {
      console.error('OCR Error:', error);
      setProgressText('Error processing image');
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setStep('choose');
    setProgress(0);
    setProgressText('');
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
        </DialogHeader>

        <div className="space-y-4">
          {/* Choose method step */}
          {step === 'choose' && (
            <div className="space-y-4 py-4">
              <p className="text-center text-sm text-muted-foreground mb-6">
                Choose how to scan your document
              </p>
              
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
                <Button onClick={processImage} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Extract Text
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {progressText} {progress > 0 && `${progress}%`}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
