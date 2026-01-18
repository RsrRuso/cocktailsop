import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export function useSaveIds(userId?: string) {
  return useQuery({
    queryKey: ['saves', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { postIds: [] as string[], reelIds: [] as string[] };
      const [postsRes, reelsRes] = await Promise.all([
        supabase.from('post_saves').select('post_id').eq('user_id', userId),
        supabase.from('reel_saves').select('reel_id').eq('user_id', userId),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (reelsRes.error) throw reelsRes.error;
      return {
        postIds: (postsRes.data ?? []).map((r: any) => r.post_id as string),
        reelIds: (reelsRes.data ?? []).map((r: any) => r.reel_id as string),
      };
    },
    staleTime: 60_000,
  });
}

export function useTogglePostSave(userId?: string) {
  return useMutation({
    mutationFn: async ({ postId, isSaved }: { postId: string; isSaved: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (isSaved) {
        const res = await supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('post_saves').insert({ post_id: postId, user_id: userId });
        if (res.error && res.error.code !== '23505') throw res.error;
      }
      return { postId, isSaved };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['saves', userId] });
      const prev = queryClient.getQueryData(['saves', userId]) as any;

      queryClient.setQueryData(['saves', userId], (old: any) => {
        if (!old) return old;
        const postIds = new Set<string>(old.postIds ?? []);
        if (vars.isSaved) postIds.delete(vars.postId);
        else postIds.add(vars.postId);
        return { ...old, postIds: Array.from(postIds) };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['saves', userId], ctx.prev);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saves', userId] });
    },
  });
}

export function useToggleReelSave(userId?: string) {
  return useMutation({
    mutationFn: async ({ reelId, isSaved }: { reelId: string; isSaved: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (isSaved) {
        const res = await supabase.from('reel_saves').delete().eq('reel_id', reelId).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('reel_saves').insert({ reel_id: reelId, user_id: userId });
        if (res.error && res.error.code !== '23505') throw res.error;
      }
      return { reelId, isSaved };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['saves', userId] });
      const prev = queryClient.getQueryData(['saves', userId]) as any;

      queryClient.setQueryData(['saves', userId], (old: any) => {
        if (!old) return old;
        const reelIds = new Set<string>(old.reelIds ?? []);
        if (vars.isSaved) reelIds.delete(vars.reelId);
        else reelIds.add(vars.reelId);
        return { ...old, reelIds: Array.from(reelIds) };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['saves', userId], ctx.prev);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['saves', userId] });
    },
  });
}

// Get saved posts
export function useSavedPosts(userId?: string) {
  return useQuery({
    queryKey: ['saved-posts', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('post_saves')
        .select(`
          post_id,
          posts (
            id,
            content,
            media_urls,
            like_count,
            comment_count,
            created_at,
            user_id,
            profiles (id, username, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []).map((s: any) => s.posts).filter(Boolean);
    },
  });
}

// Get saved reels
export function useSavedReels(userId?: string) {
  return useQuery({
    queryKey: ['saved-reels', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('reel_saves')
        .select(`
          reel_id,
          reels (
            id,
            video_url,
            caption,
            like_count,
            comment_count,
            view_count,
            created_at,
            user_id,
            profiles (id, username, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []).map((s: any) => s.reels).filter(Boolean);
    },
  });
}
