import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const anySupabase = supabase as any;
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, CheckCircle, ArrowLeft, FileText } from "lucide-react";
import jsPDF from "jspdf";

export default function FifoScanAccess() {
  const { qrCodeId } = useParams<{ qrCodeId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    fetchQRCodeAndWorkspace();
  }, [qrCodeId]);

  const fetchQRCodeAndWorkspace = async () => {
    if (!qrCodeId) return;

    try {
      setLoading(true);

      // Fetch QR code
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('id', qrCodeId)
        .eq('qr_type', 'fifo_workspace_access')
        .single();

      if (qrError) throw qrError;
      setQrCode(qrData);

      // Fetch workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', qrData.workspace_id)
        .eq('workspace_type', 'fifo')
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);

    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error("Invalid or expired QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!user || !workspace || !email) {
      toast.error("Please provide your email address");
      return;
    }

    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from('access_requests')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.info("You already have a pending access request");
        setRequested(true);
        return;
      }

      // Create access request
      const { error } = await supabase
        .from('access_requests')
        .insert({
          qr_code_id: qrCodeId,
          workspace_id: workspace.id,
          user_id: user.id,
          user_email: email,
          status: 'pending',
        });

      if (error) throw error;

      toast.success("Access request submitted successfully");
      setRequested(true);
    } catch (error) {
      console.error('Error requesting access:', error);
      toast.error("Failed to submit access request");
    }
  };

  const exportAccessRequestsPDF = async () => {
    if (!workspace) return;

    try {
      const { data: requests } = await supabase
        .from('access_requests')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      if (!requests || requests.length === 0) {
        toast.info("No access requests to export");
        return;
      }

      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("FIFO Workspace Access Requests", 105, 20, { align: "center" });

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Workspace: ${workspace.name}`, 20, 35);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 42);
      pdf.text(`Total Requests: ${requests.length}`, 20, 49);

      let yPos = 65;

      requests.forEach((request, index) => {
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
          pdf.text(`Approved: ${new Date(request.approved_at).toLocaleString()}`, 25, yPos);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!qrCode || !workspace) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-destructive">Invalid or expired QR code</p>
          <Button onClick={() => navigate('/inventory-manager')} className="mt-4">
            Go to FIFO Inventory
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="container mx-auto px-4 pt-20 pb-6 max-w-2xl">
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-primary" />
              <CardTitle className="text-2xl">Request FIFO Workspace Access</CardTitle>
            </div>
            <CardDescription>
              Request access to join the FIFO inventory workspace: <strong>{workspace.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {requested ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Request Submitted</h3>
                <p className="text-muted-foreground mb-4">
                  Your access request has been sent to the workspace owner.
                  You'll be notified once they review your request.
                </p>
                <Button onClick={() => navigate('/inventory-manager')}>
                  Go to FIFO Inventory
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold">Workspace Information</h4>
                  <p className="text-sm"><strong>Name:</strong> {workspace.name}</p>
                  {workspace.description && (
                    <p className="text-sm"><strong>Description:</strong> {workspace.description}</p>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  By requesting access, you'll be able to:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>View FIFO inventory across all stores</li>
                    <li>Transfer items between stores</li>
                    <li>Receive new inventory items</li>
                    <li>Track inventory activity</li>
                  </ul>
                </div>

                <Button onClick={handleRequestAccess} className="w-full" size="lg">
                  Request Access
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
