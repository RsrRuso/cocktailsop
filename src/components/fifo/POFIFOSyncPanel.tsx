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
      let query = supabase
        .from('po_received_records')
        .select('id, document_number, supplier_name, received_date, total_items')
        .ilike('document_number', 'RQ%') // Only RQ codes (materials), not ML (market list)
        .order('received_date', { ascending: false })
        .limit(20);
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      } else {
        query = query.eq('user_id', userId).is('workspace_id', null);
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
    <Card className="border-primary/20">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            PO → FIFO Sync
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Import from PO Received */}
        {unlinkedReceived && unlinkedReceived.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Import from Received</Label>
            <ScrollArea className="h-20 border rounded-md">
              <div className="p-1 space-y-1">
                {unlinkedReceived.map(record => (
                  <div 
                    key={record.id}
                    className="flex items-center justify-between p-1.5 bg-muted/50 rounded text-xs cursor-pointer hover:bg-muted"
                    onClick={() => importFromReceived(record.id)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{record.document_number || 'No code'}</span>
                      <span className="text-muted-foreground">({record.total_items} items)</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-primary" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'synced')}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="pending" className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending
              {pendingItems.length > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  {pendingItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="synced" className="text-xs flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Synced
              {syncedItems.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {syncedItems.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-2 space-y-2">
            {pendingItems.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                <Package className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No pending items
              </div>
            ) : (
              <>
                {/* Store selection for bulk sync */}
                <div className="flex items-center gap-2">
                  <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder="Select store for sync..." />
                    </SelectTrigger>
                    <SelectContent>
                      {receivableStores.map(store => (
                        <SelectItem key={store.id} value={store.id} className="text-xs">
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={syncAllPending}
                    disabled={!selectedStoreId || readyToSyncCount === 0 || isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Sync {readyToSyncCount} Ready
                  </Button>
                </div>

                <ScrollArea className="h-48">
                  <div className="space-y-1.5">
                    {pendingItems.map(item => (
                      <div 
                        key={item.id} 
                        className={`p-2 rounded-md border text-xs ${
                          item.expiration_date 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : 'border-amber-500/50 bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium truncate flex-1">{item.item_name}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {item.quantity} {item.unit || 'units'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                          <Input
                            type="date"
                            value={item.expiration_date || ''}
                            onChange={(e) => updateExpiration(item.id, e.target.value)}
                            className={`h-6 text-xs flex-1 ${!item.expiration_date ? 'border-amber-500' : ''}`}
                          />
                          {item.expiration_date ? (
                            <Check className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 text-destructive"
                            onClick={() => rejectItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent value="synced" className="mt-2">
            {syncedItems.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No synced items yet
              </div>
            ) : (
              <ScrollArea className="h-56">
                <div className="space-y-1.5">
                  {syncedItems.map(item => (
                    <div 
                      key={item.id} 
                      className="p-2 rounded-md border border-green-500/30 bg-green-500/5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate flex-1">{item.item_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] h-4 bg-green-600">
                            {item.quantity}
                          </Badge>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-muted-foreground">
                        <span>Expires: {item.expiration_date ? format(new Date(item.expiration_date), 'PP') : '-'}</span>
                        <span>Synced: {item.synced_at ? format(new Date(item.synced_at), 'PP') : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
