import { Message } from '@/hooks/useMessageThread';
import { Check, CheckCheck } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyMessage?: Message | null;
  onReply: (message: Message) => void;
  children?: React.ReactNode;
}

export const MessageBubble = ({
  message,
  isOwn,
  replyMessage,
  onReply,
  children,
}: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative group max-w-[75%] ${
          message.media_url && (message.media_type === 'image' || message.media_type === 'video')
            ? ''
            : 'glass backdrop-blur-xl px-4 py-2'
        } rounded-2xl ${isOwn ? 'glow-primary' : ''} ${
          message.media_url && (message.media_type === 'image' || message.media_type === 'video')
            ? 'overflow-hidden'
            : ''
        }`}
      >
        {message.reply_to_id && replyMessage && (
          <div
            className={`${
              message.media_url && (message.media_type === 'image' || message.media_type === 'video')
                ? 'px-4 pt-2'
                : ''
            } mb-2 p-2 glass backdrop-blur-lg rounded-lg text-xs opacity-70 border-l-2 border-primary cursor-pointer hover:opacity-100 transition-opacity`}
            onClick={() => onReply(replyMessage)}
          >
            <p className="font-semibold">Replying to</p>
            <p className="truncate">{replyMessage.content}</p>
          </div>
        )}

        {message.media_url && message.media_type === 'image' && (
          <LazyImage
            src={message.media_url}
            alt="Shared image"
            className="w-full max-w-sm rounded-t-2xl"
          />
        )}

        {message.media_url && message.media_type === 'video' && (
          <video src={message.media_url} controls className="w-full max-w-sm rounded-t-2xl" />
        )}

        {message.media_url && message.media_type === 'voice' && (
          <div className="flex items-center gap-2">
            <audio src={message.media_url} controls className="w-full" />
          </div>
        )}

        {message.media_url && message.media_type === 'document' && (
          <div className="flex items-center gap-2">
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              📎 View Document
            </a>
          </div>
        )}

        <p
          className={`${
            message.media_url && (message.media_type === 'image' || message.media_type === 'video')
              ? 'px-4 pt-2'
              : ''
          } break-words whitespace-pre-wrap ${message.edited ? 'italic' : ''}`}
        >
          {message.content}
          {message.edited && <span className="text-xs opacity-50 ml-2">(edited)</span>}
        </p>

        <div
          className={`${
            message.media_url && (message.media_type === 'image' || message.media_type === 'video')
              ? 'px-4 pb-2'
              : ''
          } flex items-center justify-between gap-2 mt-1`}
        >
          <span className="text-xs opacity-70">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOwn && (
            <div className="flex items-center gap-1">
              {message.read ? (
                <CheckCheck className="w-3 h-3 text-neon-green glow-accent" />
              ) : message.delivered ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
};
