import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, Store as StoreIcon, PackageOpen, ArrowLeft } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default function TransferQRGenerator() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [user, setUser] = useState<any>(null);
  
  // Transfer QR state
  const [transferQrCodeId, setTransferQrCodeId] = useState<string>("");
  const [fromStoreId, setFromStoreId] = useState<string>("");
  
  // Receiving QR state
  const [receivingQrCodeId, setReceivingQrCodeId] = useState<string>("");
  const [toStoreId, setToStoreId] = useState<string>("");
  
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
      const newTransferCode = generateNewTransferCode();
      const newReceivingCode = generateNewReceivingCode();
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    if (transferQrCodeId && fromStoreId && user) {
      autoSaveTransferQRCode(transferQrCodeId, fromStoreId);
    }
  }, [transferQrCodeId, fromStoreId, user]);

  useEffect(() => {
    if (receivingQrCodeId && toStoreId && user) {
      autoSaveReceivingQRCode(receivingQrCodeId, toStoreId);
    }
  }, [receivingQrCodeId, toStoreId, user]);

  const fetchStores = async (userId: string) => {
    let storesQuery = supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (currentWorkspace?.id) {
      storesQuery = storesQuery.eq("workspace_id", currentWorkspace.id);
    } else {
      storesQuery = storesQuery.is("workspace_id", null);
    }

    const { data, error } = await storesQuery.order("name");
    
    if (error) {
      console.error("[TransferQR] Error fetching stores:", error);
      toast.error("Failed to load stores");
      return;
    }

    console.log(`[TransferQR] Fetched ${data?.length || 0} stores`, data?.map(s => s.name));
    setStores(data || []);
    if (data && data.length > 0) {
      setFromStoreId(data[0].id);
      setToStoreId(data[0].id);
    }
  };

  const generateNewTransferCode = () => {
    const newId = 'T-' + Math.random().toString(36).substring(2, 15);
    setTransferQrCodeId(newId);
    return newId;
  };

  const generateNewReceivingCode = () => {
    const newId = 'R-' + Math.random().toString(36).substring(2, 15);
    setReceivingQrCodeId(newId);
    return newId;
  };

  const autoSaveTransferQRCode = async (codeId: string, storeId: string) => {
    if (!user || !storeId) return;

    const { error } = await supabase
      .from("transfer_qr_codes" as any)
      .upsert({
        qr_code_id: codeId,
        from_store_id: storeId,
        user_id: user.id,
        workspace_id: currentWorkspace?.id || null,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      toast.success("Transfer QR code saved");
    }
  };

  const autoSaveReceivingQRCode = async (codeId: string, storeId: string) => {
    if (!user || !storeId) return;

    const { error } = await supabase
      .from("receiving_qr_codes" as any)
      .upsert({
        qr_code_id: codeId,
        to_store_id: storeId,
        user_id: user.id,
        workspace_id: currentWorkspace?.id || null,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      toast.success("Receiving QR code saved");
    }
  };

  const transferQrUrl = `https://cocktailsop.com/scan-transfer/${transferQrCodeId}`;
  const transferQrPath = `/scan-transfer/${transferQrCodeId}`;
  
  const receivingQrUrl = `https://cocktailsop.com/scan-receive/${receivingQrCodeId}`;
  const receivingQrPath = `/scan-receive/${receivingQrCodeId}`;

  const handleCopyTransferUrl = () => {
    navigator.clipboard.writeText(transferQrUrl);
    toast.success("URL copied to clipboard");
  };

  const handleCopyTransferPath = () => {
    navigator.clipboard.writeText(transferQrPath);
    toast.success("Path copied to clipboard");
  };

  const handleCopyReceivingUrl = () => {
    navigator.clipboard.writeText(receivingQrUrl);
    toast.success("URL copied to clipboard");
  };

  const handleCopyReceivingPath = () => {
    navigator.clipboard.writeText(receivingQrPath);
    toast.success("Path copied to clipboard");
  };

  const handleGenerateNewTransfer = () => {
    const newCode = generateNewTransferCode();
    if (fromStoreId && user) {
      autoSaveTransferQRCode(newCode, fromStoreId);
    }
  };

  const handleGenerateNewReceiving = () => {
    const newCode = generateNewReceivingCode();
    if (toStoreId && user) {
      autoSaveReceivingQRCode(newCode, toStoreId);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 pt-20">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <QrCode className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Transfer Generator</h1>
          </div>

          <Tabs defaultValue="transfer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
              <TabsTrigger value="receiving">Receiving</TabsTrigger>
            </TabsList>

            {/* Transfer Tab */}
            <TabsContent value="transfer" className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <StoreIcon className="w-5 h-5 text-primary" />
                  <p className="font-semibold">Transfer Code</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate codes to transfer items from one store to another
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

              {transferQrCodeId && (
                <>
                  <div className="flex justify-center p-8 bg-white rounded-lg">
                    <QRCodeSVG value={transferQrUrl} size={256} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">QR Code URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={transferQrUrl} readOnly className="flex-1" />
                        <Button variant="outline" size="icon" onClick={handleCopyTransferUrl}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">QR Code Path</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={transferQrPath} readOnly className="flex-1" />
                        <Button variant="outline" size="icon" onClick={handleCopyTransferPath}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerateNewTransfer} className="flex-1">
                      Generate New Code
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/scan-transfer/${transferQrCodeId}`)}
                      className="flex-1"
                    >
                      Test Scan
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Receiving QR Tab */}
            <TabsContent value="receiving" className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <PackageOpen className="w-5 h-5 text-emerald-500" />
                  <p className="font-semibold">Receiving QR Code</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate QR codes to receive items directly into a store
                </p>
              </div>

              <div>
                <Label>Select Destination Store</Label>
                <select
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
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

              {receivingQrCodeId && (
                <>
                  <div className="flex justify-center p-8 bg-white rounded-lg">
                    <QRCodeSVG value={receivingQrUrl} size={256} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">QR Code URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={receivingQrUrl} readOnly className="flex-1" />
                        <Button variant="outline" size="icon" onClick={handleCopyReceivingUrl}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">QR Code Path</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={receivingQrPath} readOnly className="flex-1" />
                        <Button variant="outline" size="icon" onClick={handleCopyReceivingPath}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleGenerateNewReceiving} className="flex-1">
                      Generate New Code
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/scan-receive/${receivingQrCodeId}`)}
                      className="flex-1"
                    >
                      Test Scan
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
