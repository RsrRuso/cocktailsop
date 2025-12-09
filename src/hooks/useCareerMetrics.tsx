import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateCareerScore, CareerMetrics } from '@/lib/careerMetrics';

interface UseCareerMetricsResult {
  metrics: CareerMetrics;
  isLoading: boolean;
  refetch: () => void;
}

export const useCareerMetrics = (userId: string | null): UseCareerMetricsResult => {
  const queryClient = useQueryClient();

  // Fetch experiences
  const { data: experiences = [], refetch: refetchExperiences } = useQuery({
    queryKey: ['career-experiences', userId],
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
    staleTime: 1 * 60 * 1000, // 1 minute - shorter for live updates
  });

  // Fetch certifications
  const { data: certifications = [], refetch: refetchCertifications } = useQuery({
    queryKey: ['career-certifications', userId],
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
    staleTime: 1 * 60 * 1000,
  });

  // Fetch recognitions
  const { data: recognitions = [], refetch: refetchRecognitions } = useQuery({
    queryKey: ['career-recognitions', userId],
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
    staleTime: 1 * 60 * 1000,
  });

  // Fetch competitions
  const { data: competitions = [], refetch: refetchCompetitions } = useQuery({
    queryKey: ['career-competitions', userId],
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
    staleTime: 1 * 60 * 1000,
  });

  // Fetch exam certificates (count as additional certificates)
  const { data: examCertificates = [], refetch: refetchExamCerts } = useQuery({
    queryKey: ['career-exam-certificates', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('exam_certificates')
        .select('id, issued_at')
        .eq('user_id', userId);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`career-metrics-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_experiences',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetchExperiences();
          queryClient.invalidateQueries({ queryKey: ['experiences', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'certifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetchCertifications();
          queryClient.invalidateQueries({ queryKey: ['certifications', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recognitions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetchRecognitions();
          queryClient.invalidateQueries({ queryKey: ['recognitions', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'competitions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetchCompetitions();
          queryClient.invalidateQueries({ queryKey: ['competitions', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_certificates',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetchExamCerts();
          queryClient.invalidateQueries({ queryKey: ['exam-certificates', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, refetchExperiences, refetchCertifications, refetchRecognitions, refetchCompetitions, refetchExamCerts]);

  // Combine exam certificates with regular certifications for scoring
  const allCertifications = useMemo(() => {
    // Convert exam certificates to certification format for scoring
    const examCertsAsCerts = examCertificates.map(ec => ({
      id: ec.id,
      type: 'certificate',
      issue_date: ec.issued_at,
    }));
    return [...certifications, ...examCertsAsCerts];
  }, [certifications, examCertificates]);

  // Calculate metrics
  const metrics = useMemo(() => {
    return calculateCareerScore(
      experiences,
      allCertifications,
      recognitions,
      competitions
    );
  }, [experiences, allCertifications, recognitions, competitions]);

  // Update profile career score when metrics change
  useEffect(() => {
    if (!userId || metrics.rawScore === 0) return;

    const updateScore = async () => {
      await supabase
        .from('profiles')
        .update({ career_score: metrics.rawScore })
        .eq('id', userId);
    };

    const timeoutId = setTimeout(updateScore, 500);
    return () => clearTimeout(timeoutId);
  }, [userId, metrics.rawScore]);

  const refetch = () => {
    refetchExperiences();
    refetchCertifications();
    refetchRecognitions();
    refetchCompetitions();
    refetchExamCerts();
  };

  return {
    metrics,
    isLoading: false,
    refetch,
  };
};

export default useCareerMetrics;
