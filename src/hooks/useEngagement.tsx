import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkRateLimit } from '@/lib/rateLimit';

type ContentType = 'post' | 'reel' | 'event' | 'story';

interface EngagementState {
  likedIds: Set<string>;
  savedIds: Set<string>;
  repostedIds: Set<string>;
}

interface EngagementConfig {
  likesTable: string;
  savesTable: string | null;
  repostsTable: string | null;
  idColumn: string;
}

const CONFIGS: Record<ContentType, EngagementConfig> = {
  post: {
    likesTable: 'post_likes',
    savesTable: 'post_saves',
    repostsTable: 'post_reposts',
    idColumn: 'post_id',
  },
  reel: {
    likesTable: 'reel_likes',
    savesTable: 'reel_saves',
    repostsTable: 'reel_reposts',
    idColumn: 'reel_id',
  },
  event: {
    likesTable: 'event_likes',
    savesTable: null,
    repostsTable: null,
    idColumn: 'event_id',
  },
  story: {
    likesTable: 'status_likes',
    savesTable: null,
    repostsTable: null,
    idColumn: 'status_id',
  },
};

// Module-level engagement cache for instant loading
const engagementCache: Map<string, { state: EngagementState; timestamp: number }> = new Map();
const ENGAGEMENT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Unified engagement hook - single source of truth for likes, saves, reposts
 * Uses refs to avoid stale closure issues
 */
export const useEngagement = (
  contentType: ContentType,
  userId: string | undefined,
  onCountChange?: (itemId: string, type: 'like' | 'save' | 'repost', delta: number) => void
) => {
  const config = CONFIGS[contentType];
  const cacheKey = `${userId}-${contentType}`;
  
  // Try to initialize from cache
  const cachedState = engagementCache.get(cacheKey);
  const initialState: EngagementState = cachedState && Date.now() - cachedState.timestamp < ENGAGEMENT_CACHE_TIME
    ? cachedState.state
    : { likedIds: new Set(), savedIds: new Set(), repostedIds: new Set() };
  
  // State for UI rendering
  const [state, setState] = useState<EngagementState>(initialState);
  
  // Refs for immediate access (avoids stale closures)
  const stateRef = useRef<EngagementState>(state);
  const processingRef = useRef({
    likes: new Set<string>(),
    saves: new Set<string>(),
    reposts: new Set<string>(),
  });
  // Timestamp-based debounce to prevent rapid clicks
  const lastActionRef = useRef<Map<string, number>>(new Map());
  const hasFetchedRef = useRef(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Fetch all engagement states in parallel (optimized)
  const fetchEngagement = useCallback(async () => {
    if (!userId) return;
    
    // Skip if already fetched in this session
    if (hasFetchedRef.current) return;
    
    // Check cache validity - skip network if valid
    const cached = engagementCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ENGAGEMENT_CACHE_TIME) {
      if (state.likedIds.size === 0 && cached.state.likedIds.size > 0) {
        setState(cached.state);
        stateRef.current = cached.state;
      }
      hasFetchedRef.current = true;
      return;
    }

    try {
      // Batch all queries in parallel for speed
      const queries = [
        supabase.from(config.likesTable as any).select(config.idColumn).eq('user_id', userId)
      ];
      
      if (config.savesTable) {
        queries.push(supabase.from(config.savesTable as any).select(config.idColumn).eq('user_id', userId));
      }
      if (config.repostsTable) {
        queries.push(supabase.from(config.repostsTable as any).select(config.idColumn).eq('user_id', userId));
      }

      const results = await Promise.all(queries);
      
      const likedItems = (results[0].data || []).map((item: any) => item[config.idColumn]);
      const savedItems = config.savesTable ? (results[1]?.data || []).map((item: any) => item[config.idColumn]) : [];
      const repostedItems = config.repostsTable ? (results[config.savesTable ? 2 : 1]?.data || []).map((item: any) => item[config.idColumn]) : [];

      const newState: EngagementState = {
        likedIds: new Set(likedItems),
        savedIds: new Set(savedItems),
        repostedIds: new Set(repostedItems),
      };

      // Update cache
      engagementCache.set(cacheKey, { state: newState, timestamp: Date.now() });
      hasFetchedRef.current = true;

      setState(newState);
      stateRef.current = newState;
    } catch (error) {
      console.error(`[ENGAGEMENT] Error fetching ${contentType} engagement:`, error);
    }
  }, [userId, config, contentType, cacheKey, state.likedIds.size]);

  // Fetch on mount/userId change - only once
  useEffect(() => {
    if (userId && !hasFetchedRef.current) {
      // Use requestIdleCallback for non-blocking fetch
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => fetchEngagement(), { timeout: 1000 });
      } else {
        setTimeout(() => fetchEngagement(), 100);
      }
    }
  }, [userId, contentType]);

  // Generic toggle function with optimistic updates
  const toggle = useCallback(async (
    itemId: string,
    type: 'like' | 'save' | 'repost',
    table: string
  ) => {
    if (!userId) {
      toast.error(`Please login to ${type}`);
      return;
    }

    // Rate limit check for scalability
    const rateLimitAction = type === 'like' ? 'like-action' : type === 'save' ? 'like-action' : 'like-action';
    const { allowed, retryAfter } = checkRateLimit(rateLimitAction, userId);
    if (!allowed) {
      const seconds = Math.ceil((retryAfter || 60000) / 1000);
      toast.error('Slow down!', { description: `Please wait ${seconds} seconds.` });
      return;
    }

    const processingSet = type === 'like' 
      ? processingRef.current.likes 
      : type === 'save' 
        ? processingRef.current.saves 
        : processingRef.current.reposts;

    const actionKey = `${type}-${itemId}`;
    const now = Date.now();
    const lastAction = lastActionRef.current.get(actionKey) || 0;
    
    // Prevent rapid clicks within 500ms
    if (now - lastAction < 500) {
      console.log(`[ENGAGEMENT] Blocked rapid ${type} on ${itemId}`);
      return;
    }

    // Prevent duplicate clicks while processing
    if (processingSet.has(itemId)) {
      console.log(`[ENGAGEMENT] Blocked duplicate ${type} on ${itemId} - already processing`);
      return;
    }
    
    // Mark timestamp immediately
    lastActionRef.current.set(actionKey, now);

    const stateKey = type === 'like' ? 'likedIds' : type === 'save' ? 'savedIds' : 'repostedIds';
    const wasActive = stateRef.current[stateKey].has(itemId);

    // Mark as processing
    processingSet.add(itemId);

    // Optimistic state update
    setState(prev => {
      const newSet = new Set(prev[stateKey]);
      if (wasActive) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      const newState = { ...prev, [stateKey]: newSet };
      stateRef.current = newState;
      return newState;
    });

    // Optimistic count update
    onCountChange?.(itemId, type, wasActive ? -1 : 1);

    try {
      let duplicateNoOp = false;

      if (wasActive) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .eq(config.idColumn, itemId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table as any)
          .insert({ [config.idColumn]: itemId, user_id: userId });

        // If the row already exists (e.g. double-fire from UI), undo optimistic count.
        if (error) {
          if ((error as any).code === '23505') {
            duplicateNoOp = true;
            onCountChange?.(itemId, type, -1);
          } else {
            throw error;
          }
        }
      }

      // Show success toast for save/repost (but not for duplicate no-op)
      if (!duplicateNoOp) {
        if (type === 'save') {
          toast.success(wasActive ? 'Removed from saved' : 'Saved');
        } else if (type === 'repost') {
          toast.success(wasActive ? 'Repost removed' : 'Reposted');
        }
      }
    } catch (error) {
      console.error(`[ENGAGEMENT] Error toggling ${type}:`, error);
      toast.error(`Failed to ${type}`);

      // Revert state on error
      setState(prev => {
        const newSet = new Set(prev[stateKey]);
        if (wasActive) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        const newState = { ...prev, [stateKey]: newSet };
        stateRef.current = newState;
        return newState;
      });

      // Revert count
      onCountChange?.(itemId, type, wasActive ? 1 : -1);
    } finally {
      processingSet.delete(itemId);
      // Clean up old timestamps (older than 2 seconds)
      setTimeout(() => {
        lastActionRef.current.delete(`${type}-${itemId}`);
      }, 2000);
    }
  }, [userId, config, onCountChange]);

  // Specific toggle functions
  const toggleLike = useCallback((itemId: string) => {
    return toggle(itemId, 'like', config.likesTable);
  }, [toggle, config.likesTable]);

  const toggleSave = useCallback((itemId: string) => {
    return toggle(itemId, 'save', config.savesTable);
  }, [toggle, config.savesTable]);

  const toggleRepost = useCallback((itemId: string) => {
    return toggle(itemId, 'repost', config.repostsTable);
  }, [toggle, config.repostsTable]);

  // Check functions using current ref
  const isLiked = useCallback((itemId: string) => state.likedIds.has(itemId), [state.likedIds]);
  const isSaved = useCallback((itemId: string) => state.savedIds.has(itemId), [state.savedIds]);
  const isReposted = useCallback((itemId: string) => state.repostedIds.has(itemId), [state.repostedIds]);

  return {
    // State
    likedIds: state.likedIds,
    savedIds: state.savedIds,
    repostedIds: state.repostedIds,
    // Check functions
    isLiked,
    isSaved,
    isReposted,
    // Toggle functions
    toggleLike,
    toggleSave,
    toggleRepost,
    // Refresh
    fetchEngagement,
  };
};
