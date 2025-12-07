import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, Users, Package, FileText, Shield, TrendingUp, 
  AlertTriangle, Lightbulb, Brain, Download, Zap, RefreshCw,
  CheckCircle2, XCircle, Clock, ChevronRight, BarChart3,
  Trash2, Play, Eye, BookOpen, Settings, Upload, Database,
  Crown, Wine, UserCheck, Sparkles, ArrowUpRight, ArrowDownRight,
  Target, Gauge, Activity, Star, Flame, Trophy, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useGMCommand } from "@/hooks/useGMCommand";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const GMCommandDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  
  const {
    loading,
    financialMetrics,
    approvalRequests,
    staffPerformance,
    riskAlerts,
    opportunities,
    inventoryPredictions,
    fetchAllData,
    loadDemoData,
    clearDemoData,
    updateApprovalStatus,
    resolveRiskAlert,
    implementOpportunity
  } = useGMCommand();

  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user?.id, fetchAllData]);

  const latestMetrics = financialMetrics[0];
  const pendingApprovals = approvalRequests.filter(a => a.status === 'pending');
  const activeRisks = riskAlerts.filter(r => r.status === 'active');
  const totalOpportunitySavings = opportunities.reduce((sum, o) => sum + (o.projected_savings || 0) + (o.projected_revenue_increase || 0), 0);

  const formatCurrency = (amount: number, currency = 'AED') => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'normal': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to access the GM-Command Dashboard</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                <Zap className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">GM-Command Dashboard</h1>
            <p className="text-muted-foreground">One-Click Executive Intelligence</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/gm-command-guide')} className="gap-2">
              <BookOpen className="w-4 h-4" />
              Guide
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Database className="w-4 h-4" />
                  Demo Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Demo Data Management</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Load sample data to test the GM-Command Dashboard features.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={loadDemoData} disabled={loading} className="flex-1 gap-2">
                      <Upload className="w-4 h-4" />
                      Load Demo Data
                    </Button>
                    <Button variant="destructive" onClick={clearDemoData} disabled={loading} className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border-emerald-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">{latestMetrics ? formatCurrency(latestMetrics.total_revenue) : 'No data'}</p>
                  <div className="flex items-center text-xs text-emerald-500">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>+13% vs last month</span>
                  </div>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Gross Profit %</p>
                  <p className="text-xl font-bold">{latestMetrics ? `${latestMetrics.gp_percentage}%` : 'No data'}</p>
                  <div className="flex items-center text-xs text-blue-500">
                    <Target className="w-3 h-3 mr-1" />
                    <span>Target: 52%</span>
                  </div>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border-orange-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pending Approvals</p>
                  <p className="text-xl font-bold">{pendingApprovals.length}</p>
                  <div className="flex items-center text-xs text-orange-500">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>Action required</span>
                  </div>
                </div>
                <Shield className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Opportunities</p>
                  <p className="text-xl font-bold">{formatCurrency(totalOpportunitySavings)}</p>
                  <div className="flex items-center text-xs text-purple-500">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    <span>Potential value</span>
                  </div>
                </div>
                <Sparkles className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs">
              Approvals
              {pendingApprovals.length > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="risks" className="text-xs">
              Risks
              {activeRisks.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {activeRisks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs">Opportunities</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {latestMetrics ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Beverage Cost %</span>
                          <span className={latestMetrics.beverage_cost_percentage <= 24 ? 'text-emerald-500' : 'text-orange-500'}>
                            {latestMetrics.beverage_cost_percentage}%
                          </span>
                        </div>
                        <Progress value={latestMetrics.beverage_cost_percentage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Food Cost %</span>
                          <span className={latestMetrics.food_cost_percentage <= 35 ? 'text-emerald-500' : 'text-orange-500'}>
                            {latestMetrics.food_cost_percentage}%
                          </span>
                        </div>
                        <Progress value={latestMetrics.food_cost_percentage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Labor Cost %</span>
                          <span className={latestMetrics.labor_cost_percentage <= 30 ? 'text-emerald-500' : 'text-orange-500'}>
                            {latestMetrics.labor_cost_percentage}%
                          </span>
                        </div>
                        <Progress value={latestMetrics.labor_cost_percentage} className="h-2" />
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{latestMetrics.covers}</p>
                          <p className="text-xs text-muted-foreground">Covers</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{formatCurrency(latestMetrics.average_check)}</p>
                          <p className="text-xs text-muted-foreground">Avg Check</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No financial data available</p>
                      <Button variant="link" onClick={loadDemoData}>Load demo data</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inventory Predictions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    Inventory Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inventoryPredictions.length > 0 ? (
                    <ScrollArea className="h-[250px]">
                      <div className="space-y-3">
                        {inventoryPredictions.map((item) => (
                          <div key={item.id} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{item.item_name}</span>
                              {item.excess_stock_warning ? (
                                <Badge variant="outline" className="text-orange-500 border-orange-500">Excess</Badge>
                              ) : item.predicted_shortage_date ? (
                                <Badge variant="outline" className="text-red-500 border-red-500">Low Stock</Badge>
                              ) : (
                                <Badge variant="outline" className="text-emerald-500 border-emerald-500">OK</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Stock: {item.current_stock} units
                            </p>
                            <p className="text-xs text-primary">
                              <Brain className="w-3 h-3 inline mr-1" />
                              {item.ai_suggestion}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No inventory predictions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('approvals')}>
                    <Shield className="w-5 h-5" />
                    <span className="text-xs">Review Approvals</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('risks')}>
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-xs">Check Risks</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('opportunities')}>
                    <Lightbulb className="w-5 h-5" />
                    <span className="text-xs">View Opportunities</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                    <FileText className="w-5 h-5" />
                    <span className="text-xs">Generate Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-4">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{approval.category}</Badge>
                          <Badge className={getPriorityColor(approval.priority)} variant="outline">
                            {approval.priority}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{approval.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{approval.description}</p>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{formatCurrency(Math.abs(approval.amount), approval.currency)}</p>
                            <p className="text-xs text-muted-foreground">{approval.amount < 0 ? 'Savings' : 'Cost'}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{approval.roi_percentage}%</p>
                            <p className="text-xs text-muted-foreground">ROI</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{approval.payback_months}mo</p>
                            <p className="text-xs text-muted-foreground">Payback</p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-start gap-2">
                            <Brain className="w-4 h-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-primary mb-1">AI Recommendation</p>
                              <p className="text-sm">{approval.ai_recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button 
                          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateApprovalStatus(approval.id, 'approved')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1 gap-2"
                          onClick={() => updateApprovalStatus(approval.id, 'rejected', 'Not approved at this time')}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2">
                          <Clock className="w-4 h-4" />
                          Revise
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                  <h3 className="font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No pending approvals at this time.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-4">
            {activeRisks.length > 0 ? (
              activeRisks.map((risk) => (
                <Card key={risk.id} className="border-l-4" style={{ borderLeftColor: risk.severity === 'critical' ? '#ef4444' : risk.severity === 'high' ? '#f97316' : '#eab308' }}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getRiskColor(risk.severity)}>{risk.severity}</Badge>
                          <Badge variant="outline">{risk.risk_type.replace('_', ' ')}</Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{risk.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                        
                        {risk.affected_item && (
                          <p className="text-sm mb-2">
                            <strong>Affected:</strong> {risk.affected_item}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mb-3">
                          <div className="text-red-500">
                            <span className="text-lg font-bold">{formatCurrency(risk.potential_cost_impact)}</span>
                            <span className="text-xs ml-1">potential loss</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-sm">
                            <AlertCircle className="w-4 h-4 inline mr-2 text-amber-500" />
                            <strong>Recommended:</strong> {risk.recommended_action}
                          </p>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button 
                          className="flex-1 gap-2"
                          onClick={() => resolveRiskAlert(risk.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Resolve
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2">
                          <Eye className="w-4 h-4" />
                          Investigate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                  <h3 className="font-semibold mb-2">No Active Risks</h3>
                  <p className="text-muted-foreground">All risks have been addressed.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4">
            {opportunities.length > 0 ? (
              opportunities.map((opp) => (
                <Card key={opp.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{opp.opportunity_type.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="capitalize">{opp.implementation_effort} effort</Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{opp.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>
                        
                        <div className="flex gap-4 mb-3">
                          {opp.projected_savings > 0 && (
                            <div className="text-emerald-500">
                              <span className="text-lg font-bold">{formatCurrency(opp.projected_savings)}</span>
                              <span className="text-xs ml-1">savings</span>
                            </div>
                          )}
                          {opp.projected_revenue_increase > 0 && (
                            <div className="text-blue-500">
                              <span className="text-lg font-bold">{formatCurrency(opp.projected_revenue_increase)}</span>
                              <span className="text-xs ml-1">revenue</span>
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-start gap-2">
                            <Brain className="w-4 h-4 text-primary mt-0.5" />
                            <p className="text-sm">{opp.ai_analysis}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <Button 
                          className="flex-1 gap-2"
                          onClick={() => implementOpportunity(opp.id)}
                          disabled={opp.status !== 'identified'}
                        >
                          <Play className="w-4 h-4" />
                          Implement
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2">
                          <Eye className="w-4 h-4" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Opportunities Found</h3>
                  <p className="text-muted-foreground">AI is analyzing your data for opportunities.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-4">
            {staffPerformance.length > 0 ? (
              staffPerformance.map((staff) => (
                <Card key={staff.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {staff.overall_value_score}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Staff Performance</h3>
                          {staff.badges?.map((badge, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {badge === 'Rising Talent' && <Star className="w-3 h-3 mr-1" />}
                              {badge === 'Master of Classic Ritual' && <Trophy className="w-3 h-3 mr-1" />}
                              {badge === 'Profit Driver' && <Crown className="w-3 h-3 mr-1" />}
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-lg font-bold">{formatCurrency(staff.revenue_contribution)}</p>
                            <p className="text-xs text-muted-foreground">Revenue Contribution</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{staff.sales_conversion_rate}%</p>
                            <p className="text-xs text-muted-foreground">Conversion Rate</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{staff.training_completion_percentage}%</p>
                            <p className="text-xs text-muted-foreground">Training Complete</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{staff.upselling_success_rate}%</p>
                            <p className="text-xs text-muted-foreground">Upselling Rate</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs font-medium text-emerald-500 mb-1">Strengths</p>
                            <div className="flex flex-wrap gap-1">
                              {staff.strengths?.map((s, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-orange-500 mb-1">Development Areas</p>
                            <div className="flex flex-wrap gap-1">
                              {staff.weaknesses?.map((w, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs text-orange-600 border-orange-200">
                                  {w}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {staff.ai_development_plan && (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="flex items-start gap-2">
                              <Brain className="w-4 h-4 text-primary mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-primary mb-1">AI Development Plan</p>
                                <p className="text-sm">{staff.ai_development_plan}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Staff Data</h3>
                  <p className="text-muted-foreground">Staff performance metrics will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
};

export default GMCommandDashboard;
