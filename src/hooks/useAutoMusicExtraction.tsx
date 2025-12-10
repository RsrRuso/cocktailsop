import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractionResult {
  isMusic: boolean;
  audioUrl?: string;
  title?: string;
}

export function useAutoMusicExtraction() {
  // Instant extraction - just save the video URL as audio source
  const extractAndAnalyzeAudio = useCallback(async (
    videoUrl: string,
    videoFileName: string
  ): Promise<ExtractionResult> => {
    try {
      console.log('Instant music save for:', videoFileName);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isMusic: false };
      }

      // Generate title from filename
      const title = generateTitleFromFile(videoFileName);
      
      // Insert IMMEDIATELY - no duration check, no processing
      // Browser can play audio from video URL directly
      const { error: insertError } = await supabase.from('music_tracks').insert({
        uploaded_by: user.id,
        title: title,
        original_url: videoUrl,
        preview_url: videoUrl,
        duration_sec: 30, // Default - can be updated later
        category: 'extracted',
        tags: ['extracted', 'from-reel'],
        status: 'approved'
      });

      if (insertError) {
        console.error('Music track save failed:', insertError);
        return { isMusic: false };
      }

      console.log('Music saved:', title);
      return { isMusic: true, audioUrl: videoUrl, title };
    } catch (error) {
      console.error('Extraction error:', error);
      return { isMusic: false };
    }
  }, []);

  return {
    extractAndAnalyzeAudio,
    isExtracting: false,
    extractionProgress: 0
  };
}

function generateTitleFromFile(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title || 'Extracted Audio';
}
