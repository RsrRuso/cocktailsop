import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, ChevronRight, Zap, DollarSign, Users, Package, 
  FileText, Shield, TrendingUp, AlertTriangle, Lightbulb, 
  Brain, Video, Wrench, BookOpen, Target, Award, Crown,
  BarChart3, PieChart, LineChart, Clock, CheckCircle2, XCircle,
  ArrowRight, Sparkles, Lock, Eye, Edit, Send, Download,
  Smartphone, Monitor, Database, Cpu, Layers, Settings,
  ChefHat, Wine, Thermometer, Calculator, ClipboardList,
  UserCheck, Star, Flame, Trophy, Gauge, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

interface FeatureSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  features: {
    name: string;
    description: string;
    howToUse: string[];
    outputs?: string[];
    tips?: string[];
  }[];
}

const GMCommandGuide = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>("overview");
  const [activeTab, setActiveTab] = useState("features");

  const accessLevels = [
    {
      role: "General Manager (GM)",
      icon: <Crown className="w-5 h-5" />,
      color: "bg-amber-500",
      permissions: [
        "Full dashboard visibility",
        "Approve/reject requests",
        "Unlock budgets",
        "View forecasts",
        "Download full report packets"
      ]
    },
    {
      role: "Bar Manager",
      icon: <Wine className="w-5 h-5" />,
      color: "bg-purple-500",
      permissions: [
        "Submit requests",
        "Input menu changes",
        "Upload invoices",
        "Confirm stock cost",
        "Create proposals"
      ]
    },
    {
      role: "Assistant Bar Manager",
      icon: <UserCheck className="w-5 h-5" />,
      color: "bg-blue-500",
      permissions: [
        "Execute assigned tasks",
        "Report service gaps",
        "Support daily SOP",
        "Upload operational logs"
      ]
    },
    {
      role: "Staff Level",
      icon: <Users className="w-5 h-5" />,
      color: "bg-green-500",
      permissions: [
        "Access personal training logs",
        "View internal leaderboard",
        "Track personal KPIs"
      ]
    }
  ];

  const featureSections: FeatureSection[] = [
    {
      id: "financial",
      title: "Real-Time Financial Command Panel",
      icon: <DollarSign className="w-5 h-5" />,
      color: "from-emerald-500 to-green-600",
      description: "Complete financial intelligence with AI-powered insights",
      features: [
        {
          name: "Revenue Insights Engine",
          description: "Track sales trends, category growth, and day-part performance with AI projections",
          howToUse: [
            "Navigate to Financial Panel from main dashboard",
            "Select date range using the period selector",
            "View trend graphs for cocktails, wines, spirits, and beer",
            "Click on any category to drill down into specific items",
            "Use 'Forecast' toggle to see AI predictions"
          ],
          outputs: [
            "Sales trend visualization",
            "Category growth percentages",
            "Day-part performance breakdown",
            "Period projections with confidence intervals"
          ],
          tips: [
            "Compare periods using the comparison tool",
            "Export data for external analysis",
            "Set up alerts for significant changes"
          ]
        },
        {
          name: "Profitability Intelligence",
          description: "AI calculates cost of goods, GP opportunities, and profit optimization",
          howToUse: [
            "Access Profitability tab within Financial Panel",
            "Review real-time GP percentages for each drink",
            "Click on flagged items (red indicators) for improvement suggestions",
            "Use 'Optimize' button to get AI recommendations",
            "Track garnish cost factors and dilution loss"
          ],
          outputs: [
            "Cost of goods per drink",
            "GP improvement opportunities",
            "Garnish cost analysis",
            "Dilution loss risk assessment",
            "Average profit per guest"
          ]
        }
      ]
    },
    {
      id: "inventory",
      title: "Inventory & Cost Automation Panel",
      icon: <Package className="w-5 h-5" />,
      color: "from-blue-500 to-indigo-600",
      description: "Smart inventory management with predictive analytics",
      features: [
        {
          name: "Variance Detection System",
          description: "Automatic detection of cost variances with root cause analysis",
          howToUse: [
            "Open Inventory Panel from main navigation",
            "Review variance alerts in the notification center",
            "Click on any alert to see detailed breakdown",
            "Use 'Investigate' to trace variance to specific transactions",
            "Mark resolved variances or escalate to management"
          ],
          outputs: [
            "Variance alerts with severity levels",
            "Root cause identification",
            "Historical variance trends",
            "Cost impact calculations"
          ]
        },
        {
          name: "AI-Reverse Menu Calculator™",
          description: "Transform expiring ingredients into profitable menu items",
          howToUse: [
            "Navigate to 'Smart Suggestions' within Inventory",
            "Select ingredient type from the list",
            "Enter expiration date or select 'Expiring Soon' filter",
            "Review AI-generated cocktail suggestions",
            "Click 'Apply' to add to menu with calculated GP"
          ],
          outputs: [
            "Zero-waste cocktail recipes",
            "Projected GP for each suggestion",
            "Ingredient utilization percentage",
            "Batch recommendations"
          ],
          tips: [
            "Run daily to minimize waste",
            "Share suggestions with bar team for execution",
            "Track success of implemented recipes"
          ]
        },
        {
          name: "Predictive Stock Management",
          description: "AI forecasts shortage dates and excess stock warnings",
          howToUse: [
            "Access 'Forecasting' tab in Inventory",
            "Review projected shortage calendar",
            "Set up automatic reorder triggers",
            "Monitor excess stock warnings",
            "Use 'Optimize Order' for smart purchasing"
          ]
        }
      ]
    },
    {
      id: "staff",
      title: "Staff Performance & Value Engine",
      icon: <Users className="w-5 h-5" />,
      color: "from-purple-500 to-pink-600",
      description: "Comprehensive staff analytics and development tracking",
      features: [
        {
          name: "Revenue Contribution Tracking",
          description: "Measure real revenue contribution per staff member",
          howToUse: [
            "Open Staff Performance from HR section",
            "View individual contribution scores",
            "Compare team members using ranking view",
            "Drill into specific metrics (sales, upselling, speed)",
            "Export performance reports for reviews"
          ],
          outputs: [
            "Real revenue contribution (AED)",
            "Sales conversion rate",
            "Guest impact rating",
            "Training completion percentage",
            "Upselling success rate"
          ]
        },
        {
          name: "AI Development Plans",
          description: "Personalized improvement recommendations for each staff member",
          howToUse: [
            "Select staff member from team list",
            "Click 'AI Analysis' button",
            "Review strength and weakness assessment",
            "Access personalized training recommendations",
            "Assign training modules and track progress"
          ],
          outputs: [
            "Skill gap analysis",
            "Personalized training path",
            "Projected improvement metrics",
            "Timeline to competency goals"
          ]
        },
        {
          name: "Gamified Value Score",
          description: "Achievement-based scoring system with badges and rankings",
          howToUse: [
            "View leaderboard from Staff Dashboard",
            "Check badge progress for each team member",
            "Award special recognition through the system",
            "Set up achievement goals and challenges"
          ],
          outputs: [
            "⭐ Rising Talent badges",
            "🔥 Master of Classic Ritual",
            "👑 Profit Driver recognition",
            "⚡ Fastest Execution awards"
          ]
        }
      ]
    },
    {
      id: "reports",
      title: "One-Click Meeting Packet™",
      icon: <FileText className="w-5 h-5" />,
      color: "from-orange-500 to-red-600",
      description: "Automated executive report generation",
      features: [
        {
          name: "Executive Report Generator",
          description: "Auto-generate comprehensive PDF reports with one click",
          howToUse: [
            "Navigate to Reports section",
            "Click 'Generate Meeting Packet'",
            "Select report period and departments to include",
            "Choose export format (PDF, PPT, Email, WhatsApp)",
            "Review preview and download or send"
          ],
          outputs: [
            "Revenue dashboard summary",
            "Cost dashboard analysis",
            "Inventory breakdown",
            "Menu performance metrics",
            "Staff ranking report",
            "Required decisions list",
            "Long-term forecast",
            "Action plan summary"
          ],
          tips: [
            "Schedule automatic weekly reports",
            "Customize report templates for different audiences",
            "Include YTD comparisons for context"
          ]
        },
        {
          name: "Multi-Format Export",
          description: "Export reports in PDF, PPT, Email, or WhatsApp formats",
          howToUse: [
            "Generate report using the wizard",
            "Select destination format",
            "For email: enter recipients and customize message",
            "For WhatsApp: generate shareable summary",
            "Track delivery and engagement"
          ]
        }
      ]
    },
    {
      id: "approvals",
      title: "Universal Approval Engine™",
      icon: <Shield className="w-5 h-5" />,
      color: "from-teal-500 to-cyan-600",
      description: "Streamlined approval workflows with ROI calculation",
      features: [
        {
          name: "Smart Approval Workflow",
          description: "AI-calculated ROI, payback time, and risk scoring for all requests",
          howToUse: [
            "Access Approvals from main dashboard",
            "Review pending requests with priority indicators",
            "Click on request to see AI analysis",
            "Review ROI calculation and risk assessment",
            "Approve, Reject, or Request Revision"
          ],
          outputs: [
            "ROI calculation",
            "Payback time estimate",
            "Risk score (Low/Medium/High)",
            "Priority level",
            "Auto-generated task assignments"
          ]
        },
        {
          name: "Approval Categories",
          description: "Manage equipment, staffing, supplier, and menu approvals",
          howToUse: [
            "Filter requests by category",
            "Set approval thresholds for auto-approval",
            "Delegate approval authority by category",
            "Track approval history and outcomes"
          ],
          outputs: [
            "Equipment purchase tracking",
            "Staff promotion workflow",
            "Supplier switching analysis",
            "Menu adjustment approvals",
            "Brand activation management",
            "Training program cost tracking"
          ]
        }
      ]
    },
    {
      id: "prediction",
      title: "Advanced Prediction System",
      icon: <Brain className="w-5 h-5" />,
      color: "from-violet-500 to-purple-600",
      description: "AI-powered forecasting and scenario analysis",
      features: [
        {
          name: "Sales Forecasting",
          description: "Predict future sales based on seasonality, events, and trends",
          howToUse: [
            "Open Prediction Center from Analytics",
            "Select forecast period (weekly/monthly/quarterly)",
            "Review base forecast with confidence intervals",
            "Add known events to refine predictions",
            "Export forecast for planning"
          ],
          outputs: [
            "Seasonal sales projections",
            "Event impact predictions",
            "Weather-adjusted forecasts",
            "Occupancy-based estimates"
          ]
        },
        {
          name: "Price Impact Simulator",
          description: "Model the effect of price changes before implementation",
          howToUse: [
            "Select item(s) to analyze",
            "Enter proposed price change",
            "Review AI prediction of volume impact",
            "Compare profit scenarios",
            "Run sensitivity analysis"
          ],
          outputs: [
            "Volume change prediction",
            "GP impact calculation",
            "Break-even analysis",
            "Competitor price comparison"
          ]
        },
        {
          name: "Supply Chain Prediction",
          description: "Early warning system for supply disruptions",
          howToUse: [
            "Monitor Supply Intelligence dashboard",
            "Review global shortage alerts",
            "Access substitute recommendations",
            "Plan ahead with alternative suppliers"
          ]
        }
      ]
    },
    {
      id: "risk",
      title: "Risk Radar Panel",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "from-red-500 to-rose-600",
      description: "Proactive risk identification and mitigation",
      features: [
        {
          name: "Risk Detection System",
          description: "Automatic flagging of operational and financial risks",
          howToUse: [
            "Access Risk Radar from main dashboard",
            "Review risk indicators by category",
            "Click on any risk for detailed analysis",
            "Assign mitigation actions",
            "Track risk resolution progress"
          ],
          outputs: [
            "Supplier dependency alerts",
            "Low shelf-life ingredient warnings",
            "Negative GP drink flagging",
            "Employee inconsistency detection",
            "Service speed risk identification"
          ]
        },
        {
          name: "Proactive Alerts",
          description: "Real-time notifications for emerging risks",
          howToUse: [
            "Configure alert thresholds",
            "Set notification preferences",
            "Enable push notifications for critical risks",
            "Review and acknowledge alerts"
          ]
        }
      ]
    },
    {
      id: "opportunity",
      title: "Opportunity Unlock System",
      icon: <Lightbulb className="w-5 h-5" />,
      color: "from-yellow-500 to-amber-600",
      description: "AI-identified growth and savings opportunities",
      features: [
        {
          name: "Cost Savings Finder",
          description: "Identify spirit brand swaps and efficiency improvements",
          howToUse: [
            "Open Opportunities from main menu",
            "Review categorized opportunities",
            "Click on opportunity for full analysis",
            "Compare current vs proposed costs",
            "Implement with one-click approval"
          ],
          outputs: [
            "Brand swap recommendations",
            "Monthly savings calculation",
            "Quality impact assessment",
            "Implementation timeline"
          ]
        },
        {
          name: "Revenue Growth Opportunities",
          description: "High-margin signature cocktails and upselling strategies",
          howToUse: [
            "Browse revenue opportunities",
            "Filter by implementation effort",
            "Review projected GP impact",
            "Access detailed execution plan"
          ],
          outputs: [
            "Signature cocktail suggestions",
            "Staff training recommendations",
            "Seasonal flight tasting ideas",
            "Check average improvement tactics"
          ]
        },
        {
          name: "Zero-Waste Conversions",
          description: "Transform waste into profitable products",
          howToUse: [
            "Monitor waste inventory",
            "Review conversion suggestions",
            "Access recipes and procedures",
            "Track conversion success"
          ]
        }
      ]
    },
    {
      id: "advanced",
      title: "Advanced Intelligence Modules",
      icon: <Sparkles className="w-5 h-5" />,
      color: "from-pink-500 to-rose-600",
      description: "Cutting-edge features for premium operations",
      features: [
        {
          name: "Taste DNA Tracking",
          description: "Track staff sensory mastery and specialization",
          howToUse: [
            "Access from Staff Advanced Analytics",
            "Review taste proficiency scores",
            "Identify specialization areas",
            "Plan targeted training"
          ],
          outputs: [
            "Sensory mastery scores",
            "Ingredient specialization map",
            "Beverage influence ratings",
            "Talent mapping visualization"
          ]
        },
        {
          name: "Operational Journal Camera",
          description: "AI-analyzed daily video recordings for quality control",
          howToUse: [
            "Enable camera recording in settings",
            "Review daily 5-minute summaries",
            "Check AI-flagged issues",
            "Track daily operational scores"
          ],
          outputs: [
            "Mistake identification",
            "Hygiene compliance score",
            "Ice/technique assessment",
            "Daily operational rating"
          ]
        },
        {
          name: "Real-Time Repair Logging",
          description: "Instant equipment issue reporting and tracking",
          howToUse: [
            "Press report button on any equipment issue",
            "System auto-files request",
            "Vendor automatically scheduled",
            "Track downtime cost impact"
          ]
        },
        {
          name: "AI-Batching Specialist",
          description: "Precise batching formulas with labeling automation",
          howToUse: [
            "Select cocktail for batching",
            "Enter batch size requirements",
            "Review AI-calculated formula",
            "Print batch labels with QR codes"
          ],
          outputs: [
            "Exact alcohol percentages",
            "Shelf life calculations",
            "Dilution specifications",
            "Storage loss factors",
            "Auto-generated labels"
          ]
        },
        {
          name: "Auto Menu Optimization",
          description: "AI-powered menu engineering recommendations",
          howToUse: [
            "Run menu analysis",
            "Review item classifications (Stars, Plowhorses, Puzzles, Dogs)",
            "Accept AI recommendations for remove/modify/push",
            "Track optimization results"
          ]
        }
      ]
    }
  ];

  const quickActions = [
    { label: "Generate Report", icon: <FileText className="w-4 h-4" />, action: "report" },
    { label: "View Approvals", icon: <CheckCircle2 className="w-4 h-4" />, action: "approvals" },
    { label: "Check Risks", icon: <AlertTriangle className="w-4 h-4" />, action: "risks" },
    { label: "Find Opportunities", icon: <Lightbulb className="w-4 h-4" />, action: "opportunities" }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="pt-16 px-4 max-w-6xl mx-auto">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Premium Enterprise Module</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
            GM-Command Intelligence Suite™
          </h1>
          
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            One-Click Beverage Leadership OS for Hospitality. The world's first AI-powered 
            leadership dashboard for complete bar operations intelligence.
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {quickActions.map((action, idx) => (
              <Button key={idx} variant="outline" size="sm" className="gap-2">
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto">
            <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
            <TabsTrigger value="access" className="text-xs">Access</TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs">Workflow</TabsTrigger>
            <TabsTrigger value="outputs" className="text-xs">Outputs</TabsTrigger>
          </TabsList>

          {/* Features Tab */}
          <TabsContent value="features" className="mt-6">
            <div className="space-y-4">
              {featureSections.map((section) => (
                <Card key={section.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${section.color} text-white`}>
                          {section.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        </div>
                      </div>
                      {expandedSection === section.id ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>

                  <AnimatePresence>
                    {expandedSection === section.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0">
                          <div className="space-y-6">
                            {section.features.map((feature, idx) => (
                              <div key={idx} className="border-l-2 border-primary/30 pl-4">
                                <h4 className="font-semibold text-base mb-2 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-primary" />
                                  {feature.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {feature.description}
                                </p>

                                {/* How to Use */}
                                <div className="mb-3">
                                  <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Target className="w-3 h-3" />
                                    How to Use
                                  </h5>
                                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                    {feature.howToUse.map((step, stepIdx) => (
                                      <li key={stepIdx}>{step}</li>
                                    ))}
                                  </ol>
                                </div>

                                {/* Outputs */}
                                {feature.outputs && (
                                  <div className="mb-3">
                                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                      <BarChart3 className="w-3 h-3" />
                                      Outputs
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {feature.outputs.map((output, outIdx) => (
                                        <Badge key={outIdx} variant="secondary" className="text-xs">
                                          {output}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Tips */}
                                {feature.tips && (
                                  <div className="bg-primary/5 rounded-lg p-3 mt-3">
                                    <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                      <Lightbulb className="w-3 h-3 text-amber-500" />
                                      Pro Tips
                                    </h5>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                      {feature.tips.map((tip, tipIdx) => (
                                        <li key={tipIdx}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Access Tab */}
          <TabsContent value="access" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {accessLevels.map((level, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${level.color} text-white`}>
                        {level.icon}
                      </div>
                      <CardTitle className="text-lg">{level.role}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Permissions
                    </h4>
                    <ul className="space-y-2">
                      {level.permissions.map((perm, permIdx) => (
                        <li key={permIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="mt-6">
            <div className="space-y-6">
              {/* Daily Workflow */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Daily Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: "Opening", tasks: ["Review overnight alerts", "Check inventory levels", "Confirm staff assignments"] },
                      { time: "Mid-Day", tasks: ["Process pending approvals", "Review real-time sales", "Address any variances"] },
                      { time: "Pre-Service", tasks: ["Final stock check", "Team briefing preparation", "Review special requests"] },
                      { time: "Service", tasks: ["Monitor live dashboards", "Handle urgent approvals", "Track performance metrics"] },
                      { time: "Closing", tasks: ["End-of-day reconciliation", "Generate daily report", "Set up tomorrow's priorities"] }
                    ].map((period, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="w-24 flex-shrink-0">
                          <Badge variant="outline">{period.time}</Badge>
                        </div>
                        <div className="flex-1">
                          <ul className="space-y-1">
                            {period.tasks.map((task, taskIdx) => (
                              <li key={taskIdx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ArrowRight className="w-3 h-3 text-primary" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Approval Flow */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Approval Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {[
                      { step: "Request Submitted", icon: <Send className="w-4 h-4" /> },
                      { step: "AI Analysis", icon: <Brain className="w-4 h-4" /> },
                      { step: "ROI Calculated", icon: <Calculator className="w-4 h-4" /> },
                      { step: "GM Review", icon: <Eye className="w-4 h-4" /> },
                      { step: "Decision", icon: <CheckCircle2 className="w-4 h-4" /> }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            {item.icon}
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">{item.step}</span>
                        </div>
                        {idx < 4 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Outputs Tab */}
          <TabsContent value="outputs" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "PDF Reports", icon: <FileText className="w-5 h-5" />, items: ["Executive Summary", "Financial Dashboard", "Inventory Analysis", "Staff Performance"] },
                { title: "Real-time Dashboards", icon: <Activity className="w-5 h-5" />, items: ["Live Sales", "Cost Tracking", "Risk Radar", "Opportunity Finder"] },
                { title: "AI Insights", icon: <Brain className="w-5 h-5" />, items: ["Predictions", "Recommendations", "Risk Alerts", "Optimization Tips"] },
                { title: "Approval Decisions", icon: <CheckCircle2 className="w-5 h-5" />, items: ["Equipment", "Staffing", "Menu Changes", "Budget Allocation"] },
                { title: "Performance Metrics", icon: <Gauge className="w-5 h-5" />, items: ["Staff Rankings", "GP Analysis", "Conversion Rates", "Training Progress"] },
                { title: "Export Formats", icon: <Download className="w-5 h-5" />, items: ["PDF", "PowerPoint", "Excel", "Email/WhatsApp"] }
              ].map((category, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {category.icon}
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {category.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* System Requirements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Integration Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Data Sources
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• POS integration</li>
                  <li>• Supplier invoices</li>
                  <li>• Stock counts</li>
                  <li>• Recipe database</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Platforms
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Mobile (iOS/Android)</li>
                  <li>• Web Dashboard</li>
                  <li>• Tablet Interface</li>
                  <li>• PWA Support</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  AI Features
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Predictive analytics</li>
                  <li>• Natural language reports</li>
                  <li>• Image recognition</li>
                  <li>• Voice commands</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission Statement */}
        <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
          <CardContent className="py-6 text-center">
            <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Mission Statement</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
              Build SpecVerse GM-Command — a real-time, one-click executive intelligence dashboard 
              that replaces spreadsheets, WhatsApp approvals, manual reports, physical audits, and 
              intuition-based decision making. The system automatically calculates costs, profit, 
              staffing value, operational risk, and opportunity forecasting, converting it into 
              actionable decisions, downloadable reports, approval flows, and predictive models.
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default GMCommandGuide;
