import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Package, DollarSign, Percent, TrendingDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const COGSReport = () => {
  const [dateRange, setDateRange] = useState('month');

  const data = {
    totalCOGS: 21500,
    cogsPercent: 26.9,
    revenue: 80000,
    grossProfit: 58500,
    categories: [
      { name: 'Spirits', opening: 8000, purchases: 5500, closing: 6500, cogs: 7000 },
      { name: 'Beer', opening: 2500, purchases: 2000, closing: 2200, cogs: 2300 },
      { name: 'Wine', opening: 4000, purchases: 3000, closing: 3500, cogs: 3500 },
      { name: 'Food', opening: 3000, purchases: 12000, closing: 2500, cogs: 12500 },
      { name: 'Non-Alcoholic', opening: 1000, purchases: 1500, closing: 700, cogs: 1800 },
      { name: 'Supplies', opening: 500, purchases: 800, closing: 400, cogs: 900 },
    ],
    topCostItems: [
      { item: 'Premium Vodka', cost: 1200, units: 48, costPerUnit: 25 },
      { item: 'Ribeye Steak', cost: 980, units: 35, costPerUnit: 28 },
      { item: 'Champagne', cost: 850, units: 17, costPerUnit: 50 },
      { item: 'Fresh Seafood', cost: 750, units: 50, costPerUnit: 15 },
      { item: 'Premium Whiskey', cost: 680, units: 20, costPerUnit: 34 },
    ],
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Cost of Goods Sold Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    autoTable(doc, {
      startY: 45,
      head: [['Category', 'Opening', 'Purchases', 'Closing', 'COGS']],
      body: data.categories.map(c => [
        c.name,
        `$${c.opening.toLocaleString()}`,
        `$${c.purchases.toLocaleString()}`,
        `$${c.closing.toLocaleString()}`,
        `$${c.cogs.toLocaleString()}`,
      ]),
      foot: [['Total', '', '', '', `$${data.totalCOGS.toLocaleString()}`]],
      theme: 'striped',
    });

    doc.save(`cogs-report-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('COGS Report exported!');
  };

  return (
    <ReportLayout
      title="Cost of Goods Sold"
      description="Detailed product cost breakdown and analysis"
      icon={Package}
      color="from-orange-500 to-red-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total COGS"
          value={data.totalCOGS}
          format="currency"
          icon={Package}
          trend={-2.5}
          color="from-orange-500 to-red-600"
        />
        <MetricCard
          title="COGS %"
          value={data.cogsPercent}
          format="percent"
          icon={Percent}
          trend={-1.2}
          trendLabel="improvement"
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Revenue"
          value={data.revenue}
          format="currency"
          icon={DollarSign}
          trend={8.5}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Gross Profit"
          value={data.grossProfit}
          format="currency"
          icon={TrendingDown}
          trend={5.2}
          color="from-purple-500 to-pink-600"
        />
      </div>

      {/* COGS by Category */}
      <Card className="glass mb-6">
        <CardHeader>
          <CardTitle className="text-lg">COGS by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead className="text-right">COGS</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((cat) => (
                <TableRow key={cat.name}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-right">${cat.opening.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${cat.purchases.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${cat.closing.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">${cat.cogs.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((cat.cogs / data.totalCOGS) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold border-t-2 bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">${data.categories.reduce((a, b) => a + b.opening, 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">${data.categories.reduce((a, b) => a + b.purchases, 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">${data.categories.reduce((a, b) => a + b.closing, 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-primary">${data.totalCOGS.toLocaleString()}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* COGS Formula */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">COGS Calculation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-mono text-center">
                  COGS = Opening Inventory + Purchases - Closing Inventory
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Opening Inventory</span>
                  <span className="font-semibold">${data.categories.reduce((a, b) => a + b.opening, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ Purchases</span>
                  <span className="font-semibold">${data.categories.reduce((a, b) => a + b.purchases, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>- Closing Inventory</span>
                  <span className="font-semibold">${data.categories.reduce((a, b) => a + b.closing, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>= Total COGS</span>
                  <span className="text-primary">${data.totalCOGS.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Cost Items */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Top Cost Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">$/Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCostItems.map((item, idx) => (
                  <TableRow key={item.item}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        {item.item}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">${item.cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{item.units}</TableCell>
                    <TableCell className="text-right">${item.costPerUnit}</TableCell>
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

export default COGSReport;
