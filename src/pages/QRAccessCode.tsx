import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, TestTube2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const QRAccessCode = () => {
  const navigate = useNavigate();
  const [qrCodeId, setQrCodeId] = useState(crypto.randomUUID());

  const generateNewCode = () => {
    setQrCodeId(crypto.randomUUID());
  };

  const handleTestScan = () => {
    navigate(`/scan-access/${qrCodeId}`);
  };

  const qrCodeUrl = `${window.location.origin}/scan-access/${qrCodeId}`;
  const scanPath = `/scan-access/${qrCodeId}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 container mx-auto px-4 py-4 pb-20 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-xl">Inventory Access QR Code</CardTitle>
                <CardDescription>
                  Share this QR code with staff who need access to inventory management
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4 pb-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG value={qrCodeUrl} size={200} />
            </div>
            <div className="text-center space-y-2 w-full">
              <p className="text-sm text-muted-foreground">
                Staff can scan this code to request access
              </p>
              <div className="space-y-2">
                <div className="bg-muted p-2 rounded-md">
                  <p className="text-xs font-semibold mb-1">Full URL:</p>
                  <p className="text-xs font-mono break-all">{qrCodeUrl}</p>
                </div>
                <div className="bg-muted p-2 rounded-md">
                  <p className="text-xs font-semibold mb-1">Or use this path:</p>
                  <p className="text-xs font-mono break-all">{scanPath}</p>
                  <p className="text-xs text-muted-foreground mt-1">Navigate to this path in your app</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(qrCodeUrl);
                      toast.success("Full URL copied!");
                    }}
                    className="flex-1"
                  >
                    Copy Full URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(scanPath);
                      toast.success("Path copied!");
                    }}
                    className="flex-1"
                  >
                    Copy Path
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleTestScan}
                  className="w-full"
                >
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Test Scan (Simulate Employee Access)
                </Button>
              </div>
            </div>
            <Button onClick={generateNewCode} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Code
            </Button>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default QRAccessCode;
