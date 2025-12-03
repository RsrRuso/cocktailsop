import { ImageIcon, Video, FileText, Music } from 'lucide-react';

interface AttachmentMenuProps {
  onSelectImage: () => void;
  onSelectVideo: () => void;
  onSelectDocument: () => void;
  onStartVideoRecording: () => void;
  onSelectMusic: () => void;
}

export const AttachmentMenu = ({
  onSelectImage,
  onSelectVideo,
  onSelectDocument,
  onStartVideoRecording,
  onSelectMusic,
}: AttachmentMenuProps) => {
  return (
    <div className="absolute bottom-full left-0 mb-2 bg-background border border-primary/20 rounded-2xl shadow-2xl p-2 z-[9999] min-w-[200px]">
      <button
        onClick={onSelectImage}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
      >
        <ImageIcon className="w-5 h-5 text-primary" />
        <span>Photo</span>
      </button>
      <button
        onClick={onSelectVideo}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Video className="w-5 h-5 text-primary" />
        <span>Video</span>
      </button>
      <button
        onClick={onSelectDocument}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
      >
        <FileText className="w-5 h-5 text-primary" />
        <span>Document</span>
      </button>
      <button
        onClick={onStartVideoRecording}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Video className="w-5 h-5 text-primary" />
        <span>Record Video</span>
      </button>
      <button
        onClick={onSelectMusic}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
      >
        <Music className="w-5 h-5 text-primary" />
        <span>Music</span>
      </button>
    </div>
  );
};
