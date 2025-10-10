import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Paperclip, Mic, Reply, Edit2, X } from 'lucide-react';
import { Message } from '@/hooks/useMessageThread';
import { AttachmentMenu } from './AttachmentMenu';

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
  onStartVoiceRecording: () => void;
  onStopVoiceRecording: () => void;
  onFileUpload: (files: FileList, type: 'image' | 'video' | 'document') => void;
  onStartVideoRecording: () => void;
}

export const MessageInput = ({
  value,
  onChange,
  onSend,
  onTyping,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  isRecording,
  onStartVoiceRecording,
  onStopVoiceRecording,
  onFileUpload,
  onStartVideoRecording,
}: MessageInputProps) => {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    onTyping(newValue.length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 border-t glass backdrop-blur-xl border-primary/20">
      {replyingTo && (
        <div className="mb-2 glass backdrop-blur-lg rounded-lg p-2 flex items-center justify-between border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="w-4 h-4" />
            <span className="opacity-70">Replying to:</span>
            <span className="truncate max-w-[200px]">{replyingTo.content}</span>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelReply}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {editingMessage && (
        <div className="mb-2 glass backdrop-blur-lg rounded-lg p-2 flex items-center justify-between border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Edit2 className="w-4 h-4" />
            <span className="opacity-70">Editing message</span>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancelEdit}>
            <X className="h-3 w-3" />
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
            className="shrink-0 glass"
          >
            <Paperclip className="h-4 w-4" />
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
            />
          )}
        </div>

        <Input
          value={value}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-1 glass backdrop-blur-xl"
        />

        {value.trim() ? (
          <Button onClick={onSend} size="icon" className="shrink-0 neon-green">
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onMouseDown={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
            onMouseUp={onStopVoiceRecording}
            onTouchStart={isRecording ? onStopVoiceRecording : onStartVoiceRecording}
            onTouchEnd={onStopVoiceRecording}
            className={`shrink-0 glass ${isRecording ? 'bg-red-500/20 animate-pulse' : ''}`}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
