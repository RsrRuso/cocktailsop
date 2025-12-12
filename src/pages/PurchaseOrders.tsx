import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseOrderMaster } from "@/hooks/usePurchaseOrderMaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, Upload, Camera, Plus, Trash2, FileText, 
  DollarSign, Package, Calendar, Search, Eye, Edit, ClipboardPaste, List, TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface PurchaseOrderItem {
  id?: string;
  item_code: string;
  item_name: string;
  unit?: string;
  delivery_date?: string | null;
  quantity: number;
  price_per_unit: number;
  price_total: number;
}

interface PurchaseOrder {
  id: string;
  order_number: string | null;
  supplier_name: string | null;
  order_date: string;
  total_amount: number;
  notes: string | null;
  document_url: string | null;
  status: string;
  created_at: string;
  items?: PurchaseOrderItem[];
}

interface ParsedOrderData {
  doc_no: string | null;
  doc_date: string | null;
  location: string | null;
  items: {
    item_code: string;
    item_name: string;
    delivery_date: string | null;
    unit: string;
    quantity: number;
    price_per_unit: number;
    price_total: number;
  }[];
  total_amount: number;
}

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addItemsFromPurchaseOrder } = usePurchaseOrderMaster();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  
  // New order form state
  const [newOrder, setNewOrder] = useState({
    supplier_name: "",
    order_number: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    notes: ""
  });
  const [newItems, setNewItems] = useState<PurchaseOrderItem[]>([
    { item_code: "", item_name: "", unit: "", quantity: 0, price_per_unit: 0, price_total: 0 }
  ]);

  // Fetch purchase orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!user?.id
  });

  // Fetch items for selected order
  const { data: orderItems } = useQuery({
    queryKey: ['purchase-order-items', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', selectedOrder.id);
      
      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!selectedOrder?.id
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = newItems.reduce((sum, item) => sum + item.price_total, 0);
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          user_id: user?.id,
          supplier_name: newOrder.supplier_name || null,
          order_number: newOrder.order_number || null,
          order_date: newOrder.order_date,
          notes: newOrder.notes || null,
          total_amount: totalAmount,
          status: 'confirmed'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create items
      const itemsToInsert = newItems
        .filter(item => item.item_name.trim())
        .map(item => ({
          purchase_order_id: orderData.id,
          item_code: item.item_code || null,
          item_name: item.item_name,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          price_total: item.price_total
        }));
      
      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
      }
      
      return { orderData, items: itemsToInsert };
    },
    onSuccess: async (result) => {
      toast.success("Purchase order created");
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      
      // Auto-add items to master list
      if (result.items && result.items.length > 0) {
        try {
          await addItemsFromPurchaseOrder(result.orderData.id, result.items);
        } catch (e) {
          console.error('Failed to add to master list:', e);
        }
      }
      
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create order: " + error.message);
    }
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    }
  });

  const resetForm = () => {
    setNewOrder({
      supplier_name: "",
      order_number: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
    setNewItems([{ item_code: "", item_name: "", unit: "", quantity: 0, price_per_unit: 0, price_total: 0 }]);
  };

  const handleAddItem = () => {
    setNewItems([...newItems, { item_code: "", item_name: "", unit: "", quantity: 0, price_per_unit: 0, price_total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (newItems.length > 1) {
      setNewItems(newItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total
    if (field === 'quantity' || field === 'price_per_unit') {
      updated[index].price_total = updated[index].quantity * updated[index].price_per_unit;
    }
    
    setNewItems(updated);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    toast.info("Processing document...");
    
    try {
      // Read file content
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let textContent = '';
          
          if (file.type === 'application/pdf') {
            // For PDF, read as base64 and send to AI parser
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const pdfBase64 = btoa(binary);
            
            toast.info("Parsing PDF with AI...");
            
            const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
              body: { pdfBase64 }
            });
            
            if (error || !data?.success) {
              console.error('Parse error:', error || data?.error);
              toast.error(error?.message || data?.error || "Failed to parse PDF");
              setIsUploading(false);
              return;
            }
            
            const parsed = data.data as ParsedOrderData;
            
            if (parsed) {
              setNewOrder({
                supplier_name: parsed.location || '',
                order_number: parsed.doc_no || '',
                order_date: parsed.doc_date 
                  ? format(new Date(parsed.doc_date.split('/').reverse().join('-')), 'yyyy-MM-dd')
                  : format(new Date(), 'yyyy-MM-dd'),
                notes: ''
              });
              
              if (parsed.items && parsed.items.length > 0) {
                setNewItems(parsed.items.map(item => ({
                  item_code: item.item_code,
                  item_name: item.item_name,
                  unit: item.unit,
                  delivery_date: item.delivery_date,
                  quantity: item.quantity,
                  price_per_unit: item.price_per_unit,
                  price_total: item.price_total
                })));
              }
              
              setShowCreateDialog(true);
              toast.success(`Parsed ${parsed.items?.length || 0} items (Total: AED ${parsed.total_amount.toFixed(2)})`);
            }
            setIsUploading(false);
            return;
          } else if (file.type.includes('text') || file.name.endsWith('.csv')) {
            textContent = e.target?.result as string;
          }
          
          if (textContent) {
            // Parse the content
            const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
              body: { content: textContent }
            });
            
            if (error || !data?.success) {
              toast.error(error?.message || data?.error || "Failed to parse document");
              setIsUploading(false);
              return;
            }
            
            const parsed = data.data as ParsedOrderData;
            
            // Populate form with parsed data
            if (parsed) {
              setNewOrder({
                supplier_name: parsed.location || '',
                order_number: parsed.doc_no || '',
                order_date: parsed.doc_date 
                  ? format(new Date(parsed.doc_date.split('/').reverse().join('-')), 'yyyy-MM-dd')
                  : format(new Date(), 'yyyy-MM-dd'),
                notes: ''
              });
              
              if (parsed.items && parsed.items.length > 0) {
                setNewItems(parsed.items.map(item => ({
                  item_code: item.item_code,
                  item_name: item.item_name,
                  unit: item.unit,
                  delivery_date: item.delivery_date,
                  quantity: item.quantity,
                  price_per_unit: item.price_per_unit,
                  price_total: item.price_total
                })));
              }
              
              setShowCreateDialog(true);
              toast.success(`Parsed ${parsed.items?.length || 0} items (Total: AED ${parsed.total_amount.toFixed(2)})`);
            }
          }
        } catch (err) {
          console.error('Parse error:', err);
          toast.error("Failed to parse document");
        }
        setIsUploading(false);
      };
      
      reader.onerror = () => {
        toast.error("Failed to read file");
        setIsUploading(false);
      };
      
      // Read as ArrayBuffer for PDFs, as text for others
      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error("Failed to process document");
      setIsUploading(false);
    }
  };

  // Parse markdown/text content directly (for pasted content)
  const parseMarketListContent = async (content: string) => {
    setIsUploading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
        body: { content }
      });
      
      if (error || !data?.success) {
        toast.error(error?.message || data?.error || "Failed to parse content");
        setIsUploading(false);
        return;
      }
      
      const parsed = data.data as ParsedOrderData;
      
      if (parsed) {
        setNewOrder({
          supplier_name: parsed.location || '',
          order_number: parsed.doc_no || '',
          order_date: parsed.doc_date 
            ? format(new Date(parsed.doc_date.split('/').reverse().join('-')), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd'),
          notes: ''
        });
        
        if (parsed.items && parsed.items.length > 0) {
          setNewItems(parsed.items.map(item => ({
            item_code: item.item_code,
            item_name: item.item_name,
            unit: item.unit,
            delivery_date: item.delivery_date,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            price_total: item.price_total
          })));
        }
        
        setShowCreateDialog(true);
        toast.success(`Parsed ${parsed.items?.length || 0} items (Total: AED ${parsed.total_amount.toFixed(2)})`);
      }
    } catch (err) {
      console.error('Parse error:', err);
      toast.error("Failed to parse content");
    }
    
    setIsUploading(false);
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowViewDialog(true);
  };

  // Calculate totals
  const totalSpent = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
  const totalItems = orders?.length || 0;
  const grandTotal = newItems.reduce((sum, item) => sum + item.price_total, 0);

  const filteredOrders = orders?.filter(order => 
    order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ops-tools')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Purchase Orders</h1>
            <p className="text-xs text-muted-foreground">Track and manage your purchases</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-lg font-bold text-foreground">${totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold text-foreground">{totalItems}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col items-center gap-1"
            onClick={() => navigate('/po-master-items')}
          >
            <List className="w-5 h-5 text-primary" />
            <span className="text-sm">Master Items</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col items-center gap-1"
            onClick={() => navigate('/po-received-items')}
          >
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm">Received Items</span>
          </Button>
        </div>

        {/* Search & Actions */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Upload Section */}
        <Card className="p-4 border-dashed border-2 border-muted">
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-2 flex-wrap">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex-1 min-w-[120px]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPasteDialog(true)}
                disabled={isUploading}
                className="flex-1 min-w-[120px]"
              >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Paste
              </Button>
              <Button variant="outline" disabled className="flex-1 min-w-[120px]">
                <Camera className="w-4 h-4 mr-2" />
                Scan
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload invoice/PO to auto-parse items (PDF, Image, Excel)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </Card>

        {/* Orders List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders yet. Create your first purchase order!
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders?.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground">
                          {order.supplier_name || order.order_number || 'Unnamed Order'}
                        </span>
                        <Badge variant={order.status === 'confirmed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(order.order_date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${Number(order.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewOrder(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteOrderMutation.mutate(order.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Supplier Name</Label>
                <Input
                  value={newOrder.supplier_name}
                  onChange={(e) => setNewOrder({ ...newOrder, supplier_name: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input
                  value={newOrder.order_number}
                  onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
                  placeholder="PO-001"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input
                type="date"
                value={newOrder.order_date}
                onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
              />
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20 min-w-[80px]">Code</TableHead>
                      <TableHead className="min-w-[120px]">Name</TableHead>
                      <TableHead className="w-14 min-w-[56px]">Unit</TableHead>
                      <TableHead className="w-14 min-w-[56px]">Qty</TableHead>
                      <TableHead className="w-16 min-w-[64px]">Price</TableHead>
                      <TableHead className="w-18 min-w-[72px]">Value</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="p-1">
                          <Input
                            value={item.item_code}
                            onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                            placeholder="Code"
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={item.item_name}
                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                            placeholder="Item name"
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            value={item.unit || ''}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="KG"
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            value={item.quantity || ''}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price_per_unit || ''}
                            onChange={(e) => handleItemChange(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1 text-xs font-medium text-foreground">
                          {item.price_total.toFixed(2)}
                        </TableCell>
                        <TableCell className="p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex justify-end">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Grand Total: </span>
                  <span className="text-lg font-bold text-primary">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Supplier:</span>
                  <p className="font-medium">{selectedOrder.supplier_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Order #:</span>
                  <p className="font-medium">{selectedOrder.order_number || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{format(new Date(selectedOrder.order_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default">{selectedOrder.status}</Badge>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price/pc</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs">{item.item_code || '-'}</TableCell>
                        <TableCell className="text-xs">{item.item_name}</TableCell>
                        <TableCell className="text-xs">{item.quantity}</TableCell>
                        <TableCell className="text-xs">${Number(item.price_per_unit).toFixed(2)}</TableCell>
                        <TableCell className="text-xs font-medium">${Number(item.price_total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end border-t pt-3">
                <div>
                  <span className="text-muted-foreground">Total: </span>
                  <span className="text-xl font-bold text-primary">
                    ${Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Paste Content Dialog */}
      <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste Market List Content</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your Market List table content (Item Code, Item Name, Delivery, Unit, Qty, Price, Value)
            </p>
            
            <Textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste your Market List content here...

Example format:
| 15100042 | Puree Yuzu Ponthier 1Kg | 09/12/2025 | KGS | 5.00 | 122.30 | 611.50 |"
              rows={10}
              className="font-mono text-xs"
            />
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setPasteContent("");
                  setShowPasteDialog(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (pasteContent.trim()) {
                    parseMarketListContent(pasteContent);
                    setShowPasteDialog(false);
                    setPasteContent("");
                  } else {
                    toast.error("Please paste content to parse");
                  }
                }}
                disabled={isUploading || !pasteContent.trim()}
                className="flex-1"
              >
                {isUploading ? "Parsing..." : "Parse Content"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;