import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Package, Store, Users, ArrowRightLeft, Upload, Camera, Scan, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const InventoryManager = () => {
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
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchFIFORecommendations(selectedStore);
    }
  }, [selectedStore, inventory]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [storesRes, itemsRes, employeesRes, inventoryRes, transfersRes, activityRes] = await Promise.all([
      supabase.from("stores").select("*").eq("user_id", user.id).order("name"),
      supabase.from("items").select("*").eq("user_id", user.id).order("name"),
      supabase.from("employees").select("*").eq("user_id", user.id).order("name"),
      supabase.from("inventory").select(`
        *,
        stores(name, area),
        items(name, brand, color_code, category)
      `).eq("user_id", user.id).order("priority_score", { ascending: false }),
      supabase.from("inventory_transfers").select(`
        *,
        from_store:stores!from_store_id(name),
        to_store:stores!to_store_id(name),
        transferred_by:employees(name)
      `).eq("user_id", user.id).order("transfer_date", { ascending: false }).limit(20),
      supabase.from("inventory_activity_log").select(`
        *,
        stores(name),
        employees(name)
      `).eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
    ]);

    if (storesRes.data) setStores(storesRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (employeesRes.data) setEmployees(employeesRes.data);
    if (inventoryRes.data) setInventory(inventoryRes.data);
    if (transfersRes.data) setTransfers(transfersRes.data);
    if (activityRes.data) setActivityLog(activityRes.data);
  };

  const fetchFIFORecommendations = async (storeId: string) => {
    const { data } = await supabase
      .from("inventory")
      .select(`
        *,
        items(name, brand, color_code),
        stores(name)
      `)
      .eq("store_id", storeId)
      .eq("status", "available")
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
            .from("items")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", rowData.item_name || rowData.name)
            .single();

          let itemId = existingItem?.id;

          if (!itemId) {
            const { data: newItem } = await supabase
              .from("items")
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
            .from("stores")
            .select("id")
            .eq("user_id", user.id)
            .eq("name", rowData.store_name || rowData.store)
            .single();

          if (store && itemId) {
            await supabase.from("inventory").insert({
              user_id: user.id,
              store_id: store.id,
              item_id: itemId,
              quantity: rowData.quantity || 1,
              expiration_date: rowData.expiration_date || rowData.expiry_date,
              received_date: rowData.received_date || new Date().toISOString(),
              batch_number: rowData.batch_number,
              notes: rowData.notes
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
            .from("items")
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

    const { error } = await supabase.from("stores").insert({
      user_id: user.id,
      name: formData.get("storeName") as string,
      area: formData.get("area") as string,
      address: formData.get("address") as string,
    });

    if (error) {
      toast.error("Failed to add store");
    } else {
      toast.success("Store added successfully");
      fetchData();
      e.currentTarget.reset();
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("items").insert({
      user_id: user.id,
      name: formData.get("itemName") as string,
      brand: formData.get("brand") as string,
      category: formData.get("category") as string,
      color_code: formData.get("colorCode") as string,
      barcode: formData.get("barcode") as string,
      description: formData.get("description") as string,
    });

    if (error) {
      toast.error("Failed to add item");
    } else {
      toast.success("Item added successfully");
      fetchData();
      e.currentTarget.reset();
    }
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("employees").insert({
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

  const handleAddInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("inventory").insert({
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
      
      await supabase.from("inventory_activity_log").insert({
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
      .from("inventory")
      .update({ status: "sold", quantity: 0 })
      .eq("id", inventoryId);

    if (!error) {
      toast.success("Item archived - moved to Archive tab");
      
      const { data: inv } = await supabase.from("inventory").select("*").eq("id", inventoryId).single();
      
      await supabase.from("inventory_activity_log").insert({
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

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const inventoryId = formData.get("inventoryId") as string;
    const toStoreId = formData.get("toStoreId") as string;
    const quantity = parseFloat(formData.get("quantity") as string);

    const { data: sourceInv } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", inventoryId)
      .single();

    if (!sourceInv) {
      toast.error("Source inventory not found");
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
      .from("inventory_transfers")
      .insert({
        user_id: user.id,
        inventory_id: inventoryId,
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
      .from("inventory")
      .update({ 
        quantity: remainingQty,
        status: remainingQty <= 0 ? "transferred" : "available"
      })
      .eq("id", inventoryId);

    const { data: destInv } = await supabase
      .from("inventory")
      .select("*")
      .eq("store_id", toStoreId)
      .eq("item_id", sourceInv.item_id)
      .eq("expiration_date", sourceInv.expiration_date)
      .single();

    if (destInv) {
      await supabase
        .from("inventory")
        .update({ quantity: destInv.quantity + quantity })
        .eq("id", destInv.id);
    } else {
      await supabase.from("inventory").insert({
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

    await supabase.from("inventory_activity_log").insert({
      user_id: user.id,
      inventory_id: inventoryId,
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

  return (
    <div className="min-h-screen bg-background pb-20">
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
          <TabsList className="grid w-full grid-cols-7 h-auto">
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
            {/* Compact Table View */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Active Inventory</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-2">Item</TableHead>
                        <TableHead className="text-xs py-2">Store</TableHead>
                        <TableHead className="text-xs py-2">Qty</TableHead>
                        <TableHead className="text-xs py-2">Expiry</TableHead>
                        <TableHead className="text-xs py-2">Priority</TableHead>
                        <TableHead className="text-xs py-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory
                        .filter(inv => 
                          inv.status !== 'sold' && 
                          (!selectedStore || selectedStore === 'all' || inv.store_id === selectedStore)
                        )
                        .map((inv) => {
                          const daysUntil = getDaysUntilExpiry(inv.expiration_date);
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1">
                                  {inv.items?.color_code && (
                                    <div 
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: inv.items.color_code }}
                                    />
                                  )}
                                  <span className="text-xs font-medium">{inv.items?.name}</span>
                                </div>
                                {inv.items?.brand && (
                                  <div className="text-xs text-muted-foreground">{inv.items.brand}</div>
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="text-xs font-medium">{inv.stores?.name}</div>
                                <div className="text-xs text-muted-foreground">{inv.stores?.area}</div>
                              </TableCell>
                              <TableCell className="py-2">
                                <span className="text-sm font-bold">{inv.quantity}</span>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="text-xs">{new Date(inv.expiration_date).toLocaleDateString()}</div>
                                <div className={`text-xs ${daysUntil < 7 ? 'text-red-500' : daysUntil < 30 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                  {daysUntil} days
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <Badge 
                                  className={`${getPriorityBadgeColor(inv.priority_score || 0)} text-white text-xs`}
                                >
                                  {inv.priority_score || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => handleMarkAsSold(inv.id, inv.quantity)}
                                  disabled={inv.status !== 'available'}
                                >
                                  Sold
                                </Button>
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
                        .filter((inv) => 
                          inv.status === 'sold' && 
                          (!selectedStore || selectedStore === 'all' || inv.store_id === selectedStore)
                        )
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
                  <Button type="submit" size="sm">Add Store</Button>
                </form>

                <div className="grid gap-2 mt-4">
                  {stores.map((store) => (
                    <Card key={store.id}>
                      <CardContent className="p-2">
                        <h3 className="text-sm font-semibold">{store.name}</h3>
                        <p className="text-xs text-muted-foreground">{store.area}</p>
                        {store.address && <p className="text-xs mt-0.5">{store.address}</p>}
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
                <CardTitle className="text-sm font-medium">Manage Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form onSubmit={handleAddItem} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Item Name</Label>
                      <Input name="itemName" className="h-8 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">Brand</Label>
                      <Input name="brand" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Input name="category" className="h-8 text-sm" placeholder="e.g., Dairy, Meat" />
                    </div>
                    <div>
                      <Label className="text-xs">Color Code</Label>
                      <Input name="colorCode" type="color" className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Barcode</Label>
                      <Input name="barcode" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea name="description" className="text-sm" rows={2} />
                  </div>
                  <Button type="submit" size="sm">Add Item</Button>
                </form>

                <div className="grid gap-2 mt-4">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-2 flex items-center gap-2">
                        {item.color_code && (
                          <div 
                            className="w-4 h-4 rounded flex-shrink-0" 
                            style={{ backgroundColor: item.color_code }}
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {item.brand && `${item.brand} • `}
                            {item.category && `${item.category} • `}
                            {item.barcode && `Barcode: ${item.barcode}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                        <h3 className="text-sm font-semibold">{emp.name}</h3>
                        <p className="text-xs text-muted-foreground">{emp.title}</p>
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
                    <div>
                      <Label className="text-xs">Inventory Item</Label>
                      <Select name="inventoryId" required>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.filter(inv => inv.status === 'available').map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.items?.name} - {inv.stores?.name} (Qty: {inv.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Quantity to Transfer</Label>
                      <Input name="quantity" type="number" step="0.01" className="h-8 text-sm" required />
                    </div>
                    <div>
                      <Label className="text-xs">From Store</Label>
                      <Select name="fromStoreId" required>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">To Store</Label>
                      <Select name="toStoreId" required>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
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
                      <SelectContent>
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
                    {transfers.slice(0, 10).map((transfer) => (
                      <Card key={transfer.id}>
                        <CardContent className="p-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium">
                                {transfer.from_store?.name} → {transfer.to_store?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                By: {transfer.transferred_by?.name} • Qty: {transfer.quantity}
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

      <BottomNav />
    </div>
  );
};

export default InventoryManager;
