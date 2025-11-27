import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Clock, FileDown } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FifoAccessApprovalPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  const [workspace, setWorkspace] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && workspaceId) {
      fetchWorkspaceAndRequests();
    }
  }, [user, workspaceId]);

  const fetchWorkspaceAndRequests = async () => {
    if (!workspaceId) return;

    try {
      // Fetch workspace info
      const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .eq('workspace_type', 'fifo')
        .single();

      setWorkspace(workspaceData);

      // Fetch access requests
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load access requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, userId: string) => {
    if (!workspaceId) return;

    try {
      // Update request status
      const { error: requestError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Add user as workspace member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: 'member',
          permissions: {
            can_receive: true,
            can_transfer: true,
            can_manage: false,
            can_delete: false
          },
          invited_by: user?.id
        });

      if (memberError) throw memberError;

      toast.success("Access request approved!");
      fetchWorkspaceAndRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Access request rejected");
      fetchWorkspaceAndRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || "Failed to reject request");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Access Requests - ${workspace?.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    const tableData = requests.map(req => [
      req.user_email || 'N/A',
      req.status.toUpperCase(),
      new Date(req.created_at).toLocaleString(),
      req.approved_at ? new Date(req.approved_at).toLocaleString() : '-'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Email', 'Status', 'Requested', 'Responded']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    doc.save(`fifo-access-requests-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exported successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container max-w-4xl mx-auto px-3 py-4 pt-20">
        {/* Header - Mobile optimized */}
        <div className="mb-4 space-y-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Access Requests</h1>
            <p className="text-sm text-muted-foreground">
              {workspace?.name || 'No workspace selected'}
            </p>
          </div>
          {requests.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportPDF}
              className="w-full sm:w-auto"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>

        {/* Pending Requests */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
              Pending ({pendingRequests.length})
            </CardTitle>
            <CardDescription className="text-xs">Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No pending requests
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-orange-200/50">
                    <CardContent className="p-3">
                      {/* Mobile-friendly stacked layout */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="font-medium text-sm break-all">{request.user_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleString()}
                          </p>
                        </div>
                        {/* Buttons stacked on mobile, side-by-side on larger screens */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(request.id, request.user_id)}
                            className="w-full sm:flex-1"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request.id)}
                            className="w-full sm:flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">History</CardTitle>
            <CardDescription className="text-xs">Previously processed</CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6">
            {processedRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No processed requests yet
              </p>
            ) : (
              <div className="space-y-2">
                {processedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{request.user_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={request.status === 'approved' ? 'default' : 'destructive'}
                      className="self-start sm:self-center"
                    >
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default FifoAccessApprovalPage;
