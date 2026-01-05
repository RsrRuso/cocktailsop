import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export function useLikeIds(userId?: string) {
  return useQuery({
    queryKey: ['likes', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { postIds: [] as string[], reelIds: [] as string[] };
      const [postsRes, reelsRes] = await Promise.all([
        supabase.from('post_likes').select('post_id').eq('user_id', userId),
        supabase.from('reel_likes').select('reel_id').eq('user_id', userId),
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

function bumpHomeFeedLike(itemType: 'post' | 'reel', itemId: string, delta: number) {
  queryClient.setQueriesData({ queryKey: ['home-feed'] }, (old: any) => {
    if (!Array.isArray(old)) return old;
    return old.map((it) => {
      if (it?.type !== itemType) return it;
      if (it?.id !== itemId) return it;
      return { ...it, like_count: Math.max(0, (it.like_count ?? 0) + delta) };
    });
  });
}

function bumpReelsLike(reelId: string, delta: number) {
  queryClient.setQueryData(['reels'], (old: any) => {
    if (!Array.isArray(old)) return old;
    return old.map((r) => (r?.id === reelId ? { ...r, like_count: Math.max(0, (r.like_count ?? 0) + delta) } : r));
  });
}

function bumpPostDetailLike(postId: string, delta: number) {
  queryClient.setQueryData(['post', postId], (old: any) => {
    if (!old) return old;
    return { ...old, like_count: Math.max(0, (old.like_count ?? 0) + delta) };
  });
}

export function useTogglePostLike(userId?: string) {
  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (isLiked) {
        const res = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
        if (res.error && res.error.code !== '23505') throw res.error;
      }
      return { postId, isLiked };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['likes', userId] });
      const prev = queryClient.getQueryData(['likes', userId]) as any;
      const delta = vars.isLiked ? -1 : 1;

      queryClient.setQueryData(['likes', userId], (old: any) => {
        if (!old) return old;
        const postIds = new Set<string>(old.postIds ?? []);
        if (vars.isLiked) postIds.delete(vars.postId);
        else postIds.add(vars.postId);
        return { ...old, postIds: Array.from(postIds) };
      });

      bumpHomeFeedLike('post', vars.postId, delta);
      bumpPostDetailLike(vars.postId, delta);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['likes', userId], ctx.prev);
      // Re-fetch counts from server if we got out of sync
      queryClient.invalidateQueries({ queryKey: ['home-feed'] }).catch(() => {});
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['likes', userId] });
    },
  });
}

export function useToggleReelLike(userId?: string) {
  return useMutation({
    mutationFn: async ({ reelId, isLiked }: { reelId: string; isLiked: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (isLiked) {
        const res = await supabase.from('reel_likes').delete().eq('reel_id', reelId).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: userId });
        if (res.error && res.error.code !== '23505') throw res.error;
      }
      return { reelId, isLiked };
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['likes', userId] });
      const prev = queryClient.getQueryData(['likes', userId]) as any;
      const delta = vars.isLiked ? -1 : 1;

      queryClient.setQueryData(['likes', userId], (old: any) => {
        if (!old) return old;
        const reelIds = new Set<string>(old.reelIds ?? []);
        if (vars.isLiked) reelIds.delete(vars.reelId);
        else reelIds.add(vars.reelId);
        return { ...old, reelIds: Array.from(reelIds) };
      });

      bumpHomeFeedLike('reel', vars.reelId, delta);
      bumpReelsLike(vars.reelId, delta);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['likes', userId], ctx.prev);
      queryClient.invalidateQueries({ queryKey: ['reels'] }).catch(() => {});
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['likes', userId] });
    },
  });
}

