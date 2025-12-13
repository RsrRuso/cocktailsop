import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, PackageOpen, AlertCircle, Search, Download, FileText, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

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
  const [lastTransfer, setLastTransfer] = useState<any>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchQueue, setBatchQueue] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.info("Please log in to access this transfer");
        navigate(`/auth?redirect=/scan-transfer/${qrCodeId}`);
        return;
      }
      setUser(user);
      fetchTransferContext(user.id);
    });
  }, [qrCodeId, navigate]);

  const fetchTransferContext = async (userId: string) => {
    setLoading(true);

    try {
      const { data: context, error: contextError } = await supabase
        .from("transfer_qr_codes" as any)
        .select("*")
        .eq("qr_code_id", qrCodeId)
        .single();

      if (contextError || !context) {
        console.error("[ScanTransfer] QR code lookup error:", contextError);
        toast.error("Invalid or expired QR code. Please generate a new one.");
        return;
      }

      const contextData = context as any;

      const { data: fromStore } = await supabase
        .from("stores")
        .select("id, name, workspace_id")
        .eq("id", contextData.from_store_id)
        .maybeSingle();

      // Determine workspace from QR context first, then fall back to store
      const workspaceId = contextData.workspace_id || fromStore?.workspace_id || null;

      // Check permissions only when a workspace is involved
      if (workspaceId) {
        // FIRST: Check if user is workspace owner - instant access, no other checks
        const { data: workspace, error: workspaceError } = await supabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", workspaceId)
          .maybeSingle();

        if (workspaceError) {
          console.error("[ScanTransfer] Error fetching workspace:", workspaceError);
        }

        // Owner gets instant full access - skip all permission checks
        if (workspace?.owner_id === userId) {
          console.log("[ScanTransfer] ✅ User is workspace owner - instant access granted");
          // Continue to set transfer context below - no permission blocks
        } else {
          // Non-owners: check membership permissions
          const { data: membership, error: membershipError } = await supabase
            .from("workspace_members_with_owner")
            .select("role, permissions")
            .eq("workspace_id", workspaceId)
            .eq("user_id", userId)
            .maybeSingle();

          if (membershipError) {
            console.error("[ScanTransfer] Error checking workspace membership:", membershipError);
          }

          const effectiveRole = membership?.role as string | undefined;
          const effectivePermissions = (membership?.permissions as any) || {};

          const canTransfer =
            effectiveRole === "admin" ||
            effectivePermissions?.can_transfer === true;

          if (!canTransfer) {
            toast.error("You don't have permission to transfer inventory in this workspace");
            navigate("/");
            return;
          }
        }
      }

      setTransferContext({ ...contextData, fromStoreName: fromStore?.name });

      console.log(
        "[ScanTransfer] Using from store",
        { id: fromStore?.id, name: fromStore?.name, workspace_id: fromStore?.workspace_id ?? "personal" }
      );

      // Fetch all active stores in the same workspace context as the QR code
      let storesQuery = supabase
        .from("stores")
        .select("*")
        .eq("is_active", true);

      if (fromStore?.workspace_id) {
        storesQuery = storesQuery.eq("workspace_id", fromStore.workspace_id);
      } else {
        storesQuery = storesQuery.eq("user_id", userId).is("workspace_id", null);
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
        (store) => store.id !== contextData.from_store_id
      );

      setStores(destStores);
      if (destStores.length > 0) {
        setToStoreId(destStores[0].id);
      }

      // Fetch items in the same workspace context
      let itemsQuery = supabase
        .from("items")
        .select("*");

      if (fromStore?.workspace_id) {
        itemsQuery = itemsQuery.eq("workspace_id", fromStore.workspace_id);
      } else {
        itemsQuery = itemsQuery.eq("user_id", userId).is("workspace_id", null);
      }

      const { data: itemsData } = await itemsQuery.order("name");

      // Filter to show only glassware items
      const glasswareItems = (itemsData || []).filter(
        (item) => item.name.toLowerCase().includes("glass")
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
    } catch (error) {
      console.error("[ScanTransfer] Unexpected error while loading transfer context:", error);
      toast.error("Failed to load transfer details. Please try again.");
    } finally {
      setLoading(false);
    }
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

    if (batchMode) {
      // Add to batch queue
      const selectedItem = items.find(i => i.id === selectedItemId);
      const fromStore = fromStores.find(s => s.id === fromStoreId);
      const toStore = stores.find(s => s.id === toStoreId);
      
      setBatchQueue(prev => [...prev, {
        fromStoreId,
        toStoreId,
        selectedItemId,
        availableInventoryId: availableInventory.id,
        quantity: quantityNum,
        notes,
        fromStore: fromStore?.name || "Unknown",
        toStore: toStore?.name || "Unknown",
        item: selectedItem?.name || "Unknown",
        expirationDate: availableInventory.expiration_date
      }]);
      
      toast.success(`Added to batch (${batchQueue.length + 1} items)`);
      setQuantity("1");
      setNotes("");
      return;
    }

    const fromStore = fromStores.find(s => s.id === fromStoreId);
    const workspaceIdForTransfer = fromStore?.workspace_id ?? availableInventory.workspace_id ?? null;

    setSubmitting(true);

    const { data: transferData, error } = await supabase
      .from("inventory_transfers")
      .insert({
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        inventory_id: availableInventory.id,
        quantity: quantityNum,
        notes,
        user_id: user.id,
        workspace_id: workspaceIdForTransfer,
        status: "completed",
        transfer_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      toast.error("Transfer failed");
      setSubmitting(false);
      return;
    }

    // Log the transfer activity
    const selectedItem = items.find(i => i.id === selectedItemId);
    await supabase.from("inventory_activity_log").insert({
      workspace_id: workspaceIdForTransfer,
      user_id: user.id,
      store_id: fromStoreId,
      inventory_id: availableInventory.id,
      action_type: "transferred",
      quantity_before: availableInventory.quantity,
      quantity_after: availableInventory.quantity - quantityNum,
      details: {
        item_id: selectedItemId,
        item_name: selectedItem?.name,
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        transfer_quantity: quantityNum,
        notes: notes || null,
        transfer_id: transferData?.id
      }
    });

    await supabase
      .from("inventory")
      .update({ 
        quantity: availableInventory.quantity - quantityNum,
        workspace_id: workspaceIdForTransfer,
      })
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
        .update({ 
          quantity: existingToInventory.quantity + quantityNum,
          workspace_id: workspaceIdForTransfer,
        })
        .eq("id", existingToInventory.id);
    } else {
      await supabase
        .from("inventory")
        .insert({
          store_id: toStoreId,
          item_id: selectedItemId,
          quantity: quantityNum,
          expiration_date: availableInventory.expiration_date,
          user_id: user.id,
          workspace_id: workspaceIdForTransfer,
        });
    }

    toast.success("Transfer completed!");
    
    // Store transfer details for PDF generation
    const fromStoreForSummary = fromStores.find(s => s.id === fromStoreId);
    const toStoreForSummary = stores.find(s => s.id === toStoreId);
    
    setLastTransfer({
      id: `TRF-${Date.now()}`,
      date: new Date().toISOString(),
      fromStore: fromStoreForSummary?.name || "Unknown",
      toStore: toStoreForSummary?.name || "Unknown",
      item: selectedItem?.name || "Unknown",
      quantity: quantityNum,
      notes: notes,
      user: user.email,
    });
    
    setSubmitting(false);
  };

  const handleBatchSubmit = async () => {
    if (batchQueue.length === 0) {
      toast.error("No transfers in batch");
      return;
    }

    setSubmitting(true);
    const results: any[] = [];

    try {
      for (const transfer of batchQueue) {
        const sourceInv = inventory.find(inv => inv.id === transfer.availableInventoryId);
        const fromStore = fromStores.find(s => s.id === transfer.fromStoreId);
        const workspaceIdForTransfer = fromStore?.workspace_id ?? sourceInv?.workspace_id ?? null;

        const { data: transferData, error } = await supabase
          .from("inventory_transfers")
          .insert({
            from_store_id: transfer.fromStoreId,
            to_store_id: transfer.toStoreId,
            inventory_id: transfer.availableInventoryId,
            quantity: transfer.quantity,
            notes: transfer.notes,
            user_id: user.id,
            workspace_id: workspaceIdForTransfer,
            status: "completed",
            transfer_date: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Log the transfer activity
        await supabase.from("inventory_activity_log").insert({
          workspace_id: workspaceIdForTransfer,
          user_id: user.id,
          store_id: transfer.fromStoreId,
          inventory_id: transfer.availableInventoryId,
          action_type: "transferred",
          quantity_before: sourceInv?.quantity || 0,
          quantity_after: (sourceInv?.quantity || 0) - transfer.quantity,
          details: {
            item_id: transfer.selectedItemId,
            item_name: transfer.item,
            from_store_id: transfer.fromStoreId,
            to_store_id: transfer.toStoreId,
            transfer_quantity: transfer.quantity,
            notes: transfer.notes || null,
            transfer_id: transferData?.id
          }
        });

        const { data: fromInv } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("id", transfer.availableInventoryId)
          .single();

        await supabase
          .from("inventory")
          .update({ 
            quantity: (fromInv?.quantity || 0) - transfer.quantity,
            workspace_id: workspaceIdForTransfer,
          })
          .eq("id", transfer.availableInventoryId);

        const { data: existingToInventory } = await supabase
          .from("inventory")
          .select("*")
          .eq("store_id", transfer.toStoreId)
          .eq("item_id", transfer.selectedItemId)
          .maybeSingle();

        if (existingToInventory) {
          await supabase
            .from("inventory")
            .update({ 
              quantity: existingToInventory.quantity + transfer.quantity,
              workspace_id: workspaceIdForTransfer,
            })
            .eq("id", existingToInventory.id);
        } else {
          await supabase
            .from("inventory")
            .insert({
              store_id: transfer.toStoreId,
              item_id: transfer.selectedItemId,
              quantity: transfer.quantity,
              expiration_date: transfer.expirationDate,
              user_id: user.id,
              workspace_id: workspaceIdForTransfer,
            });
        }

        results.push({
          ...transfer,
          id: `TRF-${Date.now()}-${results.length}`,
          date: new Date().toISOString(),
          user: user.email,
        });
      }

      toast.success(`${results.length} transfers completed!`);
      setLastTransfer({ batch: results });
      setBatchQueue([]);
      setBatchMode(false);
      setSubmitting(false);
    } catch (error: any) {
      console.error("Batch transfer error:", error);
      toast.error("Some transfers failed");
      setSubmitting(false);
    }
  };

  const exportAllTransfersPDF = async () => {
    if (!user) return;

    try {
      const { data: activities } = await supabase
        .from('inventory_activity_log')
        .select('*, stores(name), inventory(items(name))')
        .eq('user_id', user.id)
        .eq('action_type', 'transferred')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!activities || activities.length === 0) {
        toast.info("No transfer transactions to export");
        return;
      }

      const pdf = new jsPDF();
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("FIFO Transfer Transactions Report", 105, 20, { align: "center" });

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
      pdf.text(`Total Transactions: ${activities.length}`, 20, 42);

      let yPos = 58;

      activities.forEach((activity: any, index) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        const details = activity.details || {};
        
        pdf.setFont("helvetica", "bold");
        pdf.text(`Transaction #${index + 1}`, 20, yPos);
        pdf.setFont("helvetica", "normal");
        yPos += 7;

        pdf.text(`Item: ${details.item_name || 'N/A'}`, 25, yPos);
        yPos += 6;
        pdf.text(`From Store: ${activity.stores?.name || 'N/A'}`, 25, yPos);
        yPos += 6;
        pdf.text(`Quantity: ${details.transfer_quantity || activity.quantity_before - activity.quantity_after}`, 25, yPos);
        yPos += 6;
        pdf.text(`Date: ${new Date(activity.created_at).toLocaleString()}`, 25, yPos);
        yPos += 6;

        if (details.notes) {
          pdf.text(`Notes: ${details.notes}`, 25, yPos);
          yPos += 6;
        }

        yPos += 8;
      });

      pdf.save(`FIFO-Transfer-Transactions-${Date.now()}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Failed to export PDF");
    }
  };

  const generateTransferPDF = async () => {
    if (!lastTransfer) return;

    try {
      const pdf = new jsPDF();
      
      if (lastTransfer.batch) {
        // Batch PDF
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("Batch Transfer Receipt", 105, 20, { align: "center" });
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Total Transfers: ${lastTransfer.batch.length}`, 20, 40);
        pdf.text(`Date: ${new Date().toLocaleString()}`, 20, 50);
        
        let yPos = 70;
        
        for (let i = 0; i < lastTransfer.batch.length; i++) {
          const transfer = lastTransfer.batch[i];
          
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }
          
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text(`Transfer ${i + 1}`, 20, yPos);
          yPos += 10;
          
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.text(`From: ${transfer.fromStore}`, 20, yPos);
          yPos += 7;
          pdf.text(`To: ${transfer.toStore}`, 20, yPos);
          yPos += 7;
          pdf.text(`Item: ${transfer.item}`, 20, yPos);
          yPos += 7;
          pdf.text(`Quantity: ${transfer.quantity} units`, 20, yPos);
          yPos += 7;
          
          if (transfer.notes) {
            pdf.text(`Notes: ${transfer.notes}`, 20, yPos);
            yPos += 7;
          }
          
          const qrDataUrl = await QRCode.toDataURL(`TRANSFER-${transfer.id}`);
          pdf.addImage(qrDataUrl, "PNG", 150, yPos - 25, 35, 35);
          
          yPos += 20;
        }
        
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text("This document serves as proof of transfer", 105, 280, { align: "center" });
        pdf.text("Generated by Store Management System", 105, 285, { align: "center" });
        
        pdf.save(`Batch_Transfer_${Date.now()}.pdf`);
      } else {
        // Single transfer PDF
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("Transfer Receipt", 105, 20, { align: "center" });
        
        const qrDataUrl = await QRCode.toDataURL(`TRANSFER-${lastTransfer.id}`);
        pdf.addImage(qrDataUrl, "PNG", 160, 30, 40, 40);
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        
        pdf.text(`Transfer ID: ${lastTransfer.id}`, 20, 40);
        pdf.text(`Date: ${new Date(lastTransfer.date).toLocaleString()}`, 20, 50);
        pdf.text(`Processed by: ${lastTransfer.user}`, 20, 60);
        
        pdf.setDrawColor(200);
        pdf.line(20, 75, 190, 75);
        
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Transfer Information", 20, 90);
        
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "normal");
        pdf.text(`From Store: ${lastTransfer.fromStore}`, 20, 105);
        pdf.text(`To Store: ${lastTransfer.toStore}`, 20, 115);
        pdf.text(`Item: ${lastTransfer.item}`, 20, 125);
        pdf.text(`Quantity: ${lastTransfer.quantity} units`, 20, 135);
        
        if (lastTransfer.notes) {
          pdf.text("Notes:", 20, 150);
          pdf.setFontSize(10);
          const splitNotes = pdf.splitTextToSize(lastTransfer.notes, 170);
          pdf.text(splitNotes, 20, 160);
        }
        
        pdf.setFontSize(8);
        pdf.setTextColor(128);
        pdf.text("This document serves as proof of transfer", 105, 280, { align: "center" });
        pdf.text("Generated by Store Management System", 105, 285, { align: "center" });
        
        pdf.save(`Transfer_${lastTransfer.id}.pdf`);
      }
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
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
          <p className="text-lg font-semibold mb-2">Invalid Transfer Code</p>
          <p className="text-sm text-muted-foreground mb-4">
            This code doesn't exist or has expired. Please generate a new one from Store Management.
          </p>
          <Button onClick={() => navigate("/transfer-qr")} className="w-full">
            Generate New Code
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto p-4 pt-20">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/store-management")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store Management
          </Button>
          <Button
            variant="outline"
            onClick={exportAllTransfersPDF}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            Export Report PDF
          </Button>
        </div>

        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Transfer Glassware Items</h1>
                <p className="text-sm text-muted-foreground">
                  Select source and destination stores
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
                  Complete Transfer
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
                          {item.fromStore} → {item.toStore} ({item.quantity} units)
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
                    `Submit ${batchQueue.length} Transfers`
                  )}
                </Button>
              </Card>
            )}

            {lastTransfer && (
              <Card className="p-4 bg-emerald-500/10 border border-emerald-500/20 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      ✅ Transfer Completed Successfully
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lastTransfer.quantity} units of {lastTransfer.item}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From: {lastTransfer.fromStore} → To: {lastTransfer.toStore}
                    </p>
                  </div>
                  <FileText className="h-10 w-10 text-emerald-500" />
                </div>
                <Button 
                  onClick={generateTransferPDF}
                  variant="outline"
                  className="w-full border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Transfer Receipt PDF
                </Button>
              </Card>
            )}

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
    </div>
  );
}
