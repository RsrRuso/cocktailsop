import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default function TransferQRGenerator() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [qrCodeId, setQrCodeId] = useState<string>("");
  const [fromStoreId, setFromStoreId] = useState<string>("");
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchStores(user.id);
      generateNewCode();
    });
  }, [navigate]);

  const fetchStores = async (userId: string) => {
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    setStores(data || []);
    if (data && data.length > 0) {
      setFromStoreId(data[0].id);
    }
  };

  const generateNewCode = () => {
    const newId = Math.random().toString(36).substring(2, 15);
    setQrCodeId(newId);
  };

  const qrUrl = `${window.location.origin}/scan-transfer/${qrCodeId}`;
  const qrPath = `/scan-transfer/${qrCodeId}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    toast.success("URL copied to clipboard");
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(qrPath);
    toast.success("Path copied to clipboard");
  };

  const handleSaveTransferContext = async () => {
    if (!fromStoreId) {
      toast.error("Please select a store");
      return;
    }

    const { error } = await supabase
      .from("transfer_qr_codes" as any)
      .upsert({
        qr_code_id: qrCodeId,
        from_store_id: fromStoreId,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

    if (error) {
      toast.error("Failed to save transfer context");
      return;
    }

    toast.success("Transfer QR code ready to use");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 pt-20">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <QrCode className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Generate Transfer QR Code</h1>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Select Source Store</Label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md bg-background"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={handleSaveTransferContext} className="w-full">
              Save Transfer Context
            </Button>

            {qrCodeId && (
              <>
                <div className="flex justify-center p-8 bg-white rounded-lg">
                  <QRCodeSVG value={qrUrl} size={256} />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">QR Code URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={qrUrl} readOnly className="flex-1" />
                      <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">QR Code Path</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={qrPath} readOnly className="flex-1" />
                      <Button variant="outline" size="icon" onClick={handleCopyPath}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={generateNewCode} className="flex-1">
                    Generate New Code
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/scan-transfer/${qrCodeId}`)}
                    className="flex-1"
                  >
                    Test Scan
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
