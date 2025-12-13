import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DraftData } from './useStudioDraft';

export function useStudioPublish() {
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Publish immediately
  const publishNow = async (draft: DraftData): Promise<string | null> => {
    if (!user) return null;
    
    setPublishing(true);
    try {
      // Create post based on draft type
      let postId: string | null = null;

      if (draft.draft_type === 'reel') {
        const { data, error } = await supabase
          .from('reels')
          .insert({
            user_id: user.id,
            video_url: draft.media_url,
            thumbnail_url: draft.thumbnail_url,
            caption: draft.caption,
            hashtags: draft.hashtags,
            mentions: draft.mentions,
            location: draft.location,
            visibility: draft.visibility,
          })
          .select()
          .single();

        if (error) throw error;
        postId = data.id;

      } else if (draft.draft_type === 'post') {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            image_url: draft.media_url,
            content: draft.caption,
            visibility: draft.visibility,
          })
          .select()
          .single();

        if (error) throw error;
        postId = data.id;

      } else if (draft.draft_type === 'story') {
        const { data, error } = await supabase
          .from('stories')
          .insert({
            user_id: user.id,
            media_url: draft.media_url,
            media_type: draft.media_url?.includes('video') ? 'video' : 'image',
            caption: draft.caption,
          })
          .select()
          .single();

        if (error) throw error;
        postId = data.id;
      }

      // Update draft status
      await supabase
        .from('studio_drafts')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', draft.id);

      // Log history event
      await supabase.from('history_events').insert({
        draft_id: draft.id,
        post_id: postId,
        user_id: user.id,
        event_type: 'PUBLISHED',
        event_data: { publishedAt: new Date().toISOString() },
      });

      toast.success('Published successfully!');
      return postId;

    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(error.message || 'Failed to publish');
      return null;
    } finally {
      setPublishing(false);
    }
  };

  // Schedule for later
  const schedulePublish = async (draft: DraftData, scheduledAt: Date): Promise<boolean> => {
    if (!user) return false;

    setScheduling(true);
    try {
      await supabase
        .from('studio_drafts')
        .update({ 
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
        })
        .eq('id', draft.id);

      // Log history event
      await supabase.from('history_events').insert({
        draft_id: draft.id,
        user_id: user.id,
        event_type: 'SCHEDULED',
        event_data: { scheduledAt: scheduledAt.toISOString() },
      });

      toast.success(`Scheduled for ${scheduledAt.toLocaleString()}`);
      return true;

    } catch (error: any) {
      toast.error('Failed to schedule');
      return false;
    } finally {
      setScheduling(false);
    }
  };

  // Submit for approval
  const submitForApproval = async (draft: DraftData, venueId?: string, teamId?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Create approval request
      const { error } = await supabase
        .from('studio_approval_requests')
        .insert({
          user_id: user.id,
          draft_id: draft.id,
          venue_id: venueId,
          team_id: teamId,
          status: 'pending',
        });

      if (error) throw error;

      // Update draft status
      await supabase
        .from('studio_drafts')
        .update({ status: 'pending_approval' })
        .eq('id', draft.id);

      // Log history event
      await supabase.from('history_events').insert({
        draft_id: draft.id,
        user_id: user.id,
        event_type: 'APPROVAL_REQUESTED',
        event_data: { venueId, teamId },
      });

      toast.success('Submitted for approval');
      return true;

    } catch (error: any) {
      toast.error('Failed to submit for approval');
      return false;
    }
  };

  return {
    publishNow,
    schedulePublish,
    submitForApproval,
    publishing,
    scheduling,
  };
}
