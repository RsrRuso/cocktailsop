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
  ChevronDown, ChevronRight, Hash, FileText, Truck
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import type { ReceivingAnalyticsSummary, ReceivingItemSummary, ReceivingDateItemDetail } from "@/hooks/useReceivingAnalytics";

interface ReceivingAnalyticsProps {
  analytics: ReceivingAnalyticsSummary;
  formatCurrency: (amount: number) => string;
  currency?: string;
}

export const ReceivingAnalytics = ({ analytics, formatCurrency, currency = 'AED' }: ReceivingAnalyticsProps) => {
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

  // PDF-safe currency codes (avoid Unicode symbols that break in PDFs)
  const pdfCurrencyCodes: Record<string, string> = { USD: 'USD', EUR: 'EUR', GBP: 'GBP', AED: 'AED', AUD: 'AUD' };

  // PDF-safe currency formatter
  const formatCurrencyPDF = (amount: number): string => {
    const parts = amount.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const currencyCode = pdfCurrencyCodes[currency] || currency || 'AED';
    return currencyCode + ' ' + intPart + '.' + parts[1];
  };

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

  // PDF theme colors
  const pdfColors = {
    primary: [6, 182, 212] as [number, number, number], // Cyan
    secondary: [139, 92, 246] as [number, number, number], // Purple
    dark: [15, 23, 42] as [number, number, number],
    darkAlt: [30, 41, 59] as [number, number, number],
    accent: [34, 197, 94] as [number, number, number], // Green
    gold: [234, 179, 8] as [number, number, number],
    light: [248, 250, 252] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  // Enhanced PDF Download helper
  const downloadPDF = (title: string, headers: string[], rows: (string | number)[][], fileName: string, accentColor?: [number, number, number]) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const color = accentColor || pdfColors.primary;
      
      // Header
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setFillColor(...color);
      doc.rect(0, 45, pageWidth, 3, 'F');
      doc.rect(0, 0, 5, 45, 'F');
      
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 24);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 200);
      doc.text('Generated on ' + format(new Date(), 'EEEE, dd MMMM yyyy | HH:mm'), 14, 36);
      
      // Summary card
      doc.setFillColor(...pdfColors.light);
      doc.roundedRect(14, 55, pageWidth - 28, 16, 2, 2, 'F');
      doc.setFillColor(...color);
      doc.roundedRect(14, 55, 4, 16, 2, 0, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL RECORDS: ' + rows.length, 24, 65);
      
      // Table
      autoTable(doc, {
        head: [headers],
        body: rows.map(row => row.map(cell => String(cell))),
        startY: 78,
        theme: 'striped',
        headStyles: { 
          fillColor: color,
          textColor: pdfColors.white,
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 6,
          halign: 'center'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 5,
          lineColor: [226, 232, 240],
          lineWidth: 0.3,
          textColor: pdfColors.dark
        },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: { 0: { halign: 'center', cellWidth: 14 } },
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          doc.setDrawColor(...color);
          doc.setLineWidth(2);
          doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
        }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...pdfColors.muted);
        doc.text('Page ' + i + ' of ' + pageCount, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('Receiving Analytics', 14, pageHeight - 10);
        doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
      
      doc.save(fileName + '_' + format(new Date(), 'yyyy-MM-dd') + '.pdf');
      toast.success('Downloaded ' + fileName + '.pdf');
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
      
      // Header
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, 55, 'F');
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 0, 6, 55, 'F');
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 55, pageWidth, 4, 'F');
      
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Receiving Analytics Overview', 16, 28);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Goods Received Summary Report', 16, 42);
      doc.text(format(new Date(), 'dd MMMM yyyy'), pageWidth - 14, 42, { align: 'right' });
      
      // Key metrics cards
      let yPos = 72;
      const cardWidth = (pageWidth - 42) / 3;
      
      const metrics = [
        { label: 'TOTAL RECEIPTS', value: String(analytics.totalReceipts), color: pdfColors.primary },
        { label: 'TOTAL RECEIVED', value: formatCurrencyPDF(analytics.totalAmount), color: pdfColors.accent },
        { label: 'UNIQUE ITEMS', value: String(analytics.uniqueItems), color: pdfColors.secondary },
      ];
      
      metrics.forEach((metric, idx) => {
        const x = 14 + (idx * (cardWidth + 7));
        doc.setFillColor(...metric.color);
        doc.roundedRect(x, yPos, cardWidth, 38, 4, 4, 'F');
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(metric.label, x + 8, yPos + 14);
        doc.setFontSize(18);
        doc.text(metric.value, x + 8, yPos + 30);
      });
      
      yPos += 52;
      
      // Detailed metrics
      doc.setFillColor(...pdfColors.light);
      doc.roundedRect(14, yPos, pageWidth - 28, 14, 2, 2, 'F');
      doc.setFillColor(...pdfColors.primary);
      doc.roundedRect(14, yPos, 4, 14, 2, 0, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED METRICS', 24, yPos + 9);
      
      yPos += 22;
      
      const weeklySign = analytics.weeklyTrend >= 0 ? '+' : '';
      const monthlySign = analytics.monthlyComparison.change >= 0 ? '+' : '';
      
      autoTable(doc, {
        body: [
          ['Average Receipt Value', formatCurrencyPDF(analytics.avgReceiptValue), 'Daily Average', formatCurrencyPDF(analytics.dailyAverage)],
          ['Weekly Trend', weeklySign + analytics.weeklyTrend.toFixed(1) + '%', 'Monthly Change', monthlySign + analytics.monthlyComparison.change.toFixed(1) + '%'],
          ['This Month', formatCurrencyPDF(analytics.monthlyComparison.current), 'Last Month', formatCurrencyPDF(analytics.monthlyComparison.previous)],
        ],
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 7 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: pdfColors.muted },
          1: { fontStyle: 'bold', textColor: pdfColors.dark },
          2: { fontStyle: 'bold', textColor: pdfColors.muted },
          3: { fontStyle: 'bold', textColor: pdfColors.dark }
        },
        margin: { left: 14, right: 14 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 18;
      
      // Category Breakdown
      doc.setFillColor(...pdfColors.light);
      doc.roundedRect(14, yPos, pageWidth - 28, 14, 2, 2, 'F');
      doc.setFillColor(...pdfColors.secondary);
      doc.roundedRect(14, yPos, 4, 14, 2, 0, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CATEGORY BREAKDOWN', 24, yPos + 9);
      
      yPos += 22;
      
      const halfWidth = (pageWidth - 35) / 2;
      doc.setFillColor(...pdfColors.accent);
      doc.roundedRect(14, yPos, halfWidth, 35, 4, 4, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MARKET / FRESH ITEMS', 22, yPos + 12);
      doc.setFontSize(11);
      doc.text(analytics.marketItems.count + ' items', 22, yPos + 24);
      doc.setFontSize(13);
      doc.text(formatCurrencyPDF(analytics.marketItems.amount), 22, yPos + 32);
      
      const materialX = 14 + halfWidth + 7;
      doc.setFillColor(...pdfColors.secondary);
      doc.roundedRect(materialX, yPos, halfWidth, 35, 4, 4, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MATERIALS / SUPPLIES', materialX + 8, yPos + 12);
      doc.setFontSize(11);
      doc.text(analytics.materialItems.count + ' items', materialX + 8, yPos + 24);
      doc.setFontSize(13);
      doc.text(formatCurrencyPDF(analytics.materialItems.amount), materialX + 8, yPos + 32);
      
      // Footer
      doc.setDrawColor(...pdfColors.primary);
      doc.setLineWidth(2);
      doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
      doc.setFontSize(8);
      doc.setTextColor(...pdfColors.muted);
      doc.text('Receiving Analytics - Overview Report', 14, pageHeight - 10);
      doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 14, pageHeight - 10, { align: 'right' });
      
      doc.save('Receiving_Analytics_Overview_' + format(new Date(), 'yyyy-MM-dd') + '.pdf');
      toast.success('Downloaded overview PDF');
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  const downloadTopItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Category', 'Qty', 'Amount', 'Receipts', 'Days'];
    const rows = analytics.topItems.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      item.totalQuantity.toFixed(1) + ' ' + (item.unit || 'units'),
      formatCurrencyPDF(item.totalAmount),
      item.receiptCount,
      item.receivingDays
    ]);
    downloadPDF('Top Received Items by Value', headers, rows, 'Receiving_Top_Items', pdfColors.accent);
  };

  const downloadSuppliersPDF = () => {
    const headers = ['#', 'Supplier', 'Receipt Count', 'Total Amount'];
    const rows = analytics.receiptsBySupplier.map((s, idx) => [
      idx + 1,
      s.supplier,
      s.count,
      formatCurrencyPDF(s.amount)
    ]);
    downloadPDF('Top Suppliers - Receiving', headers, rows, 'Receiving_Suppliers', pdfColors.dark);
  };

  const downloadMarketItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Qty', 'Amount', 'Receipts', 'Days', 'First', 'Last'];
    const rows = analytics.marketItems.items.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.totalQuantity.toFixed(1) + ' ' + (item.unit || 'units'),
      formatCurrencyPDF(item.totalAmount),
      item.receiptCount,
      item.receivingDays,
      item.firstReceivingDate || '-',
      item.lastReceivingDate || '-'
    ]);
    downloadPDF('Market / Fresh Items Received', headers, rows, 'Receiving_Market_Items', pdfColors.accent);
  };

  const downloadMaterialItemsPDF = () => {
    const headers = ['#', 'Item Name', 'Qty', 'Amount', 'Receipts', 'Days', 'First', 'Last'];
    const rows = analytics.materialItems.items.map((item, idx) => [
      idx + 1,
      item.item_name,
      item.totalQuantity.toFixed(1) + ' ' + (item.unit || 'units'),
      formatCurrencyPDF(item.totalAmount),
      item.receiptCount,
      item.receivingDays,
      item.firstReceivingDate || '-',
      item.lastReceivingDate || '-'
    ]);
    downloadPDF('Materials / Supplies Received', headers, rows, 'Receiving_Material_Items', pdfColors.secondary);
  };

  const downloadFullReportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Cover page
      doc.setFillColor(...pdfColors.dark);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 0, 8, pageHeight, 'F');
      doc.setFillColor(...pdfColors.gold);
      doc.rect(8, 0, pageWidth - 8, 4, 'F');
      
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text('Receiving', 24, 70);
      doc.text('Analytics Report', 24, 90);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text('Comprehensive goods received analysis', 24, 115);
      doc.text('Generated: ' + format(new Date(), 'EEEE, dd MMMM yyyy'), 24, 130);
      
      const coverStats = [
        { label: 'TOTAL RECEIPTS', value: String(analytics.totalReceipts), color: pdfColors.primary },
        { label: 'UNIQUE ITEMS', value: String(analytics.uniqueItems), color: pdfColors.secondary },
        { label: 'TOTAL RECEIVED', value: formatCurrencyPDF(analytics.totalAmount), color: pdfColors.gold },
      ];
      
      coverStats.forEach((stat, idx) => {
        const y = 165 + (idx * 32);
        doc.setFillColor(...stat.color);
        doc.roundedRect(24, y, 6, 22, 3, 3, 'F');
        doc.setTextColor(160, 160, 160);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.label, 38, y + 8);
        doc.setTextColor(...pdfColors.white);
        doc.setFontSize(16);
        doc.text(stat.value, 38, y + 20);
      });
      
      // Overview page
      doc.addPage();
      doc.setFillColor(...pdfColors.primary);
      doc.rect(0, 0, 8, pageHeight, 'F');
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Overview Summary', 20, 28);
      doc.setDrawColor(...pdfColors.primary);
      doc.setLineWidth(2);
      doc.line(20, 34, 90, 34);
      
      let yPos = 50;
      const weeklySign = analytics.weeklyTrend >= 0 ? '+' : '';
      const monthlySign = analytics.monthlyComparison.change >= 0 ? '+' : '';
      
      const metricsData = [
        ['Total Receipts', String(analytics.totalReceipts), 'Total Received', formatCurrencyPDF(analytics.totalAmount)],
        ['Avg Receipt Value', formatCurrencyPDF(analytics.avgReceiptValue), 'Daily Average', formatCurrencyPDF(analytics.dailyAverage)],
        ['Weekly Trend', weeklySign + analytics.weeklyTrend.toFixed(1) + '%', 'Monthly Change', monthlySign + analytics.monthlyComparison.change.toFixed(1) + '%'],
      ];
      
      autoTable(doc, {
        body: metricsData,
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 9 },
        columnStyles: { 
          0: { fontStyle: 'bold', textColor: pdfColors.muted, cellWidth: 45 },
          1: { fontStyle: 'bold', textColor: pdfColors.dark, cellWidth: 50 },
          2: { fontStyle: 'bold', textColor: pdfColors.muted, cellWidth: 45 },
          3: { fontStyle: 'bold', textColor: pdfColors.dark }
        },
        margin: { left: 20 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 22;
      
      // Category cards
      const cardWidth = (pageWidth - 50) / 2;
      doc.setFillColor(...pdfColors.accent);
      doc.roundedRect(20, yPos, cardWidth, 42, 4, 4, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MARKET / FRESH ITEMS', 28, yPos + 14);
      doc.setFontSize(16);
      doc.text(analytics.marketItems.count + ' items', 28, yPos + 30);
      doc.setFontSize(12);
      doc.text(formatCurrencyPDF(analytics.marketItems.amount), 28, yPos + 40);
      
      doc.setFillColor(...pdfColors.secondary);
      doc.roundedRect(30 + cardWidth, yPos, cardWidth, 42, 4, 4, 'F');
      doc.setTextColor(...pdfColors.white);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('MATERIALS / SUPPLIES', 38 + cardWidth, yPos + 14);
      doc.setFontSize(16);
      doc.text(analytics.materialItems.count + ' items', 38 + cardWidth, yPos + 30);
      doc.setFontSize(12);
      doc.text(formatCurrencyPDF(analytics.materialItems.amount), 38 + cardWidth, yPos + 40);
      
      yPos += 58;
      
      // Top Items
      doc.setTextColor(...pdfColors.dark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 15 Items by Value', 20, yPos);
      yPos += 6;
      
      autoTable(doc, {
        head: [['#', 'Item Name', 'Category', 'Qty', 'Amount', 'Receipts', 'Days']],
        body: analytics.topItems.slice(0, 15).map((item, idx) => [
          idx + 1,
          item.item_name.substring(0, 28),
          item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
          item.totalQuantity.toFixed(1),
          formatCurrencyPDF(item.totalAmount),
          item.receiptCount,
          item.receivingDays
        ]),
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: pdfColors.darkAlt, textColor: pdfColors.white, fontSize: 8, cellPadding: 4 },
        styles: { fontSize: 7, cellPadding: 3 },
        alternateRowStyles: { fillColor: pdfColors.light },
        margin: { left: 20, right: 14 },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 } }
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) {
          doc.setDrawColor(...pdfColors.primary);
          doc.setLineWidth(1);
          doc.line(20, pageHeight - 18, pageWidth - 14, pageHeight - 18);
          doc.setFontSize(8);
          doc.setTextColor(...pdfColors.muted);
          doc.text('Receiving Analytics Report', 20, pageHeight - 10);
          doc.text('Page ' + (i - 1) + ' of ' + (pageCount - 1), pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
      }
      
      doc.save('Receiving_Full_Report_' + format(new Date(), 'yyyy-MM-dd') + '.pdf');
      toast.success('Downloaded full report PDF');
    } catch (error) {
      toast.error('Failed to download PDF');
      console.error(error);
    }
  };

  // Excel downloads
  const downloadOverview = () => {
    const data = [
      { Metric: 'Total Receipts', Value: analytics.totalReceipts },
      { Metric: 'Total Received', Value: analytics.totalAmount.toFixed(2) },
      { Metric: 'Average Receipt Value', Value: analytics.avgReceiptValue.toFixed(2) },
      { Metric: 'Daily Average', Value: analytics.dailyAverage.toFixed(2) },
      { Metric: 'Weekly Trend (%)', Value: analytics.weeklyTrend.toFixed(1) },
      { Metric: 'This Month', Value: analytics.monthlyComparison.current.toFixed(2) },
      { Metric: 'Last Month', Value: analytics.monthlyComparison.previous.toFixed(2) },
      { Metric: 'Monthly Change (%)', Value: analytics.monthlyComparison.change.toFixed(1) },
      { Metric: 'Unique Items', Value: analytics.uniqueItems },
      { Metric: 'Total Items Qty', Value: analytics.totalItems.toFixed(0) },
      { Metric: 'Market Items Count', Value: analytics.marketItems.count },
      { Metric: 'Market Items Value', Value: analytics.marketItems.amount.toFixed(2) },
      { Metric: 'Material Items Count', Value: analytics.materialItems.count },
      { Metric: 'Material Items Value', Value: analytics.materialItems.amount.toFixed(2) },
    ];
    downloadExcel(data, 'Receiving_Analytics_Overview', 'Overview');
  };

  const downloadTopItems = () => {
    const data = analytics.topItems.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      Category: item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Receipt Count': item.receiptCount,
      'Receiving Days': item.receivingDays,
      'First Receiving': item.firstReceivingDate || '-',
      'Last Receiving': item.lastReceivingDate || '-'
    }));
    downloadExcel(data, 'Receiving_Top_Items', 'Top Items');
  };

  const downloadSuppliers = () => {
    const data = analytics.receiptsBySupplier.map((s, idx) => ({
      Rank: idx + 1,
      Supplier: s.supplier,
      'Receipt Count': s.count,
      'Total Amount': s.amount.toFixed(2)
    }));
    downloadExcel(data, 'Receiving_Suppliers', 'Suppliers');
  };

  const downloadMarketItems = () => {
    const data = analytics.marketItems.items.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Receipt Count': item.receiptCount,
      'Receiving Days': item.receivingDays,
      'First Receiving': item.firstReceivingDate || '-',
      'Last Receiving': item.lastReceivingDate || '-'
    }));
    downloadExcel(data, 'Receiving_Market_Items', 'Market Items');
  };

  const downloadMaterialItems = () => {
    const data = analytics.materialItems.items.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Receipt Count': item.receiptCount,
      'Receiving Days': item.receivingDays,
      'First Receiving': item.firstReceivingDate || '-',
      'Last Receiving': item.lastReceivingDate || '-'
    }));
    downloadExcel(data, 'Receiving_Material_Items', 'Material Items');
  };

  // Render item list with expandable details
  const renderItemList = (items: ReceivingItemSummary[], categoryColor: string, showCategory: boolean = false) => (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <Collapsible
          key={item.item_name}
          open={expandedItems.has(item.item_name)}
          onOpenChange={() => toggleItemExpanded(item.item_name)}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
          >
            <CollapsibleTrigger asChild>
              <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{item.item_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.totalQuantity.toFixed(1)} {item.unit || 'units'}</span>
                        <span>·</span>
                        <span>{item.receiptCount} receipts</span>
                        <span>·</span>
                        <span>{item.receivingDays} days</span>
                        {showCategory && (
                          <>
                            <span>·</span>
                            <Badge variant="outline" className={`text-[10px] ${
                              item.category === 'market' ? 'border-emerald-500 text-emerald-600' :
                              item.category === 'material' ? 'border-purple-500 text-purple-600' :
                              'border-muted'
                            }`}>
                              {item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other'}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${categoryColor}`}>{formatCurrency(item.totalAmount)}</span>
                    {expandedItems.has(item.item_name) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </div>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-1 ml-8 p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Avg Price:</span>
                    <span className="ml-1 font-medium">{formatCurrency(item.avgPrice)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">First Received:</span>
                    <span className="ml-1 font-medium">{item.firstReceivingDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Received:</span>
                    <span className="ml-1 font-medium">{item.lastReceivingDate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit:</span>
                    <span className="ml-1 font-medium">{item.unit || 'units'}</span>
                  </div>
                </div>
                {item.dateOccurrences.length > 1 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Receipt History:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.dateOccurrences.slice(0, 5).map((occ, occIdx) => (
                        <Badge key={occIdx} variant="secondary" className="text-[10px]">
                          {occ.date}: {occ.quantity} @ {formatCurrency(occ.amount)}
                        </Badge>
                      ))}
                      {item.dateOccurrences.length > 5 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{item.dateOccurrences.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </CollapsibleContent>
          </motion.div>
        </Collapsible>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header with main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-600 mb-1">
            <Truck className="h-4 w-4" />
            <span className="text-xs font-medium">Total Receipts</span>
          </div>
          <p className="text-2xl font-bold">{analytics.totalReceipts}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">Total Received</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.totalAmount)}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Unique Items</span>
          </div>
          <p className="text-2xl font-bold">{analytics.uniqueItems}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            {analytics.weeklyTrend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-xs font-medium">Weekly Trend</span>
          </div>
          <p className={`text-2xl font-bold ${analytics.weeklyTrend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {analytics.weeklyTrend >= 0 ? '+' : ''}{analytics.weeklyTrend.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="market" className="text-xs">
            <Leaf className="h-3 w-3 mr-1" />
            Market
          </TabsTrigger>
          <TabsTrigger value="material" className="text-xs">
            <Wrench className="h-3 w-3 mr-1" />
            Material
          </TabsTrigger>
          <TabsTrigger value="combined" className="text-xs">
            <Layers className="h-3 w-3 mr-1" />
            All Items
          </TabsTrigger>
          <TabsTrigger value="dates" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            By Date
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Download buttons */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadOverview}>
              <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={downloadOverviewPDF}>
              <FileText className="h-3 w-3 mr-1" /> PDF
            </Button>
            <Button size="sm" variant="outline" onClick={downloadFullReportPDF}>
              <Download className="h-3 w-3 mr-1" /> Full Report
            </Button>
          </div>

          {/* Category summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-4 w-4 text-emerald-500" />
                <span className="font-medium text-sm">Market / Fresh</span>
              </div>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(analytics.marketItems.amount)}</p>
              <p className="text-xs text-muted-foreground">{analytics.marketItems.count} items</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">Materials / Supplies</span>
              </div>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(analytics.materialItems.amount)}</p>
              <p className="text-xs text-muted-foreground">{analytics.materialItems.count} items</p>
            </Card>
          </div>

          {/* Key metrics */}
          <Card className="p-4">
            <h3 className="font-medium text-sm mb-3">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Avg Receipt Value:</span>
                <span className="ml-2 font-medium">{formatCurrency(analytics.avgReceiptValue)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Daily Average:</span>
                <span className="ml-2 font-medium">{formatCurrency(analytics.dailyAverage)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">This Month:</span>
                <span className="ml-2 font-medium">{formatCurrency(analytics.monthlyComparison.current)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Month:</span>
                <span className="ml-2 font-medium">{formatCurrency(analytics.monthlyComparison.previous)}</span>
              </div>
            </div>
          </Card>

          {/* Top suppliers */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Top Suppliers</h3>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={downloadSuppliers}>
                  <FileSpreadsheet className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={downloadSuppliersPDF}>
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {analytics.receiptsBySupplier.slice(0, 5).map((supplier, idx) => (
                <div key={supplier.supplier} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{idx + 1}</span>
                    <span>{supplier.supplier}</span>
                    <Badge variant="secondary" className="text-[10px]">{supplier.count} receipts</Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(supplier.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500">{analytics.marketItems.count} items</Badge>
              <span className="text-sm text-muted-foreground">Total: {formatCurrency(analytics.marketItems.amount)}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={downloadMarketItems}>
                <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={downloadMarketItemsPDF}>
                <FileText className="h-3 w-3 mr-1" /> PDF
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[400px]">
            {renderItemList(analytics.marketItems.items, 'text-emerald-600')}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="material" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500">{analytics.materialItems.count} items</Badge>
              <span className="text-sm text-muted-foreground">Total: {formatCurrency(analytics.materialItems.amount)}</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={downloadMaterialItems}>
                <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={downloadMaterialItemsPDF}>
                <FileText className="h-3 w-3 mr-1" /> PDF
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[400px]">
            {renderItemList(analytics.materialItems.items, 'text-purple-600')}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="combined" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{analytics.topItems.length} items</Badge>
              <span className="text-sm text-muted-foreground">Top items by value received</span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={downloadTopItems}>
                <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={downloadTopItemsPDF}>
                <FileText className="h-3 w-3 mr-1" /> PDF
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[400px]">
            {renderItemList(analytics.topItems, 'text-primary', true)}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="dates" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {analytics.receiptsByDate.slice().reverse().map((dayData, idx) => (
                <Collapsible
                  key={dayData.date}
                  open={expandedDates.has(dayData.date)}
                  onOpenChange={() => toggleDateExpanded(dayData.date)}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <CollapsibleTrigger asChild>
                      <Card className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-cyan-600">
                                {format(parseISO(dayData.date), 'd')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{format(parseISO(dayData.date), 'EEEE, dd MMM yyyy')}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{dayData.count} receipts</span>
                                <span>·</span>
                                <span>{dayData.items.length} items</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-cyan-600">{formatCurrency(dayData.amount)}</span>
                            {expandedDates.has(dayData.date) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                        </div>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-1 ml-4 p-3 bg-muted/30">
                        <div className="space-y-2">
                          {dayData.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">{itemIdx + 1}</span>
                                <span>{item.item_name}</span>
                                <Badge variant="outline" className={`text-[10px] ${
                                  item.category === 'market' ? 'border-emerald-500' :
                                  item.category === 'material' ? 'border-purple-500' : ''
                                }`}>
                                  {item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">{item.quantity} {item.unit || ''}</span>
                                <span className="font-medium">{formatCurrency(item.amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </CollapsibleContent>
                  </motion.div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
