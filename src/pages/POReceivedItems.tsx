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
      const { data, error } = await supabase
        .from('po_received_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('received_date', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as RecentReceived[];
    },
    enabled: !!user?.id
  });

  // Fetch price history for change tracking
  const { data: priceHistory } = useQuery({
    queryKey: ['po-price-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_price_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('changed_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
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

  const saveReceivedItems = async () => {
    if (!varianceReport || !selectedOrderId) {
      toast.error("No order matched to save items against");
      return;
    }
    
    try {
      for (const item of varianceReport.items) {
        if (item.received_qty > 0) {
          await addReceivedItem({
            purchase_order_id: selectedOrderId,
            item_name: item.item_name,
            quantity: item.received_qty,
            unit: item.unit,
            unit_price: item.received_price,
            total_price: (item.received_qty * (item.received_price || 0)),
            received_date: new Date().toISOString().split('T')[0]
          });
        }
      }
      toast.success("Received items saved");
      setShowVarianceDialog(false);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
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
              <p className="text-sm text-muted-foreground">Overall received inventory</p>
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
        {/* Totals Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{receivedTotals.totalQty.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${receivedTotals.totalPrice.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('summary')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Summary
          </Button>
          <Button 
            variant={viewMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('all')}
          >
            <Package className="h-4 w-4 mr-2" />
            All Items
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Items Table */}
        <Card>
          {isLoadingReceived ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : viewMode === 'summary' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.item_name}
                      {item.unit && <Badge variant="outline" className="ml-2 text-xs">{item.unit}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{item.total_qty.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.avg_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${item.total_price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!filteredItems || filteredItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No received items yet. Upload a receiving document to compare.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.item_name}
                      {item.unit && <Badge variant="outline" className="ml-2 text-xs">{item.unit}</Badge>}
                    </TableCell>
                    <TableCell>{new Date(item.received_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unit_price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-right font-semibold">${item.total_price?.toFixed(2) || '0.00'}</TableCell>
                  </TableRow>
                ))}
                {(!filteredItems || filteredItems.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No received items yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={downloadVarianceReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                {selectedOrderId && (
                  <Button onClick={saveReceivedItems}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Received Items
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POReceivedItems;