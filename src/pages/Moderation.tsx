import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, 
  Eye, Flag, Loader2, Film, Image
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import BottomNav from '@/components/BottomNav';

interface FlaggedContent {
  id: string;
  content_type: 'post' | 'reel' | 'story';
  content_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'removed' | 'restricted';
  created_at: string;
  content?: {
    caption?: string;
    media_url?: string;
    user_id: string;
  };
}

export default function Moderation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<FlaggedContent | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadFlaggedContent();
  }, [filter]);

  const loadFlaggedContent = async () => {
    setLoading(true);
    
    // For demo purposes, we'll create mock data
    // In production, this would query a content_flags table
    const mockData: FlaggedContent[] = [
      {
        id: '1',
        content_type: 'reel',
        content_id: 'reel-1',
        reason: 'Inappropriate content',
        status: 'pending',
        created_at: new Date().toISOString(),
        content: {
          caption: 'Sample flagged content',
          media_url: '',
          user_id: 'user-1',
        },
      },
    ];

    setItems(filter === 'pending' ? mockData.filter(i => i.status === 'pending') : mockData);
    setLoading(false);
  };

  const handleDecision = async (
    itemId: string, 
    decision: 'approved' | 'removed' | 'restricted'
  ) => {
    setSubmitting(true);
    
    try {
      // Update the flag status
      // In production: update content_flags table
      
      // Log moderation action
      const item = items.find(i => i.id === itemId);
      if (item) {
        await supabase.from('history_events').insert({
          user_id: user?.id,
          event_type: decision === 'approved' ? 'MODERATION_CLEAR' : 'MODERATION_FLAG',
          event_data: {
            content_type: item.content_type,
            content_id: item.content_id,
            decision,
            feedback,
          },
        });
      }

      toast.success(
        decision === 'approved' ? 'Content approved' :
        decision === 'removed' ? 'Content removed' : 'Content restricted'
      );

      setSelectedItem(null);
      setFeedback('');
      loadFlaggedContent();
    } catch (error) {
      toast.error('Failed to process');
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-500/20 text-yellow-500', label: 'Pending Review' },
    approved: { color: 'bg-green-500/20 text-green-500', label: 'Approved' },
    removed: { color: 'bg-red-500/20 text-red-500', label: 'Removed' },
    restricted: { color: 'bg-orange-500/20 text-orange-500', label: 'Restricted' },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Moderation</h1>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'pending' | 'all')} className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            All
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items to review</p>
              <p className="text-sm">All content has been moderated</p>
            </div>
          ) : (
            items.map((item) => {
              const status = statusConfig[item.status];

              return (
                <div 
                  key={item.id}
                  className="p-4 bg-card rounded-xl border border-border/40 cursor-pointer hover:border-border transition-colors"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start gap-3">
                    {/* Content type icon */}
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      {item.content_type === 'reel' ? (
                        <Film className="w-5 h-5" />
                      ) : (
                        <Image className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium capitalize">{item.content_type}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            {item.reason}
                          </p>
                        </div>
                        
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">
                        {item.content?.caption || 'No caption'}
                      </p>

                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Content</DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                {selectedItem.content?.media_url ? (
                  <img 
                    src={selectedItem.content.media_url} 
                    alt="Content" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <p className="text-muted-foreground">No preview available</p>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Reason:</span>
                  <span className="text-sm">{selectedItem.reason}</span>
                </div>
                
                {selectedItem.content?.caption && (
                  <div>
                    <p className="text-sm font-medium mb-1">Caption:</p>
                    <p className="text-sm text-muted-foreground">{selectedItem.content.caption}</p>
                  </div>
                )}
              </div>

              {/* Feedback */}
              {selectedItem.status === 'pending' && (
                <div>
                  <p className="text-sm font-medium mb-1">Feedback (optional)</p>
                  <Textarea
                    placeholder="Add feedback for the creator..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {selectedItem?.status === 'pending' && (
            <DialogFooter className="flex gap-2 mt-4">
              <Button 
                variant="destructive"
                onClick={() => handleDecision(selectedItem.id, 'removed')}
                disabled={submitting}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Remove
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleDecision(selectedItem.id, 'restricted')}
                disabled={submitting}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Restrict
              </Button>
              <Button 
                onClick={() => handleDecision(selectedItem.id, 'approved')}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
