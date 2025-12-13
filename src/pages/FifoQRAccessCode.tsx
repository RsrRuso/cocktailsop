import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFifoWorkspace } from "@/hooks/useFifoWorkspace";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Share2, Copy, Check, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";

const anySupabase = supabase as any;

export default function FifoQRAccessCode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useFifoWorkspace();
  const [qrCode, setQrCode] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  useEffect(() => {
    if (currentWorkspace) {
      setSelectedWorkspaceId(currentWorkspace.id);
      fetchOrCreateQRCode(currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const fetchOrCreateQRCode = async (workspaceId: string) => {
    if (!user || !workspaceId) return;

    try {
      // Check if QR code already exists for this workspace
      const { data: existing } = await anySupabase
        .from('qr_codes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('qr_type', 'fifo_workspace_access')
        .single();

      if (existing) {
        setQrCode(existing);
      } else {
        // Create new QR code
        const { data: newQR, error } = await anySupabase
          .from('qr_codes')
          .insert({
            workspace_id: workspaceId,
            qr_type: 'fifo_workspace_access',
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        setQrCode(newQR);
        toast.success("FIFO workspace QR code generated");
      }
    } catch (error) {
      console.error('Error with QR code:', error);
      toast.error("Failed to generate QR code");
    }
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    fetchOrCreateQRCode(workspaceId);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `fifo-workspace-qr-${selectedWorkspaceId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const copyLink = () => {
    if (!selectedWorkspaceId) return;
    const link = `${window.location.origin}/fifo-request-access?workspace=${selectedWorkspaceId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareQRCode = async () => {
    if (!selectedWorkspaceId) return;
    const link = `${window.location.origin}/fifo-request-access?workspace=${selectedWorkspaceId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join FIFO Workspace',
          text: 'Scan this QR code to request access to the FIFO inventory workspace',
          url: link
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyLink();
    }
  };

  const exportAccessRequestsPDF = async () => {
    if (!selectedWorkspaceId) {
      toast.error("Please select a workspace");
      return;
    }

    try {
      const workspace = workspaces.find(w => w.id === selectedWorkspaceId);

      const { data: accessRequests, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('workspace_id', selectedWorkspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!workspace || !accessRequests || accessRequests.length === 0) {
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

        <h1 className="text-3xl font-bold mb-6">FIFO Workspace Access</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select FIFO Workspace</CardTitle>
            <CardDescription>
              Generate a link for members to request access to your FIFO workspace
            </CardDescription>
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

        {qrCode && (
          <Card>
            <CardHeader>
              <CardTitle>Workspace Access Code</CardTitle>
              <CardDescription>
                Share this code with team members to allow them to request access to your FIFO workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center p-8 bg-white rounded-lg">
                <QRCodeSVG
                  id="qr-code"
                  value={`${window.location.origin}/fifo-request-access?workspace=${selectedWorkspaceId}`}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={downloadQRCode} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={shareQRCode} variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button onClick={copyLink} variant="outline" className="w-full">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => navigate(`/fifo-request-access?workspace=${selectedWorkspaceId}`)}
                  variant="default"
                  className="w-full"
                >
                  Test Request Flow
                </Button>
              </div>

              <div className="text-sm text-muted-foreground text-center">
                When someone scans this code, they'll be taken directly to a request form to join your FIFO workspace.
                You'll receive their request and can approve or deny it from the Approvals page.
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
