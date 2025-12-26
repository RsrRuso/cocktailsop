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
import { ArrowLeft, Package, Coins, Search, TrendingUp, Upload, FileText, Download, CheckCircle, XCircle, AlertTriangle, Calendar, Eye, Trash2, BarChart3, History, TrendingDown, ChevronDown, HelpCircle, Smartphone, Users, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseOrdersGuide } from "@/components/procurement/PurchaseOrdersGuide";
import { ReceivingAnalytics } from "@/components/receiving/ReceivingAnalytics";
import { CombinedProcurementAnalytics } from "@/components/analytics/CombinedProcurementAnalytics";
import { useReceivingAnalytics } from "@/hooks/useReceivingAnalytics";
import { usePurchaseOrderAnalytics } from "@/hooks/usePurchaseOrderAnalytics";
import { useState, useRef, useMemo } from "react";
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
import { ManualTextUploadDialog } from "@/components/procurement/ManualTextUploadDialog";
import { 
  useDailyPOSummary, 
  normalizeItemName, 
  itemsMatch, 
  detectDocType,
  getItemKey as getPOItemKey 
} from "@/hooks/useDailyPOSummary";

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
  
  // Extract staff mode info - check location.state first, then sessionStorage as fallback
  const getStaffInfo = (): { staffMode: boolean; staffName: string | null; staffWorkspaceId: string | null } => {
    // First try location.state (passed from ProcurementPinAccess navigation)
    const stateStaffMode = (location.state as any)?.staffMode || false;
    const stateStaffName = (location.state as any)?.staffName || null;
    const stateWorkspaceId = (location.state as any)?.workspaceId || null;
    
    if (stateStaffMode && stateStaffName) {
      return { staffMode: true, staffName: stateStaffName, staffWorkspaceId: stateWorkspaceId };
    }
    
    // Fallback to sessionStorage (persists across page refreshes in PWA)
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
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'all' | 'summary'>('summary');
  const [isUploading, setIsUploading] = useState(false);
  const [varianceReport, setVarianceReport] = useState<VarianceReport | null>(null);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'summary' | 'forecast' | 'prices'>('overview');
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
  const [showManualUpload, setShowManualUpload] = useState(false);
  

  // Workspace state - use staff workspace if in staffMode, otherwise from localStorage
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(() => {
    if (staffWorkspaceId) return staffWorkspaceId;
    return localStorage.getItem('po-workspace-id') || null;
  });
  
  // Effective workspace: staff workspace takes precedence
  const effectiveWorkspaceId = staffMode ? staffWorkspaceId : selectedWorkspaceId;
  
// Hook must be called after state declaration
  const { receivedItems, receivedSummary, receivedTotals, isLoadingReceived, addReceivedItem } = usePurchaseOrderMaster(effectiveWorkspaceId);
  
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

  // Save currency preference when changed
  const handleCurrencyChange = (newCurrency: 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD') => {
    setCurrency(newCurrency);
    localStorage.setItem('po-currency', newCurrency);
  };

  // Currency symbols only - no conversion
  const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', AUD: 'A$' };
  
  // PDF-safe currency codes (avoid Unicode symbols that break in PDFs)
  const pdfCurrencyCodes: Record<string, string> = { USD: 'USD', EUR: 'EUR', GBP: 'GBP', AED: 'AED', AUD: 'AUD' };
  
  const formatCurrency = (amount: number) => {
    return `${currencySymbols[currency]}${amount.toFixed(2)}`;
  };
  
  // PDF-safe currency formatter - uses text codes instead of Unicode symbols
  const formatCurrencyPDFSafe = (amount: number) => {
    const parts = amount.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${pdfCurrencyCodes[currency]} ${intPart}.${parts[1]}`;
  };

  // Fetch recent received records - workspace aware
  const { data: recentReceived, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['po-recent-received', user?.id || 'staff', effectiveWorkspaceId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('po_received_records')
        .select('*')
        .order('received_date', { ascending: false })
        .limit(50);
      
      if (effectiveWorkspaceId) {
        query = query.eq('workspace_id', effectiveWorkspaceId);
      } else if (user?.id) {
        query = query.eq('user_id', user.id).is('workspace_id', null);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RecentReceived[];
    },
    enabled: hasAccess && (!!effectiveWorkspaceId || !!user?.id)
  });

  // Analytics hooks - must be after queries
  const receivingAnalytics = useReceivingAnalytics(recentReceived || [], receivedItems || []);

  // Fetch all purchase orders to compare with received - workspace aware
  // Only include approved/completed POs, exclude pending/draft
  const { data: allPurchaseOrders } = useQuery({
    queryKey: ['po-all-orders', user?.id || 'staff', effectiveWorkspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('id, order_number, supplier_name, order_date, status, total_amount, created_at')
        .in('status', ['confirmed', 'received'])
        .order('created_at', { ascending: false });
      
      if (effectiveWorkspaceId) {
        query = query.eq('workspace_id', effectiveWorkspaceId);
      } else if (user?.id) {
        query = query.eq('user_id', user.id).is('workspace_id', null);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: hasAccess && (!!effectiveWorkspaceId || !!user?.id)
  });

  // Fetch all purchase order items for analytics - workspace aware
  // Only include items from approved/completed POs, exclude pending/draft
  const { data: allPurchaseOrderItems } = useQuery({
    queryKey: ['po-all-order-items', user?.id || 'staff', effectiveWorkspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_order_items')
        .select('*, purchase_orders!inner(workspace_id, user_id, status)')
        .in('purchase_orders.status', ['confirmed', 'received'])
        .order('created_at', { ascending: false });
      
      if (effectiveWorkspaceId) {
        query = query.eq('purchase_orders.workspace_id', effectiveWorkspaceId);
      } else if (user?.id) {
        query = query.eq('purchase_orders.user_id', user.id).is('purchase_orders.workspace_id', null);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: hasAccess && (!!effectiveWorkspaceId || !!user?.id)
  });

  // Filter PO items to only include those from POs that have been received
  // This excludes pending POs (confirmed but not yet received) from variance calculation
  const { receivedPurchaseOrders, receivedPurchaseOrderItems } = useMemo(() => {
    if (!recentReceived || !allPurchaseOrders || !allPurchaseOrderItems) {
      return { receivedPurchaseOrders: [], receivedPurchaseOrderItems: [] };
    }

    // Build set of received document codes
    const receivedDocCodesSet = new Set<string>();
    recentReceived.filter(r => r.document_number).forEach(r => {
      receivedDocCodesSet.add(normalizeItemCode(r.document_number || ''));
    });

    // Filter POs to only those with matching receiving records
    const filteredPOs = allPurchaseOrders.filter((po: any) => {
      const poCode = normalizeItemCode(po.order_number || '');
      return receivedDocCodesSet.has(poCode);
    });

    // Get IDs of received POs
    const receivedPOIds = new Set(filteredPOs.map((po: any) => po.id));
    
    // Filter PO items to only those from received POs
    const filteredItems = allPurchaseOrderItems.filter((item: any) => {
      return receivedPOIds.has(item.purchase_order_id);
    });

    return { 
      receivedPurchaseOrders: filteredPOs, 
      receivedPurchaseOrderItems: filteredItems 
    };
  }, [recentReceived, allPurchaseOrders, allPurchaseOrderItems]);

  // Daily PO Summary hook - summarizes POs by date with ML=market, RQ=material
  const { dailySummary, allSummarizedItems, findMatchingPOItem } = useDailyPOSummary(
    allPurchaseOrders,
    allPurchaseOrderItems
  );

  // Purchase order analytics hook - ONLY uses items from POs that have been received
  const purchaseOrderAnalytics = usePurchaseOrderAnalytics(receivedPurchaseOrders, receivedPurchaseOrderItems);

  // Calculate PO completion stats using the already-computed received doc codes
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

  // Fetch received items linked to receiving records for per-document comparison
  const { data: allReceivedItems } = useQuery({
    queryKey: ['po-all-received-items', user?.id || 'staff', effectiveWorkspaceId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_order_received_items')
        .select('*, po_received_records!inner(document_number, workspace_id, user_id)')
        .order('created_at', { ascending: false });
      
      if (effectiveWorkspaceId) {
        query = query.eq('po_received_records.workspace_id', effectiveWorkspaceId);
      } else if (user?.id) {
        query = query.eq('po_received_records.user_id', user.id).is('po_received_records.workspace_id', null);
      } else {
        return [];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: hasAccess && (!!effectiveWorkspaceId || !!user?.id)
  });

  // Calculate per-document comparison (accurate variance calculation)
  // This compares items ordered in each PO with items received for that same document
  const perDocumentComparison = useMemo(() => {
    if (!allPurchaseOrderItems || !allReceivedItems || !recentReceived) {
      return [];
    }

    // Get document numbers that have both PO and receiving records
    const receivedDocNumbers = new Set<string>();
    recentReceived.forEach(r => {
      if (r.document_number) {
        receivedDocNumbers.add(r.document_number.toLowerCase().trim());
      }
    });

    // Build ordered items by document (only for received documents)
    const orderedByDoc = new Map<string, Map<string, { qty: number; value: number; item_name: string }>>();
    
    // Get PO order numbers for lookup
    const poOrderNumbers = new Map<string, string>();
    (allPurchaseOrders || []).forEach((po: any) => {
      poOrderNumbers.set(po.id, po.order_number?.toLowerCase().trim() || '');
    });

    const normalizeItemName = (name: string) =>
      (name || '')
        .toString()
        .normalize('NFKC')
        .replace(/\u00A0/g, ' ') // non‑breaking space
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    const getItemKey = (row: any): string => {
      const code = row?.item_code ?? row?.itemCode ?? row?.code;
      if (code && String(code).trim()) {
        return `code:${normalizeItemCode(String(code))}`;
      }
      const name = row?.item_name ?? row?.itemName ?? '';
      return `name:${normalizeItemName(String(name))}`;
    };

    allPurchaseOrderItems.forEach((item: any) => {
      const poId = item.purchase_order_id;
      const docNumber = poOrderNumbers.get(poId);
      if (!docNumber || !receivedDocNumbers.has(docNumber)) return;

      if (!orderedByDoc.has(docNumber)) {
        orderedByDoc.set(docNumber, new Map());
      }
      const docItems = orderedByDoc.get(docNumber)!;
      const itemKey = getItemKey(item);
      const existing = docItems.get(itemKey) || { qty: 0, value: 0, item_name: item.item_name };
      existing.qty += item.quantity || 0;
      existing.value += item.price_total || 0;
      docItems.set(itemKey, existing);
    });

    // Build received items by document
    const receivedByDoc = new Map<string, Map<string, { qty: number; value: number; item_name: string }>>();
    allReceivedItems.forEach((item: any) => {
      const docNumber = item.po_received_records?.document_number?.toLowerCase().trim();
      if (!docNumber) return;

      if (!receivedByDoc.has(docNumber)) {
        receivedByDoc.set(docNumber, new Map());
      }
      const docItems = receivedByDoc.get(docNumber)!;
      const itemKey = getItemKey(item);
      const existing = docItems.get(itemKey) || { qty: 0, value: 0, item_name: item.item_name };
      existing.qty += item.quantity || 0;
      existing.value += item.total_price || 0;
      docItems.set(itemKey, existing);
    });

    // Compare per document and aggregate by item name
    const aggregatedComparison = new Map<string, {
      itemName: string;
      orderedQty: number;
      receivedQty: number;
      orderedValue: number;
      receivedValue: number;
    }>();

    // Process ordered items
    orderedByDoc.forEach((orderedItems, docNumber) => {
      const receivedItems = receivedByDoc.get(docNumber) || new Map();
      
      orderedItems.forEach((ordered, itemKey) => {
        const received = receivedItems.get(itemKey);
        const existing = aggregatedComparison.get(itemKey) || {
          itemName: ordered.item_name,
          orderedQty: 0,
          receivedQty: 0,
          orderedValue: 0,
          receivedValue: 0
        };
        existing.orderedQty += ordered.qty;
        existing.receivedQty += received?.qty || 0;
        existing.orderedValue += ordered.value;
        existing.receivedValue += received?.value || 0;
        aggregatedComparison.set(itemKey, existing);
      });

      // Check for extra received items in this document
      receivedItems.forEach((received, itemKey) => {
        if (!orderedItems.has(itemKey)) {
          const existing = aggregatedComparison.get(itemKey) || {
            itemName: received.item_name,
            orderedQty: 0,
            receivedQty: 0,
            orderedValue: 0,
            receivedValue: 0
          };
          existing.receivedQty += received.qty;
          existing.receivedValue += received.value;
          aggregatedComparison.set(itemKey, existing);
        }
      });
    });

    // Convert to comparison array with status
    const comparison: Array<{
      itemName: string;
      orderedQty: number;
      receivedQty: number;
      orderedValue: number;
      receivedValue: number;
      qtyVariance: number;
      valueVariance: number;
      status: 'match' | 'short' | 'over' | 'not-received' | 'extra';
    }> = [];

    aggregatedComparison.forEach((item) => {
      const qtyVariance = item.orderedQty - item.receivedQty;
      const valueVariance = item.orderedValue - item.receivedValue;
      
      let status: 'match' | 'short' | 'over' | 'not-received' | 'extra' = 'match';
      if (item.orderedQty > 0 && item.receivedQty === 0) {
        status = 'not-received';
      } else if (item.orderedQty === 0 && item.receivedQty > 0) {
        status = 'extra';
      } else if (qtyVariance > 0.5) {
        status = 'short';
      } else if (qtyVariance < -0.5) {
        status = 'over';
      }

      comparison.push({
        itemName: item.itemName,
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        orderedValue: item.orderedValue,
        receivedValue: item.receivedValue,
        qtyVariance,
        valueVariance,
        status
      });
    });

    return comparison.sort((a, b) => Math.abs(b.valueVariance) - Math.abs(a.valueVariance));
  }, [allPurchaseOrderItems, allReceivedItems, recentReceived, allPurchaseOrders]);

  // Fetch price history for change tracking (only for authenticated users, not staff)
  const { data: priceHistory } = useQuery({
    queryKey: ['po-price-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from('po_price_history')
        .select('*')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as PriceChange[];
    },
    enabled: !!user?.id
  });

  // No access - show access required screen
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center p-6">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Required</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Please sign in or use staff PIN access to view received items.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/auth')} className="flex-1">Sign In</Button>
            <Button variant="outline" onClick={() => navigate('/procurement-pin-access')} className="flex-1">Staff PIN</Button>
          </div>
        </Card>
      </div>
    );
  }

  const filteredItems = viewMode === 'summary' 
    ? receivedSummary.filter(item => 
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : receivedItems?.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Handle Transfer Document (TR prefix) - NEW LOGIC:
  // 1. Check if items match PO items (by code OR name)
  // 2. If match found: compare and show variance (SHORT/EXTRA/MISSING)
  // 3. If no match: receive as Spirits category without comparison
  const handleTransferDocument = async (parsed: any, documentCode: string) => {
    if (!user) return;
    
    const receivedDate = new Date().toISOString().split('T')[0];
    
    // Sum quantities for repeated items (by item_code or item_name)
    const itemsMap = new Map<string, {
      item_code: string;
      item_name: string;
      unit: string;
      quantity: number;
      price_per_unit: number;
      price_total: number;
      matchedPOItem: any | null;
      category: 'spirits' | 'market' | 'material';
    }>();
    
    (parsed.items || []).forEach((item: any) => {
      const itemCode = item.item_code || '';
      const itemName = item.item_name || item.name || '';
      // Use item_code as primary key, fallback to normalized name
      const key = itemCode 
        ? normalizeItemCode(itemCode) 
        : normalizeItemName(itemName);
      
      if (!key) return;
      
      const existing = itemsMap.get(key);
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.price_per_unit) || 0;
      
      // Check if item matches any PO item (by code OR name)
      const matchedPOItem = findMatchingPOItem({ item_code: itemCode, item_name: itemName });
      const category = matchedPOItem ? matchedPOItem.category : 'spirits';
      
      if (existing) {
        // Sum quantities and recalculate total
        existing.quantity += qty;
        existing.price_total = existing.quantity * existing.price_per_unit;
      } else {
        itemsMap.set(key, {
          item_code: itemCode,
          item_name: itemName,
          unit: item.unit || 'EA',
          quantity: qty,
          price_per_unit: unitPrice,
          price_total: qty * unitPrice,
          matchedPOItem,
          category: category as 'spirits' | 'market' | 'material'
        });
      }
    });
    
    const consolidatedItems = Array.from(itemsMap.values()).filter(i => i.quantity > 0);
    
    if (consolidatedItems.length === 0) {
      toast.error("No valid items found in transfer document");
      return;
    }
    
    // Separate matched vs unmatched items
    const matchedItems = consolidatedItems.filter(i => i.matchedPOItem);
    const unmatchedItems = consolidatedItems.filter(i => !i.matchedPOItem);
    
    // Generate variance data for matched items
    const varianceItems: any[] = [];
    matchedItems.forEach(item => {
      const orderedQty = item.matchedPOItem?.quantity || 0;
      const receivedQty = item.quantity;
      const variance = receivedQty - orderedQty;
      
      let status: 'match' | 'short' | 'over' | 'extra' = 'match';
      if (variance < 0) status = 'short';
      else if (variance > 0) status = 'over';
      
      varianceItems.push({
        item_code: item.item_code,
        item_name: item.item_name,
        unit: item.unit,
        ordered_qty: orderedQty,
        received_qty: receivedQty,
        variance,
        variance_pct: orderedQty > 0 ? (variance / orderedQty) * 100 : 0,
        status,
        category: item.category
      });
    });
    
    // Add unmatched items as "extra" (Spirits category)
    unmatchedItems.forEach(item => {
      varianceItems.push({
        item_code: item.item_code,
        item_name: item.item_name,
        unit: item.unit,
        ordered_qty: 0,
        received_qty: item.quantity,
        variance: item.quantity,
        variance_pct: 100,
        status: 'extra',
        category: 'spirits'
      });
    });
    
    // Calculate totals
    const totalQty = consolidatedItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = consolidatedItems.reduce((sum, i) => sum + i.price_total, 0);
    
    // Build variance report
    const varianceReport = matchedItems.length > 0 ? {
      order_number: documentCode,
      supplier: parsed.location || 'Stock Transfer',
      items: varianceItems,
      summary: {
        total_ordered: varianceItems.reduce((sum, i) => sum + i.ordered_qty, 0),
        total_received: varianceItems.reduce((sum, i) => sum + i.received_qty, 0),
        total_variance: varianceItems.reduce((sum, i) => sum + i.variance, 0),
        matched: varianceItems.filter(i => i.status === 'match').length,
        short: varianceItems.filter(i => i.status === 'short').length,
        over: varianceItems.filter(i => i.status === 'over').length,
        missing: 0,
        extra: varianceItems.filter(i => i.status === 'extra').length,
        spirits_count: unmatchedItems.length
      }
    } : null;
    
    // Save the transfer record
    const { data: savedRecord, error: recordError } = await (supabase as any)
      .from('po_received_records')
      .insert({
        user_id: user.id,
        workspace_id: selectedWorkspaceId || null,
        supplier_name: parsed.location || 'Stock Transfer',
        document_number: documentCode,
        received_date: receivedDate,
        total_items: consolidatedItems.length,
        total_quantity: totalQty,
        total_value: totalValue,
        status: 'received',
        variance_data: varianceReport,
        received_by_name: staffMode && staffName ? staffName : (profile?.full_name || profile?.username || null),
        received_by_email: staffMode ? null : (profile?.email || user?.email || null)
      })
      .select('id')
      .single();
    
    if (recordError) {
      toast.error("Failed to save transfer record: " + recordError.message);
      return;
    }
    
    const recordId = savedRecord?.id;
    
    // Save individual items
    for (const item of consolidatedItems) {
      await addReceivedItem({
        purchase_order_id: undefined, // No PO link for transfers
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.price_per_unit,
        total_price: item.price_total,
        received_date: receivedDate,
        document_number: documentCode,
        record_id: recordId
      });
    }
    
    // Sync to LAB Ops stock movements
    try {
      await syncToLabOpsMovements(consolidatedItems, recordId, staffMode && staffName ? staffName : (profile?.full_name || profile?.username || null));
    } catch (syncError) {
      console.log('LAB Ops sync skipped:', syncError);
    }
    
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
    queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
    
    // Show appropriate message
    const spiritsCount = unmatchedItems.length;
    const matchedCount = matchedItems.length;
    
    if (spiritsCount > 0 && matchedCount > 0) {
      toast.success(
        `Transfer "${documentCode}" saved: ${matchedCount} items matched to PO, ${spiritsCount} items added as Spirits. Total: ${totalQty} units.`,
        { duration: 6000 }
      );
    } else if (spiritsCount > 0) {
      toast.success(
        `Transfer "${documentCode}" saved: ${spiritsCount} Spirits items, ${totalQty} units added to stock.`,
        { duration: 5000 }
      );
    } else {
      toast.success(
        `Transfer "${documentCode}" saved: ${matchedCount} items matched, ${totalQty} units. Check variance for discrepancies.`,
        { duration: 5000 }
      );
    }
  };

  // Handle manual text upload confirmation
  const handleManualUploadSave = async (data: {
    docNumber: string;
    supplier: string;
    items: { item_code: string; item_name: string; quantity: number; unit: string; price: number; total: number }[];
  }) => {
    if (!user) throw new Error("Not authenticated");
    
    const receivedDate = new Date().toISOString().split('T')[0];
    const documentCode = data.docNumber;
    
    // Check for duplicate document
    let duplicateQuery = supabase
      .from('po_received_records')
      .select('id')
      .eq('document_number', documentCode);
    
    if (selectedWorkspaceId) {
      duplicateQuery = duplicateQuery.eq('workspace_id', selectedWorkspaceId);
    } else {
      duplicateQuery = duplicateQuery.eq('user_id', user?.id).is('workspace_id', null);
    }
    
    const { data: existing } = await duplicateQuery;
    if (existing && existing.length > 0) {
      throw new Error(`Document "${documentCode}" already exists`);
    }
    
    // Calculate totals
    const totalQty = data.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalValue = data.items.reduce((sum, i) => sum + i.total, 0);
    
    // Save the receiving record
    const { data: savedRecord, error: recordError } = await (supabase as any)
      .from('po_received_records')
      .insert({
        user_id: user.id,
        workspace_id: selectedWorkspaceId || null,
        supplier_name: data.supplier,
        document_number: documentCode,
        received_date: receivedDate,
        total_items: data.items.length,
        total_quantity: totalQty,
        total_value: totalValue,
        status: 'received',
        variance_data: null,
        received_by_name: staffMode && staffName ? staffName : (profile?.full_name || profile?.username || null),
        received_by_email: staffMode ? null : (profile?.email || user?.email || null)
      })
      .select('id')
      .single();
    
    if (recordError) throw recordError;
    const recordId = savedRecord?.id;
    
    // Save individual items
    for (const item of data.items) {
      await addReceivedItem({
        purchase_order_id: undefined,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.price,
        total_price: item.total,
        received_date: receivedDate,
        document_number: documentCode,
        record_id: recordId
      });
    }
    
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
    queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
    
    toast.success(`Manual upload saved: ${data.items.length} items, ${totalQty} units`);
  };

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
          
          // Extract document code from parsed data (ML for market, RQ for materials, TR for transfers)
          const documentCode = parsed.doc_no?.trim();
          const normalizedDocCode = documentCode ? normalizeItemCode(documentCode) : null;
          
          // Validate document code exists
          if (!documentCode) {
            toast.error("Upload rejected: No document code (ML/RQ/TR) found in the file. Please ensure the document has a valid code.", { duration: 6000 });
            setIsUploading(false);
            return;
          }
          
          // Check if this is a Transfer document (TR prefix) - these go directly to stock without PO matching
          const isTransferDocument = documentCode.toUpperCase().startsWith('TR') || 
                                      documentCode.toUpperCase().includes('-TR');
          
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
          
          // ===== TRANSFER DOCUMENT HANDLING (TR prefix) =====
          // TR documents are stock transfers - add directly to stock without PO comparison
          if (isTransferDocument) {
            await handleTransferDocument(parsed, documentCode);
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          
          // ===== REGULAR PO DOCUMENT HANDLING =====
          // NEW LOGIC: Don't check document code - compare items by item code OR item name
          // Match against daily summarized PO items (at least one match required)
          
          const docType = detectDocumentType(documentCode);
          
          // Build matching maps from ALL summarized PO items
          const poItemsByCode = new Map<string, any>();
          const poItemsBySuffix = new Map<string, any>();
          const poItemsByName = new Map<string, any>();
          const poItemsByFuzzyName = new Map<string, any>();
          
          // Helper functions for matching
          const extractNumericSuffix = (code: string): string => {
            const numericPart = String(code || '').replace(/[^0-9]/g, '');
            return numericPart.length > 6 ? numericPart.slice(-6) : numericPart;
          };
          const normalizeFuzzyName = (name: string): string => {
            return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          };
          
          // Index all summarized PO items for matching
          allSummarizedItems.forEach((poi: any) => {
            if (poi.item_code) {
              poItemsByCode.set(normalizeItemCode(poi.item_code), poi);
              const suffix = extractNumericSuffix(poi.item_code);
              if (suffix && suffix.length >= 4) {
                poItemsBySuffix.set(suffix, poi);
              }
            }
            if (poi.item_name) {
              poItemsByName.set(String(poi.item_name).trim().toLowerCase(), poi);
              poItemsByFuzzyName.set(normalizeFuzzyName(poi.item_name), poi);
            }
          });

          let marketCount = 0;
          let materialCount = 0;
          let matchedCount = 0;

          const enhancedItems: ParsedReceivingItem[] = parsed.items.map((item: any) => {
            const itemCode = item.item_code || '';
            const normalizedItemCodeVal = itemCode ? normalizeItemCode(itemCode) : '';
            const itemNameRaw = item.item_name || item.name || '';
            const normalizedItemNameVal = String(itemNameRaw).trim().toLowerCase();
            const fuzzyItemName = normalizeFuzzyName(itemNameRaw);
            const itemSuffix = itemCode ? extractNumericSuffix(itemCode) : '';

            // Multi-strategy matching against ALL summarized PO items
            let matchedPOItem = null;
            
            // 1. Try exact code match
            if (itemCode && poItemsByCode.has(normalizedItemCodeVal)) {
              matchedPOItem = poItemsByCode.get(normalizedItemCodeVal);
            }
            // 2. Try numeric suffix match (handles Z00007286 vs 200007286)
            if (!matchedPOItem && itemSuffix && itemSuffix.length >= 4 && poItemsBySuffix.has(itemSuffix)) {
              matchedPOItem = poItemsBySuffix.get(itemSuffix);
            }
            // 3. Try exact name match
            if (!matchedPOItem && poItemsByName.has(normalizedItemNameVal)) {
              matchedPOItem = poItemsByName.get(normalizedItemNameVal);
            }
            // 4. Try fuzzy name match
            if (!matchedPOItem && poItemsByFuzzyName.has(fuzzyItemName)) {
              matchedPOItem = poItemsByFuzzyName.get(fuzzyItemName);
            }

            const matchedInPO = !!matchedPOItem;
            if (matchedInPO) matchedCount++;

            // Determine item category from matched PO item or document type
            let itemDocType = matchedPOItem?.category || detectDocumentType(itemCode);
            if (itemDocType === 'unknown' && (docType === 'market' || docType === 'material')) {
              itemDocType = docType;
            }

            if (itemDocType === 'market') marketCount++;
            if (itemDocType === 'material') materialCount++;

            return {
              item_code: itemCode,
              item_name: itemNameRaw,
              unit: item.unit,
              quantity: item.quantity || 0,
              price_per_unit: item.price_per_unit || 0,
              price_total: (item.quantity || 0) * (item.price_per_unit || 0),
              delivery_date: item.delivery_date,
              isReceived: true, // Auto-tick all items by default
              documentType: itemDocType,
              matchedInPO,
              matchedPOItem: matchedPOItem || undefined
            };
          });
          
          // At least ONE item must match to process (by item code OR item name)
          if (matchedCount === 0) {
            toast.error(
              `Upload rejected: No items in "${documentCode}" match any PO items by code or name. Please verify items exist in your Purchase Orders.`,
              { duration: 8000 }
            );
            setIsUploading(false);
            return;
          }
          
          // Build the ordered items for variance comparison from matched PO items
          const orderedItemsForVariance: any[] = [];
          enhancedItems.forEach(item => {
            if (item.matchedPOItem) {
              orderedItemsForVariance.push(item.matchedPOItem);
            }
          });
          setPendingOrderItems(orderedItemsForVariance);
          
          // Determine overall document type
          const overallDocType: 'market' | 'material' | 'mixed' = 
            docType !== 'unknown' ? docType :
            marketCount > 0 && materialCount > 0 ? 'mixed' :
            marketCount > 0 ? 'market' :
            materialCount > 0 ? 'material' : 'mixed';
          
          // Store matched order info (use first matched PO item's source or null)
          const matchedPOInfo = enhancedItems.find(i => i.matchedPOItem)?.matchedPOItem;
          setPendingMatchedOrder({
            order_number: documentCode,
            supplier_name: parsed.location || matchedPOInfo?.source_docs?.[0] || 'Unknown',
            order_date: parsed.doc_date || new Date().toISOString()
          });
          
          setEnhancedReceivingData({
            doc_no: documentCode,
            doc_date: parsed.doc_date,
            location: parsed.location,
            items: enhancedItems,
            documentType: overallDocType
          });
          setShowEnhancedReceiving(true);
          
          const unmatchedCount = parsed.items.length - matchedCount;
          toast.success(
            `Document "${documentCode}": ${matchedCount} items matched to PO${unmatchedCount > 0 ? `, ${unmatchedCount} not matched` : ''}. Review and confirm.`,
            { duration: 5000 }
          );
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
    
    // Sync to LAB Ops stock movements
    try {
      await syncToLabOpsMovements(receivedItemsList, recordId, staffMode && staffName ? staffName : (profile?.full_name || profile?.username || null));
    } catch (syncError) {
      console.log('LAB Ops sync skipped:', syncError);
    }
    
    // Refresh data and show variance report
    queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
    queryClient.invalidateQueries({ queryKey: ['po-received-items'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); // Update PO status to Received
    
    setVarianceReport(report);
    setShowVarianceDialog(true);
    
    // Clear pending state
    setPendingMatchedOrder(null);
    setPendingOrderItems([]);
    setEnhancedReceivingData(null);
  };
  
  // Sync received items to LAB Ops stock movements
  const syncToLabOpsMovements = async (items: any[], recordId: string, receivedBy: string | null) => {
    // Get LAB Ops inventory items to match
    const { data: inventoryItems } = await supabase
      .from('lab_ops_inventory_items')
      .select('id, name, outlet_id');
    
    if (!inventoryItems?.length) {
      // No inventory items - add all to pending queue
      const { data: outlets } = await supabase.from('lab_ops_outlets').select('id').limit(1);
      const defaultOutletId = outlets?.[0]?.id;
      
      if (defaultOutletId) {
        for (const item of items) {
          if (item.quantity <= 0) continue;
          await supabase.from('lab_ops_pending_received_items').insert({
            outlet_id: defaultOutletId,
            item_name: item.item_name,
            item_code: item.item_code || null,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.price_per_unit || 0,
            total_price: item.price_total || 0,
            document_number: enhancedReceivingData?.doc_no || null,
            supplier_name: pendingMatchedOrder?.supplier_name || enhancedReceivingData?.location || null,
            received_date: new Date().toISOString().split('T')[0],
            received_by: receivedBy,
            po_record_id: recordId,
            status: 'pending'
          });
        }
      }
      return;
    }
    
    // Get default location for the outlet
    const { data: locations } = await supabase
      .from('lab_ops_locations')
      .select('id, outlet_id, name')
      .limit(100);
    
    const { data: outlets } = await supabase.from('lab_ops_outlets').select('id').limit(1);
    const defaultOutletId = outlets?.[0]?.id || inventoryItems[0]?.outlet_id;
    
    for (const item of items) {
      if (item.quantity <= 0) continue;
      
      // Try to find matching inventory item by name (case-insensitive)
      const matchedItem = inventoryItems.find(inv => 
        inv.name.toLowerCase() === item.item_name?.toLowerCase()
      );
      
      if (matchedItem) {
        // Found match - create stock movement
        const location = locations?.find(loc => loc.outlet_id === matchedItem.outlet_id);
        
        await supabase.from('lab_ops_stock_movements').insert({
          inventory_item_id: matchedItem.id,
          to_location_id: location?.id || null,
          qty: item.quantity,
          movement_type: 'purchase',
          reference_type: 'po_receiving',
          reference_id: recordId,
          notes: `PO Receiving: ${item.item_name}`,
          created_by: user?.id
        });
        
        // Update stock levels
        const { data: existingLevel } = await supabase
          .from('lab_ops_stock_levels')
          .select('id, quantity')
          .eq('inventory_item_id', matchedItem.id)
          .eq('location_id', location?.id)
          .single();
        
        if (existingLevel) {
          await supabase
            .from('lab_ops_stock_levels')
            .update({ quantity: (existingLevel.quantity || 0) + item.quantity })
            .eq('id', existingLevel.id);
        } else if (location) {
          await supabase.from('lab_ops_stock_levels').insert({
            inventory_item_id: matchedItem.id,
            location_id: location.id,
            quantity: item.quantity
          });
        }
      } else {
        // No match - add to pending queue for approval
        if (defaultOutletId) {
          await supabase.from('lab_ops_pending_received_items').insert({
            outlet_id: defaultOutletId,
            item_name: item.item_name,
            item_code: item.item_code || null,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.price_per_unit || 0,
            total_price: item.price_total || 0,
            document_number: enhancedReceivingData?.doc_no || null,
            supplier_name: pendingMatchedOrder?.supplier_name || enhancedReceivingData?.location || null,
            received_date: new Date().toISOString().split('T')[0],
            received_by: receivedBy,
            po_record_id: recordId,
            status: 'pending'
          });
        }
      }
    }
  };

  const generateVarianceReport = (
    orderedItems: any[],
    receivedItems: any[],
    orderNumber?: string,
    orderDate?: string,
    supplier?: string
  ): VarianceReport => {
    const varianceItems: VarianceItem[] = [];
    const matchedReceivedKeys = new Set<string>();
    
    // Normalize item code - extract only numeric portion for matching
    const normalizeCode = (code: string): string => {
      return String(code || '').replace(/[.\s]/g, '').replace(/^0+/, '').trim().toLowerCase();
    };
    
    // Extract numeric suffix (last 6+ digits) for fallback matching
    const extractNumericSuffix = (code: string): string => {
      const numericPart = String(code || '').replace(/[^0-9]/g, '');
      // Get last 6 digits minimum, or full number if shorter
      return numericPart.length > 6 ? numericPart.slice(-6) : numericPart;
    };
    
    // Normalize name for fuzzy matching - remove special chars, extra spaces
    const normalizeName = (name: string): string => {
      return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    };
    
    // Extract key words from name for matching (first 3 significant words)
    const extractKeyWords = (name: string): string => {
      return String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 4)
        .join('');
    };
    
    // Build received maps for multi-strategy matching
    const receivedByCode = new Map<string, any>();
    const receivedByNumericSuffix = new Map<string, any>();
    const receivedByName = new Map<string, any>();
    const receivedByFuzzyName = new Map<string, any>();
    const receivedByKeyWords = new Map<string, any>();
    
    receivedItems.forEach(item => {
      if (item.item_code) {
        const code = normalizeCode(item.item_code);
        receivedByCode.set(code, item);
        // Also index by numeric suffix for cross-format matching
        const suffix = extractNumericSuffix(item.item_code);
        if (suffix && suffix.length >= 4) {
          receivedByNumericSuffix.set(suffix, item);
        }
      }
      const name = String(item.item_name || '').trim().toLowerCase();
      if (name) {
        receivedByName.set(name, item);
        receivedByFuzzyName.set(normalizeName(name), item);
        receivedByKeyWords.set(extractKeyWords(name), item);
      }
    });
    
    // Match ordered items against received using multi-strategy matching
    orderedItems.forEach(ordered => {
      let received: any = null;
      let matchKey = '';
      
      // Strategy 1: Match by item code (highest priority)
      if (ordered.item_code) {
        const code = normalizeCode(ordered.item_code);
        if (receivedByCode.has(code)) {
          received = receivedByCode.get(code);
          matchKey = `code:${code}`;
        }
      }
      
      // Strategy 1b: Match by numeric suffix (handles Z00007286 vs 200007286)
      if (!received && ordered.item_code) {
        const suffix = extractNumericSuffix(ordered.item_code);
        if (suffix && suffix.length >= 4 && receivedByNumericSuffix.has(suffix)) {
          received = receivedByNumericSuffix.get(suffix);
          matchKey = `suffix:${suffix}`;
        }
      }
      
      // Strategy 2: Match by exact name
      if (!received && ordered.item_name) {
        const name = String(ordered.item_name).trim().toLowerCase();
        if (receivedByName.has(name)) {
          received = receivedByName.get(name);
          matchKey = `name:${name}`;
        }
      }
      
      // Strategy 3: Match by fuzzy name (remove special chars, spaces)
      if (!received && ordered.item_name) {
        const fuzzyName = normalizeName(ordered.item_name);
        if (receivedByFuzzyName.has(fuzzyName)) {
          received = receivedByFuzzyName.get(fuzzyName);
          matchKey = `fuzzy:${fuzzyName}`;
        }
      }
      
      // Strategy 3b: Match by key words (first 4 significant words)
      if (!received && ordered.item_name) {
        const keyWords = extractKeyWords(ordered.item_name);
        if (keyWords && receivedByKeyWords.has(keyWords)) {
          received = receivedByKeyWords.get(keyWords);
          matchKey = `keywords:${keyWords}`;
        }
      }
      
      // Strategy 4: Partial name match (contains check)
      if (!received && ordered.item_name) {
        const orderedNameLower = String(ordered.item_name).trim().toLowerCase();
        for (const [name, item] of receivedByName.entries()) {
          if (name.includes(orderedNameLower) || orderedNameLower.includes(name)) {
            received = item;
            matchKey = `partial:${name}`;
            break;
          }
        }
      }
      
      if (matchKey) matchedReceivedKeys.add(matchKey);
      
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
    
    // Check for extra items (received but not matched to any ordered item)
    receivedItems.forEach(received => {
      const codeKey = received.item_code ? `code:${normalizeCode(received.item_code)}` : '';
      const suffixKey = received.item_code ? `suffix:${extractNumericSuffix(received.item_code)}` : '';
      const nameKey = `name:${String(received.item_name || '').trim().toLowerCase()}`;
      const fuzzyKey = `fuzzy:${normalizeName(received.item_name || '')}`;
      const keyWordsKey = `keywords:${extractKeyWords(received.item_name || '')}`;
      
      // Check if this received item was matched via any strategy
      const wasMatched = (codeKey && matchedReceivedKeys.has(codeKey)) ||
                        (suffixKey && matchedReceivedKeys.has(suffixKey)) ||
                        matchedReceivedKeys.has(nameKey) ||
                        matchedReceivedKeys.has(fuzzyKey) ||
                        matchedReceivedKeys.has(keyWordsKey) ||
                        Array.from(matchedReceivedKeys).some(k => k.startsWith('partial:') && k.includes(String(received.item_name || '').trim().toLowerCase()));
      
      if (!wasMatched) {
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
        formatCurrencyPDFSafe(item.previous_price || 0),
        formatCurrencyPDFSafe(item.current_price || 0),
        `${item.change_amount > 0 ? '+' : ''}${formatCurrencyPDFSafe(item.change_amount || 0)}`,
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
    
    // Calculate data period from actual received items
    const dates = receivedItems.map(item => new Date(item.received_date));
    const dataStartDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const dataEndDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Calculate total days in data period (minimum 1 day)
    const totalDays = Math.max(1, Math.ceil((dataEndDate.getTime() - dataStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    // Group items by name and calculate totals
    const itemMap = new Map<string, { total_qty: number; total_value: number; order_count: number; avg_price: number }>();
    
    receivedItems.forEach(item => {
      const key = item.item_name.toLowerCase();
      const existing = itemMap.get(key) || { total_qty: 0, total_value: 0, order_count: 0, avg_price: 0 };
      existing.total_qty += item.quantity || 0;
      existing.total_value += item.total_price || 0;
      existing.order_count += 1;
      itemMap.set(key, existing);
    });
    
    // Calculate averages and update avg_price
    itemMap.forEach((value, key) => {
      value.avg_price = value.total_qty > 0 ? value.total_value / value.total_qty : 0;
    });
    
    // Calculate forecast based on daily average
    const itemForecast = Array.from(itemMap.entries()).map(([itemName, data]) => {
      // Daily average = total qty ordered / days in period
      const dailyAvg = data.total_qty / totalDays;
      
      // Project weekly (7 days) and monthly (30 days)
      const weeklyQty = dailyAvg * 7;
      const monthlyQty = dailyAvg * 30;
      
      // Find original item name with proper casing
      const originalItem = receivedItems.find(i => i.item_name.toLowerCase() === itemName);
      
      return {
        item_name: originalItem?.item_name || itemName,
        total_qty: data.total_qty,
        order_count: data.order_count,
        daily_avg: dailyAvg,
        weekly_qty: weeklyQty,
        monthly_qty: monthlyQty,
        weekly_par: Math.ceil(weeklyQty * 1.2), // 20% buffer
        monthly_par: Math.ceil(monthlyQty * 1.2),
        avg_price: data.avg_price,
        weekly_cost: weeklyQty * data.avg_price,
        monthly_cost: monthlyQty * data.avg_price
      };
    });
    
    // Sort by total qty descending
    itemForecast.sort((a, b) => b.total_qty - a.total_qty);
    
    // jsPDF default fonts don't reliably support some currency symbols
    const pdfCurrency = ((): string => {
      const map: Record<string, string> = {
        USD: 'USD',
        EUR: 'EUR',
        GBP: 'GBP',
        AED: 'AED',
        AUD: 'AUD',
      };
      return map[currency] || currency;
    })();

    const formatPdfCurrency = (value: number) =>
      `${pdfCurrency} ${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Par Stock Forecast Report', pageWidth / 2, 20, { align: 'center' });

    // Data period info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data Period: ${format(dataStartDate, 'MMM d, yyyy')} - ${format(dataEndDate, 'MMM d, yyyy')} (${totalDays} days)`, pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 34, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Logic description box
    doc.setFillColor(230, 245, 255);
    doc.roundedRect(14, 38, pageWidth - 28, 22, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Calculation Logic:', 18, 46);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`1. Daily Average = Total Qty Ordered / ${totalDays} days in period`, 18, 52);
    doc.text('2. Weekly Projection = Daily Average x 7 days  |  Monthly Projection = Daily Average x 30 days', 18, 57);
    doc.text('3. Par Level = Projected Qty + 20% safety buffer', 150, 52);

    // Summary stats
    const totalWeeklyQty = itemForecast.reduce((sum, i) => sum + i.weekly_qty, 0);
    const totalMonthlyQty = itemForecast.reduce((sum, i) => sum + i.monthly_qty, 0);
    const totalWeeklyCost = itemForecast.reduce((sum, i) => sum + i.weekly_cost, 0);
    const totalMonthlyCost = itemForecast.reduce((sum, i) => sum + i.monthly_cost, 0);
    const totalDailyAvg = itemForecast.reduce((sum, i) => sum + i.daily_avg, 0);

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, 63, pageWidth - 28, 18, 3, 3, 'F');
    doc.setFontSize(9);
    doc.text(`Daily Avg: ${totalDailyAvg.toFixed(1)} units`, 20, 73);
    doc.text(`Weekly Forecast: ${totalWeeklyQty.toFixed(0)} units | ${formatPdfCurrency(totalWeeklyCost)}`, 80, 73);
    doc.text(`Monthly Forecast: ${totalMonthlyQty.toFixed(0)} units | ${formatPdfCurrency(totalMonthlyCost)}`, 180, 73);

    // Data table with daily avg column
    autoTable(doc, {
      startY: 85,
      head: [['Item', 'Total Qty', 'Orders', 'Daily Avg', 'Weekly Qty', 'Weekly Par', 'Weekly Cost', 'Monthly Qty', 'Monthly Par', 'Monthly Cost']],
      body: itemForecast.map(item => [
        item.item_name,
        item.total_qty.toFixed(0),
        item.order_count.toString(),
        item.daily_avg.toFixed(2),
        item.weekly_qty.toFixed(1),
        item.weekly_par.toString(),
        formatPdfCurrency(item.weekly_cost),
        item.monthly_qty.toFixed(1),
        item.monthly_par.toString(),
        formatPdfCurrency(item.monthly_cost),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [34, 197, 94] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
      },
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header - Clean & Mobile Friendly */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => staffMode ? navigate('/procurement-pin-access') : navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Received Items</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {staffMode ? `Staff: ${staffName}` : 'Compare with purchase orders'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['po-received-records'] });
                queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
                toast.success("Refreshed");
              }}
              disabled={isLoadingRecent}
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingRecent ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/procurement-pin-access')}>
              <Smartphone className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowGuide(true)}>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-3 text-xs"
              onClick={() => setShowManualUpload(true)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Manual
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="h-8 px-3 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className={`h-3.5 w-3.5 mr-1.5 ${isUploading ? 'animate-pulse' : ''}`} />
              {isUploading ? 'Parsing...' : 'Receive'}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Workspace Selector - hidden in staff mode */}
        {!staffMode && (
          <ProcurementWorkspaceSelector 
            selectedWorkspaceId={selectedWorkspaceId}
            onSelectWorkspace={handleWorkspaceChange}
          />
        )}

        {/* Stats Row - Compact horizontal layout */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            <Card className="p-2 flex items-center gap-1.5 bg-blue-500/5 border-blue-500/20">
              <FileText className="h-4 w-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground leading-none">POs</p>
                <p className="text-sm font-bold leading-tight">{poCompletionStats.total}</p>
              </div>
            </Card>
            <Card 
              className="p-2 flex items-center gap-1.5 cursor-pointer bg-green-500/5 border-green-500/20 hover:bg-green-500/10 active:scale-95 transition-all"
              onClick={() => poCompletionStats.completed > 0 && setShowCompletedPOsDialog(true)}
            >
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground leading-none">Done</p>
                <p className="text-sm font-bold text-green-500 leading-tight">{poCompletionStats.completed}</p>
              </div>
            </Card>
            <Card 
              className="p-2 flex items-center gap-1.5 cursor-pointer bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10 active:scale-95 transition-all"
              onClick={() => poCompletionStats.pending > 0 && setShowPendingPOsDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-[9px] text-muted-foreground leading-none">Pending</p>
                <p className="text-sm font-bold text-amber-500 leading-tight">{poCompletionStats.pending}</p>
              </div>
            </Card>
          </div>
          <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as any)}>
            <SelectTrigger className="w-14 h-8 text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="USD">$</SelectItem>
              <SelectItem value="EUR">€</SelectItem>
              <SelectItem value="GBP">£</SelectItem>
              <SelectItem value="AED">د.إ</SelectItem>
              <SelectItem value="AUD">A$</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total Value Card - Clean prominent display */}
        <Card className="p-3 flex items-center justify-between bg-gradient-to-r from-green-500/5 to-green-500/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-green-500" />
            <span className="text-xs sm:text-sm text-muted-foreground">Total Value</span>
          </div>
          <span className="text-lg sm:text-xl font-bold text-green-500">{formatCurrency(calculatedTotalValue)}</span>
        </Card>

        {/* Tabs - Clean 4-column layout */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="overview" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Forecast</span>
            </TabsTrigger>
            <TabsTrigger value="prices" className="text-[10px] px-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingDown className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Prices</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - All Analytics Combined */}
          <TabsContent value="overview" className="mt-2 space-y-3">
            {/* Combined Procurement Analytics */}
            <CombinedProcurementAnalytics 
              purchaseAnalytics={purchaseOrderAnalytics}
              receivingAnalytics={receivingAnalytics}
              formatCurrency={formatCurrency}
              perDocumentComparison={perDocumentComparison}
              currency={currency}
            />

            {/* Recent Received Records Section */}
            <Card className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Recent Received
                </h4>
                <Badge variant="outline" className="text-xs">
                  {recentReceived?.length || 0} records
                </Badge>
              </div>
              
              {isLoadingRecent ? (
                <div className="text-center py-4 text-muted-foreground text-xs">Loading...</div>
              ) : recentReceived && recentReceived.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {recentReceived.slice(0, 10).map((record) => (
                    <div key={record.id} className="p-2 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-medium text-xs truncate">
                              {record.supplier_name || record.document_number || 'Delivery'}
                            </span>
                            <Badge 
                              variant="outline"
                              className={`text-[9px] h-4 px-1 ${record.status === 'received' ? 'bg-green-500/20 text-green-500 border-green-500/30' : ''}`}
                            >
                              {record.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{format(new Date(record.received_date), 'MMM d')}</span>
                            <span className="font-semibold text-foreground">{formatCurrency(Number(record.total_value || 0))}</span>
                            {record.received_by_name && <span className="text-green-500 truncate max-w-[80px]">{record.received_by_name}</span>}
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowRecordContent(record)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteReceivedRecord(record.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentReceived.length > 10 && (
                    <p className="text-center text-xs text-muted-foreground pt-2">
                      +{recentReceived.length - 10} more records
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="h-6 w-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No received records yet</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Summary Tab - Overall Aggregated Report */}
          <TabsContent value="summary" className="mt-3 sm:mt-4 space-y-3">
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-semibold text-sm sm:text-base">Overall Received</h3>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 text-xs sm:text-sm"
                onClick={() => {
                  if (!receivedSummary || receivedSummary.length === 0) {
                    toast.info("No received data to export");
                    return;
                  }

                  // jsPDF default fonts don't reliably support some currency symbols (e.g. AED Arabic glyphs).
                  // Use ISO codes in PDFs to guarantee readability.
                  const pdfCurrency = ((): string => {
                    const map: Record<string, string> = {
                      USD: 'USD',
                      EUR: 'EUR',
                      GBP: 'GBP',
                      AED: 'AED',
                      AUD: 'AUD',
                    };
                    return map[currency] || currency;
                  })();

                  const formatPdfCurrency = (value: number) =>
                    `${pdfCurrency} ${value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;

                  // Calculate period from received records
                  const dates = (recentReceived || [])
                    .map(r => new Date(r.received_date))
                    .filter(d => !isNaN(d.getTime()))
                    .sort((a, b) => a.getTime() - b.getTime());
                  const periodStart = dates.length > 0 ? format(dates[0], 'MMM d, yyyy') : 'N/A';
                  const periodEnd = dates.length > 0 ? format(dates[dates.length - 1], 'MMM d, yyyy') : 'N/A';
                  const periodText = periodStart === periodEnd ? periodStart : `${periodStart} - ${periodEnd}`;

                  const doc = new jsPDF();
                  const pageWidth = doc.internal.pageSize.getWidth();

                  doc.setFontSize(20);
                  doc.setFont('helvetica', 'bold');
                  doc.text('Overall Received Items Report', pageWidth / 2, 20, { align: 'center' });
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.text(`Period: ${periodText}`, pageWidth / 2, 28, { align: 'center' });
                  doc.setFontSize(8);
                  doc.setTextColor(120, 120, 120);
                  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 34, { align: 'center' });
                  doc.setTextColor(0, 0, 0);

                  // Summary totals
                  const totalQty = receivedSummary.reduce((sum, i) => sum + (i.total_qty || 0), 0);
                  const totalValue = receivedSummary.reduce((sum, i) => sum + (i.total_price || 0), 0);

                  doc.setFillColor(240, 240, 240);
                  doc.roundedRect(14, 40, pageWidth - 28, 15, 3, 3, 'F');
                  doc.setFontSize(10);
                  doc.text(
                    `Total Items: ${receivedSummary.length} | Total Qty: ${totalQty.toFixed(0)} | Total Value: ${formatPdfCurrency(totalValue)}`,
                    20,
                    50
                  );

                  autoTable(doc, {
                    startY: 60,
                    head: [['Item Name', 'Times Received', 'Total Qty', 'Avg Price', 'Total Value']],
                    body: receivedSummary.map((item: any) => [
                      item.item_name,
                      item.count?.toString() || '1',
                      item.total_qty?.toFixed(0) || '0',
                      formatPdfCurrency(item.avg_price || 0),
                      formatPdfCurrency(item.total_price || 0),
                    ]),
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [59, 130, 246] },
                    columnStyles: {
                      1: { halign: 'center' },
                      2: { halign: 'right' },
                      3: { halign: 'right' },
                      4: { halign: 'right' },
                    },
                  });

                  doc.save(`overall-received-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                  toast.success("Report downloaded");
                }}
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Download</span>
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 sm:h-10 text-sm"
              />
            </div>

            {/* Aggregated Summary - Mobile Card List + Desktop Table */}
            <Card className="overflow-hidden">
              {isLoadingReceived ? (
                <div className="p-4 text-center text-muted-foreground text-xs">Loading...</div>
              ) : receivedSummary && receivedSummary.length > 0 ? (
                <>
                  {/* Mobile Card View - Compact with scroll */}
                  <div className="sm:hidden max-h-[50vh] overflow-y-auto divide-y divide-border">
                    {receivedSummary
                      .filter((item: any) => item.item_name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((item: any, index: number) => (
                        <div key={index} className="px-2 py-1.5">
                          <p className="font-medium text-xs truncate">{item.item_name}</p>
                          <div className="flex justify-between items-center text-[10px] mt-0.5">
                            <span className="text-muted-foreground">Times: <span className="text-foreground">{item.count || 1}x</span></span>
                            <span className="text-muted-foreground">Qty: <span className="font-bold text-primary">{item.total_qty?.toFixed(0)}</span></span>
                            <span className="text-muted-foreground">Total: <span className="font-semibold text-green-500">{formatCurrency(item.total_price || 0)}</span></span>
                          </div>
                        </div>
                      ))}
                    {/* Mobile Totals */}
                    <div className="p-3 bg-muted/50">
                      <p className="font-bold text-sm mb-1">TOTAL</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Times: </span>
                          <span className="font-bold">{receivedSummary.reduce((sum: number, i: any) => sum + (i.count || 1), 0)}x</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Qty: </span>
                          <span className="font-bold text-primary">{receivedSummary.reduce((sum: number, i: any) => sum + (i.total_qty || 0), 0).toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value: </span>
                          <span className="font-bold text-green-600">{formatCurrency(receivedSummary.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
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
                            <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{item.count || 1}x</TableCell>
                            <TableCell className="text-right font-bold text-primary">{item.total_qty?.toFixed(0)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(item.avg_price || 0)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">{formatCurrency(item.total_price || 0)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">{receivedSummary.reduce((sum: number, i: any) => sum + (i.count || 1), 0)}x</TableCell>
                          <TableCell className="text-right text-primary">{receivedSummary.reduce((sum: number, i: any) => sum + (i.total_qty || 0), 0).toFixed(0)}</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(receivedSummary.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </>
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
          <TabsContent value="prices" className="mt-3 sm:mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm sm:text-base">Price Changes</h3>
              <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm" onClick={downloadPriceChangeReport}>
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Download
              </Button>
            </div>

            {priceHistory && priceHistory.length > 0 ? (
              <Card className="overflow-hidden">
                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-border">
                  {priceHistory.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 space-y-2">
                      <p className="font-medium text-sm truncate">{item.item_name}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Previous</span>
                          <span>{formatCurrency(item.previous_price || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Current</span>
                          <span className="font-semibold">{formatCurrency(item.current_price || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Change</span>
                          <span className={`font-semibold ${(item.change_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {(item.change_amount || 0) > 0 ? '+' : ''}{(item.change_pct || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
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
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(item.previous_price || 0)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.current_price || 0)}</TableCell>
                          <TableCell className={`text-right font-semibold ${(item.change_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {(item.change_amount || 0) > 0 ? '+' : ''}{formatCurrency(item.change_amount || 0)}
                            <span className="text-xs ml-1">({(item.change_pct || 0) > 0 ? '+' : ''}{(item.change_pct || 0).toFixed(1)}%)</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No price changes recorded</p>
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

      {/* Manual Text Upload Dialog */}
      <ManualTextUploadDialog
        open={showManualUpload}
        onOpenChange={setShowManualUpload}
        onConfirmSave={handleManualUploadSave}
        currencySymbol={currencySymbols[currency]}
      />

    </div>
  );
};

export default POReceivedItems;