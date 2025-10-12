import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { deduplicateRequest } from '@/lib/requestDeduplication';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  professional_title: string | null;
  badge_level: string;
  region: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_website: boolean;
  career_score: number;
}

export const useOptimizedProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => deduplicateRequest(`profile-${userId}`, async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes - very aggressive
    gcTime: 60 * 60 * 1000,
  });
};

export const useOptimizedProfileData = (userId: string | null) => {
  const profile = useOptimizedProfile(userId);

  const posts = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => deduplicateRequest(`posts-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('posts')
        .select('id, content, media_urls, like_count, comment_count, view_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const reels = useQuery({
    queryKey: ['reels', userId],
    queryFn: () => deduplicateRequest(`reels-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('reels')
        .select('id, video_url, caption, like_count, comment_count, view_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const experiences = useQuery({
    queryKey: ['experiences', userId],
    queryFn: () => deduplicateRequest(`experiences-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const certifications = useQuery({
    queryKey: ['certifications', userId],
    queryFn: () => deduplicateRequest(`certifications-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const recognitions = useQuery({
    queryKey: ['recognitions', userId],
    queryFn: () => deduplicateRequest(`recognitions-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('recognitions')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const competitions = useQuery({
    queryKey: ['competitions', userId],
    queryFn: () => deduplicateRequest(`competitions-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('user_id', userId)
        .order('competition_date', { ascending: false });

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const stories = useQuery({
    queryKey: ['stories', userId],
    queryFn: () => deduplicateRequest(`stories-${userId}`, async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('stories')
        .select('id, media_urls, media_types, created_at, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(6);

      return data || [];
    }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes for stories
    gcTime: 10 * 60 * 1000,
  });

  const userRoles = useQuery({
    queryKey: ['userRoles', userId],
    queryFn: () => deduplicateRequest(`userRoles-${userId}`, async () => {
      if (!userId) return { isFounder: false, isVerified: false };
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      return {
        isFounder: data?.some(r => r.role === 'founder') || false,
        isVerified: data?.some(r => r.role === 'verified') || false,
      };
    }),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000, // 30 minutes for roles
    gcTime: 60 * 60 * 1000,
  });

  return {
    profile: profile.data,
    posts: posts.data || [],
    reels: reels.data || [],
    experiences: experiences.data || [],
    certifications: certifications.data || [],
    recognitions: recognitions.data || [],
    competitions: competitions.data || [],
    stories: stories.data || [],
    userRoles: userRoles.data || { isFounder: false, isVerified: false },
    isLoading: profile.isLoading || posts.isLoading || reels.isLoading || competitions.isLoading,
    refetchAll: () => {
      profile.refetch();
      posts.refetch();
      reels.refetch();
      experiences.refetch();
      certifications.refetch();
      recognitions.refetch();
      competitions.refetch();
      stories.refetch();
      userRoles.refetch();
    },
  };
};
