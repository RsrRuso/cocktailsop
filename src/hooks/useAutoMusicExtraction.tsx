import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractionResult {
  isMusic: boolean;
  audioUrl?: string;
  title?: string;
}

export function useAutoMusicExtraction() {
  const extractAndAnalyzeAudio = useCallback(async (
    videoUrl: string,
    videoFile: File
  ): Promise<ExtractionResult> => {
    try {
      console.log('Starting instant music extraction for:', videoFile.name);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found for music extraction');
        return { isMusic: false };
      }

      // Generate title from video filename
      const title = generateTitleFromFile(videoFile.name);
      
      // Get video duration quickly
      const duration = await getVideoDuration(videoUrl);
      
      if (duration < 3) {
        console.log('Video too short for music extraction:', duration);
        return { isMusic: false };
      }

      // Insert directly into music_tracks - browser can play audio from video URL
      // This is INSTANT - no FFmpeg processing needed
      const { data, error: insertError } = await supabase.from('music_tracks').insert({
        uploaded_by: user.id,
        title: title,
        original_url: videoUrl,
        preview_url: videoUrl, // Video URL works for audio playback too
        duration_sec: Math.round(duration),
        category: 'extracted',
        tags: ['extracted', 'from-reel', 'auto-detected'],
        status: 'approved' // Auto-approve for instant availability
      }).select().single();

      if (insertError) {
        console.error('Failed to save music track:', insertError);
        return { isMusic: false };
      }

      console.log('Music track saved instantly:', title, data?.id);
      
      return { 
        isMusic: true, 
        audioUrl: videoUrl,
        title 
      };
    } catch (error) {
      console.error('Music extraction error:', error);
      return { isMusic: false };
    }
  }, []);

  return {
    extractAndAnalyzeAudio,
    isExtracting: false,
    extractionProgress: 0
  };
}

// Get video duration quickly
function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      resolve(video.duration);
      video.src = ''; // Cleanup
    };
    
    video.onerror = () => {
      resolve(30); // Default to 30 seconds if can't determine
      video.src = '';
    };
    
    // Timeout after 2 seconds
    setTimeout(() => {
      if (!video.duration) {
        resolve(30);
        video.src = '';
      }
    }, 2000);
    
    video.src = videoUrl;
  });
}

// Generate title from filename
function generateTitleFromFile(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title || 'Extracted Audio';
}
