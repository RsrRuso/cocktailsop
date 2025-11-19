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
      toast.success("Item marked as sold");
      
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
    const quantity = parseFloat(formData.get("transferQuantity") as string);

    const { data: sourceInv } = await supabase
      .from("inventory")
      .select("*")
      .eq("id", inventoryId)
      .single();

    if (!sourceInv) {
      toast.error("Source inventory not found");
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

    await supabase
      .from("inventory")
      .update({ 
        quantity: sourceInv.quantity - quantity,
        status: sourceInv.quantity - quantity <= 0 ? "transferred" : "available"
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

    toast.success("Transfer completed successfully");
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
      
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">FIFO Inventory Manager</h1>
            <p className="text-muted-foreground">Track inventory with First-In-First-Out priority</p>
          </div>
          <QRCodeSVG value={window.location.href} size={80} />
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="inventory">
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="fifo">
              <TrendingUp className="w-4 h-4 mr-2" />
              FIFO Priority
            </TabsTrigger>
            <TabsTrigger value="stores">
              <Store className="w-4 h-4 mr-2" />
              Stores
            </TabsTrigger>
            <TabsTrigger value="items">
              <Package className="w-4 h-4 mr-2" />
              Items
            </TabsTrigger>
            <TabsTrigger value="staff">
              <Users className="w-4 h-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="transfer">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Add Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <Button onClick={startBarcodeScanner} variant="outline">
                    <Scan className="w-4 h-4 mr-2" />
                    Scan Barcode
                  </Button>
                  <Button onClick={() => setPhotoDialogOpen(true)} variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Expiry Photo
                  </Button>
                </div>

                <form onSubmit={handleAddInventory} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Store</Label>
                      <Select name="storeId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} - {store.area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Item</Label>
                      <Select name="itemId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} {item.brand && `- ${item.brand}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input name="quantity" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label>Expiration Date</Label>
                      <Input name="expirationDate" type="date" required />
                    </div>
                    <div>
                      <Label>Received Date</Label>
                      <Input name="receivedDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <Label>Batch Number</Label>
                      <Input name="batchNumber" />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea name="notes" />
                  </div>
                  <Button type="submit">Add to Inventory</Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {inventory.filter(inv => inv.status === 'available').map((inv) => {
                const daysUntilExpiry = getDaysUntilExpiry(inv.expiration_date);
                return (
                  <Card key={inv.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{inv.items?.name}</h3>
                            {inv.items?.color_code && (
                              <div 
                                className="w-6 h-6 rounded-full border-2" 
                                style={{ backgroundColor: inv.items.color_code }}
                                title={inv.items.color_code}
                              />
                            )}
                            <Badge className={getPriorityBadgeColor(inv.priority_score)}>
                              Priority: {inv.priority_score}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {inv.items?.brand && `${inv.items.brand} • `}
                            {inv.items?.category && `${inv.items.category} • `}
                            Store: {inv.stores?.name}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p>Quantity: <strong>{inv.quantity}</strong></p>
                            <p>Expires: <strong>{new Date(inv.expiration_date).toLocaleDateString()}</strong> 
                              <span className={daysUntilExpiry <= 7 ? "text-red-500 ml-2" : daysUntilExpiry <= 14 ? "text-orange-500 ml-2" : "ml-2"}>
                                ({daysUntilExpiry} days)
                              </span>
                            </p>
                            <p>Received: {new Date(inv.received_date).toLocaleDateString()}</p>
                            {inv.batch_number && <p>Batch: {inv.batch_number}</p>}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleMarkAsSold(inv.id, inv.quantity)}
                          variant="destructive"
                          size="sm"
                        >
                          Mark as Sold
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="fifo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  FIFO Priority Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store to view recommendations" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedStore && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Items sorted by urgency (highest priority first)
                    </p>
                    {fifoRecommendations.map((item, index) => {
                      const daysUntilExpiry = getDaysUntilExpiry(item.expiration_date);
                      return (
                        <Card key={item.id} className="border-l-4" style={{
                          borderLeftColor: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#eab308'
                        }}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                                <div>
                                  <h4 className="font-semibold">{item.items?.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {item.items?.brand} • Qty: {item.quantity}
                                  </p>
                                  <p className="text-xs">
                                    Expires in <strong className={daysUntilExpiry <= 7 ? "text-red-500" : ""}>{daysUntilExpiry} days</strong>
                                  </p>
                                </div>
                              </div>
                              <Badge className={getPriorityBadgeColor(item.priority_score)}>
                                {item.priority_score}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activityLog.slice(0, 10).map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-2 bg-muted rounded">
                      <Badge variant="outline">{log.action_type}</Badge>
                      <p className="text-sm flex-1">
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
              <CardHeader>
                <CardTitle>Add Store</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStore} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Store Name</Label>
                      <Input name="storeName" required />
                    </div>
                    <div>
                      <Label>Area</Label>
                      <Input name="area" required />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input name="address" />
                  </div>
                  <Button type="submit">Add Store</Button>
                </form>

                <div className="mt-6 grid gap-3">
                  {stores.map((store) => (
                    <Card key={store.id}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">{store.area}</p>
                        {store.address && <p className="text-xs mt-1">{store.address}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Add Item</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Item Name</Label>
                      <Input name="itemName" required />
                    </div>
                    <div>
                      <Label>Brand</Label>
                      <Input name="brand" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input name="category" placeholder="e.g., Dairy, Meat, Produce" />
                    </div>
                    <div>
                      <Label>Color Code</Label>
                      <Input name="colorCode" type="color" />
                    </div>
                    <div>
                      <Label>Barcode</Label>
                      <Input name="barcode" />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea name="description" />
                  </div>
                  <Button type="submit">Add Item</Button>
                </form>

                <div className="mt-6 grid gap-3">
                  {items.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4 flex items-center gap-3">
                        {item.color_code && (
                          <div 
                            className="w-8 h-8 rounded border-2" 
                            style={{ backgroundColor: item.color_code }}
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
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
              <CardHeader>
                <CardTitle>Manage Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  const { error } = await supabase.from("employees").insert({
                    user_id: user.id,
                    name: formData.get("employeeName") as string,
                    title: formData.get("title") as string,
                  });

                  if (!error) {
                    toast.success("Employee added");
                    fetchData();
                    e.currentTarget.reset();
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Employee Name</Label>
                      <Input name="employeeName" required />
                    </div>
                    <div>
                      <Label>Title/Role</Label>
                      <Input name="title" required />
                    </div>
                  </div>
                  <Button type="submit">Add Employee</Button>
                </form>

                <div className="mt-6 grid gap-3">
                  {employees.map((emp) => (
                    <Card key={emp.id}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{emp.name}</h3>
                        <p className="text-sm text-muted-foreground">{emp.title}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfer">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <Label>Select Inventory Item</Label>
                    <Select name="inventoryId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item to transfer" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.filter(inv => inv.status === 'available' && inv.quantity > 0).map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.items?.name} - {inv.stores?.name} (Qty: {inv.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>To Store</Label>
                      <Select name="toStoreId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Destination store" />
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
                      <Label>Quantity to Transfer</Label>
                      <Input name="transferQuantity" type="number" step="0.01" required />
                    </div>
                  </div>
                  <div>
                    <Label>Transferred By</Label>
                    <Select name="transferredBy" required>
                      <SelectTrigger>
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
                    <Label>Transfer Notes</Label>
                    <Textarea name="transferNotes" />
                  </div>
                  <Button type="submit">Complete Transfer</Button>
                </form>

                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Recent Transfers</h3>
                  <div className="space-y-2">
                    {transfers.slice(0, 10).map((transfer) => (
                      <Card key={transfer.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {transfer.from_store?.name} → {transfer.to_store?.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                By: {transfer.transferred_by?.name} • Qty: {transfer.quantity}
                              </p>
                            </div>
                            <Badge>{transfer.status}</Badge>
                          </div>
                          <p className="text-xs mt-1">
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
