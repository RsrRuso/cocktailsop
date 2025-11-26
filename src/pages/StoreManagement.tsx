import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNavigate, useSearchParams } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ZoomableImage } from "@/components/ZoomableImage";
import { toast } from "sonner";
import { 
  Store, ArrowRightLeft, ClipboardCheck, TrendingDown, 
  Users, Camera, Bell, Clock, Package, Upload, 
  CheckCircle2, AlertCircle, UserPlus, UserMinus, Shield,
  ExternalLink, BarChart3, Trash2, Activity, Edit, X, Check,
  Building2, Plus, Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  AlertDialog, 
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { InviteWorkspaceMemberDialog } from "@/components/InviteWorkspaceMemberDialog";
import { ManageMemberPermissionsDialog } from "@/components/ManageMemberPermissionsDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [personalInventoryName, setPersonalInventoryName] = useState(
    localStorage.getItem('personalInventoryName') || 'Personal Inventory'
  );
  
  const [stores, setStores] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [lowStockByStore, setLowStockByStore] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [receivings, setReceivings] = useState<any[]>([]);
  const [spotChecks, setSpotChecks] = useState<any[]>([]);
  const [varianceReports, setVarianceReports] = useState<any[]>([]);
  const [inviteWorkspaceDialogOpen, setInviteWorkspaceDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
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
  
  // Spot check states
  const [showSpotCheckDialog, setShowSpotCheckDialog] = useState(false);
  const [spotCheckStore, setSpotCheckStore] = useState("");
  const [spotCheckItems, setSpotCheckItems] = useState<{
    inventory_id: string;
    item_id: string;
    item_name: string;
    expected_quantity: number;
    actual_quantity: string;
  }[]>([]);
  
  // Edit receiving state
  const [editReceivingDialog, setEditReceivingDialog] = useState(false);
  const [editingReceiving, setEditingReceiving] = useState<any>(null);
  const [editReceivingQuantity, setEditReceivingQuantity] = useState("");

  // Edit transfer state
  const [editTransferDialog, setEditTransferDialog] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<any>(null);
  const [editTransferQuantity, setEditTransferQuantity] = useState("");
  const [editTransferNotes, setEditTransferNotes] = useState("");
  
  // Delete transfer confirmation
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
      setupRealtimeSubscriptions();
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    const workspaceId = searchParams.get("workspace");
    if (workspaceId && workspaces.length > 0) {
      const exists = workspaces.some((w) => w.id === workspaceId);
      if (exists) {
        switchWorkspace(workspaceId);
      }
    }
  }, [searchParams, workspaces, switchWorkspace]);

  // Listen for localStorage changes to personal inventory name
  useEffect(() => {
    const handleStorageChange = () => {
      setPersonalInventoryName(localStorage.getItem('personalInventoryName') || 'Personal Inventory');
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also check on mount and when returning to this page
    const interval = setInterval(handleStorageChange, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const setupRealtimeSubscriptions = () => {
    const workspaceFilter = `user_id=eq.${user?.id}`;

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
      // Fetch stores - show all active stores for current workspace/personal context
      let storesQuery = supabase
        .from("stores")
        .select("*")
        .eq('is_active', true);

      if (currentWorkspace) {
        // In workspace: show all workspace stores (members can see all)
        storesQuery = storesQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own stores
        storesQuery = storesQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: storesData } = await storesQuery.order("name");
 
      console.log(`[Store Management] Fetched ${storesData?.length || 0} stores for current context`);
      if (storesData && storesData.length > 0) {
        console.log(`[Store Management] Store names:`, storesData.map(s => s.name).join(', '));
      }

      // Fetch items - scoped to current workspace/personal context
      let itemsQuery = supabase
        .from("items")
        .select("*");

      if (currentWorkspace) {
        // In workspace: show all workspace items
        itemsQuery = itemsQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own items
        itemsQuery = itemsQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: itemsData } = await itemsQuery.order("name");
 
      // Fetch inventory - scoped to current workspace/personal context
      let inventoryQuery = supabase
        .from("inventory")
        .select(`
          *,
          items(name, brand, photo_url, color_code),
          stores(name)
        `);

      if (currentWorkspace) {
        // In workspace: show all workspace inventory
        inventoryQuery = inventoryQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own inventory
        inventoryQuery = inventoryQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: inventoryData } = await inventoryQuery;
 
      // Fetch transfers - scoped to current workspace/personal context
      let transfersQuery = supabase
        .from("inventory_transfers")
        .select(`
          *,
          from_store:stores!from_store_id(name),
          to_store:stores!to_store_id(name),
          transferred_by:employees(name),
          inventory:inventory(items(name))
        `)
        .order("transfer_date", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        // In workspace: show all workspace transfers
        transfersQuery = transfersQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own transfers
        transfersQuery = transfersQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: transfersData } = await transfersQuery;
 
      // Fetch receivings from inventory_activity_log - scoped to current workspace/personal context
      let receivingsQuery = supabase
        .from("inventory_activity_log")
        .select(`
          *,
          stores(name, store_type)
        `)
        .eq('action_type', "received")
        .order("created_at", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        // In workspace: show all workspace receivings
        receivingsQuery = receivingsQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own receivings
        receivingsQuery = receivingsQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: receivingsData } = await receivingsQuery;
 
      // Fetch spot checks with items - scoped to current workspace/personal context
      let spotChecksQuery = supabase
        .from("inventory_spot_checks")
        .select(`
          *,
          stores(name),
          spot_check_items(
            *,
            items(name, photo_url)
          )
        `)
        .order("check_date", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        // In workspace: show all workspace spot checks
        spotChecksQuery = spotChecksQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own spot checks
        spotChecksQuery = spotChecksQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: spotChecksData } = await spotChecksQuery;
 
      // Fetch variance reports - scoped to current workspace/personal context
      let varianceQuery = supabase
        .from("variance_reports")
        .select(`
          *,
          stores(name)
        `)
        .order("report_date", { ascending: false })
        .limit(20);

      if (currentWorkspace) {
        // In workspace: show all workspace variance reports
        varianceQuery = varianceQuery.eq('workspace_id', currentWorkspace.id);
      } else {
        // Personal: show only user's own variance reports
        varianceQuery = varianceQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: varianceData } = await varianceQuery;

      // Fetch workspace members (workspace mode only)
      let membersData: any[] = [];
      if (currentWorkspace) {
        const { data: workspaceMembersData, error: membersError } = await supabase
          .from("workspace_members_with_owner")
          .select("id, user_id, role, permissions")
          .eq("workspace_id", currentWorkspace.id)
          .order("role", { ascending: false });

        if (membersError) {
          console.error("Error fetching workspace members:", membersError);
        } else if (workspaceMembersData && workspaceMembersData.length > 0) {
          const userIds = workspaceMembersData.map((m: any) => m.user_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", userIds);

          if (profilesError) {
            console.error("Error fetching member profiles:", profilesError);
            membersData = workspaceMembersData;
          } else {
            membersData = workspaceMembersData.map((member: any) => ({
              ...member,
              permissions: member.permissions || { can_receive: false, can_transfer: false },
              profiles: profilesData?.find((p: any) => p.id === member.user_id),
            }));
          }
        }
      }

      setStores(storesData || []);
      setItems(itemsData || []);
      setInventory(inventoryData || []);
      setTransfers(transfersData || []);
      setReceivings(receivingsData || []);
      setSpotChecks(spotChecksData || []);
      setVarianceReports(varianceData || []);
      setMembers(membersData);

      // Calculate low stock items per store
      const lowStockCounts: Record<string, number> = {};
      
      // Group inventory by item and calculate average quantities
      const itemQuantities: Record<string, number[]> = {};
      inventoryData?.forEach((inv: any) => {
        const itemId = inv.item_id;
        if (!itemQuantities[itemId]) {
          itemQuantities[itemId] = [];
        }
        itemQuantities[itemId].push(inv.quantity);
      });

      // Calculate average for each item
      const itemAverages: Record<string, number> = {};
      Object.keys(itemQuantities).forEach(itemId => {
        const quantities = itemQuantities[itemId];
        const avg = quantities.reduce((a, b) => a + b, 0) / quantities.length;
        itemAverages[itemId] = avg;
      });

      // Check each store for low stock items
      (storesData || []).forEach((store: any) => {
        const storeInventory = inventoryData?.filter((inv: any) => inv.store_id === store.id) || [];
        let lowStockCount = 0;

        storeInventory.forEach((inv: any) => {
          const avg = itemAverages[inv.item_id] || 0;
          // Item is low stock if quantity is less than 50% of average across stores
          if (inv.quantity < avg * 0.5 && avg > 0) {
            lowStockCount++;
          }
        });

        lowStockCounts[store.id] = lowStockCount;
      });

      setLowStockByStore(lowStockCounts);

      // Fetch user profiles for transactions
      const allUserIds = [
        ...new Set([
          ...(transfersData?.map((t: any) => t.user_id) || []),
          ...(receivingsData?.map((r: any) => r.user_id) || []),
          ...(spotChecksData?.map((s: any) => s.user_id) || []),
          ...(varianceData?.map((v: any) => v.user_id) || [])
        ])
      ];

      const { data: transactionProfilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, username')
        .in('id', allUserIds);

      const profilesMap = new Map(transactionProfilesData?.map((p: any) => [p.id, p]) || []);

      // Build live transactions feed
      const allTransactions: Transaction[] = [];

      transfersData?.forEach((t: any) => {
        const profile = profilesMap.get(t.user_id);
        allTransactions.push({
          id: t.id,
          type: 'transfer',
          timestamp: t.transfer_date || t.created_at,
          user_email: profile?.email || 'Unknown User',
          from_store: t.from_store?.name,
          to_store: t.to_store?.name,
          item_name: t.inventory?.items?.name || 'Unknown Item',
          item_count: Number(t.quantity) || 0,
          status: t.status,
        });
      });

      receivingsData?.forEach((r: any) => {
        const profile = profilesMap.get(r.user_id);
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
          user_email: profile?.email || 'Unknown User',
          store: r.stores?.name,
          item_name: item?.name || 'Unknown Item',
          item_count: receivedQty,
          status: 'completed'
        });
      });

      spotChecksData?.forEach((s: any) => {
        const profile = profilesMap.get(s.user_id);
        allTransactions.push({
          id: s.id,
          type: 'spot_check',
          timestamp: s.check_date || s.created_at,
          user_email: profile?.email || 'Unknown User',
          store: s.stores?.name,
          item_count: 0,
          status: s.status
        });
      });

      varianceData?.forEach((v: any) => {
        const profile = profilesMap.get(v.user_id);
        allTransactions.push({
          id: v.id,
          type: 'variance',
          timestamp: v.created_at,
          user_email: profile?.email || 'Unknown User',
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
    if (!user) return;

    if (!selectedFromStore || !selectedToStore || !selectedItem || !transferQuantity) {
      toast.error("Please fill all required fields");
      return;
    }

    if (selectedFromStore === selectedToStore) {
      toast.error("Cannot transfer to the same store");
      return;
    }

    try {
      // Use workspace_id or null for personal inventory
      const workspaceId = currentWorkspace?.id || null;

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
            workspace_id: workspaceId,
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
          workspace_id: workspaceId,
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

  const handleEditTransfer = (transfer: any) => {
    setEditingTransfer(transfer);
    setEditTransferQuantity(transfer.quantity.toString());
    setEditTransferNotes(transfer.notes || "");
    setEditTransferDialog(true);
  };

  const handleUpdateTransfer = async () => {
    if (!editingTransfer || !user) return;

    try {
      const newQuantity = parseFloat(editTransferQuantity);
      if (isNaN(newQuantity) || newQuantity <= 0) {
        toast.error("Invalid quantity");
        return;
      }

      // Update the transfer record
      await supabase
        .from("inventory_transfers")
        .update({
          quantity: newQuantity,
          notes: editTransferNotes
        })
        .eq("id", editingTransfer.id);

      toast.success("Transfer updated successfully");
      setEditTransferDialog(false);
      setEditingTransfer(null);
      fetchAllData();
    } catch (error) {
      console.error("Error updating transfer:", error);
      toast.error("Failed to update transfer");
    }
  };

  const handleDeleteTransfer = async (transferId: string) => {
    if (!user) return;

    try {
      // First fetch the transfer to see what we're trying to delete
      const { data: transferData, error: fetchError } = await supabase
        .from("inventory_transfers")
        .select("*")
        .eq("id", transferId)
        .single();

      console.log("Transfer to delete:", transferData);
      console.log("Current user ID:", user.id);

      if (fetchError) {
        console.error("Error fetching transfer:", fetchError);
        toast.error("Failed to fetch transfer details");
        return;
      }

      // Now try to delete
      const { data, error, count } = await supabase
        .from("inventory_transfers")
        .delete({ count: 'exact' })
        .eq("id", transferId);

      console.log("Delete result:", { data, error, count });

      if (error) {
        console.error("Error deleting transfer:", error);
        toast.error(`Failed to delete transfer: ${error.message}`);
        return;
      }

      if (count === 0) {
        toast.error("Transfer not deleted - permission denied or not found");
        console.error("No rows were deleted. This usually means RLS prevented the deletion.");
        return;
      }

      toast.success("Transfer deleted successfully");
      setDeleteTransferId(null);
      fetchAllData();
    } catch (error) {
      console.error("Error deleting transfer:", error);
      toast.error("Failed to delete transfer");
    }
  };

  const handleDeleteStore = async (storeId: string, storeName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: false })
        .eq('id', storeId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(`${storeName} deleted successfully`);
      fetchAllData();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    }
  };

  const handleCreateReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to record receives");
      return;
    }

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
            workspace_id: currentWorkspace?.id || null,
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
        workspace_id: currentWorkspace?.id || null,
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
      if (receivingStore?.store_type === 'receive' && currentWorkspace) {
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

  const handleStartSpotCheck = () => {
    if (stores.length === 0) {
      toast.error("No stores available");
      return;
    }
    setSpotCheckStore(stores[0]?.id || "");
    setShowSpotCheckDialog(true);
  };

  const handleLoadSpotCheckItems = () => {
    if (!spotCheckStore) return;
    
    const storeInventory = inventory.filter(inv => inv.store_id === spotCheckStore);
    const itemsToCheck = storeInventory.map(inv => {
      const item = items.find(i => i.id === inv.item_id);
      return {
        inventory_id: inv.id,
        item_id: inv.item_id,
        item_name: item?.name || 'Unknown',
        expected_quantity: inv.quantity,
        actual_quantity: '',
      };
    });
    
    setSpotCheckItems(itemsToCheck);
  };

  const handleSpotCheckQuantityChange = (inventoryId: string, value: string) => {
    setSpotCheckItems(prev => prev.map(item => 
      item.inventory_id === inventoryId 
        ? { ...item, actual_quantity: value }
        : item
    ));
  };

  const handleSubmitSpotCheck = async () => {
    if (!user || !spotCheckStore) return;
    
    const workspaceId = currentWorkspace?.id || null;
    const filledItems = spotCheckItems.filter(item => item.actual_quantity !== '');
    
    if (filledItems.length === 0) {
      toast.error("Please enter at least one physical count");
      return;
    }

    try {
      // Create spot check record
      const { data: spotCheckData, error: spotCheckError } = await supabase
        .from("inventory_spot_checks")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          store_id: spotCheckStore,
          status: 'completed',
          check_date: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (spotCheckError) throw spotCheckError;

      // Create spot check items, update inventory, and build variance summary
      const itemSummaries: any[] = [];
      let totalVarianceValue = 0;
      let itemsWithVariance = 0;

      for (const item of filledItems) {
        const actualQty = parseFloat(item.actual_quantity);
        const variance = actualQty - item.expected_quantity;
        const variancePercentage = item.expected_quantity > 0 
          ? (variance / item.expected_quantity) * 100 
          : 0;

        // Insert spot check item (let the database compute variance fields)
        const { error: itemError } = await supabase
          .from("spot_check_items")
          .insert({
            spot_check_id: spotCheckData.id,
            inventory_id: item.inventory_id,
            item_id: item.item_id,
            expected_quantity: item.expected_quantity,
            actual_quantity: actualQty
          });

        if (itemError) {
          console.error("Error inserting spot check item:", itemError);
          toast.error("Some items could not be saved in the spot check.");
          continue;
        }

        // Update inventory quantity to match physical count
        await supabase
          .from("inventory")
          .update({ quantity: actualQty })
          .eq("id", item.inventory_id);

        // Log the adjustment
        await supabase
          .from("inventory_activity_log")
          .insert({
            user_id: user.id,
            workspace_id: workspaceId,
            store_id: spotCheckStore,
            inventory_id: item.inventory_id,
            action_type: 'spot_check_adjustment',
            quantity_before: item.expected_quantity,
            quantity_after: actualQty,
            details: {
              variance: variance,
              variance_percentage: variancePercentage
            }
          });

        // Build variance summary for this item
        itemSummaries.push({
          inventory_id: item.inventory_id,
          item_id: item.item_id,
          item_name: item.item_name,
          expected_quantity: item.expected_quantity,
          actual_quantity: actualQty,
          variance,
          variance_percentage: variancePercentage,
          final_quantity: actualQty
        });

        totalVarianceValue += Math.abs(variance);
        if (variance !== 0) itemsWithVariance += 1;
      }

      // Create variance report record
      await supabase
        .from("variance_reports")
        .insert({
          workspace_id: workspaceId,
          store_id: spotCheckStore,
          user_id: user.id,
          report_date: new Date().toISOString().split('T')[0],
          total_variance_value: totalVarianceValue,
          total_items_checked: filledItems.length,
          items_with_variance: itemsWithVariance,
          report_data: itemSummaries
        });

      toast.success(`Spot check completed! ${filledItems.length} items adjusted.`);
      setShowSpotCheckDialog(false);
      setSpotCheckItems([]);
      setSpotCheckStore("");
      fetchAllData();
    } catch (error) {
      console.error("Error submitting spot check:", error);
      toast.error("Failed to complete spot check");
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

  const handleDownloadSpotCheckReport = async (check: any) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text("Spot Check Report", 14, 20);
      
      // Store and date info
      doc.setFontSize(12);
      doc.text(`Store: ${check.stores?.name || 'Unknown'}`, 14, 30);
      doc.text(`Date: ${new Date(check.check_date).toLocaleString()}`, 14, 37);
      doc.text(`Status: ${check.status}`, 14, 44);
      
      // Items with images
      if (check.spot_check_items && check.spot_check_items.length > 0) {
        let yPos = 55;
        
        for (const item of check.spot_check_items) {
          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          
          // Item section header
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text(item.items?.name || 'Unknown Item', 14, yPos);
          yPos += 7;
          
          // Item details
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.text(`System Qty: ${item.expected_quantity}`, 14, yPos);
          doc.text(`Physical Qty: ${item.actual_quantity}`, 80, yPos);
          doc.text(`Variance: ${item.variance || 0}`, 140, yPos);
          yPos += 7;
          
          // Add image if available
          if (item.items?.photo_url) {
            try {
              const imgData = await fetch(item.items.photo_url)
                .then(res => res.blob())
                .then(blob => new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                }));
              
              doc.addImage(imgData as string, 'JPEG', 14, yPos, 40, 40);
              yPos += 45;
            } catch (error) {
              console.error('Error loading image:', error);
              yPos += 5;
            }
          } else {
            yPos += 5;
          }
          
          // Separator line
          doc.setDrawColor(200, 200, 200);
          doc.line(14, yPos, 196, yPos);
          yPos += 10;
        }
      }
      
      // Save PDF
      doc.save(`spot-check-${check.stores?.name}-${new Date(check.check_date).toLocaleDateString()}.pdf`);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to download report");
    }
  };

  const handleDownloadReceivingsReport = async () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text("Receivings Report", 14, 20);
      
      // Workspace and date info
      doc.setFontSize(12);
      doc.text(`Workspace: ${currentWorkspace?.name || personalInventoryName}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
      doc.text(`Total Receivings: ${receivings.length}`, 14, 44);
      
      let yPos = 55;
      
      for (const receiving of receivings) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        const itemId = receiving.details?.item_id;
        const item = items.find((i: any) => i.id === itemId);
        const quantityBefore = typeof receiving.quantity_before === 'number' ? receiving.quantity_before : 0;
        const quantityAfter = typeof receiving.quantity_after === 'number' ? receiving.quantity_after : 0;
        const receivedQty = typeof receiving.details?.received_quantity === 'number'
          ? receiving.details.received_quantity
          : (quantityAfter - quantityBefore) || quantityAfter || 0;
        
        // Item name
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(item?.name || 'Unknown Item', 14, yPos);
        yPos += 7;
        
        // Details
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Store: ${receiving.stores?.name}`, 14, yPos);
        doc.text(`Qty: ${receivedQty}`, 100, yPos);
        yPos += 5;
        doc.text(`Date: ${new Date(receiving.created_at).toLocaleString()}`, 14, yPos);
        yPos += 7;
        
        // Add image if available
        if (item?.photo_url) {
          try {
            const imgData = await fetch(item.photo_url)
              .then(res => res.blob())
              .then(blob => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              }));
            
            doc.addImage(imgData as string, 'JPEG', 14, yPos, 30, 30);
            yPos += 35;
          } catch (error) {
            console.error('Error loading image:', error);
            yPos += 5;
          }
        } else {
          yPos += 5;
        }
        
        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 10;
      }
      
      doc.save(`receivings-report-${new Date().toLocaleDateString()}.pdf`);
      toast.success("Receivings report downloaded");
    } catch (error) {
      console.error("Error generating receivings PDF:", error);
      toast.error("Failed to download receivings report");
    }
  };

  const handleDownloadLiveTransactionsReport = async () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text("Live Transactions Report", 14, 20);
      
      // Info
      doc.setFontSize(12);
      doc.text(`Workspace: ${currentWorkspace?.name || personalInventoryName}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);
      doc.text(`Total Transactions: ${transactions.length}`, 14, 44);
      
      let yPos = 55;
      
      for (const transaction of transactions) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Transaction type and item
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${transaction.type.toUpperCase()}: ${transaction.item_name || 'Multiple Items'}`, 14, yPos);
        yPos += 7;
        
        // Details
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        if (transaction.type === 'transfer') {
          doc.text(`From: ${transaction.from_store} → To: ${transaction.to_store}`, 14, yPos);
        } else {
          doc.text(`Store: ${transaction.store}`, 14, yPos);
        }
        yPos += 5;
        
        doc.text(`Quantity: ${transaction.item_count}`, 14, yPos);
        doc.text(`Status: ${transaction.status}`, 100, yPos);
        yPos += 5;
        doc.text(`By: ${transaction.user_email}`, 14, yPos);
        yPos += 5;
        doc.text(`Date: ${new Date(transaction.timestamp).toLocaleString()}`, 14, yPos);
        yPos += 10;
        
        // Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 10;
      }
      
      doc.save(`live-transactions-${new Date().toLocaleDateString()}.pdf`);
      toast.success("Live transactions report downloaded");
    } catch (error) {
      console.error("Error generating live transactions PDF:", error);
      toast.error("Failed to download transactions report");
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

  const handleDeleteFeedTransaction = async (transaction: Transaction) => {
    if (!user) return;

    if (transaction.type === 'transfer') {
      setDeleteTransferId(transaction.id);
      return;
    }

    if (transaction.type === 'receiving') {
      const receiving = receivings.find((r) => r.id === transaction.id);
      if (!receiving) {
        toast.error("Receiving record not found");
        return;
      }

      const confirmDelete = window.confirm(
        "Delete this receiving? This will also adjust inventory."
      );
      if (!confirmDelete) return;

      await handleDeleteReceiving(receiving);
      return;
    }

    toast.info("This type of activity can't be deleted from the feed yet.");
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      <TopNav />

      <div className="px-2 sm:px-3 pt-20 pb-6 space-y-3 sm:space-y-4 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              Store Management
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {currentWorkspace
                ? `All ${currentWorkspace.name} stores and inventory`
                : `All ${personalInventoryName} stores and inventory`}
            </p>
          </div>
          <Badge variant="outline" className="gap-2 text-xs">
            <Bell className="w-3 h-3" />
            Live Updates
          </Badge>
        </div>

        {/* Workspace Selector */}
        <Card className="p-4 border-2 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
              <Label className="text-sm font-medium whitespace-nowrap">Workspace:</Label>
            </div>
            <div className="flex-1 w-full flex gap-2">
              <Select
                value={currentWorkspace?.id || "personal"}
                onValueChange={(value) => {
                  if (value === "personal") {
                    switchWorkspace("personal");
                  } else {
                    switchWorkspace(value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    {currentWorkspace ? currentWorkspace.name : personalInventoryName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {personalInventoryName}
                    </div>
                  </SelectItem>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {workspace.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/workspace-management")}
                className="whitespace-nowrap gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Manage</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/50 hover:border-green-500/50 animate-fade-in" onClick={() => navigate('/stores-admin')} style={{ animationDelay: '0ms' }}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-3 sm:p-5 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                  <Store className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-sm sm:text-base group-hover:text-green-600 transition-colors">Stores</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Create & manage</p>
                </div>
                <ExternalLink className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/50 hover:border-purple-500/50 animate-fade-in" onClick={() => navigate('/master-items')} style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-3 sm:p-5 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-sm sm:text-base group-hover:text-purple-600 transition-colors">Items</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Master list</p>
                </div>
                <ExternalLink className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/50 hover:border-primary/50 animate-fade-in" onClick={() => navigate('/all-inventory')} style={{ animationDelay: '200ms' }}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
            <CardContent className="p-3 sm:p-5 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors">Inventory</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Combined view</p>
                </div>
                <ExternalLink className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/50 hover:border-blue-500/50 animate-fade-in" onClick={() => navigate('/inventory-transactions')} style={{ animationDelay: '300ms' }}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-3 sm:p-5 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-sm sm:text-base group-hover:text-blue-600 transition-colors">Transactions</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Live updates</p>
                </div>
                <ExternalLink className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/50 hover:border-orange-500/50 animate-fade-in" 
            onClick={() => {
              const workspaceId = currentWorkspace?.id || 'personal';
              navigate(`/low-stock-inventory/${workspaceId}`);
            }}
            style={{ animationDelay: '400ms' }}
          >
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-3 sm:p-5 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 animate-pulse" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-sm sm:text-base group-hover:text-orange-600 transition-colors">Low Stock</p>
                  <p className="text-[10px] sm:text-xs text-orange-600/80 dark:text-orange-400/80 font-medium">
                    {Object.values(lowStockByStore).reduce((sum, count) => sum + count, 0)} items low
                  </p>
                </div>
                <ExternalLink className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 border-border/50 hover:border-emerald-500/50 animate-fade-in" onClick={() => navigate('/transfer-qr')} style={{ animationDelay: '500ms' }}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
            <CardContent className="p-3 sm:p-5 relative">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="font-bold text-sm sm:text-base group-hover:text-emerald-600 transition-colors">Transfer QR</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Generate & scan</p>
                </div>
                <ExternalLink className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stores List */}
        <Card className="border-none shadow-lg overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Store className="h-6 w-6 text-primary" />
              Your Stores ({stores.length})
            </CardTitle>
            <CardDescription>Click on a store to view detailed inventory</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stores.map((store, index) => {
                const lowStockCount = lowStockByStore[store.id] || 0;
                const hasLowStock = lowStockCount > 0;
                
                return (
                  <Card 
                    key={store.id} 
                    className={`group transition-all duration-300 hover:shadow-2xl overflow-hidden animate-fade-in ${
                      hasLowStock 
                        ? 'border-2 border-orange-500/50 hover:border-orange-500' 
                        : 'border-2 border-border/50 hover:border-primary/50'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full" />
                    <CardContent className="p-5 relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 cursor-pointer" onClick={() => navigate(`/store/${store.id}`)}>
                          <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">
                            {store.name}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {store.store_type?.replace('_', ' ')} store
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`p-3 rounded-xl ${
                            hasLowStock 
                              ? 'bg-orange-500/10' 
                              : 'bg-primary/10'
                          }`}>
                            <Store className={`h-6 w-6 ${
                              hasLowStock 
                                ? 'text-orange-500' 
                                : 'text-primary'
                            }`} />
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {store.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will soft delete the store. All inventory data will be preserved.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteStore(store.id, store.name)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      {hasLowStock && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 animate-pulse">
                          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                              Low Stock Alert
                            </p>
                            <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
                              {lowStockCount} {lowStockCount === 1 ? 'item needs' : 'items need'} attention
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div 
                        className="flex items-center gap-2 mt-4 text-sm text-muted-foreground group-hover:text-primary transition-colors cursor-pointer"
                        onClick={() => navigate(`/store/${store.id}`)}
                      >
                        <span className="font-medium">View Inventory</span>
                        <ArrowRightLeft className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                     </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="transactions" className="w-full">
          <div className="w-full overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-6 gap-1 mb-2">
              <TabsTrigger value="transactions" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-1 sm:flex-initial">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>Live</span>
              </TabsTrigger>
              <TabsTrigger value="receivings" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-1 sm:flex-initial">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>Receive</span>
              </TabsTrigger>
              <TabsTrigger value="transfers" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-1 sm:flex-initial">
                <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>Transfer</span>
              </TabsTrigger>
              <TabsTrigger value="spotchecks" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-1 sm:flex-initial">
                <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>Checks</span>
              </TabsTrigger>
              <TabsTrigger value="variance" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-1 sm:flex-initial">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>Variance</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-1 sm:flex-initial">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                <span>Team</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Live Transactions Feed */}
          <TabsContent value="transactions" className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Clock className="w-6 h-6 text-primary" />
                      Live Transaction Feed
                    </CardTitle>
                    <CardDescription>
                      Real-time updates from all store activities
                    </CardDescription>
                  </div>
                  {transactions.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadLiveTransactionsReport}
                      className="flex-shrink-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="p-6 space-y-4">
                    {transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No transactions yet</p>
                      </div>
                    ) : (
                      transactions.map((transaction, index) => {
                        // Find the item details
                        const item = items.find(i => i.name === transaction.item_name);
                        
                        return (
                          <div
                            key={transaction.id}
                            className="group relative glass rounded-xl p-3 sm:p-5 hover:shadow-xl transition-all duration-300 animate-fade-in border border-border/50"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                              {/* Item Photo with Zoom - Centered on mobile */}
                              <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:block">
                                {item?.photo_url ? (
                                  <ZoomableImage
                                    src={item.photo_url}
                                    alt={item.name}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg"
                                    containerClassName="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-primary/20 shadow-md"
                                    objectFit="cover"
                                  />
                                ) : (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20 shadow-md">
                                    <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary/50" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0 w-full space-y-2">
                                {/* Item Name */}
                                <h4 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors break-words">
                                  {transaction.item_name || 'Multiple Items'}
                                </h4>
                                
                                {/* Transaction Type with Icon and Details */}
                                <div className="flex flex-col gap-2">
                                  {transaction.type === 'transfer' && (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                          <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                                          <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-400">Transfer</span>
                                        </div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                          <span className="font-semibold text-foreground">{transaction.item_count}</span> units
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
                                        <span className="font-medium text-foreground">{transaction.from_store}</span>
                                        <ArrowRightLeft className="w-3 h-3 flex-shrink-0" />
                                        <span className="font-medium text-foreground">{transaction.to_store}</span>
                                      </div>
                                    </>
                                  )}
                                  {transaction.type === 'receiving' && (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                                          <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                                          <span className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-400">Receiving</span>
                                        </div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                          <span className="font-semibold text-foreground">{transaction.item_count}</span> units
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm">
                                        received at <span className="font-medium text-foreground break-words">{transaction.store}</span>
                                      </div>
                                    </>
                                  )}
                                  {transaction.type === 'spot_check' && (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                          <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                                          <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">Spot Check</span>
                                        </div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                          <span className="font-semibold text-foreground">{transaction.item_count}</span> items
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm">
                                        at <span className="font-medium text-foreground break-words">{transaction.store}</span>
                                      </div>
                                    </>
                                  )}
                                  {transaction.type === 'variance' && (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                                          <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500" />
                                          <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-400">Variance</span>
                                        </div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">
                                          <span className="font-semibold text-foreground">{transaction.item_count}</span> items
                                        </span>
                                      </div>
                                      <div className="text-xs sm:text-sm">
                                        at <span className="font-medium text-foreground break-words">{transaction.store}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* Who Initiated and When */}
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="w-4 h-4 sm:w-5 sm:h-5">
                                      <AvatarFallback className="text-[8px] sm:text-[10px]">
                                        {transaction.user_email?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium truncate max-w-[120px] sm:max-w-none">{transaction.user_email}</span>
                                  </div>
                                  <span className="hidden sm:inline">•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs">{new Date(transaction.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              
                               {/* Status + actions - Hidden on mobile, visible on hover on desktop */}
                              <div className="flex flex-row items-center gap-2 w-full sm:w-auto sm:flex-col sm:items-end self-start sm:self-auto flex-shrink-0 mt-2 sm:mt-0">
                                <Badge 
                                  variant={
                                    transaction.status === 'completed' ? 'default' :
                                    transaction.status === 'pending' ? 'secondary' : 
                                    'destructive'
                                  }
                                  className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold whitespace-nowrap"
                                >
                                  {transaction.status}
                                </Badge>
                                {(transaction.type === 'transfer' || transaction.type === 'receiving') && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="hidden sm:flex h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteFeedTransaction(transaction)}
                                    title="Delete activity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
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
                    <Label className="text-sm">
                      Warehouse / Receiving Store * ({stores.filter((s) => s.store_type === 'receive' || s.store_type === 'both').length} available)
                    </Label>
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
                              {item.photo_url && (
                                <img src={item.photo_url} alt={item.name} className="w-6 h-6 rounded object-cover" />
                              )}
                              {item.color_code && !item.photo_url && (
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

                  {/* Show selected item photo with zoom */}
                  {selectedReceivingItem && (() => {
                    const selectedItem = items.find(item => item.id === selectedReceivingItem);
                    return selectedItem?.photo_url ? (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Item Photo (Click to Zoom)</Label>
                        <ZoomableImage
                          src={selectedItem.photo_url}
                          alt={selectedItem.name}
                          containerClassName="w-full h-40 sm:h-32 rounded-lg border-2 border-primary/20 overflow-hidden"
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Recent Receivings ({receivings.length})
                    </CardTitle>
                    <CardDescription>
                      All recorded receiving transactions
                    </CardDescription>
                  </div>
                  {receivings.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadReceivingsReport}
                      className="flex-shrink-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {receivings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium mb-1">No receivings recorded yet</p>
                    <p className="text-sm">Record your first receiving above to see it here</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {receivings.map((receiving: any) => {
                        const itemId = receiving.details?.item_id;
                        const item = items.find((i: any) => i.id === itemId);
                        
                        return (
                          <div key={receiving.id} className="group glass rounded-lg p-3 sm:p-4 hover:shadow-lg transition-all">
                            <div className="flex flex-col sm:flex-row items-start gap-3">
                              {/* Item Photo with Zoom - Centered on mobile */}
                              {item?.photo_url && (
                                <div className="w-full sm:w-auto flex justify-center sm:block">
                                  <ZoomableImage
                                    src={item.photo_url}
                                    alt={item.name}
                                    containerClassName="w-20 h-20 sm:w-16 sm:h-16 rounded-lg border-2 border-border/50 flex-shrink-0"
                                    className="w-20 h-20 sm:w-16 sm:h-16"
                                    objectFit="cover"
                                  />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0 w-full">
                                <p className="font-semibold text-base sm:text-base mb-1 break-words">
                                  {item?.name || 'Unknown Item'}
                                </p>
                                {item?.brand && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Brand: {item.brand}
                                  </p>
                                )}
                                <p className="text-sm font-medium text-primary mb-1 break-words">
                                  Store: {receiving.stores?.name}
                                </p>
                                <p className="text-sm font-semibold mb-1">
                                  Qty received: {(() => {
                                    const quantityBefore = typeof receiving.quantity_before === 'number' ? receiving.quantity_before : 0;
                                    const quantityAfter = typeof receiving.quantity_after === 'number' ? receiving.quantity_after : 0;
                                    const receivedQty = typeof receiving.details?.received_quantity === 'number'
                                      ? receiving.details.received_quantity
                                      : (quantityAfter - quantityBefore) || quantityAfter || 0;
                                    return receivedQty;
                                  })()}
                                </p>
                                <p className="text-xs text-muted-foreground break-words">
                                  On hand after: {receiving.quantity_after ?? 0} • {new Date(receiving.created_at).toLocaleDateString()}
                                </p>
                                {receiving.details?.notes && (
                                  <p className="text-xs text-muted-foreground mt-1.5 italic bg-muted/50 rounded px-2 py-1 break-words">
                                    {receiving.details.notes}
                                  </p>
                                )}
                              </div>
                              
                              {/* Buttons always visible on mobile, hover on desktop */}
                              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-2 sm:mt-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditReceiving(receiving)}
                                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex-1 sm:flex-none flex-shrink-0"
                                  title="Edit receiving"
                                >
                                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteReceiving(receiving)}
                                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm flex-1 sm:flex-none flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete receiving"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
                                  <span className="hidden sm:inline">Delete</span>
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
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">From Store * ({stores.length} available)</Label>
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
                      <Label className="text-sm">To Store * ({stores.filter(s => s.id !== selectedFromStore).length} available)</Label>
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
                                <div className="flex items-center gap-2">
                                  {item.photo_url && (
                                    <img src={item.photo_url} alt={item.name} className="w-6 h-6 rounded object-cover" />
                                  )}
                                  <span>{item.name} {item.brand ? `(${item.brand})` : ''} - Qty: {invQty}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show selected item photo with zoom */}
                  {selectedItem && (() => {
                    const selectedItemData = items.find(item => item.id === selectedItem);
                    return selectedItemData?.photo_url ? (
                      <div className="space-y-1.5">
                        <Label className="text-sm">Item Photo (Click to Zoom)</Label>
                        <ZoomableImage
                          src={selectedItemData.photo_url}
                          alt={selectedItemData.name}
                          containerClassName="w-full h-40 sm:h-32 rounded-lg border-2 border-primary/20 overflow-hidden"
                          className="w-full h-full bg-muted"
                          objectFit="contain"
                        />
                      </div>
                    ) : null;
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Recent Transfers</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3">
                    {transfers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No transfers yet</p>
                      </div>
                    ) : (
                      transfers.map((transfer: any) => {
                        const item = items.find(i => i.id === transfer.inventory?.item_id);
                        
                        return (
                          <div key={transfer.id} className="group glass rounded-lg p-3 sm:p-4 hover:shadow-lg transition-all">
                            <div className="flex flex-col sm:flex-row items-start gap-3">
                              {/* Item Photo with Zoom - Centered on mobile */}
                              {item?.photo_url && (
                                <div className="w-full sm:w-auto flex justify-center sm:block">
                                  <ZoomableImage
                                    src={item.photo_url}
                                    alt={item.name}
                                    containerClassName="w-20 h-20 sm:w-16 sm:h-16 rounded-lg border-2 border-border/50 flex-shrink-0"
                                    className="w-20 h-20 sm:w-16 sm:h-16"
                                    objectFit="cover"
                                  />
                                </div>
                              )}
                              
                              <div className="flex-1 min-w-0 w-full">
                                <p className="font-semibold text-base sm:text-base mb-1 break-words">
                                  {item?.name || transfer.inventory?.items?.name || 'Unknown Item'}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 flex-wrap">
                                  <span className="font-medium text-foreground break-words">{transfer.from_store?.name}</span>
                                  <ArrowRightLeft className="w-3 h-3 flex-shrink-0" />
                                  <span className="font-medium text-foreground break-words">{transfer.to_store?.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground break-words">
                                  Qty: <span className="font-semibold text-foreground">{transfer.quantity}</span> • {new Date(transfer.transfer_date).toLocaleDateString()}
                                  {transfer.transferred_by?.name && ` • By ${transfer.transferred_by.name}`}
                                </p>
                                {transfer.notes && (
                                  <p className="text-xs text-muted-foreground mt-1.5 italic bg-muted/50 rounded px-2 py-1 break-words">
                                    {transfer.notes}
                                  </p>
                                )}
                              </div>
                              
                              {/* Buttons always visible on mobile, hover on desktop */}
                              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                                <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'} className="whitespace-nowrap text-xs px-2 sm:px-3 py-1">
                                  {transfer.status}
                                </Badge>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 sm:h-7 sm:w-7 flex-shrink-0"
                                    onClick={() => handleEditTransfer(transfer)}
                                    title="Edit transfer"
                                  >
                                    <Edit className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 sm:h-7 sm:w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                    onClick={() => setDeleteTransferId(transfer.id)}
                                    title="Delete transfer"
                                  >
                                    <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spot Checks Tab */}
          <TabsContent value="spotchecks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-lg sm:text-xl">Spot Checks</span>
                  <Button onClick={handleStartSpotCheck} size="sm" className="w-full sm:w-auto">
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Start New Check
                  </Button>
                </CardTitle>
                <CardDescription>
                  Verify inventory accuracy and adjust quantities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {spotChecks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No spot checks yet</p>
                      </div>
                    ) : (
                      spotChecks.map((check: any) => (
                        <div key={check.id} className="glass rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-base">{check.stores?.name}</p>
                                <Badge variant={check.status === 'completed' ? 'default' : 'secondary'}>
                                  {check.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(check.check_date).toLocaleString()}
                              </p>
                            </div>
                            {check.status === 'completed' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadSpotCheckReport(check)}
                                className="flex-shrink-0"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Report
                              </Button>
                            )}
                          </div>
                          
                          {check.spot_check_items && check.spot_check_items.length > 0 && (
                            <div className="mt-3 space-y-2 border-t pt-3">
                              <p className="text-sm font-medium mb-2">Items Checked:</p>
                              {check.spot_check_items.map((item: any) => (
                                <div key={item.id} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                                  {item.items?.photo_url && (
                                    <img 
                                      src={item.items.photo_url} 
                                      alt={item.items?.name} 
                                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm break-words">{item.items?.name || 'Unknown Item'}</p>
                                    <div className="flex flex-wrap gap-2 mt-1 text-xs">
                                      <span className="text-muted-foreground">
                                        System: <span className="font-semibold text-foreground">{item.expected_quantity}</span>
                                      </span>
                                      <span>→</span>
                                      <span className="text-muted-foreground">
                                        Physical: <span className="font-semibold text-primary">{item.actual_quantity}</span>
                                      </span>
                                      {item.variance !== 0 && (
                                        <Badge 
                                          variant={item.variance > 0 ? 'default' : 'destructive'}
                                          className="text-xs"
                                        >
                                          {item.variance > 0 ? '+' : ''}{item.variance}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Spot Check Dialog */}
          <Dialog open={showSpotCheckDialog} onOpenChange={setShowSpotCheckDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Spot Check</DialogTitle>
                <DialogDescription>
                  Count physical inventory and adjust system quantities
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Store *</Label>
                  <Select value={spotCheckStore} onValueChange={setSpotCheckStore}>
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

                {spotCheckStore && (
                  <Button onClick={handleLoadSpotCheckItems} variant="outline" className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    Load Items for This Store
                  </Button>
                )}

                {spotCheckItems.length > 0 && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    <p className="text-sm font-medium">Enter Physical Counts:</p>
                    {spotCheckItems.map((item) => (
                      <div key={item.inventory_id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            System qty: {item.expected_quantity}
                          </p>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            step="any"
                            placeholder="Physical"
                            value={item.actual_quantity}
                            onChange={(e) => handleSpotCheckQuantityChange(item.inventory_id, e.target.value)}
                            className="h-9"
                          />
                        </div>
                        {item.actual_quantity && (
                          <Badge 
                            variant={
                              parseFloat(item.actual_quantity) > item.expected_quantity 
                                ? 'default' 
                                : parseFloat(item.actual_quantity) < item.expected_quantity 
                                ? 'destructive' 
                                : 'secondary'
                            }
                            className="whitespace-nowrap"
                          >
                            {parseFloat(item.actual_quantity) === item.expected_quantity 
                              ? 'Match' 
                              : `${parseFloat(item.actual_quantity) > item.expected_quantity ? '+' : ''}${(parseFloat(item.actual_quantity) - item.expected_quantity).toFixed(1)}`
                            }
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSpotCheckDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitSpotCheck}
                  disabled={spotCheckItems.filter(i => i.actual_quantity !== '').length === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Submit Spot Check
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          if (!currentWorkspace) {
                            navigate("/workspace-management");
                            toast.info("Create a workspace to add members and collaborate with your team.");
                            return;
                          }
                          setInviteWorkspaceDialogOpen(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Members
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!currentWorkspace) {
                            navigate("/workspace-management");
                            toast.info("Create a workspace to manage member permissions.");
                            return;
                          }
                          setPermissionsDialogOpen(true);
                        }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Permissions
                      </Button>
                    </div>

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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Edit Transfer Dialog */}
      <Dialog open={editTransferDialog} onOpenChange={setEditTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateTransfer(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Item</Label>
              <p className="text-sm font-medium">
                {editingTransfer?.inventory?.items?.name || 'Unknown Item'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Route</Label>
              <p className="text-sm font-medium">
                {editingTransfer?.from_store?.name} → {editingTransfer?.to_store?.name}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-transfer-quantity">Quantity *</Label>
              <Input
                id="edit-transfer-quantity"
                type="number"
                value={editTransferQuantity}
                onChange={(e) => setEditTransferQuantity(e.target.value)}
                placeholder="Qty"
                min="1"
                step="any"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-transfer-notes">Notes</Label>
              <Textarea
                id="edit-transfer-notes"
                value={editTransferNotes}
                onChange={(e) => setEditTransferNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => setEditTransferDialog(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Transfer Confirmation */}
      <AlertDialog open={!!deleteTransferId} onOpenChange={(open) => !open && setDeleteTransferId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transfer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTransferId && handleDeleteTransfer(deleteTransferId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentWorkspace && (
        <>
          <InviteWorkspaceMemberDialog
            open={inviteWorkspaceDialogOpen}
            onOpenChange={setInviteWorkspaceDialogOpen}
            workspaceId={currentWorkspace.id}
            workspaceName={currentWorkspace.name}
            onSuccess={fetchAllData}
          />
          
          <ManageMemberPermissionsDialog
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
            workspaceId={currentWorkspace.id}
            workspaceName={currentWorkspace.name}
            onSuccess={fetchAllData}
          />
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default StoreManagement;
