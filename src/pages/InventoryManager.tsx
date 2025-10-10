import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Package, Store, Users, ArrowRightLeft, AlertCircle, Share2 } from "lucide-react";

const InventoryManager = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [expirationSuggestions, setExpirationSuggestions] = useState<any[]>([]);
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
  const [newWhatsappNumber, setNewWhatsappNumber] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [messageToShare, setMessageToShare] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchExpirationSuggestions(selectedStore);
    }
  }, [selectedStore]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [storesRes, itemsRes, employeesRes, inventoryRes] = await Promise.all([
      supabase.from("stores").select("*").order("name"),
      supabase.from("items").select("*").order("name"),
      supabase.from("employees").select("*").order("name"),
      supabase.from("inventory").select(`
        *,
        stores(name, area),
        items(name)
      `).order("expiration_date"),
    ]);

    if (storesRes.data) setStores(storesRes.data);
    if (itemsRes.data) setItems(itemsRes.data);
    if (employeesRes.data) setEmployees(employeesRes.data);
    if (inventoryRes.data) setInventory(inventoryRes.data);
  };

  const fetchExpirationSuggestions = async (storeId: string) => {
    const { data } = await supabase
      .from("inventory")
      .select(`
        *,
        items(name),
        stores(name)
      `)
      .eq("store_id", storeId)
      .order("expiration_date")
      .limit(5);

    if (data) setExpirationSuggestions(data);
  };

  const shareToWhatsApp = (message: string) => {
    if (whatsappNumbers.length === 0) {
      toast.error("Please add WhatsApp numbers first");
      return;
    }
    setMessageToShare(message);
    setShareDialogOpen(true);
  };

  const handleAddWhatsappNumber = () => {
    if (!newWhatsappNumber.trim()) {
      toast.error("Please enter a WhatsApp number");
      return;
    }
    const cleanNumber = newWhatsappNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 10) {
      toast.error("Please enter a valid WhatsApp number");
      return;
    }
    if (whatsappNumbers.includes(cleanNumber)) {
      toast.error("This number is already added");
      return;
    }
    setWhatsappNumbers([...whatsappNumbers, cleanNumber]);
    setNewWhatsappNumber("");
    toast.success("WhatsApp number added");
  };

  const handleRemoveWhatsappNumber = (number: string) => {
    setWhatsappNumbers(whatsappNumbers.filter(n => n !== number));
    toast.success("WhatsApp number removed");
  };

  const handleAddStore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("stores").insert({
      name: formData.get("storeName") as string,
      area: formData.get("storeArea") as string,
      user_id: user.id,
    });

    if (error) {
      toast.error("Failed to add store");
    } else {
      toast.success("Store added successfully");
      e.currentTarget.reset();
      fetchData();
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("items").insert({
      name: formData.get("itemName") as string,
      description: formData.get("itemDescription") as string || undefined,
      user_id: user.id,
    });

    if (error) {
      toast.error("Failed to add item");
    } else {
      toast.success("Item added successfully");
      e.currentTarget.reset();
      fetchData();
    }
  };

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("employees").insert({
      name: formData.get("employeeName") as string,
      title: formData.get("employeeTitle") as string,
      user_id: user.id,
    });

    if (error) {
      toast.error("Failed to add employee");
    } else {
      toast.success("Employee added successfully");
      e.currentTarget.reset();
      fetchData();
    }
  };

  const handleAddInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const storeId = formData.get("storeId") as string;
    const itemId = formData.get("itemId") as string;
    const quantity = Number(formData.get("quantity"));
    const expirationDate = formData.get("expirationDate") as string;

    const store = stores.find(s => s.id === storeId);
    const item = items.find(i => i.id === itemId);

    const { error } = await supabase.from("inventory").insert({
      store_id: storeId,
      item_id: itemId,
      quantity,
      expiration_date: expirationDate,
      user_id: user.id,
    });

    if (error) {
      toast.error("Failed to add inventory");
    } else {
      toast.success("Inventory added successfully");
      
      const message = `📦 *Inventory Added*\n\n` +
        `Item: ${item?.name}\n` +
        `Store: ${store?.name} - ${store?.area}\n` +
        `Quantity: ${quantity}\n` +
        `Expiration Date: ${new Date(expirationDate).toLocaleDateString()}`;
      
      shareToWhatsApp(message);
      e.currentTarget.reset();
      fetchData();
    }
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fromStoreId = formData.get("fromStoreId") as string;
    const toStoreId = formData.get("toStoreId") as string;
    const itemId = formData.get("itemId") as string;
    const quantity = Number(formData.get("transferQuantity"));
    const transferredBy = formData.get("employeeId") as string;
    const expirationDate = formData.get("expirationDate") as string;

    const fromStore = stores.find(s => s.id === fromStoreId);
    const toStore = stores.find(s => s.id === toStoreId);
    const item = items.find(i => i.id === itemId);
    const employee = employees.find(e => e.id === transferredBy);

    // Get current inventory from source store
    const { data: sourceInventory } = await supabase
      .from("inventory")
      .select("*")
      .eq("store_id", fromStoreId)
      .eq("item_id", itemId)
      .order("expiration_date")
      .limit(1)
      .single();

    if (!sourceInventory || sourceInventory.quantity < quantity) {
      toast.error("Insufficient inventory in source store");
      return;
    }

    // Update source inventory
    const { error: updateError } = await supabase
      .from("inventory")
      .update({ quantity: sourceInventory.quantity - quantity })
      .eq("id", sourceInventory.id);

    if (updateError) {
      toast.error("Failed to update source inventory");
      return;
    }

    // Add to destination store
    const { error: addError } = await supabase.from("inventory").insert({
      store_id: toStoreId,
      item_id: itemId,
      quantity,
      expiration_date: expirationDate,
      user_id: user.id,
    });

    // Record transfer
    const { error: transferError } = await supabase.from("transfers").insert({
      from_store_id: fromStoreId,
      to_store_id: toStoreId,
      item_id: itemId,
      quantity,
      transferred_by: transferredBy,
      user_id: user.id,
    });

    if (addError || transferError) {
      toast.error("Failed to complete transfer");
    } else {
      toast.success("Inventory transferred successfully");
      
      // Fetch current inventory for the destination store
      const { data: currentInventory } = await supabase
        .from("inventory")
        .select(`
          *,
          items(name),
          stores(name, area)
        `)
        .eq("store_id", toStoreId)
        .order("expiration_date");

      let message = `🔄 *Inventory Transfer Complete*\n\n`;
      message += `Item: ${item?.name}\n`;
      message += `From: ${fromStore?.name} - ${fromStore?.area}\n`;
      message += `To: ${toStore?.name} - ${toStore?.area}\n`;
      message += `Quantity Transferred: ${quantity}\n`;
      message += `Transferred By: ${employee?.name}\n\n`;
      message += `📦 *Current Inventory at ${toStore?.name}*\n\n`;
      
      if (currentInventory && currentInventory.length > 0) {
        currentInventory.forEach((inv, index) => {
          message += `${index + 1}. ${inv.items?.name}\n`;
          message += `   Qty: ${inv.quantity}\n`;
          message += `   Expires: ${new Date(inv.expiration_date).toLocaleDateString()}\n\n`;
        });
      } else {
        message += `No inventory found`;
      }
      
      shareToWhatsApp(message);
      e.currentTarget.reset();
      fetchData();
    }
  };

  const shareExpirationSuggestions = () => {
    if (expirationSuggestions.length === 0) return;
    
    const store = stores.find(s => s.id === selectedStore);
    let message = `⚠️ *FIFO Alert - Expiring Soon*\n\n`;
    message += `Store: ${store?.name}\n\n`;
    
    expirationSuggestions.forEach((item, index) => {
      message += `${index + 1}. ${item.items?.name}\n`;
      message += `   Qty: ${item.quantity}\n`;
      message += `   Expires: ${new Date(item.expiration_date).toLocaleDateString()}\n\n`;
    });
    
    shareToWhatsApp(message);
  };

  const appUrl = window.location.origin + "/tools/inventory";

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="container px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Manager</h1>
            <p className="text-muted-foreground">Track FIFO, transfers, and expiration dates</p>
          </div>
          <div className="glass rounded-xl p-4">
            <QRCodeSVG value={appUrl} size={100} />
            <p className="text-xs text-center mt-2 text-muted-foreground">Scan to access</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter WhatsApp number (with country code)"
                  value={newWhatsappNumber}
                  onChange={(e) => setNewWhatsappNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWhatsappNumber())}
                />
                <Button type="button" onClick={handleAddWhatsappNumber}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter phone numbers with country code (e.g., 1234567890)
              </p>
              
              {whatsappNumbers.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Numbers ({whatsappNumbers.length})</Label>
                  <div className="space-y-2">
                    {whatsappNumbers.map((number) => (
                      <div key={number} className="glass rounded-lg p-3 flex justify-between items-center">
                        <span className="font-mono">+{number}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveWhatsappNumber(number)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="stores">Stores</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="employees">Staff</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddInventory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeId">Store</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="itemId">Item</Label>
                    <Select name="itemId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input name="quantity" type="number" required min="1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date</Label>
                    <Input name="expirationDate" type="date" required />
                  </div>
                  <Button type="submit" className="w-full">
                    <Package className="mr-2 h-4 w-4" />
                    Add Inventory
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventory.map((inv) => (
                    <div key={inv.id} className="glass rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{inv.items?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {inv.stores?.name} - Qty: {inv.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(inv.expiration_date).toLocaleDateString()}
                        </p>
                      </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input name="storeName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeArea">Area</Label>
                    <Input name="storeArea" required />
                  </div>
                  <Button type="submit" className="w-full">
                    <Store className="mr-2 h-4 w-4" />
                    Add Store
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4 mt-6">
              {stores.map((store) => (
                <Card key={store.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{store.name}</h3>
                    <p className="text-sm text-muted-foreground">{store.area}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Add Item</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Item Name</Label>
                    <Input name="itemName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="itemDescription">Description</Label>
                    <Input name="itemDescription" />
                  </div>
                  <Button type="submit" className="w-full">
                    <Package className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4 mt-6">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <CardTitle>Add Employee</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeName">Employee Name</Label>
                    <Input name="employeeName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeTitle">Title</Label>
                    <Input name="employeeTitle" required />
                  </div>
                  <Button type="submit" className="w-full">
                    <Users className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-4 mt-6">
              {employees.map((employee) => (
                <Card key={employee.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">{employee.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromStoreId">From Store</Label>
                    <Select name="fromStoreId" required>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="toStoreId">To Store</Label>
                    <Select name="toStoreId" required>
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="itemId">Item</Label>
                    <Select name="itemId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transferQuantity">Quantity</Label>
                    <Input name="transferQuantity" type="number" required min="1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Expiration Date</Label>
                    <Input name="expirationDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Transferred By</Label>
                    <Select name="employeeId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer Inventory
                  </Button>
                </form>
              </CardContent>
            </Card>

            {selectedStore && expirationSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      FIFO Suggestions - Expiring Soon
                    </div>
                    <Button variant="outline" size="sm" onClick={shareExpirationSuggestions}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share to WhatsApp
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {expirationSuggestions.map((item) => (
                      <div key={item.id} className="glass rounded-lg p-4">
                        <p className="font-semibold">{item.items?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Store: {item.stores?.name} - Qty: {item.quantity}
                        </p>
                        <p className="text-sm text-orange-500 font-medium">
                          Expires: {new Date(item.expiration_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Select Store for FIFO Suggestions</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
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
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to WhatsApp</DialogTitle>
            <DialogDescription>
              Click on each number to share the message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {whatsappNumbers.map((number) => {
              const cleanNumber = number.replace(/[^0-9]/g, '');
              const encodedMessage = encodeURIComponent(messageToShare);
              const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
              
              return (
                <a
                  key={number}
                  href={whatsappUrl}
                  target="_blank"
                  className="flex items-center justify-between w-full p-3 rounded-lg glass-hover border border-border/50 text-sm hover:border-primary/50 transition-colors"
                >
                  <span className="font-mono">+{number}</span>
                  <Share2 className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default InventoryManager;
