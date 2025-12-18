import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw, Package, Calendar, Check, X, Clock, 
  CheckCircle, AlertTriangle, Loader2, ArrowRight, FileText 
} from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface POFIFOSyncPanelProps {
  userId: string;
  workspaceId?: string;
  stores: any[];
  items: any[];
  onSyncComplete: () => void;
}

interface SyncItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string | null;
  unit_price: number | null;
  expiration_date: string | null;
  fifo_store_id: string | null;
  status: 'pending' | 'synced' | 'rejected';
  po_received_record_id: string | null;
  created_at: string;
  synced_at: string | null;
  notes: string | null;
}

export const POFIFOSyncPanel = ({ 
  userId, 
  workspaceId, 
  stores, 
  items,
  onSyncComplete 
}: POFIFOSyncPanelProps) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'synced'>('pending');
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<SyncItem | null>(null);
  const [tempExpiry, setTempExpiry] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const receivableStores = stores.filter(s => s.store_type === 'receive' || s.store_type === 'both');

  // Fetch pending and synced items
  const { data: syncItems, isLoading, refetch } = useQuery({
    queryKey: ['po-fifo-sync', userId, workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('po_fifo_sync')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.eq('user_id', userId).is('workspace_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SyncItem[];
    },
    enabled: !!userId
  });

  // Fetch recent received records - RQ codes only (materials, not ML market list)
  const { data: receivedRecords, isLoading: loadingReceived } = useQuery({
    queryKey: ['po-received-records', userId, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_received_records')
        .select('id, document_number, supplier_name, received_date, total_items, workspace_id')
        .ilike('document_number', 'RQ%') // Only RQ codes (materials), not ML (market list)
        .order('received_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Check which records have been imported (only pending or synced count as imported, not rejected)
  const importedRecordIds = new Set(
    syncItems
      ?.filter(s => s.status === 'pending' || s.status === 'synced')
      .map(s => s.po_received_record_id)
      .filter(Boolean) || []
  );

  const pendingItems = syncItems?.filter(i => i.status === 'pending') || [];
  const syncedItems = syncItems?.filter(i => i.status === 'synced') || [];

  // Force re-import: delete existing and import fresh
  const forceImportFromReceived = async (recordId: string) => {
    try {
      // Delete ALL existing sync items for this record (including synced) for fresh re-import
      await supabase
        .from('po_fifo_sync')
        .delete()
        .eq('po_received_record_id', recordId);

      // Fetch received items
      const { data: receivedItems, error } = await (supabase as any)
        .from('purchase_order_received_items')
        .select('*')
        .eq('record_id', recordId);
      
      if (error) throw error;
      if (!receivedItems?.length) {
        toast.error("No items found in this receiving record");
        return;
      }

      // Create sync items for all items
      const syncRecords = receivedItems.map((item: any) => ({
        po_received_item_id: item.id,
        po_received_record_id: recordId,
        item_name: item.item_name,
        quantity: item.quantity || 0,
        unit: item.unit || null,
        unit_price: item.unit_price || null,
        status: 'pending',
        workspace_id: workspaceId || null,
        user_id: userId,
      }));

      const { error: insertError } = await supabase
        .from('po_fifo_sync')
        .insert(syncRecords);
      
      if (insertError) throw insertError;
      
      toast.success(`${receivedItems.length} items imported for FIFO sync`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['po-received-records'] });
    } catch (error: any) {
      toast.error(`Failed to import: ${error.message}`);
    }
  };

  // Update expiration date for an item
  const updateExpiration = async (itemId: string, expirationDate: string) => {
    const { error } = await supabase
      .from('po_fifo_sync')
      .update({ expiration_date: expirationDate })
      .eq('id', itemId);
    
    if (error) {
      toast.error("Failed to update expiration date");
      return;
    }
    
    refetch();
    setEditingItem(null);
    setTempExpiry("");
  };

  // Sync item to FIFO inventory
  const syncToFIFO = async (item: SyncItem, storeId: string) => {
    if (!item.expiration_date) {
      toast.error("Set expiration date first");
      return;
    }

    setIsSyncing(true);
    try {
      // Find or create item in fifo_items
      let fifoItemId: string;
      const existingItem = items.find(i => i.name.toLowerCase() === item.item_name.toLowerCase());
      
      if (existingItem) {
        fifoItemId = existingItem.id;
      } else {
        const { data: newItem, error: itemError } = await supabase
          .from('fifo_items')
          .insert({
            user_id: userId,
            workspace_id: workspaceId || null,
            name: item.item_name,
          })
          .select()
          .single();
        
        if (itemError) throw itemError;
        fifoItemId = newItem.id;
      }

      // Create inventory record
      const { data: invData, error: invError } = await supabase
        .from('fifo_inventory')
        .insert({
          user_id: userId,
          workspace_id: workspaceId || null,
          store_id: storeId,
          item_id: fifoItemId,
          quantity: item.quantity,
          expiration_date: item.expiration_date,
          received_date: new Date().toISOString(),
          status: 'available'
        })
        .select()
        .single();
      
      if (invError) throw invError;

      // Update sync record
      const { error: syncError } = await supabase
        .from('po_fifo_sync')
        .update({
          status: 'synced',
          fifo_store_id: storeId,
          fifo_inventory_id: invData.id,
          synced_at: new Date().toISOString(),
          synced_by: userId
        })
        .eq('id', item.id);
      
      if (syncError) throw syncError;

      toast.success(`${item.item_name} synced to FIFO`);
      refetch();
      onSyncComplete();
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all pending items with expiration dates
  const syncAllPending = async () => {
    if (!selectedStoreId) {
      toast.error("Select a store first");
      return;
    }

    const readyItems = pendingItems.filter(i => i.expiration_date);
    if (readyItems.length === 0) {
      toast.error("No items ready to sync (set expiration dates first)");
      return;
    }

    setIsSyncing(true);
    let successCount = 0;

    for (const item of readyItems) {
      try {
        await syncToFIFO(item, selectedStoreId);
        successCount++;
      } catch (e) {
        console.error(`Failed to sync ${item.item_name}:`, e);
      }
    }

    toast.success(`${successCount}/${readyItems.length} items synced`);
    setIsSyncing(false);
  };

  // Reject item
  const rejectItem = async (itemId: string) => {
    const { error } = await supabase
      .from('po_fifo_sync')
      .update({ status: 'rejected' })
      .eq('id', itemId);
    
    if (error) {
      toast.error("Failed to reject item");
      return;
    }
    
    toast.success("Item rejected");
    refetch();
  };

  const readyToSyncCount = pendingItems.filter(i => i.expiration_date).length;

  return (
    <section aria-label="PO to FIFO sync" className="space-y-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          PO → FIFO
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </header>

      {/* 3 Main Tabs: Import, Pending, Synced */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "synced")} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-10 bg-muted/30 p-1 gap-1">
          <Button
            variant="ghost"
            className={`h-8 text-xs font-medium flex items-center justify-center gap-1.5 rounded-md ${
              receivedRecords && receivedRecords.length > 0 ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Import
            {receivedRecords && receivedRecords.length > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary">
                {receivedRecords.length}
              </Badge>
            )}
          </Button>
          <TabsTrigger
            value="pending"
            className="h-8 text-xs font-medium flex items-center justify-center gap-1.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            <Clock className="h-3.5 w-3.5" />
            Pending
            {pendingItems.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {pendingItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="synced"
            className="h-8 text-xs font-medium flex items-center justify-center gap-1.5 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Synced
            {syncedItems.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-600 text-white">
                {syncedItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Import RQ Materials Section - always visible above tabs content */}
        {receivedRecords && receivedRecords.length > 0 && (
          <div className="mt-3 space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Tap to Import / Re-import RQ</Label>
            <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-auto">
              {receivedRecords.map((record) => {
                const isImported = importedRecordIds.has(record.id);
                return (
                  <button
                    key={record.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs active:scale-[0.98] transition-all touch-manipulation ${
                      isImported 
                        ? "bg-green-500/10 hover:bg-green-500/20 border border-green-500/30" 
                        : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                    }`}
                    onClick={() => forceImportFromReceived(record.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{record.document_number}</span>
                      <Badge variant="outline" className="h-5 px-2 text-[10px]">
                        {record.total_items} items
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isImported ? (
                        <Badge className="h-5 px-2 text-[10px] bg-green-600 text-white">
                          <Check className="h-3 w-3 mr-1" />
                          Imported
                        </Badge>
                      ) : (
                        <Badge className="h-5 px-2 text-[10px] bg-amber-600 text-white">
                          New
                        </Badge>
                      )}
                      <RefreshCw className={`h-4 w-4 ${isImported ? "text-green-500" : "text-amber-500"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Tab Content */}
        <TabsContent value="pending" className="mt-3 space-y-3">
          {pendingItems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No pending items
            </div>
          ) : (
            <>
              {/* Store selector + Sync button */}
              <div className="flex items-center gap-2">
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="h-9 text-xs flex-1">
                    <SelectValue placeholder="Select store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {receivableStores.map((store) => (
                      <SelectItem key={store.id} value={store.id} className="text-xs">
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 text-xs px-3 min-w-[80px]"
                  onClick={syncAllPending}
                  disabled={!selectedStoreId || readyToSyncCount === 0 || isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Sync {readyToSyncCount}
                    </>
                  )}
                </Button>
              </div>

              {/* Pending items list */}
              <div className="space-y-2 max-h-48 overflow-auto">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border text-xs ${
                      item.expiration_date
                        ? "border-green-500/40 bg-green-500/5"
                        : "border-amber-500/40 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium truncate flex-1">{item.item_name}</span>
                      <Badge variant="outline" className="text-[10px] h-5 px-2">
                        {item.quantity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={item.expiration_date || ""}
                        onChange={(e) => updateExpiration(item.id, e.target.value)}
                        className={`h-8 text-xs flex-1 ${!item.expiration_date ? "border-amber-500" : ""}`}
                      />
                      {item.expiration_date ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => rejectItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Synced Tab Content */}
        <TabsContent value="synced" className="mt-3">
          {syncedItems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No synced items yet
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-auto">
              {syncedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-green-500/30 bg-green-500/5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate flex-1">{item.item_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] h-5 px-2 bg-green-600">{item.quantity}</Badge>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Exp: {item.expiration_date ? format(new Date(item.expiration_date), "PP") : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};
