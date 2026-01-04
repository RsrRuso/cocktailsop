import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface CommunityVoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

function CommunityVoiceRecorderComponent({ onSend, onCancel }: CommunityVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 64;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

      // Start waveform animation
      const updateWaveform = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const normalizedData = Array.from(dataArray.slice(0, 20)).map(v => v / 255);
          setWaveformData(normalizedData);
        }
        animationRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleSend = useCallback(async () => {
    if (audioBlob) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}
      onSend(audioBlob, duration);
    }
  }, [audioBlob, duration, onSend]);

  const handleCancel = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    stopRecording();
    setAudioBlob(null);
    setDuration(0);
    setWaveformData([]);
    onCancel();
  }, [stopRecording, onCancel]);

  const togglePlayback = useCallback(() => {
    if (!audioBlob) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioBlob, isPlaying]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800/80 border-t border-white/10">
      <AnimatePresence mode="wait">
        {!isRecording && !audioBlob ? (
          <motion.div
            key="start"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex-1 flex items-center justify-center"
          >
            <Button
              size="lg"
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full h-14 w-14"
            >
              <Mic className="w-6 h-6" />
            </Button>
            <span className="ml-3 text-white/50 text-sm">Tap to record</span>
          </motion.div>
        ) : isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center gap-3"
          >
            {/* Cancel button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              className="h-10 w-10 text-white/60 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>

            {/* Waveform visualization */}
            <div className="flex-1 flex items-center justify-center gap-0.5 h-10">
              {waveformData.map((value, index) => (
                <motion.div
                  key={index}
                  className="w-1 bg-red-500 rounded-full"
                  animate={{ height: Math.max(4, value * 32) }}
                  transition={{ duration: 0.05 }}
                />
              ))}
            </div>

            {/* Duration */}
            <span className="text-white font-mono text-sm min-w-[48px]">
              {formatDuration(duration)}
            </span>

            {/* Stop button */}
            <Button
              size="icon"
              onClick={stopRecording}
              className="h-10 w-10 bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              <Square className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center gap-3"
          >
            {/* Cancel button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancel}
              className="h-10 w-10 text-white/60 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>

            {/* Playback */}
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayback}
              className="h-10 w-10 text-white/80 hover:bg-white/10"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            {/* Waveform static */}
            <div className="flex-1 h-8 bg-white/5 rounded-full flex items-center px-3">
              <div className="flex-1 h-1 bg-blue-500/50 rounded-full">
                <div className="h-full bg-blue-500 rounded-full w-0" />
              </div>
            </div>

            {/* Duration */}
            <span className="text-white/60 font-mono text-sm">
              {formatDuration(duration)}
            </span>

            {/* Send button */}
            <Button
              size="icon"
              onClick={handleSend}
              className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CommunityVoiceRecorder = memo(CommunityVoiceRecorderComponent);
