import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Receipt, DollarSign, Users, ShoppingCart, CreditCard, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const DailySalesReport = () => {
  const [dateRange, setDateRange] = useState('today');

  const data = {
    totalSales: 4850.75,
    transactions: 127,
    avgCheck: 38.19,
    covers: 215,
    salesByHour: [
      { hour: '11:00', sales: 320 },
      { hour: '12:00', sales: 580 },
      { hour: '13:00', sales: 620 },
      { hour: '14:00', sales: 280 },
      { hour: '15:00', sales: 150 },
      { hour: '16:00', sales: 180 },
      { hour: '17:00', sales: 350 },
      { hour: '18:00', sales: 520 },
      { hour: '19:00', sales: 680 },
      { hour: '20:00', sales: 590 },
      { hour: '21:00', sales: 420 },
      { hour: '22:00', sales: 160 },
    ],
    salesByCategory: [
      { category: 'Food', amount: 2450.50, percent: 50.5 },
      { category: 'Beverages', amount: 1820.25, percent: 37.5 },
      { category: 'Desserts', amount: 380.00, percent: 7.8 },
      { category: 'Other', amount: 200.00, percent: 4.2 },
    ],
    paymentMethods: [
      { method: 'Credit Card', amount: 3200.50, count: 85 },
      { method: 'Cash', amount: 980.25, count: 32 },
      { method: 'Debit Card', amount: 520.00, count: 8 },
      { method: 'Digital Wallet', amount: 150.00, count: 2 },
    ],
    topItems: [
      { name: 'Signature Burger', qty: 42, revenue: 588.00 },
      { name: 'House Margarita', qty: 38, revenue: 456.00 },
      { name: 'Caesar Salad', qty: 28, revenue: 336.00 },
      { name: 'Fish & Chips', qty: 25, revenue: 425.00 },
      { name: 'Craft Beer (Pint)', qty: 65, revenue: 455.00 },
    ],
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Daily Sales Summary', 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 28);

    // Key Metrics
    doc.setFontSize(14);
    doc.text('Key Metrics', 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales', `$${data.totalSales.toLocaleString()}`],
        ['Transactions', data.transactions.toString()],
        ['Average Check', `$${data.avgCheck.toFixed(2)}`],
        ['Covers', data.covers.toString()],
      ],
      theme: 'grid',
    });

    // Sales by Category
    let yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Sales by Category', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Category', 'Amount', '%']],
      body: data.salesByCategory.map(c => [c.category, `$${c.amount.toFixed(2)}`, `${c.percent}%`]),
      theme: 'striped',
    });

    // Top Items
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Top Selling Items', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Qty', 'Revenue']],
      body: data.topItems.map(i => [i.name, i.qty.toString(), `$${i.revenue.toFixed(2)}`]),
      theme: 'striped',
    });

    doc.save(`daily-sales-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Daily Sales Report exported!');
  };

  return (
    <ReportLayout
      title="Daily Sales Summary"
      description="End-of-day sales breakdown and analysis"
      icon={Receipt}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Sales"
          value={data.totalSales}
          format="currency"
          icon={DollarSign}
          trend={12.5}
          color="from-emerald-500 to-green-600"
        />
        <MetricCard
          title="Transactions"
          value={data.transactions}
          icon={ShoppingCart}
          trend={8.2}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Average Check"
          value={data.avgCheck}
          format="currency"
          icon={Receipt}
          trend={3.8}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Covers"
          value={data.covers}
          icon={Users}
          trend={5.5}
          color="from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales by Hour */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Sales by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.salesByHour.map((hour) => (
                <div key={hour.hour} className="flex items-center gap-3">
                  <span className="w-14 text-sm text-muted-foreground">{hour.hour}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                      style={{ width: `${(hour.sales / 700) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm font-medium text-right">${hour.sales}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              Sales by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.salesByCategory.map((cat) => (
                  <TableRow key={cat.category}>
                    <TableCell>{cat.category}</TableCell>
                    <TableCell className="text-right">${cat.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{cat.percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.paymentMethods.map((pm) => (
                  <TableRow key={pm.method}>
                    <TableCell>{pm.method}</TableCell>
                    <TableCell className="text-right">${pm.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{pm.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-500" />
              Top Selling Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topItems.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right">${item.revenue.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default DailySalesReport;
