import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Wine, Droplets, Beaker, Scale, ThermometerSnowflake, Calculator, BookOpen, Package, TrendingUp, FileText, Shield, DollarSign, Trash2, Target, ClipboardCheck, Percent, FileBarChart, Download } from "lucide-react";
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
    ],
    inventory: [
      {
        name: "Inventory Manager",
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
    ],
    management: [
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
        icon: FileText,
        gradient: "from-orange-600 to-red-500",
        premium: true,
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
    ],
  };

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
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary mb-2">
            Professional Ops Tools
          </h1>
          <p className="text-muted-foreground">
            Advanced toolkits for beverage professionals
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.management.map((tool) => {
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
