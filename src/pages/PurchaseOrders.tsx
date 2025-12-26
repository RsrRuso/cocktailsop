import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BackToProfileDoor } from "@/components/BackToProfileDoor";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePurchaseOrderMaster } from "@/hooks/usePurchaseOrderMaster";
import { usePurchaseOrderAnalytics } from "@/hooks/usePurchaseOrderAnalytics";
import { PurchaseOrderAnalytics } from "@/components/purchase-order/PurchaseOrderAnalytics";
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
  DollarSign, Package, Calendar, Search, Eye, Edit, ClipboardPaste, List, TrendingUp, Users, Coins, HelpCircle, Archive, AlertTriangle, Smartphone, RefreshCw, Film, BarChart3, Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  const location = useLocation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Extract staff mode info - check location.state first, then sessionStorage as fallback
  const getStaffInfo = (): { staffMode: boolean; staffName: string | null; staffWorkspaceId: string | null } => {
    const stateStaffMode = (location.state as any)?.staffMode || false;
    const stateStaffName = (location.state as any)?.staffName || null;
    const stateWorkspaceId = (location.state as any)?.workspaceId || null;
    
    if (stateStaffMode && stateStaffName) {
      return { staffMode: true, staffName: stateStaffName, staffWorkspaceId: stateWorkspaceId };
    }
    
    const savedSession = sessionStorage.getItem("procurement_staff_session");
    if (savedSession) {
      try {
        const { staff, workspace } = JSON.parse(savedSession);
        if (staff?.full_name) {
          return { staffMode: true, staffName: staff.full_name, staffWorkspaceId: workspace?.id || null };
        }
      } catch (e) {
        console.error("Failed to parse procurement session:", e);
      }
    }
    
    return { staffMode: false, staffName: null, staffWorkspaceId: null };
  };
  
  const { staffMode, staffName, staffWorkspaceId } = getStaffInfo();
  
  // Determine if we have valid access (either authenticated user OR valid staff session)
  const hasAccess = !!user || staffMode;
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'overview' | 'orders' | 'archive' | 'discrepancies'>('overview');
  const [pasteContent, setPasteContent] = useState("");
  
  // Use staff workspace if in staffMode, otherwise from localStorage
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => {
    if (staffWorkspaceId) return staffWorkspaceId;
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
    // In staff mode, workspace is locked to their assigned workspace
    if (staffMode) return;
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

  // Effective workspace: staff workspace takes precedence
  const effectiveWorkspaceId = staffMode ? staffWorkspaceId : selectedWorkspaceId;

  // Fetch purchase orders (workspace-based for staff, personal+workspace for logged-in users)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders', user?.id || 'staff', effectiveWorkspaceId],
    queryFn: async () => {
      // In staff mode, always query by workspace. For logged-in users, check workspace or personal.
      let query = supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (effectiveWorkspaceId) {
        query = query.eq('workspace_id', effectiveWorkspaceId);
      } else if (user?.id) {
        query = query.eq('user_id', user.id).is('workspace_id', null);
      } else {
        // No workspace and no user - return empty
        return [];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch receiving records to check which POs have been received + discrepancy status
      let receivedQuery = supabase
        .from('po_received_records')
        .select('document_number, variance_data');

      if (effectiveWorkspaceId) {
        receivedQuery = receivedQuery.eq('workspace_id', effectiveWorkspaceId);
      } else if (user?.id) {
        receivedQuery = receivedQuery.eq('user_id', user.id).is('workspace_id', null);
      }

      const { data: receivedRecords, error: receivedError } = await receivedQuery;
      if (receivedError) throw receivedError;

       const normalizeDocCode = (value: unknown) => {
         return String(value ?? '')
           .normalize('NFKD')
           .replace(/[\u200B-\u200D\uFEFF]/g, '')
           .replace(/[^a-zA-Z0-9]/g, '')
           .toUpperCase();
       };

       const receivedByDoc = new Map<
         string,
         {
           hasDiscrepancy: boolean;
           summary?: { short?: number; over?: number; missing?: number; extra?: number; matched?: number };
         }
       >();
       (receivedRecords || []).forEach((r: any) => {
         const doc = normalizeDocCode(r.document_number);
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
           summary: summary || prev?.summary,
         });
       });

       // Mark POs as received if they have matching receiving records
       return (data || []).map((order) => {
         const doc = normalizeDocCode(order.order_number);
         const rec = doc ? receivedByDoc.get(doc) : undefined;

         return {
           ...order,
           has_received: !!rec,
           has_discrepancy: !!rec?.hasDiscrepancy,
           variance_summary: rec?.summary,
         };
       }) as (PurchaseOrder & { has_received: boolean; has_discrepancy: boolean; variance_summary?: { short?: number; over?: number; missing?: number; extra?: number } })[];
    },
    enabled: hasAccess && (!!effectiveWorkspaceId || !!user?.id)
  });

  // Fetch ALL items for analytics (all orders)
  const { data: allOrderItems } = useQuery({
    queryKey: ['all-purchase-order-items', user?.id || 'staff', effectiveWorkspaceId],
    queryFn: async () => {
      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .in('purchase_order_id', orderIds);
      
      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: hasAccess && !!orders && orders.length > 0
  });

  // Analytics hook
  const analytics = usePurchaseOrderAnalytics(orders, allOrderItems);

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
          submitted_by_name: staffMode && staffName ? staffName : (profile?.full_name || profile?.username || null),
          submitted_by_email: staffMode ? null : (profile?.email || user?.email || null)
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

  // Export order to PDF
  const exportOrderToPDF = (order: PurchaseOrder, items: PurchaseOrderItem[] | undefined) => {
    if (!order || !items) {
      toast.error("No order data to export");
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Dark background
    doc.setFillColor(18, 18, 18);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header with accent
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Purchase Order', 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(order.order_number || 'No Order #', 14, 30);
    doc.text(format(new Date(order.order_date), 'MMMM dd, yyyy'), pageWidth - 14, 30, { align: 'right' });

    // Order details card
    let yPos = 50;
    doc.setFillColor(30, 30, 30);
    doc.roundedRect(10, yPos, pageWidth - 20, 35, 3, 3, 'F');

    doc.setTextColor(147, 197, 253);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER', 16, yPos + 10);
    doc.text('STATUS', 80, yPos + 10);
    doc.text('SUBMITTED BY', 130, yPos + 10);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(order.supplier_name || '-', 16, yPos + 20);
    doc.text(order.status || 'confirmed', 80, yPos + 20);
    doc.text(order.submitted_by_name || order.submitted_by_email || '-', 130, yPos + 20);

    // Items table
    yPos = 95;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Items', 14, yPos);

    const tableData = items.map(item => [
      item.item_code || '-',
      item.item_name,
      item.unit || '-',
      item.quantity.toString(),
      formatCurrency(item.price_per_unit),
      formatCurrency(item.price_total)
    ]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Code', 'Item Name', 'Unit', 'Qty', 'Price', 'Total']],
      body: tableData,
      theme: 'plain',
      styles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [147, 197, 253],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [40, 40, 40],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
      },
      margin: { left: 10, right: 10 },
    });

    // Total
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(pageWidth - 70, finalY + 5, 60, 15, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', pageWidth - 65, finalY + 14);
    doc.text(formatCurrency(Number(order.total_amount)), pageWidth - 15, finalY + 14, { align: 'right' });

    // Notes if available
    if (order.notes) {
      doc.setFillColor(30, 30, 30);
      doc.roundedRect(10, finalY + 30, pageWidth - 20, 20, 3, 3, 'F');
      doc.setTextColor(147, 197, 253);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', 16, finalY + 40);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text(order.notes.substring(0, 100), 16, finalY + 47);
    }

    // Footer
    doc.setFillColor(37, 99, 235);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('SpecVerse • Purchase Order System', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF
    const fileName = `PO_${order.order_number || order.id}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
    toast.success("PDF downloaded!");
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

  // Export receiving report PDF (works for both discrepancy and archived orders)
  const exportDiscrepancyPDF = async (order: PurchaseOrder) => {
    try {
      // Fetch the full variance data from received records
      const { data: receivedRecords } = await supabase
        .from('po_received_records')
        .select('variance_data, received_date, total_value')
        .eq('document_number', order.order_number)
        .order('received_at', { ascending: false })
        .limit(1);

      const record = receivedRecords?.[0] as any;
      const varianceData = record?.variance_data;
      let allItems = varianceData?.items || [];

      // If no variance data, try to use order items as all received
      if (allItems.length === 0 && order.items && order.items.length > 0) {
        allItems = order.items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          unit: item.unit,
          ordered_qty: item.quantity,
          received_qty: item.quantity,
          unit_price: item.price_per_unit,
          status: 'match'
        }));
      }

      // If still no items, show error
      if (allItems.length === 0) {
        toast.error("No receiving data available for this order");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header - Light gray background
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Receiving Report', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Document: ${order.order_number || 'N/A'}    Date: ${format(new Date(), 'MMM d, yyyy, h:mm:ss a')}`, pageWidth / 2, 28, { align: 'center' });
      
      // Determine type from order number
      const orderCode = (order.order_number || '').toUpperCase();
      const orderType = orderCode.startsWith('RQ') ? 'MATERIAL' : orderCode.startsWith('ML') ? 'MARKET' : 'ORDER';
      doc.text(`Type: ${orderType}`, pageWidth / 2, 36, { align: 'center' });
      
      let yPos = 58;
      
      // Summary section
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, yPos, pageWidth - 28, 35, 3, 3, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 20, yPos + 10);
      
      // Separate items and sort by item_code to maintain consistent order
      const receivedItems = allItems
        .filter((item: any) => 
          item.status === 'match' || item.status === 'over' || (item.received_qty || item.receivedQty) > 0
        )
        .sort((a: any, b: any) => {
          const codeA = (a.item_code || a.itemCode || '').toString();
          const codeB = (b.item_code || b.itemCode || '').toString();
          return codeA.localeCompare(codeB, undefined, { numeric: true });
        });
      
      const pendingItems = allItems
        .filter((item: any) => 
          item.status === 'short' || item.status === 'missing' || item.status === 'extra'
        )
        .sort((a: any, b: any) => {
          const codeA = (a.item_code || a.itemCode || '').toString();
          const codeB = (b.item_code || b.itemCode || '').toString();
          return codeA.localeCompare(codeB, undefined, { numeric: true });
        });
      
      const totalPlaced = allItems.length;
      const receivedCount = receivedItems.length;
      const pendingCount = pendingItems.length;
      
      // Calculate totals
      const receivedValue = receivedItems.reduce((sum: number, item: any) => {
        const qty = item.received_qty || item.receivedQty || 0;
        const price = item.unit_price || item.unitPrice || item.price_per_unit || 0;
        return sum + (qty * price);
      }, 0);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      // Left column
      doc.text(`Total Placed: ${totalPlaced}`, 20, yPos + 20);
      doc.text(`Received (Ticked): ${receivedCount}`, 20, yPos + 27);
      doc.text(`Pending (Excluded): ${pendingCount}`, 20, yPos + 34);
      
      // Right column
      const isMarket = orderType === 'MARKET';
      doc.text(`${isMarket ? 'Market' : 'Material'} Items: ${receivedCount}/${totalPlaced} (${formatCurrency(receivedValue)})`, 100, yPos + 20);
      doc.text(`Total Value: ${formatCurrency(receivedValue)}`, 100, yPos + 34);
      
      yPos += 45;
      
      // Received Items Section
      if (receivedItems.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text('Received Items', 14, yPos);
        yPos += 6;
        
        const receivedTable = receivedItems.map((item: any) => {
          const qty = item.received_qty || item.receivedQty || item.quantity || 0;
          const price = item.unit_price || item.unitPrice || item.price_per_unit || 0;
          return [
            item.item_code || item.itemCode || '-',
            item.item_name || item.itemName || 'Unknown',
            `${isMarket ? 'Market' : 'Material'} (${orderCode.substring(0, 2)})`,
            String(qty),
            formatCurrency(price),
            formatCurrency(qty * price)
          ];
        });
        
        autoTable(doc, {
          startY: yPos,
          head: [['Code', 'Item', 'Type', 'Qty', 'Unit Price', 'Total']],
          body: receivedTable,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 22, fontSize: 7 },
            1: { cellWidth: 58, fontSize: 7 },
            2: { cellWidth: 28, fontSize: 7 },
            3: { cellWidth: 15, halign: 'center', fontSize: 7 },
            4: { cellWidth: 28, halign: 'right', fontSize: 7 },
            5: { cellWidth: 28, halign: 'right', fontSize: 7 }
          },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Check if we need a new page
      if (yPos > pageHeight - 60 && pendingItems.length > 0) {
        doc.addPage();
        yPos = 20;
      }
      
      // Excluded Items (Pending) Section
      if (pendingItems.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('Excluded Items (Pending)', 14, yPos);
        yPos += 6;
        
        const pendingTable = pendingItems.map((item: any) => {
          const qty = item.ordered_qty || item.orderedQty || item.quantity || 0;
          const price = item.unit_price || item.unitPrice || item.price_per_unit || 0;
          return [
            item.item_code || item.itemCode || '-',
            item.item_name || item.itemName || 'Unknown',
            `${isMarket ? 'Market' : 'Material'} (${orderCode.substring(0, 2)})`,
            String(qty),
            formatCurrency(qty * price)
          ];
        });
        
        autoTable(doc, {
          startY: yPos,
          head: [['Code', 'Item', 'Type', 'Qty', 'Value']],
          body: pendingTable,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 25, fontSize: 7 },
            1: { cellWidth: 70, fontSize: 7 },
            2: { cellWidth: 30, fontSize: 7 },
            3: { cellWidth: 20, halign: 'center', fontSize: 7 },
            4: { cellWidth: 30, halign: 'right', fontSize: 7 }
          },
          bodyStyles: { fontSize: 7 },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          margin: { left: 14, right: 14 }
        });
      }
      
      // Footer with page numbers on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('Generated by SpecVerse Procurement', 14, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
      
      doc.save(`Receiving-Report-${order.order_number || 'report'}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
      toast.success("Receiving report downloaded");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    }
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

  const displayOrders = viewMode === 'orders' ? activeOrders : viewMode === 'discrepancies' ? discrepancyOrders : archivedOrders;

  const filteredOrders = displayOrders.filter(order => 
    order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // No access - redirect or show message
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center p-6">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Required</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Please sign in or use staff PIN access to view purchase orders.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/auth')} className="flex-1">Sign In</Button>
            <Button variant="outline" onClick={() => navigate('/procurement-pin-access')} className="flex-1">Staff PIN</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - Clean & Mobile Friendly */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {!staffMode && <BackToProfileDoor />}
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => staffMode ? navigate('/procurement-pin-access') : navigate('/ops-tools')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground">Purchase Orders</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {staffMode ? `Staff: ${staffName}` : 'Track and manage your purchases'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
                toast.success("Refreshed");
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/purchase-order-promo')}>
              <Film className="w-4 h-4 text-muted-foreground" />
            </Button>
            {!staffMode && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/procurement-pin-access')}>
                <Smartphone className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowGuide(true)}>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Workspace Selector - Clean compact design */}
        {!staffMode && (
          <ProcurementWorkspaceSelector 
            selectedWorkspaceId={selectedWorkspaceId}
            onSelectWorkspace={handleWorkspaceChange}
          />
        )}

        {/* Currency Selector - Right aligned, compact */}
        <div className="flex justify-end">
          <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as any)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <Coins className="w-3.5 h-3.5 mr-1" />
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
        
        {/* Stats Cards - Clean 2-column grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Card className="p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Spent</p>
                <p className="text-base sm:text-lg font-bold text-foreground">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Orders</p>
                <p className="text-base sm:text-lg font-bold text-foreground">{totalItems}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Navigation Links - Polished buttons */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-card hover:bg-accent/50 transition-all"
            onClick={() => navigate('/po-master-items')}
          >
            <List className="w-5 h-5 text-primary" />
            <span className="text-xs sm:text-sm font-medium">Master Items</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-card hover:bg-accent/50 transition-all"
            onClick={() => navigate('/po-received-items')}
          >
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-xs sm:text-sm font-medium">Received Items</span>
          </Button>
        </div>

        {/* Search & New Order */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="h-10 px-4">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Upload/Paste Actions - Compact horizontal row */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPasteDialog(true)}
            disabled={isUploading}
            className="h-10"
          >
            <ClipboardPaste className="w-4 h-4 mr-2" />
            Paste
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Overview/Orders/Issues/Archive Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'overview' | 'orders' | 'archive' | 'discrepancies')} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs px-1">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-1 text-xs px-1">
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Orders</span> ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="discrepancies" className="flex items-center gap-1 text-xs text-destructive px-1">
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Issues</span> ({discrepancyOrders.length})
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-1 text-xs px-1">
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Archive</span> ({archivedOrders.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Overview - Full Analytics */}
        {viewMode === 'overview' && (
          <PurchaseOrderAnalytics 
            analytics={analytics} 
            formatCurrency={formatCurrency} 
          />
        )}

        {/* Orders List */}
        {viewMode !== 'overview' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {viewMode === 'orders' 
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
                        {/* Reprint Receiving Report for any received order (discrepancy or archived) */}
                        {hasReceived && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportDiscrepancyPDF(order);
                            }}
                            title="Reprint Receiving Report"
                          >
                            <Download className={`w-4 h-4 ${hasDiscrepancy ? 'text-amber-500' : 'text-emerald-500'}`} />
                          </Button>
                        )}
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
        )}
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
          <DialogHeader className="flex flex-row items-center justify-between gap-2">
            <DialogTitle className="text-lg">Order Details</DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportOrderToPDF(selectedOrder!, orderItems || [])}
              className="h-8"
            >
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
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