import { useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { StopCircle, X } from 'lucide-react';

interface MediaRecorderProps {
  isRecordingVideo: boolean;
  videoStream: MediaStream | null;
  onStop: () => void;
  onCancel: () => void;
}

export const MediaRecorder = ({
  isRecordingVideo,
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
      <div className="p-4 bg-background/95 backdrop-blur-xl flex justify-center gap-4">
        <Button size="lg" variant="destructive" onClick={onStop} className="flex items-center gap-2">
          <StopCircle className="w-5 h-5" />
          Stop & Send
        </Button>
        <Button size="lg" variant="outline" onClick={onCancel} className="flex items-center gap-2">
          <X className="w-5 h-5" />
          Cancel
        </Button>
      </div>
    </div>
  );
};
