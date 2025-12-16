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
  DollarSign, Package, Calendar, Search, Eye, Edit, ClipboardPaste, List, TrendingUp, Users, Coins, HelpCircle, Archive, AlertTriangle
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrdersGuide } from "@/components/procurement/PurchaseOrdersGuide";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ProcurementWorkspaceSelector } from "@/components/procurement/ProcurementWorkspaceSelector";

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
  submitted_by_name: string | null;
  submitted_by_email: string | null;
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
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'active' | 'archive' | 'discrepancies'>('active');
  const [pasteContent, setPasteContent] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('po-workspace-id') || null;
  });
  
  // Shared currency state - syncs with POReceivedItems
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD'>(() => {
    const saved = localStorage.getItem('po-currency');
    return (saved as 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD') || 'USD';
  });
  
  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', AUD: 'A$' };
  
  const formatCurrency = (amount: number) => {
    return `${currencySymbols[currency]}${amount.toFixed(2)}`;
  };
  
  const handleCurrencyChange = (newCurrency: 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD') => {
    setCurrency(newCurrency);
    localStorage.setItem('po-currency', newCurrency);
  };
  
  
  // Hook must be called after state declaration
  const { addItemsFromPurchaseOrder } = usePurchaseOrderMaster(selectedWorkspaceId);
  
  const handleWorkspaceChange = (workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    if (workspaceId) {
      localStorage.setItem('po-workspace-id', workspaceId);
    } else {
      localStorage.removeItem('po-workspace-id');
    }
  };
  
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

  // Fetch purchase orders (personal + workspace)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders', user?.id, selectedWorkspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (selectedWorkspaceId) {
        query = query.eq('workspace_id', selectedWorkspaceId);
      } else {
        query = query.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch receiving records to check which POs have been received + discrepancy status
      let receivedQuery = supabase
        .from('po_received_records')
        .select('document_number, variance_data');

      if (selectedWorkspaceId) {
        receivedQuery = receivedQuery.eq('workspace_id', selectedWorkspaceId);
      } else {
        receivedQuery = receivedQuery.eq('user_id', user?.id).is('workspace_id', null);
      }

      const { data: receivedRecords, error: receivedError } = await receivedQuery;
      if (receivedError) throw receivedError;

      const receivedByDoc = new Map<string, { hasDiscrepancy: boolean; summary?: { short?: number; over?: number; missing?: number; extra?: number; matched?: number } }>();
      (receivedRecords || []).forEach((r: any) => {
        const doc = String(r.document_number || '').trim().toUpperCase();
        if (!doc) return;

        const summary = r.variance_data?.summary;
        const hasDiscrepancy = !!summary && (
          (summary.short || 0) > 0 ||
          (summary.over || 0) > 0 ||
          (summary.missing || 0) > 0 ||
          (summary.extra || 0) > 0
        );

        const prev = receivedByDoc.get(doc);
        receivedByDoc.set(doc, { 
          hasDiscrepancy: (prev?.hasDiscrepancy || false) || hasDiscrepancy,
          summary: summary || prev?.summary
        });
      });

      // Mark POs as received if they have matching receiving records
      return (data || []).map((order) => {
        const doc = String(order.order_number || '').trim().toUpperCase();
        const rec = doc ? receivedByDoc.get(doc) : undefined;

        return {
          ...order,
          has_received: !!rec,
          has_discrepancy: !!rec?.hasDiscrepancy,
          variance_summary: rec?.summary,
        };
      }) as (PurchaseOrder & { has_received: boolean; has_discrepancy: boolean; variance_summary?: { short?: number; over?: number; missing?: number; extra?: number } })[];
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

  // Fetch variance data for selected order
  const { data: varianceData } = useQuery({
    queryKey: ['po-variance-data', selectedOrder?.order_number],
    queryFn: async () => {
      if (!selectedOrder?.order_number) return null;
      const docNum = selectedOrder.order_number.trim().toUpperCase();
      
      let query = supabase
        .from('po_received_records')
        .select('variance_data')
        .ilike('document_number', docNum);
      
      if (selectedWorkspaceId) {
        query = query.eq('workspace_id', selectedWorkspaceId);
      } else {
        query = query.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data?.variance_data as { items?: Array<{ item_name: string; item_code?: string; ordered_qty: number; received_qty: number; status: string }>, summary?: any } | null;
    },
    enabled: !!selectedOrder?.order_number && (selectedOrder as any).has_discrepancy
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const totalAmount = newItems.reduce((sum, item) => sum + item.price_total, 0);
      
      // Check for duplicate document code if order_number is provided
      if (newOrder.order_number?.trim()) {
        let duplicateQuery = supabase
          .from('purchase_orders')
          .select('id, order_number')
          .eq('order_number', newOrder.order_number.trim());
        
        if (selectedWorkspaceId) {
          duplicateQuery = duplicateQuery.eq('workspace_id', selectedWorkspaceId);
        } else {
          duplicateQuery = duplicateQuery.eq('user_id', user?.id).is('workspace_id', null);
        }
        
        const { data: existingPO } = await duplicateQuery;
        
        if (existingPO && existingPO.length > 0) {
          throw new Error(`Purchase Order with document code "${newOrder.order_number}" already exists. Duplicate codes are not allowed.`);
        }
      }
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          user_id: user?.id,
          workspace_id: selectedWorkspaceId || null,
          supplier_name: newOrder.supplier_name || null,
          order_number: newOrder.order_number || null,
          order_date: newOrder.order_date,
          notes: newOrder.notes || null,
          total_amount: totalAmount,
          status: 'confirmed',
          submitted_by_name: profile?.full_name || profile?.username || null,
          submitted_by_email: profile?.email || user?.email || null
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
    
    // Reset file input immediately to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setIsUploading(true);
    toast.info("Processing document...");
    
    try {
      // Read file content
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let parsePayload: any = {};
          const fileName = file.name.toLowerCase();
          
          // Handle PDF files
          if (file.type === 'application/pdf') {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            parsePayload.pdfBase64 = btoa(binary);
            toast.info("Parsing PDF with AI...");
          }
          // Handle image files (PNG, JPG, JPEG)
          else if (file.type.startsWith('image/') || fileName.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            parsePayload.imageBase64 = btoa(binary);
            parsePayload.imageMimeType = file.type || 'image/png';
            toast.info("Parsing image with AI...");
          }
          // Handle Excel files
          else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
                   file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                   file.type === 'application/vnd.ms-excel') {
            const { read, utils } = await import('xlsx');
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const workbook = read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = utils.sheet_to_json(sheet, { header: 1 });
            // Convert to text format for AI parsing
            parsePayload.content = jsonData.map((row: any) => row.join('\t')).join('\n');
            toast.info("Parsing Excel with AI...");
          }
          // Handle text/CSV files
          else {
            parsePayload.content = e.target?.result as string;
            toast.info("Parsing document with AI...");
          }
          
          // Send to AI parser
          const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
            body: parsePayload
          });
          
          if (error || !data?.success) {
            console.error('Parse error:', error || data?.error);
            toast.error(error?.message || data?.error || "Failed to parse document");
            setIsUploading(false);
            return;
          }
          
          const parsed = data.data as ParsedOrderData;
          
          if (parsed) {
            // Check for duplicate document code
            if (parsed.doc_no?.trim()) {
              let duplicateQuery = supabase
                .from('purchase_orders')
                .select('id, order_number')
                .eq('order_number', parsed.doc_no.trim());
              
              if (selectedWorkspaceId) {
                duplicateQuery = duplicateQuery.eq('workspace_id', selectedWorkspaceId);
              } else {
                duplicateQuery = duplicateQuery.eq('user_id', user?.id).is('workspace_id', null);
              }
              
              const { data: existingPO } = await duplicateQuery;
              
              if (existingPO && existingPO.length > 0) {
                toast.error(
                  `Upload rejected: Document code "${parsed.doc_no}" already exists. Duplicate uploads are not allowed.`,
                  { duration: 8000 }
                );
                setIsUploading(false);
                return;
              }
            }
            
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
            toast.success(`Parsed ${parsed.items?.length || 0} items (Total: ${currencySymbols[currency]}${parsed.total_amount.toFixed(2)})`);
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
      
      // Read as ArrayBuffer for binary files (PDF, images, Excel), as text for others
      const fileName = file.name.toLowerCase();
      if (file.type === 'application/pdf' || 
          file.type.startsWith('image/') || 
          fileName.match(/\.(png|jpg|jpeg|gif|webp|xlsx|xls)$/)) {
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
        toast.success(`Parsed ${parsed.items?.length || 0} items (Total: ${currencySymbols[currency]}${parsed.total_amount.toFixed(2)})`);
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

  // Separate active (pending) vs discrepancies vs archived (fully received) orders
  const activeOrders = orders?.filter(order => {
    const hasReceived = (order as any).has_received;
    // Active = not yet received
    return !hasReceived;
  }) || [];

  const discrepancyOrders = orders?.filter(order => {
    const hasReceived = (order as any).has_received;
    const hasDiscrepancy = (order as any).has_discrepancy;
    // Discrepancies = received but has issues
    return hasReceived && hasDiscrepancy;
  }) || [];

  const archivedOrders = orders?.filter(order => {
    const hasReceived = (order as any).has_received;
    const hasDiscrepancy = (order as any).has_discrepancy;
    // Archived = received without issues
    return hasReceived && !hasDiscrepancy;
  }) || [];

  const displayOrders = viewMode === 'active' ? activeOrders : viewMode === 'discrepancies' ? discrepancyOrders : archivedOrders;

  const filteredOrders = displayOrders.filter(order => 
    order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ops-tools')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Purchase Orders</h1>
              <p className="text-xs text-muted-foreground">Track and manage your purchases</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowGuide(true)}>
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Workspace Selector */}
        <ProcurementWorkspaceSelector 
          selectedWorkspaceId={selectedWorkspaceId}
          onSelectWorkspace={handleWorkspaceChange}
        />

        {/* Currency Selector + Stats Cards */}
        <div className="flex items-center justify-end mb-2">
          <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as any)}>
            <SelectTrigger className="w-28 h-9">
              <Coins className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">$ USD</SelectItem>
              <SelectItem value="EUR">€ EUR</SelectItem>
              <SelectItem value="GBP">£ GBP</SelectItem>
              <SelectItem value="AED">د.إ AED</SelectItem>
              <SelectItem value="AUD">A$ AUD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalSpent)}</p>
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

        {/* Active/Discrepancies/Archive Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'archive' | 'discrepancies')} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="discrepancies" className="flex items-center gap-2 text-xs text-destructive">
              <Package className="w-3.5 h-3.5" />
              Issues ({discrepancyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-2 text-xs">
              <Archive className="w-3.5 h-3.5" />
              Archive ({archivedOrders.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {viewMode === 'active' 
                ? 'No active orders. Create your first purchase order!'
                : viewMode === 'discrepancies'
                ? 'No discrepancy orders. Orders with issues will appear here.'
                : 'No archived orders. Fully received orders will appear here.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders?.map((order) => {
                const hasReceived = (order as any).has_received;
                const hasDiscrepancy = (order as any).has_discrepancy;

                const statusLabel = hasReceived
                  ? (hasDiscrepancy ? 'Discrepancy' : 'Received')
                  : 'Pending';

                const statusVariant = hasReceived
                  ? (hasDiscrepancy ? 'destructive' : 'success')
                  : 'warning';

                const orderCode = order.order_number?.toUpperCase() || '';
                const isMaterial = orderCode.startsWith('RQ');
                const isMarketList = orderCode.startsWith('ML');
                const categoryLabel = isMaterial ? 'Material' : isMarketList ? 'Market List' : null;

                return (
                  <Card 
                    key={order.id} 
                    className={`p-4 border-l-4 ${
                      !hasReceived
                        ? 'border-l-amber-500 bg-amber-500/5'
                        : hasDiscrepancy
                          ? 'border-l-destructive bg-destructive/5'
                          : 'border-l-emerald-500 bg-emerald-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {order.supplier_name || order.order_number || 'Unnamed Order'}
                          </span>
                          <Badge variant={statusVariant as any}>
                            {statusLabel}
                          </Badge>
                          {categoryLabel && (
                            <Badge 
                              variant="outline" 
                              className={isMaterial ? 'border-purple-500 text-purple-500' : 'border-blue-500 text-blue-500'}
                            >
                              {categoryLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          {order.order_number && (
                            <span className="flex items-center gap-1 font-mono text-primary/80">
                              <FileText className="w-3 h-3" />
                              {order.order_number}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(order.order_date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            {formatCurrency(Number(order.total_amount))}
                          </span>
                          {order.created_at && (
                            <span className="flex items-center gap-1 text-muted-foreground/70">
                              @ {format(new Date(order.created_at), 'h:mm a')}
                            </span>
                          )}
                          {(order.submitted_by_name || order.submitted_by_email) && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Users className="w-3 h-3" />
                              Submitted by: {order.submitted_by_name || order.submitted_by_email}
                            </span>
                          )}
                        </div>
                        {/* Show variance summary for discrepancy orders */}
                        {hasDiscrepancy && (order as any).variance_summary && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                            {(order as any).variance_summary.missing > 0 && (
                              <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive rounded font-medium">
                                {(order as any).variance_summary.missing} Missing (0 qty)
                              </span>
                            )}
                            {(order as any).variance_summary.short > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-600 rounded font-medium">
                                {(order as any).variance_summary.short} Short
                              </span>
                            )}
                            {(order as any).variance_summary.over > 0 && (
                              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded font-medium">
                                {(order as any).variance_summary.over} Over
                              </span>
                            )}
                          </div>
                        )}
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          // Reset form state when dialog closes to prevent issues on next upload
          setNewOrder({
            supplier_name: "",
            order_number: "",
            order_date: format(new Date(), "yyyy-MM-dd"),
            notes: ""
          });
          setNewItems([{ item_code: "", item_name: "", unit: "", quantity: 0, price_per_unit: 0, price_total: 0 }]);
        }
      }}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">New Purchase Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Supplier & Order Number - Stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Supplier Name</Label>
                <Input
                  value={newOrder.supplier_name}
                  onChange={(e) => setNewOrder({ ...newOrder, supplier_name: e.target.value })}
                  placeholder="Supplier name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Order Number</Label>
                <Input
                  value={newOrder.order_number}
                  onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
                  placeholder="PO-001"
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Order Date</Label>
              <Input
                type="date"
                value={newOrder.order_date}
                onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
                className="h-9"
              />
            </div>

            {/* Items - Mobile-friendly cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Items ({newItems.length})</Label>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {newItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-2 bg-card space-y-2">
                    {/* Row 1: Code & Name */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Code</span>
                        <Input
                          value={item.item_code}
                          onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                          placeholder="Code"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="col-span-2 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Name</span>
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          placeholder="Item name"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    
                    {/* Row 2: Unit, Qty, Price, Value, Delete */}
                    <div className="flex items-end gap-1.5">
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Unit</span>
                        <Input
                          value={item.unit || ''}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          placeholder="KG"
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Qty</span>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Price</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price_per_unit || ''}
                          onChange={(e) => handleItemChange(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Value</span>
                        <div className="h-7 flex items-center text-xs font-medium text-primary">
                          {item.price_total.toFixed(2)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-1 border-t">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Grand Total: </span>
                  <span className="text-base font-bold text-primary">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
                className="text-sm"
              />
            </div>

            <Button 
              className="w-full h-10" 
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
        <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Order Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-3">
              {/* Header info - responsive grid */}
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Supplier:</span>
                  <p className="font-medium truncate">{selectedOrder.supplier_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Order #:</span>
                  <p className="font-medium truncate">{selectedOrder.order_number || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Date:</span>
                  <p className="font-medium">{format(new Date(selectedOrder.order_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] sm:text-xs">Status:</span>
                  <Badge variant="default" className="text-[10px] sm:text-xs">{selectedOrder.status}</Badge>
                </div>
              </div>

              {/* Show discrepancy alert if applicable */}
              {(selectedOrder as any).has_discrepancy && varianceData?.summary && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 sm:p-3">
                  <div className="flex items-center gap-2 text-destructive font-medium text-xs sm:text-sm mb-1">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    Receiving Discrepancy Detected
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs">
                    {varianceData.summary.missing > 0 && (
                      <span className="text-destructive font-medium">Missing: {varianceData.summary.missing}</span>
                    )}
                    {varianceData.summary.short > 0 && (
                      <span className="text-amber-600">Short: {varianceData.summary.short}</span>
                    )}
                    {varianceData.summary.over > 0 && (
                      <span className="text-blue-500">Over: {varianceData.summary.over}</span>
                    )}
                    {varianceData.summary.extra > 0 && (
                      <span className="text-purple-500">Extra: {varianceData.summary.extra}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile-friendly items display */}
              <div className="border rounded-lg overflow-hidden">
                {/* Desktop table - hidden on mobile */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Item</TableHead>
                        <TableHead className="text-xs text-center">Ordered</TableHead>
                        {(selectedOrder as any).has_discrepancy && <TableHead className="text-xs text-center">Received</TableHead>}
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems?.map((item) => {
                        const varItem = varianceData?.items?.find(
                          (v) => v.item_code === item.item_code || v.item_name?.toLowerCase() === item.item_name?.toLowerCase()
                        );
                        const isMissing = varItem?.status === 'missing' || varItem?.received_qty === 0;
                        const isShort = varItem?.status === 'short';
                        const isOver = varItem?.status === 'over';
                        
                        return (
                          <TableRow 
                            key={item.id}
                            className={isMissing ? 'bg-destructive/10' : isShort ? 'bg-amber-500/10' : isOver ? 'bg-blue-500/10' : ''}
                          >
                            <TableCell className="text-xs">{item.item_code || '-'}</TableCell>
                            <TableCell className={`text-xs ${isMissing ? 'text-destructive font-medium' : ''}`}>
                              {item.item_name}
                              {isMissing && <span className="block text-destructive text-[10px]">(NOT PROVIDED)</span>}
                            </TableCell>
                            <TableCell className="text-xs text-center">{item.quantity}</TableCell>
                            {(selectedOrder as any).has_discrepancy && (
                              <TableCell className={`text-xs text-center font-medium ${isMissing ? 'text-destructive' : isShort ? 'text-amber-600' : isOver ? 'text-blue-500' : 'text-emerald-600'}`}>
                                {isMissing ? 0 : (varItem?.received_qty ?? item.quantity)}
                              </TableCell>
                            )}
                            <TableCell className={`text-xs text-right font-medium ${isMissing ? 'text-destructive line-through' : ''}`}>
                              {isMissing ? formatCurrency(0) : formatCurrency(Number(item.price_total))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile card layout - shown only on mobile */}
                <div className="sm:hidden divide-y divide-border">
                  {orderItems?.map((item) => {
                    const varItem = varianceData?.items?.find(
                      (v) => v.item_code === item.item_code || v.item_name?.toLowerCase() === item.item_name?.toLowerCase()
                    );
                    const isMissing = varItem?.status === 'missing' || varItem?.received_qty === 0;
                    const isShort = varItem?.status === 'short';
                    const isOver = varItem?.status === 'over';
                    
                    return (
                      <div 
                        key={item.id}
                        className={`p-2.5 ${isMissing ? 'bg-destructive/10' : isShort ? 'bg-amber-500/10' : isOver ? 'bg-blue-500/10' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isMissing ? 'text-destructive' : ''}`}>
                              {item.item_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{item.item_code || '-'}</p>
                            {isMissing && (
                              <span className="inline-block text-[10px] text-destructive font-medium mt-0.5">(NOT PROVIDED)</span>
                            )}
                          </div>
                          <div className={`text-right ${isMissing ? 'text-destructive line-through' : 'text-primary'}`}>
                            <p className="text-xs font-bold">{isMissing ? formatCurrency(0) : formatCurrency(Number(item.price_total))}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-[10px]">
                          <span className="text-muted-foreground">
                            Ordered: <span className="text-foreground font-medium">{item.quantity}</span>
                          </span>
                          {(selectedOrder as any).has_discrepancy && (
                            <span className="text-muted-foreground">
                              Received: <span className={`font-medium ${isMissing ? 'text-destructive' : isShort ? 'text-amber-600' : isOver ? 'text-blue-500' : 'text-emerald-600'}`}>
                                {isMissing ? 0 : (varItem?.received_qty ?? item.quantity)}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calculate adjusted total for discrepancy orders */}
              {(() => {
                const orderedTotal = Number(selectedOrder.total_amount);
                let receivedTotal = orderedTotal;
                
                if ((selectedOrder as any).has_discrepancy && varianceData?.items && orderItems) {
                  receivedTotal = orderItems.reduce((sum, item) => {
                    const varItem = varianceData.items?.find(
                      (v) => v.item_code === item.item_code || v.item_name?.toLowerCase() === item.item_name?.toLowerCase()
                    );
                    if (varItem) {
                      const receivedQty = isMissingItem(varItem) ? 0 : (varItem.received_qty ?? item.quantity);
                      return sum + (receivedQty * Number(item.price_per_unit));
                    }
                    return sum + Number(item.price_total);
                  }, 0);
                }
                
                // Helper to check if item is missing
                function isMissingItem(varItem: any) {
                  return varItem?.status === 'missing' || varItem?.received_qty === 0;
                }
                
                const difference = orderedTotal - receivedTotal;
                const hasDiscrepancy = (selectedOrder as any).has_discrepancy;
                
                return (
                  <div className="border-t pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
                    {hasDiscrepancy && difference > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Ordered Total:</span>
                        <span className="line-through text-muted-foreground">
                          {formatCurrency(orderedTotal)}
                        </span>
                      </div>
                    )}
                    {hasDiscrepancy && difference > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-destructive">Deduction:</span>
                        <span className="text-destructive font-medium">
                          -{formatCurrency(difference)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs sm:text-sm">
                        {hasDiscrepancy && difference > 0 ? 'Actual Received:' : 'Total:'}
                      </span>
                      <span className={`text-base sm:text-xl font-bold ${hasDiscrepancy && difference > 0 ? 'text-emerald-600' : 'text-primary'}`}>
                        {formatCurrency(receivedTotal)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {selectedOrder.notes && (
                <div>
                  <span className="text-xs sm:text-sm text-muted-foreground">Notes:</span>
                  <p className="text-xs sm:text-sm">{selectedOrder.notes}</p>
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

      {/* Guide Dialog */}
      <PurchaseOrdersGuide open={showGuide} onOpenChange={setShowGuide} />

    </div>
  );
};

export default PurchaseOrders;