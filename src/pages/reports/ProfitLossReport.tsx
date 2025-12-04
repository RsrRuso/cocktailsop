import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { TrendingUp, DollarSign, Percent, MinusCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const ProfitLossReport = () => {
  const [dateRange, setDateRange] = useState('month');

  // Mock data - replace with real data
  const data = {
    revenue: {
      foodSales: 45000,
      beverageSales: 32000,
      otherIncome: 3000,
      total: 80000,
    },
    cogs: {
      foodCost: 13500,
      beverageCost: 8000,
      total: 21500,
    },
    grossProfit: 58500,
    grossMargin: 73.1,
    operatingExpenses: {
      labor: 24000,
      rent: 8000,
      utilities: 2500,
      marketing: 1500,
      supplies: 1200,
      insurance: 800,
      maintenance: 600,
      other: 1400,
      total: 40000,
    },
    netProfit: 18500,
    netMargin: 23.1,
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Profit & Loss Statement', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    let yPos = 45;

    // Revenue Section
    doc.setFontSize(14);
    doc.text('Revenue', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: [
        ['Food Sales', `$${data.revenue.foodSales.toLocaleString()}`],
        ['Beverage Sales', `$${data.revenue.beverageSales.toLocaleString()}`],
        ['Other Income', `$${data.revenue.otherIncome.toLocaleString()}`],
        ['Total Revenue', `$${data.revenue.total.toLocaleString()}`],
      ],
      theme: 'striped',
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // COGS Section
    doc.setFontSize(14);
    doc.text('Cost of Goods Sold', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Amount']],
      body: [
        ['Food Cost', `$${data.cogs.foodCost.toLocaleString()}`],
        ['Beverage Cost', `$${data.cogs.beverageCost.toLocaleString()}`],
        ['Total COGS', `$${data.cogs.total.toLocaleString()}`],
      ],
      theme: 'striped',
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Amount', 'Margin']],
      body: [
        ['Gross Profit', `$${data.grossProfit.toLocaleString()}`, `${data.grossMargin}%`],
        ['Operating Expenses', `$${data.operatingExpenses.total.toLocaleString()}`, '-'],
        ['Net Profit', `$${data.netProfit.toLocaleString()}`, `${data.netMargin}%`],
      ],
      theme: 'striped',
    });

    doc.save(`profit-loss-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('P&L Report exported!');
  };

  return (
    <ReportLayout
      title="Profit & Loss Statement"
      description="Revenue, costs, and net profit summary"
      icon={TrendingUp}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={data.revenue.total}
          format="currency"
          icon={DollarSign}
          trend={8.5}
          color="from-emerald-500 to-green-600"
        />
        <MetricCard
          title="Gross Profit"
          value={data.grossProfit}
          format="currency"
          icon={TrendingUp}
          trend={5.2}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Net Profit"
          value={data.netProfit}
          format="currency"
          icon={DollarSign}
          trend={12.3}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Net Margin"
          value={data.netMargin}
          format="percent"
          icon={Percent}
          trend={2.1}
          color="from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Revenue Breakdown
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
                <TableRow>
                  <TableCell>Food Sales</TableCell>
                  <TableCell className="text-right">${data.revenue.foodSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((data.revenue.foodSales / data.revenue.total) * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Beverage Sales</TableCell>
                  <TableCell className="text-right">${data.revenue.beverageSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((data.revenue.beverageSales / data.revenue.total) * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Other Income</TableCell>
                  <TableCell className="text-right">${data.revenue.otherIncome.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((data.revenue.otherIncome / data.revenue.total) * 100).toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total Revenue</TableCell>
                  <TableCell className="text-right text-green-500">${data.revenue.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Operating Expenses */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MinusCircle className="h-5 w-5 text-red-500" />
              Operating Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.operatingExpenses).filter(([key]) => key !== 'total').map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="capitalize">{key}</TableCell>
                    <TableCell className="text-right">${value.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{((value / data.revenue.total) * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total Expenses</TableCell>
                  <TableCell className="text-right text-red-500">${data.operatingExpenses.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((data.operatingExpenses.total / data.revenue.total) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>P&L Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Total Revenue</span>
              <span className="font-bold text-green-500">${data.revenue.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Cost of Goods Sold</span>
              <span className="font-bold text-red-500">-${data.cogs.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 rounded">
              <span className="font-semibold">Gross Profit</span>
              <span className="font-bold">${data.grossProfit.toLocaleString()} ({data.grossMargin}%)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Operating Expenses</span>
              <span className="font-bold text-red-500">-${data.operatingExpenses.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-primary/10 px-2 rounded-lg">
              <span className="font-bold text-lg">Net Profit</span>
              <span className="font-bold text-lg text-primary">${data.netProfit.toLocaleString()} ({data.netMargin}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default ProfitLossReport;
