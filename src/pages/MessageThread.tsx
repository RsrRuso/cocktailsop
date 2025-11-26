import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Smile, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useMessageThread, Message } from "@/hooks/useMessageThread";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageActions } from "@/components/MessageActions";
import { MessageInput } from "@/components/MessageInput";
import { MediaRecorder } from "@/components/MediaRecorder";
import { ForwardMessageDialog } from "@/components/ForwardMessageDialog";
import { GroupSettingsDialog } from "@/components/GroupSettingsDialog";

const MessageThread = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
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

      // Fetch conversation info to check if it's a group
      if (conversationId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('is_group, group_name, created_by')
          .eq('id', conversationId)
          .single();

        if (conv) {
          setIsGroup(conv.is_group || false);
          setGroupName(conv.group_name || '');
          setIsAdmin(conv.created_by === user.id);
        }
      }
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

  const handleSend = useCallback(async () => {
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
      
      // Update conversation timestamp in background
      requestAnimationFrame(() => {
        supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(trimmedMessage);
    }
  }, [newMessage, currentUser, conversationId, replyingTo, editingMessage, updateTypingStatus]);

  const quickEmojis = ["🔥", "❤️", "👍", "😂", "😮", "😢", "🎉", "👏"];
  const allEmojis = [
    "🔥", "❤️", "👍", "😂", "😮", "😢", "🎉", "👏",
    "💯", "✨", "⚡", "💪", "🙌", "🤝", "💖", "🌟",
    "🎊", "🎈", "🎁", "🌈", "☀️", "🌙", "⭐", "💫",
    "😍", "🥰", "😎", "🤩", "🤗", "🥳", "😊", "🙏"
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Simplified Header */}
      <div className="border-b border-border p-3 flex items-center gap-3 bg-background">
        
        <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {isGroup ? (
          <>
            <div className="relative cursor-pointer shrink-0" onClick={() => setShowGroupSettings(true)}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
                <Settings className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-bold truncate">
                {groupName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                Group • {messages.length > 0 ? `${messages.length} messages` : 'No messages yet'}
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowGroupSettings(true)}
                className="shrink-0"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </>
        ) : otherUser && (
          <>
            <div className="relative cursor-pointer shrink-0" onClick={() => navigate(`/user/${otherUser.id}`)}>
              <OptimizedAvatar
                src={otherUser.avatar_url}
                alt={otherUser.username}
                fallback={otherUser.username[0].toUpperCase()}
                userId={otherUser.id}
                className="w-12 h-12"
              />
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-bold truncate">
                {otherUser.full_name}
              </p>
              {isTyping ? (
                <p className="text-sm text-primary">typing...</p>
              ) : (
                <p className="text-sm text-muted-foreground truncate">
                  {isOnline ? 'Active' : '@' + otherUser.username}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                setReplyingTo(msg);
                const element = document.getElementById(`message-${msg.id}`);
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              onDelete={isOwn ? () => handleDelete(message.id) : undefined}
              onForward={() => {
                setForwardingMessage(message);
                setShowForwardDialog(true);
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
                <div className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-lg p-2 z-20 shadow-lg">
                  <div className="flex flex-wrap gap-1">
                    {(showAllEmojis ? allEmojis : quickEmojis).map((emoji) => (
                      <button 
                        key={emoji} 
                        onClick={() => { 
                          handleReaction(message.id, emoji); 
                          setShowEmojiPicker(null); 
                          setShowAllEmojis(false);
                        }} 
                        className="text-2xl w-10 h-10 flex items-center justify-center rounded hover:bg-muted"
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowAllEmojis(!showAllEmojis)}
                      className="text-lg w-10 h-10 flex items-center justify-center rounded bg-muted font-bold"
                    >
                      {showAllEmojis ? "−" : "+"}
                    </button>
                  </div>
                </div>
              )}

              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {message.reactions.map((reaction, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleReaction(message.id, reaction.emoji)} 
                      className={`rounded-full px-2 py-0.5 text-sm flex items-center gap-1 ${
                        reaction.user_ids.includes(currentUser?.id || "") 
                          ? "bg-primary/20" 
                          : "bg-muted"
                      }`}
                    >
                      <span>{reaction.emoji}</span>
                      {reaction.user_ids.length > 1 && (
                        <span className="text-xs">{reaction.user_ids.length}</span>
                      )}
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

      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        message={forwardingMessage}
        currentUserId={currentUser?.id}
      />

      <GroupSettingsDialog
        open={showGroupSettings}
        onOpenChange={setShowGroupSettings}
        conversationId={conversationId || ''}
        currentUserId={currentUser?.id || ''}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default MessageThread;
