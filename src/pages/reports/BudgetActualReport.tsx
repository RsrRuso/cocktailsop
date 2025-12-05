import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { 
  Target, TrendingUp, TrendingDown, AlertTriangle, Plus, Trash2, Edit2, 
  PieChart, BarChart3, LineChart, Bell, Copy, Calendar, ArrowUpRight, 
  ArrowDownRight, DollarSign, Percent, FileText, RefreshCw, History,
  Wallet, CreditCard, Building, Zap, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, parseISO, differenceInDays } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart as RechartsLine, Line, Area, AreaChart,
  ComposedChart, RadialBarChart, RadialBar
} from 'recharts';

interface Budget {
  id: string;
  category: string;
  budget_amount: number;
  period: string;
  period_start: string;
  period_end: string;
  notes?: string;
  created_at?: string;
}

interface BudgetActual {
  id: string;
  category: string;
  actual_amount: number;
  transaction_date: string;
  description?: string;
  source?: string;
  created_at?: string;
}

interface CategoryData {
  name: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'under' | 'over' | 'on-track';
}

interface Alert {
  category: string;
  type: 'warning' | 'critical' | 'success';
  message: string;
  percent: number;
}

const CATEGORIES = [
  { name: 'Revenue', icon: DollarSign, type: 'income' },
  { name: 'Food Cost', icon: Building, type: 'expense' },
  { name: 'Beverage Cost', icon: CreditCard, type: 'expense' },
  { name: 'Labor', icon: Wallet, type: 'expense' },
  { name: 'Rent', icon: Building, type: 'expense' },
  { name: 'Utilities', icon: Zap, type: 'expense' },
  { name: 'Marketing', icon: Target, type: 'expense' },
  { name: 'Supplies', icon: FileText, type: 'expense' },
  { name: 'Equipment', icon: Building, type: 'expense' },
  { name: 'Insurance', icon: FileText, type: 'expense' },
  { name: 'Other', icon: FileText, type: 'expense' }
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
];

const BUDGET_TEMPLATES = [
  { name: 'Restaurant', categories: { 'Food Cost': 30, 'Beverage Cost': 25, 'Labor': 30, 'Rent': 8, 'Utilities': 3, 'Marketing': 2, 'Supplies': 2 } },
  { name: 'Bar/Lounge', categories: { 'Food Cost': 15, 'Beverage Cost': 35, 'Labor': 28, 'Rent': 10, 'Utilities': 4, 'Marketing': 4, 'Supplies': 4 } },
  { name: 'Cafe', categories: { 'Food Cost': 25, 'Beverage Cost': 30, 'Labor': 25, 'Rent': 10, 'Utilities': 4, 'Marketing': 3, 'Supplies': 3 } },
];

const BudgetActualReport = () => {
  const [dateRange, setDateRange] = useState('month');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [actuals, setActuals] = useState<BudgetActual[]>([]);
  const [historicalData, setHistoricalData] = useState<{period: string; budget: number; actual: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showActualDialog, setShowActualDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateRevenue, setTemplateRevenue] = useState('');
  
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    budget_amount: '',
    notes: ''
  });
  
  const [actualForm, setActualForm] = useState({
    category: '',
    actual_amount: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd')
  });

  const getPeriodDates = (range: string = dateRange) => {
    const now = new Date();
    switch (range) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getPeriodDates();
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('period', dateRange)
        .gte('period_start', startStr)
        .lte('period_end', endStr);

      const { data: actualData } = await supabase
        .from('budget_actuals')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr)
        .order('transaction_date', { ascending: false });

      // Fetch historical data for trend analysis (last 6 periods)
      const historical: {period: string; budget: number; actual: number}[] = [];
      for (let i = 5; i >= 0; i--) {
        const histDate = subMonths(new Date(), i);
        const histStart = format(startOfMonth(histDate), 'yyyy-MM-dd');
        const histEnd = format(endOfMonth(histDate), 'yyyy-MM-dd');
        
        const { data: histBudgets } = await supabase
          .from('budgets')
          .select('budget_amount')
          .eq('user_id', user.id)
          .eq('period', 'month')
          .gte('period_start', histStart)
          .lte('period_end', histEnd);

        const { data: histActuals } = await supabase
          .from('budget_actuals')
          .select('actual_amount')
          .eq('user_id', user.id)
          .gte('transaction_date', histStart)
          .lte('transaction_date', histEnd);

        historical.push({
          period: format(histDate, 'MMM'),
          budget: histBudgets?.reduce((s, b) => s + Number(b.budget_amount), 0) || 0,
          actual: histActuals?.reduce((s, a) => s + Number(a.actual_amount), 0) || 0
        });
      }

      setBudgets(budgetData || []);
      setActuals(actualData || []);
      setHistoricalData(historical);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleAddBudget = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getPeriodDates();
      
      const budgetData = {
        user_id: user.id,
        category: budgetForm.category,
        budget_amount: parseFloat(budgetForm.budget_amount),
        period: dateRange,
        period_start: format(start, 'yyyy-MM-dd'),
        period_end: format(end, 'yyyy-MM-dd'),
        notes: budgetForm.notes || null
      };

      if (editingBudget) {
        await supabase.from('budgets').update(budgetData).eq('id', editingBudget.id);
        toast.success('Budget updated!');
      } else {
        await supabase.from('budgets').insert(budgetData);
        toast.success('Budget added!');
      }

      setBudgetForm({ category: '', budget_amount: '', notes: '' });
      setEditingBudget(null);
      setShowBudgetDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save budget');
    }
  };

  const handleAddActual = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('budget_actuals').insert({
        user_id: user.id,
        category: actualForm.category,
        actual_amount: parseFloat(actualForm.actual_amount),
        transaction_date: actualForm.transaction_date,
        description: actualForm.description || null,
        source: 'manual'
      });

      toast.success('Expense added!');
      setActualForm({ 
        category: '', 
        actual_amount: '', 
        description: '', 
        transaction_date: format(new Date(), 'yyyy-MM-dd') 
      });
      setShowActualDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !templateRevenue) return;
    
    const template = BUDGET_TEMPLATES.find(t => t.name === selectedTemplate);
    if (!template) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getPeriodDates();
      const revenue = parseFloat(templateRevenue);

      const budgetsToInsert = Object.entries(template.categories).map(([category, percent]) => ({
        user_id: user.id,
        category,
        budget_amount: (revenue * percent) / 100,
        period: dateRange,
        period_start: format(start, 'yyyy-MM-dd'),
        period_end: format(end, 'yyyy-MM-dd'),
        notes: `Auto-generated from ${template.name} template`
      }));

      // Add revenue budget
      budgetsToInsert.push({
        user_id: user.id,
        category: 'Revenue',
        budget_amount: revenue,
        period: dateRange,
        period_start: format(start, 'yyyy-MM-dd'),
        period_end: format(end, 'yyyy-MM-dd'),
        notes: `Revenue target for ${template.name} template`
      });

      await supabase.from('budgets').insert(budgetsToInsert);
      toast.success(`${template.name} template applied!`);
      setShowTemplateDialog(false);
      setSelectedTemplate('');
      setTemplateRevenue('');
      fetchData();
    } catch (error) {
      toast.error('Failed to apply template');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    await supabase.from('budgets').delete().eq('id', id);
    toast.success('Budget deleted');
    fetchData();
  };

  const handleDeleteActual = async (id: string) => {
    await supabase.from('budget_actuals').delete().eq('id', id);
    toast.success('Expense deleted');
    fetchData();
  };

  // Calculate category data with status
  const categoryData: CategoryData[] = useMemo(() => {
    return CATEGORIES.map(({ name }) => {
      const budgetTotal = budgets
        .filter(b => b.category === name)
        .reduce((sum, b) => sum + Number(b.budget_amount), 0);
      
      const actualTotal = actuals
        .filter(a => a.category === name)
        .reduce((sum, a) => sum + Number(a.actual_amount), 0);

      const variance = budgetTotal - actualTotal;
      const variancePercent = budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;
      const isRevenue = name === 'Revenue';
      
      let status: 'under' | 'over' | 'on-track' = 'on-track';
      if (isRevenue) {
        status = variance > 0 ? 'over' : variance < -budgetTotal * 0.05 ? 'under' : 'on-track';
      } else {
        status = variance > budgetTotal * 0.05 ? 'under' : variance < 0 ? 'over' : 'on-track';
      }

      return { name, budget: budgetTotal, actual: actualTotal, variance, variancePercent, status };
    }).filter(c => c.budget > 0 || c.actual > 0);
  }, [budgets, actuals]);

  // Calculate alerts
  const alerts: Alert[] = useMemo(() => {
    const alertsList: Alert[] = [];
    categoryData.forEach(cat => {
      const percentUsed = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
      const isRevenue = cat.name === 'Revenue';
      
      if (isRevenue) {
        if (percentUsed < 80) {
          alertsList.push({
            category: cat.name,
            type: 'warning',
            message: `Revenue at ${percentUsed.toFixed(0)}% of target`,
            percent: percentUsed
          });
        } else if (percentUsed >= 100) {
          alertsList.push({
            category: cat.name,
            type: 'success',
            message: `Revenue target achieved! (${percentUsed.toFixed(0)}%)`,
            percent: percentUsed
          });
        }
      } else {
        if (percentUsed >= 100) {
          alertsList.push({
            category: cat.name,
            type: 'critical',
            message: `${cat.name} exceeded budget by ${(percentUsed - 100).toFixed(0)}%`,
            percent: percentUsed
          });
        } else if (percentUsed >= 85) {
          alertsList.push({
            category: cat.name,
            type: 'warning',
            message: `${cat.name} at ${percentUsed.toFixed(0)}% of budget`,
            percent: percentUsed
          });
        }
      }
    });
    return alertsList.sort((a, b) => b.percent - a.percent);
  }, [categoryData]);

  const totals = useMemo(() => {
    const totalBudget = categoryData.reduce((sum, c) => sum + c.budget, 0);
    const totalActual = categoryData.reduce((sum, c) => sum + c.actual, 0);
    const totalVariance = totalBudget - totalActual;
    const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;
    
    // Calculate expense totals (excluding revenue)
    const expenseBudget = categoryData.filter(c => c.name !== 'Revenue').reduce((sum, c) => sum + c.budget, 0);
    const expenseActual = categoryData.filter(c => c.name !== 'Revenue').reduce((sum, c) => sum + c.actual, 0);
    
    // Revenue
    const revenueBudget = categoryData.find(c => c.name === 'Revenue')?.budget || 0;
    const revenueActual = categoryData.find(c => c.name === 'Revenue')?.actual || 0;
    
    // Profit calculations
    const projectedProfit = revenueBudget - expenseBudget;
    const actualProfit = revenueActual - expenseActual;
    
    return { totalBudget, totalActual, totalVariance, variancePercent, expenseBudget, expenseActual, revenueBudget, revenueActual, projectedProfit, actualProfit };
  }, [categoryData]);

  // Pie chart data
  const pieData = useMemo(() => {
    return categoryData
      .filter(c => c.name !== 'Revenue' && c.actual > 0)
      .map((c, i) => ({
        name: c.name,
        value: c.actual,
        color: CHART_COLORS[i % CHART_COLORS.length]
      }));
  }, [categoryData]);

  // Bar chart comparison data
  const barChartData = useMemo(() => {
    return categoryData.map(c => ({
      name: c.name.length > 10 ? c.name.substring(0, 10) + '...' : c.name,
      fullName: c.name,
      budget: c.budget,
      actual: c.actual
    }));
  }, [categoryData]);

  // Forecast calculation
  const forecast = useMemo(() => {
    const { start, end } = getPeriodDates();
    const totalDays = differenceInDays(end, start) + 1;
    const elapsedDays = differenceInDays(new Date(), start) + 1;
    const remainingDays = totalDays - elapsedDays;
    
    const dailyAvg = elapsedDays > 0 ? totals.expenseActual / elapsedDays : 0;
    const projectedTotal = dailyAvg * totalDays;
    const projectedVariance = totals.expenseBudget - projectedTotal;
    
    return { dailyAvg, projectedTotal, projectedVariance, remainingDays, elapsedDays, totalDays };
  }, [totals, dateRange]);

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('Budget vs Actual Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}`, 14, 28);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 34);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Summary', 14, 46);
    
    doc.setFontSize(10);
    doc.text(`Total Budget: $${totals.totalBudget.toLocaleString()}`, 14, 54);
    doc.text(`Total Actual: $${totals.totalActual.toLocaleString()}`, 14, 60);
    doc.text(`Variance: $${totals.totalVariance.toLocaleString()} (${totals.variancePercent.toFixed(1)}%)`, 14, 66);

    // Category breakdown
    autoTable(doc, {
      startY: 76,
      head: [['Category', 'Budget', 'Actual', 'Variance', 'Status']],
      body: categoryData.map(c => [
        c.name,
        `$${c.budget.toLocaleString()}`,
        `$${c.actual.toLocaleString()}`,
        `$${c.variance.toLocaleString()} (${c.variancePercent.toFixed(1)}%)`,
        c.status.toUpperCase(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Alerts
    if (alerts.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text('Alerts & Recommendations', 14, finalY);
      
      autoTable(doc, {
        startY: finalY + 6,
        head: [['Type', 'Category', 'Message']],
        body: alerts.map(a => [
          a.type.toUpperCase(),
          a.category,
          a.message
        ]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    doc.save(`budget-actual-${dateRange}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Report exported!');
  };

  const getStatusBadge = (status: 'under' | 'over' | 'on-track') => {
    switch (status) {
      case 'under':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Under Budget</Badge>;
      case 'over':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Over Budget</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">On Track</Badge>;
    }
  };

  return (
    <ReportLayout
      title="Budget vs Actual"
      description="Comprehensive budget tracking and variance analysis"
      icon={Target}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Set Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Set Budget Target'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm({...budgetForm, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(({ name }) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={budgetForm.budget_amount}
                  onChange={(e) => setBudgetForm({...budgetForm, budget_amount: e.target.value})}
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Add notes..."
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({...budgetForm, notes: e.target.value})}
                />
              </div>
              <Button onClick={handleAddBudget} className="w-full">
                {editingBudget ? 'Update' : 'Save'} Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showActualDialog} onOpenChange={setShowActualDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select value={actualForm.category} onValueChange={(v) => setActualForm({...actualForm, category: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(({ name }) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={actualForm.actual_amount}
                  onChange={(e) => setActualForm({...actualForm, actual_amount: e.target.value})}
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={actualForm.transaction_date}
                  onChange={(e) => setActualForm({...actualForm, transaction_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  placeholder="What was this expense for?"
                  value={actualForm.description}
                  onChange={(e) => setActualForm({...actualForm, description: e.target.value})}
                />
              </div>
              <Button onClick={handleAddActual} className="w-full">Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Use Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Budget Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_TEMPLATES.map(t => (
                      <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplate && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Budget Percentages:</p>
                  {Object.entries(BUDGET_TEMPLATES.find(t => t.name === selectedTemplate)?.categories || {}).map(([cat, pct]) => (
                    <div key={cat} className="flex justify-between">
                      <span>{cat}</span>
                      <span>{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>Expected Revenue</Label>
                <Input
                  type="number"
                  placeholder="Enter expected revenue"
                  value={templateRevenue}
                  onChange={(e) => setTemplateRevenue(e.target.value)}
                />
              </div>
              <Button onClick={handleApplyTemplate} className="w-full" disabled={!selectedTemplate || !templateRevenue}>
                Apply Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Budget"
              value={totals.totalBudget}
              format="currency"
              icon={Target}
              color="from-blue-500 to-indigo-600"
            />
            <MetricCard
              title="Total Spent"
              value={totals.totalActual}
              format="currency"
              icon={DollarSign}
              color="from-green-500 to-emerald-600"
            />
            <MetricCard
              title="Remaining"
              value={Math.max(0, totals.totalVariance)}
              format="currency"
              icon={Wallet}
              color={totals.totalVariance >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}
            />
            <MetricCard
              title="Budget Used"
              value={totals.totalBudget > 0 ? ((totals.totalActual / totals.totalBudget) * 100) : 0}
              format="percent"
              icon={Percent}
              color="from-amber-500 to-orange-600"
            />
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  Budget Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((alert, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        alert.type === 'critical' && "bg-red-500/10",
                        alert.type === 'warning' && "bg-amber-500/10",
                        alert.type === 'success' && "bg-green-500/10"
                      )}
                    >
                      {alert.type === 'critical' && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                      {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
                      {alert.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                      <span className="text-sm">{alert.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Profit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Projected Profit</span>
                  <span className={cn("font-bold", totals.projectedProfit >= 0 ? "text-green-500" : "text-red-500")}>
                    ${totals.projectedProfit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Actual Profit (so far)</span>
                  <span className={cn("font-bold", totals.actualProfit >= 0 ? "text-green-500" : "text-red-500")}>
                    ${totals.actualProfit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span>Revenue Achievement</span>
                  <span className="font-bold">
                    {totals.revenueBudget > 0 ? ((totals.revenueActual / totals.revenueBudget) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">Budget Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Budget</span>
                      <span>{totals.totalBudget > 0 ? ((totals.totalActual / totals.totalBudget) * 100).toFixed(0) : 0}%</span>
                    </div>
                    <Progress 
                      value={Math.min((totals.totalActual / Math.max(totals.totalBudget, 1)) * 100, 100)} 
                      className="h-3"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">
                        {categoryData.filter(c => c.status === 'under').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Under</div>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-blue-500">
                        {categoryData.filter(c => c.status === 'on-track').length}
                      </div>
                      <div className="text-xs text-muted-foreground">On Track</div>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">
                        {categoryData.filter(c => c.status === 'over').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Over</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Budget vs Actual by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Expense Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Trend Line Chart */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                6-Month Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="budget" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Budget" />
                  <Area type="monotone" dataKey="actual" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} name="Actual" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Budget by Category</CardTitle>
              <CardDescription>Detailed breakdown of each budget category</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No budget data yet. Set budgets to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryData.map((cat) => {
                      const progress = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
                      const budget = budgets.find(b => b.category === cat.name);
                      
                      return (
                        <TableRow key={cat.name}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-right">${cat.budget.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${cat.actual.toLocaleString()}</TableCell>
                          <TableCell className={cn(
                            'text-right',
                            cat.name === 'Revenue' 
                              ? (cat.variance > 0 ? 'text-red-500' : 'text-green-500')
                              : (cat.variance > 0 ? 'text-green-500' : 'text-red-500')
                          )}>
                            <div className="flex items-center justify-end gap-1">
                              {cat.variance > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              ${Math.abs(cat.variance).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={Math.min(progress, 100)} 
                                className={cn(
                                  "h-2 w-20",
                                  progress > 100 && "[&>div]:bg-red-500"
                                )}
                              />
                              <span className="text-xs text-muted-foreground w-12">
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(cat.status)}</TableCell>
                          <TableCell>
                            {budget && (
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => {
                                    setEditingBudget(budget);
                                    setBudgetForm({
                                      category: budget.category,
                                      budget_amount: budget.budget_amount.toString(),
                                      notes: budget.notes || ''
                                    });
                                    setShowBudgetDialog(true);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteBudget(budget.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>All recorded expenses for this period</CardDescription>
            </CardHeader>
            <CardContent>
              {actuals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions recorded yet.</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actuals.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-muted-foreground">
                            {format(parseISO(txn.transaction_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{txn.category}</Badge>
                          </TableCell>
                          <TableCell>{txn.description || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${Number(txn.actual_amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteActual(txn.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Spending Forecast
                </CardTitle>
                <CardDescription>Projected spending based on current rate</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Average Spend</span>
                    <span className="font-bold">${forecast.dailyAvg.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Elapsed</span>
                    <span className="font-bold">{forecast.elapsedDays} / {forecast.totalDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Remaining</span>
                    <span className="font-bold">{forecast.remainingDays}</span>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span>Projected Total Spend</span>
                    <span className="font-bold text-lg">${forecast.projectedTotal.toFixed(0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Budget</span>
                    <span className="font-bold">${totals.expenseBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Projected Variance</span>
                    <span className={cn(
                      "font-bold",
                      forecast.projectedVariance >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {forecast.projectedVariance >= 0 ? '+' : ''}${forecast.projectedVariance.toFixed(0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Budget Pace
                </CardTitle>
                <CardDescription>Are you on track to stay within budget?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Time Progress</span>
                      <span>{((forecast.elapsedDays / forecast.totalDays) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={(forecast.elapsedDays / forecast.totalDays) * 100} 
                      className="h-3"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Budget Progress</span>
                      <span>{totals.expenseBudget > 0 ? ((totals.expenseActual / totals.expenseBudget) * 100).toFixed(0) : 0}%</span>
                    </div>
                    <Progress 
                      value={Math.min((totals.expenseActual / Math.max(totals.expenseBudget, 1)) * 100, 100)} 
                      className={cn(
                        "h-3",
                        (totals.expenseActual / Math.max(totals.expenseBudget, 1)) > 1 && "[&>div]:bg-red-500"
                      )}
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-muted">
                    <div className="text-center">
                      {forecast.projectedVariance >= 0 ? (
                        <>
                          <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                          <p className="font-medium text-green-500">On Track</p>
                          <p className="text-sm text-muted-foreground">
                            At current pace, you'll be ${Math.abs(forecast.projectedVariance).toFixed(0)} under budget
                          </p>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                          <p className="font-medium text-amber-500">Over Budget Risk</p>
                          <p className="text-sm text-muted-foreground">
                            At current pace, you'll exceed budget by ${Math.abs(forecast.projectedVariance).toFixed(0)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-2">Recommendations:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      {forecast.projectedVariance < 0 && (
                        <>
                          <li>Reduce daily spending by ${Math.abs(forecast.projectedVariance / Math.max(forecast.remainingDays, 1)).toFixed(2)} to stay on budget</li>
                          <li>Review high-spend categories for potential savings</li>
                        </>
                      )}
                      {forecast.projectedVariance >= 0 && (
                        <>
                          <li>Current spending rate is sustainable</li>
                          <li>Consider allocating surplus to savings or investments</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </ReportLayout>
  );
};

export default BudgetActualReport;
