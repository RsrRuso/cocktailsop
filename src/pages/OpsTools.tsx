import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Wine, Droplets, Beaker, Scale, ThermometerSnowflake, Calculator, BookOpen, Package, TrendingUp, FileText, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const OpsTools = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("mixing");

  const tools = {
    mixing: [
      {
        name: "Batch Calculator Pro",
        description: "Calculate precise batch quantities for any recipe",
        icon: Calculator,
        gradient: "from-pink-600 to-orange-500",
        premium: false,
      },
      {
        name: "Dilution Calculator",
        description: "Perfect dilution ratios for cocktails",
        icon: Droplets,
        gradient: "from-blue-600 to-cyan-500",
        premium: true,
      },
      {
        name: "ABV Calculator",
        description: "Calculate alcohol by volume",
        icon: Beaker,
        gradient: "from-purple-600 to-pink-500",
        premium: false,
      },
      {
        name: "Scaling Tool",
        description: "Scale recipes up or down",
        icon: Scale,
        gradient: "from-green-600 to-teal-500",
        premium: false,
      },
    ],
    inventory: [
      {
        name: "Inventory Manager",
        description: "Track stock levels and costs",
        icon: Package,
        gradient: "from-orange-600 to-amber-700",
        premium: false,
        path: "/inventory-manager",
      },
      {
        name: "Cost Calculator",
        description: "Calculate recipe costs and margins",
        icon: Calculator,
        gradient: "from-pink-500 to-orange-600",
        premium: false,
      },
      {
        name: "Order Optimizer",
        description: "Optimize ordering and reduce waste",
        icon: TrendingUp,
        gradient: "from-blue-600 to-purple-500",
        premium: true,
      },
      {
        name: "Temperature Log",
        description: "Monitor storage temperatures",
        icon: ThermometerSnowflake,
        gradient: "from-cyan-600 to-blue-500",
        premium: false,
        path: "/temperature-log",
      },
    ],
    management: [
      {
        name: "Admin Panel",
        description: "Manage verification status",
        icon: Shield,
        gradient: "from-yellow-400 to-orange-500",
        premium: false,
        path: "/admin-panel",
      },
      {
        name: "Recipe Vault",
        description: "Store and organize recipes",
        icon: BookOpen,
        gradient: "from-purple-600 to-pink-500",
        premium: false,
      },
      {
        name: "Sales Analytics",
        description: "Track sales and performance",
        icon: TrendingUp,
        gradient: "from-green-600 to-emerald-500",
        premium: true,
      },
      {
        name: "Staff Schedule",
        description: "Manage team schedules",
        icon: FileText,
        gradient: "from-orange-600 to-red-500",
        premium: true,
      },
      {
        name: "Cocktail Specs",
        description: "Standardize cocktail specifications",
        icon: Wine,
        gradient: "from-pink-600 to-purple-500",
        premium: false,
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
        <Tabs defaultValue="mixing" className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass h-auto p-1">
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

          <TabsContent value="mixing" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.mixing.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.name}
                    onClick={() => handleToolClick(tool.name, tool.premium)}
                    className="glass-hover rounded-2xl p-6 text-left space-y-4 relative overflow-hidden group transition-all duration-300 hover:scale-105"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white">
                        PRO
                      </div>
                    )}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
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
                    className="glass-hover rounded-2xl p-6 text-left space-y-4 relative overflow-hidden group transition-all duration-300 hover:scale-105"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white">
                        PRO
                      </div>
                    )}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
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
                    className="glass-hover rounded-2xl p-6 text-left space-y-4 relative overflow-hidden group transition-all duration-300 hover:scale-105"
                  >
                    {tool.premium && (
                      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-bold text-white">
                        PRO
                      </div>
                    )}
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
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
