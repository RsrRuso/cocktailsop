import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Send, Paperclip, Mic, Reply, Edit2, X, Loader2 } from 'lucide-react';
import { Message } from '@/hooks/useMessageThread';
import { AttachmentMenu } from './AttachmentMenu';
import MusicSelectionDialog from './MusicSelectionDialog';
import { AIMessageToolsWrapper } from './neuron/AIMessageToolsWrapper';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return (
    <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl relative z-[100]">
      {/* Premium glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      
      {isUploading && (
        <div className="mb-3 glass backdrop-blur-2xl rounded-3xl p-4 border-2 border-primary/30 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse" />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/30 to-accent/30">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Uploading... {uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2 relative z-10" />
        </div>
      )}
      {replyingTo && (
        <div className="mb-3 glass backdrop-blur-2xl rounded-3xl p-3 flex items-center justify-between border-2 border-primary/40 animate-in slide-in-from-bottom duration-300 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
          <div className="flex items-center gap-3 text-sm relative z-10">
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
              <Reply className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-muted-foreground">Replying to:</span>
            <span className="truncate max-w-[200px] font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{replyingTo.content}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/30 rounded-full hover:scale-110 transition-all relative z-10" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {editingMessage && (
        <div className="mb-3 glass backdrop-blur-2xl rounded-3xl p-3 flex items-center justify-between border-2 border-accent/40 animate-in slide-in-from-bottom duration-300 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10" />
          <div className="flex items-center gap-3 text-sm relative z-10">
            <div className="p-2 rounded-full bg-gradient-to-br from-accent/20 to-primary/20">
              <Edit2 className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold text-muted-foreground">Editing message</span>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/30 rounded-full hover:scale-110 transition-all relative z-10" onClick={onCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 sm:gap-3 items-end relative z-10">
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
            className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-105"
          >
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
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

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 min-w-0 bg-white/5 backdrop-blur-sm border border-white/10 focus:border-blue-500/50 focus:bg-white/8 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-base leading-relaxed text-white placeholder:text-white/40 transition-all duration-200 resize-none min-h-[40px] sm:min-h-[44px] max-h-[120px] overflow-y-auto focus:ring-1 focus:ring-blue-500/20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          rows={1}
          style={{ fontSize: '16px' }}
        />

        <AIMessageToolsWrapper 
          message={value} 
          onMessageUpdate={(e) => onChange(e.target.value)}
        />

        {value.trim() ? (
          <Button 
            onClick={onSend} 
            size="icon" 
            className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 hover:scale-105"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onMouseDown={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
            onMouseUp={onStopVoiceRecording}
            onTouchStart={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
            onTouchEnd={onStopVoiceRecording}
            className={`shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-full border transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse scale-110' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70 hover:scale-105'
            }`}
          >
            <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        )}
      </div>
    </div>
  );
});
