import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useMediaUpload = (
  conversationId: string | undefined,
  currentUserId: string | undefined
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleFileUpload = async (
    files: FileList,
    type: 'image' | 'video' | 'document'
  ) => {
    if (!files[0] || !currentUserId || !conversationId) return;

    try {
      const file = files[0];
      const fileName = `${type}_${Date.now()}_${file.name}`;
      const filePath = `${currentUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('stories').getPublicUrl(filePath);

      const messageData = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content:
          type === 'image' ? '📷 Photo' : type === 'video' ? '🎥 Video' : '📎 Document',
        delivered: false,
        media_url: publicUrl,
        media_type: type,
      };

      await supabase.from('messages').insert(messageData);

      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
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
            title: 'Error',
            description: 'No audio recorded',
            variant: 'destructive',
          });
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const fileName = `voice_${Date.now()}.webm`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(filePath, audioBlob);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Error',
            description: 'Failed to upload voice message',
            variant: 'destructive',
          });
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('stories').getPublicUrl(filePath);

        const messageData = {
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: '🎤 Voice message',
          delivered: false,
          media_url: publicUrl,
          media_type: 'voice' as const,
        };

        await supabase.from('messages').insert(messageData);

        toast({
          title: 'Success',
          description: 'Voice message sent',
        });

        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setMediaRecorder(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      toast({
        title: 'Recording',
        description: 'Recording voice message...',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start recording. Please check microphone permissions.',
        variant: 'destructive',
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
        audio: true,
      });

      setVideoStream(stream);

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
            title: 'Error',
            description: 'No video recorded',
            variant: 'destructive',
          });
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const fileName = `video_${Date.now()}.webm`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(filePath, videoBlob);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Error',
            description: 'Failed to upload video message',
            variant: 'destructive',
          });
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('stories').getPublicUrl(filePath);

        const messageData = {
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: '🎥 Video message',
          delivered: false,
          media_url: publicUrl,
          media_type: 'video' as const,
        };

        await supabase.from('messages').insert(messageData);

        toast({
          title: 'Success',
          description: 'Video message sent',
        });

        stream.getTracks().forEach((track) => track.stop());
        setVideoStream(null);
        setIsRecordingVideo(false);
        setMediaRecorder(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingVideo(true);

      toast({
        title: 'Recording',
        description: 'Recording video message...',
      });
    } catch (error) {
      console.error('Error starting video recording:', error);
      toast({
        title: 'Error',
        description: 'Failed to start video recording. Please check camera permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
  };

  return {
    isRecording,
    isRecordingVideo,
    videoStream,
    handleFileUpload,
    startVoiceRecording,
    stopVoiceRecording,
    startVideoRecording,
    stopVideoRecording,
  };
};
