import { useCallback, useRef, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivitySession {
  sessionId: string;
  startTime: number;
  recipeStartTime: number | null;
  batchStartTime: number | null;
  groupId: string | null;
}

export interface ActivityStats {
  totalTimeSpent: number;
  avgRecipeCreationTime: number;
  avgBatchSubmissionTime: number;
  totalRecipesCreated: number;
  totalBatchesSubmitted: number;
  sessionsCount: number;
  fastestBatchTime: number;
  slowestBatchTime: number;
}

export const useBatchActivityTracker = (groupId?: string | null) => {
  const sessionRef = useRef<ActivitySession | null>(null);
  const pageEnterTime = useRef<number>(Date.now());
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        sessionRef.current = {
          sessionId: crypto.randomUUID(),
          startTime: Date.now(),
          recipeStartTime: null,
          batchStartTime: null,
          groupId: groupId || null
        };

        // Track page entry
        await logActivity('page_enter', 0, { timestamp: new Date().toISOString() });
      }
    };

    initSession();
    pageEnterTime.current = Date.now();

    // Track page exit
    return () => {
      const timeSpent = Math.round((Date.now() - pageEnterTime.current) / 1000);
      if (userId && sessionRef.current) {
        // Fire and forget - don't await
        logActivity('page_exit', timeSpent, { timestamp: new Date().toISOString() });
      }
    };
  }, [groupId]);

  // Update group when it changes
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.groupId = groupId || null;
    }
  }, [groupId]);

  const logActivity = useCallback(async (
    actionType: string,
    durationSeconds: number = 0,
    metadata: Record<string, any> = {}
  ) => {
    if (!userId || !sessionRef.current) return;

    try {
      await supabase.from('batch_calculator_activity').insert({
        user_id: userId,
        group_id: sessionRef.current.groupId,
        session_id: sessionRef.current.sessionId,
        action_type: actionType,
        duration_seconds: durationSeconds,
        metadata
      });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  }, [userId]);

  // Recipe tracking
  const startRecipeCreation = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.recipeStartTime = Date.now();
      logActivity('recipe_start', 0, { timestamp: new Date().toISOString() });
    }
  }, [logActivity]);

  const completeRecipeCreation = useCallback((recipeName: string) => {
    if (sessionRef.current?.recipeStartTime) {
      const duration = Math.round((Date.now() - sessionRef.current.recipeStartTime) / 1000);
      logActivity('recipe_complete', duration, { recipe_name: recipeName });
      sessionRef.current.recipeStartTime = null;
    }
  }, [logActivity]);

  // Batch tracking - starts when user inputs liters/servings
  const startBatchInput = useCallback((recipeName: string) => {
    if (sessionRef.current) {
      sessionRef.current.batchStartTime = Date.now();
      logActivity('batch_input_start', 0, { 
        recipe_name: recipeName,
        timestamp: new Date().toISOString()
      });
    }
  }, [logActivity]);

  const completeBatchSubmission = useCallback((batchName: string, targetServes: number, targetLiters: number) => {
    if (sessionRef.current?.batchStartTime) {
      const duration = Math.round((Date.now() - sessionRef.current.batchStartTime) / 1000);
      logActivity('batch_submit', duration, { 
        batch_name: batchName,
        target_serves: targetServes,
        target_liters: targetLiters,
        mixing_time_seconds: duration
      });
      sessionRef.current.batchStartTime = null;
    }
  }, [logActivity]);

  // Track recipe selection
  const trackRecipeSelect = useCallback((recipeName: string) => {
    logActivity('recipe_select', 0, { recipe_name: recipeName });
  }, [logActivity]);

  // Track tab navigation
  const trackTabChange = useCallback((tabName: string) => {
    logActivity('tab_change', 0, { tab: tabName });
  }, [logActivity]);

  // Track QR code scans
  const trackQrScan = useCallback((qrCodeId: string) => {
    logActivity('qr_scan', 0, { qr_code_id: qrCodeId });
  }, [logActivity]);

  // Track print actions
  const trackPrint = useCallback((type: string, itemName: string) => {
    logActivity('print_action', 0, { type, item_name: itemName });
  }, [logActivity]);

  return {
    startRecipeCreation,
    completeRecipeCreation,
    startBatchInput,
    completeBatchSubmission,
    trackRecipeSelect,
    trackTabChange,
    trackQrScan,
    trackPrint,
    logActivity,
    sessionId: sessionRef.current?.sessionId
  };
};

// Hook to fetch activity stats
export const useBatchActivityStats = (groupId?: string | null) => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('batch_calculator_activity')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupId) {
        query = query.eq('group_id', groupId);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      if (data) {
        // Calculate stats
        const pageExits = data.filter(a => a.action_type === 'page_exit');
        const totalTimeSpent = pageExits.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);

        const recipeCompletes = data.filter(a => a.action_type === 'recipe_complete');
        const avgRecipeTime = recipeCompletes.length > 0
          ? Math.round(recipeCompletes.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / recipeCompletes.length)
          : 0;

        const batchSubmits = data.filter(a => a.action_type === 'batch_submit');
        const avgBatchTime = batchSubmits.length > 0
          ? Math.round(batchSubmits.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / batchSubmits.length)
          : 0;

        const batchTimes = batchSubmits.map(a => a.duration_seconds || 0).filter(t => t > 0);
        const fastestBatch = batchTimes.length > 0 ? Math.min(...batchTimes) : 0;
        const slowestBatch = batchTimes.length > 0 ? Math.max(...batchTimes) : 0;

        const uniqueSessions = new Set(data.map(a => a.session_id)).size;

        setStats({
          totalTimeSpent,
          avgRecipeCreationTime: avgRecipeTime,
          avgBatchSubmissionTime: avgBatchTime,
          totalRecipesCreated: recipeCompletes.length,
          totalBatchesSubmitted: batchSubmits.length,
          sessionsCount: uniqueSessions,
          fastestBatchTime: fastestBatch,
          slowestBatchTime: slowestBatch
        });

        // Recent activity (last 20 meaningful actions)
        const meaningful = data.filter(a => 
          ['recipe_complete', 'batch_submit', 'qr_scan', 'print_action'].includes(a.action_type)
        ).slice(0, 20);
        setRecentActivity(meaningful);
      }
    } catch (e) {
      console.error('Failed to fetch activity stats:', e);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, recentActivity, isLoading, refetch: fetchStats };
};
