import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription } from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import ReportLayout from '@/components/reports/ReportLayout';
import MetricCard from '@/components/reports/MetricCard';
import { 
  Target, TrendingUp, TrendingDown, AlertTriangle, Plus, Trash2, Edit2, 
  PieChart, BarChart3, LineChart, Bell, Copy, Calendar, ArrowUpRight, 
  ArrowDownRight, DollarSign, Percent, FileText, RefreshCw, History,
  Wallet, CreditCard, Building, Zap, CheckCircle, XCircle, Clock,
  Search, Filter, Download, Upload, MoreVertical, ChevronLeft, ChevronRight,
  Repeat, Tag, ArrowUp, ArrowDown, Eye, EyeOff, Sparkles, Receipt,
  PiggyBank, TrendingUp as Trending, Calculator, ListFilter, Grid3X3,
  LayoutList, Share2, Printer, HelpCircle, Info, X, Check, Minus,
  Menu, Home, Settings, User, LogOut
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, addMonths, parseISO, differenceInDays, isWithinInterval, isSameMonth } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Area, AreaChart
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';

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
  icon: any;
  color: string;
}

interface Alert {
  category: string;
  type: 'warning' | 'critical' | 'success';
  message: string;
  percent: number;
}

const CATEGORIES = [
  { name: 'Revenue', icon: DollarSign, type: 'income', color: 'bg-green-500' },
  { name: 'Food Cost', icon: Receipt, type: 'expense', color: 'bg-orange-500' },
  { name: 'Beverage Cost', icon: CreditCard, type: 'expense', color: 'bg-blue-500' },
  { name: 'Labor', icon: User, type: 'expense', color: 'bg-purple-500' },
  { name: 'Rent', icon: Building, type: 'expense', color: 'bg-slate-500' },
  { name: 'Utilities', icon: Zap, type: 'expense', color: 'bg-yellow-500' },
  { name: 'Marketing', icon: Target, type: 'expense', color: 'bg-pink-500' },
  { name: 'Supplies', icon: FileText, type: 'expense', color: 'bg-cyan-500' },
  { name: 'Equipment', icon: Settings, type: 'expense', color: 'bg-indigo-500' },
  { name: 'Insurance', icon: FileText, type: 'expense', color: 'bg-teal-500' },
  { name: 'Other', icon: MoreVertical, type: 'expense', color: 'bg-gray-500' }
];

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

const BUDGET_TEMPLATES = [
  { name: 'Restaurant', description: 'Full-service restaurant', categories: { 'Food Cost': 30, 'Beverage Cost': 25, 'Labor': 30, 'Rent': 8, 'Utilities': 3, 'Marketing': 2, 'Supplies': 2 } },
  { name: 'Bar/Lounge', description: 'Bar or nightclub', categories: { 'Food Cost': 15, 'Beverage Cost': 35, 'Labor': 28, 'Rent': 10, 'Utilities': 4, 'Marketing': 4, 'Supplies': 4 } },
  { name: 'Cafe', description: 'Coffee shop or cafe', categories: { 'Food Cost': 25, 'Beverage Cost': 30, 'Labor': 25, 'Rent': 10, 'Utilities': 4, 'Marketing': 3, 'Supplies': 3 } },
  { name: 'Fast Casual', description: 'Quick service restaurant', categories: { 'Food Cost': 32, 'Beverage Cost': 8, 'Labor': 28, 'Rent': 10, 'Utilities': 5, 'Marketing': 8, 'Supplies': 9 } },
];

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2500];

const BudgetActualReport = () => {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [actuals, setActuals] = useState<BudgetActual[]>([]);
  const [historicalData, setHistoricalData] = useState<{period: string; budget: number; actual: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialogs & Sheets
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [showActualDialog, setShowActualDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  // Edit states
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingActual, setEditingActual] = useState<BudgetActual | null>(null);
  
  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showHiddenCategories, setShowHiddenCategories] = useState(true);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateRevenue, setTemplateRevenue] = useState('');
  
  // Form states
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    budget_amount: '',
    notes: '',
    is_recurring: false
  });
  
  const [actualForm, setActualForm] = useState({
    category: '',
    actual_amount: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    is_recurring: false
  });

  // Quick add state
  const [quickAddCategory, setQuickAddCategory] = useState('');
  const [quickAddAmount, setQuickAddAmount] = useState('');

  const getPeriodDates = useCallback((range: string = dateRange, date: Date = currentDate) => {
    switch (range) {
      case 'week':
        return { start: startOfWeek(date), end: endOfWeek(date) };
      case 'month':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case 'quarter':
        return { start: startOfQuarter(date), end: endOfQuarter(date) };
      case 'year':
        return { start: startOfYear(date), end: endOfYear(date) };
      default:
        return { start: startOfMonth(date), end: endOfMonth(date) };
    }
  }, [dateRange, currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getPeriodDates();
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [budgetRes, actualRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('user_id', user.id).eq('period', dateRange).gte('period_start', startStr).lte('period_end', endStr),
        supabase.from('budget_actuals').select('*').eq('user_id', user.id).gte('transaction_date', startStr).lte('transaction_date', endStr).order('transaction_date', { ascending: false })
      ]);

      // Fetch 6-month historical data
      const historical: {period: string; budget: number; actual: number}[] = [];
      for (let i = 5; i >= 0; i--) {
        const histDate = subMonths(new Date(), i);
        const histStart = format(startOfMonth(histDate), 'yyyy-MM-dd');
        const histEnd = format(endOfMonth(histDate), 'yyyy-MM-dd');
        
        const [histBudgets, histActuals] = await Promise.all([
          supabase.from('budgets').select('budget_amount').eq('user_id', user.id).eq('period', 'month').gte('period_start', histStart).lte('period_end', histEnd),
          supabase.from('budget_actuals').select('actual_amount').eq('user_id', user.id).gte('transaction_date', histStart).lte('transaction_date', histEnd)
        ]);

        historical.push({
          period: format(histDate, 'MMM'),
          budget: histBudgets.data?.reduce((s, b) => s + Number(b.budget_amount), 0) || 0,
          actual: histActuals.data?.reduce((s, a) => s + Number(a.actual_amount), 0) || 0
        });
      }

      setBudgets(budgetRes.data || []);
      setActuals(actualRes.data || []);
      setHistoricalData(historical);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, currentDate, getPeriodDates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigate periods
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const months = dateRange === 'week' ? 0.25 : dateRange === 'month' ? 1 : dateRange === 'quarter' ? 3 : 12;
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, months) : addMonths(prev, months));
  };

  // CRUD Operations
  const handleSaveBudget = async () => {
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
        toast.success('Budget updated');
      } else {
        await supabase.from('budgets').insert(budgetData);
        toast.success('Budget added');
      }

      resetBudgetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save budget');
    }
  };

  const handleSaveActual = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const actualData = {
        user_id: user.id,
        category: actualForm.category,
        actual_amount: parseFloat(actualForm.actual_amount),
        transaction_date: actualForm.transaction_date,
        description: actualForm.description || null,
        source: 'manual'
      };

      if (editingActual) {
        await supabase.from('budget_actuals').update(actualData).eq('id', editingActual.id);
        toast.success('Expense updated');
      } else {
        await supabase.from('budget_actuals').insert(actualData);
        toast.success('Expense added');
      }

      resetActualForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddCategory || !quickAddAmount) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('budget_actuals').insert({
        user_id: user.id,
        category: quickAddCategory,
        actual_amount: parseFloat(quickAddAmount),
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        source: 'quick_add'
      });

      toast.success(`$${quickAddAmount} added to ${quickAddCategory}`);
      setQuickAddCategory('');
      setQuickAddAmount('');
      setShowQuickAdd(false);
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
        notes: `${template.name} template`
      }));

      budgetsToInsert.push({
        user_id: user.id,
        category: 'Revenue',
        budget_amount: revenue,
        period: dateRange,
        period_start: format(start, 'yyyy-MM-dd'),
        period_end: format(end, 'yyyy-MM-dd'),
        notes: `Revenue target - ${template.name}`
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

  const handleDelete = async (type: 'budget' | 'actual', id: string) => {
    const table = type === 'budget' ? 'budgets' : 'budget_actuals';
    await supabase.from(table).delete().eq('id', id);
    toast.success(`${type === 'budget' ? 'Budget' : 'Expense'} deleted`);
    fetchData();
  };

  const handleDuplicate = async (budget: Budget) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const nextPeriod = addMonths(parseISO(budget.period_start), 1);
    const { start, end } = getPeriodDates('month', nextPeriod);

    await supabase.from('budgets').insert({
      user_id: user.id,
      category: budget.category,
      budget_amount: budget.budget_amount,
      period: budget.period,
      period_start: format(start, 'yyyy-MM-dd'),
      period_end: format(end, 'yyyy-MM-dd'),
      notes: budget.notes
    });

    toast.success('Budget duplicated to next period');
    fetchData();
  };

  // Export functions
  const exportCSV = () => {
    const csvData = actuals.map(a => ({
      Date: a.transaction_date,
      Category: a.category,
      Amount: a.actual_amount,
      Description: a.description || ''
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-actuals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const { start, end } = getPeriodDates();
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('Budget vs Actual Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`, 14, 28);
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 34);

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Summary', 14, 46);
    
    doc.setFontSize(10);
    doc.text(`Total Budget: $${totals.totalBudget.toLocaleString()}`, 14, 54);
    doc.text(`Total Spent: $${totals.totalActual.toLocaleString()}`, 14, 60);
    doc.text(`Remaining: $${totals.totalVariance.toLocaleString()}`, 14, 66);

    autoTable(doc, {
      startY: 76,
      head: [['Category', 'Budget', 'Actual', 'Variance', 'Status']],
      body: categoryData.map(c => [
        c.name,
        `$${c.budget.toLocaleString()}`,
        `$${c.actual.toLocaleString()}`,
        `${c.variance >= 0 ? '+' : ''}$${c.variance.toLocaleString()}`,
        c.status.toUpperCase()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`budget-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exported');
  };

  // Reset forms
  const resetBudgetForm = () => {
    setBudgetForm({ category: '', budget_amount: '', notes: '', is_recurring: false });
    setEditingBudget(null);
    setShowBudgetDialog(false);
  };

  const resetActualForm = () => {
    setActualForm({ category: '', actual_amount: '', description: '', transaction_date: format(new Date(), 'yyyy-MM-dd'), is_recurring: false });
    setEditingActual(null);
    setShowActualDialog(false);
  };

  // Computed data
  const categoryData: CategoryData[] = useMemo(() => {
    return CATEGORIES.map(({ name, icon, color }) => {
      const budgetTotal = budgets.filter(b => b.category === name).reduce((sum, b) => sum + Number(b.budget_amount), 0);
      const actualTotal = actuals.filter(a => a.category === name).reduce((sum, a) => sum + Number(a.actual_amount), 0);
      const variance = budgetTotal - actualTotal;
      const variancePercent = budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;
      const isRevenue = name === 'Revenue';
      
      let status: 'under' | 'over' | 'on-track' = 'on-track';
      if (isRevenue) {
        status = actualTotal >= budgetTotal ? 'under' : 'over';
      } else {
        status = variance > budgetTotal * 0.05 ? 'under' : variance < 0 ? 'over' : 'on-track';
      }

      return { name, budget: budgetTotal, actual: actualTotal, variance, variancePercent, status, icon, color };
    }).filter(c => showHiddenCategories || c.budget > 0 || c.actual > 0);
  }, [budgets, actuals, showHiddenCategories]);

  const filteredActuals = useMemo(() => {
    let filtered = [...actuals];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.category.toLowerCase().includes(query) || 
        (a.description?.toLowerCase().includes(query))
      );
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(a => a.category === filterCategory);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
          : new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      }
      if (sortBy === 'amount') {
        return sortOrder === 'desc' 
          ? Number(b.actual_amount) - Number(a.actual_amount)
          : Number(a.actual_amount) - Number(b.actual_amount);
      }
      return sortOrder === 'desc' 
        ? b.category.localeCompare(a.category)
        : a.category.localeCompare(b.category);
    });

    return filtered;
  }, [actuals, searchQuery, filterCategory, sortBy, sortOrder]);

  const alerts: Alert[] = useMemo(() => {
    const alertsList: Alert[] = [];
    categoryData.forEach(cat => {
      const percentUsed = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
      const isRevenue = cat.name === 'Revenue';
      
      if (isRevenue) {
        if (percentUsed < 80) alertsList.push({ category: cat.name, type: 'warning', message: `Revenue at ${percentUsed.toFixed(0)}% of target`, percent: percentUsed });
        else if (percentUsed >= 100) alertsList.push({ category: cat.name, type: 'success', message: `Revenue target achieved!`, percent: percentUsed });
      } else {
        if (percentUsed >= 100) alertsList.push({ category: cat.name, type: 'critical', message: `${cat.name} exceeded by ${(percentUsed - 100).toFixed(0)}%`, percent: percentUsed });
        else if (percentUsed >= 85) alertsList.push({ category: cat.name, type: 'warning', message: `${cat.name} at ${percentUsed.toFixed(0)}%`, percent: percentUsed });
      }
    });
    return alertsList.sort((a, b) => b.percent - a.percent);
  }, [categoryData]);

  const totals = useMemo(() => {
    const totalBudget = categoryData.reduce((sum, c) => sum + c.budget, 0);
    const totalActual = categoryData.reduce((sum, c) => sum + c.actual, 0);
    const totalVariance = totalBudget - totalActual;
    const variancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;
    const expenseBudget = categoryData.filter(c => c.name !== 'Revenue').reduce((sum, c) => sum + c.budget, 0);
    const expenseActual = categoryData.filter(c => c.name !== 'Revenue').reduce((sum, c) => sum + c.actual, 0);
    const revenueBudget = categoryData.find(c => c.name === 'Revenue')?.budget || 0;
    const revenueActual = categoryData.find(c => c.name === 'Revenue')?.actual || 0;
    const projectedProfit = revenueBudget - expenseBudget;
    const actualProfit = revenueActual - expenseActual;
    
    return { totalBudget, totalActual, totalVariance, variancePercent, expenseBudget, expenseActual, revenueBudget, revenueActual, projectedProfit, actualProfit };
  }, [categoryData]);

  const pieData = useMemo(() => {
    return categoryData.filter(c => c.name !== 'Revenue' && c.actual > 0).map((c, i) => ({
      name: c.name,
      value: c.actual,
      color: CHART_COLORS[i % CHART_COLORS.length]
    }));
  }, [categoryData]);

  const barChartData = useMemo(() => {
    return categoryData.filter(c => c.budget > 0 || c.actual > 0).map(c => ({
      name: isMobile ? c.name.slice(0, 6) : c.name,
      fullName: c.name,
      budget: c.budget,
      actual: c.actual
    }));
  }, [categoryData, isMobile]);

  const forecast = useMemo(() => {
    const { start, end } = getPeriodDates();
    const totalDays = differenceInDays(end, start) + 1;
    const elapsedDays = Math.max(1, differenceInDays(new Date(), start) + 1);
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const dailyAvg = totals.expenseActual / elapsedDays;
    const projectedTotal = dailyAvg * totalDays;
    const projectedVariance = totals.expenseBudget - projectedTotal;
    
    return { dailyAvg, projectedTotal, projectedVariance, remainingDays, elapsedDays, totalDays };
  }, [totals, getPeriodDates]);

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  // Mobile-friendly dialog wrapper
  const DialogWrapper = isMobile ? Drawer : Dialog;
  const DialogWrapperContent = isMobile ? DrawerContent : DialogContent;
  const DialogWrapperHeader = isMobile ? DrawerHeader : DialogHeader;
  const DialogWrapperTitle = isMobile ? DrawerTitle : DialogTitle;
  const DialogWrapperTrigger = isMobile ? DrawerTrigger : DialogTrigger;

  const getCategoryIcon = (categoryName: string) => {
    const cat = CATEGORIES.find(c => c.name === categoryName);
    const Icon = cat?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getCategoryColor = (categoryName: string) => {
    return CATEGORIES.find(c => c.name === categoryName)?.color || 'bg-gray-500';
  };

  if (loading) {
    return (
      <ReportLayout title="Budget vs Actual" description="Loading..." icon={Target} color="from-emerald-500 to-green-600">
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </ReportLayout>
    );
  }

  return (
    <ReportLayout
      title="Budget vs Actual"
      description="Track spending against your budget"
      icon={Target}
      color="from-emerald-500 to-green-600"
      onExportPDF={exportPDF}
      dateRange={dateRange}
      onDateRangeChange={(v) => { setDateRange(v); setCurrentDate(new Date()); }}
    >
      {/* Period Navigation */}
      <div className="flex items-center justify-between mb-4 bg-card rounded-xl p-3 border">
        <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold">{format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}</p>
          <p className="text-xs text-muted-foreground">{dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}ly Budget</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')} disabled={isSameMonth(currentDate, new Date())}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Action Bar - Mobile Optimized */}
      <div className="flex flex-wrap gap-2 mb-4">
        <DialogWrapper open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
          <DialogWrapperTrigger asChild>
            <Button size={isMobile ? "sm" : "default"} className="gap-2">
              <Plus className="h-4 w-4" />
              {!isMobile && "Set Budget"}
            </Button>
          </DialogWrapperTrigger>
          <DialogWrapperContent className={isMobile ? "px-4 pb-8" : ""}>
            <DialogWrapperHeader>
              <DialogWrapperTitle>{editingBudget ? 'Edit Budget' : 'Set Budget'}</DialogWrapperTitle>
              {isMobile && <DrawerDescription>Set your budget target for this category</DrawerDescription>}
            </DialogWrapperHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select value={budgetForm.category} onValueChange={(v) => setBudgetForm({...budgetForm, category: v})}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(({ name, icon: Icon, color }) => (
                      <SelectItem key={name} value={name}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", color)} />
                          {name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Budget Amount</Label>
                <Input type="number" placeholder="0.00" value={budgetForm.budget_amount} onChange={(e) => setBudgetForm({...budgetForm, budget_amount: e.target.value})} className="h-12 text-lg" />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {QUICK_AMOUNTS.map(amt => (
                    <Button key={amt} variant="outline" size="sm" onClick={() => setBudgetForm({...budgetForm, budget_amount: amt.toString()})}>
                      ${amt}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes..." value={budgetForm.notes} onChange={(e) => setBudgetForm({...budgetForm, notes: e.target.value})} />
              </div>
              <Button onClick={handleSaveBudget} className="w-full h-12" disabled={!budgetForm.category || !budgetForm.budget_amount}>
                {editingBudget ? 'Update' : 'Save'} Budget
              </Button>
            </div>
          </DialogWrapperContent>
        </DialogWrapper>

        <DialogWrapper open={showActualDialog} onOpenChange={setShowActualDialog}>
          <DialogWrapperTrigger asChild>
            <Button variant="outline" size={isMobile ? "sm" : "default"} className="gap-2">
              <Plus className="h-4 w-4" />
              {!isMobile && "Add Expense"}
            </Button>
          </DialogWrapperTrigger>
          <DialogWrapperContent className={isMobile ? "px-4 pb-8" : ""}>
            <DialogWrapperHeader>
              <DialogWrapperTitle>{editingActual ? 'Edit Expense' : 'Add Expense'}</DialogWrapperTitle>
              {isMobile && <DrawerDescription>Record a new expense</DrawerDescription>}
            </DialogWrapperHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Category</Label>
                <Select value={actualForm.category} onValueChange={(v) => setActualForm({...actualForm, category: v})}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(({ name, color }) => (
                      <SelectItem key={name} value={name}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", color)} />
                          {name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={actualForm.actual_amount} onChange={(e) => setActualForm({...actualForm, actual_amount: e.target.value})} className="h-12 text-lg" />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {QUICK_AMOUNTS.map(amt => (
                    <Button key={amt} variant="outline" size="sm" onClick={() => setActualForm({...actualForm, actual_amount: amt.toString()})}>
                      ${amt}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={actualForm.transaction_date} onChange={(e) => setActualForm({...actualForm, transaction_date: e.target.value})} className="h-12" />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="What was this for?" value={actualForm.description} onChange={(e) => setActualForm({...actualForm, description: e.target.value})} className="h-12" />
              </div>
              <Button onClick={handleSaveActual} className="w-full h-12" disabled={!actualForm.category || !actualForm.actual_amount}>
                {editingActual ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </DialogWrapperContent>
        </DialogWrapper>

        <DialogWrapper open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogWrapperTrigger asChild>
            <Button variant="outline" size={isMobile ? "sm" : "default"} className="gap-2">
              <Copy className="h-4 w-4" />
              {!isMobile && "Template"}
            </Button>
          </DialogWrapperTrigger>
          <DialogWrapperContent className={isMobile ? "px-4 pb-8" : ""}>
            <DialogWrapperHeader>
              <DialogWrapperTitle>Budget Templates</DialogWrapperTitle>
              {isMobile && <DrawerDescription>Apply a preset budget template</DrawerDescription>}
            </DialogWrapperHeader>
            <div className="space-y-4 mt-4">
              <div className="grid gap-2">
                {BUDGET_TEMPLATES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTemplate(t.name)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all",
                      selectedTemplate === t.name ? "border-primary bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Budget Split:</p>
                  {Object.entries(BUDGET_TEMPLATES.find(t => t.name === selectedTemplate)?.categories || {}).map(([cat, pct]) => (
                    <div key={cat} className="flex justify-between text-muted-foreground">
                      <span>{cat}</span>
                      <span>{pct}%</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>Expected Revenue</Label>
                <Input type="number" placeholder="Enter revenue target" value={templateRevenue} onChange={(e) => setTemplateRevenue(e.target.value)} className="h-12" />
              </div>
              <Button onClick={handleApplyTemplate} className="w-full h-12" disabled={!selectedTemplate || !templateRevenue}>
                Apply Template
              </Button>
            </div>
          </DialogWrapperContent>
        </DialogWrapper>

        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" size="icon" onClick={exportCSV} title="Export CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Help">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How to Use Budget Tracker</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">1. Set Your Budgets</h4>
                  <p className="text-muted-foreground">Click "Set Budget" to add budget targets for each category, or use a template to quickly set up all budgets.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">2. Record Expenses</h4>
                  <p className="text-muted-foreground">Add expenses as they occur to track your actual spending against budgets.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">3. Monitor Alerts</h4>
                  <p className="text-muted-foreground">Watch for alerts when spending approaches or exceeds budget limits.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">4. Review Forecasts</h4>
                  <p className="text-muted-foreground">Check the Forecast tab to see projected spending based on your current rate.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={cn("grid w-full", isMobile ? "grid-cols-4" : "grid-cols-5 max-w-lg")}>
          <TabsTrigger value="overview" className="gap-1">
            <Home className="h-4 w-4" />
            {!isMobile && "Overview"}
          </TabsTrigger>
          <TabsTrigger value="charts" className="gap-1">
            <PieChart className="h-4 w-4" />
            {!isMobile && "Charts"}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1">
            <History className="h-4 w-4" />
            {!isMobile && "History"}
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1">
            <Trending className="h-4 w-4" />
            {!isMobile && "Forecast"}
          </TabsTrigger>
          {!isMobile && (
            <TabsTrigger value="categories" className="gap-1">
              <Grid3X3 className="h-4 w-4" />
              Categories
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium">Budget</span>
              </div>
              <p className="text-2xl font-bold">${totals.totalBudget.toLocaleString()}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Spent</span>
              </div>
              <p className="text-2xl font-bold">${totals.totalActual.toLocaleString()}</p>
            </Card>
            <Card className={cn("p-4 border", totals.totalVariance >= 0 ? "bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20" : "bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-500/20")}>
              <div className={cn("flex items-center gap-2 mb-1", totals.totalVariance >= 0 ? "text-emerald-500" : "text-red-500")}>
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium">Remaining</span>
              </div>
              <p className="text-2xl font-bold">${Math.abs(totals.totalVariance).toLocaleString()}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <Percent className="h-4 w-4" />
                <span className="text-xs font-medium">Used</span>
              </div>
              <p className="text-2xl font-bold">{totals.totalBudget > 0 ? ((totals.totalActual / totals.totalBudget) * 100).toFixed(0) : 0}%</p>
            </Card>
          </div>

          {/* Overall Progress */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Budget Progress</span>
              <span className="text-sm text-muted-foreground">
                ${totals.totalActual.toLocaleString()} / ${totals.totalBudget.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={Math.min((totals.totalActual / Math.max(totals.totalBudget, 1)) * 100, 100)} 
              className={cn("h-3", (totals.totalActual / Math.max(totals.totalBudget, 1)) > 1 && "[&>div]:bg-red-500")}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card className="p-4 border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Alerts</span>
                <Badge variant="secondary" className="ml-auto">{alerts.length}</Badge>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    alert.type === 'critical' && "bg-red-500/10 text-red-500",
                    alert.type === 'warning' && "bg-amber-500/10 text-amber-500",
                    alert.type === 'success' && "bg-green-500/10 text-green-500"
                  )}>
                    {alert.type === 'critical' && <XCircle className="h-4 w-4 shrink-0" />}
                    {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0" />}
                    {alert.type === 'success' && <CheckCircle className="h-4 w-4 shrink-0" />}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Category Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Categories</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab(isMobile ? 'transactions' : 'categories')}>
                View All
              </Button>
            </div>
            <div className="space-y-2">
              {categoryData.slice(0, 5).map((cat) => {
                const progress = cat.budget > 0 ? (cat.actual / cat.budget) * 100 : 0;
                return (
                  <Card key={cat.name} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", cat.color)}>
                        {getCategoryIcon(cat.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{cat.name}</span>
                          <span className="text-sm font-medium">${cat.actual.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(progress, 100)} className={cn("h-1.5 flex-1", progress > 100 && "[&>div]:bg-red-500")} />
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            / ${cat.budget.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Recent</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                View All
              </Button>
            </div>
            {actuals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet</p>
            ) : (
              <div className="space-y-2">
                {actuals.slice(0, 5).map((txn) => (
                  <div key={txn.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", getCategoryColor(txn.category))}>
                      {getCategoryIcon(txn.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{txn.description || txn.category}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(txn.transaction_date), 'MMM d')}</p>
                    </div>
                    <span className="font-medium">${Number(txn.actual_amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          {/* Bar Chart */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Budget vs Actual</h3>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 60 : 30} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={50} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie Chart */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Expense Distribution</h3>
            {pieData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No expense data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 40 : 60}
                    outerRadius={isMobile ? 80 : 100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => isMobile ? `${(percent * 100).toFixed(0)}%` : `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={!isMobile}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Trend Chart */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">6-Month Trend</h3>
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <AreaChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} width={50} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="budget" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Budget" />
                <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search expenses..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filter & Sort</SheetTitle>
                  <SheetDescription>Customize how expenses are displayed</SheetDescription>
                </SheetHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(({ name }) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Sort Order</Label>
                    <div className="flex gap-2">
                      <Button variant={sortOrder === 'desc' ? 'default' : 'outline'} size="sm" onClick={() => setSortOrder('desc')}>
                        <ArrowDown className="h-4 w-4 mr-1" /> Desc
                      </Button>
                      <Button variant={sortOrder === 'asc' ? 'default' : 'outline'} size="sm" onClick={() => setSortOrder('asc')}>
                        <ArrowUp className="h-4 w-4 mr-1" /> Asc
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => { setFilterCategory('all'); setSortBy('date'); setSortOrder('desc'); setSearchQuery(''); }} variant="outline" className="w-full">
                    Reset Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Transaction Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredActuals.length} transaction{filteredActuals.length !== 1 ? 's' : ''}</span>
            <span>Total: ${filteredActuals.reduce((s, a) => s + Number(a.actual_amount), 0).toLocaleString()}</span>
          </div>

          {/* Transaction List */}
          {filteredActuals.length === 0 ? (
            <Card className="p-8 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No expenses found</p>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredActuals.map((txn, i) => (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0", getCategoryColor(txn.category))}>
                          {getCategoryIcon(txn.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{txn.description || txn.category}</span>
                            <span className="font-bold">${Number(txn.actual_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-[10px]">{txn.category}</Badge>
                            <span>{format(parseISO(txn.transaction_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingActual(txn);
                              setActualForm({
                                category: txn.category,
                                actual_amount: txn.actual_amount.toString(),
                                description: txn.description || '',
                                transaction_date: txn.transaction_date,
                                is_recurring: false
                              });
                              setShowActualDialog(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete('actual', txn.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Spending Forecast
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Daily Average</p>
                  <p className="text-xl font-bold">${forecast.dailyAvg.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Days Left</p>
                  <p className="text-xl font-bold">{forecast.remainingDays}</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Projected Total</p>
                  <p className="text-xl font-bold">${forecast.projectedTotal.toFixed(0).toLocaleString()}</p>
                </div>
                <div className={cn("p-3 rounded-lg", forecast.projectedVariance >= 0 ? "bg-green-500/10" : "bg-red-500/10")}>
                  <p className="text-xs text-muted-foreground">Projected Variance</p>
                  <p className={cn("text-xl font-bold", forecast.projectedVariance >= 0 ? "text-green-500" : "text-red-500")}>
                    {forecast.projectedVariance >= 0 ? '+' : ''}${forecast.projectedVariance.toFixed(0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Time Progress</span>
                  <span>{((forecast.elapsedDays / forecast.totalDays) * 100).toFixed(0)}%</span>
                </div>
                <Progress value={(forecast.elapsedDays / forecast.totalDays) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Budget Progress</span>
                  <span>{totals.expenseBudget > 0 ? ((totals.expenseActual / totals.expenseBudget) * 100).toFixed(0) : 0}%</span>
                </div>
                <Progress 
                  value={Math.min((totals.expenseActual / Math.max(totals.expenseBudget, 1)) * 100, 100)} 
                  className={cn("h-2", (totals.expenseActual / Math.max(totals.expenseBudget, 1)) > 1 && "[&>div]:bg-red-500")}
                />
              </div>
            </div>
          </Card>

          {/* Status Card */}
          <Card className={cn("p-6 text-center", forecast.projectedVariance >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30")}>
            {forecast.projectedVariance >= 0 ? (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <h3 className="font-bold text-lg text-green-500">On Track</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You're projected to finish ${Math.abs(forecast.projectedVariance).toFixed(0)} under budget
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
                <h3 className="font-bold text-lg text-amber-500">Over Budget Risk</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  At current pace, you'll exceed budget by ${Math.abs(forecast.projectedVariance).toFixed(0)}
                </p>
              </>
            )}
          </Card>

          {/* Recommendations */}
          <Card className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Recommendations
            </h3>
            <div className="space-y-2 text-sm">
              {forecast.projectedVariance < 0 ? (
                <>
                  <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <Minus className="h-4 w-4 mt-0.5 text-amber-500" />
                    <span>Reduce daily spending by ${Math.abs(forecast.projectedVariance / Math.max(forecast.remainingDays, 1)).toFixed(2)} to stay on budget</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <Eye className="h-4 w-4 mt-0.5 text-amber-500" />
                    <span>Review high-spend categories for potential savings</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <Check className="h-4 w-4 mt-0.5 text-green-500" />
                    <span>Current spending rate is sustainable</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <PiggyBank className="h-4 w-4 mt-0.5 text-green-500" />
                    <span>Consider allocating surplus to savings</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Categories Tab (Desktop) */}
        {!isMobile && (
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Categories</CardTitle>
                <CardDescription>Manage budgets for each category</CardDescription>
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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", cat.color)}>
                                {getCategoryIcon(cat.name)}
                              </div>
                              <span className="font-medium">{cat.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">${cat.budget.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${cat.actual.toLocaleString()}</TableCell>
                          <TableCell className={cn("text-right", cat.name === 'Revenue' ? (cat.variance > 0 ? 'text-red-500' : 'text-green-500') : (cat.variance > 0 ? 'text-green-500' : 'text-red-500'))}>
                            {cat.variance >= 0 ? '+' : ''}${cat.variance.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={Math.min(progress, 100)} className={cn("h-2 w-20", progress > 100 && "[&>div]:bg-red-500")} />
                              <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              cat.status === 'under' && "bg-green-500/10 text-green-500 border-green-500/30",
                              cat.status === 'over' && "bg-red-500/10 text-red-500 border-red-500/30",
                              cat.status === 'on-track' && "bg-blue-500/10 text-blue-500 border-blue-500/30"
                            )}>
                              {cat.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {budget && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditingBudget(budget);
                                  setBudgetForm({ category: budget.category, budget_amount: budget.budget_amount.toString(), notes: budget.notes || '', is_recurring: false });
                                  setShowBudgetDialog(true);
                                }}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDuplicate(budget)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('budget', budget.id)}>
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
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Floating Quick Add Button (Mobile) */}
      {isMobile && (
        <Drawer open={showQuickAdd} onOpenChange={setShowQuickAdd}>
          <DrawerTrigger asChild>
            <Button 
              size="icon" 
              className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg z-50"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="px-4 pb-8">
            <DrawerHeader>
              <DrawerTitle>Quick Add Expense</DrawerTitle>
              <DrawerDescription>Quickly record a new expense</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.filter(c => c.name !== 'Revenue').slice(0, 6).map(({ name, color }) => (
                  <button
                    key={name}
                    onClick={() => setQuickAddCategory(name)}
                    className={cn(
                      "p-3 rounded-lg text-center transition-all border",
                      quickAddCategory === name ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-white", color)}>
                      {getCategoryIcon(name)}
                    </div>
                    <span className="text-xs">{name}</span>
                  </button>
                ))}
              </div>
              <div>
                <Label>Amount</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={quickAddAmount} 
                  onChange={(e) => setQuickAddAmount(e.target.value)}
                  className="h-14 text-2xl text-center"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map(amt => (
                  <Button key={amt} variant="outline" size="sm" onClick={() => setQuickAddAmount(amt.toString())}>
                    ${amt}
                  </Button>
                ))}
              </div>
              <Button onClick={handleQuickAdd} className="w-full h-12" disabled={!quickAddCategory || !quickAddAmount}>
                Add ${quickAddAmount || '0'}
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </ReportLayout>
  );
};

export default BudgetActualReport;
