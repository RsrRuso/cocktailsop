import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Check, CheckCheck, Smile, Reply, Edit2, Trash2, X, Plus, Paperclip, Image as ImageIcon, Mic, Video, FileText, StopCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Reaction {
  emoji: string;
  user_ids: string[];
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  delivered: boolean;
  reactions: Reaction[];
  reply_to_id: string | null;
  edited: boolean;
  edited_at: string | null;
  media_url?: string;
  media_type?: 'image' | 'video' | 'voice' | 'document';
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface PresenceState {
  presence_ref: string;
  user_id: string;
  online_at: string;
  typing?: boolean;
}

const MessageThread = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    initializeChat();
    requestNotificationPermission();
  }, [conversationId]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    if (!conversationId || !currentUser) return;

    // Set up presence channel
    const presenceChannel = supabase.channel(`presence-${conversationId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state: any = presenceChannel.presenceState();
        const otherUserPresence: any = Object.values(state).find(
          (presence: any) => presence[0]?.user_id !== currentUser.id
        );
        
        if (otherUserPresence && otherUserPresence[0]) {
          setIsOnline(true);
          setIsTyping(otherUserPresence[0].typing || false);
        } else {
          setIsOnline(false);
          setIsTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== currentUser.id) {
          setIsOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== currentUser.id) {
          setIsOnline(false);
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      });

    channelRef.current = presenceChannel;

    // Set up messages channel
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              reactions: (newMsg.reactions as Reaction[]) || [],
            },
          ]);
          scrollToBottom();

          // Mark as delivered
          if (newMsg.sender_id !== currentUser.id) {
            supabase
              .from('messages')
              .update({ delivered: true })
              .eq('id', newMsg.id)
              .then(() => {});

            // Play loud notification sound
            const receivedSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVKzn7K5fGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBSh+zPLZjT0HImvB7+ScTgwPUq3n7KxeGAg+ltryxHElBSyBzvLYiTcIGWi77fueRwgMS6Lh8LJlHAQ4ktfyyHgrBQ==');
            receivedSound.volume = 1.0; // Maximum volume
            receivedSound.play().catch(() => {});

            // Send push notification
            if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
              new Notification('New message from ' + otherUser?.full_name, {
                body: newMsg.content,
                icon: otherUser?.avatar_url || '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'message-' + newMsg.id,
                requireInteraction: false,
              });
            }

            markAsRead(newMsg.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id
                ? {
                    ...updatedMsg,
                    reactions: (updatedMsg.reactions as Reaction[]) || [],
                  }
                : msg
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
      supabase.removeChannel(messagesChannel);
    };
  }, [conversationId, currentUser]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUser(user);

    // Fetch all data in parallel for instant loading
    const [conversationResult, messagesResult] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single(),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
    ]);

    // Handle conversation and profile
    if (conversationResult.data) {
      const otherUserId = conversationResult.data.participant_ids.find((id: string) => id !== user.id);
      
      // Fetch other user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();
      
      setOtherUser(profile);
    }

    // Handle messages
    if (messagesResult.data) {
      setMessages(
        messagesResult.data.map((msg: any) => ({
          ...msg,
          reactions: (msg.reactions as Reaction[]) || [],
        }))
      );
      scrollToBottom();
      
      // Mark all unread messages as read
      const unreadIds = messagesResult.data
        .filter(msg => !msg.read && msg.sender_id !== user.id)
        .map(msg => msg.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", messageId);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (channelRef.current) {
      channelRef.current.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString(),
        typing: value.length > 0,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      }, 1000);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !conversationId) return;

    const trimmedMessage = newMessage.trim();
    
    // Clear input immediately for better UX
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
        // Update existing message (preserve media fields)
        const { error } = await supabase
          .from("messages")
          .update({
            content: trimmedMessage,
            edited: true,
            edited_at: new Date().toISOString(),
          })
          .eq("id", editingMessage.id);

        if (error) {
          console.error("Error editing message:", error);
          throw error;
        }
        
        toast({
          title: "Success",
          description: "Message edited",
        });
        
        setEditingMessage(null);
      } else {
        // Create new message
        const { data, error } = await supabase
          .from("messages")
          .insert(messageData)
          .select();

        if (error) {
          console.error("Error sending message:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error("Message was not created");
        }
      }
      
      // Update typing status
      if (channelRef.current) {
        channelRef.current.track({
          user_id: currentUser.id,
          online_at: new Date().toISOString(),
          typing: false,
        });
      }

      // Update last message timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
        
    } catch (error: any) {
      console.error("Failed to send message:", error);
      // Restore message on error
      setNewMessage(trimmedMessage);
      toast({
        title: "Failed to send",
        description: error?.message || "Please check your connection and try again",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const reactions = message.reactions || [];
    const existingReaction = reactions.find((r) => r.emoji === emoji);

    let updatedReactions;
    if (existingReaction) {
      // Toggle reaction
      if (existingReaction.user_ids.includes(currentUser.id)) {
        existingReaction.user_ids = existingReaction.user_ids.filter(
          (id) => id !== currentUser.id
        );
        if (existingReaction.user_ids.length === 0) {
          updatedReactions = reactions.filter((r) => r.emoji !== emoji);
        } else {
          updatedReactions = reactions;
        }
      } else {
        existingReaction.user_ids.push(currentUser.id);
        updatedReactions = reactions;
      }
    } else {
      updatedReactions = [...reactions, { emoji, user_ids: [currentUser.id] }];
    }

    const { error } = await supabase
      .from("messages")
      .update({ reactions: updatedReactions })
      .eq("id", messageId);

    if (error) console.error("Error updating reaction:", error);
    setShowEmojiPicker(null);
  };

  const handleUnsend = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    
    // Delete media from storage if it exists
    if (message?.media_url) {
      try {
        const urlParts = message.media_url.split('/');
        const filePath = urlParts.slice(-2).join('/'); // Get user_id/filename
        await supabase.storage.from('stories').remove([filePath]);
      } catch (error) {
        console.error("Error deleting media file:", error);
      }
    }
    
    // Delete message from database
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Message deleted successfully",
      });
    }
  };

  const startEdit = (message: Message) => {
    // Only allow editing if it's your own message
    if (message.sender_id !== currentUser?.id) {
      toast({
        title: "Error",
        description: "You can only edit your own messages",
        variant: "destructive",
      });
      return;
    }
    
    setEditingMessage(message);
    setNewMessage(message.content);
    setReplyingTo(null);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTouchStart = (e: React.TouchEvent, messageId: string) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Allow normal scrolling
  };

  const handleTouchEnd = (e: React.TouchEvent, message: Message) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Swipe left to reply (right to left swipe)
    if (deltaX < -50 && Math.abs(deltaY) < 30 && deltaTime < 300) {
      setReplyingTo(message);
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }

    touchStartRef.current = null;
  };

  const handleFileUpload = async (files: FileList | null, type: 'image' | 'document' | 'video') => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      // Send message with file
      const messageData = {
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : `📎 ${file.name}`,
        delivered: false,
        media_url: publicUrl,
        media_type: type,
      };

      await supabase.from("messages").insert(messageData);
      setShowAttachMenu(false);

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size === 0) {
          toast({
            title: "Error",
            description: "No audio recorded",
            variant: "destructive",
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Upload audio
        const fileName = `voice_${Date.now()}.webm`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(filePath, audioBlob);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Error",
            description: "Failed to upload voice message",
            variant: "destructive",
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(filePath);

        // Send voice message
        const messageData = {
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: '🎤 Voice message',
          delivered: false,
          media_url: publicUrl,
          media_type: 'voice' as const,
        };

        await supabase.from("messages").insert(messageData);
        
        toast({
          title: "Success",
          description: "Voice message sent",
        });
        
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setMediaRecorder(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      toast({
        title: "Recording",
        description: "Recording voice message...",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      
      setVideoStream(stream);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      videoChunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        
        if (videoBlob.size === 0) {
          toast({
            title: "Error",
            description: "No video recorded",
            variant: "destructive",
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Upload video
        const fileName = `video_${Date.now()}.webm`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(filePath, videoBlob);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast({
            title: "Error",
            description: "Failed to upload video message",
            variant: "destructive",
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(filePath);

        // Send video message
        const messageData = {
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: '🎥 Video message',
          delivered: false,
          media_url: publicUrl,
          media_type: 'video' as const,
        };

        await supabase.from("messages").insert(messageData);
        
        toast({
          title: "Success",
          description: "Video message sent",
        });
        
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        setIsRecordingVideo(false);
        setMediaRecorder(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingVideo(true);
      
      toast({
        title: "Recording",
        description: "Recording video message...",
      });
    } catch (error) {
      console.error("Error starting video recording:", error);
      toast({
        title: "Error",
        description: "Failed to start video recording. Please check camera permissions.",
        variant: "destructive",
      });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Close all menus when clicking on empty space
    if (e.target === e.currentTarget) {
      setShowEmojiPicker(null);
      setShowAttachMenu(false);
      setReplyingTo(null);
      setEditingMessage(null);
      setNewMessage("");
    }
  };

  const quickEmojis = ["❤️", "😂", "😮", "😢", "🙏", "👍", "🔥"];

  const allEmojis = [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
    "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪",
    "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏",
    "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
    "🤢", "🤮", "🤧", "🥵", "🥶", "😶‍🌫️", "🥴", "😵", "🤯", "🤠", "🥳", "😎",
    "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦",
    "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩",
    "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡",
    "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽",
    "🙀", "😿", "😾", "🙈", "🙉", "🙊", "💋", "💌", "💘", "💝", "💖", "💗",
    "💓", "💞", "💕", "💟", "❣️", "💔", "❤️", "🧡", "💛", "💚", "💙", "💜",
    "🤎", "🖤", "🤍", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💬", "👁️‍🗨️",
    "🗨️", "🗯️", "💭", "💤", "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤏", "✌️",
    "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎",
    "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏"
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col" onClick={handleBackgroundClick}>
      {/* Header */}
      <div className="glass backdrop-blur-xl border-b border-primary/20 p-4 flex items-center gap-3 glow-primary" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/messages")}
          className="glass"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {otherUser && (
          <>
            <div 
              className="relative cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigate(`/user/${otherUser.id}`)}
            >
              <div className={`relative w-12 h-12 rounded-full p-[2px] transition-all duration-300 ${
                isOnline ? 'neon-green animate-pulse' : 'bg-border'
              }`}>
                <Avatar className="w-full h-full border-2 border-background avatar-glow">
                  <AvatarImage src={otherUser.avatar_url || undefined} />
                  <AvatarFallback className="text-sm">{otherUser.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full neon-green border-2 border-background animate-pulse"></div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{otherUser.full_name}</p>
              {isTyping ? (
                <p className="text-sm neon-green-text animate-pulse">typing...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isOnline ? 'Online' : '@' + otherUser.username}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser?.id;
          const showAvatar = !isOwn;
          const repliedMessage = message.reply_to_id
            ? messages.find((m) => m.id === message.reply_to_id)
            : null;

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 group`}
              onTouchStart={(e) => handleTouchStart(e, message.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, message)}
            >
              {showAvatar && otherUser && (
                <Avatar 
                  className="w-8 h-8 shrink-0 avatar-glow cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => navigate(`/user/${otherUser.id}`)}
                >
                  <AvatarImage src={otherUser.avatar_url || ""} />
                  <AvatarFallback>
                    {otherUser.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col max-w-[70%]">
                <div
                  className={`${
                    message.media_url && (message.media_type === 'image' || message.media_type === 'video')
                      ? '' // No background for media messages
                      : isOwn 
                        ? "bg-primary/20 backdrop-blur-lg border border-primary/30 glow-primary" 
                        : "glass glow-accent"
                  } ${
                    message.media_url && (message.media_type === 'image' || message.media_type === 'video')
                      ? 'p-0' // No padding for media
                      : 'px-4 py-2'
                  } rounded-2xl message-3d relative group`}
                >
                  {repliedMessage && (
                    <div className={`${message.media_url && (message.media_type === 'image' || message.media_type === 'video') ? 'px-4 pt-2' : ''} mb-2 pb-2 border-b border-border/30 text-xs opacity-70`}>
                      <div className="flex items-center gap-1">
                        <Reply className="w-3 h-3" />
                        <span>Replying to:</span>
                      </div>
                      <p className="truncate">{repliedMessage.content}</p>
                    </div>
                  )}
                  
                  {/* Media Display */}
                  {message.media_url && message.media_type === 'image' && (
                    <div className="mb-2 overflow-hidden rounded-lg">
                      <img 
                        src={message.media_url} 
                        alt="Shared image" 
                        className="max-w-full h-auto max-h-[300px] w-full object-cover"
                      />
                    </div>
                  )}
                  
                  {message.media_url && message.media_type === 'video' && (
                    <div className="mb-2 overflow-hidden rounded-lg">
                      <video 
                        src={message.media_url} 
                        controls 
                        className="max-w-full h-auto max-h-[300px] w-full"
                      />
                    </div>
                  )}
                  
                  {message.media_url && message.media_type === 'voice' && (
                    <audio 
                      src={message.media_url} 
                      controls 
                      className="mb-2 w-full max-w-[250px]"
                    />
                  )}
                  
                  {message.media_url && message.media_type === 'document' && (
                    <a 
                      href={message.media_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors mb-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">View Document</span>
                    </a>
                  )}
                  
                  <p className={`${message.media_url && (message.media_type === 'image' || message.media_type === 'video') ? 'px-4 pb-2' : ''} text-sm break-words`}>{message.content}</p>
                  {message.edited && (
                    <span className={`${message.media_url && (message.media_type === 'image' || message.media_type === 'video') ? 'px-4' : ''} text-xs opacity-50 italic ml-2`}>edited</span>
                  )}
                  <div className={`${message.media_url && (message.media_type === 'image' || message.media_type === 'video') ? 'px-4 pb-2' : ''} flex items-center justify-between gap-2 mt-1`}>
                    <span className="text-xs opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
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
                  
                  {/* Message Actions */}
                  <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 glass"
                      onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                    >
                      <Smile className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 glass"
                      onClick={() => setReplyingTo(message)}
                    >
                      <Reply className="h-3 w-3" />
                    </Button>
                    {isOwn && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 glass hover:bg-primary/20"
                          onClick={() => startEdit(message)}
                          title="Edit message"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 glass hover:bg-destructive/20"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this message?')) {
                              handleUnsend(message.id);
                            }
                          }}
                          title="Delete message"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>

                  
                  {/* Emoji Picker */}
                  {showEmojiPicker === message.id && (
                    <div className="absolute bottom-full mb-2 glass backdrop-blur-xl rounded-2xl p-4 z-20 border border-primary/20 glow-primary shadow-2xl max-w-xs">
                      <div className="flex flex-wrap gap-2">
                        {["🔥", "❤️", "👍", "😂", "😮", "😢", "🎉", "👏"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className="hover:scale-125 transition-transform text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-primary/10"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
                
                {/* Reactions Display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {message.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleReaction(message.id, reaction.emoji)}
                        className={`glass backdrop-blur-lg rounded-full px-2 py-0.5 text-xs flex items-center gap-1 hover:scale-110 transition-transform ${
                          reaction.user_ids.includes(currentUser?.id || "")
                            ? "ring-1 ring-primary glow-primary"
                            : ""
                        }`}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-[10px] opacity-70">
                          {reaction.user_ids.length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t glass backdrop-blur-xl border-primary/20" onClick={(e) => e.stopPropagation()}>
        {replyingTo && (
          <div className="mb-2 glass backdrop-blur-lg rounded-lg p-2 flex items-center justify-between border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4" />
              <span className="opacity-70">Replying to:</span>
              <span className="truncate max-w-[200px]">{replyingTo.content}</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setReplyingTo(null)}
            >
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
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={cancelEdit}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {/* Video Recording Preview */}
        {isRecordingVideo && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex-1 relative">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 bg-background/95 backdrop-blur-xl flex justify-center gap-4">
              <Button
                size="lg"
                variant="destructive"
                onClick={stopVideoRecording}
                className="flex items-center gap-2"
              >
                <StopCircle className="w-5 h-5" />
                Stop & Send
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  stopVideoRecording();
                  setIsRecordingVideo(false);
                }}
                className="flex items-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </Button>
            </div>
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
                  handleFileUpload(files, 'image');
                } else if (fileType.startsWith('video/')) {
                  handleFileUpload(files, 'video');
                } else {
                  handleFileUpload(files, 'document');
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
              <div className="absolute bottom-full left-0 mb-2 bg-background/95 backdrop-blur-xl border border-primary/20 rounded-2xl shadow-2xl p-2 z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute('accept', 'image/*');
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span>Photo</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute('accept', 'video/*');
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Video className="w-5 h-5 text-primary" />
                  <span>Video</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.txt,.zip,.rar');
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Document</span>
                </button>
                <button
                  onClick={() => {
                    startVideoRecording();
                    setShowAttachMenu(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Camera className="w-5 h-5 text-primary" />
                  <span>Record Video</span>
                </button>
              </div>
            )}
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              if (isRecording) {
                stopVoiceRecording();
              } else {
                startVoiceRecording();
              }
            }}
            className={`shrink-0 glass ${isRecording ? 'neon-red animate-pulse' : ''}`}
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            className="flex-1 glass backdrop-blur-lg border-primary/30"
          />
          <Button onClick={handleSend} size="icon" className="shrink-0 glow-primary neon-green">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;