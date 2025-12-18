import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Fetch recent received records that haven't been synced yet - RQ codes only (materials, not ML market list)
  const { data: unlinkedReceived } = useQuery({
    queryKey: ['po-received-unlinked', userId, workspaceId],
    queryFn: async () => {
      // Fetch all RQ records (materials only), filtering by workspace if selected
      let query = supabase
        .from('po_received_records')
        .select('id, document_number, supplier_name, received_date, total_items, workspace_id')
        .ilike('document_number', 'RQ%') // Only RQ codes (materials), not ML (market list)
        .order('received_date', { ascending: false })
        .limit(20);
      
      // Only filter by workspace if one is selected
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out records that already have sync items
      const syncedRecordIds = syncItems?.map(s => s.po_received_record_id).filter(Boolean) || [];
      return (data || []).filter(r => !syncedRecordIds.includes(r.id));
    },
    enabled: !!userId && !!syncItems
  });

  const pendingItems = syncItems?.filter(i => i.status === 'pending') || [];
  const syncedItems = syncItems?.filter(i => i.status === 'synced') || [];

  // Import items from a received record
  const importFromReceived = async (recordId: string) => {
    try {
      // Fetch received items
      const { data: receivedItems, error } = await (supabase as any)
        .from('purchase_order_received_items')
        .select('*')
        .eq('receiving_id', recordId);
      
      if (error) throw error;
      if (!receivedItems?.length) {
        toast.error("No items found in this receiving record");
        return;
      }

      // Create sync items for each received item
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
      queryClient.invalidateQueries({ queryKey: ['po-received-unlinked'] });
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
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-primary" />
            PO → FIFO
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0 space-y-2">
        {/* Import from PO Received - RQ codes only */}
        {unlinkedReceived && unlinkedReceived.length > 0 && (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Import RQ Materials</Label>
            <div className="space-y-0.5 max-h-16 overflow-auto">
              {unlinkedReceived.map(record => (
                <div 
                  key={record.id}
                  className="flex items-center justify-between p-1 bg-primary/10 rounded text-[10px] cursor-pointer hover:bg-primary/20"
                  onClick={() => importFromReceived(record.id)}
                >
                  <span className="font-medium truncate">{record.document_number}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="h-3.5 px-1 text-[8px]">{record.total_items}</Badge>
                    <ArrowRight className="h-2.5 w-2.5 text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'synced')}>
          <TabsList className="grid w-full grid-cols-2 h-6">
            <TabsTrigger value="pending" className="text-[10px] flex items-center gap-0.5 h-5">
              <Clock className="h-2.5 w-2.5" />
              Pending
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="h-3 px-0.5 text-[8px] ml-0.5">
                  {pendingItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="synced" className="text-[10px] flex items-center gap-0.5 h-5">
              <CheckCircle className="h-2.5 w-2.5" />
              Synced
              {syncedItems.length > 0 && (
                <Badge variant="secondary" className="h-3 px-0.5 text-[8px] ml-0.5">
                  {syncedItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-1.5 space-y-1.5">
            {pendingItems.length === 0 ? (
              <div className="text-center py-2 text-[10px] text-muted-foreground">
                <Package className="h-4 w-4 mx-auto mb-1 opacity-50" />
                No pending items
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                    <SelectTrigger className="h-6 text-[10px] flex-1">
                      <SelectValue placeholder="Select store..." />
                    </SelectTrigger>
                    <SelectContent>
                      {receivableStores.map(store => (
                        <SelectItem key={store.id} value={store.id} className="text-[10px]">
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    className="h-6 text-[10px] px-2"
                    onClick={syncAllPending}
                    disabled={!selectedStoreId || readyToSyncCount === 0 || isSyncing}
                  >
                    {isSyncing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                    <span className="ml-0.5">{readyToSyncCount}</span>
                  </Button>
                </div>

                <div className="space-y-1 max-h-32 overflow-auto">
                  {pendingItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`p-1.5 rounded border text-[10px] ${
                        item.expiration_date 
                          ? 'border-green-500/50 bg-green-500/5' 
                          : 'border-amber-500/50 bg-amber-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium truncate flex-1 text-[10px]">{item.item_name}</span>
                        <Badge variant="outline" className="text-[8px] h-3 px-1">
                          {item.quantity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={item.expiration_date || ''}
                          onChange={(e) => updateExpiration(item.id, e.target.value)}
                          className={`h-5 text-[10px] flex-1 ${!item.expiration_date ? 'border-amber-500' : ''}`}
                        />
                        {item.expiration_date ? (
                          <Check className="h-2.5 w-2.5 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 text-destructive"
                          onClick={() => rejectItem(item.id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="synced" className="mt-1.5">
            {syncedItems.length === 0 ? (
              <div className="text-center py-2 text-[10px] text-muted-foreground">
                <CheckCircle className="h-4 w-4 mx-auto mb-1 opacity-50" />
                No synced items yet
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-auto">
                {syncedItems.map(item => (
                  <div 
                    key={item.id} 
                    className="p-1.5 rounded border border-green-500/30 bg-green-500/5 text-[10px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate flex-1">{item.item_name}</span>
                      <div className="flex items-center gap-1">
                        <Badge className="text-[8px] h-3 px-1 bg-green-600">{item.quantity}</Badge>
                        <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                      </div>
                    </div>
                    <div className="text-[8px] text-muted-foreground mt-0.5">
                      Exp: {item.expiration_date ? format(new Date(item.expiration_date), 'PP') : '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
