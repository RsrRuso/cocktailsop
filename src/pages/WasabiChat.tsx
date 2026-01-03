import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Send, Paperclip, Mic, MoreVertical, Phone, Video, 
  Image as ImageIcon, FileText, Camera, Users, Check, CheckCheck,
  Smile, Reply, Forward, Trash2, Star, X, Square, Play, Pause,
  Download, File, Loader2
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWasabiMedia } from "@/hooks/useWasabiMedia";
import { useWasabiChat, Message } from "@/hooks/useWasabiChat";

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const WasabiChat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    messages,
    chatInfo,
    loading,
    sending,
    currentUserId,
    sendMessage,
    handleReaction,
    deleteMessage,
  } = useWasabiChat(conversationId);

  const {
    isRecordingVoice,
    isRecordingVideo,
    voiceDuration,
    videoDuration,
    isUploading,
    videoStream,
    startVoiceRecording,
    stopVoiceRecording,
    cancelVoiceRecording,
    startVideoRecording,
    stopVideoRecording,
    cancelVideoRecording,
    handleFileSelect,
    formatDuration
  } = useWasabiMedia({
    conversationId: conversationId || '',
    currentUserId,
    onMessageSent: () => {}
  });

  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoPreviewRef.current && videoStream) {
      videoPreviewRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const success = await sendMessage(newMessage, replyingTo?.id);
    if (success) {
      setNewMessage('');
      setReplyingTo(null);
      inputRef.current?.focus();
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const getDisplayName = () => {
    if (chatInfo?.is_group) return chatInfo.name || 'Group Chat';
    return chatInfo?.other_user?.full_name || chatInfo?.other_user?.username || 'Unknown';
  };

  const getAvatarUrl = () => {
    if (chatInfo?.is_group) return chatInfo.avatar_url;
    return chatInfo?.other_user?.avatar_url;
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatMessageDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  const renderMessageContent = (msg: Message) => {
    if (msg.is_deleted) {
      return (
        <span className="italic text-muted-foreground">
          This message was deleted
        </span>
      );
    }

    switch (msg.message_type) {
      case 'image':
        return (
          <img 
            src={msg.media_url || ''} 
            alt="Image" 
            className="max-w-[280px] rounded-lg cursor-pointer"
            onClick={() => window.open(msg.media_url || '', '_blank')}
          />
        );
      case 'video':
        return (
          <video 
            src={msg.media_url || ''} 
            controls 
            className="max-w-[280px] rounded-lg"
          />
        );
      case 'voice':
      case 'audio':
        return (
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg min-w-[200px]">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={() => {
                if (playingAudio === msg.id) {
                  audioRef.current?.pause();
                  setPlayingAudio(null);
                } else {
                  if (audioRef.current) {
                    audioRef.current.src = msg.media_url || '';
                    audioRef.current.play();
                    setPlayingAudio(msg.id);
                  }
                }
              }}
            >
              {playingAudio === msg.id ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <div className="flex-1 h-1 bg-white/20 rounded-full">
              <div className="h-full w-0 bg-green-500 rounded-full" />
            </div>
          </div>
        );
      case 'document':
        return (
          <a 
            href={msg.media_url || ''} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10"
          >
            <File className="w-8 h-8 text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Document</p>
              <p className="text-xs text-muted-foreground">Tap to download</p>
            </div>
            <Download className="w-5 h-5" />
          </a>
        );
      default:
        return <span className="whitespace-pre-wrap break-words">{msg.content}</span>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/wasabi')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-10 h-10">
          <AvatarImage src={getAvatarUrl() || ''} />
          <AvatarFallback className={chatInfo?.is_group ? 'bg-green-600' : 'bg-primary'}>
            {chatInfo?.is_group ? (
              <Users className="w-5 h-5 text-white" />
            ) : (
              getDisplayName().charAt(0).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{getDisplayName()}</h1>
          <p className="text-xs text-muted-foreground">
            {chatInfo?.is_group 
              ? `${chatInfo.members?.length || 0} members`
              : 'tap for info'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View contact</DropdownMenuItem>
              <DropdownMenuItem>Search</DropdownMenuItem>
              <DropdownMenuItem>Mute notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Clear chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center my-4">
                  <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                    {date}
                  </span>
                </div>

                {msgs.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex mb-2",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2 relative group",
                          isOwn 
                            ? "bg-green-600 text-white rounded-br-sm" 
                            : "bg-muted rounded-bl-sm"
                        )}
                        onClick={() => setSelectedMessage(selectedMessage === msg.id ? null : msg.id)}
                      >
                        {/* Reply preview */}
                        {msg.reply_to && (
                          <div className={cn(
                            "border-l-2 pl-2 mb-2 text-xs",
                            isOwn ? "border-white/50" : "border-primary"
                          )}>
                            <p className="font-medium opacity-70">
                              {msg.reply_to.sender?.full_name || msg.reply_to.sender?.username}
                            </p>
                            <p className="opacity-60 truncate">{msg.reply_to.content}</p>
                          </div>
                        )}

                        {/* Sender name for groups */}
                        {chatInfo?.is_group && !isOwn && (
                          <p className="text-xs font-medium text-primary mb-1">
                            {msg.sender?.full_name || msg.sender?.username}
                          </p>
                        )}

                        {/* Content */}
                        {renderMessageContent(msg)}

                        {/* Time & status */}
                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-[10px] opacity-60">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                          {isOwn && (
                            <CheckCheck className="w-3 h-3 text-blue-300" />
                          )}
                        </div>

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="absolute -bottom-3 left-2 flex gap-0.5 bg-background rounded-full px-1.5 py-0.5 shadow-sm border">
                            {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => (
                              <span key={emoji} className="text-xs">{emoji}</span>
                            ))}
                          </div>
                        )}

                        {/* Message actions popup */}
                        {selectedMessage === msg.id && (
                          <div className={cn(
                            "absolute z-20 bg-popover border rounded-lg shadow-lg p-2",
                            isOwn ? "right-0 -top-14" : "left-0 -top-14"
                          )}>
                            <div className="flex gap-1 mb-2">
                              {QUICK_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  className="text-lg hover:scale-125 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReaction(msg.id, emoji);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2 border-t pt-2">
                              <button 
                                className="p-1.5 hover:bg-muted rounded"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingTo(msg);
                                  setSelectedMessage(null);
                                  inputRef.current?.focus();
                                }}
                              >
                                <Reply className="w-4 h-4" />
                              </button>
                              {isOwn && (
                                <button 
                                  className="p-1.5 hover:bg-muted rounded text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMessage(msg.id);
                                    setSelectedMessage(null);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Audio player (hidden) */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingAudio(null)}
        className="hidden"
      />

      {/* Video Recording Overlay */}
      {isRecordingVideo && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            className="w-64 h-64 rounded-full object-cover mb-6"
          />
          <div className="text-2xl font-bold text-white mb-4">
            {formatDuration(videoDuration)}
          </div>
          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={cancelVideoRecording}
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              size="lg"
              onClick={stopVideoRecording}
            >
              <Square className="w-5 h-5 mr-2" />
              Stop & Send
            </Button>
          </div>
        </div>
      )}

      {/* Reply Bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-t flex items-center gap-3">
          <div className="w-1 h-10 bg-green-500 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-600">
              Replying to {replyingTo.sender?.full_name || replyingTo.sender?.username}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyingTo.content || 'Media'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Voice Recording Bar */}
      {isRecordingVoice && (
        <div className="px-4 py-3 bg-green-600 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={cancelVoiceRecording}
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-medium">{formatDuration(voiceDuration)}</span>
          </div>
          <Button
            className="bg-white text-green-600 hover:bg-white/90"
            onClick={stopVoiceRecording}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      )}

      {/* Input Bar */}
      {!isRecordingVoice && !isRecordingVideo && (
        <div className="px-4 py-3 border-t bg-background">
          <div className="flex items-center gap-2">
            {/* Attachments */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isUploading}>
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-2">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="bg-blue-500/20 text-blue-500"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="bg-purple-500/20 text-purple-500"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="bg-red-500/20 text-red-500"
                    onClick={startVideoRecording}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="bg-orange-500/20 text-orange-500"
                    onClick={() => documentInputRef.current?.click()}
                  >
                    <FileText className="w-5 h-5" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'video')}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'document')}
            />

            {/* Message Input */}
            <Input
              ref={inputRef}
              placeholder="Message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1"
            />

            {/* Send or Voice */}
            {newMessage.trim() ? (
              <Button 
                size="icon" 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                className="text-green-600"
                onClick={startVoiceRecording}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WasabiChat;
