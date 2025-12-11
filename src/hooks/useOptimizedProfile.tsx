import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  const { profile: authProfile, user } = useAuth();
  
  // Use auth profile as initial data if it's the current user
  const isCurrentUser = user?.id === userId;
  
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    // Use auth profile as placeholder for instant display
    placeholderData: isCurrentUser ? authProfile : undefined,
  });
};

export const useOptimizedProfileData = (userId: string | null) => {
  const profile = useOptimizedProfile(userId);

  const posts = useQuery({
    queryKey: ['posts', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('posts')
        .select('id, content, media_urls, like_count, comment_count, view_count, save_count, repost_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const reels = useQuery({
    queryKey: ['reels', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('reels')
        .select(`
          id, video_url, caption, like_count, comment_count, view_count, save_count, repost_count, created_at,
          music_url, music_track_id, mute_original_audio,
          music_tracks:music_track_id(title, preview_url, profiles:uploaded_by(username))
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const experiences = useQuery({
    queryKey: ['experiences', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('work_experiences')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const certifications = useQuery({
    queryKey: ['certifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const recognitions = useQuery({
    queryKey: ['recognitions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('recognitions')
        .select('*')
        .eq('user_id', userId)
        .order('issue_date', { ascending: false });

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const competitions = useQuery({
    queryKey: ['competitions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('competitions')
        .select('*')
        .eq('user_id', userId)
        .order('competition_date', { ascending: false });

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const examCertificates = useQuery({
    queryKey: ['exam-certificates', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('exam_certificates')
        .select('*, exam_categories(*), exam_badge_levels(*)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const stories = useQuery({
    queryKey: ['stories', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data } = await supabase
        .from('stories')
        .select('id, media_urls, media_types, created_at, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(6);

      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const userRoles = useQuery({
    queryKey: ['userRoles', userId],
    queryFn: async () => {
      if (!userId) return { isFounder: false, isVerified: false };
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      return {
        isFounder: data?.some(r => r.role === 'founder') || false,
        isVerified: data?.some(r => r.role === 'verified') || false,
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  return {
    profile: profile.data,
    posts: posts.data || [],
    reels: reels.data || [],
    experiences: experiences.data || [],
    certifications: certifications.data || [],
    recognitions: recognitions.data || [],
    competitions: competitions.data || [],
    examCertificates: examCertificates.data || [],
    stories: stories.data || [],
    userRoles: userRoles.data || { isFounder: false, isVerified: false },
    isLoading: profile.isLoading,
    refetchAll: () => {
      profile.refetch();
      posts.refetch();
      reels.refetch();
      experiences.refetch();
      certifications.refetch();
      recognitions.refetch();
      competitions.refetch();
      examCertificates.refetch();
      stories.refetch();
      userRoles.refetch();
    },
  };
};
