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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 bg-background/95 backdrop-blur-xl flex flex-col gap-3">
        {isUploading && (
          <div className="glass backdrop-blur-lg rounded-lg p-3 border border-primary/20">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">Uploading video message...</span>
            </div>
          </div>
        )}
        <div className="flex justify-center gap-4">
          <Button size="lg" variant="destructive" onClick={onStop} disabled={isUploading} className="flex items-center gap-2">
            <StopCircle className="w-5 h-5" />
            Stop & Send
          </Button>
          <Button size="lg" variant="outline" onClick={onCancel} disabled={isUploading} className="flex items-center gap-2">
            <X className="w-5 h-5" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
