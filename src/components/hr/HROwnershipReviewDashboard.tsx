import { useState, useEffect } from 'react';
import { useOwnershipTransfer, OwnershipRequest, HRMember } from '@/hooks/useOwnershipTransfer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Crown, 
  UserCheck, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

const requestTypeConfig = {
  ownership_transfer: {
    label: 'Ownership Transfer',
    icon: Crown,
    color: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  admin_promotion: {
    label: 'Admin Promotion',
    icon: UserCheck,
    color: 'text-blue-500',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  admin_request: {
    label: 'Admin Request',
    icon: UserPlus,
    color: 'text-green-500',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
};

export const HROwnershipReviewDashboard = () => {
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [hrMember, setHrMember] = useState<HRMember | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OwnershipRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const { getPendingRequests, checkIsHRMember, reviewRequest, isLoading: actionLoading } = useOwnershipTransfer();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [member, pendingRequests] = await Promise.all([
      checkIsHRMember(),
      getPendingRequests(),
    ]);
    setHrMember(member);
    setRequests(pendingRequests);
    setIsLoading(false);
  };

  const handleReview = async (decision: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    
    const result = await reviewRequest(
      selectedRequest.id,
      decision,
      reviewNotes || undefined,
      decisionReason || undefined
    );

    if (result.success) {
      setSelectedRequest(null);
      setReviewNotes('');
      setDecisionReason('');
      loadData();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hrMember) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Shield className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">You don't have HR department access.</p>
        </CardContent>
      </Card>
    );
  }

  if (!hrMember.can_approve_transfers) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <p className="text-muted-foreground">You don't have permission to approve transfers.</p>
          <Badge variant="secondary">{hrMember.role}</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                HR Ownership Review Dashboard
              </CardTitle>
              <CardDescription>
                Review and approve venue ownership and admin requests
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {requests.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-muted-foreground">No pending requests to review</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {requests.map((request) => {
                  const typeConfig = requestTypeConfig[request.request_type];
                  const TypeIcon = typeConfig.icon;

                  return (
                    <Card key={request.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={request.requester?.avatar_url || ''} />
                              <AvatarFallback>
                                {request.requester?.full_name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">
                                  {request.requester?.full_name || request.requester?.username || 'Unknown'}
                                </span>
                                <Badge className={typeConfig.badge}>
                                  <TypeIcon className="h-3 w-3 mr-1" />
                                  {typeConfig.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Building2 className="h-4 w-4" />
                                <span>{request.venue?.name || 'Unknown Venue'}</span>
                                {request.venue?.city && (
                                  <span className="text-xs">• {request.venue.city}</span>
                                )}
                              </div>
                              {request.additional_notes && (
                                <p className="text-sm mt-2 line-clamp-2">
                                  {request.additional_notes}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                Submitted {format(new Date(request.created_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                          >
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review Request
            </DialogTitle>
            <DialogDescription>
              Review the details and make a decision
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Requester</Label>
                  <p className="font-medium">
                    {selectedRequest.requester?.full_name || selectedRequest.requester?.username}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Venue</Label>
                  <p className="font-medium">{selectedRequest.venue?.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Request Type</Label>
                  <Badge className={requestTypeConfig[selectedRequest.request_type].badge}>
                    {requestTypeConfig[selectedRequest.request_type].label}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Owner</Label>
                  <p className="font-medium">
                    {selectedRequest.current_owner?.full_name || 'None'}
                  </p>
                </div>
              </div>

              {selectedRequest.business_registration && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Business Registration</Label>
                  <p className="font-medium">{selectedRequest.business_registration}</p>
                </div>
              )}

              {selectedRequest.additional_notes && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Notes from Requester</Label>
                  <p className="text-sm bg-muted p-3 rounded-lg">
                    {selectedRequest.additional_notes}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Your Review Notes (Internal)</Label>
                <Textarea
                  placeholder="Add internal notes about your review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Decision Reason (Visible to Requester)</Label>
                <Textarea
                  placeholder="Explain your decision..."
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="destructive" 
                  className="flex-1 gap-2"
                  onClick={() => handleReview('reject')}
                  disabled={actionLoading}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={() => handleReview('approve')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
