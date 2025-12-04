import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Wallet, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const CashFlowReport = () => {
  const [dateRange, setDateRange] = useState('month');

  const data = {
    beginningCash: 25000,
    endingCash: 32500,
    netCashFlow: 7500,
    operating: {
      inflows: [
        { item: 'Customer Receipts', amount: 85000 },
        { item: 'Other Operating Income', amount: 2500 },
      ],
      outflows: [
        { item: 'Supplier Payments', amount: -28000 },
        { item: 'Payroll', amount: -24000 },
        { item: 'Rent', amount: -8000 },
        { item: 'Utilities', amount: -2500 },
        { item: 'Other Operating Expenses', amount: -5500 },
      ],
      net: 19500,
    },
    investing: {
      inflows: [
        { item: 'Equipment Sale', amount: 2000 },
      ],
      outflows: [
        { item: 'Equipment Purchase', amount: -8000 },
        { item: 'Renovation', amount: -5000 },
      ],
      net: -11000,
    },
    financing: {
      inflows: [
        { item: 'Owner Investment', amount: 5000 },
      ],
      outflows: [
        { item: 'Loan Repayment', amount: -4000 },
        { item: 'Owner Withdrawals', amount: -2000 },
      ],
      net: -1000,
    },
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Cash Flow Statement', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);

    let yPos = 45;

    // Summary
    autoTable(doc, {
      startY: yPos,
      head: [['Cash Position', 'Amount']],
      body: [
        ['Beginning Cash', `$${data.beginningCash.toLocaleString()}`],
        ['Net Cash Flow', `$${data.netCashFlow.toLocaleString()}`],
        ['Ending Cash', `$${data.endingCash.toLocaleString()}`],
      ],
      theme: 'grid',
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Operating Activities
    doc.setFontSize(14);
    doc.text('Operating Activities', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Amount']],
      body: [
        ...data.operating.inflows.map(i => [i.item, `$${i.amount.toLocaleString()}`]),
        ...data.operating.outflows.map(i => [i.item, `$${i.amount.toLocaleString()}`]),
        ['Net Operating Cash Flow', `$${data.operating.net.toLocaleString()}`],
      ],
      theme: 'striped',
    });

    doc.save(`cash-flow-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Cash Flow Report exported!');
  };

  return (
    <ReportLayout
      title="Cash Flow Statement"
      description="Track money in and out of your business"
      icon={Wallet}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Beginning Cash"
          value={data.beginningCash}
          format="currency"
          icon={Wallet}
          color="from-slate-500 to-slate-600"
        />
        <MetricCard
          title="Cash Inflows"
          value={data.operating.inflows.reduce((a, b) => a + b.amount, 0) + data.investing.inflows.reduce((a, b) => a + b.amount, 0) + data.financing.inflows.reduce((a, b) => a + b.amount, 0)}
          format="currency"
          icon={ArrowUpRight}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Cash Outflows"
          value={Math.abs(data.operating.outflows.reduce((a, b) => a + b.amount, 0) + data.investing.outflows.reduce((a, b) => a + b.amount, 0) + data.financing.outflows.reduce((a, b) => a + b.amount, 0))}
          format="currency"
          icon={ArrowDownRight}
          color="from-red-500 to-rose-600"
        />
        <MetricCard
          title="Ending Cash"
          value={data.endingCash}
          format="currency"
          icon={DollarSign}
          trend={30}
          color="from-blue-500 to-indigo-600"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Operating Activities */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Operating Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Inflows</p>
                {data.operating.inflows.map((item) => (
                  <div key={item.item} className="flex justify-between py-1">
                    <span className="text-sm">{item.item}</span>
                    <span className="text-sm text-green-500">+${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Outflows</p>
                {data.operating.outflows.map((item) => (
                  <div key={item.item} className="flex justify-between py-1">
                    <span className="text-sm">{item.item}</span>
                    <span className="text-sm text-red-500">${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold">
                  <span>Net Operating</span>
                  <span className={data.operating.net >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${data.operating.net.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investing Activities */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-500" />
              Investing Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Inflows</p>
                {data.investing.inflows.map((item) => (
                  <div key={item.item} className="flex justify-between py-1">
                    <span className="text-sm">{item.item}</span>
                    <span className="text-sm text-green-500">+${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Outflows</p>
                {data.investing.outflows.map((item) => (
                  <div key={item.item} className="flex justify-between py-1">
                    <span className="text-sm">{item.item}</span>
                    <span className="text-sm text-red-500">${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold">
                  <span>Net Investing</span>
                  <span className={data.investing.net >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${data.investing.net.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financing Activities */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              Financing Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Inflows</p>
                {data.financing.inflows.map((item) => (
                  <div key={item.item} className="flex justify-between py-1">
                    <span className="text-sm">{item.item}</span>
                    <span className="text-sm text-green-500">+${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Outflows</p>
                {data.financing.outflows.map((item) => (
                  <div key={item.item} className="flex justify-between py-1">
                    <span className="text-sm">{item.item}</span>
                    <span className="text-sm text-red-500">${item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold">
                  <span>Net Financing</span>
                  <span className={data.financing.net >= 0 ? 'text-green-500' : 'text-red-500'}>
                    ${data.financing.net.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Summary */}
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Cash Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Beginning Cash Balance</span>
              <span className="font-bold">${data.beginningCash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Net Cash from Operating</span>
              <span className={`font-bold ${data.operating.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.operating.net >= 0 ? '+' : ''}${data.operating.net.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Net Cash from Investing</span>
              <span className={`font-bold ${data.investing.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.investing.net >= 0 ? '+' : ''}${data.investing.net.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Net Cash from Financing</span>
              <span className={`font-bold ${data.financing.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.financing.net >= 0 ? '+' : ''}${data.financing.net.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 bg-primary/10 px-2 rounded-lg">
              <span className="font-bold text-lg">Ending Cash Balance</span>
              <span className="font-bold text-lg text-primary">${data.endingCash.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default CashFlowReport;
