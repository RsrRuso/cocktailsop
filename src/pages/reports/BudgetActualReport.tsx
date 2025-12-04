import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Target, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BudgetActualReport = () => {
  const [dateRange, setDateRange] = useState('month');

  const data = {
    totalBudget: 100000,
    totalActual: 95500,
    variance: 4500,
    variancePercent: 4.5,
    categories: [
      { name: 'Revenue', budget: 85000, actual: 80000, variance: -5000 },
      { name: 'Food Cost', budget: 22000, actual: 21500, variance: 500 },
      { name: 'Beverage Cost', budget: 8500, actual: 8000, variance: 500 },
      { name: 'Labor', budget: 25500, actual: 24000, variance: 1500 },
      { name: 'Rent', budget: 8000, actual: 8000, variance: 0 },
      { name: 'Utilities', budget: 3000, actual: 2500, variance: 500 },
      { name: 'Marketing', budget: 2000, actual: 1500, variance: 500 },
      { name: 'Supplies', budget: 1500, actual: 1200, variance: 300 },
      { name: 'Other', budget: 2000, actual: 1400, variance: 600 },
    ],
  };

  const getVarianceColor = (variance: number, isRevenue: boolean = false) => {
    if (variance === 0) return 'text-muted-foreground';
    if (isRevenue) return variance > 0 ? 'text-green-500' : 'text-red-500';
    return variance > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Budget vs Actual Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);

    autoTable(doc, {
      startY: 40,
      head: [['Category', 'Budget', 'Actual', 'Variance', '%']],
      body: data.categories.map(c => [
        c.name,
        `$${c.budget.toLocaleString()}`,
        `$${c.actual.toLocaleString()}`,
        `$${c.variance.toLocaleString()}`,
        `${((c.variance / c.budget) * 100).toFixed(1)}%`,
      ]),
      theme: 'striped',
    });

    doc.save(`budget-actual-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Budget vs Actual Report exported!');
  };

  return (
    <ReportLayout
      title="Budget vs Actual"
      description="Compare planned vs real performance"
      icon={Target}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Budget"
          value={data.totalBudget}
          format="currency"
          icon={Target}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Total Actual"
          value={data.totalActual}
          format="currency"
          icon={TrendingUp}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Variance"
          value={data.variance}
          format="currency"
          icon={data.variance >= 0 ? TrendingUp : TrendingDown}
          color={data.variance >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}
        />
        <MetricCard
          title="Variance %"
          value={data.variancePercent}
          format="percent"
          icon={AlertTriangle}
          color="from-amber-500 to-orange-600"
        />
      </div>

      {/* Budget Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Budget vs Actual by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.categories.map((cat) => {
                const isRevenue = cat.name === 'Revenue';
                const progress = (cat.actual / cat.budget) * 100;
                
                return (
                  <TableRow key={cat.name}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-right">${cat.budget.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${cat.actual.toLocaleString()}</TableCell>
                    <TableCell className={cn('text-right', getVarianceColor(cat.variance, isRevenue))}>
                      <div className="flex items-center justify-end gap-1">
                        {getVarianceIcon(cat.variance)}
                        ${Math.abs(cat.variance).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min(progress, 100)} 
                          className="h-2 w-20"
                        />
                        <span className="text-xs text-muted-foreground w-10">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Visual Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg text-green-500">Under Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categories.filter(c => c.variance > 0).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                  <span>{cat.name}</span>
                  <span className="font-semibold text-green-500">+${cat.variance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg text-red-500">Over Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categories.filter(c => c.variance < 0).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                  <span>{cat.name}</span>
                  <span className="font-semibold text-red-500">${cat.variance.toLocaleString()}</span>
                </div>
              ))}
              {data.categories.filter(c => c.variance < 0).length === 0 && (
                <p className="text-muted-foreground text-center py-4">All categories within budget!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default BudgetActualReport;
