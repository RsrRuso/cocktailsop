import { ImageIcon, Video, FileText, Music, Link as LinkIcon } from 'lucide-react';
import { Separator } from './ui/separator';

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
    <div className="absolute bottom-full left-0 mb-2 bg-background/95 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl p-3 z-50 min-w-[220px]">
      {/* Media Section */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">MEDIA</p>
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
          onClick={onStartVideoRecording}
          className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Video className="w-5 h-5 text-destructive" />
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

      <Separator className="my-2" />

      {/* Links Section */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">LINKS</p>
        <button
          onClick={onSelectDocument}
          className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <FileText className="w-5 h-5 text-accent" />
          <span>Document</span>
        </button>
        <button
          className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <LinkIcon className="w-5 h-5 text-accent" />
          <span>Link</span>
        </button>
      </div>
    </div>
  );
};
