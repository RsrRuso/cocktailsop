import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Package, ArrowUpRight, ArrowDownRight, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const StockMovementReport = () => {
  const [dateRange, setDateRange] = useState('week');

  const data = {
    totalIn: 485,
    totalOut: 392,
    adjustments: 12,
    netChange: 81,
    movements: [
      { date: '2024-01-15', item: 'Grey Goose Vodka', type: 'in', qty: 24, source: 'Purchase Order #1234' },
      { date: '2024-01-15', item: 'Grey Goose Vodka', type: 'out', qty: 8, source: 'Bar Usage' },
      { date: '2024-01-14', item: 'Hendricks Gin', type: 'in', qty: 12, source: 'Purchase Order #1233' },
      { date: '2024-01-14', item: 'Patron Silver', type: 'out', qty: 15, source: 'Bar Usage' },
      { date: '2024-01-14', item: 'Jameson Whiskey', type: 'adjust', qty: -2, source: 'Spillage' },
      { date: '2024-01-13', item: 'Absolut Vodka', type: 'in', qty: 36, source: 'Purchase Order #1232' },
      { date: '2024-01-13', item: 'Bacardi White', type: 'out', qty: 18, source: 'Bar Usage' },
      { date: '2024-01-13', item: 'Jack Daniels', type: 'transfer', qty: 6, source: 'To Outdoor Bar' },
    ],
    topMovers: [
      { item: 'Grey Goose Vodka', inQty: 48, outQty: 42, net: 6 },
      { item: 'Patron Silver', inQty: 24, outQty: 28, net: -4 },
      { item: 'Hendricks Gin', inQty: 36, outQty: 32, net: 4 },
      { item: 'Absolut Vodka', inQty: 72, outQty: 65, net: 7 },
      { item: 'Bacardi White', inQty: 48, outQty: 52, net: -4 },
    ],
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-green-500';
      case 'out': return 'bg-red-500';
      case 'adjust': return 'bg-amber-500';
      case 'transfer': return 'bg-blue-500';
      default: return 'bg-muted';
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Stock Movement Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);

    autoTable(doc, {
      startY: 40,
      head: [['Date', 'Item', 'Type', 'Qty', 'Source']],
      body: data.movements.map(m => [
        m.date,
        m.item,
        m.type.toUpperCase(),
        m.qty.toString(),
        m.source,
      ]),
      theme: 'striped',
    });

    doc.save(`stock-movement-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Stock Movement Report exported!');
  };

  return (
    <ReportLayout
      title="Stock Movement Report"
      description="Track inventory in/out movements"
      icon={Package}
      color="from-blue-500 to-indigo-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total In"
          value={data.totalIn}
          icon={ArrowUpRight}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Total Out"
          value={data.totalOut}
          icon={ArrowDownRight}
          color="from-red-500 to-rose-600"
        />
        <MetricCard
          title="Adjustments"
          value={data.adjustments}
          icon={RotateCcw}
          color="from-amber-500 to-orange-600"
        />
        <MetricCard
          title="Net Change"
          value={data.netChange}
          icon={Package}
          trend={data.netChange > 0 ? 5 : -5}
          color="from-blue-500 to-indigo-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Movement Log */}
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Movement Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.movements.map((mov, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">{mov.date}</TableCell>
                    <TableCell className="font-medium">{mov.item}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(mov.type)}>
                        {mov.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : ''}{Math.abs(mov.qty)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{mov.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Movers */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Top Moving Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topMovers.map((item) => (
                <div key={item.item} className="p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium mb-2">{item.item}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">In</p>
                      <p className="text-green-500 font-semibold">+{item.inQty}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Out</p>
                      <p className="text-red-500 font-semibold">-{item.outQty}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net</p>
                      <p className={`font-semibold ${item.net >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>
                        {item.net >= 0 ? '+' : ''}{item.net}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default StockMovementReport;
