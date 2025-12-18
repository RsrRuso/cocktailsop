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
  const userIdRef = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store batch start time independently to avoid race conditions
  const batchStartTimeRef = useRef<number | null>(null);
  const batchRecipeNameRef = useRef<string>('');

  // Log activity function - uses ref for userId to avoid stale closures
  const logActivity = useCallback(async (
    actionType: string,
    durationSeconds: number = 0,
    metadata: Record<string, any> = {}
  ) => {
    const currentUserId = userIdRef.current;
    if (!currentUserId || !sessionRef.current) {
      console.log('Cannot log activity - session not initialized', { actionType, currentUserId, session: sessionRef.current });
      return;
    }

    try {
      const { error } = await supabase.from('batch_calculator_activity').insert({
        user_id: currentUserId,
        group_id: sessionRef.current.groupId,
        session_id: sessionRef.current.sessionId,
        action_type: actionType,
        duration_seconds: durationSeconds,
        metadata
      });
      
      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userIdRef.current = user.id;
        setUserId(user.id);
        sessionRef.current = {
          sessionId: crypto.randomUUID(),
          startTime: Date.now(),
          recipeStartTime: null,
          batchStartTime: null,
          groupId: groupId || null
        };
        setIsInitialized(true);

        // Track page entry
        await logActivity('page_enter', 0, { timestamp: new Date().toISOString() });
      }
    };

    initSession();
    pageEnterTime.current = Date.now();

    // Track page exit - use beforeunload for reliable tracking
    const handlePageExit = () => {
      const timeSpent = Math.round((Date.now() - pageEnterTime.current) / 1000);
      if (userIdRef.current && sessionRef.current) {
        // Use sendBeacon for reliable exit tracking
        const payload = JSON.stringify({
          user_id: userIdRef.current,
          group_id: sessionRef.current.groupId,
          session_id: sessionRef.current.sessionId,
          action_type: 'page_exit',
          duration_seconds: timeSpent,
          metadata: { timestamp: new Date().toISOString() }
        });
        
        // Try to log via fetch with keepalive
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/batch_calculator_activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handlePageExit);
    
    return () => {
      window.removeEventListener('beforeunload', handlePageExit);
      handlePageExit(); // Also track when component unmounts
    };
  }, [groupId, logActivity]);

  // Update group when it changes
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.groupId = groupId || null;
    }
  }, [groupId]);

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
  // Uses independent ref to avoid race conditions with session initialization
  const startBatchInput = useCallback((recipeName: string) => {
    console.log('startBatchInput called:', { recipeName, isInitialized, hasSession: !!sessionRef.current });
    
    // Always set the start time, regardless of session state
    batchStartTimeRef.current = Date.now();
    batchRecipeNameRef.current = recipeName;
    
    // Also update session if available
    if (sessionRef.current) {
      sessionRef.current.batchStartTime = Date.now();
    }
    
    // Always log the event (not conditional on isInitialized)
    logActivity('batch_input_start', 0, { 
      recipe_name: recipeName,
      timestamp: new Date().toISOString()
    });
  }, [logActivity, isInitialized]);

  const completeBatchSubmission = useCallback((batchName: string, targetServes: number, targetLiters: number) => {
    // Use the independent ref for timing (more reliable)
    const startTime = batchStartTimeRef.current || sessionRef.current?.batchStartTime;
    
    console.log('completeBatchSubmission called:', { 
      batchName, 
      startTime, 
      batchStartTimeRef: batchStartTimeRef.current,
      sessionBatchStartTime: sessionRef.current?.batchStartTime 
    });
    
    if (startTime) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log('Logging batch_submit with duration:', duration);
      
      logActivity('batch_submit', duration, { 
        batch_name: batchName,
        target_serves: targetServes,
        target_liters: targetLiters,
        mixing_time_seconds: duration
      });
      
      // Reset timing refs
      batchStartTimeRef.current = null;
      batchRecipeNameRef.current = '';
      if (sessionRef.current) {
        sessionRef.current.batchStartTime = null;
      }
    } else {
      console.log('No start time recorded - logging without duration');
      // No start time recorded - log without duration
      logActivity('batch_submit', 0, { 
        batch_name: batchName,
        target_serves: targetServes,
        target_liters: targetLiters,
        note: 'No start time recorded'
      });
    }
  }, [logActivity]);

  // Reset batch timing (when recipe changes)
  const resetBatchTiming = useCallback(() => {
    batchStartTimeRef.current = null;
    batchRecipeNameRef.current = '';
    if (sessionRef.current) {
      sessionRef.current.batchStartTime = null;
    }
  }, []);

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

  // Track batch deletion
  const trackBatchDelete = useCallback(async (batchName: string, recipeName: string) => {
    console.log('trackBatchDelete called:', { batchName, recipeName, userId: userIdRef.current, groupId: sessionRef.current?.groupId });
    await logActivity('batch_delete', 0, { 
      batch_name: batchName, 
      recipe_name: recipeName,
      timestamp: new Date().toISOString() 
    });
    console.log('trackBatchDelete completed');
  }, [logActivity]);

  // Track recipe edit
  const trackRecipeEdit = useCallback(async (recipeName: string, changes?: string) => {
    console.log('trackRecipeEdit called:', { recipeName, changes, userId: userIdRef.current, groupId: sessionRef.current?.groupId });
    await logActivity('recipe_edit', 0, { 
      recipe_name: recipeName, 
      changes,
      timestamp: new Date().toISOString() 
    });
    console.log('trackRecipeEdit completed');
  }, [logActivity]);

  // Track recipe deletion
  const trackRecipeDelete = useCallback(async (recipeName: string) => {
    console.log('trackRecipeDelete called:', { recipeName, userId: userIdRef.current, groupId: sessionRef.current?.groupId });
    await logActivity('recipe_delete', 0, { 
      recipe_name: recipeName,
      timestamp: new Date().toISOString() 
    });
    console.log('trackRecipeDelete completed');
  }, [logActivity]);

  return {
    startRecipeCreation,
    completeRecipeCreation,
    startBatchInput,
    completeBatchSubmission,
    resetBatchTiming,
    trackRecipeSelect,
    trackTabChange,
    trackQrScan,
    trackPrint,
    trackBatchDelete,
    trackRecipeEdit,
    trackRecipeDelete,
    logActivity,
    sessionId: sessionRef.current?.sessionId,
    isInitialized
  };
};

// Hook to fetch activity stats - includes both activity log AND batch_productions
export const useBatchActivityStats = (groupId?: string | null) => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch activity log data
      let activityQuery = supabase
        .from('batch_calculator_activity')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupId) {
        activityQuery = activityQuery.eq('group_id', groupId);
      } else {
        activityQuery = activityQuery.eq('user_id', user.id);
      }

      const { data: activityData, error: activityError } = await activityQuery.limit(500);
      if (activityError) throw activityError;

      // Fetch batch_productions for historical data (actual submissions)
      let productionsQuery = supabase
        .from('batch_productions')
        .select('id, batch_name, recipe_id, target_serves, target_liters, produced_by_name, produced_by_email, produced_by_user_id, created_at, group_id')
        .order('created_at', { ascending: false });

      if (groupId) {
        productionsQuery = productionsQuery.eq('group_id', groupId);
      } else {
        productionsQuery = productionsQuery.eq('user_id', user.id);
      }

      const { data: productionsData, error: productionsError } = await productionsQuery.limit(100);
      if (productionsError) throw productionsError;

      // Fetch batch_recipes for recipe creation count
      let recipesQuery = supabase
        .from('batch_recipes')
        .select('id, recipe_name, created_at, user_id')
        .order('created_at', { ascending: false });

      if (groupId) {
        recipesQuery = recipesQuery.eq('group_id', groupId);
      } else {
        recipesQuery = recipesQuery.eq('user_id', user.id);
      }

      const { data: recipesData, error: recipesError } = await recipesQuery.limit(100);
      if (recipesError) throw recipesError;

      // Calculate stats from activity data
      const pageExits = (activityData || []).filter(a => a.action_type === 'page_exit');
      const totalTimeSpent = pageExits.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);

      const recipeCompletes = (activityData || []).filter(a => a.action_type === 'recipe_complete');
      const avgRecipeTime = recipeCompletes.length > 0
        ? Math.round(recipeCompletes.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / recipeCompletes.length)
        : 0;

      // Get batch submit events with actual duration > 0
      const batchSubmits = (activityData || []).filter(a => 
        a.action_type === 'batch_submit' && (a.duration_seconds || 0) > 0
      );
      
      const avgBatchTime = batchSubmits.length > 0
        ? Math.round(batchSubmits.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / batchSubmits.length)
        : 0;

      const batchTimes = batchSubmits.map(a => a.duration_seconds || 0).filter(t => t > 0);
      const fastestBatch = batchTimes.length > 0 ? Math.min(...batchTimes) : 0;
      const slowestBatch = batchTimes.length > 0 ? Math.max(...batchTimes) : 0;

      const uniqueSessions = new Set((activityData || []).map(a => a.session_id)).size;

      // Use ACTUAL production counts from batch_productions table
      const totalBatchesSubmitted = productionsData?.length || 0;
      const totalRecipesCreated = recipesData?.length || 0;

      setStats({
        totalTimeSpent,
        avgRecipeCreationTime: avgRecipeTime,
        avgBatchSubmissionTime: avgBatchTime,
        totalRecipesCreated,
        totalBatchesSubmitted,
        sessionsCount: uniqueSessions || 1,
        fastestBatchTime: fastestBatch,
        slowestBatchTime: slowestBatch
      });

      // Combine recent activity: batch_productions as "submissions" + activity log meaningful actions
      const productionActivities = (productionsData || []).map(p => ({
        id: p.id,
        action_type: 'batch_submit',
        created_at: p.created_at,
        user_id: p.produced_by_user_id,
        duration_seconds: null,
        metadata: {
          batch_name: p.batch_name,
          target_serves: p.target_serves,
          target_liters: p.target_liters,
          produced_by_name: p.produced_by_name
        },
        is_production: true
      }));

      const recipeActivities = (recipesData || []).map(r => ({
        id: r.id,
        action_type: 'recipe_complete',
        created_at: r.created_at,
        user_id: r.user_id,
        duration_seconds: null,
        metadata: {
          recipe_name: r.recipe_name
        },
        is_recipe: true
      }));

      // Include batch_submit with duration for activity display
      const batchSubmitLogs = (activityData || []).filter(a => 
        a.action_type === 'batch_submit' && (a.duration_seconds || 0) > 0
      );

      const meaningfulLogs = (activityData || []).filter(a => 
        ['qr_scan', 'print_action', 'batch_delete', 'recipe_edit', 'recipe_delete'].includes(a.action_type)
      );

      // Merge and sort by date
      const allActivity = [...productionActivities, ...recipeActivities, ...batchSubmitLogs, ...meaningfulLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);

      setRecentActivity(allActivity);
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
