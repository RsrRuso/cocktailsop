import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';

interface UploadProgress {
  stage: string;
  progress: number;
  current?: number;
  total?: number;
}

interface StoryMetadata {
  filters?: any;
  textOverlays?: any[];
  musicUrl?: string;
}

export function useAdvancedStoryUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: '',
    progress: 0,
  });
  const [isUploading, setIsUploading] = useState(false);

  const uploadStory = useCallback(async (
    mediaFiles: File[],
    metadata: Record<number, StoryMetadata> = {}
  ) => {
    if (mediaFiles.length === 0) {
      toast.error('No media files selected');
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to create stories');
      return null;
    }

    setIsUploading(true);
    setUploadProgress({ stage: 'Preparing upload...', progress: 5 });

    try {
      const uploadedUrls: string[] = [];
      const mediaTypes: string[] = [];
      
      // Upload each media file with progress tracking
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        setUploadProgress({
          stage: `Uploading ${isVideo ? 'video' : 'image'} ${i + 1} of ${mediaFiles.length}...`,
          progress: 10 + (i / mediaFiles.length) * 70,
          current: i + 1,
          total: mediaFiles.length,
        });

        let fileToUpload = file;

        // Compress images for better performance
        if (isImage) {
          setUploadProgress({
            stage: `Compressing image ${i + 1}...`,
            progress: 10 + (i / mediaFiles.length) * 70,
            current: i + 1,
            total: mediaFiles.length,
          });

          try {
            const compressed = await compressImage(file, 2);
            fileToUpload = new File([compressed], file.name, { type: file.type });
          } catch (error) {
            console.warn('Compression failed, using original:', error);
          }
        }

        // Generate unique filename
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const bucket = isVideo ? 'videos' : 'stories';

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        mediaTypes.push(isVideo ? 'video' : 'image');
      }

      setUploadProgress({ stage: 'Creating story...', progress: 85 });

      // Create story in database with all metadata
      const { data: story, error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_urls: uploadedUrls,
          media_types: mediaTypes,
          view_count: 0,
          like_count: 0,
          comment_count: 0,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress({ stage: 'Story created!', progress: 100 });
      
      // Success toast with haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
      
      toast.success('Story uploaded successfully!', {
        description: `${mediaFiles.length} media file(s) shared`,
      });

      return story;

    } catch (error: any) {
      console.error('Story upload error:', error);
      
      setUploadProgress({ stage: 'Upload failed', progress: 0 });
      
      toast.error('Failed to upload story', {
        description: error.message || 'Please try again',
      });
      
      return null;

    } finally {
      setIsUploading(false);
      
      // Reset progress after 2 seconds
      setTimeout(() => {
        setUploadProgress({ stage: '', progress: 0 });
      }, 2000);
    }
  }, []);

  return {
    uploadStory,
    uploadProgress,
    isUploading,
  };
}
