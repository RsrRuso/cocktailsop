import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Users, GraduationCap, ShoppingCart, Megaphone,
  Zap, FileCheck, Shirt, HeartPulse, CalendarCheck, Building2,
  AlertTriangle, CheckCircle2, Clock, ArrowRight, RefreshCw,
  Target, Activity, TrendingUp, AlertCircle, Link2, ChevronRight,
  Gauge, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePreOpeningSync, Dependency, Alert } from "@/hooks/usePreOpeningSync";
import { cn } from "@/lib/utils";

const moneyCompact = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);

const moduleConfig = [
  { id: 'budget', name: 'Budget', icon: DollarSign, path: '/budget-planner', color: 'from-emerald-500 to-green-600' },
  { id: 'recruitment', name: 'Recruitment', icon: Users, path: '/recruitment-tracker', color: 'from-blue-500 to-indigo-600' },
  { id: 'training', name: 'Training', icon: GraduationCap, path: '/training-program', color: 'from-purple-500 to-violet-600' },
  { id: 'inventory', name: 'Inventory', icon: ShoppingCart, path: '/opening-inventory', color: 'from-orange-500 to-amber-600' },
  { id: 'marketing', name: 'Marketing', icon: Megaphone, path: '/marketing-launch', color: 'from-pink-500 to-rose-600' },
  { id: 'utilities', name: 'Utilities', icon: Zap, path: '/utilities-tracker', color: 'from-yellow-500 to-orange-600' },
  { id: 'insurance', name: 'Insurance', icon: FileCheck, path: '/insurance-manager', color: 'from-cyan-500 to-teal-600' },
  { id: 'uniforms', name: 'Uniforms', icon: Shirt, path: '/uniform-manager', color: 'from-indigo-500 to-purple-600' },
  { id: 'health', name: 'Health & Safety', icon: HeartPulse, path: '/health-safety-audit', color: 'from-red-500 to-pink-600' },
  { id: 'softOpening', name: 'Soft Opening', icon: CalendarCheck, path: '/soft-opening-planner', color: 'from-violet-500 to-fuchsia-600' },
];

const DependencyLine = ({ dep }: { dep: Dependency }) => {
  const statusColors = {
    ok: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    warning: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    critical: 'bg-red-500/20 border-red-500/50 text-red-400',
  };

  const typeIcons = {
    blocks: <AlertCircle className="w-3 h-3" />,
    affects: <Activity className="w-3 h-3" />,
    requires: <Link2 className="w-3 h-3" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-xs", statusColors[dep.status])}
    >
      {typeIcons[dep.type]}
      <span className="font-medium">{dep.from}</span>
      <ArrowRight className="w-3 h-3" />
      <span className="font-medium">{dep.to}</span>
      <span className="text-muted-foreground ml-auto">{dep.message}</span>
    </motion.div>
  );
};

const AlertCard = ({ alert }: { alert: Alert }) => {
  const colors = {
    critical: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const icons = {
    critical: <AlertTriangle className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
    info: <Activity className="w-4 h-4" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex items-center gap-3 p-3 rounded-lg border", colors[alert.type])}
    >
      {icons[alert.type]}
      <div className="flex-1">
        <span className="text-xs font-medium">{alert.module}</span>
        <p className="text-sm">{alert.message}</p>
      </div>
    </motion.div>
  );
};

const ModuleCard = ({ 
  module, 
  value, 
  total, 
  subtext,
  onClick 
}: { 
  module: typeof moduleConfig[0];
  value: number;
  total: number;
  subtext: string;
  onClick: () => void;
}) => {
  const progress = total > 0 ? (value / total) * 100 : 0;
  const Icon = module.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className={cn("h-1.5 bg-gradient-to-r", module.color)} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2 rounded-lg bg-gradient-to-br", module.color, "text-white")}>
              <Icon className="w-4 h-4" />
            </div>
            <Badge variant="outline" className="text-xs">
              {value}/{total}
            </Badge>
          </div>
          <h3 className="font-semibold text-sm mb-1">{module.name}</h3>
          <p className="text-xs text-muted-foreground mb-2">{subtext}</p>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const PreOpeningCommandCenter = () => {
  const navigate = useNavigate();
  const { metrics, refreshAll } = usePreOpeningSync();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshAll();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const readinessColor = metrics.overallReadiness >= 80 
    ? 'text-emerald-500' 
    : metrics.overallReadiness >= 50 
    ? 'text-amber-500' 
    : 'text-red-500';

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Pre-Opening Command Center
          </h2>
          <p className="text-muted-foreground">Synchronized operations dashboard</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          Sync All
        </Button>
      </div>

      {/* Overall Readiness Score */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center">
                <div className="text-center">
                  <span className={cn("text-4xl font-bold", readinessColor)}>
                    {Math.round(metrics.overallReadiness)}%
                  </span>
                  <p className="text-xs text-muted-foreground">Readiness</p>
                </div>
              </div>
              <div 
                className="absolute inset-0 rounded-full border-8 border-transparent"
                style={{
                  borderTopColor: metrics.overallReadiness >= 80 ? '#10b981' : metrics.overallReadiness >= 50 ? '#f59e0b' : '#ef4444',
                  transform: `rotate(${(metrics.overallReadiness / 100) * 360 - 90}deg)`,
                  transition: 'transform 1s ease-out'
                }}
              />
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Target className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-xl font-bold">${(metrics.budget.remaining / 1000).toFixed(0)}k</p>
                <p className="text-xs text-muted-foreground">Budget Left</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Users className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xl font-bold">{metrics.recruitment.filled}/{metrics.recruitment.totalPositions}</p>
                <p className="text-xs text-muted-foreground">Staff Hired</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                <p className="text-xl font-bold">{metrics.training.completed}/{metrics.training.totalPrograms}</p>
                <p className="text-xs text-muted-foreground">Training Done</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <CalendarCheck className="w-5 h-5 mx-auto text-pink-500 mb-1" />
                <p className="text-xl font-bold">
                  {metrics.softOpening.daysUntil > 0 ? `${metrics.softOpening.daysUntil}d` : 'TBD'}
                </p>
                <p className="text-xs text-muted-foreground">Days to Open</p>
              </div>
            </div>
          </div>

          {/* Blockers */}
          {metrics.softOpening.blockers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">BLOCKERS TO OPENING</p>
              <div className="flex flex-wrap gap-2">
                {metrics.softOpening.blockers.map((blocker, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">
                    {blocker}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Ops Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-600/5 border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Financial Summary (Lab Ops)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-emerald-500">
                  {moneyCompact(metrics.financial.totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Total Revenue (30d)</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{metrics.financial.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{moneyCompact(metrics.financial.avgCheck)}</p>
                <p className="text-xs text-muted-foreground">Avg Check</p>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-blue-500">
                  {moneyCompact(metrics.financial.beverageRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Beverage Revenue</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-sm">
              <span className="text-muted-foreground">
                Discounts: <span className="text-amber-500">${metrics.financial.discounts.toFixed(0)}</span>
              </span>
              <span className="text-muted-foreground">
                Comps: <span className="text-red-500">${metrics.financial.comps.toFixed(0)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-600/5 border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-500" />
              Inventory Overview (Lab Ops)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{metrics.inventory.totalItems}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-emerald-500">{metrics.inventory.activeBottles}</p>
                <p className="text-xs text-muted-foreground">Active Bottles</p>
              </div>
              <div className="space-y-1">
                <p className={cn("text-lg font-semibold", metrics.inventory.lowStock > 5 ? "text-red-500" : "text-amber-500")}>
                  {metrics.inventory.lowStock}
                </p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
              <div className="space-y-1">
                <p className={cn("text-lg font-semibold", metrics.variance.variancePercent > 10 ? "text-red-500" : "text-emerald-500")}>
                  {metrics.variance.variancePercent.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Variance</p>
              </div>
            </div>
            {metrics.variance.itemsWithVariance > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-amber-500">
                  ⚠️ {metrics.variance.itemsWithVariance} items with &gt;5% variance
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {metrics.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ModuleCard
          module={moduleConfig[0]}
          value={metrics.budget.spent}
          total={metrics.budget.total}
          subtext={`$${(metrics.budget.remaining / 1000).toFixed(0)}k remaining`}
          onClick={() => navigate('/budget-planner')}
        />
        <ModuleCard
          module={moduleConfig[1]}
          value={metrics.recruitment.filled}
          total={metrics.recruitment.totalPositions}
          subtext={`${metrics.recruitment.pending} positions open`}
          onClick={() => navigate('/recruitment-tracker')}
        />
        <ModuleCard
          module={moduleConfig[2]}
          value={metrics.training.completed}
          total={metrics.training.totalPrograms}
          subtext={`${metrics.training.inProgress} in progress`}
          onClick={() => navigate('/training-program')}
        />
        <ModuleCard
          module={moduleConfig[3]}
          value={metrics.inventory.activeBottles}
          total={metrics.inventory.totalItems}
          subtext={`${metrics.inventory.lowStock} low stock`}
          onClick={() => navigate('/lab-ops')}
        />
        <ModuleCard
          module={moduleConfig[4]}
          value={metrics.marketing.active}
          total={metrics.marketing.totalCampaigns}
          subtext={`$${(metrics.marketing.totalBudget / 1000).toFixed(0)}k budget`}
          onClick={() => navigate('/marketing-launch')}
        />
        <ModuleCard
          module={moduleConfig[5]}
          value={metrics.utilities.connected}
          total={metrics.utilities.totalSetup}
          subtext={`${metrics.utilities.pending} pending setup`}
          onClick={() => navigate('/utilities-tracker')}
        />
        <ModuleCard
          module={moduleConfig[6]}
          value={metrics.insurance.active}
          total={metrics.insurance.totalPolicies}
          subtext={`${metrics.insurance.expiringSoon} expiring soon`}
          onClick={() => navigate('/insurance-manager')}
        />
        <ModuleCard
          module={moduleConfig[7]}
          value={metrics.uniforms.delivered}
          total={metrics.uniforms.totalOrders}
          subtext={`${metrics.uniforms.pending} pending delivery`}
          onClick={() => navigate('/uniform-manager')}
        />
        <ModuleCard
          module={moduleConfig[8]}
          value={metrics.health.passed}
          total={metrics.health.totalAudits}
          subtext={`${metrics.health.issues} issues to resolve`}
          onClick={() => navigate('/health-safety-audit')}
        />
        <ModuleCard
          module={moduleConfig[9]}
          value={Math.round(metrics.softOpening.readinessScore)}
          total={100}
          subtext={metrics.softOpening.daysUntil > 0 ? `${metrics.softOpening.daysUntil} days away` : 'Set date'}
          onClick={() => navigate('/soft-opening-planner')}
        />
      </div>

      {/* Dependencies Map */}
      {metrics.dependencies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              System Dependencies
              <Badge variant="outline" className="ml-2">{metrics.dependencies.length} connections</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {metrics.dependencies.map((dep, i) => (
                    <DependencyLine key={i} dep={dep} />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Quick Action - Add Demo Data Prompt */}
      {metrics.budget.total === 0 && metrics.recruitment.totalPositions === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Get Started</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start adding data to any module to see how they connect and sync together.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => navigate('/budget-planner')}>Add Budget</Button>
              <Button size="sm" variant="outline" onClick={() => navigate('/recruitment-tracker')}>Add Positions</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
