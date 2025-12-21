import { useState, useEffect } from 'react';
import { useOwnershipTransfer, OwnershipRequest } from '@/hooks/useOwnershipTransfer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Crown, 
  UserCheck, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Building2,
  X,
  FileSearch
} from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  pending_hr_review: {
    label: 'Pending HR Review',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  hr_approved: {
    label: 'Approved',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  hr_rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: X,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
};

const requestTypeIcons = {
  ownership_transfer: Crown,
  admin_promotion: UserCheck,
  admin_request: UserPlus,
};

export const MyOwnershipRequests = () => {
  const [requests, setRequests] = useState<OwnershipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getMyRequests, cancelRequest, isLoading: actionLoading } = useOwnershipTransfer();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    const data = await getMyRequests();
    setRequests(data);
    setIsLoading(false);
  };

  const handleCancel = async (requestId: string) => {
    const result = await cancelRequest(requestId);
    if (result.success) {
      loadRequests();
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          My Access Requests
        </CardTitle>
        <CardDescription>
          Track your venue access and ownership requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <Crown className="h-10 w-10" />
            <p>No requests submitted yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {requests.map((request) => {
                const status = statusConfig[request.status];
                const StatusIcon = status.icon;
                const TypeIcon = requestTypeIcons[request.request_type];

                return (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-3 border rounded-lg gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-muted rounded-lg">
                        <TypeIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">
                            {request.venue?.name || 'Unknown Venue'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      {request.status === 'pending_hr_review' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCancel(request.id)}
                          disabled={actionLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
