import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export function useRepostIds(userId?: string) {
  return useQuery({
    queryKey: ['reposts', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { postIds: [] as string[], reelIds: [] as string[] };
      const [postsRes, reelsRes] = await Promise.all([
        supabase.from('post_reposts').select('post_id').eq('user_id', userId),
        supabase.from('reel_reposts').select('reel_id').eq('user_id', userId),
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

export function useTogglePostRepost(userId?: string) {
  return useMutation({
    mutationFn: async ({ postId, isReposted }: { postId: string; isReposted: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (isReposted) {
        const res = await supabase.from('post_reposts').delete().eq('post_id', postId).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('post_reposts').insert({ post_id: postId, user_id: userId });
        if (res.error && res.error.code !== '23505') throw res.error;
      }
      return { postId, isReposted };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['reposts', userId] });
      const prev = queryClient.getQueryData(['reposts', userId]) as any;

      queryClient.setQueryData(['reposts', userId], (old: any) => {
        if (!old) return old;
        const postIds = new Set<string>(old.postIds ?? []);
        if (vars.isReposted) postIds.delete(vars.postId);
        else postIds.add(vars.postId);
        return { ...old, postIds: Array.from(postIds) };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['reposts', userId], ctx.prev);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reposts', userId] });
    },
  });
}

export function useToggleReelRepost(userId?: string) {
  return useMutation({
    mutationFn: async ({ reelId, isReposted }: { reelId: string; isReposted: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (isReposted) {
        const res = await supabase.from('reel_reposts').delete().eq('reel_id', reelId).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('reel_reposts').insert({ reel_id: reelId, user_id: userId });
        if (res.error && res.error.code !== '23505') throw res.error;
      }
      return { reelId, isReposted };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['reposts', userId] });
      const prev = queryClient.getQueryData(['reposts', userId]) as any;

      queryClient.setQueryData(['reposts', userId], (old: any) => {
        if (!old) return old;
        const reelIds = new Set<string>(old.reelIds ?? []);
        if (vars.isReposted) reelIds.delete(vars.reelId);
        else reelIds.add(vars.reelId);
        return { ...old, reelIds: Array.from(reelIds) };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['reposts', userId], ctx.prev);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reposts', userId] });
    },
  });
}
