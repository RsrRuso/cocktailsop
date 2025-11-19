import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Wine, Droplets, Beaker, Scale, ThermometerSnowflake, Calculator, BookOpen, Package, TrendingUp, FileText, Shield, DollarSign, Trash2, Target, ClipboardCheck, Percent, FileBarChart, Download, BarChart3, PieChart, Users, Clock, AlertTriangle, CheckCircle2, Flame, Sparkles, TestTube, Timer, Thermometer, Container, BoxSelect, Tags, TrendingDown, Calendar, UserCheck, GraduationCap, Briefcase, LineChart, Activity, Edit3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const OpsTools = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("mixing");

  const tools = {
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
        name: "Pour Cost Report",
        description: "Drink profitability analysis",
        details: "Monitor pour cost percentages across all drinks. Identify opportunities to improve margins and pricing strategies.",
        icon: DollarSign,
        gradient: "from-purple-600 to-pink-500",
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
        details: "Monitor labor costs as percentage of revenue. Optimize scheduling to maintain healthy labor ratios and profitability.",
        icon: Users,
        gradient: "from-indigo-600 to-purple-500",
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
        details: "Generate comprehensive profit and loss reports. Track revenue, COGS, operating expenses, and net profit over time.",
        icon: PieChart,
        gradient: "from-teal-600 to-green-500",
        premium: true,
      },
    ],
    mixing: [
      {
        name: "ABV Calculator",
        description: "Calculate alcohol by volume",
        details: "Precise ABV calculation for cocktails and batched drinks. Essential for menu compliance and consistency.",
        icon: Percent,
        gradient: "from-purple-600 to-indigo-500",
        premium: false,
        path: "/abv-calculator",
      },
      {
        name: "Batch Calculator",
        description: "Scale recipes for large quantities",
        details: "Convert single servings to batch sizes. Perfect for events, bottling, or prep work with automatic unit conversion.",
        icon: Beaker,
        gradient: "from-blue-600 to-purple-500",
        premium: false,
        path: "/batch-calculator",
      },
      {
        name: "Scaling Tool",
        description: "Adjust recipes by ingredient ratios",
        details: "Proportionally scale recipes up or down while maintaining perfect balance. Ideal for testing and experimentation.",
        icon: Scale,
        gradient: "from-green-600 to-teal-500",
        premium: false,
        path: "/scaling-tool",
      },
      {
        name: "Yield Calculator",
        description: "Calculate final drink volume",
        details: "Determine exact yield after dilution and ice melt. Predict final volume for accurate costing and portioning.",
        icon: Droplets,
        gradient: "from-cyan-600 to-blue-500",
        premium: true,
        path: "/yield-calculator",
      },
      {
        name: "Cost Calculator",
        description: "Ingredient cost and pricing",
        details: "Calculate drink costs per serving. Set optimal pricing with target profit margins and competitive analysis.",
        icon: Calculator,
        gradient: "from-orange-600 to-red-500",
        premium: false,
        path: "/cost-calculator",
      },
      {
        name: "Recipe Vault",
        description: "Secure recipe management",
        details: "Store, organize, and version control your recipes. Share with team or keep proprietary drinks secure.",
        icon: BookOpen,
        gradient: "from-indigo-600 to-purple-500",
        premium: true,
        path: "/recipe-vault",
      },
      {
        name: "Cocktail SOP",
        description: "Standard operating procedures",
        details: "Create detailed SOPs for consistent preparation. Include techniques, garnishes, and plating specifications.",
        icon: ClipboardCheck,
        gradient: "from-rose-600 to-pink-500",
        premium: false,
        path: "/cocktail-sop",
      },
      {
        name: "Cocktail Specs",
        description: "Technical drink specifications",
        details: "Document precise specs including ABV, brix, pH, and taste profiles. Professional-grade formulation records.",
        icon: FileText,
        gradient: "from-teal-600 to-cyan-500",
        premium: false,
        path: "/cocktail-specs",
      },
      {
        name: "Dilution Calculator",
        description: "Ice melt and water content",
        details: "Calculate optimal dilution for stirred and shaken drinks. Achieve perfect texture and balance every time.",
        icon: Droplets,
        gradient: "from-blue-600 to-cyan-500",
        premium: true,
      },
      {
        name: "Syrup & Prep Tracker",
        description: "House-made ingredient tracking",
        details: "Track batch dates, expiration, and usage of syrups, infusions, and prep items. Ensure freshness and reduce waste.",
        icon: TestTube,
        gradient: "from-amber-600 to-orange-500",
        premium: true,
      },
      {
        name: "Ice Program Manager",
        description: "Ice type and usage planning",
        details: "Manage different ice types (cube, sphere, crushed). Track production schedules and storage requirements.",
        icon: BoxSelect,
        gradient: "from-cyan-600 to-blue-500",
        premium: true,
      },
    ],
    inventory: [
      {
        name: "Inventory Manager",
        description: "Complete stock control system",
        details: "Track all products across locations. Real-time updates with barcode scanning and expiration management.",
        icon: Package,
        gradient: "from-blue-600 to-indigo-500",
        premium: false,
        path: "/inventory-manager",
      },
      {
        name: "Temperature Logs",
        description: "HACCP temperature monitoring",
        details: "Digital temperature logging for fridges, freezers, and hot holding. Automated alerts for out-of-range readings.",
        icon: ThermometerSnowflake,
        gradient: "from-cyan-600 to-blue-500",
        premium: false,
        path: "/temperature-log",
      },
      {
        name: "Stock Audit",
        description: "Periodic inventory counts",
        details: "Conduct physical counts and reconcile with system. Generate variance reports to identify discrepancies.",
        icon: ClipboardCheck,
        gradient: "from-green-600 to-teal-500",
        premium: false,
        path: "/stock-audit",
      },
      {
        name: "Wastage Tracker",
        description: "Monitor and reduce waste",
        details: "Log waste events with photos and reasons. Identify patterns and implement reduction strategies.",
        icon: Trash2,
        gradient: "from-red-600 to-orange-500",
        premium: false,
        path: "/wastage-tracker",
      },
      {
        name: "Pour Cost Analysis",
        description: "Track drink profitability",
        details: "Monitor theoretical vs actual pour costs. Identify high-cost items and optimize menu engineering.",
        icon: DollarSign,
        gradient: "from-purple-600 to-pink-500",
        premium: false,
        path: "/pour-cost-analysis",
      },
      {
        name: "Menu Engineering",
        description: "Optimize menu performance",
        details: "Analyze item profitability and popularity. Strategically position items using proven menu psychology.",
        icon: Target,
        gradient: "from-orange-600 to-red-500",
        premium: false,
        path: "/menu-engineering",
      },
      {
        name: "Supplier Management",
        description: "Vendor relationship tracking",
        details: "Manage supplier contacts, pricing, delivery schedules. Compare costs and maintain preferred vendor lists.",
        icon: Users,
        gradient: "from-indigo-600 to-purple-500",
        premium: true,
      },
      {
        name: "Purchase Orders",
        description: "Streamlined ordering system",
        details: "Create and track purchase orders. Set par levels for automatic reorder suggestions and prevent stockouts.",
        icon: FileText,
        gradient: "from-teal-600 to-green-500",
        premium: true,
      },
      {
        name: "Receiving Log",
        description: "Delivery verification",
        details: "Document deliveries with photos. Verify quantities, quality, and temperatures. Track supplier performance.",
        icon: CheckCircle2,
        gradient: "from-green-600 to-emerald-500",
        premium: true,
      },
      {
        name: "FIFO Tracker",
        description: "First-in, first-out management",
        details: "Ensure proper stock rotation. Visual indicators for items approaching expiration. Reduce spoilage costs.",
        icon: Calendar,
        gradient: "from-amber-600 to-orange-500",
        premium: true,
      },
      {
        name: "Label Generator",
        description: "Professional labeling system",
        details: "Create prep labels with dates, contents, and allergen info. Ensure food safety compliance and organization.",
        icon: Tags,
        gradient: "from-rose-600 to-pink-500",
        premium: true,
      },
    ],
    management: [
      {
        name: "Team Dashboard",
        description: "Centralized team management",
        details: "Overview of all team members, roles, and permissions. Quick access to schedules and performance metrics.",
        icon: Users,
        gradient: "from-blue-600 to-indigo-500",
        premium: false,
        path: "/team-dashboard",
      },
      {
        name: "Task Manager",
        description: "Assign and track tasks",
        details: "Create, assign, and monitor task completion. Set priorities and deadlines. Keep operations running smoothly.",
        icon: ClipboardCheck,
        gradient: "from-green-600 to-teal-500",
        premium: false,
        path: "/task-manager",
      },
      {
        name: "Staff Scheduling",
        description: "Shift planning and management",
        details: "Create optimal schedules based on forecasted demand. Manage availability, time-off requests, and labor costs.",
        icon: Clock,
        gradient: "from-purple-600 to-indigo-500",
        premium: false,
        path: "/staff-scheduling",
      },
      {
        name: "Time & Attendance",
        description: "Clock in/out tracking",
        details: "Digital time clock with GPS verification. Track hours worked, breaks, and overtime. Export for payroll.",
        icon: Clock,
        gradient: "from-cyan-600 to-blue-500",
        premium: true,
      },
      {
        name: "Performance Reviews",
        description: "Employee evaluation system",
        details: "Structured performance reviews with customizable criteria. Track growth, set goals, and document feedback.",
        icon: UserCheck,
        gradient: "from-orange-600 to-red-500",
        premium: true,
      },
      {
        name: "Training Tracker",
        description: "Staff development management",
        details: "Track certifications, training completion, and skill development. Ensure compliance and improve service quality.",
        icon: GraduationCap,
        gradient: "from-indigo-600 to-purple-500",
        premium: true,
      },
      {
        name: "Incident Reports",
        description: "Safety and issue documentation",
        details: "Log incidents, accidents, and customer complaints. Photo documentation and follow-up tracking for liability protection.",
        icon: AlertTriangle,
        gradient: "from-red-600 to-orange-500",
        premium: true,
      },
      {
        name: "Opening/Closing Checklists",
        description: "Daily operation procedures",
        details: "Standardized checklists for opening and closing duties. Ensure consistency and accountability across shifts.",
        icon: CheckCircle2,
        gradient: "from-teal-600 to-green-500",
        premium: true,
      },
      {
        name: "Sales Forecasting",
        description: "Predict future demand",
        details: "AI-powered sales predictions based on historical data. Optimize staffing and inventory for expected volume.",
        icon: TrendingUp,
        gradient: "from-green-600 to-emerald-500",
        premium: true,
      },
      {
        name: "Document Library",
        description: "Centralized file management",
        details: "Store SOPs, recipes, policies, and training materials. Version control and team access management.",
        icon: BookOpen,
        gradient: "from-rose-600 to-pink-500",
        premium: false,
        path: "/documents",
      },
    ],
  };

  const handleToolClick = (tool: any) => {
    if (tool.path) {
      navigate(tool.path);
    } else if (tool.premium) {
      toast.info("This is a premium feature", {
        description: "Upgrade to unlock this powerful tool",
      });
    } else {
      toast.info("Coming soon", {
        description: "This tool is currently under development",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="pt-16 pb-20 px-4 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Professional Operations Suite</h1>
          <p className="text-muted-foreground">
            Comprehensive tools for beverage program management
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-500 text-white">
              <div className="text-2xl font-bold">{tools.reports.length}</div>
              <div className="text-sm opacity-90">Reports</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
              <div className="text-2xl font-bold">{tools.mixing.length}</div>
              <div className="text-sm opacity-90">Mixing Tools</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-600 to-teal-500 text-white">
              <div className="text-2xl font-bold">{tools.inventory.length}</div>
              <div className="text-sm opacity-90">Inventory</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-orange-600 to-red-500 text-white">
              <div className="text-2xl font-bold">{tools.management.length}</div>
              <div className="text-sm opacity-90">Management</div>
            </div>
          </div>
        </div>

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="mixing">Mixing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="management">Management</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.reports.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleToolClick(tool)}
                    className="p-6 rounded-xl bg-card border border-border hover:border-primary transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{tool.name}</h3>
                      {tool.premium && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {tool.description}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tool.details}
                    </p>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="mixing" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.mixing.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleToolClick(tool)}
                    className="p-6 rounded-xl bg-card border border-border hover:border-primary transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{tool.name}</h3>
                      {tool.premium && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {tool.description}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tool.details}
                    </p>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.inventory.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleToolClick(tool)}
                    className="p-6 rounded-xl bg-card border border-border hover:border-primary transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{tool.name}</h3>
                      {tool.premium && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {tool.description}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tool.details}
                    </p>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="management" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.management.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleToolClick(tool)}
                    className="p-6 rounded-xl bg-card border border-border hover:border-primary transition-all text-left group"
                  >
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{tool.name}</h3>
                      {tool.premium && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {tool.description}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {tool.details}
                    </p>
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
