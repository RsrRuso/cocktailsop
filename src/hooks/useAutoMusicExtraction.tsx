import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFFmpeg } from './useFFmpeg';
import { toast } from 'sonner';

interface ExtractionResult {
  isMusic: boolean;
  audioUrl?: string;
  title?: string;
}

export function useAutoMusicExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const { load, extractAudio, loaded } = useFFmpeg();

  const extractAndAnalyzeAudio = useCallback(async (
    videoUrl: string,
    videoFile: File
  ): Promise<ExtractionResult> => {
    setIsExtracting(true);
    setExtractionProgress(10);

    try {
      // Load FFmpeg if not loaded
      if (!loaded) {
        await load();
      }
      setExtractionProgress(20);

      // Extract audio from video
      const audioUrl = await extractAudio(videoUrl);
      setExtractionProgress(50);

      // Get audio blob for analysis
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      
      // Check audio duration - if too short (< 3 seconds), likely not music
      const audioDuration = await getAudioDuration(audioUrl);
      
      if (audioDuration < 3) {
        setExtractionProgress(100);
        return { isMusic: false };
      }
      setExtractionProgress(60);

      // Send to AI for music detection
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isMusic: false };
      }

      // Analyze audio characteristics using AI
      const isMusic = await analyzeAudioForMusic(audioBlob, audioDuration);
      setExtractionProgress(80);

      if (isMusic) {
        // Upload to music library
        const fileName = `${user.id}/${Date.now()}-extracted.mp3`;
        const { error: uploadError } = await supabase.storage
          .from('music')
          .upload(fileName, audioBlob, { contentType: 'audio/mp3' });

        if (uploadError) {
          console.error('Failed to upload extracted audio:', uploadError);
          return { isMusic: false };
        }

        const { data: { publicUrl } } = supabase.storage
          .from('music')
          .getPublicUrl(fileName);

        // Generate title from video filename
        const title = generateTitleFromFile(videoFile.name);

        // Insert into music_tracks
        const { error: insertError } = await supabase.from('music_tracks').insert({
          uploaded_by: user.id,
          title: title,
          original_url: publicUrl,
          preview_url: publicUrl,
          duration_sec: Math.round(audioDuration),
          category: 'extracted',
          tags: ['extracted', 'auto-detected'],
          status: 'pending' // Needs approval
        });

        if (insertError) {
          console.error('Failed to save music track:', insertError);
          return { isMusic: false };
        }

        setExtractionProgress(100);
        return { 
          isMusic: true, 
          audioUrl: publicUrl,
          title 
        };
      }

      setExtractionProgress(100);
      return { isMusic: false };
    } catch (error) {
      console.error('Audio extraction error:', error);
      return { isMusic: false };
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  }, [loaded, load, extractAudio]);

  return {
    extractAndAnalyzeAudio,
    isExtracting,
    extractionProgress
  };
}

// Helper to get audio duration
function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(0);
    });
  });
}

// Analyze if audio contains music vs background noise
async function analyzeAudioForMusic(audioBlob: Blob, duration: number): Promise<boolean> {
  try {
    // Use Web Audio API for basic audio analysis
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    
    // Calculate audio characteristics
    let sum = 0;
    let peakCount = 0;
    let lastValue = 0;
    let zeroCrossings = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const value = Math.abs(channelData[i]);
      sum += value;
      
      // Count peaks (rhythmic patterns indicate music)
      if (value > 0.3 && lastValue < 0.3) {
        peakCount++;
      }
      
      // Count zero crossings (higher for speech, lower for music)
      if ((channelData[i] >= 0 && lastValue < 0) || (channelData[i] < 0 && lastValue >= 0)) {
        zeroCrossings++;
      }
      
      lastValue = channelData[i];
    }
    
    const avgAmplitude = sum / channelData.length;
    const peaksPerSecond = peakCount / duration;
    const zeroCrossingsPerSecond = zeroCrossings / duration;
    
    // Music detection heuristics:
    // - Average amplitude > 0.05 (not silence)
    // - Peaks per second between 0.5-10 (rhythmic)
    // - Zero crossings per second < 3000 (not just noise)
    const isLikelyMusic = 
      avgAmplitude > 0.05 &&
      peaksPerSecond > 0.5 &&
      peaksPerSecond < 10 &&
      zeroCrossingsPerSecond < 3000 &&
      duration > 5; // Music typically longer than 5 seconds
    
    await audioContext.close();
    
    return isLikelyMusic;
  } catch (error) {
    console.error('Audio analysis error:', error);
    return false;
  }
}

// Generate title from filename
function generateTitleFromFile(filename: string): string {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Replace underscores and dashes with spaces
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
  // Capitalize first letter of each word
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title || 'Extracted Audio';
}
