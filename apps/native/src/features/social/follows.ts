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

export function useFollowingIds(userId?: string) {
  return useQuery({
    queryKey: ['following', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as string[];
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (error) throw error;
      return (data ?? []).map((f: any) => f.following_id as string);
    },
    staleTime: 60_000,
  });
}

export function useFollowerIds(userId?: string) {
  return useQuery({
    queryKey: ['followers', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as string[];
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (error) throw error;
      return (data ?? []).map((f: any) => f.follower_id as string);
    },
    staleTime: 60_000,
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['follows', 'isFollowing', vars.followerId, vars.followingId] }),
        queryClient.invalidateQueries({ queryKey: ['following', vars.followerId] }),
        queryClient.invalidateQueries({ queryKey: ['followers', vars.followingId] }),
        queryClient.invalidateQueries({ queryKey: ['profile', vars.followingId] }),
      ]);
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['follows', 'isFollowing', vars.followerId, vars.followingId] }),
        queryClient.invalidateQueries({ queryKey: ['following', vars.followerId] }),
        queryClient.invalidateQueries({ queryKey: ['followers', vars.followingId] }),
        queryClient.invalidateQueries({ queryKey: ['profile', vars.followingId] }),
      ]);
    },
  });
}

// Get following users with profiles
export function useFollowingProfiles(userId?: string) {
  return useQuery({
    queryKey: ['following-profiles', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (id, username, full_name, avatar_url, professional_title)
        `)
        .eq('follower_id', userId)
        .limit(100);

      if (error) throw error;
      return (data ?? []).map((f: any) => f.profiles).filter(Boolean);
    },
  });
}

// Get follower users with profiles
export function useFollowerProfiles(userId?: string) {
  return useQuery({
    queryKey: ['follower-profiles', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles:follower_id (id, username, full_name, avatar_url, professional_title)
        `)
        .eq('following_id', userId)
        .limit(100);

      if (error) throw error;
      return (data ?? []).map((f: any) => f.profiles).filter(Boolean);
    },
  });
}

