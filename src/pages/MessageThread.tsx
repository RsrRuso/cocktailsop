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
import { MessageInput } from "@/components/MessageInput";
import { MediaRecorder } from "@/components/MediaRecorder";
import { ForwardMessageDialog } from "@/components/ForwardMessageDialog";
import { GroupSettingsDialog } from "@/components/GroupSettingsDialog";
import { SmartReplySuggestions } from "@/components/SmartReplySuggestions";

const MessageThread = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
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

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-background via-background/95 to-background flex flex-col">
      {/* Header with Instagram-style design */}
      <div className="relative backdrop-blur-2xl border-b border-border/10 p-3 flex items-center gap-3 overflow-hidden shadow-lg">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/30" />
        
        <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="glass shrink-0 relative z-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {isGroup ? (
          <>
            <div className="relative cursor-pointer hover:scale-105 transition-transform shrink-0 z-10" onClick={() => setShowGroupSettings(true)}>
              <div className="w-14 h-14 rounded-full glass flex items-center justify-center bg-primary/10 avatar-glow">
                <Settings className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
              <p className="font-bold text-lg truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
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
                className="glass shrink-0 relative z-10"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </>
        ) : otherUser && (
          <>
            <div className="relative cursor-pointer hover:scale-105 transition-transform shrink-0 z-10" onClick={() => navigate(`/user/${otherUser.id}`)}>
              <div className="relative">
                <OptimizedAvatar
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  fallback={otherUser.username[0].toUpperCase()}
                  userId={otherUser.id}
                  className="w-14 h-14 border-2 border-background avatar-glow"
                />
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full neon-green border-2 border-background">
                    <div className="w-full h-full rounded-full neon-green animate-pulse" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
              <p className="font-bold text-lg truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {otherUser.full_name}
              </p>
              {isTyping ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm text-primary font-medium">typing</p>
                </div>
              ) : (
                <p className={`text-sm truncate flex items-center gap-1 ${isOnline ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {isOnline && <span className="w-2 h-2 rounded-full bg-primary" />}
                  {isOnline ? 'Active now' : '@' + otherUser.username}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages with modern styling */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-gradient-to-b from-transparent via-background/50 to-transparent">
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
              onReaction={(emoji) => handleReaction(message.id, emoji)}
              onEdit={isOwn && !message.media_url ? () => { 
                setEditingMessage(message); 
                setNewMessage(message.content); 
              } : undefined}
            >
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {message.reactions.map((reaction, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleReaction(message.id, reaction.emoji)} 
                      className={`backdrop-blur-xl rounded-full px-3 py-1.5 text-lg flex items-center gap-1 hover:scale-110 transition-all duration-200 border ${
                        reaction.user_ids.includes(currentUser?.id || "") 
                          ? "bg-primary/20 border-primary/50 shadow-lg shadow-primary/20" 
                          : "glass border-border/30 hover:bg-primary/10"
                      }`}
                    >
                      <span className="text-xl">{reaction.emoji}</span>
                      {reaction.user_ids.length > 1 && (
                        <span className="text-xs font-bold">{reaction.user_ids.length}</span>
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

      {/* AI Smart Reply Suggestions */}
      {messages.length > 0 && messages[messages.length - 1].sender_id !== currentUser?.id && !replyingTo && !editingMessage && (
        <SmartReplySuggestions
          lastMessage={messages[messages.length - 1].content}
          onSelectReply={(reply) => {
            setNewMessage(reply);
          }}
        />
      )}

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
