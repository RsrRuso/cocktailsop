import { useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { StopCircle, X, Loader2 } from 'lucide-react';

interface MediaRecorderProps {
  isRecordingVideo: boolean;
  isUploading: boolean;
  videoStream: MediaStream | null;
  onStop: () => void;
  onCancel: () => void;
}

export const MediaRecorder = ({
  isRecordingVideo,
  isUploading,
  videoStream,
  onStop,
  onCancel,
}: MediaRecorderProps) => {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
      videoPreviewRef.current.play();
    }
  }, [videoStream]);

  if (!isRecordingVideo) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
      <div className="relative w-[80vmin] h-[80vmin] max-w-[500px] max-h-[500px]">
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded-full shadow-2xl"
        />
      </div>
      <div className="absolute bottom-8 left-0 right-0 px-4 flex flex-col gap-3">
        {isUploading && (
          <div className="bg-background/95 backdrop-blur-xl rounded-full px-6 py-3 mx-auto">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Uploading video message...</span>
            </div>
          </div>
        )}
        <div className="flex justify-center gap-4">
          <Button size="lg" variant="destructive" onClick={onStop} disabled={isUploading} className="flex items-center gap-2 rounded-full">
            <StopCircle className="w-5 h-5" />
            Stop & Send
          </Button>
          <Button size="lg" variant="outline" onClick={onCancel} disabled={isUploading} className="flex items-center gap-2 rounded-full">
            <X className="w-5 h-5" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
