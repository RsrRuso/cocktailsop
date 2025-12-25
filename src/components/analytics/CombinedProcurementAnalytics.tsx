import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, 
  Layers, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, 
  Leaf, Wrench, Download, FileSpreadsheet, FileText, Truck,
  ArrowRightLeft, Scale, Activity, Target, ClipboardList, Receipt
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import type { AnalyticsSummary, ItemSummary } from "@/hooks/usePurchaseOrderAnalytics";
import type { ReceivingAnalyticsSummary, ReceivingItemSummary } from "@/hooks/useReceivingAnalytics";

interface PerDocumentComparison {
  itemName: string;
  orderedQty: number;
  receivedQty: number;
  orderedValue: number;
  receivedValue: number;
  qtyVariance: number;
  valueVariance: number;
  status: 'match' | 'short' | 'over' | 'not-received' | 'extra';
}

interface CombinedProcurementAnalyticsProps {
  purchaseAnalytics: AnalyticsSummary;
  receivingAnalytics: ReceivingAnalyticsSummary;
  formatCurrency: (amount: number) => string;
  perDocumentComparison?: PerDocumentComparison[];
}

export const CombinedProcurementAnalytics = ({ 
  purchaseAnalytics, 
  receivingAnalytics, 
  formatCurrency,
  perDocumentComparison
}: CombinedProcurementAnalyticsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'variance' | 'trends'>('overview');

  // PDF-safe currency formatter
  const formatCurrencyPDF = (amount: number): string => {
    const parts = amount.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return 'AED ' + intPart + '.' + parts[1];
  };

  // PDF theme colors
  const pdfColors = {
    primary: [16, 185, 129] as [number, number, number],
    secondary: [139, 92, 246] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],
    darkAlt: [30, 41, 59] as [number, number, number],
    accent: [6, 182, 212] as [number, number, number],
    gold: [234, 179, 8] as [number, number, number],
    light: [248, 250, 252] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
    green: [34, 197, 94] as [number, number, number],
  };

  // Calculate combined metrics
  const totalOrdered = purchaseAnalytics.totalAmount;
  const totalReceived = receivingAnalytics.totalAmount;
  const valueVariance = totalOrdered - totalReceived;
  const variancePercent = totalOrdered > 0 ? ((valueVariance / totalOrdered) * 100) : 0;

  const itemsOrdered = purchaseAnalytics.totalItems;
  const itemsReceived = receivingAnalytics.totalItems;
  const itemVariance = itemsOrdered - itemsReceived;

  const ordersCount = purchaseAnalytics.totalOrders;
  const receiptsCount = receivingAnalytics.totalReceipts;
  const fulfillmentRate = ordersCount > 0 ? ((receiptsCount / ordersCount) * 100) : 0;

  // Get all items from both analytics
  const purchaseItemsList = purchaseAnalytics.topItems || [];
  const receivingItemsList = receivingAnalytics.topItems || [];

  // Compare items between purchase and receiving
  // Use per-document comparison if provided (accurate), otherwise fallback to aggregate comparison
  const compareItems = (): PerDocumentComparison[] => {
    // If we have per-document comparison data, use it (this is the accurate method)
    if (perDocumentComparison && perDocumentComparison.length > 0) {
      return perDocumentComparison;
    }

    // Fallback to aggregate comparison (less accurate for variance)
    const purchaseItems = new Map<string, ItemSummary>();
    const receivingItems = new Map<string, ReceivingItemSummary>();
    
    purchaseItemsList.forEach(item => {
      purchaseItems.set(item.item_name.toLowerCase(), item);
    });
    
    receivingItemsList.forEach(item => {
      receivingItems.set(item.item_name.toLowerCase(), item);
    });

    const comparison: PerDocumentComparison[] = [];

    // Check ordered items
    purchaseItems.forEach((pItem, key) => {
      const rItem = receivingItems.get(key);
      if (rItem) {
        const qtyVariance = pItem.totalQuantity - rItem.totalQuantity;
        const valVariance = pItem.totalAmount - rItem.totalAmount;
        let status: 'match' | 'short' | 'over' = 'match';
        if (qtyVariance > 0.5) status = 'short';
        else if (qtyVariance < -0.5) status = 'over';

        comparison.push({
          itemName: pItem.item_name,
          orderedQty: pItem.totalQuantity,
          receivedQty: rItem.totalQuantity,
          orderedValue: pItem.totalAmount,
          receivedValue: rItem.totalAmount,
          qtyVariance,
          valueVariance: valVariance,
          status
        });
      } else {
        comparison.push({
          itemName: pItem.item_name,
          orderedQty: pItem.totalQuantity,
          receivedQty: 0,
          orderedValue: pItem.totalAmount,
          receivedValue: 0,
          qtyVariance: pItem.totalQuantity,
          valueVariance: pItem.totalAmount,
          status: 'not-received'
        });
      }
    });

    // Check extra received items
    receivingItems.forEach((rItem, key) => {
      if (!purchaseItems.has(key)) {
        comparison.push({
          itemName: rItem.item_name,
          orderedQty: 0,
          receivedQty: rItem.totalQuantity,
          orderedValue: 0,
          receivedValue: rItem.totalAmount,
          qtyVariance: -rItem.totalQuantity,
          valueVariance: -rItem.totalAmount,
          status: 'extra'
        });
      }
    });

    return comparison.sort((a, b) => Math.abs(b.valueVariance) - Math.abs(a.valueVariance));
  };

  const itemComparison = compareItems();
  const shortItems = itemComparison.filter(i => i.status === 'short' || i.status === 'not-received');
  const overItems = itemComparison.filter(i => i.status === 'over' || i.status === 'extra');
  const matchedItems = itemComparison.filter(i => i.status === 'match');

  // Download helpers
  const downloadExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, fileName + '_' + format(new Date(), 'yyyy-MM-dd') + '.xlsx');
      toast.success('Downloaded ' + fileName);
    } catch (error) {
      toast.error('Failed to download');
      console.error(error);
    }
  };

  // Enhanced PDF Download
  const downloadComparisonPDF = () => {
    try {
      toast.info('Generating comparison report...');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 45, pageWidth, 3, 'F');
      doc.rect(0, 0, 5, 45, 'F');

      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCUREMENT COMPARISON', 15, 22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Purchase vs Receiving Analysis', 15, 32);
      doc.text(format(new Date(), 'MMMM d, yyyy'), pageWidth - 50, 32);

      // Summary Cards
      let yPos = 58;
      doc.setFillColor(...pdfColors.light);
      doc.rect(10, yPos, pageWidth - 20, 35, 'F');

      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      const cardWidth = (pageWidth - 30) / 4;
      
      // Card 1 - Total Ordered
      doc.text('TOTAL ORDERED', 15, yPos + 10);
      doc.setFontSize(14);
      doc.setTextColor(...pdfColors.secondary);
      doc.text(formatCurrencyPDF(totalOrdered), 15, yPos + 22);

      // Card 2 - Total Received
      doc.setFontSize(9);
      doc.setTextColor(...pdfColors.dark);
      doc.text('TOTAL RECEIVED', 15 + cardWidth, yPos + 10);
      doc.setFontSize(14);
      doc.setTextColor(...pdfColors.primary);
      doc.text(formatCurrencyPDF(totalReceived), 15 + cardWidth, yPos + 22);

      // Card 3 - Variance
      doc.setFontSize(9);
      doc.setTextColor(...pdfColors.dark);
      doc.text('VARIANCE', 15 + cardWidth * 2, yPos + 10);
      doc.setFontSize(14);
      const varColor = valueVariance >= 0 ? pdfColors.green : pdfColors.red;
      doc.setTextColor(...varColor);
      doc.text(formatCurrencyPDF(Math.abs(valueVariance)), 15 + cardWidth * 2, yPos + 22);

      // Card 4 - Fulfillment
      doc.setFontSize(9);
      doc.setTextColor(...pdfColors.dark);
      doc.text('FULFILLMENT', 15 + cardWidth * 3, yPos + 10);
      doc.setFontSize(14);
      doc.setTextColor(...pdfColors.accent);
      doc.text(fulfillmentRate.toFixed(1) + '%', 15 + cardWidth * 3, yPos + 22);

      yPos += 45;

      // Variance Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...pdfColors.dark);
      doc.text('Item Variance Analysis', 14, yPos);
      yPos += 5;

      const varianceRows = itemComparison.slice(0, 20).map(item => [
        item.itemName.substring(0, 25),
        item.orderedQty.toFixed(2),
        item.receivedQty.toFixed(2),
        item.qtyVariance.toFixed(2),
        formatCurrencyPDF(item.valueVariance),
        item.status.toUpperCase()
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Ordered', 'Received', 'Qty Var', 'Value Var', 'Status']],
        body: varianceRows,
        theme: 'plain',
        headStyles: {
          fillColor: pdfColors.dark,
          textColor: pdfColors.white,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: pdfColors.dark,
        },
        alternateRowStyles: {
          fillColor: pdfColors.light,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          5: { fontStyle: 'bold' }
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...pdfColors.dark);
        doc.rect(0, doc.internal.pageSize.getHeight() - 15, pageWidth, 15, 'F');
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(8);
        doc.text('Procurement Comparison Report', 14, doc.internal.pageSize.getHeight() - 6);
        doc.text('Page ' + i + ' of ' + pageCount, pageWidth - 30, doc.internal.pageSize.getHeight() - 6);
      }

      doc.save('Procurement_Comparison_' + format(new Date(), 'yyyy-MM-dd') + '.pdf');
      toast.success('Comparison report downloaded!');
    } catch (error) {
      toast.error('Failed to generate PDF');
      console.error(error);
    }
  };

  const downloadVarianceExcel = () => {
    const data = itemComparison.map(item => ({
      'Item Name': item.itemName,
      'Ordered Quantity': item.orderedQty,
      'Received Quantity': item.receivedQty,
      'Quantity Variance': item.qtyVariance,
      'Ordered Value': item.orderedValue,
      'Received Value': item.receivedValue,
      'Value Variance': item.valueVariance,
      'Status': item.status.toUpperCase()
    }));
    downloadExcel(data, 'Procurement_Variance', 'Variance');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'match': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'short': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'over': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'not-received': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'extra': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border-emerald-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-emerald-400" />
          <h3 className="font-semibold text-lg">Combined Analytics</h3>
          <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
            Purchase vs Receiving
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadVarianceExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={downloadComparisonPDF}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview" className="text-xs">
            <PieChart className="h-3 w-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="variance" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            Variance
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-muted-foreground">Total Ordered</span>
              </div>
              <p className="text-lg font-bold text-purple-400">{formatCurrency(totalOrdered)}</p>
              <p className="text-xs text-muted-foreground">{ordersCount} orders</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Total Received</span>
              </div>
              <p className="text-lg font-bold text-cyan-400">{formatCurrency(totalReceived)}</p>
              <p className="text-xs text-muted-foreground">{receiptsCount} receipts</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-3 rounded-lg ${valueVariance >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} border`}
            >
              <div className="flex items-center gap-2 mb-2">
                {valueVariance >= 0 ? (
                  <ArrowDownRight className="h-4 w-4 text-green-400" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-400" />
                )}
                <span className="text-xs text-muted-foreground">Value Variance</span>
              </div>
              <p className={`text-lg font-bold ${valueVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(Math.abs(valueVariance))}
              </p>
              <p className="text-xs text-muted-foreground">{Math.abs(variancePercent).toFixed(1)}% difference</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Fulfillment Rate</span>
              </div>
              <p className="text-lg font-bold text-amber-400">{fulfillmentRate.toFixed(1)}%</p>
              <Progress value={Math.min(fulfillmentRate, 100)} className="h-1 mt-1" />
            </motion.div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 bg-green-500/10 border-green-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-400">Matched Items</span>
                <Badge className="bg-green-500/20 text-green-400">{matchedItems.length}</Badge>
              </div>
            </Card>
            <Card className="p-3 bg-red-500/10 border-red-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-400">Short/Missing</span>
                <Badge className="bg-red-500/20 text-red-400">{shortItems.length}</Badge>
              </div>
            </Card>
            <Card className="p-3 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-400">Over/Extra</span>
                <Badge className="bg-amber-500/20 text-amber-400">{overItems.length}</Badge>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Purchasing Summary */}
            <Card className="p-3 bg-purple-500/10 border-purple-500/30">
              <h4 className="font-medium text-purple-400 mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Purchasing
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span>{ordersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="text-purple-400">{formatCurrency(totalOrdered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique Items</span>
                  <span>{purchaseAnalytics.uniqueItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Items</span>
                  <span className="text-green-400">{purchaseAnalytics.marketItems.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Items</span>
                  <span className="text-amber-400">{purchaseAnalytics.materialItems.items.length}</span>
                </div>
              </div>
            </Card>

            {/* Receiving Summary */}
            <Card className="p-3 bg-cyan-500/10 border-cyan-500/30">
              <h4 className="font-medium text-cyan-400 mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Receiving
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Receipts</span>
                  <span>{receiptsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Value</span>
                  <span className="text-cyan-400">{formatCurrency(totalReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique Items</span>
                  <span>{receivingAnalytics.uniqueItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Market Items</span>
                  <span className="text-green-400">{receivingAnalytics.marketItems.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Items</span>
                  <span className="text-amber-400">{receivingAnalytics.materialItems.items.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="variance" className="space-y-3">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {itemComparison.slice(0, 15).map((item, idx) => (
                <motion.div
                  key={item.itemName}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate flex-1">{item.itemName}</span>
                    <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                      {item.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Ordered:</span>
                      <span className="ml-1">{item.orderedQty.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Received:</span>
                      <span className="ml-1">{item.receivedQty.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Qty Var:</span>
                      <span className={`ml-1 ${item.qtyVariance > 0 ? 'text-red-400' : item.qtyVariance < 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {item.qtyVariance > 0 ? '-' : item.qtyVariance < 0 ? '+' : ''}{Math.abs(item.qtyVariance).toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Val Var:</span>
                      <span className={`ml-1 ${item.valueVariance > 0 ? 'text-red-400' : item.valueVariance < 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {formatCurrency(Math.abs(item.valueVariance))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {itemComparison.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No variance data available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="trends" className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Purchasing Trends */}
            <Card className="p-3">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Purchasing Trend
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Weekly Change</span>
                  <span className={purchaseAnalytics.weeklyTrend >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {purchaseAnalytics.weeklyTrend >= 0 ? '+' : ''}{purchaseAnalytics.weeklyTrend.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Monthly Change</span>
                  <span className={purchaseAnalytics.monthlyComparison.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {purchaseAnalytics.monthlyComparison.change >= 0 ? '+' : ''}{purchaseAnalytics.monthlyComparison.change.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Daily Average</span>
                  <span>{formatCurrency(purchaseAnalytics.dailyAverage)}</span>
                </div>
              </div>
            </Card>

            {/* Receiving Trends */}
            <Card className="p-3">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-400" />
                Receiving Trend
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Weekly Change</span>
                  <span className={receivingAnalytics.weeklyTrend >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {receivingAnalytics.weeklyTrend >= 0 ? '+' : ''}{receivingAnalytics.weeklyTrend.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Monthly Change</span>
                  <span className={receivingAnalytics.monthlyComparison.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {receivingAnalytics.monthlyComparison.change >= 0 ? '+' : ''}{receivingAnalytics.monthlyComparison.change.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Daily Average</span>
                  <span>{formatCurrency(receivingAnalytics.dailyAverage)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Monthly Comparison */}
          <Card className="p-3">
            <h4 className="font-medium text-sm mb-3">Monthly Comparison</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Month (Purchasing)</p>
                <p className="text-lg font-semibold text-purple-400">{formatCurrency(purchaseAnalytics.monthlyComparison.current)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Month (Receiving)</p>
                <p className="text-lg font-semibold text-cyan-400">{formatCurrency(receivingAnalytics.monthlyComparison.current)}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
