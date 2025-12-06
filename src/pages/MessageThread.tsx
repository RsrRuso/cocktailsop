import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Smile, Settings, Palette, Bell } from "lucide-react";
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
import { ChatBackgroundPicker, Chat3DBackground, getStoredBackground, ChatBackground } from "@/components/ChatBackgroundPicker";
import { NotificationSoundPicker } from "@/components/NotificationSoundPicker";

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
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [chatBackground, setChatBackground] = useState<ChatBackground>(getStoredBackground);
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
          .select('is_group, group_name, group_avatar_url, created_by')
          .eq('id', conversationId)
          .single();

        if (conv) {
          setIsGroup(conv.is_group || false);
          setGroupName(conv.group_name || '');
          setGroupAvatarUrl(conv.group_avatar_url);
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
    if (!newMessage.trim() || !currentUser || !conversationId) {
      console.log('Send blocked:', { hasMessage: !!newMessage.trim(), hasUser: !!currentUser, hasConvId: !!conversationId });
      return;
    }

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
        const { error } = await supabase
          .from("messages")
          .update({
            content: trimmedMessage,
            edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq("id", editingMessage.id);
        
        if (error) throw error;
        setEditingMessage(null);
      } else {
        const { error } = await supabase.from("messages").insert(messageData);
        if (error) throw error;
      }

      updateTypingStatus(false);
      
      // Update conversation timestamp in background
      supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setNewMessage(trimmedMessage);
    }
  }, [newMessage, currentUser, conversationId, replyingTo, editingMessage, updateTypingStatus]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Dynamic 3D Background */}
      <Chat3DBackground background={chatBackground} />

      {/* Header with enhanced design */}
      <div className="relative backdrop-blur-3xl border-b border-primary/20 p-4 flex items-center gap-3 overflow-hidden shadow-2xl z-10">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/50" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/messages")} 
          className="glass shrink-0 relative z-10 hover:scale-110 transition-transform hover:bg-primary/20 rounded-full shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {isGroup ? (
          <>
            <div className="relative cursor-pointer hover:scale-110 transition-all duration-300 shrink-0 z-10" onClick={() => setShowGroupSettings(true)}>
              {groupAvatarUrl ? (
                <div className="w-16 h-16 rounded-full overflow-hidden glass border-2 border-primary/30 avatar-glow shadow-xl">
                  <img 
                    src={groupAvatarUrl} 
                    alt={groupName || 'Group'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 avatar-glow shadow-xl border-2 border-primary/30">
                  <Settings className="w-8 h-8 text-primary drop-shadow-lg" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
              <p className="font-bold text-xl truncate bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
                {groupName}
              </p>
              <p className="text-sm font-medium text-muted-foreground/80 truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Group • {messages.length > 0 ? `${messages.length} messages` : 'No messages yet'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBackgroundPicker(true)}
                className="glass rounded-full hover:bg-primary/20"
              >
                <Palette className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGroupSettings(true)}
                  className="glass rounded-full"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              )}
            </div>
          </>
        ) : otherUser && (
          <>
            <div className="relative cursor-pointer hover:scale-110 transition-all duration-300 shrink-0 z-10 group" onClick={() => navigate(`/user/${otherUser.id}`)}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-md group-hover:blur-lg transition-all" />
                <OptimizedAvatar
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  fallback={otherUser.username[0].toUpperCase()}
                  userId={otherUser.id}
                  className="w-16 h-16 border-3 border-primary/40 avatar-glow shadow-2xl relative"
                />
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-3 border-background shadow-lg">
                    <div className="w-full h-full rounded-full bg-green-400 animate-pulse" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center z-10">
              <p className="font-bold text-xl truncate bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-sm">
                {otherUser.full_name}
              </p>
              {isTyping ? (
                <div className="flex items-center gap-2 glass rounded-full px-3 py-1 w-fit">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-bounce shadow-sm" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-bounce shadow-sm" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">typing</p>
                </div>
              ) : (
                <p className={`text-sm truncate flex items-center gap-1.5 font-medium ${isOnline ? 'text-primary' : 'text-muted-foreground/80'}`}>
                  {isOnline && <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse shadow-sm" />}
                  {isOnline ? 'Active now' : '@' + otherUser.username}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 z-10">
              <NotificationSoundPicker
                trigger={
                  <Button variant="ghost" size="icon" className="glass rounded-full hover:bg-primary/20">
                    <Bell className="w-4 h-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBackgroundPicker(true)}
                className="glass rounded-full hover:bg-primary/20"
              >
                <Palette className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Messages with enhanced styling */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent via-background/30 to-transparent relative">
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
                      className={`backdrop-blur-2xl rounded-full px-2.5 py-1 text-sm flex items-center gap-1 hover:scale-110 transition-all duration-300 border shadow-lg ${
                        reaction.user_ids.includes(currentUser?.id || "") 
                          ? "bg-gradient-to-r from-primary/30 to-accent/30 border-primary/50 shadow-primary/20 scale-105" 
                          : "glass border-border/30 hover:bg-gradient-to-r hover:from-primary/20 hover:to-accent/20"
                      }`}
                    >
                      <span className="text-base">{reaction.emoji}</span>
                      {reaction.user_ids.length > 1 && (
                        <span className="text-[10px] font-bold bg-background/50 px-1 py-0.5 rounded-full">{reaction.user_ids.length}</span>
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

      <ChatBackgroundPicker
        open={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        onSelectBackground={setChatBackground}
        currentBackground={chatBackground}
      />
    </div>
  );
};

export default MessageThread;
