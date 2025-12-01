import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StoryEngagementState {
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isProcessing: boolean;
}

export function useAdvancedStoryEngagement(storyId: string, initialState?: Partial<StoryEngagementState>) {
  const [state, setState] = useState<StoryEngagementState>({
    isLiked: initialState?.isLiked ?? false,
    likeCount: initialState?.likeCount ?? 0,
    commentCount: initialState?.commentCount ?? 0,
    viewCount: initialState?.viewCount ?? 0,
    isProcessing: false,
  });

  const processingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Real-time sync for story engagement updates
  useEffect(() => {
    if (!storyId) return;

    const channel = supabase
      .channel(`story-engagement-${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${storyId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setState(prev => ({
            ...prev,
            likeCount: newData.like_count ?? prev.likeCount,
            commentCount: newData.comment_count ?? prev.commentCount,
            viewCount: newData.view_count ?? prev.viewCount,
          }));
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [storyId]);

  // Advanced like/unlike with optimistic updates and rollback
  const toggleLike = useCallback(async () => {
    if (processingRef.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to like stories');
      return;
    }

    // Prevent rapid duplicate requests
    processingRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true }));

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Optimistic update
    const previousState = { ...state };
    const willLike = !state.isLiked;
    
    setState(prev => ({
      ...prev,
      isLiked: willLike,
      likeCount: prev.likeCount + (willLike ? 1 : -1),
    }));

    try {
      if (willLike) {
        // Check if already liked (prevent duplicates)
        const { data: existing } = await supabase
          .from('story_likes')
          .select('id')
          .eq('story_id', storyId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          // Already liked - just update UI state
          setState(prev => ({ ...prev, isLiked: true, isProcessing: false }));
          processingRef.current = false;
          return;
        }

        // Insert like
        const { error: insertError } = await supabase
          .from('story_likes')
          .insert({ story_id: storyId, user_id: user.id });

        if (insertError) throw insertError;

        // Update count - fetch current, increment, and update
        const { data: storyData } = await supabase
          .from('stories')
          .select('like_count')
          .eq('id', storyId)
          .single();

        if (storyData) {
          await supabase
            .from('stories')
            .update({ like_count: (storyData.like_count || 0) + 1 })
            .eq('id', storyId);
        }

      } else {
        // Delete like
        const { error: deleteError } = await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Update count - fetch current, decrement, and update
        const { data: storyData } = await supabase
          .from('stories')
          .select('like_count')
          .eq('id', storyId)
          .single();

        if (storyData) {
          await supabase
            .from('stories')
            .update({ like_count: Math.max(0, (storyData.like_count || 0) - 1) })
            .eq('id', storyId);
        }
      }

      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error: any) {
      console.error('Like error:', error);
      
      // Rollback optimistic update
      setState(previousState);
      
      if (error.name !== 'AbortError') {
        toast.error('Failed to update like. Please try again.');
      }
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [storyId, state.isLiked]);

  // Add comment with optimistic count update
  const addComment = useCallback(async (content: string) => {
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to comment');
      return null;
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      commentCount: prev.commentCount + 1,
    }));

    try {
      const { data, error } = await supabase
        .from('story_comments')
        .insert({
          story_id: storyId,
          user_id: user.id,
          content: content.trim(),
        })
        .select('*, profiles(username, avatar_url)')
        .single();

      if (error) throw error;

      // Update comment count - fetch current, increment, and update
      const { data: storyData } = await supabase
        .from('stories')
        .select('comment_count')
        .eq('id', storyId)
        .single();

      if (storyData) {
        await supabase
          .from('stories')
          .update({ comment_count: (storyData.comment_count || 0) + 1 })
          .eq('id', storyId);
      }

      return data;
    } catch (error) {
      console.error('Comment error:', error);
      
      // Rollback
      setState(prev => ({
        ...prev,
        commentCount: Math.max(0, prev.commentCount - 1),
      }));
      
      toast.error('Failed to add comment. Please try again.');
      return null;
    }
  }, [storyId]);

  // Track view (idempotent)
  const trackView = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Check if already viewed
      const { data: existing } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) return; // Already viewed

      // Insert view
      await supabase
        .from('story_views')
        .insert({ story_id: storyId, user_id: user.id });

      // Update view count - fetch current, increment, and update
      const { data: storyData } = await supabase
        .from('stories')
        .select('view_count')
        .eq('id', storyId)
        .single();

      if (storyData) {
        await supabase
          .from('stories')
          .update({ view_count: (storyData.view_count || 0) + 1 })
          .eq('id', storyId);
      }

      setState(prev => ({
        ...prev,
        viewCount: prev.viewCount + 1,
      }));
    } catch (error) {
      console.error('View tracking error:', error);
      // Silent fail - views are not critical
    }
  }, [storyId]);

  // Check initial like status
  const checkLikeStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('story_likes')
      .select('id')
      .eq('story_id', storyId)
      .eq('user_id', user.id)
      .maybeSingle();

    setState(prev => ({
      ...prev,
      isLiked: !!data,
    }));
  }, [storyId]);

  return {
    ...state,
    toggleLike,
    addComment,
    trackView,
    checkLikeStatus,
  };
}
