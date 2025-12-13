import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DraftData {
  id: string;
  title: string;
  caption: string;
  draft_type: 'reel' | 'post' | 'story';
  media_url: string | null;
  thumbnail_url: string | null;
  metadata_json: Record<string, any>;
  status: string;
  hashtags: string[];
  mentions: string[];
  location: string | null;
  venue_id: string | null;
  visibility: 'public' | 'followers' | 'private';
  needs_approval: boolean;
}

export function useStudioDraft(draftId?: string) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<DraftData>>({});

  // Load draft
  useEffect(() => {
    if (!draftId || !user) {
      setLoading(false);
      return;
    }

    loadDraft();
  }, [draftId, user]);

  const loadDraft = async () => {
    if (!draftId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('studio_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error) {
      toast.error('Failed to load draft');
      console.error(error);
    } else if (data) {
      setDraft({
        id: data.id,
        title: data.caption?.slice(0, 50) || 'Untitled',
        caption: data.caption || '',
        draft_type: data.draft_type as 'reel' | 'post' | 'story',
        media_url: null,
        thumbnail_url: data.thumbnail_url,
        metadata_json: (data.metadata_json as Record<string, any>) || {},
        status: data.status || 'draft',
        hashtags: data.hashtags || [],
        mentions: data.mentions || [],
        location: data.location,
        venue_id: data.approval_venue_id,
        visibility: (data.visibility as 'public' | 'followers' | 'private') || 'public',
        needs_approval: data.needs_approval || false,
      });
    }
    setLoading(false);
  };

  // Create new draft
  const createDraft = async (type: 'reel' | 'post' | 'story'): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('studio_drafts')
      .insert({
        user_id: user.id,
        draft_type: type,
        title: `New ${type}`,
        status: 'draft',
        visibility: 'public',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create draft');
      return null;
    }

    // Log history event
    await supabase.from('history_events').insert({
      draft_id: data.id,
      user_id: user.id,
      event_type: 'DRAFT_CREATED',
      event_data: { type },
    });

    return data.id;
  };

  // Debounced autosave
  const autosave = useCallback((changes: Partial<DraftData>) => {
    pendingChangesRef.current = { ...pendingChangesRef.current, ...changes };
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave(pendingChangesRef.current);
      pendingChangesRef.current = {};
    }, 1000);
  }, [draftId]);

  const performSave = async (changes: Partial<DraftData>) => {
    if (!draftId || !user || Object.keys(changes).length === 0) return;

    setSaving(true);
    const { error } = await supabase
      .from('studio_drafts')
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId);

    if (error) {
      toast.error('Failed to save');
    } else {
      setLastSaved(new Date());
      setDraft(prev => prev ? { ...prev, ...changes } : null);
    }
    setSaving(false);
  };

  // Update draft field
  const updateField = <K extends keyof DraftData>(field: K, value: DraftData[K]) => {
    setDraft(prev => prev ? { ...prev, [field]: value } : null);
    autosave({ [field]: value } as Partial<DraftData>);
  };

  // Update metadata
  const updateMetadata = (key: string, value: any) => {
    const newMetadata = { ...draft?.metadata_json, [key]: value };
    updateField('metadata_json', newMetadata);
  };

  // Delete draft
  const deleteDraft = async () => {
    if (!draftId) return false;

    const { error } = await supabase
      .from('studio_drafts')
      .delete()
      .eq('id', draftId);

    if (error) {
      toast.error('Failed to delete draft');
      return false;
    }

    toast.success('Draft deleted');
    return true;
  };

  // Duplicate draft
  const duplicateDraft = async (): Promise<string | null> => {
    if (!draft || !user) return null;

    const { data, error } = await supabase
      .from('studio_drafts')
      .insert({
        user_id: user.id,
        draft_type: draft.draft_type,
        title: `${draft.title} (Copy)`,
        caption: draft.caption,
        media_url: draft.media_url,
        thumbnail_url: draft.thumbnail_url,
        metadata_json: draft.metadata_json,
        hashtags: draft.hashtags,
        mentions: draft.mentions,
        location: draft.location,
        visibility: draft.visibility,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to duplicate');
      return null;
    }

    toast.success('Draft duplicated');
    return data.id;
  };

  return {
    draft,
    loading,
    saving,
    lastSaved,
    createDraft,
    updateField,
    updateMetadata,
    deleteDraft,
    duplicateDraft,
    reload: loadDraft,
  };
}
