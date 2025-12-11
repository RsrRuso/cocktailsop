import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractionResult {
  isMusic: boolean;
  audioUrl?: string;
  title?: string;
  artist?: string;
}

export function useAutoMusicExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);

  // Extract music with AI recognition for naming
  const extractAndAnalyzeAudio = useCallback(async (
    videoUrl: string,
    videoFileName: string
  ): Promise<ExtractionResult> => {
    try {
      console.log('Extracting music with AI recognition:', videoFileName);
      setIsExtracting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isMusic: false };
      }

      // Call AI music recognition
      let title = generateTitleFromFile(videoFileName);
      let artist = 'Unknown Artist';
      
      try {
        const { data: recognitionData, error: recognitionError } = await supabase.functions.invoke('recognize-music', {
          body: { filename: videoFileName, videoUrl }
        });
        
        if (!recognitionError && recognitionData) {
          title = recognitionData.title || title;
          artist = recognitionData.artist || artist;
          
          if (recognitionData.recognized) {
            toast.success(`🎵 Recognized: ${title} by ${artist}`);
          }
        }
      } catch (recognitionErr) {
        console.log('Music recognition unavailable, using filename:', recognitionErr);
      }

      // Insert with recognized or generated title
      const { error: insertError } = await supabase.from('music_tracks').insert({
        uploaded_by: user.id,
        title: title,
        artist: artist,
        original_url: videoUrl,
        preview_url: videoUrl,
        duration_sec: 30,
        category: 'other',
        tags: ['extracted', 'from-reel'],
        status: 'approved'
      });

      if (insertError) {
        console.error('Music track save failed:', insertError);
        return { isMusic: false };
      }

      console.log('Music saved:', title, 'by', artist);
      toast.success(`Music extracted: ${title}`);
      return { isMusic: true, audioUrl: videoUrl, title, artist };
    } catch (error) {
      console.error('Extraction error:', error);
      return { isMusic: false };
    } finally {
      setIsExtracting(false);
    }
  }, []);

  return {
    extractAndAnalyzeAudio,
    isExtracting,
    extractionProgress: isExtracting ? 50 : 0
  };
}

function generateTitleFromFile(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\d{4,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const title = cleanName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return title || 'Extracted Audio';
}
