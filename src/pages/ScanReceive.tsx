import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PackageOpen, Loader2, AlertCircle, Search, Download, FileText } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import jsPDF from "jspdf";
import QRCode from "qrcode";

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
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [itemSearch, setItemSearch] = useState<string>("");
  const [lastReceive, setLastReceive] = useState<any>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = "https://cocktailsop.com";
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

    if (!selectedStoreId || !selectedItemId || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const defaultExpirationDate = new Date();
    defaultExpirationDate.setFullYear(defaultExpirationDate.getFullYear() + 1);
    const expirationDate = defaultExpirationDate.toISOString().split('T')[0];

    if (batchMode) {
      // Add to batch queue
      const selectedItem = items.find(i => i.id === selectedItemId);
      const selectedStore = stores.find(s => s.id === selectedStoreId);
      
      setBatchQueue(prev => [...prev, {
        selectedStoreId,
        selectedItemId,
        quantity: quantityNum,
        batchNumber: batchNumber || null,
        notes: notes || null,
        expirationDate,
        store: selectedStore?.name || "Unknown",
        item: selectedItem?.name || "Unknown"
      }]);
      
      toast.success(`Added to batch (${batchQueue.length + 1} items)`);
      setQuantity("1");
      setBatchNumber("");
      setNotes("");
      return;
    }

    setSubmitting(true);

    try {
      const selectedItem = items.find(i => i.id === selectedItemId);
      
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
        const newQuantity = existingInventory.quantity + quantityNum;
        
        const { data: updated, error: updateError } = await supabase
          .from("inventory")
          .update({ quantity: newQuantity })
          .eq("id", existingInventory.id)
          .select()
          .single();

        if (updateError) throw updateError;
        inventoryId = updated.id;
      } else {
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
      }

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
      
      const selectedStore = stores.find(s => s.id === selectedStoreId);
      
      setLastReceive({
        id: `RCV-${Date.now()}`,
        date: new Date().toISOString(),
        store: selectedStore?.name || "Unknown",
        item: selectedItem?.name || "Unknown",
        quantity: quantityNum,
        batchNumber: batchNumber || "N/A",
        expirationDate: expirationDate,
        notes: notes,
        user: user.email
      });
      
      setQuantity("1");
      setBatchNumber("");
      setNotes("");
      setSubmitting(false);
      
    } catch (error: any) {
      console.error("[ScanReceive] Error:", error);
      toast.error(error.message || "Failed to receive items");
      setSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (batchQueue.length === 0) {
      toast.error("No items in batch");
      return;
    }

    setSubmitting(true);
    const results = [];

    try {
      for (const receive of batchQueue) {
        const { data: existingInventory } = await supabase
          .from("inventory")
          .select("*")
          .eq("store_id", receive.selectedStoreId)
          .eq("item_id", receive.selectedItemId)
          .eq("expiration_date", receive.expirationDate)
          .eq("batch_number", receive.batchNumber || "")
          .maybeSingle();

        if (existingInventory) {
          const newQuantity = existingInventory.quantity + receive.quantity;
          
          await supabase
            .from("inventory")
            .update({ quantity: newQuantity })
            .eq("id", existingInventory.id);
        } else {
          await supabase
            .from("inventory")
            .insert({
              workspace_id: receivingContext.workspace_id || null,
              user_id: user.id,
              store_id: receive.selectedStoreId,
              item_id: receive.selectedItemId,
              quantity: receive.quantity,
              expiration_date: receive.expirationDate,
              batch_number: receive.batchNumber,
              notes: receive.notes,
              received_date: new Date().toISOString(),
              status: "active"
            });
        }

        results.push({
          ...receive,
          id: `RCV-${Date.now()}-${results.length}`,
          date: new Date().toISOString(),
          user: user.email
        });
      }

      toast.success(`${results.length} items received!`);
      setLastReceive({ batch: results });
      setBatchQueue([]);
      setBatchMode(false);
      setSubmitting(false);
    } catch (error: any) {
      console.error("Batch receive error:", error);
      toast.error("Some receives failed");
      setSubmitting(false);
    }
  };

  const generateReceivePDF = async () => {
    if (!lastReceive) return;

    try {
      const pdf = new jsPDF();
      
      if (lastReceive.batch) {
        // Batch PDF
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("Batch Receiving Receipt", 105, 20, { align: "center" });
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Total Items: ${lastReceive.batch.length}`, 20, 40);
        pdf.text(`Date: ${new Date().toLocaleString()}`, 20, 50);
        
        let yPos = 70;
        
        for (let i = 0; i < lastReceive.batch.length; i++) {
          const receive = lastReceive.batch[i];
          
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text(`Receive ${i + 1}`, 20, yPos);
          yPos += 10;
          
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text(`Store: ${receive.store}`, 20, yPos);
          yPos += 7;
          pdf.text(`Item: ${receive.item}`, 20, yPos);
          yPos += 7;
          pdf.text(`Quantity: ${receive.quantity} units`, 20, yPos);
          yPos += 7;
          pdf.text(`Batch: ${receive.batchNumber || 'N/A'}`, 20, yPos);
          yPos += 7;
          pdf.text(`Expiration: ${new Date(receive.expirationDate).toLocaleDateString()}`, 20, yPos);
          yPos += 7;
          
          if (receive.notes) {
            pdf.text(`Notes: ${receive.notes}`, 20, yPos);
            yPos += 7;
          }
          
          const qrDataUrl = await QRCode.toDataURL(`RECEIVE-${receive.id}`);
          pdf.addImage(qrDataUrl, "PNG", 150, yPos - 30, 35, 35);
          
          yPos += 20;
        }
        
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text("This document serves as proof of receiving", 105, 280, { align: "center" });
        pdf.text("Generated by Store Management System", 105, 285, { align: "center" });
        
        pdf.save(`Batch_Receive_${Date.now()}.pdf`);
      } else {
        // Single receive PDF
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("Receiving Receipt", 105, 20, { align: "center" });
        
        const qrDataUrl = await QRCode.toDataURL(`RECEIVE-${lastReceive.id}`);
        pdf.addImage(qrDataUrl, "PNG", 160, 30, 40, 40);
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        
        pdf.text(`Receipt ID: ${lastReceive.id}`, 20, 40);
        pdf.text(`Date: ${new Date(lastReceive.date).toLocaleString()}`, 20, 50);
        pdf.text(`Received by: ${lastReceive.user}`, 20, 60);
        
        pdf.setDrawColor(200);
        pdf.line(20, 75, 190, 75);
        
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Receiving Information", 20, 90);
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Store: ${lastReceive.store}`, 20, 105);
        pdf.text(`Item: ${lastReceive.item}`, 20, 115);
        pdf.text(`Quantity: ${lastReceive.quantity} units`, 20, 125);
        pdf.text(`Batch Number: ${lastReceive.batchNumber}`, 20, 135);
        pdf.text(`Expiration Date: ${new Date(lastReceive.expirationDate).toLocaleDateString()}`, 20, 145);
        
        if (lastReceive.notes) {
          pdf.text("Notes:", 20, 160);
          pdf.setFontSize(10);
          const splitNotes = pdf.splitTextToSize(lastReceive.notes, 170);
          pdf.text(splitNotes, 20, 170);
        }
        
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text("This document serves as proof of receiving", 105, 280, { align: "center" });
        pdf.text("Generated by Store Management System", 105, 285, { align: "center" });
        
        pdf.save(`Receive_${lastReceive.id}.pdf`);
      }
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PackageOpen className="w-8 h-8 text-emerald-500" />
              <div>
                <h1 className="text-2xl font-bold">Receive Items</h1>
                <p className="text-sm text-muted-foreground">
                  Select destination store and items to receive
                </p>
              </div>
            </div>
            <Button
              variant={batchMode ? "default" : "outline"}
              onClick={() => setBatchMode(!batchMode)}
            >
              {batchMode ? `Batch Mode (${batchQueue.length})` : "Enable Batch"}
            </Button>
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
              disabled={submitting || !selectedStoreId || !selectedItemId || !quantity}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : batchMode ? (
                <>
                  <PackageOpen className="w-4 h-4 mr-2" />
                  Add to Batch
                </>
              ) : (
                <>
                  <PackageOpen className="w-4 h-4 mr-2" />
                  Receive Items
                </>
              )}
            </Button>

            {batchMode && batchQueue.length > 0 && (
              <Card className="p-4 border-primary">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Batch Queue ({batchQueue.length})</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBatchQueue([])}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {batchQueue.map((item, idx) => (
                    <div key={idx} className="p-2 bg-muted rounded flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium">{item.item}</div>
                        <div className="text-muted-foreground">
                          {item.store} - Qty: {item.quantity} - Batch: {item.batchNumber || 'N/A'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBatchQueue(prev => prev.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleBatchSubmit}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing Batch...
                    </>
                  ) : (
                    `Submit ${batchQueue.length} Receives`
                  )}
                </Button>
              </Card>
            )}

            {lastReceive && (
              <Card className="p-4 bg-emerald-500/10 border border-emerald-500/20 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      ✅ Items Received Successfully
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lastReceive.quantity} units of {lastReceive.item}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Store: {lastReceive.store} | Batch: {lastReceive.batchNumber}
                    </p>
                  </div>
                  <FileText className="h-10 w-10 text-emerald-500" />
                </div>
                <Button 
                  onClick={generateReceivePDF}
                  variant="outline"
                  className="w-full border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Receiving Receipt PDF
                </Button>
              </Card>
            )}
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
