import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const QRAccessCode = () => {
  const [qrCodeId, setQrCodeId] = useState(crypto.randomUUID());

  const generateNewCode = () => {
    setQrCodeId(crypto.randomUUID());
  };

  const qrCodeUrl = `${window.location.origin}/scan-access/${qrCodeId}`;
  const scanPath = `/scan-access/${qrCodeId}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Access QR Code</CardTitle>
            <CardDescription>
              Share this QR code with staff who need access to inventory management
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="bg-white p-6 rounded-lg">
              <QRCodeSVG value={qrCodeUrl} size={256} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Staff can scan this code to request access
              </p>
              <div className="space-y-2">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs font-semibold mb-1">Full URL:</p>
                  <p className="text-xs font-mono break-all">{qrCodeUrl}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs font-semibold mb-1">Or use this path:</p>
                  <p className="text-xs font-mono break-all">{scanPath}</p>
                  <p className="text-xs text-muted-foreground mt-1">Navigate to this path in your app</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(qrCodeUrl);
                    toast.success("Full URL copied!");
                  }}
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
                >
                  Copy Path
                </Button>
              </div>
            </div>
            <Button onClick={generateNewCode} variant="outline">
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
