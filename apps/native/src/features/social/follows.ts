import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';

export function useIsFollowing({
  followerId,
  followingId,
}: {
  followerId?: string;
  followingId?: string;
}) {
  return useQuery({
    queryKey: ['follows', 'isFollowing', followerId, followingId],
    enabled: !!followerId && !!followingId,
    queryFn: async () => {
      if (!followerId || !followingId) return false;
      const res = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();
      if (res.error) throw res.error;
      return !!res.data;
    },
  });
}

export function useFollow() {
  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      const res = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId })
        .select('follower_id')
        .single();
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['follows', 'isFollowing', vars.followerId, vars.followingId] });
    },
  });
}

export function useUnfollow() {
  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      const res = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['follows', 'isFollowing', vars.followerId, vars.followingId] });
    },
  });
}

