import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChefHat, Store, UtensilsCrossed, ShoppingCart, Package, 
  ClipboardList, BarChart3, Settings, Users, Wine, DollarSign,
  ArrowRight, ArrowLeft, Check, Sparkles, Calculator, Printer,
  Clock, AlertTriangle, FileText, Truck, Database, RefreshCw,
  CreditCard, Receipt, Calendar, Target, TrendingUp, Percent,
  Mic, Brain, Shield, Lightbulb, Volume2, MessageSquare
} from "lucide-react";

interface LabOpsOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const onboardingSteps = [
  {
    id: "welcome",
    title: "Welcome to LAB Ops",
    icon: ChefHat,
    description: "Your complete restaurant & bar operations management system",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          LAB Ops is a comprehensive Point of Sale (POS) and operations management system designed for bars, restaurants, cafes, and hospitality venues.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Store, label: "Multi-Outlet Support" },
            { icon: UtensilsCrossed, label: "Menu Management" },
            { icon: ShoppingCart, label: "Order Processing" },
            { icon: Package, label: "Inventory Control" },
            { icon: BarChart3, label: "Analytics & Reports" },
            { icon: Users, label: "Staff Management" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <item.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "outlets",
    title: "Outlets & Setup",
    icon: Store,
    description: "Create and manage multiple business locations",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Start by creating your outlet (venue). Each outlet operates independently with its own menu, inventory, staff, and settings.
        </p>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-transparent">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Store className="h-4 w-4" /> Create Outlet
            </h4>
            <p className="text-sm text-muted-foreground">
              Click "Create Outlet" and enter your venue name, address, and type (restaurant, bar, cafe, etc.)
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Load Demo Data
            </h4>
            <p className="text-sm text-muted-foreground">
              New to LAB Ops? Use "Load Demo Data" to populate sample menu items, categories, inventory, and staff to explore all features.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "pos",
    title: "Point of Sale (POS)",
    icon: ShoppingCart,
    description: "Take orders and process payments",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The POS tab is your main order-taking interface. Here's how it works:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge className="mt-0.5">1</Badge>
            <div>
              <p className="font-medium">Select a Table</p>
              <p className="text-sm text-muted-foreground">Click on a table from the grid to start or continue an order</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge className="mt-0.5">2</Badge>
            <div>
              <p className="font-medium">Add Menu Items</p>
              <p className="text-sm text-muted-foreground">Browse categories, search items, and tap to add to the order</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge className="mt-0.5">3</Badge>
            <div>
              <p className="font-medium">Send to Kitchen/Bar</p>
              <p className="text-sm text-muted-foreground">Items are sent to the KDS (Kitchen Display) for preparation</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge className="mt-0.5">4</Badge>
            <div>
              <p className="font-medium">Process Payment</p>
              <p className="text-sm text-muted-foreground">Apply discounts, split bills, and accept cash/card payments</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "kitchen",
    title: "Kitchen Display (KDS)",
    icon: ChefHat,
    description: "Manage orders in the kitchen and bar",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          The Kitchen Display System shows all active orders for preparation staff:
        </p>
        <div className="grid gap-3">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Order Tickets
            </h4>
            <p className="text-sm text-muted-foreground">
              Each ticket shows table name, items ordered, modifiers, and wait time. Tickets flash red when over 10 minutes.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" /> Status Flow
            </h4>
            <p className="text-sm text-muted-foreground">
              Items flow: Sent → In Progress → Ready. Use "Bump All" to mark entire tickets complete.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Filter by Station
            </h4>
            <p className="text-sm text-muted-foreground">
              Filter tickets by station (Bar, Hot Kitchen, Cold Kitchen, Expo) to focus on relevant orders.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "menu",
    title: "Menu Management",
    icon: UtensilsCrossed,
    description: "Create and organize your menu items",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Build your complete menu with categories, items, and modifiers:
        </p>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Categories</h4>
            <p className="text-sm text-muted-foreground">
              Organize items into categories (Cocktails, Wines, Appetizers, etc.). Drag to reorder categories as they appear in the POS.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Menu Items</h4>
            <p className="text-sm text-muted-foreground">
              Add items with name, price, description, and category. Toggle items active/inactive without deleting. Drag to reorder items within categories.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Modifiers</h4>
            <p className="text-sm text-muted-foreground">
              Create modifiers like "Extra shot", "No ice", "Well done" with optional price adjustments.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "inventory",
    title: "Inventory Management",
    icon: Package,
    description: "Track stock levels and control costs",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Complete inventory control for ingredients and supplies:
        </p>
        <div className="grid gap-3">
          <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Database className="h-4 w-4" /> Inventory Items
            </h4>
            <p className="text-sm text-muted-foreground">
              Track spirits, mixers, food ingredients with SKUs, units, and par levels
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-gradient-to-r from-amber-500/10 to-transparent">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Low Stock Alerts
            </h4>
            <p className="text-sm text-muted-foreground">
              Set par levels to receive alerts when inventory falls below thresholds
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-gradient-to-r from-green-500/10 to-transparent">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" /> Suppliers & Orders
            </h4>
            <p className="text-sm text-muted-foreground">
              Manage suppliers and create purchase orders directly from the system
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "recipes",
    title: "Recipe & Cost Control",
    icon: Wine,
    description: "Manage recipes and track pour costs",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Link recipes to menu items for accurate costing and inventory deduction:
        </p>
        <div className="space-y-3">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Calculator className="h-4 w-4" /> Recipe Costing
            </h4>
            <p className="text-sm text-muted-foreground">
              Define ingredients for each recipe with quantities. The system calculates portion costs automatically.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Percent className="h-4 w-4" /> Pour Cost Analysis
            </h4>
            <p className="text-sm text-muted-foreground">
              Track pour cost percentages (ideal: 18-25% for drinks, 28-35% for food) and profit margins.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Auto-Deduction
            </h4>
            <p className="text-sm text-muted-foreground">
              When items are sold, inventory is automatically deducted based on recipe ingredients.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    icon: BarChart3,
    description: "Track performance and make data-driven decisions",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Comprehensive reporting to understand your business:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: DollarSign, label: "Daily Sales", desc: "Revenue by day/week/month" },
            { icon: TrendingUp, label: "Top Sellers", desc: "Best performing items" },
            { icon: Users, label: "Staff Performance", desc: "Sales by employee" },
            { icon: Target, label: "Category Mix", desc: "Revenue by category" },
            { icon: Receipt, label: "Bar Variance", desc: "Actual vs theoretical usage" },
            { icon: Calendar, label: "Package Sessions", desc: "Track brunch/happy hour packages" },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <item.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="p-4 border rounded-lg bg-gradient-to-r from-primary/10 to-transparent">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Data Import/Export
          </h4>
          <p className="text-sm text-muted-foreground">
            Import data from CSV/Excel files and export reports as PDF for sharing and record-keeping.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "settings",
    title: "Settings & Configuration",
    icon: Settings,
    description: "Customize LAB Ops for your venue",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Configure every aspect of your operations:
        </p>
        <div className="grid gap-3">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Tables & Seating</h4>
            <p className="text-sm text-muted-foreground">
              Set up table layout with names, capacities, and service areas
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Staff & Roles</h4>
            <p className="text-sm text-muted-foreground">
              Add team members with roles (Manager, Bartender, Waiter, Kitchen) and PIN codes
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Kitchen Stations</h4>
            <p className="text-sm text-muted-foreground">
              Configure stations (Bar, Hot Kitchen, Cold Kitchen) for order routing
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Void Reasons</h4>
            <p className="text-sm text-muted-foreground">
              Define reasons for voiding items/orders for accountability tracking
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "ai-intelligence",
    title: "AI & Intelligence Tools",
    icon: Brain,
    description: "Smart automation and predictive insights",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Powerful AI modules to optimize your operations:
        </p>
        
        {/* LUMX AI Voice Assistant */}
        <div className="p-3 border rounded-lg bg-gradient-to-r from-purple-500/10 to-transparent">
          <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
            <Mic className="h-4 w-4 text-purple-500" /> LUMX AI Voice Assistant
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            Natural language queries with voice & text input
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded">
              <Volume2 className="h-3 w-3" />
              <span>Voice Response</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded">
              <MessageSquare className="h-3 w-3" />
              <span>Text Input</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">
            Try: "What's my current stock?" or "Who's working today?"
          </p>
        </div>

        {/* Predictive Purchasing */}
        <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-500/10 to-transparent">
          <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
            <ShoppingCart className="h-4 w-4 text-blue-500" /> Predictive Purchasing
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            AI analyzes consumption patterns to predict reorder timing
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">Critical</span>
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">High</span>
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">Medium</span>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Low</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Shows days until empty & one-click ordering
          </p>
        </div>

        {/* Risk Radar Panel */}
        <div className="p-3 border rounded-lg bg-gradient-to-r from-red-500/10 to-transparent">
          <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-red-500" /> Risk Radar Panel
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            Proactive risk detection and alerts
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Shelf-life expiration warnings
            </li>
            <li className="flex items-center gap-1.5">
              <Package className="h-3 w-3 text-red-500" />
              Low stock critical alerts
            </li>
            <li className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-purple-500" />
              Consumption variance detection
            </li>
          </ul>
        </div>

        {/* Opportunity Unlock */}
        <div className="p-3 border rounded-lg bg-gradient-to-r from-green-500/10 to-transparent">
          <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-green-500" /> Opportunity Unlock System
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            AI-powered cost savings suggestions
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-xs text-center">
            <div className="p-1.5 bg-green-500/20 rounded">
              <DollarSign className="h-3 w-3 mx-auto mb-0.5" />
              Savings
            </div>
            <div className="p-1.5 bg-blue-500/20 rounded">
              <Target className="h-3 w-3 mx-auto mb-0.5" />
              Impact
            </div>
            <div className="p-1.5 bg-purple-500/20 rounded">
              <Check className="h-3 w-3 mx-auto mb-0.5" />
              Track
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "tips",
    title: "Pro Tips",
    icon: Sparkles,
    description: "Get the most out of LAB Ops",
    content: (
      <div className="space-y-3">
        <div className="grid gap-2">
          <div className="p-3 border-2 border-primary/30 rounded-lg bg-primary/5">
            <h4 className="font-semibold mb-1.5 text-sm">💡 Quick Actions</h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Double-tap table to quick-start new order</li>
              <li>• Swipe order items left to delete</li>
              <li>• Long-press menu item for modifiers</li>
            </ul>
          </div>
          <div className="p-3 border-2 border-amber-500/30 rounded-lg bg-amber-500/5">
            <h4 className="font-semibold mb-1.5 text-sm">⚡ Keyboard Shortcuts</h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Search items: Start typing anywhere</li>
              <li>• Send order: Ctrl/Cmd + Enter</li>
              <li>• Open payment: Ctrl/Cmd + P</li>
            </ul>
          </div>
          <div className="p-3 border-2 border-green-500/30 rounded-lg bg-green-500/5">
            <h4 className="font-semibold mb-1.5 text-sm">📊 Best Practices</h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Review daily reports before closing</li>
              <li>• Update inventory counts weekly</li>
              <li>• Check bar variance for theft prevention</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
];

export default function LabOpsOnboarding({ open, onOpenChange }: LabOpsOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = onboardingSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const goNext = () => {
    if (!isLastStep) setCurrentStep(currentStep + 1);
  };

  const goPrev = () => {
    if (!isFirstStep) setCurrentStep(currentStep - 1);
  };

  const finish = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <step.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-xl truncate">{step.title}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm line-clamp-1">{step.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="py-2 sm:py-4">
            {step.content}
          </div>
        </ScrollArea>

        {/* Progress & Navigation */}
        <div className="border-t pt-4 space-y-4">
          {/* Step Indicators */}
          <div className="flex justify-center gap-1.5">
            {onboardingSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : index < currentStep 
                    ? "w-2 bg-primary/50" 
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={isFirstStep}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentStep + 1} of {onboardingSteps.length}
            </span>

            {isLastStep ? (
              <Button onClick={finish}>
                <Check className="h-4 w-4 mr-1" />
                Get Started
              </Button>
            ) : (
              <Button onClick={goNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
