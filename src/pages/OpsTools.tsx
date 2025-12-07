import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { Wine, Droplets, Beaker, Scale, ThermometerSnowflake, Calculator, BookOpen, Package, TrendingUp, FileText, Shield, DollarSign, Trash2, Target, ClipboardCheck, Percent, FileBarChart, Download, BarChart3, PieChart, Users, Clock, AlertTriangle, CheckCircle2, Flame, Sparkles, TestTube, Timer, Thermometer, Container, BoxSelect, Tags, TrendingDown, Calendar, UserCheck, GraduationCap, Briefcase, LineChart, Activity, Edit3, Store, ArrowRightLeft, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const OpsTools = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("mixing");

  const tools = useMemo(() => ({
    reports: [
      {
        name: "Sales Report",
        description: "Comprehensive sales performance analysis",
        details: "Generate detailed sales reports with revenue, profit margins, and category breakdowns. Export as PDF for stakeholder review.",
        icon: FileBarChart,
        gradient: "from-green-600 to-emerald-500",
        premium: false,
        path: "/sales-report",
      },
      {
        name: "Inventory Valuation",
        description: "Complete inventory value assessment",
        details: "Calculate total inventory value by category. Track stock levels and their monetary worth for financial reporting.",
        icon: Package,
        gradient: "from-blue-600 to-cyan-500",
        premium: false,
        path: "/inventory-valuation-report",
      },
      {
        name: "Variance Report",
        description: "Expected vs actual usage analysis",
        details: "Identify discrepancies between expected and actual inventory usage. Track waste, theft, and efficiency issues.",
        icon: TrendingUp,
        gradient: "from-orange-600 to-red-500",
        premium: false,
        path: "/variance-report",
      },
      {
        name: "Budget vs Actual",
        description: "Compare planned vs actual spending",
        details: "Track budget performance across all expense categories. Monitor variances, identify overspending, and maintain financial control with detailed monthly comparisons.",
        icon: Target,
        gradient: "from-violet-600 to-purple-500",
        premium: false,
        path: "/reports/budget-actual",
      },
      {
        name: "Cash Flow Statement",
        description: "Monitor cash movement and liquidity",
        details: "Track operating, investing, and financing cash flows. Forecast cash positions and ensure sufficient working capital for operations.",
        icon: TrendingUp,
        gradient: "from-blue-600 to-teal-500",
        premium: true,
      },
      {
        name: "Break-even Analysis",
        description: "Calculate profitability threshold",
        details: "Determine break-even points for revenue targets. Analyze fixed and variable costs to understand minimum sales required for profitability.",
        icon: LineChart,
        gradient: "from-amber-600 to-orange-500",
        premium: true,
      },
      {
        name: "Pour Cost Report",
        description: "Drink profitability analysis",
        details: "Monitor pour cost percentages across all drinks. Identify opportunities to improve margins and pricing strategies.",
        icon: DollarSign,
        gradient: "from-purple-600 to-pink-500",
        premium: true,
      },
      {
        name: "COGS Report",
        description: "Cost of goods sold tracking",
        details: "Calculate COGS by category with opening stock, purchases, and closing inventory. Essential for accurate P&L and gross profit analysis.",
        icon: Calculator,
        gradient: "from-rose-600 to-red-500",
        premium: true,
      },
      {
        name: "RevPASH Calculator",
        description: "Revenue per available seat hour",
        details: "Hospitality-specific metric tracking revenue efficiency per seat. Optimize table turnover and maximize space utilization for higher profitability.",
        icon: Users,
        gradient: "from-cyan-600 to-blue-500",
        premium: true,
      },
      {
        name: "Food Cost %",
        description: "Food cost percentage analysis",
        details: "Industry standard food cost tracking. Monitor costs as percentage of sales, maintain target ranges (28-35%), and optimize menu pricing.",
        icon: Percent,
        gradient: "from-green-600 to-emerald-500",
        premium: true,
      },
      {
        name: "Beverage Cost %",
        description: "Beverage cost percentage tracking",
        details: "Track beverage costs against sales. Maintain industry targets (18-24% for bars), identify pricing opportunities, and reduce wastage.",
        icon: Wine,
        gradient: "from-purple-600 to-fuchsia-500",
        premium: true,
      },
      {
        name: "Prime Cost Report",
        description: "Combined COGS + labor analysis",
        details: "Critical hospitality metric combining food/beverage costs with labor. Target 55-60% for profitability. Includes detailed cost breakdowns.",
        icon: BarChart3,
        gradient: "from-indigo-600 to-violet-500",
        premium: true,
      },
      {
        name: "Daily Sales Summary",
        description: "Daily revenue and transaction report",
        details: "Comprehensive daily sales breakdown by category, payment method, and time period. Track covers, average check, and hourly sales patterns.",
        icon: Calendar,
        gradient: "from-orange-600 to-amber-500",
        premium: true,
      },
      {
        name: "Weekly Financial",
        description: "Week-over-week performance",
        details: "Compare weekly financial performance. Track sales trends, costs, labor, and profitability. Identify patterns and seasonality.",
        icon: Activity,
        gradient: "from-teal-600 to-cyan-500",
        premium: true,
      },
      {
        name: "Monthly Financial",
        description: "Comprehensive monthly summary",
        details: "Complete monthly P&L with YTD comparisons. Analyze revenue, costs, operating expenses, and net profit with variance analysis.",
        icon: FileText,
        gradient: "from-blue-600 to-indigo-500",
        premium: true,
      },
      {
        name: "Waste Analysis Report",
        description: "Waste tracking and cost analysis",
        details: "Comprehensive wastage reporting by category, reason, and cost impact. Identify patterns to reduce operational losses.",
        icon: Trash2,
        gradient: "from-red-600 to-orange-500",
        premium: true,
      },
      {
        name: "Temperature Compliance",
        description: "HACCP compliance report",
        details: "Export temperature logs for health inspections. Prove compliance with food safety regulations.",
        icon: ThermometerSnowflake,
        gradient: "from-cyan-600 to-blue-500",
        premium: true,
      },
      {
        name: "Labor Cost Analysis",
        description: "Staff cost vs revenue tracking",
        details: "Monitor labor costs as percentage of revenue. Optimize scheduling to maintain healthy labor ratios (25-35%) and profitability.",
        icon: Clock,
        gradient: "from-indigo-600 to-purple-500",
        premium: true,
      },
      {
        name: "CapEx Tracking",
        description: "Capital expenditure management",
        details: "Track capital investments, depreciation, and ROI. Plan equipment purchases, renovations, and major expenditures with budget forecasting.",
        icon: Building2,
        gradient: "from-slate-600 to-gray-500",
        premium: true,
      },
      {
        name: "Fixed vs Variable",
        description: "Cost structure analysis",
        details: "Break down fixed costs (rent, insurance) vs variable costs (COGS, labor). Understand cost behavior and improve margin management.",
        icon: PieChart,
        gradient: "from-pink-600 to-rose-500",
        premium: true,
      },
      {
        name: "Contribution Margin",
        description: "Product profitability analysis",
        details: "Calculate contribution margin by product. Identify high-margin items to promote and low-margin items to re-price or remove.",
        icon: TrendingUp,
        gradient: "from-emerald-600 to-green-500",
        premium: true,
      },
      {
        name: "Operating Expenses",
        description: "OpEx tracking and control",
        details: "Monitor all operating expenses: utilities, supplies, marketing, maintenance. Track as percentage of revenue and identify cost-saving opportunities.",
        icon: DollarSign,
        gradient: "from-yellow-600 to-amber-500",
        premium: true,
      },
      {
        name: "Balance Sheet",
        description: "Assets, liabilities & equity",
        details: "Complete balance sheet showing financial position. Track assets, liabilities, and owner's equity. Essential for lenders and investors.",
        icon: FileBarChart,
        gradient: "from-violet-600 to-purple-500",
        premium: true,
      },
      {
        name: "Performance Dashboard",
        description: "Real-time KPI monitoring",
        details: "Live dashboard showing key metrics: sales, costs, inventory levels, and staff performance. Make data-driven decisions instantly.",
        icon: Activity,
        gradient: "from-rose-600 to-orange-500",
        premium: true,
      },
      {
        name: "Profit & Loss Report",
        description: "Complete P&L statements",
        details: "Generate comprehensive profit and loss reports. Track revenue, COGS, operating expenses, and net profit over time with YoY comparisons.",
        icon: BarChart3,
        gradient: "from-teal-600 to-green-500",
        premium: true,
      },
    ],
    mixing: [
      {
        name: "Batch Calculator Pro",
        description: "Calculate precise batch quantities for any recipe",
        details: "Perfect for scaling cocktails and batch production. Enter your recipe and target batch size to get exact measurements. Supports metric and imperial units.",
        icon: Calculator,
        gradient: "from-pink-600 to-orange-500",
        premium: false,
        path: "/batch-calculator",
      },
      {
        name: "Dilution Calculator",
        description: "Perfect dilution ratios for cocktails",
        details: "Calculate ice melt and dilution to achieve perfect cocktail balance. Input spirit ABV, ice weight, and shake time for precision mixing.",
        icon: Droplets,
        gradient: "from-blue-600 to-cyan-500",
        premium: true,
      },
      {
        name: "ABV Calculator",
        description: "Calculate alcohol by volume",
        details: "Determine final ABV for any cocktail or batch. Simply enter ingredients with their ABVs and volumes to get accurate alcohol content.",
        icon: Beaker,
        gradient: "from-purple-600 to-pink-500",
        premium: false,
        path: "/abv-calculator",
      },
      {
        name: "Scaling Tool",
        description: "Scale recipes up or down",
        details: "Instantly scale any recipe to any size. Convert single serves to batch production or vice versa with perfect ratio maintenance.",
        icon: Scale,
        gradient: "from-green-600 to-teal-500",
        premium: false,
        path: "/scaling-tool",
      },
      {
        name: "Syrup Calculator",
        description: "Calculate syrup ratios and shelf life",
        details: "Create perfect simple syrups and cordials. Calculate sugar-to-water ratios, batch sizes, and estimate shelf life based on sugar content.",
        icon: TestTube,
        gradient: "from-amber-600 to-yellow-500",
        premium: true,
      },
      {
        name: "Infusion Tracker",
        description: "Track infusion timelines and recipes",
        details: "Monitor spirit infusions with precise timing. Track flavor development, set alerts for tasting intervals, and store successful recipes.",
        icon: Timer,
        gradient: "from-violet-600 to-purple-500",
        premium: true,
      },
      {
        name: "Ice Calculator",
        description: "Calculate ice needs for events",
        details: "Determine exact ice quantities for parties and events. Factor in guest count, drink types, and event duration for perfect planning.",
        icon: Sparkles,
        gradient: "from-cyan-600 to-blue-500",
        premium: true,
      },
      {
        name: "Brix Converter",
        description: "Convert between Brix, ABV, and gravity",
        details: "Professional brewing and distilling calculations. Convert between Brix, specific gravity, and potential alcohol content.",
        icon: Thermometer,
        gradient: "from-orange-600 to-red-500",
        premium: true,
      },
    ],
    inventory: [
      {
        name: "Store Management",
        description: "Comprehensive store operations & transfers",
        details: "Complete store management system with live transactions, transfers, spot checks, variance reports, receivings, colleague management, and real-time notifications.",
        icon: Store,
        gradient: "from-blue-600 to-purple-500",
        premium: false,
        path: "/store-management",
      },
      {
        name: "Workspace Management",
        description: "Organize stores into workspaces",
        details: "Create and manage workspaces to organize your stores. View workspace members, store counts, and easily switch between different workspaces.",
        icon: Building2,
        gradient: "from-indigo-600 to-blue-500",
        premium: false,
        path: "/workspace-management",
      },
      {
        name: "FIFO Recording Manager",
        description: "Track stock levels and expiration dates",
        details: "Full inventory control system. Add items, set stores/areas, track quantities, monitor expiration dates, and manage transfers between locations.",
        icon: Package,
        gradient: "from-orange-600 to-amber-700",
        premium: false,
        path: "/inventory-manager",
      },
      {
        name: "Cost Calculator",
        description: "Calculate recipe costs and profit margins",
        details: "Know your real costs. Input ingredient prices and quantities to calculate exact recipe costs, suggested pricing, and profit margins.",
        icon: Calculator,
        gradient: "from-pink-500 to-orange-600",
        premium: false,
        path: "/cost-calculator",
      },
      {
        name: "Pour Cost Analysis",
        description: "Monitor drink profitability",
        details: "Track and analyze pour cost percentages for all drinks. Identify high-cost items and optimize pricing for better margins.",
        icon: DollarSign,
        gradient: "from-emerald-600 to-green-500",
        premium: false,
        path: "/pour-cost-analysis",
      },
      {
        name: "Wastage Tracker",
        description: "Monitor and reduce operational waste",
        details: "Log and analyze waste by category and reason. Identify patterns to reduce costs and improve operational efficiency.",
        icon: Trash2,
        gradient: "from-red-600 to-orange-500",
        premium: false,
        path: "/wastage-tracker",
      },
      {
        name: "Stock Audit",
        description: "Physical inventory count & variance analysis",
        details: "Compare expected vs actual stock levels. Identify discrepancies, calculate shrinkage, and maintain accurate inventory records.",
        icon: ClipboardCheck,
        gradient: "from-purple-600 to-blue-500",
        premium: false,
        path: "/stock-audit",
      },
      {
        name: "Yield Calculator",
        description: "Calculate usable yield & true costs",
        details: "Determine actual usable product after prep and waste. Calculate true ingredient costs accounting for wastage and yield percentages.",
        icon: Percent,
        gradient: "from-cyan-600 to-teal-500",
        premium: false,
        path: "/yield-calculator",
      },
      {
        name: "Order Optimizer",
        description: "Optimize ordering and reduce waste",
        details: "Analyze usage patterns to predict optimal order quantities. Reduce waste and stockouts with data-driven ordering recommendations.",
        icon: TrendingUp,
        gradient: "from-blue-600 to-purple-500",
        premium: true,
      },
      {
        name: "Temperature Log",
        description: "Monitor and log storage temperatures",
        details: "HACCP compliance made easy. Log fridge/freezer temperatures, set alerts for out-of-range readings, and maintain audit-ready records.",
        icon: ThermometerSnowflake,
        gradient: "from-cyan-600 to-blue-500",
        premium: false,
        path: "/temperature-log",
      },
      {
        name: "Supplier Management",
        description: "Track vendors and pricing",
        details: "Manage supplier relationships, compare pricing, track delivery schedules, and maintain contact information for all vendors.",
        icon: Briefcase,
        gradient: "from-slate-600 to-gray-500",
        premium: true,
      },
      {
        name: "Reorder Alerts",
        description: "Automated low-stock notifications",
        details: "Set reorder points and receive automatic alerts when stock falls below thresholds. Never run out of essential items.",
        icon: AlertTriangle,
        gradient: "from-yellow-600 to-orange-500",
        premium: true,
      },
      {
        name: "Category Analysis",
        description: "Inventory performance by category",
        details: "Analyze inventory turnover, profit margins, and velocity by category. Identify fast and slow-moving items.",
        icon: BarChart3,
        gradient: "from-indigo-600 to-blue-500",
        premium: true,
      },
      {
        name: "Label Generator",
        description: "Create professional inventory labels",
        details: "Generate QR codes and labels for inventory items. Include expiration dates, batch numbers, and storage instructions.",
        icon: Tags,
        gradient: "from-pink-600 to-rose-500",
        premium: true,
      },
    ],
    management: [
      {
        name: "GM-Command Suite",
        description: "One-Click Executive Intelligence Dashboard",
        details: "AI-powered leadership dashboard with financial command panel, inventory automation, staff performance engine, approval workflows, risk radar, and opportunity finder.",
        icon: Sparkles,
        gradient: "from-violet-600 to-purple-500",
        premium: false,
        path: "/gm-command",
        featured: true,
      },
      {
        name: "LAB Ops",
        description: "Complete POS, Inventory & Restaurant Management",
        details: "Full restaurant management system with mobile POS ordering, KDS for kitchen/bar, purchasing, inventory control, recipes & costing, and real-time analytics.",
        icon: Flame,
        gradient: "from-amber-500 to-red-600",
        premium: false,
        path: "/lab-ops",
        featured: true,
      },
      {
        name: "Recipe Vault",
        description: "Secure recipe storage and organization",
        details: "Your digital recipe book. Store specs, batch recipes, and production notes. Tag and categorize for quick access.",
        icon: BookOpen,
        gradient: "from-purple-600 to-pink-500",
        premium: false,
        path: "/recipe-vault",
      },
      {
        name: "Menu Engineering",
        description: "Optimize menu profitability",
        details: "Analyze menu items using the menu matrix. Identify Stars, Plowhorses, Puzzles, and Dogs to make data-driven menu decisions.",
        icon: Target,
        gradient: "from-indigo-600 to-purple-500",
        premium: false,
        path: "/menu-engineering",
      },
      {
        name: "Menu Engineering Pro",
        description: "BCG Matrix with Micros Oracle import",
        details: "Import sales data from Micros Oracle (CSV/Excel). Automatically categorize items as Stars, Plowhorses, Puzzles, and Dogs with AI recommendations.",
        icon: PieChart,
        gradient: "from-amber-500 to-orange-600",
        premium: false,
        path: "/menu-engineering-pro",
      },
      {
        name: "Sales Analytics",
        description: "Track sales trends and performance",
        details: "Comprehensive sales dashboard. View top sellers, sales by category, time-based trends, and revenue analytics to inform menu decisions.",
        icon: TrendingUp,
        gradient: "from-green-600 to-emerald-500",
        premium: true,
      },
      {
        name: "Staff Schedule",
        description: "Manage team schedules and shifts",
        details: "Simplified scheduling. Create shifts, assign staff, track labor hours, and send automatic notifications. Export to calendar apps.",
        icon: Calendar,
        gradient: "from-orange-600 to-red-500",
        premium: false,
        path: "/staff-scheduling",
      },
      {
        name: "Map Planner",
        description: "Design venue layouts with equipment",
        details: "Plan your bar layout by mapping stations, equipment, and item locations. Create visual SOPs showing where everything is stored for efficient service.",
        icon: Building2,
        gradient: "from-blue-600 to-indigo-500",
        premium: false,
        path: "/map-planner",
      },
      {
        name: "Cocktail Specs",
        description: "Standardize cocktail specifications",
        details: "Create and share standardized recipes. Document exact specs, techniques, glassware, and garnishes to ensure consistency across your team.",
        icon: Wine,
        gradient: "from-pink-600 to-purple-500",
        premium: false,
        path: "/cocktail-specs",
      },
      {
        name: "Cocktail SOP",
        description: "Professional SOP with PDF export",
        details: "Generate detailed cocktail SOPs with identity, metrics, taste profiles, recipes with allergens, and export to professional PDFs.",
        icon: FileText,
        gradient: "from-indigo-600 to-purple-500",
        premium: false,
        path: "/cocktail-sop",
      },
      {
        name: "Training Log",
        description: "Track staff training and certifications",
        details: "Monitor employee training progress, certification renewals, and skill development. Ensure compliance and maintain competency records.",
        icon: GraduationCap,
        gradient: "from-blue-600 to-cyan-500",
        premium: true,
      },
      {
        name: "Performance Reviews",
        description: "Employee evaluation system",
        details: "Conduct structured performance reviews. Track goals, feedback, and development plans. Schedule regular check-ins automatically.",
        icon: UserCheck,
        gradient: "from-emerald-600 to-green-500",
        premium: true,
      },
      {
        name: "Shift Reports",
        description: "End-of-shift reporting and handover",
        details: "Document shift activities, issues, and notes. Create seamless handovers between shifts with structured digital reports.",
        icon: FileText,
        gradient: "from-slate-600 to-gray-500",
        premium: true,
      },
      {
        name: "Task Manager",
        description: "Assign and track operational tasks",
        details: "Create checklists, assign responsibilities, set deadlines, and monitor completion. Ensure nothing falls through the cracks.",
        icon: CheckCircle2,
        gradient: "from-violet-600 to-purple-500",
        premium: true,
        path: "/task-manager",
      },
      {
        name: "CRM System",
        description: "Customer relationship management",
        details: "Comprehensive CRM similar to Bitrix24. Manage leads, contacts, deals pipeline, and activities. Track sales and communication.",
        icon: Users,
        gradient: "from-blue-600 to-cyan-500",
        premium: false,
        path: "/crm",
      },
      {
        name: "Advanced Editor",
        description: "Professional editing suite with bulk operations",
        details: "Professional editing suite with advanced features. Multi-select, bulk editing, version history, filters, keyboard shortcuts, and collaboration tools.",
        icon: Edit3,
        gradient: "from-violet-600 to-fuchsia-500",
        premium: false,
        path: "/advanced-editor",
      },
      {
        name: "Trend Forecasting",
        description: "Predict demand and optimize inventory",
        details: "AI-powered demand forecasting based on historical data, events, and trends. Plan inventory and staffing with confidence.",
        icon: LineChart,
        gradient: "from-rose-600 to-pink-500",
        premium: true,
      },
    ],
  }), []);

  const handleToolClick = (toolName: string, isPremium: boolean, path?: string) => {
    if (path) {
      navigate(path);
    } else if (isPremium) {
      toast.info("Upgrade to Premium to access this tool");
    } else {
      toast.info(`${toolName} coming soon!`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        {/* Performance Monitor */}
        <PerformanceMonitor />
        
        {/* Header with Stats */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
              Professional Operations Suite
            </h1>
            <p className="text-muted-foreground">
              Comprehensive tools for beverage industry professionals
            </p>
          </div>

          {/* Quick Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
                  <FileBarChart className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-muted-foreground">Reports</p>
              </div>
              <p className="text-2xl font-bold">{tools.reports.length}</p>
            </div>

            <div className="glass rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <Beaker className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-muted-foreground">Mixing</p>
              </div>
              <p className="text-2xl font-bold">{tools.mixing.length}</p>
            </div>

            <div className="glass rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-muted-foreground">Inventory</p>
              </div>
              <p className="text-2xl font-bold">{tools.inventory.length}</p>
            </div>

            <div className="glass rounded-xl p-4 hover:shadow-lg transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-muted-foreground">Management</p>
              </div>
              <p className="text-2xl font-bold">{tools.management.length}</p>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass h-auto p-1">
            <TabsTrigger 
              value="reports"
              className="data-[state=active]:glow-primary data-[state=active]:text-primary rounded-xl py-3"
            >
              <Download className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger 
              value="mixing"
              className="data-[state=active]:glow-primary data-[state=active]:text-primary rounded-xl py-3"
            >
              <Beaker className="w-4 h-4 mr-2" />
              Mixing
            </TabsTrigger>
            <TabsTrigger 
              value="inventory"
              className="data-[state=active]:glow-primary data-[state=active]:text-primary rounded-xl py-3"
            >
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger 
              value="management"
              className="data-[state=active]:glow-primary data-[state=active]:text-primary rounded-xl py-3"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.reports.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolClick(tool.name, tool.premium, (tool as any).path)}
                    className="glass-hover rounded-2xl p-6 text-left space-y-3 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white shadow-lg">
                        PRO
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground leading-snug mb-2">{tool.description}</p>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">{(tool as any).details}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="mixing" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.mixing.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolClick(tool.name, tool.premium, (tool as any).path)}
                    className="glass-hover rounded-2xl p-6 text-left space-y-3 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white shadow-lg">
                        PRO
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground leading-snug mb-2">{tool.description}</p>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">{(tool as any).details}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.inventory.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolClick(tool.name, tool.premium, (tool as any).path)}
                    className="glass-hover rounded-2xl p-6 text-left space-y-3 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white shadow-lg">
                        PRO
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground leading-snug mb-2">{tool.description}</p>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">{(tool as any).details}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="management" className="mt-6 space-y-4">
            {/* Featured LAB Ops Card */}
            {tools.management.filter((t: any) => t.featured).map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.name}
                  onClick={() => handleToolClick(tool.name, tool.premium, (tool as any).path)}
                  className="w-full glass-hover rounded-2xl p-6 text-left space-y-4 relative overflow-hidden group transition-all duration-300 hover:scale-[1.01] border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-red-500/10"
                >
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-xs font-bold text-white shadow-lg animate-pulse">
                    FEATURED
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground leading-snug mb-2">{tool.description}</p>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">{(tool as any).details}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            
            {/* Regular Management Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.management.filter((t: any) => !t.featured).map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolClick(tool.name, tool.premium, (tool as any).path)}
                    className="glass-hover rounded-2xl p-6 text-left space-y-3 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02]"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white shadow-lg">
                        PRO
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground leading-snug mb-2">{tool.description}</p>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed">{(tool as any).details}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default OpsTools;
