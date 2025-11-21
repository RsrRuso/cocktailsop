import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
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
import { 
  Store, ArrowRightLeft, ClipboardCheck, TrendingDown, 
  Users, Camera, Bell, Clock, Package, Upload, 
  CheckCircle2, AlertCircle, UserPlus, UserMinus, Shield,
  ExternalLink, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Transaction {
  id: string;
  type: 'transfer' | 'receiving' | 'spot_check' | 'variance';
  timestamp: string;
  user_email: string;
  from_store?: string;
  to_store?: string;
  store?: string;
  item_name?: string;
  item_count: number;
  status: string;
}

const StoreManagement = () => {
  const { user } = useAuth();
  const { currentWorkspace, workspaces } = useWorkspace();
  const navigate = useNavigate();
  
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [receivings, setReceivings] = useState<any[]>([]);
  const [spotChecks, setSpotChecks] = useState<any[]>([]);
  const [varianceReports, setVarianceReports] = useState<any[]>([]);
  
  // Form states
  const [selectedFromStore, setSelectedFromStore] = useState("");
  const [selectedToStore, setSelectedToStore] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  
  // Receiving form states
  const [selectedReceivingStore, setSelectedReceivingStore] = useState("");
  const [selectedReceivingItem, setSelectedReceivingItem] = useState("");
  const [receivingQuantity, setReceivingQuantity] = useState("");
  const [receivingNotes, setReceivingNotes] = useState("");
  const [receivingPhotoFile, setReceivingPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && currentWorkspace) {
      fetchAllData();
      setupRealtimeSubscriptions();
    }
  }, [user, currentWorkspace]);

  const setupRealtimeSubscriptions = () => {
    if (!currentWorkspace) return;

    const channel = supabase
      .channel('store-management-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transfers',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        () => {
          fetchAllData();
          toast.info("Transfer updated", { duration: 2000 });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_receivings',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        () => {
          fetchAllData();
          toast.info("Receiving updated", { duration: 2000 });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_spot_checks',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        () => {
          fetchAllData();
          toast.info("Spot check updated", { duration: 2000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAllData = async () => {
    if (!user || !currentWorkspace) return;

    try {
      const workspaceId = currentWorkspace.id;

      // Fetch stores
      const { data: storesData } = await supabase
        .from("stores")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");

      // Fetch items
      const { data: itemsData } = await supabase
        .from("items")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      // Fetch inventory
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select(`
          *,
          items(name, brand),
          stores(name)
        `)
        .eq("workspace_id", workspaceId);

      // Fetch transfers
      const { data: transfersData } = await supabase
        .from("inventory_transfers")
        .select(`
          *,
          from_store:stores!from_store_id(name),
          to_store:stores!to_store_id(name),
          transferred_by:employees(name)
        `)
        .eq("workspace_id", workspaceId)
        .order("transfer_date", { ascending: false })
        .limit(20);

      // Fetch receivings
      const receivingsQuery = supabase
        .from("inventory_receivings" as any)
        .select(`
          *,
          stores(name, store_type),
          items(name, brand)
        `)
        .eq("workspace_id", workspaceId)
        .order("received_at", { ascending: false })
        .limit(20);
      
      const { data: receivingsData } = await receivingsQuery;

      // Fetch spot checks
      const { data: spotChecksData } = await supabase
        .from("inventory_spot_checks")
        .select(`
          *,
          stores(name)
        `)
        .eq("workspace_id", workspaceId)
        .order("check_date", { ascending: false })
        .limit(20);

      // Fetch variance reports
      const { data: varianceData } = await supabase
        .from("variance_reports")
        .select(`
          *,
          stores(name)
        `)
        .eq("workspace_id", workspaceId)
        .order("report_date", { ascending: false })
        .limit(20);

      // Fetch workspace members
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select(`
          *,
          profiles!inner(email, full_name, username)
        `)
        .eq("workspace_id", workspaceId);

      setStores(storesData || []);
      setItems(itemsData || []);
      setInventory(inventoryData || []);
      setTransfers(transfersData || []);
      setReceivings(receivingsData || []);
      setSpotChecks(spotChecksData || []);
      setVarianceReports(varianceData || []);
      setMembers(membersData || []);

      // Build live transactions feed
      const allTransactions: Transaction[] = [];

      transfersData?.forEach((t: any) => {
        allTransactions.push({
          id: t.id,
          type: 'transfer',
          timestamp: t.transfer_date || t.created_at,
          user_email: user.email || 'Unknown',
          from_store: t.from_store?.name,
          to_store: t.to_store?.name,
          item_count: 1,
          status: t.status
        });
      });

      receivingsData?.forEach((r: any) => {
        allTransactions.push({
          id: r.id,
          type: 'receiving',
          timestamp: r.received_at || r.created_at,
          user_email: user.email || 'Unknown',
          store: r.stores?.name,
          item_name: r.items?.name,
          item_count: r.quantity,
          status: r.status
        });
      });

      spotChecksData?.forEach((s: any) => {
        allTransactions.push({
          id: s.id,
          type: 'spot_check',
          timestamp: s.check_date || s.created_at,
          user_email: user.email || 'Unknown',
          store: s.stores?.name,
          item_count: 0,
          status: s.status
        });
      });

      varianceData?.forEach((v: any) => {
        allTransactions.push({
          id: v.id,
          type: 'variance',
          timestamp: v.created_at,
          user_email: user.email || 'Unknown',
          store: v.stores?.name,
          item_count: v.total_items_checked || 0,
          status: 'completed'
        });
      });

      allTransactions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setTransactions(allTransactions.slice(0, 50));

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentWorkspace) return;

    if (!selectedFromStore || !selectedToStore || !selectedItem || !transferQuantity) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      let photoUrl = null;
      
      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `transfers/${currentWorkspace.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Create transfer
      const { error } = await supabase
        .from("inventory_transfers")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          from_store_id: selectedFromStore,
          to_store_id: selectedToStore,
          inventory_id: selectedItem,
          quantity: parseFloat(transferQuantity),
          status: 'pending',
          notes: transferNotes,
          photo_url: photoUrl,
          transfer_date: new Date().toISOString()
        });

      if (error) throw error;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: 'transfer',
        content: `Transfer initiated from ${stores.find(s => s.id === selectedFromStore)?.name} to ${stores.find(s => s.id === selectedToStore)?.name}`,
        read: false
      });

      toast.success("Transfer created successfully!");
      fetchAllData();
      
      // Reset form
      setSelectedFromStore("");
      setSelectedToStore("");
      setSelectedItem("");
      setTransferQuantity("");
      setTransferNotes("");
      setPhotoFile(null);
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Failed to create transfer");
    }
  };

  const handleCreateReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentWorkspace) return;

    if (!selectedReceivingStore || !selectedReceivingItem || !receivingQuantity) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      let photoUrl = null;
      
      // Upload photo if provided
      if (receivingPhotoFile) {
        const fileExt = receivingPhotoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `receivings/${currentWorkspace.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, receivingPhotoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Create receiving - this will trigger automatic inventory update via database trigger
      const { error } = await supabase
        .from("inventory_receivings" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          store_id: selectedReceivingStore,
          item_id: selectedReceivingItem,
          quantity: parseFloat(receivingQuantity),
          status: 'completed',
          notes: receivingNotes,
          photo_url: photoUrl,
          received_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Receiving recorded! Inventory updated automatically.");
      fetchAllData();
      
      // Reset form
      setSelectedReceivingStore("");
      setSelectedReceivingItem("");
      setReceivingQuantity("");
      setReceivingNotes("");
      setReceivingPhotoFile(null);
    } catch (error) {
      console.error("Error creating receiving:", error);
      toast.error("Failed to record receiving");
    }
  };

  const handleStartSpotCheck = async () => {
    if (!user || !currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from("inventory_spot_checks")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          store_id: stores[0]?.id,
          status: 'in_progress',
          check_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Spot check started!");
      fetchAllData();
    } catch (error) {
      console.error("Error starting spot check:", error);
      toast.error("Failed to start spot check");
    }
  };

  const handleInviteMember = async (email: string, role: string) => {
    if (!currentWorkspace) return;

    try {
      // Find user by email
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (!profiles) {
        toast.error("User not found");
        return;
      }

      // Add to workspace
      const { error } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: profiles.id,
          role: role,
          invited_by: user?.id
        });

      if (error) throw error;

      toast.success("Member invited successfully!");
      fetchAllData();
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to invite member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentWorkspace) return;

    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed");
      fetchAllData();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>No Workspace Selected</CardTitle>
              <CardDescription>
                Please select a workspace to access Store Management
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Store className="w-6 h-6" />
              Store Management
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentWorkspace.name}
            </p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Bell className="w-3 h-3" />
            Live Updates
          </Badge>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/stores-admin')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Store className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold">Stores</p>
                  <p className="text-xs text-muted-foreground">Create & manage</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/master-items')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Package className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold">Items</p>
                  <p className="text-xs text-muted-foreground">Master list</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/all-inventory')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Inventory</p>
                  <p className="text-xs text-muted-foreground">Combined view</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/inventory-transactions')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold">Transactions</p>
                  <p className="text-xs text-muted-foreground">Live updates</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/expiring-inventory/' + currentWorkspace.id)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold">Expiring</p>
                  <p className="text-xs text-muted-foreground">FIFO alerts</p>
                </div>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stores List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Your Stores ({stores.length})
            </CardTitle>
            <CardDescription>Click on a store to view its inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stores.map((store) => (
                <Card 
                  key={store.id} 
                  className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                  onClick={() => navigate(`/store/${store.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold">{store.name}</p>
                        <p className="text-xs text-muted-foreground">{store.location}</p>
                      </div>
                      <Badge variant={store.store_type === 'warehouse' ? 'default' : 'secondary'} className="text-xs">
                        {store.store_type}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-muted-foreground">View Items</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="transactions">
              <Clock className="w-4 h-4 mr-1" />
              Live
            </TabsTrigger>
            <TabsTrigger value="receivings">
              <Package className="w-4 h-4 mr-1" />
              Receive
            </TabsTrigger>
            <TabsTrigger value="transfers">
              <ArrowRightLeft className="w-4 h-4 mr-1" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="spotchecks">
              <ClipboardCheck className="w-4 h-4 mr-1" />
              Checks
            </TabsTrigger>
            <TabsTrigger value="variance">
              <TrendingDown className="w-4 h-4 mr-1" />
              Variance
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-1" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Live Transactions Feed */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Live Transaction Feed
                </CardTitle>
                <CardDescription>
                  Real-time updates from all store activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="glass rounded-lg p-4 hover:glass-hover transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {transaction.type === 'transfer' && (
                              <ArrowRightLeft className="w-5 h-5 text-blue-500 mt-1" />
                            )}
                            {transaction.type === 'spot_check' && (
                              <ClipboardCheck className="w-5 h-5 text-green-500 mt-1" />
                            )}
                            {transaction.type === 'variance' && (
                              <TrendingDown className="w-5 h-5 text-orange-500 mt-1" />
                            )}
                            {transaction.type === 'receiving' && (
                              <Package className="w-5 h-5 text-purple-500 mt-1" />
                            )}
                            
                            <div className="flex-1">
                              <p className="font-medium">
                                {transaction.type === 'transfer' && 
                                  `Transfer: ${transaction.from_store} → ${transaction.to_store}`}
                                {transaction.type === 'spot_check' && 
                                  `Spot Check at ${transaction.store}`}
                                 {transaction.type === 'variance' && 
                                  `Variance Report - ${transaction.store}`}
                                {transaction.type === 'receiving' && 
                                  `Receiving: ${transaction.item_name} at ${transaction.store}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.user_email} • {transaction.item_count} items
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(transaction.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          <Badge 
                            variant={
                              transaction.status === 'completed' ? 'default' :
                              transaction.status === 'pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receivings Tab */}
          <TabsContent value="receivings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Record Receiving</CardTitle>
                <CardDescription>
                  Record items received at warehouse - inventory updates automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateReceiving} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Warehouse / Receiving Store</Label>
                    <Select value={selectedReceivingStore} onValueChange={setSelectedReceivingStore}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select receiving store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores
                          .filter((s) => s.store_type === 'receive' || s.store_type === 'both')
                          .map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select value={selectedReceivingItem} onValueChange={setSelectedReceivingItem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} {item.brand ? `(${item.brand})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity Received</Label>
                    <Input
                      type="number"
                      value={receivingQuantity}
                      onChange={(e) => setReceivingQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                      step="any"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={receivingNotes}
                      onChange={(e) => setReceivingNotes(e.target.value)}
                      placeholder="Add notes about this delivery..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attach Photo (Optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReceivingPhotoFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    Record Receiving
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Receivings</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {receivings.map((receiving: any) => (
                      <div key={receiving.id} className="glass rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {receiving.items?.name} at {receiving.stores?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {receiving.quantity} • {new Date(receiving.received_at).toLocaleString()}
                            </p>
                            {receiving.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {receiving.notes}
                              </p>
                            )}
                          </div>
                          <Badge variant={receiving.status === 'completed' ? 'default' : 'secondary'}>
                            {receiving.status}
                          </Badge>
                        </div>
                        {receiving.photo_url && (
                          <img 
                            src={receiving.photo_url} 
                            alt="Receiving" 
                            className="mt-2 rounded-lg w-full h-32 object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Transfer</CardTitle>
                <CardDescription>
                  Transfer items between stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTransfer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Store</Label>
                      <Select value={selectedFromStore} onValueChange={setSelectedFromStore}>
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
                      <Label>To Store</Label>
                      <Select value={selectedToStore} onValueChange={setSelectedToStore}>
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
                  </div>

                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Select value={selectedItem} onValueChange={setSelectedItem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory
                          .filter(inv => inv.store_id === selectedFromStore)
                          .map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.items?.name} - Qty: {inv.quantity}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      min="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Add notes about this transfer..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Attach Photo (Optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Create Transfer
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {transfers.map((transfer: any) => (
                      <div key={transfer.id} className="glass rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {transfer.from_store?.name} → {transfer.to_store?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {transfer.quantity} • {new Date(transfer.transfer_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                            {transfer.status}
                          </Badge>
                        </div>
                        {transfer.photo_url && (
                          <img 
                            src={transfer.photo_url} 
                            alt="Transfer" 
                            className="mt-2 rounded-lg w-full h-32 object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spot Checks Tab */}
          <TabsContent value="spotchecks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Spot Checks</span>
                  <Button onClick={handleStartSpotCheck}>
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Start New Check
                  </Button>
                </CardTitle>
                <CardDescription>
                  Verify inventory accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {spotChecks.map((check: any) => (
                      <div key={check.id} className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">{check.stores?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(check.check_date).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={
                            check.status === 'completed' ? 'default' :
                            check.status === 'flagged' ? 'destructive' :
                            'secondary'
                          }>
                            {check.status}
                          </Badge>
                        </div>
                        {check.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {check.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variance Reports Tab */}
          <TabsContent value="variance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Variance Reports</CardTitle>
                <CardDescription>
                  Track inventory discrepancies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {varianceReports.map((report: any) => (
                      <div key={report.id} className="glass rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{report.stores?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(report.report_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {report.items_with_variance} items
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Checked:</span>
                            <span className="font-medium ml-2">{report.total_items_checked}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Variance Value:</span>
                            <span className="font-medium ml-2">${report.total_variance_value}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage workspace access and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <form className="space-y-4" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleInviteMember(
                          formData.get("email") as string,
                          formData.get("role") as string
                        );
                      }}>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            name="email"
                            type="email"
                            placeholder="colleague@example.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select name="role" defaultValue="member">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" className="w-full">
                          Send Invitation
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {members.map((member: any) => (
                        <div key={member.id} className="glass rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {member.profiles?.email?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {member.profiles?.full_name || member.profiles?.username}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {member.profiles?.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {member.role}
                              </Badge>
                              {member.role !== 'owner' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default StoreManagement;
