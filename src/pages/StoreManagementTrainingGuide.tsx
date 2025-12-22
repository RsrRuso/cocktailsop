import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { BackToProfileDoor } from "@/components/BackToProfileDoor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Store, ArrowRightLeft, ClipboardCheck, TrendingDown, 
  Users, Camera, Bell, Clock, Package, Upload, Download,
  CheckCircle2, AlertCircle, Shield, Lock, Smartphone, Play,
  BookOpen, Lightbulb, Target, Zap, Settings, FileText,
  ChevronRight, BarChart3, Eye, History, Trash2, Edit, Plus, X
} from "lucide-react";
import StoreManagementPromoVideoReel from "@/components/promo/StoreManagementPromoVideoReel";

const StoreManagementTrainingGuide = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");

  const features = [
    {
      id: "overview",
      icon: <Store className="w-5 h-5" />,
      title: "System Overview",
      color: "from-emerald-500 to-green-600"
    },
    {
      id: "stores",
      icon: <Package className="w-5 h-5" />,
      title: "Store Setup",
      color: "from-blue-500 to-indigo-600"
    },
    {
      id: "transfers",
      icon: <ArrowRightLeft className="w-5 h-5" />,
      title: "Transfers",
      color: "from-purple-500 to-violet-600"
    },
    {
      id: "receiving",
      icon: <Download className="w-5 h-5" />,
      title: "Receiving",
      color: "from-cyan-500 to-blue-600"
    },
    {
      id: "spot-check",
      icon: <ClipboardCheck className="w-5 h-5" />,
      title: "Spot Checks",
      color: "from-orange-500 to-amber-600"
    },
    {
      id: "variance",
      icon: <TrendingDown className="w-5 h-5" />,
      title: "Variance Reports",
      color: "from-red-500 to-rose-600"
    },
    {
      id: "pin-access",
      icon: <Lock className="w-5 h-5" />,
      title: "PIN Access",
      color: "from-pink-500 to-fuchsia-600"
    },
    {
      id: "team",
      icon: <Users className="w-5 h-5" />,
      title: "Team Management",
      color: "from-teal-500 to-emerald-600"
    }
  ];

  const guideContent = {
    overview: {
      title: "Store Management System Overview",
      description: "Complete inventory management solution for multi-store operations",
      content: [
        {
          subtitle: "What is Store Management?",
          text: "Store Management is a comprehensive inventory control system designed for hospitality businesses with multiple storage locations. It enables real-time tracking of stock levels, transfers between stores, receiving goods, and conducting physical audits."
        },
        {
          subtitle: "Key Benefits",
          list: [
            "Real-time inventory visibility across all locations",
            "Automated variance detection and alerts",
            "Secure PIN-based staff access for mobile devices",
            "Complete audit trail of all inventory movements",
            "Workspace-based team collaboration",
            "Low stock alerts and forecasting"
          ]
        },
        {
          subtitle: "Core Modules",
          list: [
            "Dashboard - Overview of all stores and activities",
            "Transfers - Move inventory between stores",
            "Receiving - Record incoming stock",
            "Spot Checks - Conduct physical inventory counts",
            "Variance Reports - Analyze discrepancies",
            "Team Management - Control staff permissions"
          ]
        }
      ]
    },
    stores: {
      title: "Store Setup & Configuration",
      description: "Create and manage your storage locations",
      content: [
        {
          subtitle: "Creating a New Store",
          steps: [
            "Navigate to Store Management from your profile",
            "Click the '+ Add Store' button",
            "Enter store name (e.g., 'Main Bar', 'Kitchen Storage')",
            "Select store type: Warehouse, Retail, or Storage",
            "Save the store - it will appear in your store list"
          ]
        },
        {
          subtitle: "Store Types Explained",
          list: [
            "WAREHOUSE (Receive) - Central receiving point, auto-syncs items to other stores",
            "RETAIL - Front-of-house locations like bars, restaurants",
            "STORAGE - Back-of-house storage areas like freezers, dry storage"
          ]
        },
        {
          subtitle: "Managing Stores",
          list: [
            "View all active stores in the dashboard",
            "Monitor low stock alerts per store",
            "Edit store details by clicking the edit icon",
            "Deactivate stores (soft delete) to maintain history"
          ]
        }
      ]
    },
    transfers: {
      title: "Inventory Transfers",
      description: "Move stock between your stores efficiently",
      content: [
        {
          subtitle: "Creating a Transfer",
          steps: [
            "Go to the 'Transfer' tab in Store Management",
            "Select the SOURCE store (where items are coming from)",
            "Select the DESTINATION store (where items are going)",
            "Choose the item to transfer from the dropdown",
            "Enter the quantity to transfer",
            "Add optional notes (e.g., 'For weekend event')",
            "Click 'Create Transfer' to complete"
          ]
        },
        {
          subtitle: "What Happens During Transfer",
          list: [
            "Source store quantity is automatically reduced",
            "Destination store quantity is automatically increased",
            "Transfer record is created with timestamp and user info",
            "Real-time notification is sent to relevant team members",
            "Activity is logged for audit purposes"
          ]
        },
        {
          subtitle: "Managing Transfers",
          list: [
            "View recent transfers in the transfer history",
            "Edit quantities if adjustments are needed",
            "Delete transfers if entered incorrectly",
            "Export transfer reports for accounting"
          ]
        }
      ]
    },
    receiving: {
      title: "Receiving Inventory",
      description: "Record incoming stock from suppliers",
      content: [
        {
          subtitle: "Recording a Receiving",
          steps: [
            "Navigate to the 'Receive' tab",
            "Select the store receiving the goods",
            "Choose the item being received",
            "Enter the quantity received",
            "Add notes (e.g., supplier name, invoice number)",
            "Click 'Record Receiving' to save"
          ]
        },
        {
          subtitle: "Auto-Sync Feature",
          text: "When receiving at a WAREHOUSE store, the system can automatically sync items to other retail/storage stores. This ensures all locations have visibility of new inventory."
        },
        {
          subtitle: "Best Practices",
          list: [
            "Always verify physical count before recording",
            "Include invoice numbers in notes for reference",
            "Receive at your central warehouse for auto-distribution",
            "Check expiration dates and record accordingly",
            "Review receiving history regularly for accuracy"
          ]
        }
      ]
    },
    "spot-check": {
      title: "Spot Check (Physical Inventory)",
      description: "Conduct physical counts to verify system accuracy",
      content: [
        {
          subtitle: "Starting a Spot Check",
          steps: [
            "Go to the 'Spot Check' tab",
            "Click 'Start Spot Check'",
            "Select the store to check",
            "Click 'Load Items' to populate the item list",
            "Enter physical counts for each item",
            "Submit when all counts are entered"
          ]
        },
        {
          subtitle: "During the Spot Check",
          list: [
            "System shows expected quantity from records",
            "Enter actual physical count in the input field",
            "Leave items blank if not checking them",
            "Variances are calculated automatically",
            "Comments can be added for discrepancies"
          ]
        },
        {
          subtitle: "After Submission",
          list: [
            "System inventory is updated to match physical count",
            "Variance report is auto-generated",
            "Activity log records all adjustments",
            "Significant variances trigger alerts",
            "Historical spot checks can be reviewed anytime"
          ]
        }
      ]
    },
    variance: {
      title: "Variance Reports & Analysis",
      description: "Track and investigate inventory discrepancies",
      content: [
        {
          subtitle: "Understanding Variance",
          text: "Variance is the difference between system inventory (expected) and physical inventory (actual). Positive variance means more physical stock than recorded; negative means less."
        },
        {
          subtitle: "Variance Calculation",
          list: [
            "Variance = Actual Count - Expected Count",
            "Variance % = (Variance / Expected) × 100",
            "Acceptable variance is typically under 2%",
            "High variance items require investigation"
          ]
        },
        {
          subtitle: "Common Causes of Variance",
          list: [
            "Recording errors during receiving or transfers",
            "Theft or pilferage",
            "Spoilage or breakage not recorded",
            "Incorrect portion sizes in usage",
            "Timing differences in data entry"
          ]
        },
        {
          subtitle: "Investigating Variances",
          steps: [
            "Review the variance report details",
            "Check activity log for recent movements",
            "Interview staff who handled the item",
            "Look for patterns across multiple items",
            "Document findings and take corrective action"
          ]
        }
      ]
    },
    "pin-access": {
      title: "PIN-Based Staff Access",
      description: "Secure mobile access for store staff",
      content: [
        {
          subtitle: "What is PIN Access?",
          text: "PIN Access allows staff to log into the Store Management system using a 4-digit PIN instead of full account credentials. Perfect for shared devices at point-of-sale or warehouse locations."
        },
        {
          subtitle: "Setting Up Staff PINs",
          steps: [
            "Go to Team Management in your workspace",
            "Invite a new member or select existing member",
            "Click 'Set PIN' to assign a 4-digit code",
            "Share the PIN securely with the staff member",
            "Staff can now access via /store-management-pin-access"
          ]
        },
        {
          subtitle: "Staff PIN Access Flow",
          steps: [
            "Staff navigates to PIN Access page",
            "Selects their workspace from dropdown",
            "Enters their 4-digit PIN on numeric keypad",
            "System verifies and logs them in",
            "Staff can access Inventory or Activity Log",
            "Session ends when they log out"
          ]
        },
        {
          subtitle: "Security Best Practices",
          list: [
            "Use unique PINs for each staff member",
            "Change PINs regularly (monthly recommended)",
            "Never share PINs between staff",
            "Deactivate PINs when staff leave",
            "Monitor PIN usage in activity logs"
          ]
        }
      ]
    },
    team: {
      title: "Team & Permission Management",
      description: "Control who can do what in your workspace",
      content: [
        {
          subtitle: "Workspace Roles",
          list: [
            "Owner - Full access to all features and settings",
            "Admin - Can manage inventory, stores, and members",
            "Member - Can perform inventory operations",
            "Viewer - Read-only access to reports"
          ]
        },
        {
          subtitle: "Permission Types",
          list: [
            "can_receive - Allow recording incoming stock",
            "can_transfer - Allow moving stock between stores",
            "can_spot_check - Allow conducting physical counts",
            "can_manage_items - Allow creating/editing items",
            "can_manage_stores - Allow creating/editing stores"
          ]
        },
        {
          subtitle: "Inviting Team Members",
          steps: [
            "Navigate to Team tab in Store Management",
            "Click 'Invite Member' button",
            "Enter member's email address",
            "Select their role and permissions",
            "Send invitation - they'll receive an email",
            "Member accepts and gains access to workspace"
          ]
        },
        {
          subtitle: "Managing Permissions",
          list: [
            "Click the settings icon next to any member",
            "Toggle individual permissions on/off",
            "Update role if responsibilities change",
            "Remove members who no longer need access"
          ]
        }
      ]
    }
  };

  const currentContent = guideContent[activeSection as keyof typeof guideContent];

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <BackToProfileDoor />
      
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/store-management")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Store Management Training</h1>
            <p className="text-muted-foreground">Complete guide & functional training</p>
          </div>
          <Button 
            variant="outline"
            onClick={() => navigate("/store-management")}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Go to System
          </Button>
        </motion.div>

        {/* Promo Video Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle>Watch the Promo Video</CardTitle>
                  <CardDescription>Step-by-step feature walkthrough</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <StoreManagementPromoVideoReel />
            </CardContent>
          </Card>
        </motion.div>

        {/* Training Content */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Training Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {features.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => setActiveSection(feature.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        activeSection === feature.id
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shrink-0`}>
                        {feature.icon}
                      </div>
                      <span className="text-sm font-medium">{feature.title}</span>
                      {activeSection === feature.id && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                    features.find(f => f.id === activeSection)?.color
                  } flex items-center justify-center text-white`}>
                    {features.find(f => f.id === activeSection)?.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{currentContent.title}</CardTitle>
                    <CardDescription>{currentContent.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-8">
                    {currentContent.content.map((section, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="space-y-4"
                      >
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {section.subtitle}
                        </h3>
                        
                        {section.text && (
                          <p className="text-muted-foreground leading-relaxed">
                            {section.text}
                          </p>
                        )}
                        
                        {section.list && (
                          <ul className="space-y-2">
                            {section.list.map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {section.steps && (
                          <ol className="space-y-3">
                            {section.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <Badge variant="outline" className="shrink-0 w-7 h-7 rounded-full p-0 flex items-center justify-center bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                  {i + 1}
                                </Badge>
                                <span className="text-muted-foreground pt-0.5">{step}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Pro Tips for Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Daily Routine
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start each day by reviewing overnight transfers and low stock alerts.
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="w-4 h-4 text-green-500" />
                    Weekly Goals
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Conduct at least one spot check per store each week to catch variances early.
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Monthly Analysis
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Review variance trends monthly to identify systemic issues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default StoreManagementTrainingGuide;
