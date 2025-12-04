import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import { 
  DollarSign, TrendingUp, Receipt, Wallet, Target, Scale, Building, 
  CreditCard, Users, Package, AlertTriangle, Clock, Percent, 
  ShoppingCart, BarChart3, PieChart, Utensils, Star, TrendingDown,
  Calculator, FileText, UserCheck, Timer, MessageSquare, Shield,
  ArrowLeft, ChevronRight, CalendarDays
} from 'lucide-react';

const reportCategories = [
  {
    title: 'Financial Reports',
    icon: DollarSign,
    color: 'from-emerald-500 to-green-600',
    reports: [
      { name: 'Profit & Loss (P&L)', route: '/reports/profit-loss', icon: TrendingUp, description: 'Revenue, costs, net profit summary' },
      { name: 'Daily Sales Summary', route: '/reports/daily-sales', icon: Receipt, description: 'End-of-day sales breakdown' },
      { name: 'Weekly/Monthly Revenue', route: '/reports/revenue-periodic', icon: BarChart3, description: 'Periodic revenue tracking' },
      { name: 'Cash Flow Statement', route: '/reports/cash-flow', icon: Wallet, description: 'Money in/out tracking' },
      { name: 'Budget vs Actual', route: '/reports/budget-actual', icon: Target, description: 'Planned vs real performance' },
      { name: 'Breakeven Analysis', route: '/reports/breakeven', icon: Scale, description: 'Calculate breakeven point' },
      { name: 'Tax Summary', route: '/reports/tax-summary', icon: Building, description: 'Tax preparation report' },
      { name: 'Accounts Payable', route: '/reports/accounts-payable', icon: CreditCard, description: 'Supplier payments due' },
      { name: 'Accounts Receivable', route: '/reports/accounts-receivable', icon: DollarSign, description: 'Outstanding customer payments' },
    ]
  },
  {
    title: 'Cost Reports',
    icon: Calculator,
    color: 'from-orange-500 to-red-600',
    reports: [
      { name: 'Cost of Goods Sold', route: '/reports/cogs', icon: Package, description: 'Product cost breakdown' },
      { name: 'Food Cost Analysis', route: '/reports/food-cost', icon: Utensils, description: 'Food item cost percentage' },
      { name: 'Labor Cost Report', route: '/reports/labor-cost', icon: Users, description: 'Staff expense tracking' },
      { name: 'Overhead Cost Report', route: '/reports/overhead-cost', icon: Building, description: 'Rent, utilities, insurance' },
      { name: 'Waste/Spillage Report', route: '/reports/waste-spillage', icon: AlertTriangle, description: 'Loss tracking' },
      { name: 'Prime Cost Report', route: '/reports/prime-cost', icon: Calculator, description: 'COGS + Labor combined' },
    ]
  },
  {
    title: 'Inventory Reports',
    icon: Package,
    color: 'from-blue-500 to-indigo-600',
    reports: [
      { name: 'Stock Movement', route: '/reports/stock-movement', icon: TrendingUp, description: 'In/out tracking' },
      { name: 'Low Stock Alert', route: '/reports/low-stock-alert', icon: AlertTriangle, description: 'Reorder notifications' },
      { name: 'Dead Stock Report', route: '/reports/dead-stock', icon: Package, description: 'Non-moving items' },
      { name: 'Shelf Life/Expiry', route: '/reports/shelf-life', icon: Clock, description: 'Items nearing expiration' },
      { name: 'Par Level Report', route: '/reports/par-level', icon: Target, description: 'Optimal stock levels' },
      { name: 'Shrinkage Report', route: '/reports/shrinkage', icon: TrendingDown, description: 'Theft/loss analysis' },
    ]
  },
  {
    title: 'Sales Reports',
    icon: ShoppingCart,
    color: 'from-purple-500 to-pink-600',
    reports: [
      { name: 'Revenue by Category', route: '/reports/revenue-category', icon: PieChart, description: 'Drinks, food, merchandise' },
      { name: 'Hourly Sales Analysis', route: '/reports/hourly-sales', icon: Clock, description: 'Peak hours identification' },
      { name: 'Server/Bartender Sales', route: '/reports/server-sales', icon: Users, description: 'Staff performance' },
      { name: 'Payment Method Report', route: '/reports/payment-methods', icon: CreditCard, description: 'Cash, card, digital' },
      { name: 'Discount/Comp Report', route: '/reports/discounts', icon: Percent, description: 'Giveaways tracking' },
      { name: 'Average Check Size', route: '/reports/average-check', icon: Receipt, description: 'Transaction value' },
      { name: 'Table Turnover', route: '/reports/table-turnover', icon: Timer, description: 'Covers per table' },
    ]
  },
  {
    title: 'Menu Reports',
    icon: Utensils,
    color: 'from-amber-500 to-yellow-600',
    reports: [
      { name: 'Menu Engineering', route: '/reports/menu-engineering', icon: BarChart3, description: 'Item profitability matrix' },
      { name: 'Best Sellers Report', route: '/reports/best-sellers', icon: Star, description: 'Top performing items' },
      { name: 'Slow Movers Report', route: '/reports/slow-movers', icon: TrendingDown, description: 'Underperforming items' },
      { name: 'Menu Mix Analysis', route: '/reports/menu-mix', icon: PieChart, description: 'Category contribution' },
      { name: 'Gross Margin by Item', route: '/reports/gross-margin', icon: Percent, description: 'Per-item profitability' },
      { name: 'Recipe Cost Card', route: '/reports/recipe-cost', icon: FileText, description: 'Individual recipe costs' },
    ]
  },
  {
    title: 'Staff/Labor Reports',
    icon: Users,
    color: 'from-cyan-500 to-teal-600',
    reports: [
      { name: 'Timesheet Report', route: '/reports/timesheet', icon: Clock, description: 'Hours worked' },
      { name: 'Labor Cost %', route: '/reports/labor-percent', icon: Percent, description: 'Labor as % of sales' },
      { name: 'Overtime Report', route: '/reports/overtime', icon: Timer, description: 'Extra hours tracking' },
      { name: 'Tip Distribution', route: '/reports/tips', icon: DollarSign, description: 'Tip pool allocation' },
      { name: 'Sales per Labor Hour', route: '/reports/sales-labor-hour', icon: TrendingUp, description: 'Productivity metric' },
      { name: 'Attendance Report', route: '/reports/attendance', icon: UserCheck, description: 'Punctuality tracking' },
    ]
  },
  {
    title: 'Operational Reports',
    icon: BarChart3,
    color: 'from-rose-500 to-red-600',
    reports: [
      { name: 'Daily Operations Summary', route: '/reports/daily-ops', icon: FileText, description: 'Full day overview' },
      { name: 'Guest Count/Covers', route: '/reports/guest-count', icon: Users, description: 'Customer traffic' },
      { name: 'Reservation Report', route: '/reports/reservations', icon: CalendarDays, description: 'Booking analysis' },
      { name: 'Wait Time Analysis', route: '/reports/wait-time', icon: Timer, description: 'Service speed' },
      { name: 'Complaint/Feedback', route: '/reports/feedback', icon: MessageSquare, description: 'Guest satisfaction' },
      { name: 'Health & Safety Log', route: '/reports/health-safety', icon: Shield, description: 'Compliance tracking' },
    ]
  },
];



const FinancialReportsHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gradient-primary">
              Financial Reports Hub
            </h1>
            <p className="text-muted-foreground text-sm">
              Comprehensive hospitality management reports
            </p>
          </div>
        </div>

        {/* Report Categories */}
        <div className="space-y-8">
          {reportCategories.map((category) => (
            <Card key={category.title} className="glass overflow-hidden">
              <CardHeader className={`bg-gradient-to-r ${category.color} text-white py-4`}>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <category.icon className="h-6 w-6" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.reports.map((report) => (
                    <Button
                      key={report.route}
                      variant="outline"
                      className="h-auto py-3 px-4 justify-start text-left hover:bg-accent/50 transition-all group"
                      onClick={() => navigate(report.route)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${category.color} text-white shrink-0`}>
                          <report.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{report.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{report.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default FinancialReportsHub;
