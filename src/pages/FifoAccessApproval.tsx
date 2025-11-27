import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFifoWorkspace } from "@/hooks/useFifoWorkspace";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Package, ArrowLeft, FileText } from "lucide-react";
import jsPDF from "jspdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FifoAccessApproval() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useFifoWorkspace();
  const [accessRequests, setAccessRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  useEffect(() => {
    if (currentWorkspace) {
      setSelectedWorkspaceId(currentWorkspace.id);
      fetchAccessRequests(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const fetchAccessRequests = async (workspaceId: string) => {
    if (!user || !workspaceId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccessRequests(data || []);
    } catch (error) {
      console.error('Error fetching access requests:', error);
      toast.error("Failed to load access requests");
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    fetchAccessRequests(workspaceId);
  };

  const handleApprove = async (requestId: string, userId: string) => {
    if (!user) return;

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Add user to workspace members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: selectedWorkspaceId,
          user_id: userId,
          role: 'member',
          permissions: {
            can_receive: true,
            can_transfer: true,
            can_manage: false,
            can_delete: false
          },
          invited_by: user.id,
        });

      if (memberError) throw memberError;

      toast.success("Access request approved");
      fetchAccessRequests(selectedWorkspaceId);
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error("Failed to approve access request");
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success("Access request rejected");
      fetchAccessRequests(selectedWorkspaceId);
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error("Failed to reject access request");
    }
  };

  const exportAccessRequestsPDF = async () => {
    if (!selectedWorkspaceId) {
      toast.error("Please select a workspace");
      return;
    }

    try {
      const workspace = workspaces.find(w => w.id === selectedWorkspaceId);
      
      if (!workspace || accessRequests.length === 0) {
        toast.info("No access requests to export");
        return;
      }

      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("FIFO Access Requests Report", 105, 20, { align: "center" });

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Workspace: ${workspace.name}`, 20, 35);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 42);
      pdf.text(`Total Requests: ${accessRequests.length}`, 20, 49);

      let yPos = 65;

      accessRequests.forEach((request, index) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.text(`Request #${index + 1}`, 20, yPos);
        pdf.setFont("helvetica", "normal");
        yPos += 7;

        pdf.text(`Email: ${request.user_email || 'N/A'}`, 25, yPos);
        yPos += 6;
        pdf.text(`Status: ${request.status}`, 25, yPos);
        yPos += 6;
        pdf.text(`Requested: ${new Date(request.created_at).toLocaleString()}`, 25, yPos);
        yPos += 6;

        if (request.approved_at) {
          pdf.text(`Processed: ${new Date(request.approved_at).toLocaleString()}`, 25, yPos);
          yPos += 6;
        }

        yPos += 8;
      });

      pdf.save(`FIFO-Access-Requests-${workspace.name}-${Date.now()}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Failed to export PDF");
    }
  };

  if (!user) {
    return null;
  }

  const pendingRequests = accessRequests.filter(r => r.status === 'pending');
  const processedRequests = accessRequests.filter(r => r.status !== 'pending');

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/inventory-manager")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to FIFO Inventory
          </Button>
          <Button
            variant="outline"
            onClick={exportAccessRequestsPDF}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">FIFO Access Requests</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select FIFO Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedWorkspaceId} onValueChange={handleWorkspaceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Requests ({pendingRequests.length})
              </h2>

              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    No pending requests
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{request.user_email}</p>
                            <p className="text-sm text-muted-foreground">
                              Requested {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id, request.user_id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(request.id)}
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
            </div>

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Previous Requests</h2>
                <div className="space-y-3">
                  {processedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{request.user_email}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(request.approved_at || request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={request.status === 'approved' ? 'default' : 'destructive'}>
                            {request.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
