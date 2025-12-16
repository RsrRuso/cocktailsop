import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Share2, Copy, Check, Package, Truck, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export default function ProcurementQRAccess() {
  const navigate = useNavigate();
  const [copiedPO, setCopiedPO] = useState(false);
  const [copiedReceiving, setCopiedReceiving] = useState(false);

  const baseUrl = window.location.origin;
  const poUrl = `${baseUrl}/po.html`;
  const receivingUrl = `${baseUrl}/receiving.html`;

  const downloadQRCode = (id: string, filename: string) => {
    const svg = document.getElementById(id);
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
      downloadLink.download = filename;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
    toast.success("QR Code downloaded!");
  };

  const copyLink = (url: string, type: 'po' | 'receiving') => {
    navigator.clipboard.writeText(url);
    if (type === 'po') {
      setCopiedPO(true);
      setTimeout(() => setCopiedPO(false), 2000);
    } else {
      setCopiedReceiving(true);
      setTimeout(() => setCopiedReceiving(false), 2000);
    }
    toast.success("Link copied!");
  };

  const shareQRCode = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Install ${title} app`,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Staff App Access</h1>
            <p className="text-xs text-muted-foreground">Generate QR codes for staff installation</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Purchase Orders QR */}
        <Card className="border-amber-500/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2">
              <Package className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle className="text-lg">Purchase Orders App</CardTitle>
            <CardDescription>Staff can create and manage purchase orders</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <QRCodeSVG
                  id="po-qr-code"
                  value={poUrl}
                  size={160}
                  level="H"
                  includeMargin
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs font-mono break-all text-muted-foreground">{poUrl}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2"
                onClick={() => downloadQRCode('po-qr-code', 'sv-po-qr.png')}
              >
                <Download className="h-4 w-4 mb-1" />
                <span className="text-xs">Download</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2"
                onClick={() => shareQRCode(poUrl, 'SV Purchase Orders')}
              >
                <Share2 className="h-4 w-4 mb-1" />
                <span className="text-xs">Share</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2"
                onClick={() => copyLink(poUrl, 'po')}
              >
                {copiedPO ? (
                  <Check className="h-4 w-4 mb-1 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mb-1" />
                )}
                <span className="text-xs">{copiedPO ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Receiving QR */}
        <Card className="border-emerald-500/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
              <Truck className="h-6 w-6 text-emerald-500" />
            </div>
            <CardTitle className="text-lg">Receiving App</CardTitle>
            <CardDescription>Staff can receive and track deliveries</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <QRCodeSVG
                  id="receiving-qr-code"
                  value={receivingUrl}
                  size={160}
                  level="H"
                  includeMargin
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-2 text-center">
              <p className="text-xs font-mono break-all text-muted-foreground">{receivingUrl}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2"
                onClick={() => downloadQRCode('receiving-qr-code', 'sv-receiving-qr.png')}
              >
                <Download className="h-4 w-4 mb-1" />
                <span className="text-xs">Download</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2"
                onClick={() => shareQRCode(receivingUrl, 'SV Receiving')}
              >
                <Share2 className="h-4 w-4 mb-1" />
                <span className="text-xs">Share</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-2"
                onClick={() => copyLink(receivingUrl, 'receiving')}
              >
                {copiedReceiving ? (
                  <Check className="h-4 w-4 mb-1 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mb-1" />
                )}
                <span className="text-xs">{copiedReceiving ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              How staff install apps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Staff scans QR code with phone camera</li>
              <li>Opens the link in browser</li>
              <li>Taps "Add to Home Screen" (iOS: Share → Add to Home Screen)</li>
              <li>Opens app from home screen</li>
              <li>Logs in with their assigned PIN code</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
