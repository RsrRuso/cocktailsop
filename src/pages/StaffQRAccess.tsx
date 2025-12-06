import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Download, Share2, Copy, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const StaffQRAccess = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [staffUrl, setStaffUrl] = useState("");

  useEffect(() => {
    // Generate the staff installation URL
    const baseUrl = window.location.origin;
    setStaffUrl(`${baseUrl}/staff.html`);
  }, []);

  const downloadQRCode = () => {
    const svg = document.getElementById("staff-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = "white";
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, 512, 512);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = "sv-staff-pos-qr.png";
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success("QR Code downloaded!");
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(staffUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SV Staff POS Access",
          text: "Scan this QR code or use this link to install SV Staff POS",
          url: staffUrl,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-lg mx-auto px-4 pt-20 pb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/lab-ops")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to LAB Ops
        </Button>

        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Staff POS Access QR</CardTitle>
            <CardDescription>
              Staff scan this QR code to install the SV Staff POS app on their phones
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <QRCodeSVG
                  id="staff-qr-code"
                  value={staffUrl}
                  size={200}
                  level="H"
                  includeMargin
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>

            {/* URL Display */}
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Installation URL</p>
              <p className="text-sm font-mono break-all">{staffUrl}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="flex-col h-auto py-3"
                onClick={downloadQRCode}
              >
                <Download className="h-5 w-5 mb-1" />
                <span className="text-xs">Download</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex-col h-auto py-3"
                onClick={shareQRCode}
              >
                <Share2 className="h-5 w-5 mb-1" />
                <span className="text-xs">Share</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex-col h-auto py-3"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="h-5 w-5 mb-1 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5 mb-1" />
                )}
                <span className="text-xs">{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">How staff install:</h4>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Staff scans QR code with phone camera</li>
                <li>Opens the link in browser</li>
                <li>Taps "Add to Home Screen" (iOS: Share → Add to Home Screen)</li>
                <li>Opens SV Staff POS from home screen</li>
                <li>Logs in with their PIN code</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default StaffQRAccess;
