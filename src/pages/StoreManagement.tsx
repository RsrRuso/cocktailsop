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
import { ZoomableImage } from "@/components/ZoomableImage";
import { toast } from "sonner";
import { 
  Store, ArrowRightLeft, ClipboardCheck, TrendingDown, 
  Users, Camera, Bell, Clock, Package, Upload, 
  CheckCircle2, AlertCircle, UserPlus, UserMinus, Shield,
  ExternalLink, BarChart3, Trash2, Activity
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
  
  // Receiving form states
  const [selectedReceivingStore, setSelectedReceivingStore] = useState("");
  const [selectedReceivingItem, setSelectedReceivingItem] = useState("");
  const [receivingQuantity, setReceivingQuantity] = useState("");
  const [receivingNotes, setReceivingNotes] = useState("");
  
  // Edit receiving state
  const [editReceivingDialog, setEditReceivingDialog] = useState(false);
  const [editingReceiving, setEditingReceiving] = useState<any>(null);
  const [editReceivingQuantity, setEditReceivingQuantity] = useState("");

  useEffect(() => {
    if (user) {
      fetchAllData();
      setupRealtimeSubscriptions();
    }
  }, [user, currentWorkspace]);

  const setupRealtimeSubscriptions = () => {
    const workspaceFilter = currentWorkspace ? `workspace_id=eq.${currentWorkspace.id}` : `user_id=eq.${user?.id}`;

    const channel = supabase
      .channel('store-management-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_transfers',
          filter: workspaceFilter
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
          filter: workspaceFilter
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
          filter: workspaceFilter
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
    if (!user) return;

    try {
      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user.id, workspace_id: null };

      // Fetch stores
      let storesQuery = supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (currentWorkspace) {
        storesQuery = storesQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        storesQuery = storesQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: storesData } = await storesQuery;

      // Fetch items
      let itemsQuery = supabase
        .from("items")
        .select("*")
        .order("name");

      if (currentWorkspace) {
        itemsQuery = itemsQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        itemsQuery = itemsQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: itemsData } = await itemsQuery;

      // Fetch inventory
      let inventoryQuery = supabase
        .from("inventory")
        .select(`
          *,
          items(name, brand, photo_url, color_code),
          stores(name)
        `);

      if (currentWorkspace) {
        inventoryQuery = inventoryQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        inventoryQuery = inventoryQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: inventoryData } = await inventoryQuery;

      // Fetch transfers
      let transfersQuery = supabase
        .from("inventory_transfers")
        .select(`
          *,
          from_store:stores!from_store_id(name),
          to_store:stores!to_store_id(name),
          transferred_by:employees(name)
        `)
        .order("transfer_date", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        transfersQuery = transfersQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        transfersQuery = transfersQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: transfersData } = await transfersQuery;

      // Fetch receivings from inventory_activity_log
      let receivingsQuery = supabase
        .from("inventory_activity_log")
        .select(`
          *,
          stores(name, store_type)
        `)
        .eq("action_type", "received")
        .order("created_at", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        receivingsQuery = receivingsQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        receivingsQuery = receivingsQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: receivingsData } = await receivingsQuery;

      // Fetch spot checks
      let spotChecksQuery = supabase
        .from("inventory_spot_checks")
        .select(`
          *,
          stores(name)
        `)
        .order("check_date", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        spotChecksQuery = spotChecksQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        spotChecksQuery = spotChecksQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: spotChecksData } = await spotChecksQuery;

      // Fetch variance reports
      let varianceQuery = supabase
        .from("variance_reports")
        .select(`
          *,
          stores(name)
        `)
        .order("report_date", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        varianceQuery = varianceQuery.eq("workspace_id", currentWorkspace.id);
      } else {
        varianceQuery = varianceQuery.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data: varianceData } = await varianceQuery;

      // Fetch workspace members (only if workspace exists)
      let membersData = [];
      if (currentWorkspace) {
        const { data } = await supabase
          .from("workspace_members")
          .select(`
            *,
            profiles!inner(email, full_name, username)
          `)
          .eq("workspace_id", currentWorkspace.id);
        membersData = data || [];
      }

      setStores(storesData || []);
      setItems(itemsData || []);
      setInventory(inventoryData || []);
      setTransfers(transfersData || []);
      setReceivings(receivingsData || []);
      setSpotChecks(spotChecksData || []);
      setVarianceReports(varianceData || []);
      setMembers(membersData);

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
        const itemId = r.details?.item_id;
        const item = itemsData?.find((i: any) => i.id === itemId);
        const quantityBefore = typeof r.quantity_before === 'number' ? r.quantity_before : 0;
        const quantityAfter = typeof r.quantity_after === 'number' ? r.quantity_after : 0;
        const receivedQty = typeof r.details?.received_quantity === 'number'
          ? r.details.received_quantity
          : (quantityAfter - quantityBefore) || quantityAfter || 0;
        allTransactions.push({
          id: r.id,
          type: 'receiving',
          timestamp: r.created_at,
          user_email: user.email || 'Unknown',
          store: r.stores?.name,
          item_name: item?.name || 'Unknown Item',
          item_count: receivedQty,
          status: 'completed'
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

    if (selectedFromStore === selectedToStore) {
      toast.error("Cannot transfer to the same store");
      return;
    }

    try {
      // Find inventory record for the item at the from_store
      const { data: fromInventory } = await supabase
        .from('inventory')
        .select('id, quantity, expiration_date')
        .eq('item_id', selectedItem)
        .eq('store_id', selectedFromStore)
        .maybeSingle();

      if (!fromInventory) {
        toast.error("Item not found in source store inventory");
        return;
      }

      const transferQty = parseFloat(transferQuantity);
      if (transferQty > fromInventory.quantity) {
        toast.error(`Only ${fromInventory.quantity} available to transfer`);
        return;
      }

      // 1. Update source store inventory (reduce quantity)
      const newSourceQty = fromInventory.quantity - transferQty;
      if (newSourceQty > 0) {
        await supabase
          .from('inventory')
          .update({ quantity: newSourceQty })
          .eq('id', fromInventory.id);
      } else {
        // Delete if quantity becomes 0
        await supabase
          .from('inventory')
          .delete()
          .eq('id', fromInventory.id);
      }

      // 2. Update or create destination store inventory (add quantity)
      const { data: toInventory } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('item_id', selectedItem)
        .eq('store_id', selectedToStore)
        .maybeSingle();

      if (toInventory) {
        // Update existing inventory
        await supabase
          .from('inventory')
          .update({ quantity: toInventory.quantity + transferQty })
          .eq('id', toInventory.id);
      } else {
        // Create new inventory record in destination store
        await supabase
          .from('inventory')
          .insert({
            workspace_id: currentWorkspace.id,
            user_id: user.id,
            store_id: selectedToStore,
            item_id: selectedItem,
            quantity: transferQty,
            expiration_date: fromInventory.expiration_date,
            received_date: new Date().toISOString(),
            notes: transferNotes || null
          });
      }

      // 3. Create transfer record as completed
      await supabase
        .from("inventory_transfers")
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          from_store_id: selectedFromStore,
          to_store_id: selectedToStore,
          inventory_id: fromInventory.id,
          quantity: transferQty,
          status: 'completed',
          notes: transferNotes,
          transfer_date: new Date().toISOString()
        });

      toast.success("Transfer completed successfully!");
      fetchAllData();
      
      // Reset form
      setSelectedFromStore("");
      setSelectedToStore("");
      setSelectedItem("");
      setTransferQuantity("");
      setTransferNotes("");
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
      const qty = parseFloat(receivingQuantity);
      console.log("Recording receiving - Quantity entered:", receivingQuantity, "Parsed quantity:", qty);

      if (isNaN(qty) || qty <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }
      
      let quantityBefore = 0;
      let quantityAfter = qty;
      let inventoryId: string | null = null;
      
      // Check if inventory already exists for this item at this store
      const { data: existingInventory } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('item_id', selectedReceivingItem)
        .eq('store_id', selectedReceivingStore)
        .maybeSingle();

      if (existingInventory) {
        // Update existing inventory
        quantityBefore = Number(existingInventory.quantity || 0);
        quantityAfter = quantityBefore + qty;

        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: quantityAfter,
          })
          .eq('id', existingInventory.id);

        if (updateError) throw updateError;
        inventoryId = existingInventory.id;
      } else {
        // Create new inventory record - need expiration date
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 6); // Default 6 months

        const { data: newInventory, error: insertError } = await supabase
          .from('inventory')
          .insert({
            workspace_id: currentWorkspace.id,
            user_id: user.id,
            store_id: selectedReceivingStore,
            item_id: selectedReceivingItem,
            quantity: qty,
            expiration_date: expirationDate.toISOString().split('T')[0],
            received_date: new Date().toISOString(),
            notes: receivingNotes || null
          })
          .select('id, quantity')
          .single();

        if (insertError) throw insertError;

        inventoryId = newInventory?.id || null;
        quantityBefore = 0;
        quantityAfter = Number(newInventory?.quantity ?? qty);
      }

      // Log activity
      await supabase.from('inventory_activity_log').insert({
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        store_id: selectedReceivingStore,
        inventory_id: inventoryId,
        action_type: 'received',
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        details: {
          item_id: selectedReceivingItem,
          received_quantity: qty,
          notes: receivingNotes
        }
      });

      // Auto-sync: If receiving in WAREHOUSE, auto-create in other stores
      const receivingStore = stores.find(s => s.id === selectedReceivingStore);
      if (receivingStore?.store_type === 'receive') {
        const otherStores = stores.filter(s => 
          s.id !== selectedReceivingStore && 
          s.is_active && 
          s.store_type !== 'receive'
        );

        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 6);

        for (const store of otherStores) {
          // Check if item already exists in this store
          const { data: existingInStore } = await supabase
            .from('inventory')
            .select('id')
            .eq('item_id', selectedReceivingItem)
            .eq('store_id', store.id)
            .maybeSingle();

          if (!existingInStore) {
            // Create inventory record with quantity from received amount
            await supabase.from('inventory').insert({
              workspace_id: currentWorkspace.id,
              user_id: user.id,
              store_id: store.id,
              item_id: selectedReceivingItem,
              quantity: qty,
              expiration_date: expirationDate.toISOString().split('T')[0],
              received_date: new Date().toISOString(),
              notes: '(Auto-synced from WAREHOUSE)'
            });
          }
        }
      }

      toast.success("Receiving recorded successfully!");
      fetchAllData();
      
      // Reset form
      setSelectedReceivingStore("");
      setSelectedReceivingItem("");
      setReceivingQuantity("");
      setReceivingNotes("");
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

  const handleDeleteReceiving = async (receiving: any) => {
    if (!user || !currentWorkspace) return;

    try {
      const quantityBefore = typeof receiving.quantity_before === 'number' ? receiving.quantity_before : 0;
      const quantityAfter = typeof receiving.quantity_after === 'number' ? receiving.quantity_after : 0;
      const receivedQty = typeof receiving.details?.received_quantity === 'number'
        ? receiving.details.received_quantity
        : (quantityAfter - quantityBefore) || quantityAfter || 0;

      // Find the inventory record for this item at this store
      const { data: inventoryRecord } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('item_id', receiving.details?.item_id)
        .eq('store_id', receiving.store_id)
        .maybeSingle();

      if (inventoryRecord) {
        const newQuantity = Math.max(0, inventoryRecord.quantity - receivedQty);
        
        if (newQuantity === 0) {
          // Delete the inventory record if quantity reaches 0
          await supabase
            .from('inventory')
            .delete()
            .eq('id', inventoryRecord.id);
        } else {
          // Update the inventory quantity
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', inventoryRecord.id);
        }
      }

      // Delete the activity log entry
      const { error } = await supabase
        .from('inventory_activity_log')
        .delete()
        .eq('id', receiving.id);

      if (error) throw error;

      // Optimistically update local state so UI reflects the change immediately
      setReceivings((prev) => prev.filter((r) => r.id !== receiving.id));

      toast.success("Receiving deleted successfully");
      fetchAllData();
    } catch (error) {
      console.error("Error deleting receiving:", error);
      toast.error("Failed to delete receiving");
    }
  };

  const handleEditReceiving = (receiving: any) => {
    const quantityBefore = typeof receiving.quantity_before === 'number' ? receiving.quantity_before : 0;
    const quantityAfter = typeof receiving.quantity_after === 'number' ? receiving.quantity_after : 0;
    const receivedQty = typeof receiving.details?.received_quantity === 'number'
      ? receiving.details.received_quantity
      : (quantityAfter - quantityBefore) || quantityAfter || 0;
    
    setEditingReceiving(receiving);
    setEditReceivingQuantity(receivedQty.toString());
    setEditReceivingDialog(true);
  };

  const handleUpdateReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentWorkspace || !editingReceiving) return;

    try {
      const oldQty = typeof editingReceiving.details?.received_quantity === 'number'
        ? editingReceiving.details.received_quantity
        : (editingReceiving.quantity_after - (editingReceiving.quantity_before || 0)) || editingReceiving.quantity_after || 0;
      
      const newQty = parseFloat(editReceivingQuantity);

      if (isNaN(newQty) || newQty <= 0) {
        toast.error("Quantity must be greater than 0");
        return;
      }

      const qtyDiff = newQty - oldQty;

      // Find the inventory record
      const { data: inventoryRecord } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('item_id', editingReceiving.details?.item_id)
        .eq('store_id', editingReceiving.store_id)
        .maybeSingle();

      if (inventoryRecord) {
        const updatedQuantity = Math.max(0, inventoryRecord.quantity + qtyDiff);
        
        // Update inventory quantity
        await supabase
          .from('inventory')
          .update({ quantity: updatedQuantity })
          .eq('id', inventoryRecord.id);

        const updatedReceiving = {
          ...editingReceiving,
          quantity_after: (editingReceiving.quantity_before || 0) + newQty,
          details: {
            ...editingReceiving.details,
            received_quantity: newQty,
          },
        };

        // Update activity log
        await supabase
          .from('inventory_activity_log')
          .update({
            quantity_after: updatedReceiving.quantity_after,
            details: updatedReceiving.details,
          })
          .eq('id', editingReceiving.id);

        // Optimistically update local state so UI reflects the change immediately
        setReceivings((prev) =>
          prev.map((r) => (r.id === editingReceiving.id ? updatedReceiving : r))
        );

        toast.success("Receiving updated successfully");
        setEditReceivingDialog(false);
        setEditingReceiving(null);
        fetchAllData();
      } else {
        toast.error("Inventory record not found");
      }
    } catch (error) {
      console.error("Error updating receiving:", error);
      toast.error("Failed to update receiving");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="px-4 pt-20 pb-6 space-y-4">
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

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Record Receiving</CardTitle>
                <CardDescription className="text-sm">
                  Add items received to warehouse inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateReceiving} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Warehouse / Receiving Store *</Label>
                    <Select value={selectedReceivingStore} onValueChange={setSelectedReceivingStore}>
                      <SelectTrigger className="h-9">
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

                  <div className="space-y-1.5">
                    <Label className="text-sm">Item from Master List *</Label>
                    <Select value={selectedReceivingItem} onValueChange={setSelectedReceivingItem}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2">
                              {item.color_code && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: item.color_code }}
                                />
                              )}
                              <span>{item.name} {item.brand ? `(${item.brand})` : ''}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show selected item photo */}
                  {selectedReceivingItem && (() => {
                    const selectedItem = items.find(item => item.id === selectedReceivingItem);
                    return selectedItem?.photo_url ? (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Item Photo</Label>
                        <ZoomableImage
                          src={selectedItem.photo_url}
                          alt={selectedItem.name}
                          containerClassName="w-full h-32 rounded-lg border"
                          className="w-full h-full bg-muted"
                          objectFit="contain"
                        />
                      </div>
                    ) : null;
                  })()}

                  <div className="space-y-1.5">
                    <Label className="text-sm">Quantity Received *</Label>
                    <Input
                      type="number"
                      value={receivingQuantity}
                      onChange={(e) => setReceivingQuantity(e.target.value)}
                      placeholder="Qty"
                      min="1"
                      step="any"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Delivery Notes (Optional)</Label>
                    <Textarea
                      value={receivingNotes}
                      onChange={(e) => setReceivingNotes(e.target.value)}
                      placeholder="Supplier, delivery info..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <Button type="submit" className="w-full h-9">
                    <Package className="w-4 h-4 mr-2" />
                    Record Receiving
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Recent Receivings ({receivings.length})
                </CardTitle>
                <CardDescription>
                  All recorded receiving transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receivings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-1">No receivings recorded yet</p>
                    <p className="text-sm">Record your first receiving above to see it here</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {receivings.map((receiving: any) => {
                        const itemId = receiving.details?.item_id;
                        const item = items.find((i: any) => i.id === itemId);
                        
                        return (
                          <div key={receiving.id} className="glass rounded-lg p-4 hover:glass-hover transition-all">
                            {item?.photo_url && (
                              <ZoomableImage
                                src={item.photo_url}
                                alt={item.name}
                                containerClassName="mb-4 rounded-lg border-2 border-border/50"
                                className="w-full h-32 bg-muted"
                                objectFit="contain"
                              />
                            )}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-lg mb-1">
                                  {item?.name || 'Unknown Item'}
                                </p>
                                {item?.brand && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Brand: {item.brand}
                                  </p>
                                )}
                                <p className="text-sm font-medium text-primary mb-1">
                                  Store: {receiving.stores?.name}
                                </p>
                                <p className="text-base font-semibold mb-1">
                                  Qty received: {(() => {
                                    const quantityBefore = typeof receiving.quantity_before === 'number' ? receiving.quantity_before : 0;
                                    const quantityAfter = typeof receiving.quantity_after === 'number' ? receiving.quantity_after : 0;
                                    const receivedQty = typeof receiving.details?.received_quantity === 'number'
                                      ? receiving.details.received_quantity
                                      : (quantityAfter - quantityBefore) || quantityAfter || 0;
                                    return receivedQty;
                                  })()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  On hand after receiving: {receiving.quantity_after ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Recorded: {new Date(receiving.created_at).toLocaleString()}
                                </p>
                                {receiving.details?.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">
                                    Note: {receiving.details.notes}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditReceiving(receiving)}
                                  className="h-8"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteReceiving(receiving)}
                                  className="h-8"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-lg">Create Transfer</CardTitle>
                <CardDescription className="text-sm">
                  Transfer items between stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTransfer} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">From Store *</Label>
                      <Select value={selectedFromStore} onValueChange={(val) => {
                        setSelectedFromStore(val);
                        setSelectedItem(""); // Reset item when store changes
                      }}>
                        <SelectTrigger className="h-9">
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

                    <div className="space-y-1.5">
                      <Label className="text-sm">To Store *</Label>
                      <Select value={selectedToStore} onValueChange={setSelectedToStore}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.filter(s => s.id !== selectedFromStore).map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Item *</Label>
                    <Select 
                      value={selectedItem} 
                      onValueChange={setSelectedItem}
                      disabled={!selectedFromStore}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={selectedFromStore ? "Select item" : "Select from store first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => {
                          const invQty = inventory.find(inv => 
                            inv.item_id === item.id && inv.store_id === selectedFromStore
                          )?.quantity || 0;
                          
                          return (
                            <SelectItem 
                              key={item.id} 
                              value={item.id}
                              disabled={invQty === 0}
                            >
                              {item.name} {item.brand ? `(${item.brand})` : ''} - Qty: {invQty}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Quantity *</Label>
                      <Input
                        type="number"
                        value={transferQuantity}
                        onChange={(e) => setTransferQuantity(e.target.value)}
                        placeholder="Qty"
                        min="1"
                        step="any"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm text-muted-foreground">Available</Label>
                      <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm">
                        {selectedItem && selectedFromStore ? (
                          inventory.find(inv => 
                            inv.item_id === selectedItem && inv.store_id === selectedFromStore
                          )?.quantity || 0
                        ) : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Notes (Optional)</Label>
                    <Textarea
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="Transfer notes..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <Button type="submit" className="w-full h-9">
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
                        {transfer.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {transfer.notes}
                          </p>
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
            {/* Team Stats Overview */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{members.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{transactions.filter(t => {
                    const today = new Date().toDateString();
                    return new Date(t.timestamp).toDateString() === today;
                  }).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{transactions.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Team Members List */}
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
                                <SelectItem value="viewer">Viewer - View only</SelectItem>
                                <SelectItem value="member">Member - View & receive</SelectItem>
                                <SelectItem value="manager">Manager - Full access</SelectItem>
                                <SelectItem value="admin">Admin - Full access + settings</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button type="submit" className="w-full">
                            Send Invitation
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {members.map((member: any) => {
                          const memberActions = transactions.filter(
                            t => t.user_email === member.profiles?.email
                          ).length;
                          const lastAction = transactions.find(
                            t => t.user_email === member.profiles?.email
                          );
                          
                          return (
                            <div key={member.id} className="glass rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <Avatar className="relative">
                                    <AvatarFallback>
                                      {member.profiles?.email?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                    {/* Online indicator - showing if active in last 5 mins */}
                                    {lastAction && (new Date().getTime() - new Date(lastAction.timestamp).getTime()) < 300000 && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                    )}
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium truncate">
                                        {member.profiles?.full_name || member.profiles?.username}
                                      </p>
                                      <Badge variant="outline" className="text-xs">
                                        {member.role}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {member.profiles?.email}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <span>{memberActions} actions</span>
                                      {lastAction && (
                                        <span>Last: {new Date(lastAction.timestamp).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {member.role !== 'owner' && currentWorkspace?.owner_id === user?.id && (
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
                          );
                        })}
                        {members.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No team members yet</p>
                            <p className="text-sm">Invite colleagues to collaborate</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              {/* Team Activity Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Team Activity
                  </CardTitle>
                  <CardDescription>
                    Recent actions by team members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {transactions.slice(0, 30).map((transaction, index) => (
                        <div key={`${transaction.id}-${index}`} className="flex gap-3 pb-3 border-b last:border-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {transaction.user_email?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{transaction.user_email?.split('@')[0]}</p>
                              <Badge 
                                variant={
                                  transaction.type === 'transfer' ? 'default' :
                                  transaction.type === 'receiving' ? 'secondary' :
                                  transaction.type === 'spot_check' ? 'outline' :
                                  'destructive'
                                }
                                className="text-xs"
                              >
                                {transaction.type === 'transfer' && <ArrowRightLeft className="w-3 h-3 mr-1" />}
                                {transaction.type === 'receiving' && <Package className="w-3 h-3 mr-1" />}
                                {transaction.type === 'spot_check' && <ClipboardCheck className="w-3 h-3 mr-1" />}
                                {transaction.type === 'variance' && <TrendingDown className="w-3 h-3 mr-1" />}
                                {transaction.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {transaction.type === 'transfer' && (
                                `Transferred from ${transaction.from_store} to ${transaction.to_store}`
                              )}
                              {transaction.type === 'receiving' && (
                                `Received ${transaction.item_count}x ${transaction.item_name} at ${transaction.store}`
                              )}
                              {transaction.type === 'spot_check' && (
                                `Performed spot check at ${transaction.store}`
                              )}
                              {transaction.type === 'variance' && (
                                `Variance report for ${transaction.store} (${transaction.item_count} items)`
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(transaction.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {transactions.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No activity yet</p>
                          <p className="text-sm">Team actions will appear here</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Permission Guide */}
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Viewer</h4>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• View inventory</li>
                      <li>• View transactions</li>
                      <li>• View reports</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <h4 className="font-semibold text-sm">Member</h4>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• All Viewer permissions</li>
                      <li>• Receive items</li>
                      <li>• Create transfers</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      <h4 className="font-semibold text-sm">Manager</h4>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• All Member permissions</li>
                      <li>• Approve transfers</li>
                      <li>• Manage inventory</li>
                      <li>• Generate reports</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-500" />
                      <h4 className="font-semibold text-sm">Admin</h4>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• All Manager permissions</li>
                      <li>• Manage team members</li>
                      <li>• Workspace settings</li>
                      <li>• Full access</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Receiving Dialog */}
      <Dialog open={editReceivingDialog} onOpenChange={setEditReceivingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Receiving</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateReceiving} className="space-y-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <p className="text-sm font-medium">
                {items.find(i => i.id === editingReceiving?.details?.item_id)?.name || 'Unknown Item'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <p className="text-sm font-medium">{editingReceiving?.stores?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity Received *</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={editReceivingQuantity}
                onChange={(e) => setEditReceivingQuantity(e.target.value)}
                placeholder="Qty"
                min="1"
                step="any"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => setEditReceivingDialog(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default StoreManagement;
