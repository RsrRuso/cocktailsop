import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HistoryEvent {
  id: string;
  draft_id: string | null;
  post_id: string | null;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
}

const EVENT_ICONS: Record<string, string> = {
  DRAFT_CREATED: '📝',
  UPLOAD_STARTED: '⬆️',
  UPLOAD_COMPLETED: '✅',
  PROCESSING_STARTED: '⚙️',
  PROCESSING_READY: '🎬',
  PROCESSING_FAILED: '❌',
  SOFT_EDIT: '✏️',
  HARD_EDIT: '🔄',
  SCHEDULED: '📅',
  PUBLISHED: '🚀',
  ARCHIVED: '📦',
  APPROVAL_REQUESTED: '📩',
  APPROVED: '✅',
  REJECTED: '❌',
  CHANGES_REQUESTED: '🔧',
  ROLLBACK: '⏪',
  MODERATION_FLAG: '🚩',
  MODERATION_CLEAR: '✅',
};

const EVENT_LABELS: Record<string, string> = {
  DRAFT_CREATED: 'Draft created',
  UPLOAD_STARTED: 'Upload started',
  UPLOAD_COMPLETED: 'Upload completed',
  PROCESSING_STARTED: 'Processing started',
  PROCESSING_READY: 'Processing complete',
  PROCESSING_FAILED: 'Processing failed',
  SOFT_EDIT: 'Content edited',
  HARD_EDIT: 'Media replaced',
  SCHEDULED: 'Scheduled for publishing',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
  APPROVAL_REQUESTED: 'Sent for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CHANGES_REQUESTED: 'Changes requested',
  ROLLBACK: 'Rolled back to previous version',
  MODERATION_FLAG: 'Flagged for moderation',
  MODERATION_CLEAR: 'Cleared by moderation',
};

export function useHistoryEvents(options: { draftId?: string; postId?: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadEvents();
  }, [options.draftId, options.postId, user]);

  const loadEvents = async () => {
    setLoading(true);
    
    let query = supabase
      .from('history_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.draftId) {
      query = query.eq('draft_id', options.draftId);
    }
    if (options.postId) {
      query = query.eq('post_id', options.postId);
    }

    const { data, error } = await query.limit(100);

    if (!error && data) {
      setEvents(data.map(e => ({
        ...e,
        event_data: (e.event_data as Record<string, any>) || {},
      })));
    }
    setLoading(false);
  };

  const logEvent = async (
    eventType: string, 
    eventData: Record<string, any> = {},
    targetDraftId?: string,
    targetPostId?: string
  ) => {
    if (!user) return;

    const { error } = await supabase.from('history_events').insert({
      draft_id: targetDraftId || options.draftId,
      post_id: targetPostId || options.postId,
      user_id: user.id,
      event_type: eventType,
      event_data: eventData,
    });

    if (!error) {
      loadEvents();
    }
  };

  const getEventIcon = (type: string) => EVENT_ICONS[type] || '📌';
  const getEventLabel = (type: string) => EVENT_LABELS[type] || type;

  return {
    events,
    loading,
    logEvent,
    reload: loadEvents,
    getEventIcon,
    getEventLabel,
  };
}
