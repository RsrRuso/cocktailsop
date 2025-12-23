import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package, Users, Store, ArrowRightLeft, Upload, Camera, Scan, Key, Shield, QrCode, FileDown, ClipboardList, History, UserPlus, CheckCircle, AlertTriangle, Clock, Smartphone, Play, BookOpen } from "lucide-react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const FifoUserGuide = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<"admin" | "staff">("admin");

  const adminSteps = [
    {
      step: 1,
      title: "Create a FIFO Workspace",
      description: "Set up your inventory workspace for your team",
      icon: Package,
      details: [
        "Navigate to FIFO Workspace Management from your profile or tools",
        "Click 'Create Workspace' button",
        "Enter workspace name (e.g., 'Main Kitchen', 'Bar Storage')",
        "Add optional description for clarity",
        "Click 'Create' to finish"
      ],
      tips: "Create separate workspaces for different departments or locations"
    },
    {
      step: 2,
      title: "Add Team Members",
      description: "Invite staff to access the workspace",
      icon: UserPlus,
      details: [
        "Open your workspace card and click the person+ icon",
        "Search for team members from your followers/following",
        "Click 'Add' next to each person you want to invite",
        "They'll be added as workspace members automatically",
        "Alternatively, share the invite link for external users"
      ],
      tips: "Only add trusted team members who need inventory access"
    },
    {
      step: 3,
      title: "Set Up Member PINs",
      description: "Create 4-digit PINs for quick staff login",
      icon: Key,
      details: [
        "Click the key icon on your workspace card",
        "You'll see all workspace members listed",
        "Click 'Generate PIN' for each member",
        "Share the PIN securely with each staff member",
        "PINs can be regenerated if forgotten or compromised"
      ],
      tips: "PINs provide quick tablet/shared device access without full login"
    },
    {
      step: 4,
      title: "Create Stores/Locations",
      description: "Define where inventory is stored",
      icon: Store,
      details: [
        "Go to FIFO Manager → Stores tab",
        "Click 'Add Store' button",
        "Enter store name (e.g., 'Walk-in Cooler', 'Dry Storage')",
        "Select store type: Dry, Refrigerated, or Frozen",
        "Add location details if needed",
        "Save the store"
      ],
      tips: "Create stores based on physical storage areas for accurate tracking"
    },
    {
      step: 5,
      title: "Add Master Items",
      description: "Create your inventory item catalog",
      icon: ClipboardList,
      details: [
        "Go to FIFO Manager → Items tab",
        "Click 'Add Item' to create items one by one",
        "Or use 'Bulk Import' to paste multiple items at once",
        "Enter item name, brand, category, and optional barcode",
        "Items are color-coded by category automatically",
        "Save items to your master list"
      ],
      tips: "Build a comprehensive master list before receiving inventory"
    },
    {
      step: 6,
      title: "Approve Access Requests",
      description: "Manage who can join your workspace",
      icon: Shield,
      details: [
        "When someone scans your invite QR or uses invite link",
        "You'll see pending requests in the Approvals section",
        "Review each request showing user email and timestamp",
        "Click 'Approve' to grant access or 'Reject' to deny",
        "Approved users become workspace members automatically"
      ],
      tips: "Regularly check approvals to maintain workspace security"
    }
  ];

  const staffSteps = [
    {
      step: 1,
      title: "Access FIFO Manager",
      description: "Login using your 4-digit PIN",
      icon: Key,
      details: [
        "Navigate to FIFO PIN Access from your profile memberships",
        "Select your workspace from the dropdown",
        "Enter your 4-digit PIN on the number pad",
        "PIN auto-submits when all 4 digits are entered",
        "You'll see your name and workspace on success"
      ],
      tips: "Contact your manager if you forget your PIN"
    },
    {
      step: 2,
      title: "Receive Inventory",
      description: "Record incoming stock with FIFO dates",
      icon: Package,
      details: [
        "Go to Inventory tab after logging in",
        "Click 'Add Inventory' or use bulk upload",
        "Select the store/location receiving items",
        "Choose item from master list or add new",
        "Enter quantity and EXPIRATION DATE (critical!)",
        "Add batch number for traceability if available",
        "Save the inventory record"
      ],
      tips: "Always record expiration dates for proper FIFO rotation"
    },
    {
      step: 3,
      title: "Check FIFO Recommendations",
      description: "See what to use first based on expiry",
      icon: AlertTriangle,
      details: [
        "Select a store to view its FIFO recommendations",
        "Items are sorted by priority score (expiring soonest first)",
        "Color indicators show urgency:",
        "  🔴 Red = Expiring very soon, use immediately",
        "  🟡 Yellow = Expiring within days, use soon",
        "  🟢 Green = Safe, good shelf life remaining",
        "Always pick from the top of the list"
      ],
      tips: "Check recommendations at start of each shift"
    },
    {
      step: 4,
      title: "Transfer Between Stores",
      description: "Move items from one location to another",
      icon: ArrowRightLeft,
      details: [
        "Go to Transfers tab",
        "Select 'From Store' - where item is now",
        "Select 'To Store' - where item is going",
        "Choose the item to transfer",
        "Enter transfer quantity",
        "Add optional notes (reason for transfer)",
        "Confirm the transfer"
      ],
      tips: "Transfers maintain FIFO dates - expiry follows the item"
    },
    {
      step: 5,
      title: "Scan Barcodes",
      description: "Quick item lookup using camera",
      icon: Scan,
      details: [
        "Click the camera/scan icon in the toolbar",
        "Allow camera access when prompted",
        "Point camera at product barcode",
        "If item exists, details display automatically",
        "If new, you can add it to master items",
        "Use QR codes for transfers and receiving too"
      ],
      tips: "Good lighting improves scan accuracy"
    },
    {
      step: 6,
      title: "Use Photo AI for Expiry Dates",
      description: "Capture expiry dates using camera AI",
      icon: Camera,
      details: [
        "Click the photo/camera icon",
        "Take a photo of the product's expiry date label",
        "AI reads and extracts the date automatically",
        "Confirm the detected date is correct",
        "Date is auto-filled in the form",
        "Works with various date formats"
      ],
      tips: "Hold camera steady and ensure label is clearly visible"
    },
    {
      step: 7,
      title: "View Activity Log",
      description: "Track all inventory movements",
      icon: History,
      details: [
        "Access Activity Log from main menu",
        "See chronological list of all actions",
        "Filter by action type, store, or date",
        "Each entry shows: who, what, when, where",
        "Use for auditing and troubleshooting",
        "Export data as PDF for records"
      ],
      tips: "Review logs weekly to spot patterns"
    }
  ];

  const bulkUploadGuide = [
    {
      title: "Excel/CSV Upload",
      icon: Upload,
      steps: [
        "Prepare spreadsheet with columns: item_name, brand, category, quantity, expiration_date, store_name",
        "Save as .xlsx or .csv format",
        "Click 'Upload Excel' in FIFO Manager",
        "Select your file",
        "Review imported items",
        "Items are matched to existing master items or created new"
      ]
    },
    {
      title: "PDF/Image Upload",
      icon: FileDown,
      steps: [
        "Take photo of delivery note or invoice",
        "Click 'Bulk Upload' → Upload PDF/Image",
        "AI extracts item names and quantities",
        "Review and edit parsed items",
        "Set expiration dates for each item",
        "Select target store and save all"
      ]
    },
    {
      title: "PO Sync",
      icon: ArrowRightLeft,
      steps: [
        "Receive items against Purchase Orders",
        "Go to PO Sync panel",
        "Select pending PO items to import",
        "Set actual quantities received",
        "Add expiration dates",
        "Sync to FIFO inventory"
      ]
    }
  ];

  const qrAccessGuide = [
    {
      title: "Share Workspace Access",
      description: "Generate QR code for new members to scan",
      steps: [
        "Open your workspace card",
        "Click 'Share Invite' button",
        "Link is copied to clipboard",
        "Share link or create QR code from it",
        "New users scan and request access",
        "Approve pending requests in Approvals"
      ]
    },
    {
      title: "Generate Transfer QR",
      description: "Create QR for receiving store to scan",
      steps: [
        "In FIFO Manager, select items to transfer",
        "Click 'Generate Transfer QR'",
        "QR contains transfer details",
        "Receiving staff scans QR",
        "Transfer auto-populates on their end",
        "Confirm to complete transfer"
      ]
    }
  ];

  const currentSteps = activeRole === "admin" ? adminSteps : staffSteps;

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-4xl mx-auto px-4 py-6 pt-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-500/10 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">FIFO Inventory Guide</h1>
          <p className="text-muted-foreground">
            Complete step-by-step manual for First In, First Out inventory management
          </p>
        </div>

        {/* Role Selector */}
        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as "admin" | "staff")} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="w-4 h-4" />
              Manager/Admin
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="w-4 h-4" />
              Staff Member
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Quick Start Video Card */}
        <Card className="mb-8 border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-rose-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Quick Start Video</h3>
                <p className="text-sm text-muted-foreground">
                  Watch a 2-minute walkthrough of the FIFO system
                </p>
              </div>
              <Button variant="outline" size="sm">
                Watch Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step-by-Step Guide */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            {activeRole === "admin" ? "Admin Setup Guide" : "Staff Usage Guide"}
          </h2>
          
          {currentSteps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-rose-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Step {step.step}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ul className="space-y-2 text-sm pl-14">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                  {step.tips && (
                    <div className="mt-4 ml-14 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-medium">Pro Tip:</span> {step.tips}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bulk Upload Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5" />
            Bulk Upload Methods
          </h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            {bulkUploadGuide.map((method, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                    <method.icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <CardTitle className="text-base">{method.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1 text-xs text-muted-foreground">
                    {method.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-medium text-foreground">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* QR Access Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5" />
            QR Code Features
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            {qrAccessGuide.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-1 text-sm">
                    {item.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium">
                          {i + 1}
                        </div>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            Frequently Asked Questions
          </h2>
          
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="q1" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                What is FIFO and why is it important?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                FIFO (First In, First Out) ensures older inventory is used before newer stock, reducing waste and ensuring freshness. Items received first should be dispensed first based on their expiration dates.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="q2" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                How do I know which items to use first?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Check the FIFO Recommendations panel after selecting a store. Items are automatically sorted by priority - those expiring soonest appear at the top with color indicators showing urgency.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="q3" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                Can multiple people access the same workspace?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes! Admins can invite team members and assign individual 4-digit PINs. All members see the same inventory data in real-time. Changes by one user are instantly visible to all.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="q4" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                What happens when I transfer items between stores?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Transfers move inventory from one storage location to another while preserving all FIFO data including expiration dates and batch numbers. The activity is logged for full traceability.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="q5" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                How do I export reports?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Use the Export PDF button available in the inventory list, activity log, and access approvals. Reports include all visible data with timestamps and can be saved for compliance records.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="q6" className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                What if I forget my PIN?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Contact your workspace admin/manager. They can generate a new PIN for you from the workspace management panel. The old PIN will no longer work once a new one is issued.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Device Support */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Supported Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <p className="text-sm font-medium">Mobile</p>
                <p className="text-xs text-muted-foreground">iOS & Android</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm font-medium">Tablet</p>
                <p className="text-xs text-muted-foreground">iPad & Android</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl mb-2">💻</div>
                <p className="text-sm font-medium">Desktop</p>
                <p className="text-xs text-muted-foreground">Any browser</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl mb-2">📷</div>
                <p className="text-sm font-medium">Camera</p>
                <p className="text-xs text-muted-foreground">For scanning</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Need Help */}
        <Card className="border-rose-500/30">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-2">Need More Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contact your workspace admin or reach out to support
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/tools')}>
                Go to Tools
              </Button>
              <Button size="sm" onClick={() => navigate('/fifo-workspace-management')}>
                Manage Workspaces
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default FifoUserGuide;
