import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrderMaster } from "@/hooks/usePurchaseOrderMaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Coins, Search, TrendingUp, Upload, FileText, Download, CheckCircle, XCircle, AlertTriangle, Calendar, Eye, Trash2, BarChart3, History, TrendingDown, ChevronDown, HelpCircle, Smartphone, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseOrdersGuide } from "@/components/procurement/PurchaseOrdersGuide";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProcurementWorkspaceSelector } from "@/components/procurement/ProcurementWorkspaceSelector";
import { 
  EnhancedReceivingDialog, 
  EnhancedReceivingData, 
  ParsedReceivingItem,
  detectDocumentType,
  normalizeItemCode 
} from "@/components/procurement/EnhancedReceivingDialog";

interface VarianceItem {
  item_code?: string;
  item_name: string;
  unit?: string;
  ordered_qty: number;
  received_qty: number;
  variance: number;
  variance_pct: number;
  status: 'match' | 'short' | 'over' | 'missing' | 'extra';
  ordered_price?: number;
  received_price?: number;
}

interface VarianceReport {
  order_number?: string;
  order_date?: string;
  supplier?: string;
  items: VarianceItem[];
  summary: {
    total_ordered: number;
    total_received: number;
    total_variance: number;
    matched: number;
    short: number;
    over: number;
    missing: number;
    extra: number;
  };
}

interface RecentReceived {
  id: string;
  user_id: string;
  supplier_name: string | null;
  document_number: string | null;
  received_date: string;
  total_items: number;
  total_quantity: number;
  total_value: number;
  status: string;
  variance_data: any;
  created_at: string;
  received_by_name: string | null;
  received_by_email: string | null;
}

interface PriceChange {
  item_name: string;
  previous_price: number;
  current_price: number;
  change_amount: number;
  change_pct: number;
  date: string;
}

const POReceivedItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Extract staff mode info from location.state (passed from ProcurementPinAccess)
  const staffMode = (location.state as any)?.staffMode || false;
  const staffName = (location.state as any)?.staffName || null;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'all' | 'summary'>('summary');
  const [isUploading, setIsUploading] = useState(false);
  const [varianceReport, setVarianceReport] = useState<VarianceReport | null>(null);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'summary' | 'forecast' | 'prices'>('recent');
  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD'>(() => {
    const saved = localStorage.getItem('po-currency');
    return (saved as 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD') || 'USD';
  });
  const [showRecordContent, setShowRecordContent] = useState<RecentReceived | null>(null);
  const [showEnhancedReceiving, setShowEnhancedReceiving] = useState(false);
  const [enhancedReceivingData, setEnhancedReceivingData] = useState<EnhancedReceivingData | null>(null);
  const [pendingMatchedOrder, setPendingMatchedOrder] = useState<any>(null);
  const [pendingOrderItems, setPendingOrderItems] = useState<any[]>([]);
  const [showPendingPOsDialog, setShowPendingPOsDialog] = useState(false);
  const [showCompletedPOsDialog, setShowCompletedPOsDialog] = useState(false);
  const [selectedPOContent, setSelectedPOContent] = useState<any>(null);
  

  // Workspace state - declare before hook usage
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('po-workspace-id') || null;
  });
  
  // Hook must be called after state declaration
  const { receivedItems, receivedSummary, receivedTotals, isLoadingReceived, addReceivedItem } = usePurchaseOrderMaster(selectedWorkspaceId);
  
  const handleWorkspaceChange = (workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    if (workspaceId) {
      localStorage.setItem('po-workspace-id', workspaceId);
    } else {
      localStorage.removeItem('po-workspace-id');
    }
  };

  // Save currency preference when changed
  const handleCurrencyChange = (newCurrency: 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD') => {
    setCurrency(newCurrency);
    localStorage.setItem('po-currency', newCurrency);
  };

  // Currency symbols only - no conversion
  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', AUD: 'A$' };
  
  const formatCurrency = (amount: number) => {
    return `${currencySymbols[currency]}${amount.toFixed(2)}`;
  };

  // Fetch recent received records - workspace aware
  const { data: recentReceived, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['po-recent-received', user?.id, selectedWorkspaceId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('po_received_records')
        .select('*')
        .order('received_date', { ascending: false })
        .limit(50);
      
      if (selectedWorkspaceId) {
        query = query.eq('workspace_id', selectedWorkspaceId);
      } else {
        query = query.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RecentReceived[];
    },
    enabled: !!user?.id
  });

  // Fetch all purchase orders to compare with received - workspace aware
  const { data: allPurchaseOrders } = useQuery({
    queryKey: ['po-all-orders', user?.id, selectedWorkspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('id, order_number, supplier_name, order_date, status')
        .order('created_at', { ascending: false });
      
      if (selectedWorkspaceId) {
        query = query.eq('workspace_id', selectedWorkspaceId);
      } else {
        query = query.eq('user_id', user?.id).is('workspace_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Calculate PO completion stats by matching doc codes
  const poCompletionStats = (() => {
    if (!allPurchaseOrders || !recentReceived) return { total: 0, completed: 0, pending: 0, completedCodes: [] as string[], pendingPOs: [] as any[], completedPOs: [] as any[] };
    
    const receivedDocCodes = new Map<string, RecentReceived>();
    recentReceived
      .filter(r => r.document_number)
      .forEach(r => receivedDocCodes.set(normalizeItemCode(r.document_number || ''), r));
    
    let completed = 0;
    let pending = 0;
    const completedCodes: string[] = [];
    const pendingPOs: any[] = [];
    const completedPOs: any[] = [];
    
    allPurchaseOrders.forEach((po: any) => {
      const poCode = normalizeItemCode(po.order_number || '');
      const receivedRecord = receivedDocCodes.get(poCode);
      if (receivedRecord) {
        completed++;
        completedCodes.push(po.order_number);
        completedPOs.push({ ...po, receivedRecord });
      } else {
        pending++;
        pendingPOs.push(po);
      }
    });
    
    return {
      total: allPurchaseOrders.length,
      completed,
      pending,
      completedCodes,
      pendingPOs,
      completedPOs
    };
  })();

  // Calculate total from recent received records for accurate display
  const calculatedTotalValue = recentReceived?.reduce((sum, record) => sum + (record.total_value || 0), 0) || 0;

  // Fetch price history for change tracking
  const { data: priceHistory } = useQuery({
    queryKey: ['po-price-history', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('po_price_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('changed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as PriceChange[];
    },
    enabled: !!user?.id
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  const filteredItems = viewMode === 'summary' 
    ? receivedSummary.filter(item => 
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : receivedItems?.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset file input immediately to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setIsUploading(true);
    toast.info("Processing receiving document...");
    
    try {
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
          }
          // Handle text/CSV files
          else {
            parsePayload.content = e.target?.result as string;
          }
          
          // Parse the receiving document
          const { data, error } = await supabase.functions.invoke('parse-purchase-order', {
            body: parsePayload
          });
          
          if (error || !data?.success) {
            toast.error(error?.message || data?.error || "Failed to parse file");
            setIsUploading(false);
            return;
          }
          
          const parsed = data.data;
          if (!parsed?.items || parsed.items.length === 0) {
            toast.error("No items found in receiving document");
            setIsUploading(false);
            return;
          }
          
          // Extract document code from parsed data (ML for market, RQ for materials)
          const documentCode = parsed.doc_no?.trim();
          const normalizedDocCode = documentCode ? normalizeItemCode(documentCode) : null;
          
          // Validate document code exists
          if (!documentCode) {
            toast.error("Upload rejected: No document code (ML/RQ) found in the file. Please ensure the document has a valid code.", { duration: 6000 });
            setIsUploading(false);
            return;
          }
          
          // Check for duplicate document code in receiving records
          let duplicateQuery = supabase
            .from('po_received_records')
            .select('id, document_number, received_date')
            .eq('document_number', documentCode);
          
          if (selectedWorkspaceId) {
            duplicateQuery = duplicateQuery.eq('workspace_id', selectedWorkspaceId);
          } else {
            duplicateQuery = duplicateQuery.eq('user_id', user?.id).is('workspace_id', null);
          }
          
          const { data: existingReceiving } = await duplicateQuery;
          
          if (existingReceiving && existingReceiving.length > 0) {
            const existingDate = existingReceiving[0].received_date 
              ? format(new Date(existingReceiving[0].received_date), 'PPP')
              : 'unknown date';
            toast.error(
              `Upload rejected: Document "${documentCode}" was already received on ${existingDate}. Duplicate uploads are not allowed.`,
              { duration: 8000 }
            );
            setIsUploading(false);
            return;
          }
          
          // Check if document code exists in any Purchase Order
          let poQuery = supabase
            .from('purchase_orders')
            .select('id, order_number, supplier_name, order_date, user_id, workspace_id');
          
          if (selectedWorkspaceId) {
            poQuery = poQuery.eq('workspace_id', selectedWorkspaceId);
          } else {
            poQuery = poQuery.eq('user_id', user?.id).is('workspace_id', null);
          }
          
          const { data: existingPOs } = await poQuery;
          
          // Find matching PO by document code
          const matchedOrder = (existingPOs || []).find((po: any) => {
            const poCode = normalizeItemCode(po.order_number || '');
            return poCode === normalizedDocCode || 
                   po.order_number?.toLowerCase().includes(documentCode.toLowerCase()) ||
                   documentCode.toLowerCase().includes(po.order_number?.toLowerCase() || '');
          });
          
          // REJECT if document code not found in any PO
          if (!matchedOrder) {
            toast.error(
              `Upload rejected: Document code "${documentCode}" not found in any Purchase Order. Please create a PO with this document number first.`,
              { duration: 8000 }
            );
            setIsUploading(false);
            return;
          }
          
          // Document code matched - process items
          const docType = detectDocumentType(documentCode);

          // Fetch ordered items for variance check (this is what makes Discrepancy accurate)
          const { data: poItems, error: poItemsError } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', matchedOrder.id);

          if (poItemsError) throw poItemsError;
          setPendingOrderItems(poItems || []);

          const poItemsByCode = new Map<string, any>();
          const poItemsByName = new Map<string, any>();
          (poItems || []).forEach((poi: any) => {
            if (poi.item_code) {
              poItemsByCode.set(normalizeItemCode(poi.item_code), poi);
            }
            if (poi.item_name) {
              poItemsByName.set(String(poi.item_name).trim().toLowerCase(), poi);
            }
          });

          let marketCount = 0;
          let materialCount = 0;

          const enhancedItems: ParsedReceivingItem[] = parsed.items.map((item: any) => {
            const itemCode = item.item_code || '';
            const normalizedItemCode = itemCode ? normalizeItemCode(itemCode) : '';
            const normalizedItemName = String(item.item_name || item.name || '').trim().toLowerCase();

            const matchedPOItem = itemCode
              ? poItemsByCode.get(normalizedItemCode)
              : poItemsByName.get(normalizedItemName);

            const matchedInPO = !!matchedPOItem;

            let itemDocType = detectDocumentType(itemCode);
            if (itemDocType === 'unknown' && (docType === 'market' || docType === 'material')) {
              itemDocType = docType;
            }

            if (itemDocType === 'market') marketCount++;
            if (itemDocType === 'material') materialCount++;

            return {
              item_code: itemCode,
              item_name: item.item_name || item.name || '',
              unit: item.unit,
              quantity: item.quantity || 0,
              price_per_unit: item.price_per_unit || 0,
              price_total: (item.quantity || 0) * (item.price_per_unit || 0),
              delivery_date: item.delivery_date,
              isReceived: true, // Auto-tick all items by default - user unticks what wasn't received
              documentType: itemDocType,
              matchedInPO,
              matchedPOItem: matchedPOItem || undefined
            };
          });
          
          // Determine overall document type
          const overallDocType: 'market' | 'material' | 'mixed' = 
            docType !== 'unknown' ? docType :
            marketCount > 0 && materialCount > 0 ? 'mixed' :
            marketCount > 0 ? 'market' :
            materialCount > 0 ? 'material' : 'mixed';
          
          // Document code verified - store matched order and show enhanced dialog for confirmation
          setPendingMatchedOrder(matchedOrder);
          setEnhancedReceivingData({
            doc_no: documentCode,
            doc_date: parsed.doc_date,
            location: matchedOrder?.supplier_name || parsed.location,
            items: enhancedItems,
            documentType: overallDocType
          });
          setShowEnhancedReceiving(true);
          
          toast.success(`Document "${documentCode}" verified in PO. Review ${enhancedItems.length} items and confirm to save.`);
        } catch (err: any) {
          toast.error("Failed to process: " + err.message);
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
    } catch (error: any) {
      toast.error("Failed to upload: " + error.message);
      setIsUploading(false);
    }
  };

  // Handle confirmed save from enhanced receiving dialog
  const handleConfirmSave = async (receivedItemsList: ParsedReceivingItem[]) => {
    if (!user) return;
    
    const receivedDate = new Date().toISOString().split('T')[0];
    const docNumber = enhancedReceivingData?.doc_no || `RCV-${Date.now()}`;
    
    // Calculate totals from confirmed items only
    const totalQty = receivedItemsList.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = receivedItemsList.reduce((sum, i) => sum + i.price_total, 0);
    
    // Generate variance report vs the original PO items
    const orderedItems = pendingOrderItems || [];
    
    const report = generateVarianceReport(
      orderedItems,
      receivedItemsList,
      pendingMatchedOrder?.order_number,
      pendingMatchedOrder?.order_date,
      pendingMatchedOrder?.supplier_name || enhancedReceivingData?.location
    );
    
    // Save the receiving record
    const { data: savedRecord, error: recordError } = await (supabase as any)
      .from('po_received_records')
      .insert({
        user_id: user.id,
        workspace_id: selectedWorkspaceId || null,
        supplier_name: pendingMatchedOrder?.supplier_name || enhancedReceivingData?.location || 'Unknown Supplier',
        document_number: docNumber,
        received_date: receivedDate,
        total_items: receivedItemsList.length,
        total_quantity: totalQty,
        total_value: totalValue,
        status: 'received',
        variance_data: report,
        received_by_name: staffMode && staffName ? staffName : (profile?.full_name || profile?.username || null),
        received_by_email: staffMode ? null : (profile?.email || user?.email || null)
      })
      .select('id')
      .single();
    
    if (recordError) throw recordError;
    const recordId = savedRecord?.id;
    
    // Save individual items
    for (const item of receivedItemsList) {
      if (item.quantity > 0) {
        await addReceivedItem({
          purchase_order_id: pendingMatchedOrder?.id || undefined,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.price_per_unit,
          total_price: item.price_total,
          received_date: receivedDate,
          document_number: docNumber,
          record_id: recordId
        });
      }
    }
    
    // Refresh data and show variance report
    queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
    queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
    
    setVarianceReport(report);
    setShowVarianceDialog(true);
    
    // Clear pending state
    setPendingMatchedOrder(null);
    setPendingOrderItems([]);
    setEnhancedReceivingData(null);
  };

  const generateVarianceReport = (
    orderedItems: any[],
    receivedItems: any[],
    orderNumber?: string,
    orderDate?: string,
    supplier?: string
  ): VarianceReport => {
    const varianceItems: VarianceItem[] = [];
    const orderedMap = new Map<string, any>();
    const receivedMap = new Map<string, any>();
    
    // Normalize item code - remove decimals, spaces, leading zeros for comparison
    const normalizeCode = (code: string): string => {
      return String(code).replace(/[.\s]/g, '').replace(/^0+/, '').trim().toLowerCase();
    };
    
    // Build maps for comparison (prioritize ML/item code, fall back to name only when no code)
    orderedItems.forEach(item => {
      const key = item.item_code
        ? `code:${normalizeCode(item.item_code)}`
        : `name:${String(item.item_name).trim().toLowerCase()}`;
      orderedMap.set(key, item);
    });
    
    receivedItems.forEach(item => {
      const key = item.item_code
        ? `code:${normalizeCode(item.item_code)}`
        : `name:${String(item.item_name).trim().toLowerCase()}`;
      receivedMap.set(key, item);
    });
    
    // Check ordered items against received
    orderedMap.forEach((ordered, key) => {
      const received = receivedMap.get(key);
      const orderedQty = ordered.quantity || 0;
      const receivedQty = received?.quantity || 0;
      const variance = receivedQty - orderedQty;
      const variancePct = orderedQty > 0 ? (variance / orderedQty) * 100 : 0;
      
      let status: VarianceItem['status'] = 'match';
      if (!received) {
        status = 'missing';
      } else if (variance < 0) {
        status = 'short';
      } else if (variance > 0) {
        status = 'over';
      }
      
      varianceItems.push({
        item_code: ordered.item_code,
        item_name: ordered.item_name,
        unit: ordered.unit,
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        variance,
        variance_pct: variancePct,
        status,
        ordered_price: ordered.price_per_unit,
        received_price: received?.price_per_unit
      });
    });
    
    // Check for extra items (received but not ordered)
    receivedMap.forEach((received, key) => {
      if (!orderedMap.has(key)) {
        varianceItems.push({
          item_code: received.item_code,
          item_name: received.item_name,
          unit: received.unit,
          ordered_qty: 0,
          received_qty: received.quantity || 0,
          variance: received.quantity || 0,
          variance_pct: 100,
          status: 'extra',
          received_price: received.price_per_unit
        });
      }
    });
    
    // Calculate summary
    const summary = {
      total_ordered: varianceItems.reduce((sum, i) => sum + i.ordered_qty, 0),
      total_received: varianceItems.reduce((sum, i) => sum + i.received_qty, 0),
      total_variance: varianceItems.reduce((sum, i) => sum + i.variance, 0),
      matched: varianceItems.filter(i => i.status === 'match').length,
      short: varianceItems.filter(i => i.status === 'short').length,
      over: varianceItems.filter(i => i.status === 'over').length,
      missing: varianceItems.filter(i => i.status === 'missing').length,
      extra: varianceItems.filter(i => i.status === 'extra').length
    };
    
    return {
      order_number: orderNumber,
      order_date: orderDate,
      supplier,
      items: varianceItems.sort((a, b) => {
        const statusOrder = { missing: 0, short: 1, over: 2, extra: 3, match: 4 };
        return statusOrder[a.status] - statusOrder[b.status];
      }),
      summary
    };
  };

  const downloadVarianceReport = () => {
    if (!varianceReport) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Receiving Variance Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
    
    // Order Info
    let yPos = 40;
    doc.setFontSize(12);
    if (varianceReport.supplier) {
      doc.text(`Supplier: ${varianceReport.supplier}`, 14, yPos);
      yPos += 7;
    }
    if (varianceReport.order_number) {
      doc.text(`Order #: ${varianceReport.order_number}`, 14, yPos);
      yPos += 7;
    }
    if (varianceReport.order_date) {
      doc.text(`Order Date: ${varianceReport.order_date}`, 14, yPos);
      yPos += 7;
    }
    
    // Summary Cards
    yPos += 5;
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
    
    doc.setFontSize(10);
    const summaryY = yPos + 10;
    doc.text(`Total Ordered: ${varianceReport.summary.total_ordered}`, 20, summaryY);
    doc.text(`Total Received: ${varianceReport.summary.total_received}`, 70, summaryY);
    doc.text(`Variance: ${varianceReport.summary.total_variance > 0 ? '+' : ''}${varianceReport.summary.total_variance}`, 120, summaryY);
    
    const statsY = summaryY + 10;
    doc.setTextColor(34, 197, 94);
    doc.text(`✓ Match: ${varianceReport.summary.matched}`, 20, statsY);
    doc.setTextColor(239, 68, 68);
    doc.text(`↓ Short: ${varianceReport.summary.short}`, 55, statsY);
    doc.setTextColor(249, 115, 22);
    doc.text(`↑ Over: ${varianceReport.summary.over}`, 90, statsY);
    doc.setTextColor(239, 68, 68);
    doc.text(`✗ Missing: ${varianceReport.summary.missing}`, 125, statsY);
    doc.setTextColor(168, 85, 247);
    doc.text(`+ Extra: ${varianceReport.summary.extra}`, 165, statsY);
    doc.setTextColor(0, 0, 0);
    
    yPos += 35;
    
    // Items Table
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Code', 'Unit', 'Ordered', 'Received', 'Variance', 'Status']],
      body: varianceReport.items.map(item => [
        item.item_name,
        item.item_code || '-',
        item.unit || '-',
        item.ordered_qty.toString(),
        item.received_qty.toString(),
        `${item.variance > 0 ? '+' : ''}${item.variance} (${item.variance_pct.toFixed(1)}%)`,
        item.status.toUpperCase()
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 50 },
        5: { halign: 'right' },
        6: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const status = data.cell.raw?.toString().toLowerCase();
          if (status === 'match') data.cell.styles.textColor = [34, 197, 94];
          else if (status === 'short' || status === 'missing') data.cell.styles.textColor = [239, 68, 68];
          else if (status === 'over') data.cell.styles.textColor = [249, 115, 22];
          else if (status === 'extra') data.cell.styles.textColor = [168, 85, 247];
        }
      }
    });
    
    doc.save(`variance-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success("Report downloaded");
  };

  // Download variance-only report (discrepancies only)
  const downloadDiscrepancyReport = () => {
    if (!varianceReport) return;
    
    const discrepancies = varianceReport.items.filter(item => item.status !== 'match');
    if (discrepancies.length === 0) {
      toast.info("No discrepancies found - all items matched!");
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Discrepancy Report', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Only showing items with missing/extra/short/over quantities`, pageWidth / 2, 35, { align: 'center' });
    
    let yPos = 45;
    if (varianceReport.supplier) {
      doc.text(`Supplier: ${varianceReport.supplier}`, 14, yPos);
      yPos += 7;
    }
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Ordered', 'Received', 'Variance', 'Status']],
      body: discrepancies.map(item => [
        item.item_name,
        item.ordered_qty.toString(),
        item.received_qty.toString(),
        `${item.variance > 0 ? '+' : ''}${item.variance}`,
        item.status.toUpperCase()
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68] },
    });
    
    doc.save(`discrepancy-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success("Discrepancy report downloaded");
  };

  // Download price change report
  const downloadPriceChangeReport = () => {
    if (!priceHistory || priceHistory.length === 0) {
      toast.info("No price changes recorded yet");
      return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Price Change Report', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
    
    autoTable(doc, {
      startY: 40,
      head: [['Item', 'Previous Price', 'Current Price', 'Change', 'Change %', 'Date']],
      body: priceHistory.map((item: any) => [
        item.item_name,
        `${currencySymbols[currency]}${(item.previous_price || 0).toFixed(2)}`,
        `${currencySymbols[currency]}${(item.current_price || 0).toFixed(2)}`,
        `${item.change_amount > 0 ? '+' : ''}${currencySymbols[currency]}${(item.change_amount || 0).toFixed(2)}`,
        `${item.change_pct > 0 ? '+' : ''}${(item.change_pct || 0).toFixed(1)}%`,
        format(new Date(item.changed_at || item.date), 'PP')
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [168, 85, 247] },
    });
    
    doc.save(`price-change-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success("Price change report downloaded");
  };

  // Download par stock forecast report
  const downloadParStockReport = () => {
    if (!receivedItems || receivedItems.length === 0) {
      toast.info("No received data for forecasting");
      return;
    }
    
    // Calculate weekly and monthly averages
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const weeklyItems = receivedItems.filter(item => {
      const date = new Date(item.received_date);
      return date >= weekStart && date <= weekEnd;
    });
    
    const monthlyItems = receivedItems.filter(item => {
      const date = new Date(item.received_date);
      return date >= monthStart && date <= monthEnd;
    });
    
    // Group by item name for forecasting
    const itemForecast = receivedSummary.map((item: any) => {
      const weeklyQty = weeklyItems
        .filter(wi => wi.item_name.toLowerCase() === item.item_name.toLowerCase())
        .reduce((sum, wi) => sum + (wi.quantity || 0), 0);
      
      const monthlyQty = monthlyItems
        .filter(mi => mi.item_name.toLowerCase() === item.item_name.toLowerCase())
        .reduce((sum, mi) => sum + (mi.quantity || 0), 0);
      
      return {
        item_name: item.item_name,
        total_qty: item.total_qty,
        weekly_qty: weeklyQty,
        monthly_qty: monthlyQty,
        weekly_par: Math.ceil(weeklyQty * 1.2), // 20% buffer
        monthly_par: Math.ceil(monthlyQty * 1.2),
        avg_price: item.avg_price,
        weekly_cost: weeklyQty * item.avg_price,
        monthly_cost: monthlyQty * item.avg_price
      };
    });
    
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Par Stock Forecast Report', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
    
    // Summary
    const totalWeeklyQty = itemForecast.reduce((sum, i) => sum + i.weekly_qty, 0);
    const totalMonthlyQty = itemForecast.reduce((sum, i) => sum + i.monthly_qty, 0);
    const totalWeeklyCost = itemForecast.reduce((sum, i) => sum + i.weekly_cost, 0);
    const totalMonthlyCost = itemForecast.reduce((sum, i) => sum + i.monthly_cost, 0);
    
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, 35, pageWidth - 28, 20, 3, 3, 'F');
    doc.text(`Weekly: ${totalWeeklyQty.toFixed(0)} units | ${currencySymbols[currency]}${totalWeeklyCost.toFixed(2)}`, 20, 47);
    doc.text(`Monthly: ${totalMonthlyQty.toFixed(0)} units | ${currencySymbols[currency]}${totalMonthlyCost.toFixed(2)}`, 120, 47);
    doc.text(`Weekly Par (20% buffer): ${Math.ceil(totalWeeklyQty * 1.2)} units`, 220, 47);
    
    autoTable(doc, {
      startY: 60,
      head: [['Item', 'Total Qty', 'Weekly Qty', 'Weekly Par', 'Weekly Cost', 'Monthly Qty', 'Monthly Par', 'Monthly Cost']],
      body: itemForecast.map(item => [
        item.item_name,
        item.total_qty.toFixed(0),
        item.weekly_qty.toFixed(0),
        item.weekly_par.toString(),
        `${currencySymbols[currency]}${item.weekly_cost.toFixed(2)}`,
        item.monthly_qty.toFixed(0),
        item.monthly_par.toString(),
        `${currencySymbols[currency]}${item.monthly_cost.toFixed(2)}`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });
    
    doc.save(`par-stock-forecast-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success("Par stock forecast report downloaded");
  };

  // Calculate forecast data
  const calculateForecast = () => {
    if (!receivedItems || receivedItems.length === 0) return null;
    
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    
    const weeklyItems = receivedItems.filter(item => new Date(item.received_date) >= weekStart);
    const monthlyItems = receivedItems.filter(item => new Date(item.received_date) >= monthStart);
    
    return {
      weeklyQty: weeklyItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
      weeklyValue: weeklyItems.reduce((sum, i) => sum + (i.total_price || 0), 0),
      monthlyQty: monthlyItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
      monthlyValue: monthlyItems.reduce((sum, i) => sum + (i.total_price || 0), 0),
      weeklyPar: Math.ceil(weeklyItems.reduce((sum, i) => sum + (i.quantity || 0), 0) * 1.2),
      monthlyPar: Math.ceil(monthlyItems.reduce((sum, i) => sum + (i.quantity || 0), 0) * 1.2)
    };
  };
  
  const forecast = calculateForecast();

  const deleteReceivedRecord = async (id: string) => {
    try {
      // Delete items linked to this record by record_id first
      await (supabase as any)
        .from('purchase_order_received_items')
        .delete()
        .eq('record_id', id);
      
      // Delete the received record (CASCADE will also handle items with record_id)
      await (supabase as any)
        .from('po_received_records')
        .delete()
        .eq('id', id);
      
      // Invalidate all related queries so PO status updates correctly
      queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
      queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); // Update PO status
      toast.success("Record deleted - PO status updated");
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const getStatusIcon = (status: VarianceItem['status']) => {
    switch (status) {
      case 'match': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'short': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'over': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'missing': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'extra': return <Package className="h-4 w-4 text-purple-500" />;
    }
  };

  const getStatusBadge = (status: VarianceItem['status']) => {
    const variants: Record<string, string> = {
      match: 'bg-green-500/10 text-green-500 border-green-500/20',
      short: 'bg-red-500/10 text-red-500 border-red-500/20',
      over: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      missing: 'bg-red-500/10 text-red-500 border-red-500/20',
      extra: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    };
    return variants[status];
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Received Items</h1>
              <p className="text-sm text-muted-foreground">Compare received goods with purchase orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/procurement-pin-access')}
              title="Staff PIN Access"
            >
              <Smartphone className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowGuide(true)}>
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className={`h-4 w-4 mr-2 ${isUploading ? 'animate-pulse' : ''}`} />
              {isUploading ? 'Parsing...' : 'Receive'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Workspace Selector */}
        <ProcurementWorkspaceSelector 
          selectedWorkspaceId={selectedWorkspaceId}
          onSelectWorkspace={handleWorkspaceChange}
        />

        {/* Field Guidelines */}
        <Card className="p-3 bg-muted/30 border-dashed">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Receiving Guidelines
            </h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">ML Code</Badge>
                <span>Unique item identifier used to match received items with purchase orders</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">Qty</Badge>
                <span>Quantity received - compared against ordered quantity to detect variances</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">Price</Badge>
                <span>Unit price at receiving - tracked for price change analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">Status</Badge>
                <span>Match (exact), Short (less), Over (more), Missing (not received), Extra (not ordered)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Currency Selector + Summary Cards */}
        <div className="flex items-center justify-end mb-2">
          <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as any)}>
            <SelectTrigger className="w-24 h-8">
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
        
        {/* PO Completion Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total POs</p>
                <p className="text-lg font-bold">{poCompletionStats.total}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => poCompletionStats.completed > 0 && setShowCompletedPOsDialog(true)}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold text-green-500">{poCompletionStats.completed}</p>
              </div>
            </div>
          </Card>
          <Card 
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => poCompletionStats.pending > 0 && setShowPendingPOsDialog(true)}
          >
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-amber-500">{poCompletionStats.pending}</p>
              </div>
            </div>
          </Card>
        </div>
        
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Coins className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold">{formatCurrency(calculatedTotalValue)}</p>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recent" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="forecast" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="prices" className="text-xs">
              <TrendingDown className="h-3 w-3 mr-1" />
              Prices
            </TabsTrigger>
          </TabsList>

          {/* Recent Received Tab */}
          <TabsContent value="recent" className="mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Received</h2>
            
            {isLoadingRecent ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentReceived && recentReceived.length > 0 ? (
              <div className="space-y-2">
                {recentReceived.map((record) => (
                  <Card key={record.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground">
                            {record.supplier_name || record.document_number || 'Unnamed Delivery'}
                          </span>
                          <Badge 
                            variant={record.status === 'received' ? 'default' : 'secondary'}
                            className={record.status === 'received' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}
                          >
                            {record.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          {record.document_number && (
                            <span className="flex items-center gap-1 font-mono text-primary/80">
                              <FileText className="w-3 h-3" />
                              {record.document_number}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(record.received_date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            {formatCurrency(Number(record.total_value || 0))}
                          </span>
                          {record.created_at && (
                            <span className="flex items-center gap-1 text-muted-foreground/70">
                              @ {format(new Date(record.created_at), 'h:mm a')}
                            </span>
                          )}
                          {(record.received_by_name || record.received_by_email) && (
                            <span className="flex items-center gap-1 text-green-500">
                              <Package className="w-3 h-3" />
                              Received by: {record.received_by_name || record.received_by_email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowRecordContent(record)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteReceivedRecord(record.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No received records yet. Upload a receiving document to get started!
              </div>
            )}
          </TabsContent>

          {/* Summary Tab - Overall Aggregated Report */}
          <TabsContent value="summary" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Overall Received Report</h3>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  if (!receivedSummary || receivedSummary.length === 0) {
                    toast.info("No received data to export");
                    return;
                  }
                  const doc = new jsPDF();
                  const pageWidth = doc.internal.pageSize.getWidth();
                  
                  doc.setFontSize(20);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Overall Received Items Report', pageWidth / 2, 20, { align: 'center' });
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 28, { align: 'center' });
                  
                  // Summary totals
                  const totalQty = receivedSummary.reduce((sum, i) => sum + (i.total_qty || 0), 0);
                  const totalValue = receivedSummary.reduce((sum, i) => sum + (i.total_price || 0), 0);
                  
                  doc.setFillColor(240, 240, 240);
                  doc.roundedRect(14, 35, pageWidth - 28, 15, 3, 3, 'F');
                  doc.text(`Total Items: ${receivedSummary.length} | Total Qty: ${totalQty.toFixed(0)} | Total Value: ${currencySymbols[currency]}${totalValue.toFixed(2)}`, 20, 45);
                  
                  autoTable(doc, {
                    startY: 55,
                    head: [['Item Name', 'Times Received', 'Total Qty', 'Avg Price', 'Total Value']],
                    body: receivedSummary.map((item: any) => [
                      item.item_name,
                      item.count?.toString() || '1',
                      item.total_qty?.toFixed(0) || '0',
                      `${currencySymbols[currency]}${(item.avg_price || 0).toFixed(2)}`,
                      `${currencySymbols[currency]}${(item.total_price || 0).toFixed(2)}`
                    ]),
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [59, 130, 246] },
                  });
                  
                  doc.save(`overall-received-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                  toast.success("Report downloaded");
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Aggregated Summary Table */}
            <Card>
              {isLoadingReceived ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : receivedSummary && receivedSummary.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Times</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Avg Price</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedSummary
                      .filter((item: any) => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-sm">
                          {item.item_name}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.count || 1}x
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {item.total_qty?.toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.avg_price || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(item.total_price || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">
                        {receivedSummary.reduce((sum: number, i: any) => sum + (i.count || 1), 0)}x
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        {receivedSummary.reduce((sum: number, i: any) => sum + (i.total_qty || 0), 0).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(receivedSummary.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No received items yet</p>
                  <p className="text-xs mt-1">Upload receiving documents to see aggregated totals</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Par Stock Forecast</h3>
              <Button size="sm" variant="outline" onClick={downloadParStockReport}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {forecast ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 border-blue-500/20 bg-blue-500/5">
                    <h4 className="text-sm font-medium text-blue-500 mb-2">Weekly</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-bold">{forecast.weeklyQty.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-bold">{formatCurrency(forecast.weeklyValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-1 mt-1">
                        <span className="text-muted-foreground">Par Stock:</span>
                        <span className="font-bold text-blue-500">{forecast.weeklyPar}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-green-500/20 bg-green-500/5">
                    <h4 className="text-sm font-medium text-green-500 mb-2">Monthly</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-bold">{forecast.monthlyQty.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-bold">{formatCurrency(forecast.monthlyValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-1 mt-1">
                        <span className="text-muted-foreground">Par Stock:</span>
                        <span className="font-bold text-green-500">{forecast.monthlyPar}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Par stock includes a 20% safety buffer based on your receiving patterns.
                    Download the full report for detailed item-by-item forecasting.
                  </p>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No data for forecasting</p>
                <p className="text-xs mt-1">Start receiving items to generate forecasts</p>
              </Card>
            )}
          </TabsContent>

          {/* Price Changes Tab */}
          <TabsContent value="prices" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Price Changes</h3>
              <Button size="sm" variant="outline" onClick={downloadPriceChangeReport}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {priceHistory && priceHistory.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Previous</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(item.previous_price || 0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.current_price || 0)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          (item.change_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {(item.change_amount || 0) > 0 ? '+' : ''}{formatCurrency(item.change_amount || 0)}
                          <span className="text-xs ml-1">
                            ({(item.change_pct || 0) > 0 ? '+' : ''}{(item.change_pct || 0).toFixed(1)}%)
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No price changes recorded</p>
                <p className="text-xs mt-1">Price changes are tracked automatically when updating master items</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Variance Analysis Dialog - Mobile Friendly */}
      <Dialog open={showVarianceDialog} onOpenChange={(open) => {
        setShowVarianceDialog(open);
        if (!open) {
          // Reset variance report when dialog closes to prevent stale state on next upload
          setVarianceReport(null);
          setSelectedOrderId(null);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Variance Analysis
            </DialogTitle>
          </DialogHeader>

          {varianceReport && (
            <div className="space-y-3 sm:space-y-4">
              {/* Order Info - Mobile Stacked */}
              <Card className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
                  <div className="flex justify-between sm:block">
                    <p className="text-muted-foreground text-xs">Supplier</p>
                    <p className="font-medium text-sm">{varianceReport.supplier || 'Unknown'}</p>
                  </div>
                  <div className="flex justify-between sm:block">
                    <p className="text-muted-foreground text-xs">Order #</p>
                    <p className="font-medium text-sm">{varianceReport.order_number || 'Not matched'}</p>
                  </div>
                  <div className="flex justify-between sm:block">
                    <p className="text-muted-foreground text-xs">Order Date</p>
                    <p className="font-medium text-sm">{varianceReport.order_date || '-'}</p>
                  </div>
                </div>
              </Card>

              {/* Summary Stats - Scrollable on Mobile */}
              <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:overflow-visible">
                <Card className="p-2 sm:p-3 text-center flex-shrink-0 w-16 sm:w-auto">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-lg sm:text-2xl font-bold text-green-500">{varianceReport.summary.matched}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Match</p>
                </Card>
                <Card className="p-2 sm:p-3 text-center flex-shrink-0 w-16 sm:w-auto">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-lg sm:text-2xl font-bold text-red-500">{varianceReport.summary.short}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Short</p>
                </Card>
                <Card className="p-2 sm:p-3 text-center flex-shrink-0 w-16 sm:w-auto">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg sm:text-2xl font-bold text-orange-500">{varianceReport.summary.over}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Over</p>
                </Card>
                <Card className="p-2 sm:p-3 text-center flex-shrink-0 w-16 sm:w-auto">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-lg sm:text-2xl font-bold text-red-500">{varianceReport.summary.missing}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Missing</p>
                </Card>
                <Card className="p-2 sm:p-3 text-center flex-shrink-0 w-16 sm:w-auto">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-lg sm:text-2xl font-bold text-purple-500">{varianceReport.summary.extra}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Extra</p>
                </Card>
              </div>

              {/* Variance Items - Card Layout for Mobile */}
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {varianceReport.items.map((item, idx) => (
                  <Card key={idx} className={`p-3 border-l-4 ${
                    item.status === 'match' ? 'border-l-green-500' :
                    item.status === 'short' || item.status === 'missing' ? 'border-l-red-500' :
                    item.status === 'over' ? 'border-l-orange-500' :
                    'border-l-purple-500'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(item.status)}
                          <Badge className={`${getStatusBadge(item.status)} text-[10px] px-1.5`}>
                            {item.status}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{item.item_name}</p>
                        {item.item_code && (
                          <p className="text-xs text-muted-foreground">{item.item_code}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Ord</p>
                            <p className="font-medium">{item.ordered_qty}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rcv</p>
                            <p className="font-medium">{item.received_qty}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Var</p>
                            <p className={`font-bold ${
                              item.variance > 0 ? 'text-orange-500' : 
                              item.variance < 0 ? 'text-red-500' : 
                              'text-green-500'
                            }`}>
                              {item.variance > 0 ? '+' : ''}{item.variance}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Actions - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" size="sm" onClick={downloadDiscrepancyReport} className="text-xs">
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Discrepancies
                </Button>
                <Button variant="outline" size="sm" onClick={downloadVarianceReport} className="text-xs">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Full Report
                </Button>
                <Button size="sm" onClick={() => setShowVarianceDialog(false)} className="text-xs">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Content Dialog - Shows items from the file */}
      <Dialog open={!!showRecordContent} onOpenChange={() => setShowRecordContent(null)}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Received Items
            </DialogTitle>
          </DialogHeader>

          {showRecordContent && (
            <div className="space-y-3">
              {/* Record Info */}
              <Card className="p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="font-medium">{showRecordContent.supplier_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(showRecordContent.received_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Document #</p>
                    <p className="font-medium">{showRecordContent.document_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="font-medium text-green-600">{formatCurrency(Number(showRecordContent.total_value || 0))}</p>
                  </div>
                </div>
              </Card>

              {/* Items from variance_data */}
              {showRecordContent.variance_data?.items && showRecordContent.variance_data.items.length > 0 ? (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  <p className="text-sm font-semibold text-muted-foreground">Items ({showRecordContent.variance_data.items.length})</p>
                  {showRecordContent.variance_data.items.map((item: any, idx: number) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.item_name}</p>
                          {item.item_code && (
                            <p className="text-xs text-muted-foreground">{item.item_code}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{item.received_qty || item.quantity || 0}</p>
                          <p className="text-xs text-muted-foreground">qty</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No item details available</p>
                </div>
              )}

              <Button className="w-full" onClick={() => setShowRecordContent(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Receiving Dialog with checkboxes and validation */}
      <EnhancedReceivingDialog
        open={showEnhancedReceiving}
        onOpenChange={(open) => {
          setShowEnhancedReceiving(open);
          if (!open) {
            setEnhancedReceivingData(null);
            setPendingMatchedOrder(null);
          }
        }}
        receivingData={enhancedReceivingData}
        onConfirmSave={handleConfirmSave}
        currencySymbol={currencySymbols[currency]}
      />

      {/* Pending POs Dialog */}
      <Dialog open={showPendingPOsDialog} onOpenChange={setShowPendingPOsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pending Purchase Orders ({poCompletionStats.pending})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {poCompletionStats.pendingPOs.length > 0 ? (
              poCompletionStats.pendingPOs.map((po: any) => (
                <Card 
                  key={po.id} 
                  className="p-3 border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
                  onClick={() => {
                    setSelectedPOContent(po);
                    setShowPendingPOsDialog(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-foreground">{po.order_number}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {po.supplier_name && <span>{po.supplier_name} • </span>}
                        {po.order_date && format(new Date(po.order_date), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                        Awaiting
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-70" />
                <p>All purchase orders have been received!</p>
              </div>
            )}
          </div>
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowPendingPOsDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Completed POs Dialog */}
      <Dialog open={showCompletedPOsDialog} onOpenChange={setShowCompletedPOsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Completed Purchase Orders ({poCompletionStats.completed})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {poCompletionStats.completedPOs.length > 0 ? (
              poCompletionStats.completedPOs.map((po: any) => (
                <Card 
                  key={po.id} 
                  className="p-3 border-green-500/30 bg-green-500/5 cursor-pointer hover:bg-green-500/10 transition-colors"
                  onClick={() => {
                    setShowRecordContent(po.receivedRecord);
                    setShowCompletedPOsDialog(false);
                  }}
                >
                  {(() => {
                    const orderCode = po.order_number?.toUpperCase() || '';
                    const isMaterial = orderCode.startsWith('RQ');
                    const isMarketList = orderCode.startsWith('ML');
                    const categoryType = isMaterial ? 'Material' : isMarketList ? 'Market' : null;
                    
                    // Check for discrepancy from variance_data
                    const varianceData = po.receivedRecord?.variance_data;
                    const hasDiscrepancy = varianceData?.summary && (
                      varianceData.summary.short > 0 || 
                      varianceData.summary.over > 0 || 
                      varianceData.summary.missing > 0 || 
                      varianceData.summary.extra > 0
                    );
                    
                    // Get discrepancy items
                    const discrepancyItems: string[] = [];
                    if (hasDiscrepancy && varianceData?.items) {
                      varianceData.items.forEach((item: any) => {
                        if (item.status === 'short' || item.status === 'over' || item.status === 'missing' || item.status === 'extra') {
                          discrepancyItems.push(`${item.item_name} (${item.status})`);
                        }
                      });
                    }
                    
                    const receivedByName = po.receivedRecord?.received_by_name || po.receivedRecord?.received_by_email;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-foreground">{po.order_number}</span>
                          </div>
                          <Badge variant="outline" className={hasDiscrepancy ? "border-amber-500/50 text-amber-500" : "border-green-500/50 text-green-500"}>
                            {hasDiscrepancy ? 'Discrepancy' : 'Complete'}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {po.supplier_name && <span>{po.supplier_name} • </span>}
                          {po.order_date && format(new Date(po.order_date), 'MMM dd, yyyy')}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {categoryType && (
                              <Badge variant="secondary" className={isMaterial ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}>
                                {categoryType}
                              </Badge>
                            )}
                            {po.receivedRecord?.total_value > 0 && (
                              <span className="text-sm font-medium text-foreground">
                                {formatCurrency(po.receivedRecord.total_value)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {receivedByName && (
                          <div className="text-xs text-muted-foreground">
                            <span className="text-foreground/70">Received by:</span> {receivedByName}
                          </div>
                        )}
                        
                        {po.receivedRecord && (
                          <div className="text-xs text-green-600">
                            {format(new Date(po.receivedRecord.received_date), 'MMM dd, yyyy')}
                          </div>
                        )}
                        
                        {hasDiscrepancy && discrepancyItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="text-xs text-amber-500 font-medium mb-1">Discrepancy Items:</div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {discrepancyItems.slice(0, 3).map((item, idx) => (
                                <div key={idx}>• {item}</div>
                              ))}
                              {discrepancyItems.length > 3 && (
                                <div className="text-amber-500/70">+{discrepancyItems.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500 opacity-70" />
                <p>No completed purchase orders yet</p>
              </div>
            )}
          </div>
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowCompletedPOsDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Content Dialog (for pending POs) */}
      <Dialog open={!!selectedPOContent} onOpenChange={() => setSelectedPOContent(null)}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Purchase Order Details
            </DialogTitle>
          </DialogHeader>

          {selectedPOContent && (
            <div className="space-y-3">
              <Card className="p-3 bg-amber-500/10 border-amber-500/30">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Order Number</p>
                    <p className="font-medium">{selectedPOContent.order_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Order Date</p>
                    <p className="font-medium">
                      {selectedPOContent.order_date 
                        ? format(new Date(selectedPOContent.order_date), 'MMM d, yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="font-medium">{selectedPOContent.supplier_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                      Pending Receipt
                    </Badge>
                  </div>
                </div>
              </Card>

              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-amber-500 opacity-60" />
                <p className="text-sm text-muted-foreground">
                  This purchase order is awaiting receiving.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a receiving document to complete it.
                </p>
              </div>

              <Button className="w-full" onClick={() => setSelectedPOContent(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Guide Dialog */}
      <PurchaseOrdersGuide open={showGuide} onOpenChange={setShowGuide} />


    </div>
  );
};

export default POReceivedItems;