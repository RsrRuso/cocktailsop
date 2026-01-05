import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export function useCreatePost() {
  return useMutation({
    mutationFn: async ({
      userId,
      content,
      mediaUrl,
    }: {
      userId: string;
      content: string;
      mediaUrl?: string;
    }) => {
      const media_urls = mediaUrl?.trim() ? [mediaUrl.trim()] : null;
      const res = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content,
          media_urls,
        })
        .select('id')
        .single();
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
      await queryClient.invalidateQueries({ queryKey: ['explore-top'] });
    },
  });
}

