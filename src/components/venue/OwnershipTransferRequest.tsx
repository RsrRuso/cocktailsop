import { useState } from 'react';
import { useOwnershipTransfer } from '@/hooks/useOwnershipTransfer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, FileText, Upload, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OwnershipTransferRequestProps {
  venueId: string;
  venueName: string;
  currentOwnerName?: string;
}

export const OwnershipTransferRequest = ({
  venueId,
  venueName,
  currentOwnerName,
}: OwnershipTransferRequestProps) => {
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<'ownership_transfer' | 'admin_promotion' | 'admin_request'>('admin_request');
  const [businessRegistration, setBusinessRegistration] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const { createOwnershipRequest, isLoading } = useOwnershipTransfer();

  const handleSubmit = async () => {
    const result = await createOwnershipRequest({
      venue_id: venueId,
      request_type: requestType,
      business_registration: businessRegistration || undefined,
      additional_notes: additionalNotes || undefined,
    });

    if (result.success) {
      setOpen(false);
      setBusinessRegistration('');
      setAdditionalNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Crown className="h-4 w-4" />
          Request Admin Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Request Access to {venueName}
          </DialogTitle>
          <DialogDescription>
            Submit a request to HR for review. All requests go through our HR department for verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This request will be reviewed by HR. Please provide accurate information and any supporting documentation.
            </AlertDescription>
          </Alert>

          {currentOwnerName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Current Owner</p>
              <p className="font-medium">{currentOwnerName}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={requestType} onValueChange={(v: any) => setRequestType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_request">Request Admin Access</SelectItem>
                <SelectItem value="admin_promotion">Request Promotion (Current Staff)</SelectItem>
                <SelectItem value="ownership_transfer">Request Ownership Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestType === 'ownership_transfer' && (
            <div className="space-y-2">
              <Label>Business Registration Number</Label>
              <Input
                placeholder="Enter your business registration"
                value={businessRegistration}
                onChange={(e) => setBusinessRegistration(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for ownership transfers to verify business ownership
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Explain why you're requesting this access, your role, and any relevant details..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 gap-2" 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4" />
              {isLoading ? 'Submitting...' : 'Submit to HR'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
