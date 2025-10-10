import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Calculator, BookOpen, FileText, Lock, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Tools = () => {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) setSubscription(data);
  };

  const isTrialActive = subscription && new Date(subscription.trial_ends_at) > new Date();
  const isSubscribed = subscription?.status === "active";
  const hasAccess = isTrialActive || isSubscribed;

  const tools = [
    {
      name: "Batch Calculator",
      description: "Calculate precise batch quantities",
      icon: Calculator,
      path: "/tools/batch-calculator",
    },
    {
      name: "Recipe Manager",
      description: "Store and manage your recipes",
      icon: BookOpen,
      path: "/tools/recipes",
    },
    {
      name: "Reports & Analytics",
      description: "Track your sales and targets",
      icon: FileText,
      path: "/tools/reports",
    },
    {
      name: "Inventory Management",
      description: "Track ingredients and supplies",
      icon: Package,
      path: "/tools/inventory",
    },
    {
      name: "Cost Calculator",
      description: "Calculate costs and profit margins",
      icon: DollarSign,
      path: "/tools/cost-calculator",
    },
    {
      name: "Quality Control",
      description: "Ensure product consistency",
      icon: ClipboardCheck,
      path: "/tools/quality-control",
    },
    {
      name: "Compliance Tracker",
      description: "Health & safety regulations",
      icon: Shield,
      path: "/tools/compliance",
    },
    {
      name: "Staff Scheduler",
      description: "Manage team shifts efficiently",
      icon: Users,
      path: "/tools/staff-scheduler",
    },
    {
      name: "Order Manager",
      description: "Track orders and deliveries",
      icon: ShoppingCart,
      path: "/tools/order-manager",
    },
    {
      name: "Marketing Planner",
      description: "Plan campaigns and promotions",
      icon: Megaphone,
      path: "/tools/marketing",
    },
    {
      name: "Equipment Log",
      description: "Track maintenance and repairs",
      icon: Wrench,
      path: "/tools/equipment",
    },
    {
      name: "Supplier Manager",
      description: "Manage vendors and pricing",
      icon: Phone,
      path: "/tools/suppliers",
    },
    {
      name: "Seasonal Planner",
      description: "Plan drinks by season",
      icon: Calendar,
      path: "/tools/seasonal",
    },
    {
      name: "Nutrition Calculator",
      description: "Calculate nutrition information",
      icon: Apple,
      path: "/tools/nutrition",
    },
    {
      name: "Waste Tracker",
      description: "Reduce waste and track losses",
      icon: Trash2,
      path: "/tools/waste",
    },
    {
      name: "Training Resources",
      description: "Onboarding and training materials",
      icon: GraduationCap,
      path: "/tools/training",
    },
    {
      name: "Invoice Generator",
      description: "Create professional invoices",
      icon: Receipt,
      path: "/tools/invoices",
    },
    {
      name: "Event Booking",
      description: "Manage catering and events",
      icon: PartyPopper,
      path: "/tools/events",
    },
  ];

  const handleToolClick = (path: string) => {
    if (!hasAccess) {
      toast.error("Subscribe to access professional tools");
      return;
    }
    toast.info("Tool coming soon!");
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Professional Tools</h2>
          <p className="text-sm text-muted-foreground">
            Smart tools for beverage industry professionals
          </p>
        </div>

        {/* Subscription Status */}
        <div className={`glass rounded-2xl p-4 ${hasAccess ? "border-primary" : "border-accent"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {isTrialActive ? "Free Trial Active" : isSubscribed ? "Subscribed" : "Trial Expired"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isTrialActive
                  ? `Ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
                  : isSubscribed
                  ? "Full access"
                  : "Subscribe to unlock tools"}
              </p>
            </div>
            {!isSubscribed && (
              <Button className="glow-accent">Subscribe Now</Button>
            )}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <button
              key={tool.name}
              onClick={() => handleToolClick(tool.path)}
              className="glass-hover rounded-2xl p-6 text-left space-y-3 relative"
            >
              {!hasAccess && (
                <div className="absolute top-4 right-4">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center glow-primary">
                <tool.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{tool.name}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Tools;
