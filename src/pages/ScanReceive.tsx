import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PackageOpen, Loader2, AlertCircle, Search } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

export default function ScanReceive() {
  const { qrCodeId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receivingContext, setReceivingContext] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [expirationDate, setExpirationDate] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [itemSearch, setItemSearch] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchReceivingContext(user.id);
    });
  }, [qrCodeId, navigate]);

  const fetchReceivingContext = async (userId: string) => {
    setLoading(true);
    
    const { data: context, error: contextError } = await supabase
      .from("receiving_qr_codes" as any)
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
    
    const { data: toStore } = await supabase
      .from("stores")
      .select("id, name, workspace_id")
      .eq("id", contextData.to_store_id)
      .maybeSingle();

    setReceivingContext({ ...contextData, toStoreName: toStore?.name });

    // Fetch all stores for selection
    let storesQuery = supabase
      .from("stores")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (toStore?.workspace_id) {
      storesQuery = storesQuery.eq("workspace_id", toStore.workspace_id);
    } else {
      storesQuery = storesQuery.is("workspace_id", null);
    }

    const { data: storesData } = await storesQuery.order("name");
    setStores(storesData || []);
    
    // Pre-select the store from QR code
    if (storesData && storesData.length > 0) {
      setSelectedStoreId(contextData.to_store_id);
    }

    // Fetch all items for this user & same workspace context
    let itemsQuery = supabase
      .from("items")
      .select("*")
      .eq("user_id", userId);

    if (toStore?.workspace_id) {
      itemsQuery = itemsQuery.eq("workspace_id", toStore.workspace_id);
    } else {
      itemsQuery = itemsQuery.is("workspace_id", null);
    }

    const { data: itemsData, error: itemsError } = await itemsQuery.order("name");

    if (itemsError) {
      console.error("[ScanReceive] Error fetching items:", itemsError);
    }

    console.log(`[ScanReceive] Fetched ${itemsData?.length || 0} items`);
    setItems(itemsData || []);

    if (itemsData && itemsData.length > 0) {
      setSelectedItemId(itemsData[0].id);
    }

    setLoading(false);
  };

  const handleReceive = async () => {
    if (!user || !receivingContext) {
      toast.error("Session expired. Please scan the QR code again.");
      return;
    }

    if (!selectedStoreId || !selectedItemId || !quantity || !expirationDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setSubmitting(true);

    try {
      const selectedItem = items.find(i => i.id === selectedItemId);
      
      // Check for existing inventory with same item and expiration
      const { data: existingInventory } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_id", selectedStoreId)
        .eq("item_id", selectedItemId)
        .eq("expiration_date", expirationDate)
        .eq("batch_number", batchNumber || "")
        .maybeSingle();

      let inventoryId: string;

      if (existingInventory) {
        // Update existing inventory
        const newQuantity = existingInventory.quantity + quantityNum;
        
        const { data: updated, error: updateError } = await supabase
          .from("inventory")
          .update({ quantity: newQuantity })
          .eq("id", existingInventory.id)
          .select()
          .single();

        if (updateError) throw updateError;
        inventoryId = updated.id;

        console.log(`[ScanReceive] Updated inventory ${inventoryId}: ${existingInventory.quantity} -> ${newQuantity}`);
      } else {
        // Create new inventory record
        const { data: newInventory, error: insertError } = await supabase
          .from("inventory")
          .insert({
            workspace_id: receivingContext.workspace_id || null,
            user_id: user.id,
            store_id: selectedStoreId,
            item_id: selectedItemId,
            quantity: quantityNum,
            expiration_date: expirationDate,
            batch_number: batchNumber || null,
            notes: notes || null,
            received_date: new Date().toISOString(),
            status: "active"
          })
          .select()
          .single();

        if (insertError) throw insertError;
        inventoryId = newInventory.id;

        console.log(`[ScanReceive] Created new inventory ${inventoryId} with quantity ${quantityNum}`);
      }

      // Log the receiving activity
      await supabase.from("inventory_activity_log").insert({
        workspace_id: receivingContext.workspace_id || null,
        user_id: user.id,
        store_id: selectedStoreId,
        inventory_id: inventoryId,
        action_type: "received",
        quantity_after: existingInventory 
          ? existingInventory.quantity + quantityNum 
          : quantityNum,
        quantity_before: existingInventory?.quantity || 0,
        details: {
          item_id: selectedItemId,
          item_name: selectedItem?.name,
          received_quantity: quantityNum,
          expiration_date: expirationDate,
          batch_number: batchNumber || null,
          notes: notes || null,
          qr_code_id: qrCodeId
        }
      });

      toast.success(`Successfully received ${quantityNum} units of ${selectedItem?.name}`);
      
      // Reset form
      setQuantity("1");
      setExpirationDate("");
      setBatchNumber("");
      setNotes("");
      
    } catch (error: any) {
      console.error("[ScanReceive] Error:", error);
      toast.error(error.message || "Failed to receive items");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <TopNav />
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading receiving details...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!receivingContext) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <div className="container mx-auto p-4 pt-20">
          <Card className="p-6 max-w-2xl mx-auto text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid QR Code</h2>
            <p className="text-muted-foreground mb-4">
              This QR code is invalid or expired. Please generate a new receiving QR code.
            </p>
            <Button onClick={() => navigate("/transfer-qr")}>
              Generate New QR Code
            </Button>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 pt-20">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <PackageOpen className="w-8 h-8 text-emerald-500" />
            <div>
              <h1 className="text-2xl font-bold">Receive Items</h1>
              <p className="text-sm text-muted-foreground">
                Select destination store and items to receive
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                📦 Use this form to record items being received into the store
              </p>
            </div>

            <div>
              <Label>Select Destination Store *</Label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md bg-background z-50"
                disabled={stores.length === 0 || submitting}
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
              <Label>Search & Select Item *</Label>
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
                  <div className="text-center text-muted-foreground py-4">No items available</div>
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
                    .map((item) => (
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
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>

            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="mt-2"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>Expiration Date *</Label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="mt-2"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>Batch Number (Optional)</Label>
              <Input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Enter batch number"
                className="mt-2"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                className="mt-2"
                disabled={submitting}
              />
            </div>

            <Button
              onClick={handleReceive}
              className="w-full"
              size="lg"
              disabled={submitting || !selectedStoreId || !selectedItemId || !quantity || !expirationDate}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Receiving...
                </>
              ) : (
                <>
                  <PackageOpen className="w-4 h-4 mr-2" />
                  Receive Items
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
