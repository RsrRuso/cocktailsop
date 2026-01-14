import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Users, DollarSign, Percent, Clock, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const LaborCostReport = () => {
  const [dateRange, setDateRange] = useState('month');

  const data = {
    totalLaborCost: 24000,
    laborPercent: 30,
    revenue: 80000,
    totalHours: 1200,
    salesPerLaborHour: 66.67,
    costPerCover: 11.16,
    covers: 2150,
    departments: [
      { name: 'Front of House', employees: 12, hours: 520, wages: 9360, tips: 4800 },
      { name: 'Back of House', employees: 8, hours: 480, wages: 8640, tips: 0 },
      { name: 'Management', employees: 3, hours: 200, wages: 6000, tips: 0 },
    ],
    overtime: {
      hours: 45,
      cost: 1350,
      employees: 5,
    },
    byRole: [
      { role: 'Server', count: 6, avgWage: 12, hours: 280, total: 3360 },
      { role: 'Bartender', count: 4, avgWage: 15, hours: 200, total: 3000 },
      { role: 'Line Cook', count: 4, avgWage: 16, hours: 240, total: 3840 },
      { role: 'Prep Cook', count: 2, avgWage: 14, hours: 120, total: 1680 },
      { role: 'Host', count: 2, avgWage: 11, hours: 80, total: 880 },
      { role: 'Dishwasher', count: 2, avgWage: 12, hours: 120, total: 1440 },
      { role: 'Manager', count: 3, avgWage: 30, hours: 160, total: 4800 },
    ],
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Labor Cost Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Labor Cost', `$${data.totalLaborCost.toLocaleString()}`],
        ['Labor Cost %', `${data.laborPercent}%`],
        ['Total Hours', data.totalHours.toString()],
        ['Sales/Labor Hour', `$${data.salesPerLaborHour.toFixed(2)}`],
      ],
      theme: 'grid',
    });

    let yPos = (doc as any).lastAutoTable.finalY + 15;

    autoTable(doc, {
      startY: yPos,
      head: [['Department', 'Employees', 'Hours', 'Wages', 'Tips']],
      body: data.departments.map(d => [
        d.name,
        d.employees.toString(),
        d.hours.toString(),
        `$${d.wages.toLocaleString()}`,
        `$${d.tips.toLocaleString()}`,
      ]),
      theme: 'striped',
    });

    doc.save(`labor-cost-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Labor Cost Report exported!');
  };

  return (
    <ReportLayout
      title="Labor Cost Report"
      description="Staff expense tracking and analysis"
      icon={Users}
      color="from-cyan-500 to-teal-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Labor Cost"
          value={data.totalLaborCost}
          format="currency"
          icon={DollarSign}
          trend={-1.5}
          color="from-cyan-500 to-teal-600"
        />
        <MetricCard
          title="Labor Cost %"
          value={data.laborPercent}
          format="percent"
          icon={Percent}
          trend={-0.8}
          trendLabel="improvement"
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Total Hours"
          value={data.totalHours}
          icon={Clock}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Sales/Labor Hour"
          value={data.salesPerLaborHour}
          format="currency"
          icon={TrendingUp}
          trend={5.2}
          color="from-green-500 to-emerald-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Department */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Labor by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Wages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.departments.map((dept) => (
                  <TableRow key={dept.name}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-right">{dept.employees}</TableCell>
                    <TableCell className="text-right">{dept.hours}</TableCell>
                    <TableCell className="text-right">${dept.wages.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{data.departments.reduce((a, b) => a + b.employees, 0)}</TableCell>
                  <TableCell className="text-right">{data.departments.reduce((a, b) => a + b.hours, 0)}</TableCell>
                  <TableCell className="text-right text-primary">${data.departments.reduce((a, b) => a + b.wages, 0).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* By Role */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Labor by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">Avg/hr</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byRole.map((role) => (
                  <TableRow key={role.role}>
                    <TableCell className="font-medium">{role.role}</TableCell>
                    <TableCell className="text-right">{role.count}</TableCell>
                    <TableCell className="text-right">${role.avgWage}</TableCell>
                    <TableCell className="text-right">${role.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Overtime & Productivity */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Overtime Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-amber-500">{data.overtime.hours}</p>
                <p className="text-sm text-muted-foreground">OT Hours</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-red-500">${data.overtime.cost.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">OT Cost</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{data.overtime.employees}</p>
                <p className="text-sm text-muted-foreground">Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Productivity Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-green-500">${data.salesPerLaborHour.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Sales/Labor Hour</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold text-blue-500">${data.costPerCover.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Labor Cost/Cover</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Covers Served</p>
              <p className="text-xl font-bold">{data.covers.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportLayout>
  );
};

export default LaborCostReport;
