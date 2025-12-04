import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { PieChart, DollarSign, TrendingUp, Percent } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const RevenueByCategory = () => {
  const [dateRange, setDateRange] = useState('month');

  const data = {
    totalRevenue: 80000,
    categories: [
      { name: 'Cocktails', revenue: 28000, percent: 35, trend: 12, color: 'bg-purple-500' },
      { name: 'Food', revenue: 24000, percent: 30, trend: 8, color: 'bg-amber-500' },
      { name: 'Beer', revenue: 12000, percent: 15, trend: -2, color: 'bg-yellow-500' },
      { name: 'Wine', revenue: 8000, percent: 10, trend: 5, color: 'bg-red-500' },
      { name: 'Spirits (Neat)', revenue: 4800, percent: 6, trend: 15, color: 'bg-blue-500' },
      { name: 'Non-Alcoholic', revenue: 3200, percent: 4, trend: 20, color: 'bg-green-500' },
    ],
    timeOfDay: [
      { period: 'Lunch (11am-3pm)', revenue: 16000, percent: 20 },
      { period: 'Happy Hour (3pm-6pm)', revenue: 12000, percent: 15 },
      { period: 'Dinner (6pm-9pm)', revenue: 32000, percent: 40 },
      { period: 'Late Night (9pm-2am)', revenue: 20000, percent: 25 },
    ],
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Revenue by Category Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);

    autoTable(doc, {
      startY: 40,
      head: [['Category', 'Revenue', '% of Total', 'Trend']],
      body: data.categories.map(c => [
        c.name,
        `$${c.revenue.toLocaleString()}`,
        `${c.percent}%`,
        `${c.trend >= 0 ? '+' : ''}${c.trend}%`,
      ]),
      theme: 'striped',
    });

    doc.save(`revenue-category-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Revenue by Category Report exported!');
  };

  return (
    <ReportLayout
      title="Revenue by Category"
      description="Analyze revenue streams by product category"
      icon={PieChart}
      color="from-purple-500 to-pink-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={data.totalRevenue}
          format="currency"
          icon={DollarSign}
          trend={8.5}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Top Category"
          value="Cocktails"
          subtitle="35% of revenue"
          icon={TrendingUp}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Categories"
          value={data.categories.length}
          icon={PieChart}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Avg Category"
          value={data.totalRevenue / data.categories.length}
          format="currency"
          icon={Percent}
          color="from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.categories.map((cat) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span>${cat.revenue.toLocaleString()} ({cat.percent}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${cat.color} rounded-full transition-all`}
                      style={{ width: `${cat.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-xs ${cat.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {cat.trend >= 0 ? '↑' : '↓'} {Math.abs(cat.trend)}% vs last period
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time of Day */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Time of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.timeOfDay.map((period) => (
                  <TableRow key={period.period}>
                    <TableCell className="font-medium">{period.period}</TableCell>
                    <TableCell className="text-right">${period.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{period.percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium mb-2">Peak Revenue Period</p>
              <p className="text-2xl font-bold text-primary">Dinner (6pm-9pm)</p>
              <p className="text-sm text-muted-foreground">40% of daily revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Table */}
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Detailed Category Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead className="text-right">Trend</TableHead>
                <TableHead className="text-right">Avg Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((cat) => (
                <TableRow key={cat.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                      {cat.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">${cat.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{cat.percent}%</TableCell>
                  <TableCell className={`text-right ${cat.trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {cat.trend >= 0 ? '+' : ''}{cat.trend}%
                  </TableCell>
                  <TableCell className="text-right">${(cat.revenue / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RevenueByCategory;
