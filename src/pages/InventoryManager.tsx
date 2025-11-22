import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { useManagerRole } from "@/hooks/useManagerRole";
import { usePendingAccessRequests } from "@/hooks/usePendingAccessRequests";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Package, Store, Users, ArrowRightLeft, Upload, Camera, Scan, TrendingUp, Pencil, Trash2, Loader2, Lock, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const InventoryManager = () => {
  const { user } = useAuth();
  const { hasAccess, isLoading: accessLoading, refetch: refetchAccess } = useInventoryAccess();
  const { isManager } = useManagerRole();
  const { count: pendingRequestsCount } = usePendingAccessRequests();
  const navigate = useNavigate();
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [fifoRecommendations, setFifoRecommendations] = useState<any[]>([]);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [quickTransferItem, setQuickTransferItem] = useState<any>(null);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editingItemMaster, setEditingItemMaster] = useState<any>(null);
  const [itemMasterToDelete, setItemMasterToDelete] = useState<any>(null);
  const [selectedMasterItemId, setSelectedMasterItemId] = useState<string>("");
  const [pastedText, setPastedText] = useState("");
  const [parsedItems, setParsedItems] = useState<string[]>([]);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [selectedTransferItemId, setSelectedTransferItemId] = useState<string>("");
  const [selectedFromStoreId, setSelectedFromStoreId] = useState<string>("");
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasAccess) {
      console.log('FIFO Manager initialized - Personal inventory only');
      // Clear all data first
      setStores([]);
      setItems([]);
      setInventory([]);
      setTransfers([]);
      setActivityLog([]);
      setFifoRecommendations([]);
      // Then fetch new data
      fetchData();
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!user || !hasAccess) return;

    // Set up realtime subscription for inventory changes
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fifo_inventory'
        },
        (payload) => {
          console.log('Inventory changed:', payload);
          fetchData(); // Refresh data on any inventory change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fifo_transfers'
        },
        (payload) => {
          console.log('Transfer changed:', payload);
          fetchData(); // Refresh data on transfer changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, hasAccess]);

  useEffect(() => {
    if (selectedStore) {
      fetchFIFORecommendations(selectedStore);
    }
  }, [selectedStore, inventory]);

  const fetchData = async () => {
    if (!user || !hasAccess) return;

    console.log('=== FETCHING FIFO DATA (Personal Only) ===');

    try {
      // Query FIFO tables (personal only, no workspace)
      const [storesRes, itemsRes, employeesRes, inventoryRes, transfersRes, activityRes] = await Promise.all([
        supabase.from("fifo_stores").select("*").eq("user_id", user.id).order("name"),
        supabase.from("fifo_items").select("*").eq("user_id", user.id).order("name"),
        supabase.from("fifo_employees").select("*").eq("user_id", user.id).order("name"),
        supabase.from("fifo_inventory").select(`
          *,
          stores:fifo_stores!fifo_inventory_store_id_fkey(name, location, store_type),
          items:fifo_items!fifo_inventory_item_id_fkey(name, brand, color_code, category)
        `).eq("user_id", user.id).order("priority_score", { ascending: false }),
        supabase.from("fifo_transfers").select(`
          *,
          from_store:fifo_stores!fifo_transfers_from_store_id_fkey(name),
          to_store:fifo_stores!fifo_transfers_to_store_id_fkey(name),
          employees:fifo_employees!fifo_transfers_transferred_by_fkey(name)
        `).eq("user_id", user.id).order("transfer_date", { ascending: false }).limit(20),
        supabase.from("fifo_activity_log").select(`
          *,
          stores:fifo_stores!fifo_activity_log_store_id_fkey(name),
          employees:fifo_employees!fifo_activity_log_employee_id_fkey(name)
        `).eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
      ]);

      console.log('=== FIFO FETCH RESULTS ===');
      console.log('Stores:', storesRes.data?.length);
      console.log('Items:', itemsRes.data?.length);
      console.log('Inventory:', inventoryRes.data?.length);

      if (storesRes.data) setStores(storesRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      if (inventoryRes.data) setInventory(inventoryRes.data);
      if (transfersRes.data) setTransfers(transfersRes.data);
      if (activityRes.data) setActivityLog(activityRes.data);
    } catch (error) {
      console.error('Error fetching FIFO data:', error);
    }
  };

  const fetchFIFORecommendations = async (storeId: string) => {
    const { data } = await supabase
      .from("fifo_inventory")
      .select(`
        *,
        items:fifo_items!fifo_inventory_item_id_fkey(name, brand, color_code),
        stores:fifo_stores!fifo_inventory_store_id_fkey(name)
      `)
      .eq("store_id", storeId)
      .gt("quantity", 0)
      .order("priority_score", { ascending: false })
      .limit(10);

    if (data) setFifoRecommendations(data);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const rowData = row as any;
          let { data: existingItem } = await supabase
            .from("fifo_items")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", rowData.item_name || rowData.name)
            .single();

          let itemId = existingItem?.id;

          if (!itemId) {
            const { data: newItem } = await supabase
              .from("fifo_items")
              .insert({
                user_id: user.id,
                name: rowData.item_name || rowData.name,
                brand: rowData.brand,
                color_code: rowData.color_code,
                category: rowData.category,
                barcode: rowData.barcode
              })
              .select()
              .single();
            itemId = newItem?.id;
          }

          const { data: store } = await supabase
            .from("fifo_stores")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", rowData.store_name || rowData.store)
            .single();

          if (store && itemId) {
            await supabase.from("fifo_inventory").insert({
              user_id: user.id,
              store_id: store.id,
              item_id: itemId,
              quantity: rowData.quantity || 1,
              expiration_date: rowData.expiration_date || rowData.expiry_date,
              received_date: rowData.received_date || new Date().toISOString(),
              batch_number: rowData.batch_number,
              notes: rowData.notes,
              status: "available"
            });
            successCount++;
          }
        } catch (error) {
          console.error("Error importing row:", error);
          errorCount++;
        }
      }

      toast.success(`Imported ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
      fetchData();
    };
    reader.readAsBinaryString(file);
  };

  const startBarcodeScanner = () => {
    setScanDialogOpen(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("barcode-reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      }, false);

      scanner.render(
        async (decodedText) => {
          toast.success(`Scanned: ${decodedText}`);
          scanner.clear();
          setScanDialogOpen(false);
          
          const { data: item } = await supabase
            .from("fifo_items")
            .select("*")
            .eq("barcode", decodedText)
            .single();

          if (item) {
            toast.info(`Found: ${item.name} - ${item.brand}`);
          }
        },
        (error) => {
          console.warn("Scan error:", error);
        }
      );

      scannerRef.current = scanner;
    }, 100);
  };

  const analyzePhotoForExpiry = async (imageFile: File) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract the expiry date or best before date from this product image. Return ONLY the date in YYYY-MM-DD format, nothing else. If you can't find it, return 'NOT_FOUND'."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: base64Image
                    }
                  }
                ]
              }
            ]
          })
        });

        const data = await response.json();
        const extractedDate = data.choices?.[0]?.message?.content?.trim();
        
        if (extractedDate && extractedDate !== "NOT_FOUND") {
          toast.success(`Detected expiry date: ${extractedDate}`);
          return extractedDate;
        } else {
          toast.error("Could not detect expiry date from image");
        }
      };
      reader.readAsDataURL(imageFile);
    } catch (error) {
      console.error("Error analyzing image:", error);
      toast.error("Failed to analyze image");
    }
  };

  const handleAddStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("fifo_stores").insert({
      user_id: user.id,
      name: formData.get("storeName") as string,
      location: formData.get("address") as string,
      store_type: formData.get("storeType") as string,
    });

    if (error) {
      toast.error("Failed to add store");
    } else {
      toast.success("Store added successfully");
      fetchData();
      e.currentTarget.reset();
    }
  };

  const generateUniqueBarcode = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}${random}`;
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const generatedBarcode = generateUniqueBarcode();
    const storeId = formData.get("storeId") as string;
    const quantity = parseFloat(formData.get("quantity") as string);
    const expirationDate = formData.get("expirationDate") as string;

    if (!storeId) {
      toast.error("Please select a store");
      return;
    }

    if (!selectedMasterItemId) {
      toast.error("Please select an item from the master list");
      return;
    }

    // Use the selected item from master list directly
    const { error: inventoryError } = await supabase.from("fifo_inventory").insert({
      user_id: user.id,
      item_id: selectedMasterItemId,
      store_id: storeId,
      quantity: quantity,
      expiration_date: expirationDate,
      received_date: new Date().toISOString(),
      batch_number: generatedBarcode,
      status: "available"
    });

    if (inventoryError) {
      toast.error("Failed to add to inventory");
      return;
    }

    toast.success(`Item received! Barcode: ${generatedBarcode}`);
    fetchData();
    e.currentTarget.reset();
    setSelectedMasterItemId("");
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("fifo_employees").insert({
      user_id: user.id,
      name: formData.get("employeeName") as string,
      title: formData.get("title") as string,
    });

    if (error) {
      toast.error("Failed to add employee");
    } else {
      toast.success("Employee added successfully");
      fetchData();
      e.currentTarget.reset();
    }
  };

  const handleUpdateStore = async (e: React.FormEvent<HTMLFormElement>, storeId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase.from("fifo_stores").update({
      name: formData.get("storeName") as string,
      location: formData.get("location") as string,
      store_type: formData.get("storeType") as string || 'both',
    }).eq("id", storeId);

    if (error) {
      toast.error("Failed to update store");
    } else {
      toast.success("Store updated successfully");
      fetchData();
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store? All inventory in this store will also be removed.")) return;
    
    const { error } = await supabase.from("fifo_stores").delete().eq("id", storeId);

    if (error) {
      toast.error("Failed to delete store");
    } else {
      toast.success("Store deleted successfully");
      fetchData();
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent<HTMLFormElement>, employeeId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const { error } = await supabase.from("fifo_employees").update({
      name: formData.get("employeeName") as string,
      title: formData.get("title") as string,
    }).eq("id", employeeId);

    if (error) {
      toast.error("Failed to update employee");
    } else {
      toast.success("Employee updated successfully");
      fetchData();
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    
    const { error } = await supabase.from("fifo_employees").delete().eq("id", employeeId);

    if (error) {
      toast.error("Failed to delete employee");
    } else {
      toast.success("Employee deleted successfully");
      fetchData();
    }
  };


  const handleAddInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("fifo_inventory").insert({
      user_id: user.id,
      store_id: formData.get("storeId") as string,
      item_id: formData.get("itemId") as string,
      quantity: parseFloat(formData.get("quantity") as string),
      expiration_date: formData.get("expirationDate") as string,
      received_date: formData.get("receivedDate") as string || new Date().toISOString(),
      batch_number: formData.get("batchNumber") as string,
      notes: formData.get("notes") as string,
    });

    if (error) {
      toast.error("Failed to add inventory");
    } else {
      toast.success("Inventory added successfully");
      
      await supabase.from("fifo_activity_log").insert({
        user_id: user.id,
        store_id: formData.get("storeId") as string,
        action_type: "received",
        quantity_after: parseFloat(formData.get("quantity") as string),
        details: { item_id: formData.get("itemId") as string }
      });
      
      fetchData();
      e.currentTarget.reset();
    }
  };

  const handleMarkAsSold = async (inventoryId: string, currentQty: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("fifo_inventory")
      .update({ status: "sold", quantity: 0 })
      .eq("id", inventoryId);

    if (!error) {
      toast.success("Item archived - moved to Archive tab");
      
      const { data: inv } = await supabase.from("fifo_inventory").select("*").eq("id", inventoryId).single();
      
      await supabase.from("fifo_activity_log").insert({
        user_id: user.id,
        inventory_id: inventoryId,
        store_id: inv?.store_id,
        action_type: "sold",
        quantity_before: currentQty,
        quantity_after: 0
      });
      
      fetchData();
    }
  };

  const handleUpdateItemMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemMaster) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);

    const { error } = await supabase
      .from("fifo_items")
      .update({
        name: formData.get("itemName") as string,
        brand: formData.get("brand") as string,
        category: formData.get("category") as string,
        color_code: formData.get("colorCode") as string,
        description: formData.get("description") as string,
      })
      .eq("id", editingItemMaster.id);

    if (error) {
      toast.error("Failed to update item");
      return;
    }

    toast.success("Item updated successfully");
    setEditingItemMaster(null);
    fetchData();
  };

  const handleDeleteItemMaster = async () => {
    if (!itemMasterToDelete) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("fifo_items")
      .delete()
      .eq("id", itemMasterToDelete.id);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    toast.success("Item deleted successfully");
    setItemMasterToDelete(null);
    fetchData();
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const itemId = formData.get("itemId") as string;
    const fromStoreId = formData.get("fromStoreId") as string;
    const toStoreId = formData.get("toStoreId") as string;
    const quantity = parseFloat(formData.get("quantity") as string);

    const { data: sourceInv, error: sourceError } = await supabase
      .from("fifo_inventory")
      .select("*")
      .eq("item_id", itemId)
      .eq("store_id", fromStoreId)
      .order("expiration_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sourceError) {
      toast.error("Failed to fetch source inventory");
      return;
    }

    if (!sourceInv) {
      toast.error("No inventory found for this item in the selected source store");
      return;
    }

    // Prevent same-store transfers
    if (sourceInv.store_id === toStoreId) {
      toast.error("Cannot transfer to the same store");
      return;
    }

    if (quantity > sourceInv.quantity) {
      toast.error(`Cannot transfer ${quantity} items. Only ${sourceInv.quantity} available.`);
      return;
    }

    const { data: transfer, error: transferError } = await supabase
      .from("fifo_transfers")
      .insert({
        user_id: user.id,
        inventory_id: sourceInv.id,
        from_store_id: sourceInv.store_id,
        to_store_id: toStoreId,
        quantity: quantity,
        transferred_by: formData.get("transferredBy") as string,
        notes: formData.get("transferNotes") as string,
        status: "completed"
      })
      .select()
      .single();

    if (transferError) {
      toast.error("Failed to create transfer");
      return;
    }

    const remainingQty = sourceInv.quantity - quantity;

    await supabase
      .from("fifo_inventory")
      .update({
        quantity: remainingQty,
        status: remainingQty <= 0 ? "transferred" : "available"
      })
      .eq("id", sourceInv.id);

    const { data: destInv, error: destError } = await supabase
      .from("fifo_inventory")
      .select("*")
      .eq("store_id", toStoreId)
      .eq("item_id", sourceInv.item_id)
      .eq("expiration_date", sourceInv.expiration_date)
      .maybeSingle();

    if (destError) {
      toast.error("Failed to fetch destination inventory");
      return;
    }

    if (destInv) {
      await supabase
        .from("fifo_inventory")
        .update({
          quantity: destInv.quantity + quantity,
          status: "available"
        })
        .eq("id", destInv.id);
    } else {
      await supabase.from("fifo_inventory").insert({
        user_id: user.id,
        store_id: toStoreId,
        item_id: sourceInv.item_id,
        quantity: quantity,
        expiration_date: sourceInv.expiration_date,
        received_date: new Date().toISOString(),
        batch_number: sourceInv.batch_number,
        status: "available"
      });
    }

    await supabase.from("fifo_activity_log").insert({
      user_id: user.id,
      inventory_id: sourceInv.id,
      store_id: sourceInv.store_id,
      action_type: "transferred",
      quantity_before: sourceInv.quantity,
      quantity_after: sourceInv.quantity - quantity,
      details: { to_store_id: toStoreId, transfer_id: transfer.id }
    });

    toast.success(`Transfer completed! Transferred: ${quantity}, Remaining: ${remainingQty}`);
    fetchData();
    e.currentTarget.reset();
  };

  const getDaysUntilExpiry = (expirationDate: string) => {
    const days = Math.floor((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getPriorityBadgeColor = (priority: number) => {
    if (priority >= 80) return "bg-red-500";
    if (priority >= 50) return "bg-orange-500";
    return "bg-yellow-500";
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <TopNav />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Access Required</CardTitle>
              <CardDescription>
                You need approval to access the Inventory Manager. Please scan the QR code provided by your manager or wait for approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={() => {
                  refetchAccess();
                  toast.info("Checking access...");
                }} 
                className="w-full"
                variant="outline"
                disabled={accessLoading}
              >
                {accessLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Access Again"
                )}
              </Button>
              <Button onClick={() => navigate("/home")} className="w-full">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="container mx-auto p-2 sm:p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">FIFO Inventory</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Track inventory with FIFO priority</p>
          </div>
        </div>

        {/* Quick Actions - Compact horizontal bar */}
        <div className="flex flex-wrap gap-2 bg-card p-2 rounded-lg border">
          {isManager && (
            <Button onClick={() => navigate("/qr-access-code")} size="sm" variant="default">
              <QRCodeSVG value="qr" className="w-3 h-3 mr-1 opacity-0" />
              <span className="ml-[-16px]">QR Code</span>
            </Button>
          )}
          {(isManager || pendingRequestsCount > 0) && (
            <Button 
              onClick={() => navigate("/access-approval")} 
              size="sm" 
              variant="outline"
              className="relative"
            >
              <Lock className="w-3 h-3 mr-1" />
              Approvals
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                  {pendingRequestsCount}
                </span>
              )}
            </Button>
          )}
          <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
            <Upload className="w-3 h-3 mr-1" />
            Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            className="hidden"
          />
          <Button onClick={startBarcodeScanner} size="sm" variant="outline">
            <Scan className="w-3 h-3 mr-1" />
            Scan
          </Button>
          <Button onClick={() => setPhotoDialogOpen(true)} size="sm" variant="outline">
            <Camera className="w-3 h-3 mr-1" />
            Photo
          </Button>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Filter by Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-8 h-auto">
            <TabsTrigger value="inventory" className="text-xs py-2">
              <Package className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Active</span>
            </TabsTrigger>
            <TabsTrigger value="archive" className="text-xs py-2">
              <Package className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Archive</span>
            </TabsTrigger>
            <TabsTrigger value="fifo" className="text-xs py-2">
              <TrendingUp className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">FIFO</span>
            </TabsTrigger>
            <TabsTrigger value="stores" className="text-xs py-2">
              <Store className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Stores</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="text-xs py-2">
              <Package className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Receive</span>
            </TabsTrigger>
            <TabsTrigger value="manage-items" className="text-xs py-2">
              <Pencil className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Items</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="text-xs py-2">
              <Users className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs py-2">
              <ArrowRightLeft className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Transfer</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-2">
            {/* Search Bar */}
            <div className="px-2">
              <Input
                placeholder="Search items by name, brand, or store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            
            {/* Card-based List View */}
            <div className="grid gap-2">
              {inventory
                .filter(inv => {
                  // First check quantity only - show any items with stock
                  if ((inv.quantity ?? 0) <= 0) return false;
                  
                  // Apply store filter
                  if (selectedStore && selectedStore !== 'all') {
                    // If specific store selected, show only that store
                    if (inv.store_id !== selectedStore) return false;
                  }
                  // If "All Stores" or no selection, show all stores
                  
                  // Apply search filter
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return (
                    inv.items?.name?.toLowerCase().includes(search) ||
                    inv.items?.brand?.toLowerCase().includes(search) ||
                    inv.stores?.name?.toLowerCase().includes(search)
                  );
                })
                .map((inv) => {
                  const daysUntilExpiry = getDaysUntilExpiry(inv.expiration_date);
                  return (
                    <Card 
                      key={inv.id} 
                      className="cursor-pointer hover:bg-accent transition-colors"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {inv.items?.color_code && (
                              <div 
                                className="w-4 h-4 rounded inline-block mr-2" 
                                style={{ backgroundColor: inv.items.color_code }}
                              />
                            )}
                            <h3 className="text-sm font-semibold inline">{inv.items?.name}</h3>
                            {inv.items?.brand && <p className="text-xs text-muted-foreground">Brand: {inv.items.brand}</p>}
                            {inv.items?.category && <p className="text-xs text-muted-foreground">Category: {inv.items.category}</p>}
                            <div className="mt-2 space-y-1">
                              <p className="text-xs">
                                <span className="font-medium">Store:</span> {inv.stores?.name} ({inv.stores?.location})
                              </p>
                              <p className="text-xs">
                                <span className="font-medium">Qty:</span> {inv.quantity}
                              </p>
                              <p className={`text-xs font-medium ${
                                daysUntilExpiry < 0 ? 'text-red-600' :
                                daysUntilExpiry <= 3 ? 'text-orange-600' :
                                daysUntilExpiry <= 7 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                <span>Expires:</span> {new Date(inv.expiration_date).toLocaleDateString()} 
                                ({daysUntilExpiry < 0 ? 'EXPIRED' : `${daysUntilExpiry} days left`})
                              </p>
                              <Badge className="text-xs" variant={inv.priority_score && inv.priority_score >= 80 ? "destructive" : "secondary"}>
                                FIFO Priority: {inv.priority_score || 0}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickTransferItem(inv);
                              }}
                              disabled={inv.quantity <= 0}
                            >
                              <ArrowRightLeft className="w-3 h-3 mr-1" />
                              Transfer
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsSold(inv.id, inv.quantity);
                              }}
                              disabled={
                                (inv.quantity ?? 0) <= 0 ||
                                !inv.stores?.store_type ||
                                !['sell', 'both'].includes(inv.stores.store_type)
                              }
                            >
                              Sold
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          <TabsContent value="archive" className="space-y-2">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Archived Items (Sold)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-2">Item</TableHead>
                        <TableHead className="text-xs py-2">Store</TableHead>
                        <TableHead className="text-xs py-2">Sold Date</TableHead>
                        <TableHead className="text-xs py-2">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory
                        .filter((inv) => {
                          // Only show sold items
                          if (inv.status !== 'sold') return false;
                          
                          // Apply store filter
                          if (selectedStore && selectedStore !== 'all') {
                            // If specific store selected, show only that store
                            return inv.store_id === selectedStore;
                          }
                          // If "All Stores" or no selection, show all stores
                          return true;
                        })
                        .map((inv) => {
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-2">
                                  {inv.items?.color_code && (
                                    <div 
                                      className="w-3 h-3 rounded flex-shrink-0" 
                                      style={{ backgroundColor: inv.items.color_code }}
                                    />
                                  )}
                                  <span className="text-xs font-medium">{inv.items?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-xs">{inv.stores?.name}</TableCell>
                              <TableCell className="py-2 text-xs">
                                {new Date(inv.updated_at || inv.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="py-2">
                                <Badge variant="secondary" className="text-xs">Sold</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fifo" className="space-y-2">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">FIFO Priority - Use Store Filter Above</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {selectedStore && selectedStore !== 'all' ? (
                  <div className="space-y-2">
                    {fifoRecommendations.map((item, index) => {
                      const daysUntilExpiry = getDaysUntilExpiry(item.expiration_date);
                      return (
                        <Card key={item.id} className="border-l-4" style={{
                          borderLeftColor: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#eab308'
                        }}>
                          <CardContent className="p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="text-lg font-bold text-muted-foreground">#{index + 1}</div>
                                <div>
                                  <h4 className="text-sm font-semibold">{item.items?.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {item.items?.brand} • Qty: <strong>{item.quantity}</strong>
                                  </p>
                                  <p className="text-xs">
                                    Expires in <strong className={daysUntilExpiry <= 7 ? "text-red-500" : ""}>{daysUntilExpiry} days</strong>
                                  </p>
                                </div>
                              </div>
                              <Badge className={`${getPriorityBadgeColor(item.priority_score)} text-white text-xs`}>
                                {item.priority_score}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a store from the filter above to view FIFO recommendations
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {activityLog.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center gap-2 p-1.5 bg-muted rounded text-xs">
                      <Badge variant="outline" className="text-xs py-0">{log.action_type}</Badge>
                      <p className="flex-1">
                        {log.stores?.name} • {log.employees?.name}
                        {log.quantity_after !== null && ` • Qty: ${log.quantity_after}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stores">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Manage Stores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={handleAddStore} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Store Name</Label>
                      <Input name="storeName" className="h-8 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">Area</Label>
                      <Input name="area" className="h-8 text-sm" required />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input name="address" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Store Type</Label>
                    <Select name="storeType" defaultValue="both">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both (Receive & Sell)</SelectItem>
                        <SelectItem value="receive">Receive Only</SelectItem>
                        <SelectItem value="sell">Sell Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" size="sm">Add Store</Button>
                </form>

                <div className="grid gap-2 mt-4">
                  {stores.map((store) => (
                    <Card key={store.id}>
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold">{store.name}</h3>
                              <Badge variant={store.store_type === 'receive' ? 'default' : store.store_type === 'sell' ? 'destructive' : 'secondary'} className="text-xs">
                                {store.store_type === 'receive' ? '📥 Receive' : store.store_type === 'sell' ? '💰 Sell' : '🔄 Both'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{store.location}</p>
                            {store.address && <p className="text-xs mt-0.5">{store.address}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Store</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={(e) => handleUpdateStore(e, store.id)} className="space-y-3">
                                  <div>
                                    <Label className="text-xs">Store Name</Label>
                                    <Input name="storeName" defaultValue={store.name} className="h-8 text-sm" required />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Location</Label>
                                    <Input name="location" defaultValue={store.location} className="h-8 text-sm" />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Store Type</Label>
                                    <Select name="storeType" defaultValue={store.store_type || 'both'}>
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="both">Both (Receive & Sell)</SelectItem>
                                        <SelectItem value="receive">Receive Only</SelectItem>
                                        <SelectItem value="sell">Sell Only</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button type="submit" size="sm">Update Store</Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStore(store.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Receiving</CardTitle>
                <CardDescription className="text-xs">Select items from master list to receive inventory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Master List Management Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="w-full">
                        <Package className="w-3 h-3 mr-2" />
                        Quick Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Item to Master List</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const name = formData.get("newItemName") as string;
                        const brand = formData.get("newItemBrand") as string;
                        const category = formData.get("newItemCategory") as string;
                        const barcode = formData.get("newItemBarcode") as string;
                        const colorCode = formData.get("newItemColorCode") as string;

                        try {
                          const { error } = await supabase.from("fifo_items").insert({
                            user_id: user?.id,
                            name,
                            brand: brand || null,
                            category: category || null,
                            barcode: barcode || null,
                            color_code: colorCode || null,
                          });

                          if (error) throw error;
                          toast.success("Item added to master list");
                          fetchData();
                          e.currentTarget.reset();
                        } catch (error: any) {
                          toast.error(error.message);
                        }
                      }} className="space-y-3">
                        <div>
                          <Label className="text-sm">Item Name *</Label>
                          <Input name="newItemName" required className="h-9" />
                        </div>
                        <div>
                          <Label className="text-sm">Brand</Label>
                          <Input name="newItemBrand" className="h-9" />
                        </div>
                        <div>
                          <Label className="text-sm">Category</Label>
                          <Input name="newItemCategory" className="h-9" />
                        </div>
                        <div>
                          <Label className="text-sm">Barcode</Label>
                          <Input name="newItemBarcode" className="h-9" />
                        </div>
                        <div>
                          <Label className="text-sm">Color Code</Label>
                          <Input name="newItemColorCode" type="color" className="h-9" />
                        </div>
                        <Button type="submit" className="w-full">Add to Master List</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog onOpenChange={(open) => {
                    if (!open) {
                      setPastedText("");
                      setParsedItems([]);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="w-full">
                        📋 Paste List
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Paste Item List</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {parsedItems.length === 0 ? (
                          <>
                            <div>
                              <Textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="Paste item names here, one per line..."
                                className="min-h-[200px]"
                              />
                              <p className="text-sm text-muted-foreground mt-2">
                                Enter one item name per line
                              </p>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setPastedText("");
                                  setParsedItems([]);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={() => {
                                  const names = pastedText
                                    .split("\n")
                                    .map(line => line.trim())
                                    .filter(name => name.length > 0);
                                  setParsedItems(names);
                                }}
                                disabled={!pastedText.trim()}
                              >
                                Parse Items
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{parsedItems.length} items ready</p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setParsedItems([]);
                                    setPastedText("");
                                  }}
                                >
                                  Clear All
                                </Button>
                              </div>
                              <ScrollArea className="h-[300px] border rounded-md p-2">
                                <div className="space-y-1">
                                  {parsedItems.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 hover:bg-accent rounded">
                                      <Input
                                        value={item}
                                        onChange={(e) => {
                                          const newItems = [...parsedItems];
                                          newItems[index] = e.target.value;
                                          setParsedItems(newItems);
                                        }}
                                        className="flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setParsedItems(parsedItems.filter((_, i) => i !== index));
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setParsedItems([]);
                                  setPastedText("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button onClick={async () => {
                                try {
                                  const existingNames = new Set(items.map(item => item.name.toLowerCase()));
                                  const newNames = parsedItems.filter(name => !existingNames.has(name.toLowerCase()));
                                  const duplicates = parsedItems.length - newNames.length;

                                  if (newNames.length === 0) {
                                    toast.error("All items already exist in master list");
                                    return;
                                  }

                                  const itemsToInsert = newNames.map(name => ({
                                    user_id: user?.id,
                                    name: name,
                                  }));

                                  const { error } = await supabase.from("fifo_items").insert(itemsToInsert);

                                  if (error) throw error;

                                  const message = duplicates > 0 
                                    ? `${itemsToInsert.length} new items added (${duplicates} duplicates skipped)`
                                    : `${itemsToInsert.length} items added to master list`;
                                  
                                  toast.success(message);
                                  fetchData();
                                  setParsedItems([]);
                                  setPastedText("");
                                } catch (error: any) {
                                  toast.error(error.message || "Failed to add items");
                                }
                              }}>
                                Add Items
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx,.xls,.csv';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;

                        try {
                          const data = await file.arrayBuffer();
                          const workbook = XLSX.read(data);
                          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                          const jsonData = XLSX.utils.sheet_to_json(worksheet);

                          const itemsToInsert = jsonData.map((row: any) => ({
                            user_id: user?.id,
                            name: row.name || row.Name || row.item || row.Item || row.product || row.Product,
                            brand: row.brand || row.Brand || null,
                            category: row.category || row.Category || null,
                            barcode: row.barcode || row.Barcode || null,
                            color_code: row.color_code || row.ColorCode || row.color || null,
                            description: row.description || row.Description || null,
                          })).filter(item => item.name);

                          if (itemsToInsert.length === 0) {
                            toast.error("No valid items found in file. Make sure you have a 'name' or 'Name' column.");
                            return;
                          }

                          const { error } = await supabase.from("fifo_items").insert(itemsToInsert);

                          if (error) throw error;

                          toast.success(`${itemsToInsert.length} items added to master list`);
                          fetchData();
                        } catch (error: any) {
                          toast.error(`Upload failed: ${error.message}`);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="w-3 h-3 mr-2" />
                    Bulk Upload List
                  </Button>
                </div>
                
                {/* Info card for all upload methods */}
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-xs space-y-1">
                    <p className="font-medium">📋 Three Ways to Add Items:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><strong>Quick Add:</strong> Add one item at a time</li>
                      <li><strong>Paste List:</strong> Copy from Google Sheets/Excel and paste</li>
                      <li><strong>Bulk Upload:</strong> Upload Excel/CSV file</li>
                    </ul>
                  </CardContent>
                </Card>

                <form onSubmit={handleAddItem} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Store Location</Label>
                      <Select name="storeId" required>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border z-[100]">
                          {stores.filter(s => s.store_type === 'receive' || s.store_type === 'both').map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} - {store.location} {store.store_type === 'receive' ? '📥' : '🔄'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Select Item from Master List *</Label>
                      <Select 
                        value={selectedMasterItemId}
                        onValueChange={(value) => {
                          setSelectedMasterItemId(value);
                        }}
                        required
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Choose from master list..." />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border z-[100]">
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex items-center gap-2">
                                {item.color_code && (
                                  <div 
                                    className="w-3 h-3 rounded flex-shrink-0" 
                                    style={{ backgroundColor: item.color_code }}
                                  />
                                )}
                                <span>{item.name}</span>
                                {item.brand && <span className="text-xs text-muted-foreground">({item.brand})</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input name="quantity" type="number" step="0.01" className="h-8 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">Expiration Date</Label>
                      <Input name="expirationDate" type="date" className="h-8 text-sm" required />
                    </div>
                  </div>
                  <Button type="submit" size="sm">Receive Item (Generate Barcode)</Button>
                </form>

                <div className="grid gap-2 mt-4">
                  <h3 className="text-sm font-semibold">Received Items (FIFO Order)</h3>
                  {inventory
                    .filter(inv => {
                      // First check quantity and status
                      if (inv.quantity <= 0 || inv.status === 'sold') return false;
                      
                      // Apply store filter
                      if (selectedStore && selectedStore !== 'all') {
                        // If specific store selected, show only that store
                        return inv.store_id === selectedStore;
                      } else {
                        // If "All Stores" selected, show only Basement and Attiko
                        const storeName = inv.stores?.name?.toLowerCase() || "";
                        return storeName.includes("basement") || storeName.includes("attiko");
                      }
                    })
                    .sort((a, b) => new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime())
                    .map((inv) => {
                      const daysUntilExpiry = getDaysUntilExpiry(inv.expiration_date);
                      const item = items.find(i => i.id === inv.item_id);
                      if (!item) return null;
                      
                      return (
                        <Card 
                          key={inv.id} 
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setQuickTransferItem(inv)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                {item.color_code && (
                                  <div 
                                    className="w-4 h-4 rounded inline-block mr-2" 
                                    style={{ backgroundColor: item.color_code }}
                                  />
                                )}
                                <h3 className="text-sm font-semibold inline">{item.name}</h3>
                                {item.brand && <p className="text-xs text-muted-foreground">Brand: {item.brand}</p>}
                                {item.category && <p className="text-xs text-muted-foreground">Category: {item.category}</p>}
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs">
                                    <span className="font-medium">Store:</span> {inv.stores?.name} ({inv.stores?.location})
                                  </p>
                                  <p className="text-xs">
                                    <span className="font-medium">Qty:</span> {inv.quantity}
                                  </p>
                                  <p className={`text-xs font-medium ${
                                    daysUntilExpiry < 0 ? 'text-red-600' :
                                    daysUntilExpiry <= 3 ? 'text-orange-600' :
                                    daysUntilExpiry <= 7 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    <span>Expires:</span> {new Date(inv.expiration_date).toLocaleDateString()} 
                                    ({daysUntilExpiry < 0 ? 'EXPIRED' : `${daysUntilExpiry} days left`})
                                  </p>
                                  <Badge className="text-xs" variant={inv.priority_score >= 80 ? "destructive" : "secondary"}>
                                    FIFO Priority: {inv.priority_score}
                                  </Badge>
                                </div>
                                {item.barcode && (
                                  <div className="mt-2 p-2 bg-white border rounded">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex gap-[1px]">
                                        {item.barcode.split('').map((char, i) => (
                                          <div key={i} className="w-[2px] h-12 bg-black" style={{ 
                                            opacity: parseInt(char) % 2 === 0 ? 1 : 0.3 
                                          }} />
                                        ))}
                                      </div>
                                      <p className="text-xs font-mono tracking-wider">{item.barcode}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage-items">
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Manage Items</CardTitle>
                    <CardDescription className="text-xs">
                      {items.length} items in master list
                    </CardDescription>
                  </div>
                  {items.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteAllDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items in master list yet. Add items from the Receiving tab.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {items.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold">{item.name}</h3>
                              {item.brand && <p className="text-xs text-muted-foreground">Brand: {item.brand}</p>}
                              {item.category && <p className="text-xs text-muted-foreground">Category: {item.category}</p>}
                              {item.barcode && <p className="text-xs text-muted-foreground">Barcode: {item.barcode}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingItemMaster(item)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                              </Dialog>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setItemMasterToDelete(item)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Manage Staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={handleAddEmployee} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Employee Name</Label>
                      <Input name="employeeName" className="h-8 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">Title/Position</Label>
                      <Input name="title" className="h-8 text-sm" required />
                    </div>
                  </div>
                  <Button type="submit" size="sm">Add Employee</Button>
                </form>

                <div className="grid gap-2 mt-4">
                  {employees.map((emp) => (
                    <Card key={emp.id}>
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold">{emp.name}</h3>
                            <p className="text-xs text-muted-foreground">{emp.title}</p>
                          </div>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Employee</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={(e) => handleUpdateEmployee(e, emp.id)} className="space-y-3">
                                  <div>
                                    <Label className="text-xs">Employee Name</Label>
                                    <Input name="employeeName" defaultValue={emp.name} className="h-8 text-sm" required />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Title/Position</Label>
                                    <Input name="title" defaultValue={emp.title} className="h-8 text-sm" required />
                                  </div>
                                  <Button type="submit" size="sm">Update Employee</Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteEmployee(emp.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Transfer Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={handleTransfer} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Select Item to Transfer</Label>
                      <Select 
                        name="itemId" 
                        required
                        value={selectedTransferItemId}
                        onValueChange={setSelectedTransferItemId}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border z-[100] max-h-[300px]">
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} {item.brand && `(${item.brand})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedTransferItemId && selectedFromStoreId && (
                      <div className="col-span-2">
                        <Badge variant="outline" className="w-full justify-center">
                          Available Stock: {
                            inventory
                              .filter(inv => 
                                inv.item_id === selectedTransferItemId && 
                                inv.store_id === selectedFromStoreId &&
                                inv.status === 'available'
                              )
                              .reduce((sum, inv) => sum + inv.quantity, 0)
                          } units
                        </Badge>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs">From Store (Source)</Label>
                      <Select 
                        name="fromStoreId" 
                        required
                        value={selectedFromStoreId}
                        onValueChange={setSelectedFromStoreId}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select source store" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border z-[100]">
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Quantity to Transfer</Label>
                      <Input 
                        name="quantity" 
                        type="number" 
                        step="0.01" 
                        className="h-8 text-sm" 
                        required 
                        max={
                          selectedTransferItemId && selectedFromStoreId
                            ? inventory
                                .filter(inv => 
                                  inv.item_id === selectedTransferItemId && 
                                  inv.store_id === selectedFromStoreId &&
                                  inv.status === 'available'
                                )
                                .reduce((sum, inv) => sum + inv.quantity, 0)
                            : undefined
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To Store (Destination)</Label>
                      <Select name="toStoreId" required>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-popover border z-[100]">
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Transferred By</Label>
                    <Select name="transferredBy" required>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-popover border z-[100]">
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Transfer Notes</Label>
                    <Textarea name="transferNotes" className="text-sm" rows={2} />
                  </div>
                  <Button type="submit" size="sm">Complete Transfer</Button>
                </form>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold mb-2">Recent Transfers</h3>
                  <div className="space-y-1">
                    {transfers
                      .filter((transfer) => transfer.from_store_id !== transfer.to_store_id)
                      .slice(0, 10)
                      .map((transfer) => (
                        <Card key={transfer.id}>
                          <CardContent className="p-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium">
                                  {transfer.from_store?.name} → {transfer.to_store?.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  By: {transfer.employees?.name} • Qty: {transfer.quantity}
                                </p>
                              </div>
                              <Badge className="text-xs">{transfer.status}</Badge>
                            </div>
                            <p className="text-xs mt-0.5">
                              {new Date(transfer.transfer_date).toLocaleString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div id="barcode-reader" className="w-full"></div>
        </DialogContent>
      </Dialog>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Expiry Date from Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  analyzePhotoForExpiry(file);
                  setPhotoDialogOpen(false);
                }
              }}
            />
            <p className="text-sm text-muted-foreground">
              Take a photo of the product's expiry date. Our AI will extract the date automatically.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Master Dialog */}
      <Dialog open={!!editingItemMaster} onOpenChange={(open) => !open && setEditingItemMaster(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItemMaster && (
            <form onSubmit={handleUpdateItemMaster} className="space-y-3">
              {editingItemMaster.barcode && (
                <div className="flex justify-center p-3 bg-muted rounded-lg">
                  <div className="text-center space-y-2">
                    <div className="bg-white p-2 rounded inline-block border">
                      <div className="flex gap-[1px]">
                        {editingItemMaster.barcode.split('').map((char: string, i: number) => (
                          <div key={i} className="w-[2px] h-12 bg-black" style={{ 
                            opacity: parseInt(char) % 2 === 0 ? 1 : 0.3 
                          }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs font-mono tracking-wider">{editingItemMaster.barcode}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Item Name</Label>
                  <Input name="itemName" defaultValue={editingItemMaster.name} className="h-8 text-sm" required />
                </div>
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Input name="brand" defaultValue={editingItemMaster.brand} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Input name="category" defaultValue={editingItemMaster.category} className="h-8 text-sm" placeholder="e.g., Dairy, Meat" />
                </div>
                <div>
                  <Label className="text-xs">Color Code</Label>
                  <Input name="colorCode" type="color" defaultValue={editingItemMaster.color_code || "#000000"} className="h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea name="description" defaultValue={editingItemMaster.description} className="text-sm" rows={2} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingItemMaster(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">Update Item</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Item Master Confirmation Dialog */}
      <AlertDialog open={!!itemMasterToDelete} onOpenChange={(open) => !open && setItemMasterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{itemMasterToDelete?.name}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemMasterToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItemMaster} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Items Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>all {items.length} items</strong> from the master list. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                try {
                  const { error } = await supabase
                    .from("fifo_items")
                    .delete()
                    .eq("user_id", user?.id);

                  if (error) throw error;

                  toast.success(`All ${items.length} items deleted successfully`);
                  setShowDeleteAllDialog(false);
                  fetchData();
                } catch (error: any) {
                  toast.error("Failed to delete items");
                  console.error(error);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Transfer Dialog */}
      <Dialog open={!!quickTransferItem} onOpenChange={(open) => !open && setQuickTransferItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Transfer</DialogTitle>
          </DialogHeader>
          {quickTransferItem && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const toStoreId = formData.get("toStoreId") as string;
              const quantity = parseFloat(formData.get("quantity") as string);

              if (quickTransferItem.store_id === toStoreId) {
                toast.error("Cannot transfer to the same store");
                return;
              }

              if (quantity > quickTransferItem.quantity) {
                toast.error(`Cannot transfer ${quantity} items. Only ${quickTransferItem.quantity} available.`);
                return;
              }

              const { data: transfer, error: transferError } = await supabase
                .from("fifo_transfers")
                .insert({
                  user_id: user.id,
                  inventory_id: quickTransferItem.id,
                  from_store_id: quickTransferItem.store_id,
                  to_store_id: toStoreId,
                  quantity: quantity,
                  transferred_by: formData.get("transferredBy") as string,
                  notes: formData.get("notes") as string,
                  status: "completed"
                })
                .select()
                .single();

              if (transferError) {
                toast.error("Failed to create transfer");
                return;
              }

              const remainingQty = quickTransferItem.quantity - quantity;

              await supabase
                .from("fifo_inventory")
                .update({
                  quantity: remainingQty,
                  status: remainingQty <= 0 ? "transferred" : "available"
                })
                .eq("id", quickTransferItem.id);

              const { data: destInv } = await supabase
                .from("fifo_inventory")
                .select("*")
                .eq("store_id", toStoreId)
                .eq("item_id", quickTransferItem.item_id)
                .eq("expiration_date", quickTransferItem.expiration_date)
                .single();

              if (destInv) {
                await supabase
                  .from("fifo_inventory")
                  .update({ quantity: destInv.quantity + quantity })
                  .eq("id", destInv.id);
              } else {
                await supabase.from("fifo_inventory").insert({
                  user_id: user.id,
                  store_id: toStoreId,
                  item_id: quickTransferItem.item_id,
                  quantity: quantity,
                  expiration_date: quickTransferItem.expiration_date,
                  received_date: new Date().toISOString(),
                  batch_number: quickTransferItem.batch_number,
                  status: "available"
                });
              }

              await supabase.from("fifo_activity_log").insert({
                user_id: user.id,
                inventory_id: quickTransferItem.id,
                store_id: quickTransferItem.store_id,
                action_type: "transferred",
                quantity_before: quickTransferItem.quantity,
                quantity_after: quickTransferItem.quantity - quantity,
                details: { to_store_id: toStoreId, transfer_id: transfer.id }
              });

              toast.success(`Transfer completed! Transferred: ${quantity}, Remaining: ${remainingQty}`);
              fetchData();
              setQuickTransferItem(null);
            }} className="space-y-3">
              <div className="space-y-2">
                <div className="p-2 bg-muted rounded">
                  <p className="text-sm font-medium">{quickTransferItem.items?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    From: {quickTransferItem.stores?.name} • Available: {quickTransferItem.quantity}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs">Quantity to Transfer</Label>
                  <Input 
                    name="quantity" 
                    type="number" 
                    step="0.01" 
                    max={quickTransferItem.quantity}
                    className="h-8 text-sm" 
                    required 
                  />
                </div>
                
                <div>
                  <Label className="text-xs">To Store (Destination)</Label>
                  <Select name="toStoreId" required>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-popover border z-[100]">
                      {stores.filter(s => s.id !== quickTransferItem.store_id).map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Transferred By</Label>
                  <Select name="transferredBy" required>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-popover border z-[100]">
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Notes (Optional)</Label>
                  <Textarea name="notes" className="text-sm" rows={2} />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setQuickTransferItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">Complete Transfer</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default InventoryManager;
