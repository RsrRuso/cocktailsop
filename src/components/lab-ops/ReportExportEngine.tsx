import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  FileText, FileSpreadsheet, Presentation, Download, 
  Loader2, Calendar, BarChart3, Wine, Users, DollarSign
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportExportEngineProps {
  outletId: string;
  outletName: string;
}

type ReportType = 'daily_ops' | 'variance' | 'staff_performance' | 'inventory' | 'financial';
type ExportFormat = 'pdf' | 'excel' | 'pptx';

export function ReportExportEngine({ outletId, outletName }: ReportExportEngineProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ReportType>('daily_ops');
  const [dateRange, setDateRange] = useState('7d');

  const reportTypes = [
    { id: 'daily_ops', label: 'Daily Operations', icon: BarChart3, description: 'Orders, revenue, covers' },
    { id: 'variance', label: 'Variance Analysis', icon: Wine, description: 'Physical vs virtual consumption' },
    { id: 'staff_performance', label: 'Staff Performance', icon: Users, description: 'Pour accuracy, speed metrics' },
    { id: 'inventory', label: 'Inventory Report', icon: Wine, description: 'Stock levels, movements' },
    { id: 'financial', label: 'Financial Reality', icon: DollarSign, description: 'GP%, cost leakage, profit' },
  ];

  const getPeriodDays = () => {
    switch (dateRange) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 7;
    }
  };

  const fetchReportData = async () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - getPeriodDays());
    
    switch (selectedReport) {
      case 'daily_ops': {
        const { data: orders } = await supabase
          .from('lab_ops_orders')
          .select('*')
          .eq('outlet_id', outletId)
          .gte('created_at', daysAgo.toISOString());
        
        const { data: items } = await supabase
          .from('lab_ops_order_items')
          .select('*, lab_ops_menu_items(name)')
          .eq('lab_ops_orders.outlet_id', outletId);

        return {
          orders: orders || [],
          items: items || [],
          summary: {
            totalOrders: orders?.length || 0,
            totalRevenue: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
            avgOrderValue: orders?.length ? 
              orders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / orders.length : 0,
            completedOrders: orders?.filter(o => o.status === 'closed').length || 0
          }
        };
      }
      
      case 'variance': {
        const { data: pourings } = await supabase
          .from('lab_ops_pourer_readings')
          .select('*, lab_ops_bottles(spirit_type, bottle_name)')
          .eq('outlet_id', outletId)
          .gte('reading_timestamp', daysAgo.toISOString());

        const { data: sales } = await supabase
          .from('lab_ops_sales')
          .select('*')
          .eq('outlet_id', outletId)
          .gte('sold_at', daysAgo.toISOString());

        const physicalTotal = pourings?.reduce((sum, p) => sum + (p.ml_dispensed || 0), 0) || 0;
        const virtualTotal = sales?.reduce((sum, s) => sum + (s.total_ml_sold || 0), 0) || 0;

        return {
          pourings: pourings || [],
          sales: sales || [],
          summary: {
            physicalConsumption: physicalTotal,
            virtualSales: virtualTotal,
            variance: physicalTotal - virtualTotal,
            variancePct: virtualTotal > 0 ? ((physicalTotal - virtualTotal) / virtualTotal) * 100 : 0
          }
        };
      }

      case 'staff_performance': {
        const { data: staff } = await supabase
          .from('lab_ops_staff')
          .select('*')
          .eq('outlet_id', outletId)
          .eq('is_active', true);

        const { data: readings } = await supabase
          .from('lab_ops_pourer_readings')
          .select('*')
          .eq('outlet_id', outletId)
          .gte('reading_timestamp', daysAgo.toISOString());

        return {
          staff: staff || [],
          readings: readings || [],
          summary: {
            totalStaff: staff?.length || 0,
            totalPours: readings?.length || 0
          }
        };
      }

      case 'inventory': {
        const { data: bottles } = await supabase
          .from('lab_ops_bottles')
          .select('*')
          .eq('outlet_id', outletId);

        const { data: items } = await supabase
          .from('lab_ops_inventory_items')
          .select('*')
          .eq('outlet_id', outletId);

        return {
          bottles: bottles || [],
          items: items || [],
          summary: {
            totalBottles: bottles?.length || 0,
            activeBottles: bottles?.filter(b => b.status === 'active').length || 0,
            lowStock: bottles?.filter(b => (b.current_level_ml / b.bottle_size_ml) < 0.2).length || 0
          }
        };
      }

      case 'financial': {
        const { data: orders } = await supabase
          .from('lab_ops_orders')
          .select('*')
          .eq('outlet_id', outletId)
          .eq('status', 'closed')
          .gte('closed_at', daysAgo.toISOString());

        const { data: readings } = await supabase
          .from('lab_ops_pourer_readings')
          .select('*, lab_ops_bottles(spirit_type)')
          .eq('outlet_id', outletId)
          .gte('reading_timestamp', daysAgo.toISOString());

        const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
        const estimatedCost = (readings?.reduce((sum, r) => sum + (r.ml_dispensed || 0), 0) || 0) * 0.05;

        return {
          orders: orders || [],
          readings: readings || [],
          summary: {
            totalRevenue,
            estimatedCost,
            grossProfit: totalRevenue - estimatedCost,
            gpPct: totalRevenue > 0 ? ((totalRevenue - estimatedCost) / totalRevenue) * 100 : 0
          }
        };
      }

      default:
        return { summary: {} };
    }
  };

  const exportToPDF = async () => {
    setProgress(10);
    const data = await fetchReportData();
    setProgress(40);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text('SpecVerse', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(reportTypes.find(r => r.id === selectedReport)?.label || 'Report', 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`${outletName} | ${new Date().toLocaleDateString()} | Last ${getPeriodDays()} days`, 14, 38);

    setProgress(60);

    // Summary section
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, 50);

    const summaryData = Object.entries(data.summary || {}).map(([key, value]) => [
      key.replace(/([A-Z])/g, ' $1').trim(),
      typeof value === 'number' ? 
        key.toLowerCase().includes('pct') ? `${Math.round(value as number)}%` :
        key.toLowerCase().includes('revenue') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('profit') ? 
          `€${Math.round(value as number * 100) / 100}` : 
          Math.round(value as number).toString()
        : String(value)
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 204] }
    });

    setProgress(80);

    // Detailed data tables based on report type
    let detailTableY = (doc as any).lastAutoTable.finalY + 15;

    if (selectedReport === 'variance' && data.pourings?.length > 0) {
      doc.text('Physical Consumption Details', 14, detailTableY);
      autoTable(doc, {
        startY: detailTableY + 5,
        head: [['Time', 'Spirit', 'Amount (ml)', 'Source']],
        body: data.pourings.slice(0, 20).map((p: any) => [
          new Date(p.reading_timestamp).toLocaleString(),
          p.lab_ops_bottles?.spirit_type || 'Unknown',
          p.ml_dispensed,
          p.reading_source || 'manual'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }
      });
    }

    if (selectedReport === 'inventory' && data.bottles?.length > 0) {
      doc.text('Bottle Inventory', 14, detailTableY);
      autoTable(doc, {
        startY: detailTableY + 5,
        head: [['Bottle', 'Spirit', 'Level', 'Status']],
        body: data.bottles.map((b: any) => [
          b.bottle_name,
          b.spirit_type,
          `${Math.round((b.current_level_ml / b.bottle_size_ml) * 100)}%`,
          b.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] }
      });
    }

    setProgress(90);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Generated by SpecVerse | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    setProgress(100);
    doc.save(`${outletName}_${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    setProgress(10);
    const data = await fetchReportData();
    setProgress(50);

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['SpecVerse Report'],
      [reportTypes.find(r => r.id === selectedReport)?.label],
      [`${outletName} | Generated: ${new Date().toLocaleString()}`],
      [],
      ['Metric', 'Value'],
      ...Object.entries(data.summary || {}).map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').trim(),
        value
      ])
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    setProgress(70);

    // Detail sheets based on report type
    if (data.pourings?.length > 0) {
      const pourSheet = XLSX.utils.json_to_sheet(data.pourings.map((p: any) => ({
        Timestamp: p.reading_timestamp,
        Spirit: p.lab_ops_bottles?.spirit_type || 'Unknown',
        'Amount (ml)': p.ml_dispensed,
        Source: p.reading_source || 'manual'
      })));
      XLSX.utils.book_append_sheet(workbook, pourSheet, 'Pour Readings');
    }

    if (data.orders?.length > 0) {
      const orderSheet = XLSX.utils.json_to_sheet(data.orders.map((o: any) => ({
        'Order ID': o.id,
        'Created': o.created_at,
        'Status': o.status,
        'Total': o.total_amount,
        'Covers': o.covers
      })));
      XLSX.utils.book_append_sheet(workbook, orderSheet, 'Orders');
    }

    if (data.bottles?.length > 0) {
      const bottleSheet = XLSX.utils.json_to_sheet(data.bottles.map((b: any) => ({
        'Bottle': b.bottle_name,
        'Spirit': b.spirit_type,
        'Size (ml)': b.bottle_size_ml,
        'Current (ml)': b.current_level_ml,
        'Level %': Math.round((b.current_level_ml / b.bottle_size_ml) * 100),
        'Status': b.status
      })));
      XLSX.utils.book_append_sheet(workbook, bottleSheet, 'Inventory');
    }

    setProgress(90);
    XLSX.writeFile(workbook, `${outletName}_${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setProgress(100);
  };

  const exportToPPT = async () => {
    // For PPT, we'll create a downloadable HTML that can be imported to PowerPoint
    // Full PPTX generation would require pptxgenjs library
    setProgress(10);
    const data = await fetchReportData();
    setProgress(50);

    const reportTitle = reportTypes.find(r => r.id === selectedReport)?.label || 'Report';
    
    // Create HTML content that can be copy-pasted into PowerPoint
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    .slide { page-break-after: always; padding: 40px; border: 1px solid #ddd; margin-bottom: 20px; }
    h1 { color: #0066cc; }
    h2 { color: #333; }
    .metric { display: inline-block; width: 200px; margin: 10px; padding: 20px; background: #f5f5f5; text-align: center; }
    .metric-value { font-size: 32px; font-weight: bold; color: #0066cc; }
    .metric-label { font-size: 14px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
    th { background: #0066cc; color: white; }
  </style>
</head>
<body>
  <div class="slide">
    <h1>SpecVerse</h1>
    <h2>${reportTitle}</h2>
    <p>${outletName} | ${new Date().toLocaleDateString()} | Last ${getPeriodDays()} days</p>
  </div>
  
  <div class="slide">
    <h2>Key Metrics</h2>
    <div>
      ${Object.entries(data.summary || {}).map(([key, value]) => `
        <div class="metric">
          <div class="metric-value">${
            typeof value === 'number' ? 
              key.toLowerCase().includes('pct') ? `${Math.round(value as number)}%` :
              key.toLowerCase().includes('revenue') || key.toLowerCase().includes('cost') ? 
                `€${Math.round(value as number)}` : Math.round(value as number)
              : value
          }</div>
          <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

    setProgress(80);

    // Download as HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outletName}_${selectedReport}_presentation.html`;
    a.click();
    URL.revokeObjectURL(url);

    setProgress(100);
    toast.info('HTML presentation downloaded. Open in browser and copy to PowerPoint.');
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setProgress(0);

    try {
      switch (format) {
        case 'pdf':
          await exportToPDF();
          toast.success('PDF report downloaded');
          break;
        case 'excel':
          await exportToExcel();
          toast.success('Excel report downloaded');
          break;
        case 'pptx':
          await exportToPPT();
          toast.success('Presentation downloaded');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Download className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Export Reports</h2>
      </div>

      {/* Report Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Select Report Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {reportTypes.map(report => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id as ReportType)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedReport === report.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${selectedReport === report.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{report.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </button>
              );
            })}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Period:</span>
            <div className="flex gap-1">
              {['1d', '7d', '30d'].map(p => (
                <button
                  key={p}
                  onClick={() => setDateRange(p)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    dateRange === p 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {p === '1d' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Export Format</CardTitle>
          <CardDescription>
            Download the {reportTypes.find(r => r.id === selectedReport)?.label} report
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isExporting ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating report...</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col h-auto py-4 gap-2"
                onClick={() => handleExport('pdf')}
              >
                <FileText className="w-8 h-8 text-red-500" />
                <span>PDF Report</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-4 gap-2"
                onClick={() => handleExport('excel')}
              >
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <span>Excel</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col h-auto py-4 gap-2"
                onClick={() => handleExport('pptx')}
              >
                <Presentation className="w-8 h-8 text-orange-500" />
                <span>Presentation</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}