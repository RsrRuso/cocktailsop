import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, Plus, Search, MoreVertical, Film, Image, Clock,
  CheckCircle, AlertCircle, Copy, Trash2, Send, GitBranch, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import BottomNav from '@/components/BottomNav';

interface Draft {
  id: string;
  draft_type: string;
  status: string;
  caption: string | null;
  branch_label: string | null;
  parent_draft_id: string | null;
  updated_at: string;
  created_at: string;
  media_asset?: {
    thumbnail_url: string | null;
    public_url: string | null;
  };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  draft: { icon: Clock, color: 'bg-muted text-muted-foreground', label: 'Draft' },
  processing: { icon: Loader2, color: 'bg-yellow-500/20 text-yellow-500', label: 'Processing' },
  ready: { icon: CheckCircle, color: 'bg-green-500/20 text-green-500', label: 'Ready' },
  scheduled: { icon: Clock, color: 'bg-blue-500/20 text-blue-500', label: 'Scheduled' },
  needs_approval: { icon: AlertCircle, color: 'bg-orange-500/20 text-orange-500', label: 'Needs Approval' },
  failed: { icon: AlertCircle, color: 'bg-red-500/20 text-red-500', label: 'Failed' },
};

export default function Drafts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadDrafts();
  }, [user, filter]);

  const loadDrafts = async () => {
    setLoading(true);
    let query = supabase
      .from('studio_drafts')
      .select(`
        *,
        media_asset:media_assets(thumbnail_url, public_url)
      `)
      .eq('user_id', user?.id)
      .order('updated_at', { ascending: false });

    if (filter !== 'all') {
      if (filter === 'reels') {
        query = query.eq('draft_type', 'reel');
      } else if (filter === 'posts') {
        query = query.eq('draft_type', 'post');
      } else {
        query = query.eq('status', filter);
      }
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load drafts');
    } else {
      setDrafts((data || []).map(d => ({
        ...d,
        media_asset: Array.isArray(d.media_asset) ? d.media_asset[0] : d.media_asset
      })));
    }
    setLoading(false);
  };

  const createNewDraft = async (type: 'post' | 'reel') => {
    const { data, error } = await supabase
      .from('studio_drafts')
      .insert({ user_id: user?.id, draft_type: type })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create draft');
      return;
    }

    // Log history event
    await supabase.from('history_events').insert({
      draft_id: data.id,
      user_id: user?.id,
      event_type: 'DRAFT_CREATED',
      event_data: { draft_type: type }
    });

    navigate(`/studio/${data.id}`);
  };

  const duplicateDraft = async (draft: Draft) => {
    const { data, error } = await supabase
      .from('studio_drafts')
      .insert({
        user_id: user?.id,
        draft_type: draft.draft_type,
        caption: draft.caption,
        parent_draft_id: draft.id,
        branch_label: 'Copy'
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to duplicate');
      return;
    }

    toast.success('Draft duplicated');
    loadDrafts();
  };

  const deleteDraft = async (id: string) => {
    const { error } = await supabase
      .from('studio_drafts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete');
      return;
    }

    toast.success('Draft deleted');
    setDrafts(drafts.filter(d => d.id !== id));
  };

  const filteredDrafts = drafts.filter(d => 
    !search || (d.caption?.toLowerCase().includes(search.toLowerCase()))
  );

  // Group drafts by parent for branching display
  const groupedDrafts = filteredDrafts.reduce((acc, draft) => {
    if (!draft.parent_draft_id) {
      acc.push({ parent: draft, branches: [] });
    }
    return acc;
  }, [] as { parent: Draft; branches: Draft[] }[]);

  // Add branches to their parents
  filteredDrafts.forEach(draft => {
    if (draft.parent_draft_id) {
      const parent = groupedDrafts.find(g => g.parent.id === draft.parent_draft_id);
      if (parent) {
        parent.branches.push(draft);
      }
    }
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/create')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Drafts</h1>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => createNewDraft('reel')}>
                <Film className="w-4 h-4 mr-2" />
                New Reel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewDraft('post')}>
                <Image className="w-4 h-4 mr-2" />
                New Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={setFilter} className="px-4">
          <TabsList className="w-full grid grid-cols-5 h-10">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="reels">Reels</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="needs_approval">Pending</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      {/* Drafts List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No drafts yet</p>
              <p className="text-sm">Start creating to see your drafts here</p>
            </div>
          ) : (
            groupedDrafts.map(({ parent, branches }) => (
              <div key={parent.id} className="space-y-2">
                <DraftCard
                  draft={parent}
                  onOpen={() => navigate(`/studio/${parent.id}`)}
                  onDuplicate={() => duplicateDraft(parent)}
                  onDelete={() => deleteDraft(parent.id)}
                  onPublish={() => navigate(`/publish/${parent.id}`)}
                />
                
                {branches.length > 0 && (
                  <div className="ml-8 space-y-2 border-l-2 border-primary/20 pl-4">
                    {branches.map(branch => (
                      <DraftCard
                        key={branch.id}
                        draft={branch}
                        isBranch
                        onOpen={() => navigate(`/studio/${branch.id}`)}
                        onDuplicate={() => duplicateDraft(branch)}
                        onDelete={() => deleteDraft(branch.id)}
                        onPublish={() => navigate(`/publish/${branch.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <BottomNav />
    </div>
  );
}

function DraftCard({ 
  draft, 
  isBranch = false,
  onOpen, 
  onDuplicate, 
  onDelete,
  onPublish 
}: { 
  draft: Draft;
  isBranch?: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPublish: () => void;
}) {
  const status = statusConfig[draft.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div 
      className="flex gap-3 p-3 bg-card rounded-xl border border-border/40 hover:border-border transition-colors cursor-pointer"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="w-16 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
        {draft.media_asset?.thumbnail_url || draft.media_asset?.public_url ? (
          <img 
            src={draft.media_asset.thumbnail_url || draft.media_asset.public_url || ''} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {draft.draft_type === 'reel' ? (
              <Film className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Image className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isBranch && <GitBranch className="w-3 h-3 text-primary" />}
            <p className="font-medium truncate">
              {draft.caption?.slice(0, 50) || 'Untitled draft'}
              {draft.branch_label && (
                <span className="text-xs text-muted-foreground ml-1">({draft.branch_label})</span>
              )}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublish(); }}>
                <Send className="w-4 h-4 mr-2" />
                Publish
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={`${status.color} text-xs`}>
            <StatusIcon className={`w-3 h-3 mr-1 ${draft.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">{draft.draft_type}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Updated {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
