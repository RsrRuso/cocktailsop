import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  
  // State for UI rendering
  const [state, setState] = useState<EngagementState>({
    likedIds: new Set(),
    savedIds: new Set(),
    repostedIds: new Set(),
  });
  
  // Refs for immediate access (avoids stale closures)
  const stateRef = useRef<EngagementState>(state);
  const processingRef = useRef({
    likes: new Set<string>(),
    saves: new Set<string>(),
    reposts: new Set<string>(),
  });
  
  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Fetch all engagement states in parallel
  const fetchEngagement = useCallback(async () => {
    if (!userId) return;

    try {
      // Always fetch likes
      const likesRes = await supabase
        .from(config.likesTable as any)
        .select(config.idColumn)
        .eq('user_id', userId);
      
      // Only fetch saves/reposts if tables exist for this content type
      let savesRes = { data: [] as any[] };
      let repostsRes = { data: [] as any[] };
      
      if (config.savesTable) {
        savesRes = await supabase
          .from(config.savesTable as any)
          .select(config.idColumn)
          .eq('user_id', userId);
      }
      
      if (config.repostsTable) {
        repostsRes = await supabase
          .from(config.repostsTable as any)
          .select(config.idColumn)
          .eq('user_id', userId);
      }

      const newState: EngagementState = {
        likedIds: new Set(
          (likesRes.data as any[] || []).map(item => item[config.idColumn])
        ),
        savedIds: new Set(
          (savesRes.data as any[] || []).map(item => item[config.idColumn])
        ),
        repostedIds: new Set(
          (repostsRes.data as any[] || []).map(item => item[config.idColumn])
        ),
      };

      setState(newState);
      stateRef.current = newState;
    } catch (error) {
      console.error(`[ENGAGEMENT] Error fetching ${contentType} engagement:`, error);
    }
  }, [userId, config, contentType]);

  // Fetch on mount/userId change
  useEffect(() => {
    if (userId) {
      fetchEngagement();
    }
  }, [userId, fetchEngagement]);

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

    const processingSet = type === 'like' 
      ? processingRef.current.likes 
      : type === 'save' 
        ? processingRef.current.saves 
        : processingRef.current.reposts;

    // Prevent duplicate clicks
    if (processingSet.has(itemId)) {
      return;
    }

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
        // Ignore duplicate key error
        if (error && error.code !== '23505') throw error;
      }
      
      // Show success toast for save/repost
      if (type === 'save') {
        toast.success(wasActive ? 'Removed from saved' : 'Saved');
      } else if (type === 'repost') {
        toast.success(wasActive ? 'Repost removed' : 'Reposted');
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
