import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Save, Scissors, Crop, Type, Hash, MapPin, 
  Eye, Clock, Send, Music, Image, Loader2, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback as useDebounced } from 'react';

interface Draft {
  id: string;
  draft_type: string;
  status: string;
  caption: string;
  hashtags: string[];
  location: string;
  visibility: string;
  needs_approval: boolean;
  trim_start: number | null;
  trim_end: number | null;
  aspect_ratio: string;
}

export default function Studio() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTool, setActiveTool] = useState('caption');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  // Load draft
  useEffect(() => {
    if (!draftId || !user) return;

    const loadDraft = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('studio_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error || !data) {
        toast.error('Draft not found');
        navigate('/drafts');
        return;
      }

      setDraft(data as Draft);
      
      // Load media asset
      const { data: asset } = await supabase
        .from('media_assets')
        .select('public_url')
        .eq('draft_id', draftId)
        .eq('status', 'ready')
        .single();

      if (asset?.public_url) {
        setMediaUrl(asset.public_url);
      }

      setLoading(false);
    };

    loadDraft();
  }, [draftId, user, navigate]);

  // Autosave function
  const saveDraft = useCallback(async (updates: Partial<Draft>) => {
    if (!draft?.id) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('studio_drafts')
      .update(updates)
      .eq('id', draft.id);

    if (!error) {
      setLastSaved(new Date());
      // Log history event
      await supabase.from('history_events').insert({
        draft_id: draft.id,
        user_id: user?.id,
        event_type: 'DRAFT_UPDATED',
        event_data: { changes: Object.keys(updates) }
      });
    }
    setSaving(false);
  }, [draft?.id, user?.id]);

  const updateDraft = (updates: Partial<Draft>) => {
    if (!draft) return;
    const newDraft = { ...draft, ...updates };
    setDraft(newDraft);
    saveDraft(updates);
  };

  const handlePublish = () => {
    if (!draft) return;
    navigate(`/publish/${draft.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/drafts')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span>Saved</span>
              </>
            ) : null}
          </div>

          <Button onClick={handlePublish} className="gap-2">
            <Send className="w-4 h-4" />
            Publish
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1 p-4 flex items-center justify-center bg-black/5">
          <div className="relative aspect-[9/16] max-h-[60vh] lg:max-h-[80vh] w-auto bg-black rounded-2xl overflow-hidden">
            {mediaUrl ? (
              draft.draft_type === 'reel' ? (
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              ) : (
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <Image className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>

        {/* Tools Panel */}
        <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-border bg-background">
          <Tabs value={activeTool} onValueChange={setActiveTool}>
            <TabsList className="w-full grid grid-cols-5 h-12 bg-muted/50">
              <TabsTrigger value="caption" className="gap-1">
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline">Caption</span>
              </TabsTrigger>
              <TabsTrigger value="trim" className="gap-1">
                <Scissors className="w-4 h-4" />
                <span className="hidden sm:inline">Trim</span>
              </TabsTrigger>
              <TabsTrigger value="crop" className="gap-1">
                <Crop className="w-4 h-4" />
                <span className="hidden sm:inline">Crop</span>
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-1">
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Music</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)] lg:h-[calc(100vh-120px)]">
              <div className="p-4 space-y-6">
                {/* Caption Tab */}
                <TabsContent value="caption" className="mt-0 space-y-4">
                  <div>
                    <Label>Caption</Label>
                    <Textarea
                      placeholder="Write a caption..."
                      value={draft.caption || ''}
                      onChange={(e) => updateDraft({ caption: e.target.value })}
                      className="min-h-[120px] mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {(draft.caption || '').length}/2200
                    </p>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Hashtags
                    </Label>
                    <Input
                      placeholder="#cocktails #mixology"
                      value={(draft.hashtags || []).join(' ')}
                      onChange={(e) => updateDraft({ 
                        hashtags: e.target.value.split(' ').filter(t => t.startsWith('#')) 
                      })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </Label>
                    <Input
                      placeholder="Add location..."
                      value={draft.location || ''}
                      onChange={(e) => updateDraft({ location: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>

                {/* Trim Tab */}
                <TabsContent value="trim" className="mt-0 space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Scissors className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Trim tool</p>
                    <p className="text-sm">Set start and end points</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Start Time (seconds)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={draft.trim_start || 0}
                        onChange={(e) => updateDraft({ trim_start: parseFloat(e.target.value) })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>End Time (seconds)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={draft.trim_end || ''}
                        onChange={(e) => updateDraft({ trim_end: parseFloat(e.target.value) || null })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Crop Tab */}
                <TabsContent value="crop" className="mt-0 space-y-4">
                  <div>
                    <Label>Aspect Ratio</Label>
                    <Select
                      value={draft.aspect_ratio}
                      onValueChange={(v) => updateDraft({ aspect_ratio: v })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="original">Original</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Music Tab */}
                <TabsContent value="music" className="mt-0 space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Add Music</p>
                    <p className="text-sm">Browse Music Box library</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/music-box')}>
                      Open Music Box
                    </Button>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0 space-y-6">
                  <div>
                    <Label>Visibility</Label>
                    <Select
                      value={draft.visibility}
                      onValueChange={(v) => updateDraft({ visibility: v })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Needs Approval</Label>
                      <p className="text-xs text-muted-foreground">
                        Require venue/team approval before publishing
                      </p>
                    </div>
                    <Switch
                      checked={draft.needs_approval}
                      onCheckedChange={(checked) => updateDraft({ needs_approval: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Schedule
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Schedule for later
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Set Time
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
