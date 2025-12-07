import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
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
      if (!user) { navigate("/auth"); return; }
      setCurrentUser(user);

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
  }, [conversationId]);

  useEffect(() => {
    if (currentUser) initializeChat();
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

      if (replyingTo) messageData.reply_to_id = replyingTo.id;

      if (editingMessage) {
        await supabase.from("messages").update({
          content: trimmedMessage,
          edited: true,
          edited_at: new Date().toISOString(),
        }).eq("id", editingMessage.id);
        setEditingMessage(null);
      } else {
        await supabase.from("messages").insert(messageData);
      }

      updateTypingStatus(false);
      supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    } catch (error) {
      console.error("Failed to send:", error);
      setNewMessage(trimmedMessage);
    }
  }, [newMessage, currentUser, conversationId, replyingTo, editingMessage, updateTypingStatus]);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const showSmartReplies = lastMessage && lastMessage.sender_id !== currentUser?.id && !replyingTo && !editingMessage;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Lightweight Header */}
      <div className="border-b border-border/50 px-3 py-2.5 flex items-center gap-3 bg-background/95 backdrop-blur-sm z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {isGroup ? (
          <>
            <div className="cursor-pointer shrink-0" onClick={() => setShowGroupSettings(true)}>
              {groupAvatarUrl ? (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                  <img src={groupAvatarUrl} alt={groupName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{groupName}</p>
              <p className="text-xs text-muted-foreground">Group</p>
            </div>
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => setShowGroupSettings(true)} className="h-9 w-9">
                <Settings className="w-4 h-4" />
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
                className="w-10 h-10"
              />
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{otherUser.full_name}</p>
              {isTyping ? (
                <p className="text-xs text-primary">typing...</p>
              ) : (
                <p className="text-xs text-muted-foreground">{isOnline ? 'Online' : `@${otherUser.username}`}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages - Simple scrollable area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser?.id;
          const replyMessage = message.reply_to_id ? messages.find((m) => m.id === message.reply_to_id) : null;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              replyMessage={replyMessage}
              onReply={(msg) => setReplyingTo(msg)}
              onDelete={isOwn ? () => handleDelete(message.id) : undefined}
              onForward={() => { setForwardingMessage(message); setShowForwardDialog(true); }}
              onReaction={(emoji) => handleReaction(message.id, emoji)}
              onEdit={isOwn && !message.media_url ? () => { setEditingMessage(message); setNewMessage(message.content); } : undefined}
            >
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {message.reactions.map((reaction, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleReaction(message.id, reaction.emoji)} 
                      className={`rounded-full px-1.5 py-0.5 text-xs flex items-center gap-0.5 ${
                        reaction.user_ids.includes(currentUser?.id || "") 
                          ? "bg-primary/20 border border-primary/40" 
                          : "bg-muted/50"
                      }`}
                    >
                      <span>{reaction.emoji}</span>
                      {reaction.user_ids.length > 1 && <span className="text-[10px]">{reaction.user_ids.length}</span>}
                    </button>
                  ))}
                </div>
              )}
            </MessageBubble>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Replies */}
      {showSmartReplies && (
        <SmartReplySuggestions
          lastMessage={lastMessage.content}
          onSelectReply={(reply) => setNewMessage(reply)}
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
        onCancel={stopVideoRecording}
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
