import { useState, useRef, useCallback, memo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Send, Paperclip, Mic, Reply, Edit2, X, Loader2 } from 'lucide-react';
import { Message } from '@/hooks/useMessageThread';
import { AttachmentMenu } from './AttachmentMenu';
import MusicSelectionDialog from './MusicSelectionDialog';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping: (typing: boolean) => void;
  replyingTo: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  isRecording: boolean;
  isUploading: boolean;
  uploadProgress: number;
  onStartVoiceRecording: () => void;
  onStopVoiceRecording: () => void;
  onFileUpload: (files: FileList, type: 'image' | 'video' | 'document') => void;
  onStartVideoRecording: () => void;
}

export const MessageInput = memo(({
  value,
  onChange,
  onSend,
  onTyping,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  isRecording,
  isUploading,
  uploadProgress,
  onStartVoiceRecording,
  onStopVoiceRecording,
  onFileUpload,
  onStartVideoRecording,
}: MessageInputProps) => {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    onTyping(newValue.length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  }, [onChange, onTyping]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return (
    <div className="p-3 border-t backdrop-blur-2xl border-border/10 bg-background/80 shadow-lg">
      {isUploading && (
        <div className="mb-2 glass backdrop-blur-xl rounded-2xl p-3 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Uploading... {uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}
      {replyingTo && (
        <div className="mb-2 glass backdrop-blur-xl rounded-2xl p-2 flex items-center justify-between border border-primary/30 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="w-4 h-4 text-primary" />
            <span className="opacity-70 font-medium">Replying to:</span>
            <span className="truncate max-w-[200px] font-semibold">{replyingTo.content}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-destructive/20" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {editingMessage && (
        <div className="mb-2 glass backdrop-blur-xl rounded-2xl p-2 flex items-center justify-between border border-accent/30 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-sm">
            <Edit2 className="w-4 h-4 text-accent" />
            <span className="opacity-70 font-medium">Editing message</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-destructive/20" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files[0]) {
              const fileType = files[0].type;
              if (fileType.startsWith('image/')) {
                onFileUpload(files, 'image');
              } else if (fileType.startsWith('video/')) {
                onFileUpload(files, 'video');
              } else {
                onFileUpload(files, 'document');
              }
            }
            e.target.value = '';
          }}
        />

        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="shrink-0 glass hover:scale-110 transition-transform"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {showAttachMenu && (
            <AttachmentMenu
              onSelectImage={() => {
                fileInputRef.current?.setAttribute('accept', 'image/*');
                fileInputRef.current?.click();
                setShowAttachMenu(false);
              }}
              onSelectVideo={() => {
                fileInputRef.current?.setAttribute('accept', 'video/*');
                fileInputRef.current?.click();
                setShowAttachMenu(false);
              }}
              onSelectDocument={() => {
                fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt,.zip,.rar');
                fileInputRef.current?.click();
                setShowAttachMenu(false);
              }}
              onStartVideoRecording={() => {
                onStartVideoRecording();
                setShowAttachMenu(false);
              }}
              onSelectMusic={() => {
                setShowMusicDialog(true);
                setShowAttachMenu(false);
              }}
            />
          )}
        </div>

        <MusicSelectionDialog
          open={showMusicDialog}
          onOpenChange={setShowMusicDialog}
        />

        <Input
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="Message..."
          className="flex-1 glass backdrop-blur-xl border-border/30 focus:border-primary/50 rounded-full px-5 py-3 text-base transition-all"
        />

        {value.trim() ? (
          <Button onClick={onSend} size="icon" className="shrink-0 bg-gradient-to-r from-primary to-accent hover:scale-110 transition-transform rounded-full h-11 w-11">
            <Send className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onMouseDown={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
            onMouseUp={onStopVoiceRecording}
            onTouchStart={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
            onTouchEnd={onStopVoiceRecording}
            className={`shrink-0 glass rounded-full h-11 w-11 ${isRecording ? 'bg-red-500/30 animate-pulse scale-110' : 'hover:scale-110'} transition-all`}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
});
