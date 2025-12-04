import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Scale, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const BreakevenReport = () => {
  const [dateRange, setDateRange] = useState('month');
  const [fixedCosts, setFixedCosts] = useState(25000);
  const [avgSalePrice, setAvgSalePrice] = useState(35);
  const [avgVariableCost, setAvgVariableCost] = useState(12);

  const contributionMargin = avgSalePrice - avgVariableCost;
  const contributionMarginRatio = (contributionMargin / avgSalePrice) * 100;
  const breakevenUnits = Math.ceil(fixedCosts / contributionMargin);
  const breakevenRevenue = breakevenUnits * avgSalePrice;

  const currentSales = 1200; // Mock current sales units
  const currentRevenue = currentSales * avgSalePrice;
  const marginOfSafety = ((currentSales - breakevenUnits) / currentSales) * 100;
  const profitAtCurrent = (currentSales * contributionMargin) - fixedCosts;

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Breakeven Analysis Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    doc.setFontSize(14);
    doc.text('Inputs', 14, 45);
    doc.setFontSize(10);
    doc.text(`Fixed Costs: $${fixedCosts.toLocaleString()}`, 14, 55);
    doc.text(`Average Sale Price: $${avgSalePrice}`, 14, 62);
    doc.text(`Average Variable Cost: $${avgVariableCost}`, 14, 69);

    doc.setFontSize(14);
    doc.text('Results', 14, 85);
    doc.setFontSize(10);
    doc.text(`Contribution Margin: $${contributionMargin.toFixed(2)} per unit`, 14, 95);
    doc.text(`Contribution Margin Ratio: ${contributionMarginRatio.toFixed(1)}%`, 14, 102);
    doc.text(`Breakeven Units: ${breakevenUnits.toLocaleString()} units`, 14, 109);
    doc.text(`Breakeven Revenue: $${breakevenRevenue.toLocaleString()}`, 14, 116);

    doc.save(`breakeven-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Breakeven Analysis exported!');
  };

  return (
    <ReportLayout
      title="Breakeven Analysis"
      description="Calculate your breakeven point"
      icon={Scale}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      showDateFilter={false}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Breakeven Units"
          value={breakevenUnits}
          subtitle="units to break even"
          icon={Scale}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Breakeven Revenue"
          value={breakevenRevenue}
          format="currency"
          icon={DollarSign}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Contribution Margin"
          value={contributionMarginRatio}
          format="percent"
          icon={TrendingUp}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Margin of Safety"
          value={marginOfSafety}
          format="percent"
          icon={Calculator}
          color="from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Input Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fixed Costs (Monthly)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={fixedCosts}
                  onChange={(e) => setFixedCosts(Number(e.target.value))}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Rent, salaries, insurance, etc.</p>
            </div>

            <div className="space-y-2">
              <Label>Average Sale Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={avgSalePrice}
                  onChange={(e) => setAvgSalePrice(Number(e.target.value))}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Average price per transaction</p>
            </div>

            <div className="space-y-2">
              <Label>Average Variable Cost</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={avgVariableCost}
                  onChange={(e) => setAvgVariableCost(Number(e.target.value))}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">COGS per unit sold</p>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Breakeven Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex justify-between">
                <span>Average Sale Price</span>
                <span className="font-semibold">${avgSalePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>- Variable Cost</span>
                <span className="font-semibold text-red-500">-${avgVariableCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">= Contribution Margin</span>
                <span className="font-bold text-green-500">${contributionMargin.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Breakeven Formula</p>
              <p className="font-mono text-sm mb-3">
                BE Units = Fixed Costs ÷ Contribution Margin
              </p>
              <p className="font-mono text-sm">
                {breakevenUnits.toLocaleString()} = ${fixedCosts.toLocaleString()} ÷ ${contributionMargin.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{breakevenUnits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Units to Breakeven</p>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-green-500">${breakevenRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenue to Breakeven</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Performance */}
      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Current Performance vs Breakeven</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Current Sales</p>
              <p className="text-xl font-bold">{currentSales.toLocaleString()} units</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Current Revenue</p>
              <p className="text-xl font-bold">${currentRevenue.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Profit/Loss</p>
              <p className={`text-xl font-bold ${profitAtCurrent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${profitAtCurrent.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Above Breakeven</p>
              <p className="text-xl font-bold text-primary">
                {currentSales - breakevenUnits > 0 ? '+' : ''}{(currentSales - breakevenUnits).toLocaleString()} units
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default BreakevenReport;
