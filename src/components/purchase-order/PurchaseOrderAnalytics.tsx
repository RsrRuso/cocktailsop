import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  TrendingUp, TrendingDown, Package, DollarSign, Calendar, 
  ShoppingCart, Layers, BarChart3, PieChart, List, ArrowUpRight, 
  ArrowDownRight, Leaf, Wrench, Box, Download, FileSpreadsheet,
  ChevronDown, ChevronRight, Hash, FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import type { AnalyticsSummary, ItemSummary, DateItemDetail } from "@/hooks/usePurchaseOrderAnalytics";

interface PurchaseOrderAnalyticsProps {
  analytics: AnalyticsSummary;
  formatCurrency: (amount: number) => string;
}

export const PurchaseOrderAnalytics = ({ analytics, formatCurrency }: PurchaseOrderAnalyticsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'material' | 'combined' | 'dates'>('overview');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleDateExpanded = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const toggleItemExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  // Download helpers
  const downloadExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error('Failed to download');
      console.error(error);
    }
  };

  // PDF theme colors
  const pdfColors = {
    primary: [16, 185, 129] as [number, number, number], // Emerald
    secondary: [139, 92, 246] as [number, number, number], // Purple
    dark: [30, 41, 59] as [number, number, number], // Slate-800
    accent: [245, 158, 11] as [number, number, number], // Amber
    light: [248, 250, 252] as [number, number, number], // Slate-50
    muted: [148, 163, 184] as [number, number, number], // Slate-400
    white: [255, 255, 255] as [number, number, number],
  };

  // Enhanced PDF Download helper
  const downloadPDF = (title: string, headers: string[], rows: (string | number)[][], fileName: string, accentColor?: [number, number, number]) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const color = accentColor || pdfColors.primary;
      
      // Gradient-like header with decorative elements
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Accent bar
      doc.setFillColor(...color);
      doc.rect(0, 40, pageWidth, 4, 'F');
      
      // Decorative circle
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(pageWidth - 25, 20, 12, 'F');
      
      // Title
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 22);
      
      // Subtitle
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text(`Generated: ${format(new Date(), 'EEEE, dd MMMM yyyy • HH:mm')}`, 14, 32);
      
      // Stats summary bar
      doc.setFillColor(...pdfColors.light);
      doc.roundedRect(14, 50, pageWidth - 28, 18, 3, 3, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Records: ${rows.length}`, 20, 61);
      
      // Table with enhanced styling
      autoTable(doc, {
        head: [headers],
        body: rows.map(row => row.map(cell => String(cell))),
        startY: 75,
        theme: 'grid',
        headStyles: { 
          fillColor: color,
          textColor: pdfColors.white,
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 5,
          halign: 'center'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 4,
          lineColor: [226, 232, 240],
          lineWidth: 0.5
        },
        alternateRowStyles: { 
          fillColor: pdfColors.light
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
        },
        didDrawPage: (data) => {
          // Add decorative footer line
          doc.setDrawColor(...color);
          doc.setLineWidth(2);
          doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
        }
      });
      
      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...pdfColors.muted);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Purchase Order Analytics', 14, pageHeight - 10);
        doc.text(format(new Date(), 'yyyy-MM-dd'), pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
      
      doc.save(`${fileName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success(`Downloaded ${fileName}.pdf`);
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  const downloadOverviewPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Dark header with gradient effect
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Accent strip
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 50, pageWidth, 5, 'F');
      
      // Title
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Analytics Overview', 14, 28);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Purchase Order Summary Report', 14, 40);
      doc.text(format(new Date(), 'dd MMMM yyyy'), pageWidth - 14, 40, { align: 'right' });
      
      // Key metrics cards
      let yPos = 70;
      const cardWidth = (pageWidth - 42) / 3;
      
      const metrics = [
        { label: 'Total Orders', value: String(analytics.totalOrders), color: pdfColors.primary },
        { label: 'Total Spend', value: formatCurrency(analytics.totalAmount), color: pdfColors.accent },
        { label: 'Unique Items', value: String(analytics.uniqueItems), color: pdfColors.secondary },
      ];
      
      metrics.forEach((metric, idx) => {
        const x = 14 + (idx * (cardWidth + 7));
        doc.setFillColor(...metric.color);
        doc.roundedRect(x, yPos, cardWidth, 35, 4, 4, 'F');
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(metric.label.toUpperCase(), x + 8, yPos + 12);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(metric.value, x + 8, yPos + 27);
      });
      
      yPos += 50;
      
      // Section header
      doc.setFillColor(...pdfColors.light);
      doc.roundedRect(14, yPos, pageWidth - 28, 12, 2, 2, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED METRICS', 20, yPos + 8);
      
      yPos += 20;
      
      // Detailed metrics table
      autoTable(doc, {
        body: [
          ['Average Order Value', formatCurrency(analytics.avgOrderValue), 'Daily Average', formatCurrency(analytics.dailyAverage)],
          ['Weekly Trend', `${analytics.weeklyTrend >= 0 ? '+' : ''}${analytics.weeklyTrend.toFixed(1)}%`, 'Monthly Change', `${analytics.monthlyComparison.change >= 0 ? '+' : ''}${analytics.monthlyComparison.change.toFixed(1)}%`],
          ['This Month', formatCurrency(analytics.monthlyComparison.current), 'Last Month', formatCurrency(analytics.monthlyComparison.previous)],
        ],
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: pdfColors.muted },
          2: { fontStyle: 'bold', textColor: pdfColors.muted }
        },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Category breakdown
      doc.setFillColor(...pdfColors.light);
      doc.roundedRect(14, yPos, pageWidth - 28, 12, 2, 2, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CATEGORY BREAKDOWN', 20, yPos + 8);
      
      yPos += 20;
      
      // Market card
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(14, yPos, (pageWidth - 35) / 2, 30, 3, 3, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(8);
      doc.text('MARKET / FRESH ITEMS', 20, yPos + 10);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${analytics.marketItems.count} items • ${formatCurrency(analytics.marketItems.amount)}`, 20, yPos + 22);
      
      // Material card
      const materialX = 14 + (pageWidth - 35) / 2 + 7;
      doc.setFillColor(139, 92, 246);
      doc.roundedRect(materialX, yPos, (pageWidth - 35) / 2, 30, 3, 3, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('MATERIALS / SUPPLIES', materialX + 6, yPos + 10);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${analytics.materialItems.count} items • ${formatCurrency(analytics.materialItems.amount)}`, materialX + 6, yPos + 22);
      
      // Footer
      doc.setDrawColor(...pdfColors.primary);
      doc.setLineWidth(2);
      doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
      doc.setFontSize(8);
      doc.setTextColor(...pdfColors.muted);
      doc.text('Purchase Order Analytics • Overview Report', 14, pageHeight - 10);
      doc.text(format(new Date(), 'yyyy-MM-dd'), pageWidth - 14, pageHeight - 10, { align: 'right' });
      
      doc.save(`PO_Analytics_Overview_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Downloaded overview PDF');
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  const downloadTopItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Code', 'Category', 'Qty', 'Amount', 'Orders', 'Days'];
    const rows = analytics.topItems.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.item_code || '-',
      item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      `${item.totalQuantity.toFixed(1)} ${item.unit || 'units'}`,
      formatCurrency(item.totalAmount),
      item.orderCount,
      item.purchaseDays
    ]);
    downloadPDF('Top Items by Spend', headers, rows, 'PO_Top_Items', pdfColors.accent);
  };

  const downloadSuppliersPDF = () => {
    const headers = ['#', 'Supplier', 'Order Count', 'Total Amount'];
    const rows = analytics.ordersBySupplier.map((s, idx) => [
      idx + 1,
      s.supplier,
      s.count,
      formatCurrency(s.amount)
    ]);
    downloadPDF('Top Suppliers', headers, rows, 'PO_Suppliers', pdfColors.dark);
  };

  const downloadMarketItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Code', 'Qty', 'Amount', 'Orders', 'Days', 'First', 'Last'];
    const rows = analytics.marketItems.items.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.item_code || '-',
      `${item.totalQuantity.toFixed(1)} ${item.unit || 'units'}`,
      formatCurrency(item.totalAmount),
      item.orderCount,
      item.purchaseDays,
      item.firstPurchaseDate || '-',
      item.lastPurchaseDate || '-'
    ]);
    downloadPDF('Market / Fresh Items', headers, rows, 'PO_Market_Items', pdfColors.primary);
  };

  const downloadMaterialItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Code', 'Qty', 'Amount', 'Orders', 'Days', 'First', 'Last'];
    const rows = analytics.materialItems.items.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.item_code || '-',
      `${item.totalQuantity.toFixed(1)} ${item.unit || 'units'}`,
      formatCurrency(item.totalAmount),
      item.orderCount,
      item.purchaseDays,
      item.firstPurchaseDate || '-',
      item.lastPurchaseDate || '-'
    ]);
    downloadPDF('Materials / Supplies', headers, rows, 'PO_Material_Items', pdfColors.secondary);
  };

  const downloadAllItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Code', 'Category', 'Qty', 'Amount', 'Orders', 'Days'];
    const rows = analytics.topItems.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.item_code || '-',
      item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      `${item.totalQuantity.toFixed(1)} ${item.unit || 'units'}`,
      formatCurrency(item.totalAmount),
      item.orderCount,
      item.purchaseDays
    ]);
    downloadPDF('All Items Combined', headers, rows, 'PO_All_Items', pdfColors.dark);
  };

  const downloadOrdersByDatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Header
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setFillColor(...pdfColors.accent);
      doc.rect(0, 40, pageWidth, 4, 'F');
      
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Orders by Date', 14, 22);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(`${analytics.ordersByDate.length} days with orders`, 14, 32);
      doc.text(format(new Date(), 'dd MMMM yyyy'), pageWidth - 14, 32, { align: 'right' });
      
      let yPos = 55;
      
      analytics.ordersByDate.slice().reverse().forEach((dayData, dayIdx) => {
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        }
        
        const marketCount = dayData.items.filter(i => i.category === 'market').length;
        const materialCount = dayData.items.filter(i => i.category === 'material').length;
        
        // Date header card
        doc.setFillColor(...pdfColors.dark);
        doc.roundedRect(14, yPos, pageWidth - 28, 18, 3, 3, 'F');
        
        // Day indicator
        doc.setFillColor(...pdfColors.accent);
        doc.roundedRect(16, yPos + 2, 28, 14, 2, 2, 'F');
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(format(parseISO(dayData.date), 'd'), 30, yPos + 11, { align: 'center' });
        
        // Date info
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${format(parseISO(dayData.date), 'EEEE, dd MMM yyyy')}`, 50, yPos + 8);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 180, 180);
        doc.text(`${dayData.count} orders • ${dayData.items.length} items • M:${marketCount} T:${materialCount}`, 50, yPos + 14);
        
        // Amount
        doc.setTextColor(...pdfColors.accent);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(dayData.amount), pageWidth - 18, yPos + 11, { align: 'right' });
        
        yPos += 22;
        
        // Items table
        if (dayData.items.length > 0) {
          autoTable(doc, {
            head: [['Item', 'Cat', 'Qty', 'Amount']],
            body: dayData.items.sort((a, b) => b.amount - a.amount).map(item => [
              item.item_name,
              item.category === 'market' ? 'M' : item.category === 'material' ? 'T' : 'O',
              `${item.quantity} ${item.unit || ''}`,
              formatCurrency(item.amount)
            ]),
            startY: yPos,
            theme: 'plain',
            headStyles: { 
              fillColor: pdfColors.light,
              textColor: pdfColors.dark,
              fontStyle: 'bold',
              fontSize: 7,
              cellPadding: 3
            },
            styles: { 
              fontSize: 7,
              cellPadding: 2.5,
              textColor: pdfColors.dark
            },
            alternateRowStyles: { fillColor: [252, 252, 253] },
            margin: { left: 14, right: 14 },
            columnStyles: {
              1: { halign: 'center', cellWidth: 15 },
              3: { halign: 'right' }
            }
          });
          yPos = (doc as any).lastAutoTable.finalY + 8;
        }
      });
      
      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...pdfColors.accent);
        doc.setLineWidth(1);
        doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
        doc.setFontSize(8);
        doc.setTextColor(...pdfColors.muted);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      }
      
      doc.save(`PO_Orders_By_Date_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Downloaded Orders by Date PDF');
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  const downloadFullReportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // ===== COVER PAGE =====
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Decorative elements
      doc.setFillColor(...pdfColors.primary);
      doc.circle(pageWidth + 30, -30, 80, 'F');
      doc.setFillColor(...pdfColors.secondary);
      doc.circle(-20, pageHeight + 20, 60, 'F');
      doc.setFillColor(...pdfColors.accent);
      doc.roundedRect(14, 60, 6, 50, 3, 3, 'F');
      
      // Title
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('Purchase Order', 28, 85);
      doc.setFontSize(32);
      doc.text('Analytics Report', 28, 100);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Comprehensive spending analysis and insights', 28, 120);
      doc.text(format(new Date(), 'EEEE, dd MMMM yyyy'), 28, 135);
      
      // Key stats on cover
      const coverStats = [
        { label: 'Total Orders', value: analytics.totalOrders, color: pdfColors.primary },
        { label: 'Unique Items', value: analytics.uniqueItems, color: pdfColors.secondary },
        { label: 'Total Spend', value: formatCurrency(analytics.totalAmount), color: pdfColors.accent },
      ];
      
      coverStats.forEach((stat, idx) => {
        const y = 170 + (idx * 28);
        doc.setFillColor(...stat.color);
        doc.roundedRect(28, y, 5, 18, 2, 2, 'F');
        doc.setTextColor(180, 180, 180);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label.toUpperCase(), 40, y + 7);
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(stat.value), 40, y + 17);
      });
      
      // ===== OVERVIEW PAGE =====
      doc.addPage();
      
      // Section header
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 0, 8, pageHeight, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Overview Summary', 20, 25);
      doc.setDrawColor(...pdfColors.primary);
      doc.setLineWidth(2);
      doc.line(20, 30, 80, 30);
      
      // Metrics grid
      let yPos = 45;
      const metricsData = [
        ['Total Orders', String(analytics.totalOrders), 'Total Spend', formatCurrency(analytics.totalAmount)],
        ['Avg Order Value', formatCurrency(analytics.avgOrderValue), 'Daily Average', formatCurrency(analytics.dailyAverage)],
        ['Weekly Trend', `${analytics.weeklyTrend >= 0 ? '+' : ''}${analytics.weeklyTrend.toFixed(1)}%`, 'Monthly Change', `${analytics.monthlyComparison.change >= 0 ? '+' : ''}${analytics.monthlyComparison.change.toFixed(1)}%`],
      ];
      
      autoTable(doc, {
        body: metricsData,
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 8 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: pdfColors.muted, cellWidth: 45 },
          1: { fontStyle: 'bold', textColor: pdfColors.dark, cellWidth: 50 },
          2: { fontStyle: 'bold', textColor: pdfColors.muted, cellWidth: 45 },
          3: { fontStyle: 'bold', textColor: pdfColors.dark }
        },
        margin: { left: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 20;
      
      // Category cards
      const cardWidth = (pageWidth - 50) / 2;
      
      doc.setFillColor(...pdfColors.primary);
      doc.roundedRect(20, yPos, cardWidth, 40, 4, 4, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('MARKET / FRESH ITEMS', 28, yPos + 14);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${analytics.marketItems.count} items`, 28, yPos + 28);
      doc.setFontSize(11);
      doc.text(formatCurrency(analytics.marketItems.amount), 28, yPos + 38);
      
      doc.setFillColor(...pdfColors.secondary);
      doc.roundedRect(30 + cardWidth, yPos, cardWidth, 40, 4, 4, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('MATERIALS / SUPPLIES', 38 + cardWidth, yPos + 14);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${analytics.materialItems.count} items`, 38 + cardWidth, yPos + 28);
      doc.setFontSize(11);
      doc.text(formatCurrency(analytics.materialItems.amount), 38 + cardWidth, yPos + 38);
      
      yPos += 55;
      
      // Top Items section
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 15 Items by Spend', 20, yPos);
      yPos += 5;
      
      autoTable(doc, {
        head: [['#', 'Item Name', 'Category', 'Qty', 'Amount', 'Orders', 'Days']],
        body: analytics.topItems.slice(0, 15).map((item, idx) => [
          idx + 1,
          item.item_name.substring(0, 28),
          item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
          item.totalQuantity.toFixed(1),
          formatCurrency(item.totalAmount),
          item.orderCount,
          item.purchaseDays
        ]),
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: pdfColors.dark, textColor: pdfColors.white, fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 3 },
        alternateRowStyles: { fillColor: pdfColors.light },
        margin: { left: 20, right: 14 },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 } }
      });
      
      // ===== SUPPLIERS PAGE =====
      doc.addPage();
      
      doc.setFillColor(...pdfColors.secondary);
      doc.rect(0, 0, 8, pageHeight, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Supplier Analysis', 20, 25);
      doc.setDrawColor(...pdfColors.secondary);
      doc.setLineWidth(2);
      doc.line(20, 30, 80, 30);
      
      yPos = 45;
      
      autoTable(doc, {
        head: [['Rank', 'Supplier', 'Orders', 'Total Amount', '% of Total']],
        body: analytics.ordersBySupplier.slice(0, 15).map((s, idx) => [
          idx + 1,
          s.supplier,
          s.count,
          formatCurrency(s.amount),
          `${((s.amount / analytics.totalAmount) * 100).toFixed(1)}%`
        ]),
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: pdfColors.secondary, textColor: pdfColors.white, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 4 },
        alternateRowStyles: { fillColor: pdfColors.light },
        margin: { left: 20, right: 14 },
        columnStyles: { 
          0: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right' }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 25;
      
      // Recent dates summary
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Recent Orders Summary', 20, yPos);
      yPos += 5;
      
      autoTable(doc, {
        head: [['Date', 'Day', 'Orders', 'Items', 'Amount']],
        body: analytics.ordersByDate.slice().reverse().slice(0, 12).map(d => [
          format(parseISO(d.date), 'dd MMM yyyy'),
          format(parseISO(d.date), 'EEE'),
          d.count,
          d.items.length,
          formatCurrency(d.amount)
        ]),
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: pdfColors.accent, textColor: pdfColors.white, fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: pdfColors.light },
        margin: { left: 20, right: 14 },
        columnStyles: { 4: { halign: 'right' } }
      });
      
      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) { // Skip cover page
          doc.setFontSize(8);
          doc.setTextColor(...pdfColors.muted);
          doc.text(`Purchase Order Analytics Report`, 20, pageHeight - 10);
          doc.text(`Page ${i - 1} of ${pageCount - 1}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
      }
      
      doc.save(`PO_Full_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Downloaded full report PDF');
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  const downloadOverview = () => {
    const data = [
      { Metric: 'Total Orders', Value: analytics.totalOrders },
      { Metric: 'Total Spend', Value: analytics.totalAmount.toFixed(2) },
      { Metric: 'Average Order Value', Value: analytics.avgOrderValue.toFixed(2) },
      { Metric: 'Daily Average', Value: analytics.dailyAverage.toFixed(2) },
      { Metric: 'Weekly Trend (%)', Value: analytics.weeklyTrend.toFixed(1) },
      { Metric: 'This Month', Value: analytics.monthlyComparison.current.toFixed(2) },
      { Metric: 'Last Month', Value: analytics.monthlyComparison.previous.toFixed(2) },
      { Metric: 'Monthly Change (%)', Value: analytics.monthlyComparison.change.toFixed(1) },
      { Metric: 'Unique Items', Value: analytics.uniqueItems },
      { Metric: 'Total Items Qty', Value: analytics.totalItems.toFixed(0) },
      { Metric: 'Market Items Count', Value: analytics.marketItems.count },
      { Metric: 'Market Items Spend', Value: analytics.marketItems.amount.toFixed(2) },
      { Metric: 'Material Items Count', Value: analytics.materialItems.count },
      { Metric: 'Material Items Spend', Value: analytics.materialItems.amount.toFixed(2) },
    ];
    downloadExcel(data, 'PO_Analytics_Overview', 'Overview');
  };

  const downloadTopItems = () => {
    const data = analytics.topItems.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      Category: item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount,
      'Purchase Days': item.purchaseDays,
      'First Purchase': item.firstPurchaseDate || '-',
      'Last Purchase': item.lastPurchaseDate || '-'
    }));
    downloadExcel(data, 'PO_Top_Items', 'Top Items');
  };

  const downloadSuppliers = () => {
    const data = analytics.ordersBySupplier.map((s, idx) => ({
      Rank: idx + 1,
      Supplier: s.supplier,
      'Order Count': s.count,
      'Total Amount': s.amount.toFixed(2)
    }));
    downloadExcel(data, 'PO_Suppliers', 'Suppliers');
  };

  const downloadMarketItems = () => {
    const data = analytics.marketItems.items.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount,
      'Purchase Days': item.purchaseDays,
      'First Purchase': item.firstPurchaseDate || '-',
      'Last Purchase': item.lastPurchaseDate || '-'
    }));
    downloadExcel(data, 'PO_Market_Items', 'Market Items');
  };

  const downloadMaterialItems = () => {
    const data = analytics.materialItems.items.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount,
      'Purchase Days': item.purchaseDays,
      'First Purchase': item.firstPurchaseDate || '-',
      'Last Purchase': item.lastPurchaseDate || '-'
    }));
    downloadExcel(data, 'PO_Material_Items', 'Material Items');
  };

  const downloadAllItems = () => {
    const allItems = [...analytics.marketItems.items, ...analytics.materialItems.items, 
      ...analytics.topItems.filter(i => i.category === 'unknown')];
    const uniqueItems = Array.from(new Map(allItems.map(item => [item.item_name, item])).values());
    const data = uniqueItems.sort((a, b) => b.totalAmount - a.totalAmount).map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      Category: item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount,
      'Purchase Days': item.purchaseDays,
      'First Purchase': item.firstPurchaseDate || '-',
      'Last Purchase': item.lastPurchaseDate || '-'
    }));
    downloadExcel(data, 'PO_All_Items', 'All Items');
  };

  const downloadOrdersByDate = () => {
    // Create detailed data with items per date
    const data: any[] = [];
    analytics.ordersByDate.slice().reverse().forEach(d => {
      // Add date header row
      data.push({
        Date: format(parseISO(d.date), 'yyyy-MM-dd'),
        Day: format(parseISO(d.date), 'EEEE'),
        'Order Count': d.count,
        'Total Amount': d.amount.toFixed(2),
        'Item Name': '',
        'Item Code': '',
        Quantity: '',
        'Item Amount': '',
        Category: ''
      });
      // Add each item under this date
      d.items.forEach(item => {
        data.push({
          Date: '',
          Day: '',
          'Order Count': '',
          'Total Amount': '',
          'Item Name': item.item_name,
          'Item Code': item.item_code || '-',
          Quantity: `${item.quantity} ${item.unit || 'units'}`,
          'Item Amount': item.amount.toFixed(2),
          Category: item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other'
        });
      });
    });
    downloadExcel(data, 'PO_Orders_By_Date_Detailed', 'Orders By Date');
  };

  const downloadFullReport = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Overview sheet
      const overviewData = [
        { Metric: 'Total Orders', Value: analytics.totalOrders },
        { Metric: 'Total Spend', Value: analytics.totalAmount.toFixed(2) },
        { Metric: 'Average Order Value', Value: analytics.avgOrderValue.toFixed(2) },
        { Metric: 'Daily Average', Value: analytics.dailyAverage.toFixed(2) },
        { Metric: 'Unique Items', Value: analytics.uniqueItems },
        { Metric: 'Market Items Spend', Value: analytics.marketItems.amount.toFixed(2) },
        { Metric: 'Material Items Spend', Value: analytics.materialItems.amount.toFixed(2) },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), 'Overview');
      
      // Market items sheet with purchase days
      const marketData = analytics.marketItems.items.map((item, idx) => ({
        Rank: idx + 1,
        'Item Name': item.item_name,
        'Item Code': item.item_code || '-',
        Qty: item.totalQuantity.toFixed(2),
        Unit: item.unit || 'units',
        Amount: item.totalAmount.toFixed(2),
        Orders: item.orderCount,
        'Purchase Days': item.purchaseDays,
        'First Purchase': item.firstPurchaseDate || '-',
        'Last Purchase': item.lastPurchaseDate || '-'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(marketData), 'Market Items');
      
      // Material items sheet with purchase days
      const materialData = analytics.materialItems.items.map((item, idx) => ({
        Rank: idx + 1,
        'Item Name': item.item_name,
        'Item Code': item.item_code || '-',
        Qty: item.totalQuantity.toFixed(2),
        Unit: item.unit || 'units',
        Amount: item.totalAmount.toFixed(2),
        Orders: item.orderCount,
        'Purchase Days': item.purchaseDays,
        'First Purchase': item.firstPurchaseDate || '-',
        'Last Purchase': item.lastPurchaseDate || '-'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materialData), 'Material Items');
      
      // Orders by date sheet with items
      const dateData: any[] = [];
      analytics.ordersByDate.slice().reverse().forEach(d => {
        dateData.push({
          Date: format(parseISO(d.date), 'yyyy-MM-dd'),
          Day: format(parseISO(d.date), 'EEEE'),
          Orders: d.count,
          Amount: d.amount.toFixed(2),
          'Items Count': d.items.length
        });
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dateData), 'By Date');
      
      // Suppliers sheet
      const supplierData = analytics.ordersBySupplier.map((s, idx) => ({
        Rank: idx + 1,
        Supplier: s.supplier,
        Orders: s.count,
        Amount: s.amount.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierData), 'Suppliers');
      
      XLSX.writeFile(wb, `PO_Full_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Downloaded full report');
    } catch (error) {
      toast.error('Failed to download report');
      console.error(error);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = "primary" 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: any; 
    trend?: number;
    color?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-3 sm:p-4 bg-gradient-to-br from-card to-muted/30 border-primary/20 hover:border-primary/40 transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground truncate">{value}</p>
            {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3 flex-shrink-0" /> : <ArrowDownRight className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">{Math.abs(trend).toFixed(1)}% vs last</span>
              </div>
            )}
          </div>
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );

  const ItemRowWithDates = ({ item, index, formatCurrency }: { item: ItemSummary; index: number; formatCurrency: (n: number) => string }) => {
    const isExpanded = expandedItems.has(item.item_name);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div 
          className="flex items-center justify-between py-2 px-2 sm:px-3 cursor-pointer gap-2"
          onClick={() => toggleItemExpanded(item.item_name)}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-mono w-5 sm:w-6 flex-shrink-0">{index + 1}</span>
            {item.purchaseDays > 1 ? (
              isExpanded ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            ) : <div className="w-3.5 sm:w-4 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">{item.item_name}</p>
              <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                {item.item_code && <span className="font-mono hidden sm:inline">{item.item_code}</span>}
                <span>{item.totalQuantity.toFixed(1)} {item.unit || 'u'}</span>
                <Badge 
                  variant="outline" 
                  className={`text-[8px] sm:text-[10px] px-1 py-0 h-4 ${
                    item.category === 'market' ? 'border-emerald-500 text-emerald-500' : 
                    item.category === 'material' ? 'border-purple-500 text-purple-500' : 
                    'border-muted-foreground'
                  }`}
                >
                  {item.category === 'market' ? 'M' : item.category === 'material' ? 'T' : 'O'}
                </Badge>
                <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0 h-4 gap-0.5">
                  <Hash className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  {item.purchaseDays}d
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs sm:text-sm font-bold text-primary">{formatCurrency(item.totalAmount)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{item.orderCount} ord</p>
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && item.dateOccurrences.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pl-8 sm:pl-14 pr-2 sm:pr-3 pb-2 space-y-1">
                <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Purchase History</p>
                {item.dateOccurrences
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((occ, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 px-1.5 sm:px-2 rounded bg-muted/30 text-[10px] sm:text-xs gap-2">
                      <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                        <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">
                          {occ.date !== 'Unknown' ? format(parseISO(occ.date), 'dd MMM') : 'Unk'}
                        </span>
                        {occ.order_number && (
                          <span className="text-muted-foreground font-mono hidden sm:inline">#{occ.order_number}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <span className="text-muted-foreground">{occ.quantity}</span>
                        <span className="font-medium text-primary">{formatCurrency(occ.amount)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Download Full Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold">Analytics</h2>
        <div className="flex items-center gap-2">
          <Button onClick={downloadFullReportPDF} variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-2 sm:px-3">
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Download</span> PDF
          </Button>
          <Button onClick={downloadFullReport} size="sm" className="gap-1.5 text-xs h-8 px-2 sm:px-3">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Download</span> Excel
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard 
          title="Total Orders" 
          value={analytics.totalOrders} 
          icon={ShoppingCart}
          subtitle={`${analytics.uniqueItems} unique items`}
        />
        <StatCard 
          title="Total Spend" 
          value={formatCurrency(analytics.totalAmount)}
          icon={DollarSign}
          trend={analytics.weeklyTrend}
        />
        <StatCard 
          title="Avg Order Value" 
          value={formatCurrency(analytics.avgOrderValue)}
          icon={BarChart3}
          subtitle={`Daily: ${formatCurrency(analytics.dailyAverage)}`}
        />
        <StatCard 
          title="This Month" 
          value={formatCurrency(analytics.monthlyComparison.current)}
          icon={Calendar}
          trend={analytics.monthlyComparison.change}
        />
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              <h3 className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400">Market / Fresh Items</h3>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={downloadMarketItemsPDF} className="h-7 w-7 p-0 text-emerald-600">
                <FileText className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadMarketItems} className="h-7 w-7 p-0 text-emerald-600">
                <FileSpreadsheet className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.marketItems.count}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Unique Items</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.marketItems.amount)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Spend</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              <h3 className="text-sm sm:text-base font-semibold text-purple-600 dark:text-purple-400">Materials / Supplies</h3>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={downloadMaterialItemsPDF} className="h-7 w-7 p-0 text-purple-600">
                <FileText className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadMaterialItems} className="h-7 w-7 p-0 text-purple-600">
                <FileSpreadsheet className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.materialItems.count}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Unique Items</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(analytics.materialItems.amount)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Spend</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-full min-w-max sm:grid sm:grid-cols-5 h-auto p-1">
            <TabsTrigger value="overview" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 gap-1">
              <BarChart3 className="w-3 h-3" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="market" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 gap-1">
              <Leaf className="w-3 h-3" />
              <span>Market</span>
            </TabsTrigger>
            <TabsTrigger value="material" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 gap-1">
              <Wrench className="w-3 h-3" />
              <span>Material</span>
            </TabsTrigger>
            <TabsTrigger value="combined" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 gap-1">
              <Layers className="w-3 h-3" />
              <span>All Items</span>
            </TabsTrigger>
            <TabsTrigger value="dates" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 gap-1">
              <Calendar className="w-3 h-3" />
              <span>By Date</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="overview" className="mt-3 sm:mt-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {/* Top Items */}
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Top Items by Spend
                </h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadTopItemsPDF} className="h-7 w-7 p-0">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadTopItems} className="h-7 w-7 p-0">
                    <FileSpreadsheet className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[250px] sm:h-[300px]">
                <div className="space-y-1">
                  {analytics.topItems.slice(0, 10).map((item, idx) => (
                    <ItemRowWithDates key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Suppliers */}
            <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Top Suppliers
                </h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadSuppliersPDF} className="h-7 w-7 p-0">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadSuppliers} className="h-7 w-7 p-0">
                    <FileSpreadsheet className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[200px] sm:h-[300px]">
                <div className="space-y-1 sm:space-y-2">
                  {analytics.ordersBySupplier.slice(0, 10).map((supplier, idx) => (
                    <motion.div
                      key={supplier.supplier}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between py-2 px-2 sm:px-3 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground font-mono w-5 sm:w-6">{idx + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">{supplier.supplier}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{supplier.count} orders</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-primary flex-shrink-0">{formatCurrency(supplier.amount)}</p>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="market" className="mt-3 sm:mt-4">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-500" />
                Market / Fresh Items
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500 text-emerald-500 text-[10px] sm:text-xs">
                  {analytics.marketItems.count} items • {formatCurrency(analytics.marketItems.amount)}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadMarketItemsPDF} className="h-7 w-7 p-0">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadMarketItems} className="h-7 w-7 p-0">
                    <FileSpreadsheet className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Click an item to see purchase dates</p>
            <ScrollArea className="h-[300px] sm:h-[400px]">
              {analytics.marketItems.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No market items found</p>
              ) : (
                <div className="space-y-1">
                  {analytics.marketItems.items.map((item, idx) => (
                    <ItemRowWithDates key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="material" className="mt-3 sm:mt-4">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-500" />
                Materials / Supplies
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-purple-500 text-purple-500 text-[10px] sm:text-xs">
                  {analytics.materialItems.count} items • {formatCurrency(analytics.materialItems.amount)}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadMaterialItemsPDF} className="h-7 w-7 p-0">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadMaterialItems} className="h-7 w-7 p-0">
                    <FileSpreadsheet className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Click an item to see purchase dates</p>
            <ScrollArea className="h-[300px] sm:h-[400px]">
              {analytics.materialItems.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">No material items found</p>
              ) : (
                <div className="space-y-1">
                  {analytics.materialItems.items.map((item, idx) => (
                    <ItemRowWithDates key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="combined" className="mt-3 sm:mt-4">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                All Items Combined
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {analytics.uniqueItems} items • {formatCurrency(analytics.totalAmount)}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadAllItemsPDF} className="h-7 w-7 p-0">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadAllItems} className="h-7 w-7 p-0">
                    <FileSpreadsheet className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Click an item to see purchase dates</p>
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="space-y-1">
                {analytics.topItems.map((item, idx) => (
                  <ItemRowWithDates key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="dates" className="mt-3 sm:mt-4">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Orders by Date
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {analytics.ordersByDate.length} days
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadOrdersByDatePDF} className="h-7 w-7 p-0">
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadOrdersByDate} className="h-7 w-7 p-0">
                    <FileSpreadsheet className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">Click a date to see all items ordered that day</p>
            <ScrollArea className="h-[350px] sm:h-[500px]">
              <div className="space-y-1.5 sm:space-y-2">
                {analytics.ordersByDate.slice().reverse().map((dayData, idx) => {
                  const isExpanded = expandedDates.has(dayData.date);
                  const marketItemsCount = dayData.items.filter(i => i.category === 'market').length;
                  const materialItemsCount = dayData.items.filter(i => i.category === 'material').length;
                  
                  return (
                    <motion.div
                      key={dayData.date}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="rounded-lg bg-muted/30 overflow-hidden"
                    >
                      <div 
                        className="flex items-center justify-between py-2 sm:py-3 px-2 sm:px-4 cursor-pointer hover:bg-muted/50 transition-colors gap-2"
                        onClick={() => toggleDateExpanded(dayData.date)}
                      >
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="text-center min-w-[40px] sm:min-w-[60px] flex-shrink-0">
                            <p className="text-base sm:text-lg font-bold text-primary">{format(parseISO(dayData.date), 'd')}</p>
                            <p className="text-[9px] sm:text-xs text-muted-foreground">{format(parseISO(dayData.date), 'MMM')}</p>
                          </div>
                          <div className="h-8 sm:h-10 w-px bg-border hidden sm:block" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium">{format(parseISO(dayData.date), 'EEE')}</p>
                            <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs text-muted-foreground flex-wrap">
                              <span>{dayData.count} ord</span>
                              <span className="hidden sm:inline">•</span>
                              <span>{dayData.items.length} items</span>
                              {marketItemsCount > 0 && (
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] py-0 h-3.5 sm:h-4 px-1 border-emerald-500 text-emerald-500">
                                  {marketItemsCount}M
                                </Badge>
                              )}
                              {materialItemsCount > 0 && (
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] py-0 h-3.5 sm:h-4 px-1 border-purple-500 text-purple-500">
                                  {materialItemsCount}T
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm sm:text-lg font-bold text-primary">{formatCurrency(dayData.amount)}</p>
                          <p className="text-[9px] sm:text-xs text-muted-foreground hidden sm:block">
                            Avg: {formatCurrency(dayData.amount / dayData.count)}
                          </p>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {isExpanded && dayData.items.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-2 sm:px-4 pb-2 sm:pb-3 pt-1 border-t border-border/50">
                              <div className="grid grid-cols-1 gap-1 mt-1 sm:mt-2">
                                {dayData.items
                                  .sort((a, b) => b.amount - a.amount)
                                  .map((item, itemIdx) => (
                                    <div 
                                      key={`${item.item_name}-${itemIdx}`} 
                                      className="flex items-center justify-between py-1 sm:py-1.5 px-1.5 sm:px-2 rounded bg-background/50 text-[10px] sm:text-xs gap-2"
                                    >
                                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                                        <span className="text-muted-foreground font-mono w-4 sm:w-5 flex-shrink-0">{itemIdx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium truncate">{item.item_name}</p>
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <Badge 
                                              variant="outline" 
                                              className={`text-[8px] sm:text-[9px] py-0 h-3 sm:h-3.5 px-1 ${
                                                item.category === 'market' ? 'border-emerald-500 text-emerald-500' : 
                                                item.category === 'material' ? 'border-purple-500 text-purple-500' : 
                                                'border-muted-foreground'
                                              }`}
                                            >
                                              {item.category === 'market' ? 'M' : item.category === 'material' ? 'T' : 'O'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                                        <span className="text-muted-foreground">{item.quantity}</span>
                                        <span className="font-medium text-primary min-w-[50px] sm:min-w-[70px] text-right">{formatCurrency(item.amount)}</span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <Card className="p-3 sm:p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6">
            <div className="text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Orders</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{analytics.totalOrders}</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-border hidden sm:block" />
            <div className="text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Items</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">{analytics.totalItems.toFixed(0)}</p>
            </div>
            <div className="h-6 sm:h-8 w-px bg-border hidden sm:block" />
            <div className="text-center sm:text-left">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
              <p className="text-lg sm:text-xl font-bold text-primary">{formatCurrency(analytics.totalAmount)}</p>
            </div>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px] sm:text-xs">
              <Leaf className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
              {formatCurrency(analytics.marketItems.amount)}
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30 text-[10px] sm:text-xs">
              <Wrench className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
              {formatCurrency(analytics.materialItems.amount)}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};