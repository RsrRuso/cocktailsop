import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, Store as StoreIcon } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default function TransferQRGenerator() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
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
    });
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchStores(user.id);
      const newCode = generateNewCode();
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    if (qrCodeId && fromStoreId && user) {
      autoSaveQRCode(qrCodeId, fromStoreId);
    }
  }, [qrCodeId, fromStoreId, user]);

  const fetchStores = async (userId: string) => {
    let storesQuery = supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId);

    if (currentWorkspace?.id) {
      storesQuery = storesQuery.eq("workspace_id", currentWorkspace.id);
    } else {
      storesQuery = storesQuery.is("workspace_id", null);
    }

    const { data, error } = await storesQuery.order("name");
    
    if (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
      return;
    }

    console.log("Fetched stores:", data);
    setStores(data || []);
    if (data && data.length > 0) {
      setFromStoreId(data[0].id);
    }
  };

  const generateNewCode = () => {
    const newId = Math.random().toString(36).substring(2, 15);
    setQrCodeId(newId);
    return newId;
  };

  const autoSaveQRCode = async (codeId: string, storeId: string) => {
    if (!user || !storeId) return;

    const { error } = await supabase
      .from("transfer_qr_codes" as any)
      .upsert({
        qr_code_id: codeId,
        from_store_id: storeId,
        user_id: user.id,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      toast.success("Transfer QR code saved");
    }
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

  const handleGenerateNew = () => {
    const newCode = generateNewCode();
    if (fromStoreId && user) {
      autoSaveQRCode(newCode, fromStoreId);
    }
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
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <StoreIcon className="w-5 h-5 text-primary" />
                <p className="font-semibold">Available Stores: {stores.length}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {stores.length === 0 
                  ? "No stores found. Create stores in Store Management first." 
                  : "Select a source store to generate transfer QR code"}
              </p>
            </div>

            <div>
              <Label>Select Source Store</Label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md bg-background"
                disabled={stores.length === 0}
              >
                {stores.length === 0 ? (
                  <option value="">No stores available</option>
                ) : (
                  stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                QR code auto-saves when you select a store
              </p>
            </div>

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
                  <Button variant="outline" onClick={handleGenerateNew} className="flex-1">
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
