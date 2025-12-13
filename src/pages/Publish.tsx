import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Send, Clock, Eye, AlertCircle, Loader2, 
  CheckCircle, Calendar, MapPin, Hash, Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Draft {
  id: string;
  draft_type: string;
  status: string;
  caption: string;
  hashtags: string[];
  location: string;
  visibility: string;
  needs_approval: boolean;
  approval_venue_id: string | null;
  scheduled_at: string | null;
  media_asset?: {
    status: string;
    public_url: string;
    thumbnail_url: string;
  };
}

export default function Publish() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    if (!draftId || !user) return;
    loadDraft();
  }, [draftId, user]);

  const loadDraft = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('studio_drafts')
      .select(`
        *,
        media_asset:media_assets(status, public_url, thumbnail_url)
      `)
      .eq('id', draftId)
      .single();

    if (error || !data) {
      toast.error('Draft not found');
      navigate('/drafts');
      return;
    }

    const draftData = {
      ...data,
      media_asset: Array.isArray(data.media_asset) ? data.media_asset[0] : data.media_asset
    };
    setDraft(draftData);
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!draft) return;

    // Validation
    if (!draft.caption?.trim()) {
      toast.error('Please add a caption');
      return;
    }

    if (draft.media_asset?.status !== 'ready' && draft.media_asset?.status) {
      toast.error('Media is still processing');
      return;
    }

    // Check if approval is needed
    if (draft.needs_approval) {
      await submitForApproval();
      return;
    }

    // Schedule or publish now
    if (scheduleMode && scheduleDate && scheduleTime) {
      await schedulePublish();
    } else {
      await publishNow();
    }
  };

  const publishNow = async () => {
    if (!draft) return;
    setPublishing(true);

    try {
      // Create post/reel based on type
      if (draft.draft_type === 'reel') {
        const { data: reel, error } = await supabase
          .from('reels')
          .insert({
            user_id: user?.id,
            video_url: draft.media_asset?.public_url,
            thumbnail_url: draft.media_asset?.thumbnail_url,
            caption: draft.caption,
            hashtags: draft.hashtags,
            visibility: draft.visibility,
          })
          .select()
          .single();

        if (error) throw error;

        // Create post version
        await supabase.from('post_versions').insert({
          reel_id: reel.id,
          version_number: 1,
          caption: draft.caption,
          hashtags: draft.hashtags,
          status: 'ready'
        });

        // Log history events
        await supabase.from('history_events').insert([
          { draft_id: draft.id, reel_id: reel.id, user_id: user?.id, event_type: 'PUBLISHED', version_number: 1 }
        ]);

        // Update draft status
        await supabase.from('studio_drafts').update({ status: 'published' }).eq('id', draft.id);

        toast.success('Reel published!');
        navigate(`/reels`);
      } else {
        const { data: post, error } = await supabase
          .from('posts')
          .insert({
            user_id: user?.id,
            image_url: draft.media_asset?.public_url,
            caption: draft.caption,
            hashtags: draft.hashtags,
            visibility: draft.visibility,
          })
          .select()
          .single();

        if (error) throw error;

        // Create post version
        await supabase.from('post_versions').insert({
          post_id: post.id,
          version_number: 1,
          caption: draft.caption,
          hashtags: draft.hashtags,
          status: 'ready'
        });

        // Log history
        await supabase.from('history_events').insert([
          { draft_id: draft.id, post_id: post.id, user_id: user?.id, event_type: 'PUBLISHED', version_number: 1 }
        ]);

        await supabase.from('studio_drafts').update({ status: 'published' }).eq('id', draft.id);

        toast.success('Post published!');
        navigate('/home');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const schedulePublish = async () => {
    if (!draft || !scheduleDate || !scheduleTime) return;
    setPublishing(true);

    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      
      await supabase
        .from('studio_drafts')
        .update({ 
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString()
        })
        .eq('id', draft.id);

      await supabase.from('history_events').insert({
        draft_id: draft.id,
        user_id: user?.id,
        event_type: 'SCHEDULED',
        event_data: { scheduled_at: scheduledAt.toISOString() }
      });

      toast.success(`Scheduled for ${scheduledAt.toLocaleString()}`);
      navigate('/drafts');
    } catch (error) {
      toast.error('Failed to schedule');
    } finally {
      setPublishing(false);
    }
  };

  const submitForApproval = async () => {
    if (!draft) return;
    setPublishing(true);

    try {
      await supabase.from('studio_approval_requests').insert({
        draft_id: draft.id,
        user_id: user?.id,
        venue_id: draft.approval_venue_id,
        status: 'pending'
      });

      await supabase.from('studio_drafts').update({ status: 'needs_approval' }).eq('id', draft.id);

      await supabase.from('history_events').insert({
        draft_id: draft.id,
        user_id: user?.id,
        event_type: 'APPROVAL_REQUESTED',
      });

      toast.success('Submitted for approval');
      navigate('/drafts');
    } catch (error) {
      toast.error('Failed to submit');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft) return null;

  const isMediaReady = !draft.media_asset || draft.media_asset.status === 'ready';
  const canPublish = draft.caption?.trim() && isMediaReady;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/studio/${draft.id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Publish</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Preview Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="w-24 h-32 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {draft.media_asset?.thumbnail_url || draft.media_asset?.public_url ? (
                  <img 
                    src={draft.media_asset.thumbnail_url || draft.media_asset.public_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No media
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-3">{draft.caption || 'No caption'}</p>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  {draft.hashtags?.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {draft.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {draft.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 capitalize">
                    <Eye className="w-3 h-3" />
                    {draft.visibility}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Alerts */}
        {!isMediaReady && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">Media Processing</p>
                <p className="text-sm text-muted-foreground">
                  Your video is still being processed. You can publish once it's ready.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Option */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Schedule for later</Label>
              <Switch checked={scheduleMode} onCheckedChange={setScheduleMode} />
            </div>

            {scheduleMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Required */}
        {draft.needs_approval && (
          <Card className="border-orange-500/50 bg-orange-500/10">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-500">Approval Required</p>
                <p className="text-sm text-muted-foreground">
                  This will be sent for approval before publishing.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            className="w-full h-12 text-base gap-2"
            disabled={!canPublish || publishing}
            onClick={handlePublish}
          >
            {publishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {draft.needs_approval ? 'Submitting...' : scheduleMode ? 'Scheduling...' : 'Publishing...'}
              </>
            ) : (
              <>
                {draft.needs_approval ? (
                  <>
                    <Send className="w-5 h-5" />
                    Submit for Approval
                  </>
                ) : scheduleMode ? (
                  <>
                    <Calendar className="w-5 h-5" />
                    Schedule
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Publish Now
                  </>
                )}
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate('/drafts')}
          >
            Save as Draft
          </Button>
        </div>
      </div>
    </div>
  );
}
