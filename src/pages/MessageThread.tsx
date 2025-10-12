import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useMessageThread, Message } from "@/hooks/useMessageThread";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageActions } from "@/components/MessageActions";
import { MessageInput } from "@/components/MessageInput";
import { MediaRecorder } from "@/components/MediaRecorder";

const MessageThread = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    otherUser,
    isOnline,
    isTyping,
    initializeChat,
    updateTypingStatus,
    handleReaction,
    handleDelete,
  } = useMessageThread(conversationId, currentUser);

  const {
    isRecording,
    isRecordingVideo,
    isUploading,
    uploadProgress,
    videoStream,
    handleFileUpload,
    startVoiceRecording,
    stopVoiceRecording,
    startVideoRecording,
    stopVideoRecording,
  } = useMediaUpload(conversationId, currentUser?.id);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
    };
    init();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [conversationId]);

  useEffect(() => {
    if (currentUser) {
      initializeChat();
    }
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !conversationId) return;

    const trimmedMessage = newMessage.trim();
    setNewMessage("");
    setReplyingTo(null);

    try {
      const messageData: any = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: trimmedMessage,
        delivered: false,
        read: false,
      };

      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
      }

      if (editingMessage) {
        await supabase
          .from("messages")
          .update({
            content: trimmedMessage,
            edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq("id", editingMessage.id);
        setEditingMessage(null);
      } else {
        await supabase.from("messages").insert(messageData);
      }

      updateTypingStatus(false);
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(trimmedMessage);
    }
  };

  const quickEmojis = ["🔥", "❤️", "👍", "😂", "😮", "😢", "🎉", "👏"];
  const allEmojis = [
    "🔥", "❤️", "👍", "😂", "😮", "😢", "🎉", "👏",
    "💯", "✨", "⚡", "💪", "🙌", "🤝", "💖", "🌟",
    "🎊", "🎈", "🎁", "🌈", "☀️", "🌙", "⭐", "💫",
    "😍", "🥰", "😎", "🤩", "🤗", "🥳", "😊", "🙏"
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="glass backdrop-blur-xl border-b border-primary/20 p-4 flex items-center gap-3 glow-primary">
        <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="glass shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {otherUser && (
          <>
            <div className="relative cursor-pointer hover:scale-105 transition-transform shrink-0 pt-6" onClick={() => navigate(`/user/${otherUser.id}`)}>
              <OptimizedAvatar
                src={otherUser.avatar_url}
                alt={otherUser.username}
                fallback={otherUser.username[0].toUpperCase()}
                userId={otherUser.id}
                className="w-12 h-12 border-2 border-background avatar-glow"
              />
              {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full neon-green border-2 border-background animate-pulse"></div>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-semibold truncate">{otherUser.full_name}</p>
              {isTyping ? (
                <p className="text-sm neon-green-text animate-pulse">typing...</p>
              ) : (
                <p className="text-sm text-muted-foreground truncate">
                  {isOnline ? 'Online' : '@' + otherUser.username}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser?.id;
          const replyMessage = message.reply_to_id ? messages.find((m) => m.id === message.reply_to_id) : null;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              replyMessage={replyMessage}
              onReply={(msg) => {
                const element = document.getElementById(`message-${msg.id}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <MessageActions
                message={message}
                isOwn={isOwn}
                onReaction={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                onReply={() => setReplyingTo(message)}
                onEdit={isOwn && !message.media_url ? () => { setEditingMessage(message); setNewMessage(message.content); } : undefined}
                onDelete={isOwn ? () => handleDelete(message.id) : undefined}
              />

              {showEmojiPicker === message.id && (
                <div className="absolute bottom-full mb-2 neon-blue backdrop-blur-xl rounded-2xl p-4 z-20 neon-blue-glow shadow-2xl max-w-xs">
                  <div className="flex flex-wrap gap-2">
                    {(showAllEmojis ? allEmojis : quickEmojis).map((emoji) => (
                      <button 
                        key={emoji} 
                        onClick={() => { 
                          handleReaction(message.id, emoji); 
                          setShowEmojiPicker(null); 
                          setShowAllEmojis(false);
                        }} 
                        className="hover:scale-125 transition-all duration-200 text-3xl w-12 h-12 flex items-center justify-center rounded-xl hover:neon-blue"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowAllEmojis(!showAllEmojis)}
                      className="hover:scale-110 transition-all duration-200 text-2xl w-12 h-12 flex items-center justify-center rounded-xl neon-blue font-bold"
                    >
                      {showAllEmojis ? "−" : "+"}
                    </button>
                  </div>
                </div>
              )}

              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {message.reactions.map((reaction, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleReaction(message.id, reaction.emoji)} 
                      className={`backdrop-blur-lg rounded-full px-3 py-1 text-xl flex items-center hover:scale-110 transition-all duration-200 ${
                        reaction.user_ids.includes(currentUser?.id || "") 
                          ? "neon-blue neon-blue-glow" 
                          : "glass hover:neon-blue"
                      }`}
                    >
                      <span>{reaction.emoji}</span>
                    </button>
                  ))}
                </div>
              )}
            </MessageBubble>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSend}
        onTyping={updateTypingStatus}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => { setEditingMessage(null); setNewMessage(""); }}
        isRecording={isRecording}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onStartVoiceRecording={startVoiceRecording}
        onStopVoiceRecording={stopVoiceRecording}
        onFileUpload={handleFileUpload}
        onStartVideoRecording={startVideoRecording}
      />

      <MediaRecorder
        isRecordingVideo={isRecordingVideo}
        isUploading={isUploading}
        videoStream={videoStream}
        onStop={stopVideoRecording}
        onCancel={() => { stopVideoRecording(); }}
      />
    </div>
  );
};

export default MessageThread;
