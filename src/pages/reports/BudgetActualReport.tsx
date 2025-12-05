import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { Target, TrendingUp, TrendingDown, AlertTriangle, Plus, Trash2, Edit2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

interface Budget {
  id: string;
  category: string;
  budget_amount: number;
  period: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

interface BudgetActual {
  id: string;
  category: string;
  actual_amount: number;
  transaction_date: string;
  description?: string;
}

interface CategoryData {
  name: string;
  budget: number;
  actual: number;
  variance: number;
}

const CATEGORIES = [
  'Revenue',
  'Food Cost',
  'Beverage Cost',
  'Labor',
  'Rent',
  'Utilities',
  'Marketing',
  'Supplies',
  'Equipment',
  'Insurance',
  'Other'
];

const BudgetActualReport = () => {
  const [dateRange, setDateRange] = useState('month');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [actuals, setActuals] = useState<BudgetActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showActualDialog, setShowActualDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  // Form states
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

  const getPeriodDates = () => {
    const now = new Date();
    switch (dateRange) {
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

      // Fetch budgets for current period
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('period', dateRange)
        .gte('period_start', startStr)
        .lte('period_end', endStr);

      // Fetch actuals for current period
      const { data: actualData } = await supabase
        .from('budget_actuals')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr);

      setBudgets(budgetData || []);
      setActuals(actualData || []);
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
        await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', editingBudget.id);
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

  // Calculate category data
  const categoryData: CategoryData[] = CATEGORIES.map(category => {
    const budgetTotal = budgets
      .filter(b => b.category === category)
      .reduce((sum, b) => sum + Number(b.budget_amount), 0);
    
    const actualTotal = actuals
      .filter(a => a.category === category)
      .reduce((sum, a) => sum + Number(a.actual_amount), 0);

    return {
      name: category,
      budget: budgetTotal,
      actual: actualTotal,
      variance: budgetTotal - actualTotal
    };
  }).filter(c => c.budget > 0 || c.actual > 0);

  const totalBudget = categoryData.reduce((sum, c) => sum + c.budget, 0);
  const totalActual = categoryData.reduce((sum, c) => sum + c.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

  const getVarianceColor = (variance: number, isRevenue: boolean = false) => {
    if (variance === 0) return 'text-muted-foreground';
    if (isRevenue) return variance > 0 ? 'text-red-500' : 'text-green-500';
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
      body: categoryData.map(c => [
        c.name,
        `$${c.budget.toLocaleString()}`,
        `$${c.actual.toLocaleString()}`,
        `$${c.variance.toLocaleString()}`,
        c.budget > 0 ? `${((c.variance / c.budget) * 100).toFixed(1)}%` : 'N/A',
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
      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
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
              <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm({...budgetForm, category: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Budget amount"
                value={budgetForm.budget_amount}
                onChange={(e) => setBudgetForm({...budgetForm, budget_amount: e.target.value})}
              />
              <Input
                placeholder="Notes (optional)"
                value={budgetForm.notes}
                onChange={(e) => setBudgetForm({...budgetForm, notes: e.target.value})}
              />
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
              <DialogTitle>Record Actual Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Select value={actualForm.category} onValueChange={(v) => setActualForm({...actualForm, category: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Amount"
                value={actualForm.actual_amount}
                onChange={(e) => setActualForm({...actualForm, actual_amount: e.target.value})}
              />
              <Input
                type="date"
                value={actualForm.transaction_date}
                onChange={(e) => setActualForm({...actualForm, transaction_date: e.target.value})}
              />
              <Input
                placeholder="Description (optional)"
                value={actualForm.description}
                onChange={(e) => setActualForm({...actualForm, description: e.target.value})}
              />
              <Button onClick={handleAddActual} className="w-full">Add Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Budget"
          value={totalBudget}
          format="currency"
          icon={Target}
          color="from-blue-500 to-indigo-600"
        />
        <MetricCard
          title="Total Actual"
          value={totalActual}
          format="currency"
          icon={TrendingUp}
          color="from-green-500 to-emerald-600"
        />
        <MetricCard
          title="Variance"
          value={totalVariance}
          format="currency"
          icon={totalVariance >= 0 ? TrendingUp : TrendingDown}
          color={totalVariance >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}
        />
        <MetricCard
          title="Variance %"
          value={Math.abs(variancePercent)}
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
          {categoryData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No budget data yet. Start by setting budgets and recording expenses.</p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryData.map((cat) => {
                  const isRevenue = cat.name === 'Revenue';
                  const progress = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
                  
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
          )}
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
              {categoryData.filter(c => c.variance > 0).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                  <span>{cat.name}</span>
                  <span className="font-semibold text-green-500">+${cat.variance.toLocaleString()}</span>
                </div>
              ))}
              {categoryData.filter(c => c.variance > 0).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No categories under budget</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg text-red-500">Over Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.filter(c => c.variance < 0).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                  <span>{cat.name}</span>
                  <span className="font-semibold text-red-500">${cat.variance.toLocaleString()}</span>
                </div>
              ))}
              {categoryData.filter(c => c.variance < 0).length === 0 && (
                <p className="text-muted-foreground text-center py-4">All categories within budget!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      {actuals.length > 0 && (
        <Card className="glass mt-6">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {actuals.slice(0, 10).map((actual) => (
                <div key={actual.id} className="flex items-center justify-between p-2 border border-border/50 rounded-lg">
                  <div>
                    <p className="font-medium">{actual.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(actual.transaction_date), 'MMM d, yyyy')}
                      {actual.description && ` - ${actual.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">${Number(actual.actual_amount).toLocaleString()}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDeleteActual(actual.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
};

export default BudgetActualReport;