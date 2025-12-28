import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, XCircle, AlertTriangle, Package, Save, X, 
  Edit2, Trash2, Plus, RefreshCw, FileText, Coins
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ReceivedItem {
  id: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_date: string;
  record_id: string;
}

interface PendingItem {
  item_code?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface EditReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: {
    id: string;
    document_number: string | null;
    supplier_name: string | null;
    received_date: string;
    total_value: number;
    variance_data: any;
  } | null;
  userId: string;
  workspaceId: string | null;
  currencySymbol: string;
}

export const EditReceivingDialog = ({
  open,
  onOpenChange,
  record,
  userId,
  workspaceId,
  currencySymbol
}: EditReceivingDialogProps) => {
  const queryClient = useQueryClient();
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'pending'>('received');
  
  // Track changes
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [addedItems, setAddedItems] = useState<PendingItem[]>([]);
  const [updatedItems, setUpdatedItems] = useState<Map<string, Partial<ReceivedItem>>>(new Map());

  // Fetch received items for this record
  useEffect(() => {
    if (open && record?.id) {
      fetchReceivedItems();
    }
  }, [open, record?.id]);

  const fetchReceivedItems = async () => {
    if (!record?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_order_received_items')
        .select('*')
        .eq('record_id', record.id)
        .order('item_name');
      
      if (error) throw error;
      
      setReceivedItems(data || []);
      
      // Extract pending items from variance_data
      if (record.variance_data?.excluded_items) {
        setPendingItems(record.variance_data.excluded_items.map((item: any) => ({
          item_code: item.item_code || item.code,
          item_name: item.item_name || item.name,
          quantity: item.quantity || item.qty || 0,
          unit_price: item.price_per_unit || item.unit_price || 0,
          total_price: item.price_total || item.total_price || item.value || 0
        })));
      } else {
        setPendingItems([]);
      }
      
      // Reset tracking
      setDeletedIds([]);
      setAddedItems([]);
      setUpdatedItems(new Map());
    } catch (error: any) {
      toast.error("Failed to load items: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemField = (id: string, field: keyof ReceivedItem, value: any) => {
    setReceivedItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.total_price = (updated.quantity || 0) * (updated.unit_price || 0);
      }
      return updated;
    }));
    
    // Track update
    setUpdatedItems(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id) || {};
      newMap.set(id, { ...existing, [field]: value });
      return newMap;
    });
  };

  const deleteItem = (id: string) => {
    const item = receivedItems.find(i => i.id === id);
    if (!item) return;
    
    setReceivedItems(prev => prev.filter(i => i.id !== id));
    setDeletedIds(prev => [...prev, id]);
    
    // Add back to pending
    setPendingItems(prev => [...prev, {
      item_code: item.item_code,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }]);
    
    toast.success(`Moved "${item.item_name}" to pending`);
  };

  const addPendingItem = (item: PendingItem, index: number) => {
    // Add to received items (will be saved later)
    const newItem: ReceivedItem = {
      id: `new-${Date.now()}-${index}`,
      item_name: item.item_name,
      item_code: item.item_code,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      received_date: record?.received_date || new Date().toISOString(),
      record_id: record?.id || ''
    };
    
    setReceivedItems(prev => [...prev, newItem]);
    setAddedItems(prev => [...prev, item]);
    setPendingItems(prev => prev.filter((_, i) => i !== index));
    
    toast.success(`Added "${item.item_name}" to received`);
  };

  // Calculate stats
  const stats = useMemo(() => ({
    receivedCount: receivedItems.length,
    pendingCount: pendingItems.length,
    receivedValue: receivedItems.reduce((sum, i) => sum + (i.total_price || 0), 0),
    pendingValue: pendingItems.reduce((sum, i) => sum + (i.total_price || 0), 0),
    hasChanges: deletedIds.length > 0 || addedItems.length > 0 || updatedItems.size > 0
  }), [receivedItems, pendingItems, deletedIds, addedItems, updatedItems]);

  const handleSave = async () => {
    if (!record?.id) return;
    
    setIsSaving(true);
    try {
      // 1. Delete removed items
      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('purchase_order_received_items')
          .delete()
          .in('id', deletedIds);
        
        if (deleteError) throw deleteError;
      }

      // 2. Update modified items
      for (const [id, updates] of updatedItems.entries()) {
        if (id.startsWith('new-')) continue; // Skip new items
        
        const { error: updateError } = await supabase
          .from('purchase_order_received_items')
          .update({
            quantity: receivedItems.find(i => i.id === id)?.quantity,
            unit_price: receivedItems.find(i => i.id === id)?.unit_price,
            total_price: receivedItems.find(i => i.id === id)?.total_price
          })
          .eq('id', id);
        
        if (updateError) throw updateError;
      }

      // 3. Insert new items
      const newItems = receivedItems.filter(i => i.id.startsWith('new-'));
      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('purchase_order_received_items')
          .insert(newItems.map(item => ({
            user_id: userId,
            workspace_id: workspaceId,
            item_name: item.item_name,
            item_code: item.item_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            received_date: item.received_date,
            record_id: record.id
          })));
        
        if (insertError) throw insertError;
      }

      // 4. Update the record's total value and variance_data
      const newTotalValue = receivedItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
      const updatedVarianceData = {
        ...record.variance_data,
        excluded_items: pendingItems.length > 0 ? pendingItems : undefined,
        last_edited: new Date().toISOString()
      };

      const { error: recordError } = await (supabase as any)
        .from('po_received_records')
        .update({
          total_value: newTotalValue,
          total_items: receivedItems.length,
          total_quantity: receivedItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          variance_data: updatedVarianceData
        })
        .eq('id', record.id);
      
      if (recordError) throw recordError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
      queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
      queryClient.invalidateQueries({ queryKey: ['po-all-received-items'] });
      
      toast.success("Changes saved successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
            Edit Receiving - {record.document_number || record.supplier_name || 'Record'}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="px-3 sm:px-4 py-2 bg-muted/30 border-b shrink-0">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <Card className="p-1.5 sm:p-2 text-center bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mx-auto" />
              <p className="text-base sm:text-lg font-bold text-green-500">{stats.receivedCount}</p>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground">Received</p>
            </Card>
            <Card className="p-1.5 sm:p-2 text-center bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 mx-auto" />
              <p className="text-base sm:text-lg font-bold text-amber-500">{stats.pendingCount}</p>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
            </Card>
            <Card className="p-1.5 sm:p-2 text-center bg-primary/10 border-primary/30">
              <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-primary mx-auto" />
              <p className="text-base sm:text-lg font-bold text-primary">{currencySymbol}{stats.receivedValue.toFixed(0)}</p>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground">Value</p>
            </Card>
            <Card className={`p-1.5 sm:p-2 text-center ${stats.hasChanges ? 'bg-blue-500/10 border-blue-500/30' : 'bg-muted/30 border-border'}`}>
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mx-auto ${stats.hasChanges ? 'text-blue-500' : 'text-muted-foreground'}`} />
              <p className={`text-base sm:text-lg font-bold ${stats.hasChanges ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {deletedIds.length + addedItems.length + updatedItems.size}
              </p>
              <p className="text-[8px] sm:text-[10px] text-muted-foreground">Changes</p>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 sm:px-4 pt-2 shrink-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="received" className="text-[10px] sm:text-xs h-7">
                <CheckCircle className="h-3 w-3 mr-1" />
                Received ({stats.receivedCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-[10px] sm:text-xs h-7">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pending ({stats.pendingCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === 'received' ? (
            <div className="space-y-2">
              {receivedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No received items</p>
                  <p className="text-xs mt-1">Add items from the Pending tab</p>
                </div>
              ) : (
                receivedItems.map((item) => {
                  const isEditing = editingId === item.id;
                  const isNew = item.id.startsWith('new-');
                  return (
                    <Card 
                      key={item.id}
                      className={`p-2.5 sm:p-3 transition-all ${
                        isNew ? 'bg-blue-500/5 border-blue-500/30' : 'bg-green-500/5 border-green-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] sm:text-xs text-muted-foreground">
                              {item.item_code || 'No Code'}
                            </span>
                            {isNew && (
                              <Badge variant="outline" className="text-[8px] bg-blue-500/10 text-blue-500 border-blue-500/30 px-1">
                                NEW
                              </Badge>
                            )}
                          </div>
                          
                          {isEditing ? (
                            <div className="mt-1.5 space-y-1.5">
                              <Input
                                value={item.item_name}
                                onChange={(e) => updateItemField(item.id, 'item_name', e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Item name"
                              />
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItemField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs w-20"
                                  placeholder="Qty"
                                />
                                <Input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => updateItemField(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs flex-1"
                                  placeholder="Price"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-xs sm:text-sm mt-0.5 line-clamp-2">{item.item_name}</p>
                              <div className="flex items-center gap-2 sm:gap-4 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                                <span>Qty: <span className="font-semibold text-foreground">{item.quantity}</span></span>
                                <span>@ {currencySymbol}{item.unit_price?.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <p className="font-bold text-xs sm:text-sm text-green-500">
                            {currencySymbol}{item.total_price?.toFixed(2)}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={isEditing ? "default" : "ghost"}
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingId(isEditing ? null : item.id)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">All items received!</p>
                  <p className="text-xs mt-1">No pending items remaining</p>
                </div>
              ) : (
                pendingItems.map((item, index) => (
                  <Card 
                    key={index}
                    className="p-2.5 sm:p-3 bg-amber-500/5 border-amber-500/30"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] sm:text-xs text-muted-foreground">
                            {item.item_code || 'No Code'}
                          </span>
                        </div>
                        <p className="font-medium text-xs sm:text-sm mt-0.5 line-clamp-2">{item.item_name}</p>
                        <div className="flex items-center gap-2 sm:gap-4 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                          <span>Qty: <span className="font-semibold text-foreground">{item.quantity}</span></span>
                          <span>@ {currencySymbol}{item.unit_price?.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="font-bold text-xs sm:text-sm text-amber-500">
                          {currencySymbol}{item.total_price?.toFixed(2)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20"
                          onClick={() => addPendingItem(item, index)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Receive
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/30 flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !stats.hasChanges}
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
