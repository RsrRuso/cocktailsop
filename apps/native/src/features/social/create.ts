import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export function useCreateStory() {
  return useMutation({
    mutationFn: async ({
      userId,
      mediaUrl,
      mediaType,
    }: {
      userId: string;
      mediaUrl: string;
      mediaType: string;
    }) => {
      const res = await supabase
        .from('stories')
        .insert({ user_id: userId, media_url: mediaUrl, media_type: mediaType })
        .select('id')
        .single();
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stories'] });
      await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });
}

export function useCreateReel() {
  return useMutation({
    mutationFn: async ({
      userId,
      videoUrl,
      caption,
    }: {
      userId: string;
      videoUrl: string;
      caption?: string;
    }) => {
      const res = await supabase
        .from('reels')
        .insert({ user_id: userId, video_url: videoUrl, caption: caption ?? null })
        .select('id')
        .single();
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reels'] });
      await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });
}

