import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, CheckCircle, XCircle, Plus, Search, FileText, User, Calendar, MapPin, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { detectBottleSizeMl } from "@/lib/bottleSize";

interface POReceivedStockProps {
  outletId: string;
}

interface ReceivedRecord {
  id: string;
  supplier_name: string;
  document_number: string;
  received_date: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  received_by_name: string;
  created_at: string;
  items?: any[];
}

interface PendingItem {
  id: string;
  item_name: string;
  item_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  document_number: string;
  supplier_name: string;
  received_date: string;
  received_by: string;
  status: string;
  created_at: string;
  po_record_id: string | null;
}

interface Location {
  id: string;
  name: string;
}

export const POReceivedStock = ({ outletId }: POReceivedStockProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("synced");
  const [syncedRecords, setSyncedRecords] = useState<ReceivedRecord[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Approval dialog state
  const [approvalItem, setApprovalItem] = useState<PendingItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [baseUnit, setBaseUnit] = useState("");
  const [parLevel, setParLevel] = useState("0");

  useEffect(() => {
    if (outletId) {
      fetchData();
      fetchLocations();
      setupRealtime();
    }
  }, [outletId]);

  const setupRealtime = () => {
    const channel = supabase
      .channel('po-received-stock')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lab_ops_pending_received_items',
        filter: `outlet_id=eq.${outletId}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch synced stock movements from PO receiving (both auto-synced and approved)
      const { data: movements } = await supabase
        .from('lab_ops_stock_movements')
        .select(`
          *,
          lab_ops_inventory_items (name, sku),
          lab_ops_locations!lab_ops_stock_movements_to_location_id_fkey (name)
        `)
        .in('reference_type', ['po_receiving', 'po_receiving_approved'])
        .order('created_at', { ascending: false })
        .limit(100);

      // Group movements by reference_id (po_record_id)
      const recordMap = new Map<string, ReceivedRecord>();
      movements?.forEach(mov => {
        const refId = mov.reference_id;
        if (!recordMap.has(refId)) {
          recordMap.set(refId, {
            id: refId,
            supplier_name: '',
            document_number: '',
            received_date: mov.created_at,
            total_items: 0,
            total_quantity: 0,
            total_value: 0,
            received_by_name: '',
            created_at: mov.created_at,
            items: []
          });
        }
        const record = recordMap.get(refId)!;
        record.total_items++;
        record.total_quantity += mov.qty || 0;
        record.items?.push({
          name: mov.lab_ops_inventory_items?.name,
          quantity: mov.qty,
          location: mov.lab_ops_locations?.name
        });
      });

      // Fetch additional details from po_received_records
      const recordIds = Array.from(recordMap.keys());
      if (recordIds.length > 0) {
        const { data: poRecords } = await (supabase as any)
          .from('po_received_records')
          .select('id, supplier_name, document_number, received_date, total_value, received_by_name')
          .in('id', recordIds);

        poRecords?.forEach((pr: any) => {
          const record = recordMap.get(pr.id);
          if (record) {
            record.supplier_name = pr.supplier_name || '';
            record.document_number = pr.document_number || '';
            record.received_date = pr.received_date;
            record.total_value = pr.total_value || 0;
            record.received_by_name = pr.received_by_name || '';
          }
        });
      }

      setSyncedRecords(Array.from(recordMap.values()));

      // Fetch pending items
      const { data: pending } = await supabase
        .from('lab_ops_pending_received_items')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingItems(pending || []);
    } catch (error) {
      console.error('Error fetching PO received data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('lab_ops_locations')
      .select('id, name')
      .eq('outlet_id', outletId);
    setLocations(data || []);
  };

  const handleApprove = async () => {
    if (!approvalItem || !selectedLocation || !newItemName) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // Create new inventory item
      const { data: newItem, error: itemError } = await supabase
        .from('lab_ops_inventory_items')
        .insert({
          outlet_id: outletId,
          name: newItemName,
          sku: newItemSku || null,
          base_unit: baseUnit || approvalItem.unit || 'unit',
          par_level: parseInt(parLevel) || 0
        })
        .select('id')
        .single();

      if (itemError) throw itemError;

      // Create stock movement
      await supabase.from('lab_ops_stock_movements').insert({
        inventory_item_id: newItem.id,
        to_location_id: selectedLocation,
        qty: approvalItem.quantity,
        movement_type: 'purchase',
        reference_type: 'po_receiving_approved',
        reference_id: approvalItem.po_record_id,
        notes: `Approved from PO: ${approvalItem.document_number}`,
        created_by: user?.id
      });

      // Update stock levels
      const { data: existingLevel } = await supabase
        .from('lab_ops_stock_levels')
        .select('id, quantity')
        .eq('inventory_item_id', newItem.id)
        .eq('location_id', selectedLocation)
        .single();

      if (existingLevel) {
        await supabase
          .from('lab_ops_stock_levels')
          .update({ quantity: existingLevel.quantity + approvalItem.quantity })
          .eq('id', existingLevel.id);
      } else {
        await supabase.from('lab_ops_stock_levels').insert({
          inventory_item_id: newItem.id,
          location_id: selectedLocation,
          quantity: approvalItem.quantity
        });
      }

      // Update pending item status
      await supabase
        .from('lab_ops_pending_received_items')
        .update({ 
          status: 'approved', 
          approved_by: user?.id, 
          approved_at: new Date().toISOString() 
        })
        .eq('id', approvalItem.id);

      toast.success(`Item "${newItemName}" added to inventory`);
      setApprovalItem(null);
      resetApprovalForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve item");
    }
  };

  const handleReject = async (item: PendingItem) => {
    try {
      await supabase
        .from('lab_ops_pending_received_items')
        .update({ status: 'rejected' })
        .eq('id', item.id);
      
      toast.success("Item rejected");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject item");
    }
  };

  const resetApprovalForm = () => {
    setSelectedLocation("");
    setNewItemName("");
    setNewItemSku("");
    setBaseUnit("");
    setParLevel("0");
  };

  const openApprovalDialog = (item: PendingItem) => {
    setApprovalItem(item);
    setNewItemName(item.item_name);
    setNewItemSku(item.item_code || "");
    setBaseUnit(item.unit || "unit");
  };

  const filteredSynced = syncedRecords.filter(r =>
    !searchTerm || 
    r.document_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPending = pendingItems.filter(p =>
    !searchTerm ||
    p.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by document number, supplier, item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="synced" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Synced ({syncedRecords.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2 relative">
            <Clock className="h-4 w-4" />
            Pending ({pendingItems.length})
            {pendingItems.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-xs flex items-center justify-center text-white">
                {pendingItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Synced Records Tab */}
        <TabsContent value="synced" className="mt-4">
          {filteredSynced.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No synced receiving records yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Receive items in Purchase Orders to see them here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredSynced.map((record) => (
                <Card key={record.id} className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-green-500" />
                        <span className="font-semibold">{record.document_number || 'No Doc#'}</span>
                        <Badge variant="outline" className="border-green-500/50 text-green-500">
                          Synced
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {record.supplier_name && (
                          <p className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {record.supplier_name}
                          </p>
                        )}
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.received_date), 'MMM dd, yyyy')}
                        </p>
                        {record.received_by_name && (
                          <p className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {record.received_by_name}
                          </p>
                        )}
                      </div>

                      {/* Items list */}
                      {record.items && record.items.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Items ({record.total_items}):
                          </p>
                          <div className="space-y-1">
                            {record.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="truncate">{item.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    +{item.quantity}
                                  </Badge>
                                  {item.location && (
                                    <span className="text-xs text-muted-foreground">
                                      → {item.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {record.items.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{record.items.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <Badge className="text-base font-bold px-3 py-1 bg-green-500">
                        +{record.total_quantity}
                      </Badge>
                      {record.total_value > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ${record.total_value.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending Items Tab */}
        <TabsContent value="pending" className="mt-4">
          {filteredPending.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
              <p className="text-muted-foreground">No pending items to approve</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Items not matching existing inventory will appear here
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <Card className="p-3 bg-amber-500/10 border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {pendingItems.length} item(s) need approval to add to inventory
                  </p>
                </div>
              </Card>

              {filteredPending.map((item) => (
                <Card key={item.id} className="p-3 sm:p-4 border-l-4 border-l-amber-500">
                  {/* Header with name and quantity badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Package className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-semibold text-sm sm:text-base break-words">{item.item_name}</span>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-xs shrink-0">
                        Pending
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="text-sm sm:text-base font-bold px-2 sm:px-3 py-1 shrink-0">
                      {item.quantity} {item.unit || 'BOT'}
                    </Badge>
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-1 text-xs sm:text-sm text-muted-foreground mb-3">
                    {item.item_code && (
                      <p className="break-all">Code: {item.item_code}</p>
                    )}
                    <p className="flex items-center gap-1">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="break-all">{item.document_number || 'No Doc#'}</span>
                    </p>
                    {item.supplier_name && (
                      <p className="break-words">{item.supplier_name}</p>
                    )}
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {item.received_date ? format(new Date(item.received_date), 'MMM dd, yyyy') : 'N/A'}
                    </p>
                    {item.received_by && (
                      <p className="flex items-center gap-1">
                        <User className="h-3 w-3 shrink-0" />
                        {item.received_by}
                      </p>
                    )}
                  </div>

                  {/* Actions - full width on mobile */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    {item.total_price > 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        ${item.total_price.toFixed(2)}
                      </p>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        size="sm" 
                        onClick={() => openApprovalDialog(item)}
                        className="gap-1 text-xs sm:text-sm h-8 px-2 sm:px-3"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="hidden xs:inline">Add to Inventory</span>
                        <span className="xs:hidden">Add</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleReject(item)}
                        className="text-destructive hover:text-destructive h-8 w-8 p-0"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={!!approvalItem} onOpenChange={(open) => !open && setApprovalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add to Inventory
            </DialogTitle>
          </DialogHeader>

          {approvalItem && (
            <div className="space-y-4">
              <Card className="p-3 bg-muted/50">
                <div className="text-sm">
                  <p className="font-medium">{approvalItem.item_name}</p>
                  <p className="text-muted-foreground">
                    Qty: {approvalItem.quantity} {approvalItem.unit || 'units'}
                  </p>
                  <p className="text-muted-foreground">
                    From: {approvalItem.document_number}
                  </p>
                </div>
              </Card>

              <div className="space-y-3">
                <div>
                  <Label>Item Name *</Label>
                  <Input 
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <Label>SKU (Optional)</Label>
                  <Input 
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="Enter SKU"
                  />
                </div>

                <div>
                  <Label>Base Unit *</Label>
                  <Input 
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                    placeholder="e.g., kg, liters, units"
                  />
                </div>

                <div>
                  <Label>Location *</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Par Level</Label>
                  <Input 
                    type="number"
                    value={parLevel}
                    onChange={(e) => setParLevel(e.target.value)}
                    placeholder="Minimum stock level"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setApprovalItem(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={handleApprove}
                  disabled={!selectedLocation || !newItemName}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve & Add
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
