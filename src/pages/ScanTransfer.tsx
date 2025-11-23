import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, PackageOpen, AlertCircle } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default function ScanTransfer() {
  const { qrCodeId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transferContext, setTransferContext] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const [toStoreId, setToStoreId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchTransferContext(user.id);
    });
  }, [qrCodeId, navigate]);

  const fetchTransferContext = async (userId: string) => {
    setLoading(true);
    
    const { data: context, error: contextError } = await supabase
      .from("transfer_qr_codes" as any)
      .select("*")
      .eq("qr_code_id", qrCodeId)
      .single();

    if (contextError || !context) {
      console.error("QR code lookup error:", contextError);
      toast.error("Invalid or expired QR code. Please generate a new one.");
      setLoading(false);
      return;
    }

    const contextData = context as any;
    
    const { data: fromStore } = await supabase
      .from("stores")
      .select("name")
      .eq("id", contextData.from_store_id)
      .single();

    setTransferContext({ ...contextData, fromStoreName: fromStore?.name });

    const { data: storesData } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId)
      .neq("id", contextData.from_store_id)
      .order("name");

    // Filter to show only glassware-related stores
    const glasswareStores = (storesData || []).filter(
      store => store.name.toLowerCase().includes("glass")
    );

    setStores(glasswareStores);
    if (glasswareStores.length > 0) {
      setToStoreId(glasswareStores[0].id);
    }

    const { data: itemsData } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("name");

    // Filter to show only glassware items
    const glasswareItems = (itemsData || []).filter(
      item => item.name.toLowerCase().includes("glass")
    );

    setItems(glasswareItems);
    if (glasswareItems.length > 0) {
      setSelectedItemId(glasswareItems[0].id);
    }

    const { data: inventoryData } = await supabase
      .from("inventory")
      .select("*, items(*)")
      .eq("store_id", contextData.from_store_id)
      .gt("quantity", 0);

    setInventory(inventoryData || []);

    setLoading(false);
  };

  const handleTransfer = async () => {
    if (!selectedItemId || !toStoreId || !quantity) {
      toast.error("Please fill all fields");
      return;
    }

    const quantityNum = parseInt(quantity);
    if (quantityNum <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const availableInventory = inventory.find(inv => inv.item_id === selectedItemId);
    if (!availableInventory || availableInventory.quantity < quantityNum) {
      toast.error("Insufficient inventory");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("inventory_transfers")
      .insert({
        from_store_id: transferContext.from_store_id,
        to_store_id: toStoreId,
        inventory_id: availableInventory.id,
        quantity: quantityNum,
        notes,
        user_id: user.id,
        status: "completed",
        transfer_date: new Date().toISOString()
      });

    if (error) {
      toast.error("Transfer failed");
      setSubmitting(false);
      return;
    }

    await supabase
      .from("inventory")
      .update({ quantity: availableInventory.quantity - quantityNum })
      .eq("id", availableInventory.id);

    const { data: existingToInventory } = await supabase
      .from("inventory")
      .select("*")
      .eq("store_id", toStoreId)
      .eq("item_id", selectedItemId)
      .single();

    if (existingToInventory) {
      await supabase
        .from("inventory")
        .update({ quantity: existingToInventory.quantity + quantityNum })
        .eq("id", existingToInventory.id);
    } else {
      await supabase
        .from("inventory")
        .insert({
          store_id: toStoreId,
          item_id: selectedItemId,
          quantity: quantityNum,
          expiration_date: availableInventory.expiration_date,
          user_id: user.id
        });
    }

    toast.success("Transfer completed successfully");
    setQuantity("1");
    setNotes("");
    fetchTransferContext(user.id);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transferContext) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Invalid Transfer QR Code</p>
          <p className="text-sm text-muted-foreground mb-4">
            This QR code doesn't exist or has expired. Please generate a new one from Store Management.
          </p>
          <Button onClick={() => navigate("/transfer-qr")} className="w-full">
            Generate New QR Code
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 pt-20">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <ArrowLeftRight className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Transfer Items</h1>
              <p className="text-sm text-muted-foreground">
                From: {transferContext.fromStoreName}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Select Glassware Item</Label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md bg-background"
                disabled={items.length === 0}
              >
                {items.length === 0 ? (
                  <option value="">No glassware items available</option>
                ) : (
                  items.map((item) => {
                    const inv = inventory.find(i => i.item_id === item.id);
                    return (
                      <option key={item.id} value={item.id}>
                        {item.name} {inv ? `(Available: ${inv.quantity})` : "(Not in stock)"}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <Label>To Glassware Store</Label>
              <select
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md bg-background"
                disabled={stores.length === 0}
              >
                {stores.length === 0 ? (
                  <option value="">No glassware stores available</option>
                ) : (
                  stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this transfer..."
                className="mt-2"
              />
            </div>

            <Button 
              onClick={handleTransfer} 
              className="w-full"
              disabled={submitting || inventory.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Transfer...
                </>
              ) : (
                <>
                  <PackageOpen className="w-4 h-4 mr-2" />
                  Complete Transfer
                </>
              )}
            </Button>

            {inventory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                No glassware items available in source store
              </p>
            )}

            {items.length === 0 && (
              <p className="text-sm text-destructive text-center mt-2">
                No glassware items found in master list
              </p>
            )}

            {stores.length === 0 && (
              <p className="text-sm text-destructive text-center mt-2">
                No glassware destination stores available
              </p>
            )}
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
