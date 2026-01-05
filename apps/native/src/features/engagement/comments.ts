import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export type CommentRow = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { username: string; full_name: string; avatar_url: string | null } | null;
};

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async (): Promise<CommentRow[]> => {
      const res = await supabase
        .from('post_comments')
        .select('id, user_id, content, created_at, profiles:profiles (username, full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as CommentRow[];
    },
  });
}

export function useAddPostComment(userId?: string) {
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: userId, content })
        .select('id, user_id, content, created_at')
        .single();
      if (res.error) throw res.error;
      return res.data as any;
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['post-comments', vars.postId] });
      // Refresh the post detail counts
      await queryClient.invalidateQueries({ queryKey: ['post', vars.postId] });
      await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });
}

export function useReelComments(reelId: string) {
  return useQuery({
    queryKey: ['reel-comments', reelId],
    enabled: !!reelId,
    queryFn: async (): Promise<CommentRow[]> => {
      const res = await supabase
        .from('reel_comments')
        .select('id, user_id, content, created_at, profiles:profiles (username, full_name, avatar_url)')
        .eq('reel_id', reelId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as CommentRow[];
    },
  });
}

export function useAddReelComment(userId?: string) {
  return useMutation({
    mutationFn: async ({ reelId, content }: { reelId: string; content: string }) => {
      if (!userId) throw new Error('Not signed in');
      const res = await supabase
        .from('reel_comments')
        .insert({ reel_id: reelId, user_id: userId, content })
        .select('id, user_id, content, created_at')
        .single();
      if (res.error) throw res.error;
      return res.data as any;
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['reel-comments', vars.reelId] });
      await queryClient.invalidateQueries({ queryKey: ['reels'] });
      await queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });
}

