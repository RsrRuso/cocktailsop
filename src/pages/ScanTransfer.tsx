import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, PackageOpen, AlertCircle, Search } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default function ScanTransfer() {
  const { qrCodeId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transferContext, setTransferContext] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [fromStores, setFromStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const [fromStoreId, setFromStoreId] = useState<string>("");
  const [toStoreId, setToStoreId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [itemSearch, setItemSearch] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = "https://cocktailsop.com";
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
      .select("id, name, workspace_id")
      .eq("id", contextData.from_store_id)
      .maybeSingle();

    setTransferContext({ ...contextData, fromStoreName: fromStore?.name });

    console.log(
      "[ScanTransfer] Using from store",
      { id: fromStore?.id, name: fromStore?.name, workspace_id: fromStore?.workspace_id ?? "personal" }
    );

    // Fetch all active stores for this user & same workspace context as the QR code
    let storesQuery = supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (fromStore?.workspace_id) {
      storesQuery = storesQuery.eq("workspace_id", fromStore.workspace_id);
    } else {
      storesQuery = storesQuery.is("workspace_id", null);
    }

    const { data: allStoresData, error: storesError } = await storesQuery.order("name");

    if (storesError) {
      console.error("[ScanTransfer] Error fetching stores:", storesError);
    }

    console.log(
      `[ScanTransfer] Fetched ${allStoresData?.length || 0} stores`,
      allStoresData?.map((s) => s.name)
    );

    setFromStores(allStoresData || []);
    setFromStoreId(contextData.from_store_id);

    // Fetch destination stores (exclude selected from store)
    const destStores = (allStoresData || []).filter(
      store => store.id !== contextData.from_store_id
    );

    setStores(destStores);
    if (destStores.length > 0) {
      setToStoreId(destStores[0].id);
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

  // Update destination stores when from store changes
  useEffect(() => {
    if (fromStoreId && fromStores.length > 0) {
      const filtered = fromStores.filter(store => store.id !== fromStoreId);
      setStores(filtered);
      if (filtered.length > 0 && !filtered.find(s => s.id === toStoreId)) {
        setToStoreId(filtered[0].id);
      }

      // Update inventory for selected from store
      supabase
        .from("inventory")
        .select("*, items(*)")
        .eq("store_id", fromStoreId)
        .gt("quantity", 0)
        .then(({ data }) => {
          setInventory(data || []);
        });
    }
  }, [fromStoreId, fromStores]);

  const handleTransfer = async () => {
    if (!selectedItemId || !toStoreId || !quantity || !fromStoreId) {
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
        from_store_id: fromStoreId,
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
      .maybeSingle();

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

    toast.success("Transfer completed! Redirecting...");
    
    // Redirect to store management after 1 second
    setTimeout(() => {
      navigate("/store-management");
    }, 1000);
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
              <h1 className="text-2xl font-bold">Transfer Glassware Items</h1>
              <p className="text-sm text-muted-foreground">
                Select source and destination stores
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>From Store ({fromStores.length} available)</Label>
              <select
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md bg-background"
                disabled={fromStores.length === 0}
              >
                {fromStores.length === 0 ? (
                  <option value="">No stores available</option>
                ) : (
                  fromStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label>Search & Select Glassware Item</Label>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search items by name or brand..."
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md bg-background p-2">
                {items.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No glassware items available</div>
                ) : (
                  items
                    .filter((item) => {
                      if (!itemSearch) return true;
                      const search = itemSearch.toLowerCase();
                      return (
                        item.name.toLowerCase().includes(search) ||
                        (item.brand && item.brand.toLowerCase().includes(search))
                      );
                    })
                    .map((item) => {
                      const inv = inventory.find(i => i.item_id === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                          disabled={submitting}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:border-primary ${
                            selectedItemId === item.id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border bg-background'
                          }`}
                        >
                          {item.photo_url ? (
                            <img 
                              src={item.photo_url} 
                              alt={item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <PackageOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{item.name}</div>
                            {item.brand && (
                              <div className="text-sm text-muted-foreground">{item.brand}</div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {inv ? `Available: ${inv.quantity}` : "Not in stock"}
                            </div>
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            <div>
              <Label>To Store ({stores.length} available)</Label>
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
                No destination stores available
              </p>
            )}
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
