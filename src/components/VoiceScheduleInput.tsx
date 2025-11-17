import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceScheduleInputProps {
  onTranscription: (text: string) => void;
}

export default function VoiceScheduleInput({ onTranscription }: VoiceScheduleInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording started. Speak your schedule...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info('Processing audio...');
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        try {
          const { data, error } = await supabase.functions.invoke('transcribe-schedule', {
            body: { audio: base64Audio }
          });

          if (error) throw error;

          if (data?.text) {
            toast.success('Transcription complete!');
            onTranscription(data.text);
          } else {
            throw new Error('No transcription received');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          toast.error('Failed to transcribe audio. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Failed to process audio file');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Audio processing error:', error);
      toast.error('Failed to process audio');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-2">
      {!isRecording && !isProcessing && (
        <Button
          onClick={startRecording}
          variant="outline"
          className="gap-2"
        >
          <Mic className="w-4 h-4" />
          Voice Input
        </Button>
      )}
      
      {isRecording && (
        <Button
          onClick={stopRecording}
          variant="destructive"
          className="gap-2 animate-pulse"
        >
          <MicOff className="w-4 h-4" />
          Stop Recording
        </Button>
      )}
      
      {isProcessing && (
        <Button disabled variant="outline" className="gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </Button>
      )}
    </div>
  );
}
