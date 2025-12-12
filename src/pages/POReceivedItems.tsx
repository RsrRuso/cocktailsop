import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseOrderMaster } from "@/hooks/usePurchaseOrderMaster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, DollarSign, Search, TrendingUp, Upload, FileText, Download, CheckCircle, XCircle, AlertTriangle, Calendar, Eye, Trash2, BarChart3, History, TrendingDown } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const { user } = useAuth();
  const { receivedItems, receivedSummary, receivedTotals, isLoadingReceived, addReceivedItem } = usePurchaseOrderMaster();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'all' | 'summary'>('summary');
  const [isUploading, setIsUploading] = useState(false);
  const [varianceReport, setVarianceReport] = useState<VarianceReport | null>(null);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'recent' | 'summary' | 'forecast' | 'prices'>('recent');
  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch recent received records
  const { data: recentReceived, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['po-recent-received', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('po_received_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('received_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as RecentReceived[];
    },
    enabled: !!user?.id
  });

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
    
    setIsUploading(true);
    toast.info("Processing receiving document...");
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let parsePayload: any = {};
          
          if (file.type === 'application/pdf') {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            parsePayload.pdfBase64 = btoa(binary);
          } else {
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
          
          // Get matching purchase order to compare
          const orderNumber = parsed.doc_no;
          let orderedItems: any[] = [];
          let matchedOrder: any = null;
          
          if (orderNumber) {
            const { data: orders } = await supabase
              .from('purchase_orders')
              .select('id, order_number, supplier_name, order_date')
              .eq('user_id', user?.id)
              .ilike('order_number', `%${orderNumber}%`)
              .limit(1);
            
            if (orders && orders.length > 0) {
              matchedOrder = orders[0];
              setSelectedOrderId(matchedOrder.id);
              
              const { data: items } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', matchedOrder.id);
              
              orderedItems = items || [];
            }
          }
          
          // If no order found by number, try to find by supplier
          if (orderedItems.length === 0 && parsed.location) {
            const { data: orders } = await supabase
              .from('purchase_orders')
              .select('id, order_number, supplier_name, order_date')
              .eq('user_id', user?.id)
              .ilike('supplier_name', `%${parsed.location}%`)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (orders && orders.length > 0) {
              matchedOrder = orders[0];
              setSelectedOrderId(matchedOrder.id);
              
              const { data: items } = await supabase
                .from('purchase_order_items')
                .select('*')
                .eq('purchase_order_id', matchedOrder.id);
              
              orderedItems = items || [];
            }
          }
          
          // Generate variance report
          const report = generateVarianceReport(
            orderedItems,
            parsed.items,
            matchedOrder?.order_number,
            matchedOrder?.order_date,
            matchedOrder?.supplier_name || parsed.location
          );
          
          setVarianceReport(report);
          setShowVarianceDialog(true);
          
          toast.success(`Analyzed ${parsed.items.length} received items`);
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
      
      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    } catch (error: any) {
      toast.error("Failed to upload: " + error.message);
      setIsUploading(false);
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
    const orderedMap = new Map<string, any>();
    const receivedMap = new Map<string, any>();
    
    // Build maps for comparison (normalize item names)
    orderedItems.forEach(item => {
      const key = (item.item_code || item.item_name).trim().toLowerCase();
      orderedMap.set(key, item);
    });
    
    receivedItems.forEach(item => {
      const key = (item.item_code || item.item_name).trim().toLowerCase();
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
        `$${(item.previous_price || 0).toFixed(2)}`,
        `$${(item.current_price || 0).toFixed(2)}`,
        `${item.change_amount > 0 ? '+' : ''}$${(item.change_amount || 0).toFixed(2)}`,
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
    doc.text(`Weekly: ${totalWeeklyQty.toFixed(0)} units | $${totalWeeklyCost.toFixed(2)}`, 20, 47);
    doc.text(`Monthly: ${totalMonthlyQty.toFixed(0)} units | $${totalMonthlyCost.toFixed(2)}`, 120, 47);
    doc.text(`Weekly Par (20% buffer): ${Math.ceil(totalWeeklyQty * 1.2)} units`, 220, 47);
    
    autoTable(doc, {
      startY: 60,
      head: [['Item', 'Total Qty', 'Weekly Qty', 'Weekly Par', 'Weekly Cost', 'Monthly Qty', 'Monthly Par', 'Monthly Cost']],
      body: itemForecast.map(item => [
        item.item_name,
        item.total_qty.toFixed(0),
        item.weekly_qty.toFixed(0),
        item.weekly_par.toString(),
        `$${item.weekly_cost.toFixed(2)}`,
        item.monthly_qty.toFixed(0),
        item.monthly_par.toString(),
        `$${item.monthly_cost.toFixed(2)}`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });
    
    doc.save(`par-stock-forecast-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
    toast.success("Par stock forecast report downloaded");
  };

  const saveReceivedItems = async () => {
    if (!varianceReport) {
      toast.error("No variance data to save");
      return;
    }
    
    try {
      // Save to received items
      for (const item of varianceReport.items) {
        if (item.received_qty > 0) {
          await addReceivedItem({
            purchase_order_id: selectedOrderId || undefined,
            item_name: item.item_name,
            quantity: item.received_qty,
            unit: item.unit,
            unit_price: item.received_price,
            total_price: (item.received_qty * (item.received_price || 0)),
            received_date: new Date().toISOString().split('T')[0]
          });
        }
      }
      
      // Save the received record
      const totalQty = varianceReport.items.reduce((sum, i) => sum + i.received_qty, 0);
      const totalValue = varianceReport.items.reduce((sum, i) => sum + (i.received_qty * (i.received_price || 0)), 0);
      
      await (supabase as any)
        .from('po_received_records')
        .insert({
          user_id: user?.id,
          supplier_name: varianceReport.supplier,
          document_number: varianceReport.order_number,
          received_date: new Date().toISOString().split('T')[0],
          total_items: varianceReport.items.length,
          total_quantity: totalQty,
          total_value: totalValue,
          status: 'completed',
          variance_data: varianceReport
        });
      
      queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
      toast.success("Received items saved");
      setShowVarianceDialog(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
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
      await (supabase as any)
        .from('po_received_records')
        .delete()
        .eq('id', id);
      
      queryClient.invalidateQueries({ queryKey: ['po-recent-received'] });
      toast.success("Record deleted");
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Qty Received</p>
                <p className="text-lg font-bold">{receivedTotals.totalQty.toFixed(0)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold">${receivedTotals.totalPrice.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

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
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(record.received_date), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${Number(record.total_value || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
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

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-4 space-y-3">
            <div className="flex gap-2 mb-3">
              <Button 
                variant={viewMode === 'summary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('summary')}
              >
                Grouped
              </Button>
              <Button 
                variant={viewMode === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('all')}
              >
                All Items
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

            <Card>
              {isLoadingReceived ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : viewMode === 'summary' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Avg $</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-sm">
                          {item.item_name}
                        </TableCell>
                        <TableCell className="text-right">{item.total_qty?.toFixed(0)}</TableCell>
                        <TableCell className="text-right">${item.avg_price?.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">${item.total_price?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {(!filteredItems || filteredItems.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No received items yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                        <TableCell className="text-xs">{format(new Date(item.received_date), 'PP')}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-semibold">${item.total_price?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        <span className="font-bold">${forecast.weeklyValue.toFixed(2)}</span>
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
                        <span className="font-bold">${forecast.monthlyValue.toFixed(2)}</span>
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
                          ${(item.previous_price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(item.current_price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          (item.change_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {(item.change_amount || 0) > 0 ? '+' : ''}${(item.change_amount || 0).toFixed(2)}
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

      {/* Variance Analysis Dialog */}
      <Dialog open={showVarianceDialog} onOpenChange={setShowVarianceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Receiving Variance Analysis
            </DialogTitle>
          </DialogHeader>

          {varianceReport && (
            <div className="space-y-4">
              {/* Order Info */}
              <Card className="p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Supplier</p>
                    <p className="font-medium">{varianceReport.supplier || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Order #</p>
                    <p className="font-medium">{varianceReport.order_number || 'Not matched'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Order Date</p>
                    <p className="font-medium">{varianceReport.order_date || '-'}</p>
                  </div>
                </div>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-5 gap-2">
                <Card className="p-3 text-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-500">{varianceReport.summary.matched}</p>
                  <p className="text-xs text-muted-foreground">Match</p>
                </Card>
                <Card className="p-3 text-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-500">{varianceReport.summary.short}</p>
                  <p className="text-xs text-muted-foreground">Short</p>
                </Card>
                <Card className="p-3 text-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-orange-500">{varianceReport.summary.over}</p>
                  <p className="text-xs text-muted-foreground">Over</p>
                </Card>
                <Card className="p-3 text-center">
                  <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-500">{varianceReport.summary.missing}</p>
                  <p className="text-xs text-muted-foreground">Missing</p>
                </Card>
                <Card className="p-3 text-center">
                  <Package className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-purple-500">{varianceReport.summary.extra}</p>
                  <p className="text-xs text-muted-foreground">Extra</p>
                </Card>
              </div>

              {/* Variance Items Table */}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceReport.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            <Badge className={getStatusBadge(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.item_code && (
                              <p className="text-xs text-muted-foreground">{item.item_code}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.ordered_qty} {item.unit || ''}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.received_qty} {item.unit || ''}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          item.variance > 0 ? 'text-orange-500' : 
                          item.variance < 0 ? 'text-red-500' : 
                          'text-green-500'
                        }`}>
                          {item.variance > 0 ? '+' : ''}{item.variance}
                          <span className="text-xs ml-1">({item.variance_pct.toFixed(1)}%)</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={downloadDiscrepancyReport}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Discrepancies Only
                </Button>
                <Button variant="outline" size="sm" onClick={downloadVarianceReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Full Report
                </Button>
                <Button size="sm" onClick={saveReceivedItems}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Items
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POReceivedItems;