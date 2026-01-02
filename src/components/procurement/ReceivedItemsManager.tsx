import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, XCircle, AlertTriangle, Package, 
  FileText, Save, Search, MessageSquare, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ReceivedItemRecord {
  id: string;
  item_name: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  is_received: boolean;
  follow_up_notes?: string;
  document_number?: string;
  received_date: string;
}

interface ReceivedItemsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  documentNumber?: string;
  supplierName?: string;
  receivedDate: string;
  totalValue: number;
  items: ReceivedItemRecord[];
  currencySymbol: string;
  onItemsUpdated?: () => void;
}

export const ReceivedItemsManager = ({
  open,
  onOpenChange,
  recordId,
  documentNumber,
  supplierName,
  receivedDate,
  totalValue,
  items: initialItems,
  currencySymbol,
  onItemsUpdated
}: ReceivedItemsManagerProps) => {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ReceivedItemRecord[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  
  // Sync items when dialog opens
  useState(() => {
    setItems(initialItems);
  });

  // Track changes
  const [changedItems, setChangedItems] = useState<Set<string>>(new Set());

  const toggleItemReceived = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, is_received: !item.is_received } : item
    ));
    setChangedItems(prev => new Set(prev).add(itemId));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, follow_up_notes: notes } : item
    ));
    setChangedItems(prev => new Set(prev).add(itemId));
  };

  const startEditingNotes = (itemId: string, currentNotes?: string) => {
    setEditingNotes(itemId);
    setTempNotes(currentNotes || "");
  };

  const saveNotes = (itemId: string) => {
    updateItemNotes(itemId, tempNotes);
    setEditingNotes(null);
    setTempNotes("");
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => 
      item.item_name.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const received = items.filter(i => i.is_received);
    const pending = items.filter(i => !i.is_received);
    return {
      total: items.length,
      received: received.length,
      pending: pending.length,
      receivedValue: received.reduce((sum, i) => sum + (i.total_price || 0), 0),
      pendingValue: pending.reduce((sum, i) => sum + (i.total_price || 0), 0)
    };
  }, [items]);

  const hasChanges = changedItems.size > 0;

  const handleSave = async () => {
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      // Update each changed item
      const updates = Array.from(changedItems).map(async (itemId) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const { error } = await supabase
          .from('purchase_order_received_items')
          .update({
            is_received: item.is_received,
            follow_up_notes: item.follow_up_notes || null
          })
          .eq('id', itemId);

        if (error) throw error;
      });

      await Promise.all(updates);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
      queryClient.invalidateQueries({ queryKey: ['po-all-received-items'] });
      
      toast.success(`Updated ${changedItems.size} item(s)`);
      setChangedItems(new Set());
      onItemsUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Manage Received Items
          </DialogTitle>
        </DialogHeader>

        {/* Record Info */}
        <div className="px-3 sm:px-4 py-2 bg-muted/30 border-b shrink-0">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Document</p>
              <p className="font-medium truncate">{documentNumber || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Received Date</p>
              <p className="font-medium">{format(new Date(receivedDate), 'MMM d, yyyy')}</p>
            </div>
            {supplierName && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="font-medium">{supplierName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-3 sm:px-4 py-2 border-b shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2 text-center bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-3 w-3 text-green-500 mx-auto" />
              <p className="text-lg font-bold text-green-500">{stats.received}</p>
              <p className="text-[9px] text-muted-foreground">Received</p>
            </Card>
            <Card className="p-2 text-center bg-amber-500/10 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 text-amber-500 mx-auto" />
              <p className="text-lg font-bold text-amber-500">{stats.pending}</p>
              <p className="text-[9px] text-muted-foreground">Missing</p>
            </Card>
            <Card className="p-2 text-center bg-primary/10 border-primary/30">
              <Package className="h-3 w-3 text-primary mx-auto" />
              <p className="text-lg font-bold text-primary">{stats.total}</p>
              <p className="text-[9px] text-muted-foreground">Total</p>
            </Card>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 sm:px-4 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Items List */}
        <ScrollArea className="flex-1 px-3 sm:px-4">
          <div className="space-y-2 pb-4">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className={`p-3 transition-all ${
                  item.is_received 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-amber-500/30 bg-amber-500/5'
                } ${changedItems.has(item.id) ? 'ring-2 ring-primary/50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    <Checkbox
                      checked={item.is_received}
                      onCheckedChange={() => toggleItemReceived(item.id)}
                      className={item.is_received ? 'border-green-500 data-[state=checked]:bg-green-500' : 'border-amber-500'}
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium text-sm truncate ${!item.is_received ? 'text-amber-700 dark:text-amber-400' : ''}`}>
                        {item.item_name}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={`shrink-0 text-[10px] ${
                          item.is_received 
                            ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        }`}
                      >
                        {item.is_received ? 'Received' : 'Missing'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Qty: {item.quantity} {item.unit || ''}</span>
                      {item.total_price && (
                        <span>{currencySymbol}{item.total_price.toFixed(2)}</span>
                      )}
                    </div>

                    {/* Notes */}
                    {editingNotes === item.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          placeholder="Add follow-up notes..."
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          className="text-xs h-16 resize-none"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-xs"
                            onClick={() => setEditingNotes(null)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => saveNotes(item.id)}
                          >
                            Save Note
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        {item.follow_up_notes ? (
                          <div 
                            className="text-xs p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                            onClick={() => startEditingNotes(item.id, item.follow_up_notes)}
                          >
                            <p className="text-muted-foreground">{item.follow_up_notes}</p>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-muted-foreground"
                            onClick={() => startEditingNotes(item.id)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Add note
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No items found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {hasChanges && (
                <span className="text-primary font-medium">
                  {changedItems.size} item(s) changed
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    {hasChanges ? 'Save Changes' : 'Close'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceivedItemsManager;
