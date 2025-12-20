import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseWasabiMediaProps {
  conversationId: string;
  currentUserId: string | null;
  onMessageSent?: () => void;
}

export const useWasabiMedia = ({ conversationId, currentUserId, onMessageSent }: UseWasabiMediaProps) => {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const uploadToStorage = async (file: Blob, folder: string, fileName: string) => {
    const filePath = `${folder}/${conversationId}/${Date.now()}_${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('wasabi-media')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('wasabi-media')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const sendMediaMessage = async (mediaUrl: string, messageType: string, content?: string) => {
    if (!currentUserId || !conversationId) return;

    const { error } = await supabase
      .from('wasabi_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        message_type: messageType,
        media_url: mediaUrl,
        content: content || null
      });

    if (error) throw error;

    await supabase
      .from('wasabi_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    onMessageSent?.();
  };

  // Voice Recording
  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setVoiceDuration(0);

      timerRef.current = setInterval(() => {
        setVoiceDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        setIsRecordingVoice(false);
        setIsUploading(true);

        try {
          const url = await uploadToStorage(audioBlob, 'voice', 'voice.webm');
          await sendMediaMessage(url, 'voice', `Voice message (${voiceDuration}s)`);
          toast.success('Voice message sent');
        } catch (error) {
          console.error('Error uploading voice:', error);
          toast.error('Failed to send voice message');
        } finally {
          setIsUploading(false);
          setVoiceDuration(0);
        }
        resolve();
      };

      mediaRecorderRef.current!.stop();
    });
  }, [conversationId, currentUserId, voiceDuration]);

  const cancelVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setVoiceDuration(0);
  }, []);

  // Video Recording
  const startVideoRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });
      videoStreamRef.current = stream;
      setVideoStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm'
      });
      videoRecorderRef.current = mediaRecorder;
      videoChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecordingVideo(true);
      setVideoDuration(0);

      videoTimerRef.current = setInterval(() => {
        setVideoDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting video recording:', error);
      toast.error('Could not access camera');
    }
  }, []);

  const stopVideoRecording = useCallback(async () => {
    if (!videoRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      videoRecorderRef.current!.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        
        if (videoTimerRef.current) {
          clearInterval(videoTimerRef.current);
        }
        
        if (videoStreamRef.current) {
          videoStreamRef.current.getTracks().forEach(track => track.stop());
        }

        setIsRecordingVideo(false);
        setVideoStream(null);
        setIsUploading(true);

        try {
          const url = await uploadToStorage(videoBlob, 'videos', 'video.webm');
          await sendMediaMessage(url, 'video', `Video message (${videoDuration}s)`);
          toast.success('Video message sent');
        } catch (error) {
          console.error('Error uploading video:', error);
          toast.error('Failed to send video message');
        } finally {
          setIsUploading(false);
          setVideoDuration(0);
        }
        resolve();
      };

      videoRecorderRef.current!.stop();
    });
  }, [conversationId, currentUserId, videoDuration]);

  const cancelVideoRecording = useCallback(() => {
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop();
    }
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
    }
    videoChunksRef.current = [];
    setIsRecordingVideo(false);
    setVideoStream(null);
    setVideoDuration(0);
  }, []);

  // File Upload
  const uploadFile = useCallback(async (file: File, type: 'image' | 'video' | 'document') => {
    if (!currentUserId || !conversationId) return;

    setIsUploading(true);
    try {
      const folder = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'documents';
      const url = await uploadToStorage(file, folder, file.name);
      await sendMediaMessage(url, type, file.name);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} sent`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to send ${type}`);
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, currentUserId]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, type);
    }
    e.target.value = '';
  }, [uploadFile]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
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
    uploadFile,
    handleFileSelect,
    formatDuration
  };
};
