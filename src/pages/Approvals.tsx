import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, CheckCircle, XCircle, MessageSquare, Clock, 
  AlertCircle, Loader2, Film, Image, Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import BottomNav from '@/components/BottomNav';

interface ApprovalRequest {
  id: string;
  status: string;
  feedback: string | null;
  created_at: string;
  draft: {
    id: string;
    draft_type: string;
    caption: string;
    media_url?: string;
  };
  profile: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    user: { username: string; avatar_url: string };
  }>;
}

export default function Approvals() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user, venueId]);

  const loadRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('studio_approval_requests')
      .select(`
        *,
        draft:studio_drafts(id, draft_type, caption),
        comments:approval_comments(id, content, created_at)
      `)
      .order('created_at', { ascending: false });

    if (venueId) {
      query = query.eq('venue_id', venueId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load requests');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleDecision = async (requestId: string, decision: 'approved' | 'rejected' | 'changes_requested') => {
    setSubmitting(true);
    try {
      await supabase
        .from('studio_approval_requests')
        .update({
          status: decision,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          feedback: feedback || null
        })
        .eq('id', requestId);

      // Log history event
      const request = requests.find(r => r.id === requestId);
      if (request?.draft) {
        await supabase.from('history_events').insert({
          draft_id: request.draft.id,
          user_id: user?.id,
          event_type: decision === 'approved' ? 'APPROVED' : 
                     decision === 'rejected' ? 'REJECTED' : 'CHANGES_REQUESTED',
          event_data: { feedback }
        });
      }

      toast.success(
        decision === 'approved' ? 'Approved!' :
        decision === 'rejected' ? 'Rejected' : 'Changes requested'
      );

      setSelectedRequest(null);
      setFeedback('');
      loadRequests();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const addComment = async () => {
    if (!selectedRequest || !newComment.trim()) return;

    await supabase.from('approval_comments').insert({
      approval_request_id: selectedRequest.id,
      user_id: user?.id,
      content: newComment
    });

    setNewComment('');
    loadRequests();
    toast.success('Comment added');
  };

  const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-500', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'bg-green-500/20 text-green-500', label: 'Approved' },
    rejected: { icon: XCircle, color: 'bg-red-500/20 text-red-500', label: 'Rejected' },
    changes_requested: { icon: AlertCircle, color: 'bg-orange-500/20 text-orange-500', label: 'Changes Requested' },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Approval Inbox</h1>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pending approvals</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div 
                  key={request.id}
                  className="p-4 bg-card rounded-xl border border-border/40 cursor-pointer hover:border-border transition-colors"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.profile?.avatar_url} />
                      <AvatarFallback>
                        {request.profile?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{request.profile?.full_name || request.profile?.username}</p>
                          <p className="text-xs text-muted-foreground">@{request.profile?.username}</p>
                        </div>
                        
                        <Badge variant="secondary" className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-sm mt-2 line-clamp-2">
                        {request.draft?.caption || 'No caption'}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 capitalize">
                          {request.draft?.draft_type === 'reel' ? (
                            <Film className="w-3 h-3" />
                          ) : (
                            <Image className="w-3 h-3" />
                          )}
                          {request.draft?.draft_type}
                        </span>
                        <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                        {request.comments?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {request.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-1">
                {/* Submitter Info */}
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedRequest.profile?.avatar_url} />
                    <AvatarFallback>
                      {selectedRequest.profile?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedRequest.profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">@{selectedRequest.profile?.username}</p>
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <p className="text-sm font-medium mb-1">Caption</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.draft?.caption || 'No caption'}
                  </p>
                </div>

                {/* Comments Thread */}
                {selectedRequest.comments?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Comments</p>
                    <div className="space-y-2">
                      {selectedRequest.comments.map(comment => (
                        <div key={comment.id} className="flex gap-2 p-2 bg-muted/50 rounded-lg">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={comment.user?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {comment.user?.username?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-xs font-medium">{comment.user?.username}</p>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button size="icon" onClick={addComment} disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {/* Feedback for decision */}
                {selectedRequest.status === 'pending' && (
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
            </ScrollArea>
          )}

          {selectedRequest?.status === 'pending' && (
            <DialogFooter className="flex gap-2 mt-4">
              <Button 
                variant="outline"
                onClick={() => handleDecision(selectedRequest.id, 'rejected')}
                disabled={submitting}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleDecision(selectedRequest.id, 'changes_requested')}
                disabled={submitting}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              <Button 
                onClick={() => handleDecision(selectedRequest.id, 'approved')}
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
