import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { FileText, DollarSign, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const DailyOpsReport = () => {
  const [dateRange, setDateRange] = useState('today');

  const data = {
    summary: {
      totalRevenue: 4850,
      totalCovers: 215,
      avgCheck: 22.56,
      laborCost: 850,
      laborPercent: 17.5,
    },
    shifts: [
      { name: 'Morning', hours: '6am-2pm', staff: 4, revenue: 1200, covers: 65 },
      { name: 'Afternoon', hours: '2pm-10pm', staff: 8, revenue: 2800, covers: 110 },
      { name: 'Night', hours: '10pm-2am', staff: 3, revenue: 850, covers: 40 },
    ],
    highlights: [
      { type: 'success', message: 'Revenue up 12% vs last week' },
      { type: 'success', message: 'Labor cost under target (17.5% vs 20%)' },
      { type: 'warning', message: '3 inventory items below par level' },
      { type: 'info', message: '2 new staff completed training' },
    ],
    issues: [
      { time: '14:30', issue: 'POS system slow', status: 'resolved', resolution: 'Restarted terminal' },
      { time: '19:45', issue: 'Kitchen ticket printer jam', status: 'resolved', resolution: 'Cleared paper jam' },
      { time: '21:00', issue: 'AC unit malfunction', status: 'pending', resolution: 'Maintenance called' },
    ],
  };

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/10 border-green-500 text-green-500';
      case 'warning': return 'bg-amber-500/10 border-amber-500 text-amber-500';
      case 'info': return 'bg-blue-500/10 border-blue-500 text-blue-500';
      default: return 'bg-muted';
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Daily Operations Summary', 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 28);

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', `$${data.summary.totalRevenue.toLocaleString()}`],
        ['Total Covers', data.summary.totalCovers.toString()],
        ['Average Check', `$${data.summary.avgCheck.toFixed(2)}`],
        ['Labor Cost', `$${data.summary.laborCost} (${data.summary.laborPercent}%)`],
      ],
      theme: 'grid',
    });

    let yPos = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.text('Shift Breakdown', 14, yPos);

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Shift', 'Hours', 'Staff', 'Revenue', 'Covers']],
      body: data.shifts.map(s => [
        s.name,
        s.hours,
        s.staff.toString(),
        `$${s.revenue.toLocaleString()}`,
        s.covers.toString(),
      ]),
      theme: 'striped',
    });

    doc.save(`daily-ops-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Daily Operations Report exported!');
  };

  return (
    <ReportLayout
      title="Daily Operations Summary"
      description="Complete overview of daily business operations"
      icon={FileText}
      color="from-rose-500 to-red-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={data.summary.totalRevenue}
          format="currency"
          icon={DollarSign}
          trend={12}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Covers"
          value={data.summary.totalCovers}
          icon={Users}
          trend={8}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Avg Check"
          value={data.summary.avgCheck}
          format="currency"
          icon={TrendingUp}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Labor Cost"
          value={data.summary.laborCost}
          format="currency"
          icon={Clock}
          color="from-amber-500 to-orange-600"
        />
        <MetricCard
          title="Labor %"
          value={data.summary.laborPercent}
          format="percent"
          icon={TrendingUp}
          trend={-2.5}
          trendLabel="improvement"
          color="from-cyan-500 to-teal-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shift Breakdown */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Shift Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Covers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.shifts.map((shift) => (
                  <TableRow key={shift.name}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell className="text-muted-foreground">{shift.hours}</TableCell>
                    <TableCell className="text-right">{shift.staff}</TableCell>
                    <TableCell className="text-right">${shift.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{shift.covers}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{data.shifts.reduce((a, b) => a + b.staff, 0)}</TableCell>
                  <TableCell className="text-right text-green-500">${data.summary.totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{data.summary.totalCovers}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Highlights */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Daily Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.highlights.map((highlight, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${getHighlightColor(highlight.type)}`}>
                  {highlight.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues & Resolutions */}
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Issues & Resolutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.issues.map((issue, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground">{issue.time}</TableCell>
                  <TableCell className="font-medium">{issue.issue}</TableCell>
                  <TableCell>
                    <Badge variant={issue.status === 'resolved' ? 'default' : 'destructive'}>
                      {issue.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{issue.resolution}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default DailyOpsReport;
