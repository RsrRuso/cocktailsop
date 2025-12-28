import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, AlertTriangle, Package, RefreshCw, Coins
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
  const [allItems, setAllItems] = useState<(ReceivedItem & { isReceived: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all items for this record
  useEffect(() => {
    if (open && record?.id) {
      fetchAllItems();
    }
  }, [open, record?.id]);

  const fetchAllItems = async () => {
    if (!record?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch received items
      const { data: receivedData, error } = await supabase
        .from('purchase_order_received_items')
        .select('*')
        .eq('record_id', record.id)
        .order('item_name');
      
      if (error) throw error;
      
      // Map received items with isReceived = true
      const receivedItems = (receivedData || []).map(item => ({
        ...item,
        isReceived: true
      }));
      
      // Extract pending items from variance_data
      const pendingItems: (ReceivedItem & { isReceived: boolean })[] = [];
      if (record.variance_data?.excluded_items) {
        record.variance_data.excluded_items.forEach((item: any, index: number) => {
          pendingItems.push({
            id: `pending-${index}-${Date.now()}`,
            item_name: item.item_name || item.name,
            item_code: item.item_code || item.code,
            quantity: item.quantity || item.qty || 0,
            unit_price: item.price_per_unit || item.unit_price || 0,
            total_price: item.price_total || item.total_price || item.value || 0,
            received_date: record.received_date,
            record_id: record.id,
            isReceived: false
          });
        });
      }
      
      setAllItems([...receivedItems, ...pendingItems]);
    } catch (error: any) {
      toast.error("Failed to load items: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle item received status - save immediately like discrepancy check
  const toggleItemReceived = async (itemId: string, checked: boolean) => {
    if (!record?.id) return;
    
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Update UI immediately
    setAllItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, isReceived: checked } : i
    ));
    
    setIsSaving(true);
    try {
      if (checked && item.id.startsWith('pending-')) {
        // Add to received items
        const { error: insertError } = await supabase
          .from('purchase_order_received_items')
          .insert({
            user_id: userId,
            workspace_id: workspaceId,
            item_name: item.item_name,
            item_code: item.item_code,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            received_date: item.received_date,
            record_id: record.id
          });
        
        if (insertError) throw insertError;
        
        // Update the item in state with new ID
        const { data: newItem } = await supabase
          .from('purchase_order_received_items')
          .select('*')
          .eq('record_id', record.id)
          .eq('item_name', item.item_name)
          .single();
        
        if (newItem) {
          setAllItems(prev => prev.map(i => 
            i.id === itemId ? { ...newItem, isReceived: true } : i
          ));
        }
      } else if (!checked && !item.id.startsWith('pending-')) {
        // Remove from received items
        const { error: deleteError } = await supabase
          .from('purchase_order_received_items')
          .delete()
          .eq('id', item.id);
        
        if (deleteError) throw deleteError;
        
        // Update item to pending state
        setAllItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, id: `pending-${Date.now()}`, isReceived: false } : i
        ));
      }
      
      // Update record totals
      await updateRecordTotals();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
      queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
      queryClient.invalidateQueries({ queryKey: ['po-all-received-items'] });
      
    } catch (error: any) {
      // Revert on error
      setAllItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, isReceived: !checked } : i
      ));
      toast.error("Failed to update: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateRecordTotals = async () => {
    if (!record?.id) return;
    
    const receivedItems = allItems.filter(i => i.isReceived);
    const pendingItems = allItems.filter(i => !i.isReceived);
    
    const newTotalValue = receivedItems.reduce((sum, i) => sum + (i.total_price || 0), 0);
    const updatedVarianceData = {
      ...record.variance_data,
      excluded_items: pendingItems.length > 0 ? pendingItems.map(i => ({
        item_name: i.item_name,
        item_code: i.item_code,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price
      })) : undefined,
      last_edited: new Date().toISOString()
    };

    await (supabase as any)
      .from('po_received_records')
      .update({
        total_value: newTotalValue,
        total_items: receivedItems.length,
        total_quantity: receivedItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
        variance_data: updatedVarianceData
      })
      .eq('id', record.id);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const received = allItems.filter(i => i.isReceived);
    const pending = allItems.filter(i => !i.isReceived);
    return {
      receivedCount: received.length,
      pendingCount: pending.length,
      receivedValue: received.reduce((sum, i) => sum + (i.total_price || 0), 0),
      pendingValue: pending.reduce((sum, i) => sum + (i.total_price || 0), 0),
      total: allItems.length
    };
  }, [allItems]);

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-sm sm:text-base">
            Edit Receiving - {record.document_number || record.supplier_name || 'Record'}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="px-3 sm:px-4 py-2 bg-muted/30 border-b shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2 text-center bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
              <p className="text-lg font-bold text-green-500">{stats.receivedCount}</p>
              <p className="text-[10px] text-muted-foreground">Received</p>
            </Card>
            <Card className="p-2 text-center bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
              <p className="text-lg font-bold text-amber-500">{stats.pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </Card>
            <Card className="p-2 text-center bg-primary/10 border-primary/30">
              <Coins className="h-4 w-4 text-primary mx-auto" />
              <p className="text-lg font-bold text-primary">{currencySymbol}{stats.receivedValue.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Value</p>
            </Card>
          </div>
        </div>

        {/* Instruction */}
        <div className="px-3 sm:px-4 py-2 bg-blue-500/5 border-b shrink-0">
          <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
            ✓ Tick items to mark as received • Untick to move to pending
          </p>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allItems.map((item) => (
                <Card 
                  key={item.id}
                  className={`p-3 transition-all cursor-pointer ${
                    item.isReceived 
                      ? 'bg-green-500/5 border-green-500/30' 
                      : 'bg-amber-500/5 border-amber-500/30'
                  } ${isSaving ? 'opacity-70 pointer-events-none' : ''}`}
                  onClick={() => toggleItemReceived(item.id, !item.isReceived)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={item.isReceived}
                      onCheckedChange={(checked) => toggleItemReceived(item.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      className={`h-5 w-5 ${item.isReceived ? 'border-green-500 data-[state=checked]:bg-green-500' : 'border-amber-500'}`}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {item.item_code || '-'}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-[8px] px-1 ${
                            item.isReceived 
                              ? 'bg-green-500/10 text-green-500 border-green-500/30' 
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}
                        >
                          {item.isReceived ? 'RECEIVED' : 'PENDING'}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm mt-0.5 line-clamp-1">{item.item_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Qty: <span className="font-semibold text-foreground">{item.quantity}</span></span>
                        <span>@ {currencySymbol}{item.unit_price?.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${item.isReceived ? 'text-green-500' : 'text-amber-500'}`}>
                        {currencySymbol}{item.total_price?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Status Footer */}
        {isSaving && (
          <div className="px-3 py-2 bg-muted/50 border-t text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Saving changes...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
