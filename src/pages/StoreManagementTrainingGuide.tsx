import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { BackToProfileDoor } from "@/components/BackToProfileDoor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, Store, ArrowRightLeft, ClipboardCheck, TrendingDown, 
  Users, Bell, Clock, Package, Download,
  CheckCircle2, AlertCircle, Shield, Lock, Smartphone, Play,
  BookOpen, Lightbulb, Target, Zap, Settings, FileText,
  ChevronRight, BarChart3, Eye, History, Trash2, Edit, Plus, 
  AlertTriangle, Workflow, Database, RefreshCw, Search, Filter,
  Upload, Camera, QrCode, Fingerprint, Key, UserPlus, UserMinus,
  Building2, Warehouse, ShoppingBag, Thermometer, MapPin, Layers,
  ArrowDownToLine, ArrowUpFromLine, Scale, Calculator, Percent,
  CircleDot, ListChecks, ClipboardList, FileSpreadsheet, PieChart,
  TrendingUp, Activity, Timer, Calendar, Moon, Sun
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
      id: "items",
      icon: <Layers className="w-5 h-5" />,
      title: "Items & Products",
      color: "from-violet-500 to-purple-600"
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
      id: "activity-log",
      icon: <History className="w-5 h-5" />,
      title: "Activity Logging",
      color: "from-slate-500 to-gray-600"
    },
    {
      id: "alerts",
      icon: <Bell className="w-5 h-5" />,
      title: "Alerts & Notifications",
      color: "from-amber-500 to-orange-600"
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
    },
    {
      id: "reports",
      icon: <FileText className="w-5 h-5" />,
      title: "Reports & Export",
      color: "from-indigo-500 to-blue-600"
    },
    {
      id: "best-practices",
      icon: <Lightbulb className="w-5 h-5" />,
      title: "Best Practices",
      color: "from-yellow-500 to-amber-600"
    }
  ];

  const guideContent: Record<string, {
    title: string;
    description: string;
    content: Array<{
      subtitle: string;
      text?: string;
      list?: string[];
      steps?: string[];
      tips?: string[];
      warnings?: string[];
    }>;
  }> = {
    overview: {
      title: "Store Management System Overview",
      description: "Complete inventory management solution for multi-store operations",
      content: [
        {
          subtitle: "What is Store Management?",
          text: "Store Management is a comprehensive inventory control system designed for hospitality businesses with multiple storage locations. It enables real-time tracking of stock levels, transfers between stores, receiving goods, and conducting physical audits. The system provides complete visibility into your inventory across all locations, helping reduce waste, prevent stockouts, and improve operational efficiency."
        },
        {
          subtitle: "Who Should Use This System?",
          list: [
            "Bar Managers - Track spirits, mixers, and bar supplies across multiple bars",
            "Kitchen Managers - Monitor food inventory, ingredients, and consumables",
            "Operations Managers - Oversee all storage locations and team activities",
            "Warehouse Staff - Record receiving and manage central storage",
            "General Managers - Access reports and monitor overall inventory health",
            "Purchasing Teams - Use data for ordering decisions"
          ]
        },
        {
          subtitle: "Key Benefits",
          list: [
            "Real-time inventory visibility across all locations",
            "Automated variance detection and alerts for discrepancies",
            "Secure PIN-based staff access for mobile devices",
            "Complete audit trail of all inventory movements",
            "Workspace-based team collaboration with permission controls",
            "Low stock alerts and threshold monitoring",
            "Transfer tracking between stores with full history",
            "Spot check functionality for physical inventory audits",
            "Export capabilities for reports and compliance"
          ]
        },
        {
          subtitle: "Core Modules",
          list: [
            "Dashboard - Overview of all stores, activities, and alerts at a glance",
            "Stores - Create and manage storage locations (bars, kitchens, warehouses)",
            "Items - Master list of products tracked across all stores",
            "Transfers - Move inventory between stores with automatic adjustments",
            "Receiving - Record incoming stock from suppliers",
            "Spot Checks - Conduct physical inventory counts and audits",
            "Variance Reports - Analyze discrepancies between expected and actual",
            "Activity Log - Complete history of all inventory movements",
            "Team Management - Control staff permissions and access"
          ]
        },
        {
          subtitle: "System Architecture",
          list: [
            "Workspace-Based: All data is organized within workspaces for team isolation",
            "Real-Time Sync: Changes are reflected immediately across all connected devices",
            "Cloud Storage: All data is securely stored and backed up automatically",
            "Mobile Optimized: Full functionality on phones and tablets",
            "Offline Capable: Basic operations work without internet connection"
          ]
        }
      ]
    },
    stores: {
      title: "Store Setup & Configuration",
      description: "Create and manage your storage locations",
      content: [
        {
          subtitle: "Understanding Store Types",
          text: "Stores represent physical storage locations in your operation. Each store type has specific behaviors that optimize workflow:",
          list: [
            "WAREHOUSE (Receive Type) - Central receiving point for new inventory. When you receive items here, they can auto-sync to other stores, making items available across your operation.",
            "RETAIL - Front-of-house locations like bars, restaurants, or service areas. These are where products are consumed or sold.",
            "STORAGE - Back-of-house areas like walk-in coolers, dry storage, freezers. Used for holding inventory before distribution.",
            "KITCHEN - Specialized for food preparation areas with ingredient tracking.",
            "BAR - Specialized for beverage service with spirit and mixer tracking."
          ]
        },
        {
          subtitle: "Creating a New Store",
          steps: [
            "Navigate to Store Management from your profile or tools menu",
            "Click the '+ Add Store' button in the stores section",
            "Enter a descriptive store name (e.g., 'Main Bar', 'Kitchen Walk-In', 'Dry Storage Room A')",
            "Select the appropriate store type from the dropdown",
            "Click 'Create Store' to save",
            "Your new store will appear in the store list and be ready for inventory"
          ]
        },
        {
          subtitle: "Store Naming Best Practices",
          tips: [
            "Use clear, descriptive names that staff can easily identify",
            "Include location details for multiple similar stores (e.g., 'Bar - Ground Floor', 'Bar - Rooftop')",
            "Avoid abbreviations that new staff might not understand",
            "Keep names consistent across your operation",
            "Consider including capacity or temperature info if relevant (e.g., 'Walk-In Freezer -18°C')"
          ]
        },
        {
          subtitle: "Managing Existing Stores",
          list: [
            "View all active stores in the dashboard with their current status",
            "Click on any store to see its inventory details",
            "Monitor low stock alerts displayed per store",
            "Edit store details by clicking the edit icon",
            "Deactivate stores (soft delete) when no longer in use - this maintains history",
            "Reactivate stores if needed by accessing deactivated stores list"
          ]
        },
        {
          subtitle: "Auto-Sync Feature (Warehouse)",
          text: "When you designate a store as 'WAREHOUSE' or 'Receive' type, special auto-sync behavior is enabled:",
          list: [
            "New items received at warehouse are automatically created in other stores",
            "This ensures all locations have visibility of available inventory",
            "Quantities from receiving are propagated to connected stores",
            "Saves time by eliminating manual item creation across multiple stores",
            "Can be configured per workspace in advanced settings"
          ],
          warnings: [
            "Auto-sync creates items with the same quantity - adjust as needed for actual distribution",
            "Only works for NEW items, not existing inventory updates"
          ]
        }
      ]
    },
    items: {
      title: "Items & Product Management",
      description: "Master your product catalog and item tracking",
      content: [
        {
          subtitle: "What are Items?",
          text: "Items represent the products you track in your inventory. Each item is a unique product with its own identity, and inventory records track how many of each item exists at each store."
        },
        {
          subtitle: "Creating New Items",
          steps: [
            "Go to the Items tab in Store Management",
            "Click 'Add Item' or the plus button",
            "Enter the item name (be specific - 'Grey Goose Vodka 1L' not just 'Vodka')",
            "Add brand information if applicable",
            "Upload a photo for easy visual identification",
            "Set a color code for quick visual grouping",
            "Add any notes or specifications",
            "Save the item - it's now available for inventory tracking"
          ]
        },
        {
          subtitle: "Item Information Best Practices",
          list: [
            "Name: Include size/volume in the name (e.g., 'Coca-Cola 330ml Can')",
            "Brand: Always capture brand for accurate ordering",
            "Photo: Use clear photos for visual stock verification",
            "Color Code: Use consistent colors for categories (red=spirits, blue=beer, etc.)",
            "Notes: Include supplier info, par levels, or special handling instructions"
          ]
        },
        {
          subtitle: "Item Categories",
          text: "While formal categories are optional, consider organizing items mentally or via naming conventions:",
          list: [
            "Spirits - Vodka, Gin, Rum, Whiskey, Tequila, etc.",
            "Beer - Bottles, Cans, Draft supplies",
            "Wine - Red, White, Sparkling, by region",
            "Mixers - Sodas, Juices, Tonic, Syrups",
            "Food - Proteins, Produce, Dairy, Dry goods",
            "Supplies - Napkins, Straws, Cleaning products"
          ]
        },
        {
          subtitle: "Managing Items",
          list: [
            "Search items by name using the search bar",
            "Filter by category or brand for easier navigation",
            "Edit item details anytime without affecting inventory records",
            "View item history across all stores",
            "Deactivate items no longer in use (maintains history)",
            "Merge duplicate items if created by mistake"
          ]
        }
      ]
    },
    transfers: {
      title: "Inventory Transfers",
      description: "Move stock between your stores efficiently",
      content: [
        {
          subtitle: "What is a Transfer?",
          text: "A transfer moves inventory from one store to another. This is used when redistributing stock, restocking service areas from storage, or balancing inventory across locations. Transfers automatically adjust quantities at both the source and destination."
        },
        {
          subtitle: "Creating a Transfer - Step by Step",
          steps: [
            "Go to the 'Transfer' tab in Store Management",
            "Select the SOURCE store (where items are coming FROM)",
            "Select the DESTINATION store (where items are going TO)",
            "Choose the item to transfer from the dropdown",
            "The system shows available quantity at the source store",
            "Enter the quantity to transfer (cannot exceed available)",
            "Add optional notes (e.g., 'For weekend event', 'Restocking for dinner service')",
            "Click 'Create Transfer' to complete the operation"
          ]
        },
        {
          subtitle: "What Happens During Transfer",
          list: [
            "Source store quantity is automatically REDUCED by transfer amount",
            "Destination store quantity is automatically INCREASED by transfer amount",
            "If item doesn't exist at destination, a new inventory record is created",
            "Transfer record is created with timestamp, user, and all details",
            "Activity is logged for complete audit trail",
            "Real-time notifications sent to relevant team members",
            "Dashboard updates to reflect new quantities immediately"
          ]
        },
        {
          subtitle: "Transfer Validation Rules",
          list: [
            "Cannot transfer to the same store (source and destination must differ)",
            "Cannot transfer more than available quantity at source",
            "Quantity must be greater than zero",
            "User must have transfer permission for the workspace",
            "Both stores must be active (not deactivated)"
          ],
          warnings: [
            "Transfers are completed immediately - there is no 'pending' state",
            "If you make a mistake, you can delete the transfer and it will reverse",
            "Large quantity transfers should be verified before submission"
          ]
        },
        {
          subtitle: "Managing Transfers",
          list: [
            "View recent transfers in the transfer history section",
            "See who made the transfer and when",
            "Edit transfer quantities if adjustments are needed",
            "Delete transfers if entered incorrectly (reverses the quantity changes)",
            "Export transfer history for accounting or audits",
            "Filter transfers by date, store, or item"
          ]
        },
        {
          subtitle: "Common Transfer Scenarios",
          list: [
            "Morning Prep: Transfer ingredients from walk-in to kitchen line",
            "Bar Restock: Move bottles from storage to service bar",
            "Event Setup: Transfer supplies to event location",
            "End of Day: Return unused items to secure storage",
            "Seasonal: Redistribute slow-moving items between locations"
          ]
        }
      ]
    },
    receiving: {
      title: "Receiving Inventory",
      description: "Record incoming stock from suppliers",
      content: [
        {
          subtitle: "What is Receiving?",
          text: "Receiving is the process of recording inventory that arrives from external sources - typically supplier deliveries. Accurate receiving ensures your system quantities match physical inventory from the moment goods arrive."
        },
        {
          subtitle: "Recording a Receiving - Step by Step",
          steps: [
            "Navigate to the 'Receive' tab in Store Management",
            "Select the store receiving the goods (typically your warehouse)",
            "Choose the item being received from the dropdown",
            "Enter the quantity received (verify against invoice/packing slip)",
            "Add notes including: supplier name, invoice number, batch/lot numbers",
            "Click 'Record Receiving' to save",
            "System updates inventory and logs the activity"
          ]
        },
        {
          subtitle: "What Happens During Receiving",
          list: [
            "If item already exists at store: quantity is ADDED to existing amount",
            "If item is new to store: new inventory record is created",
            "Activity log records: who received, when, quantity, and notes",
            "If receiving at WAREHOUSE: auto-sync may distribute to other stores",
            "Dashboard updates to reflect new inventory levels",
            "Low stock alerts may be cleared if item was previously low"
          ]
        },
        {
          subtitle: "Best Practices for Receiving",
          tips: [
            "Always receive at your designated receiving location (warehouse)",
            "Verify physical count before entering into system",
            "Include invoice/PO number in notes for easy reference",
            "Check expiration dates and record if tracking expiry",
            "Note any damaged items or short shipments separately",
            "Receive items as they arrive, don't batch for later entry",
            "Take photos of delivery documentation when useful"
          ]
        },
        {
          subtitle: "Auto-Sync Distribution (Warehouse Feature)",
          text: "When receiving at a WAREHOUSE-type store, the system can auto-distribute to connected stores:",
          list: [
            "New items received will appear at all other active stores",
            "Quantities are synced (adjust as needed for actual distribution)",
            "Saves time on multi-store item setup",
            "Notes indicate '(Auto-synced from WAREHOUSE)' for clarity"
          ],
          warnings: [
            "Auto-sync happens immediately on receiving",
            "Review other stores if you need to adjust synced quantities",
            "Only applies to new items, not quantity updates to existing items"
          ]
        },
        {
          subtitle: "Receiving History",
          list: [
            "View all receiving records in the activity log",
            "Filter by store, item, or date range",
            "Edit receiving entries if corrections are needed",
            "Export receiving history for supplier reconciliation"
          ]
        }
      ]
    },
    "spot-check": {
      title: "Spot Check (Physical Inventory)",
      description: "Conduct physical counts to verify system accuracy",
      content: [
        {
          subtitle: "What is a Spot Check?",
          text: "A spot check is a physical inventory count that verifies actual stock matches system records. Regular spot checks catch discrepancies early, identify theft or waste, and ensure accurate data for ordering and reporting."
        },
        {
          subtitle: "When to Conduct Spot Checks",
          list: [
            "Scheduled: Weekly for high-value items, monthly for all items",
            "High-Risk Areas: More frequently for bars and open storage",
            "After Events: Following large events or unusual activity",
            "Shift Changes: When responsibility transfers between staff",
            "Random: Unannounced checks deter theft and keep staff accountable",
            "Variance Follow-up: After significant discrepancies are detected"
          ]
        },
        {
          subtitle: "Starting a Spot Check - Step by Step",
          steps: [
            "Go to the 'Spot Check' tab in Store Management",
            "Click 'Start Spot Check' button",
            "Select the store you want to audit",
            "Click 'Load Items' to populate the item list",
            "System displays all items at that store with expected quantities",
            "Physically count each item and enter the ACTUAL quantity",
            "Leave items blank if not counting them in this session",
            "Add notes for any discrepancies observed",
            "Click 'Submit Spot Check' when complete"
          ]
        },
        {
          subtitle: "During the Count",
          tips: [
            "Count systematically - work left to right, top to bottom",
            "Don't look at expected quantity until after counting",
            "Use a partner for high-value items (one counts, one records)",
            "Handle opened/partial items consistently",
            "Note condition issues even if quantity is correct",
            "Count in the same units as the system (bottles, cases, etc.)"
          ]
        },
        {
          subtitle: "What Happens on Submission",
          list: [
            "System calculates variance for each counted item",
            "Inventory quantities are UPDATED to match physical counts",
            "Variance report is auto-generated with all details",
            "Activity log records each adjustment made",
            "Significant variances (typically >5%) trigger alerts",
            "Historical spot checks are saved for trend analysis"
          ],
          warnings: [
            "Submission updates inventory - ensure counts are accurate",
            "Once submitted, changes require manual correction",
            "Large variances should be investigated before adjustment"
          ]
        },
        {
          subtitle: "Partial vs Full Spot Checks",
          list: [
            "Partial: Count only selected items (e.g., spirits only). Leave others blank.",
            "Full: Count every item at the location for complete reconciliation.",
            "Cycle Counting: Count a portion of items regularly so all are counted over time.",
            "ABC Analysis: Count high-value (A) items more often than low-value (C) items."
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
          text: "Variance is the difference between system inventory (expected) and physical inventory (actual). Positive variance means more physical stock than recorded; negative variance means less than expected. Both require investigation."
        },
        {
          subtitle: "Variance Calculation",
          list: [
            "Variance = Actual Count - Expected Count",
            "Variance % = (Variance / Expected) × 100",
            "Example: Expected 20, Actual 18 → Variance = -2 (-10%)",
            "Acceptable variance is typically under 2% for most items",
            "High-value items should have near-zero variance"
          ]
        },
        {
          subtitle: "Types of Variance",
          list: [
            "Positive Variance: More stock than recorded. Could be: unrecorded receiving, returns, counting errors in previous checks.",
            "Negative Variance: Less stock than recorded. Could be: theft, waste, spillage, breakage, unrecorded transfers, counting errors.",
            "Zero Variance: System matches physical. This is the goal!",
            "Pattern Variance: Consistent variance on specific items or at specific locations over time."
          ]
        },
        {
          subtitle: "Common Causes of Variance",
          list: [
            "Recording Errors: Incorrect quantities entered during receiving or transfers",
            "Timing Differences: Transactions recorded before/after physical movement",
            "Theft/Pilferage: Unauthorized removal of inventory",
            "Spoilage/Breakage: Products damaged but not recorded as waste",
            "Free Pours/Overpouring: Bar staff not following recipe specs",
            "Miscounting: Errors during physical inventory counts",
            "Returns Not Recorded: Products returned to storage without logging",
            "Recipe Changes: Production using different quantities than recorded"
          ]
        },
        {
          subtitle: "Investigating Variances - Step by Step",
          steps: [
            "Review the variance report for items with significant discrepancies",
            "Check the activity log for recent movements of that item",
            "Look for patterns - same item? Same store? Same shift?",
            "Interview staff who handled the item recently",
            "Check for physical evidence (breakage, spoilage, empty containers)",
            "Review security footage if available for high-value items",
            "Document your findings and conclusions",
            "Take corrective action (re-training, process changes, security measures)"
          ]
        },
        {
          subtitle: "Variance Thresholds & Actions",
          list: [
            "0-2%: Acceptable for most items. Monitor but no immediate action.",
            "2-5%: Investigation recommended. May indicate process issues.",
            "5-10%: Serious concern. Requires immediate investigation and action.",
            ">10%: Critical. Stop operations if needed. Escalate to management."
          ]
        },
        {
          subtitle: "Reducing Variance Over Time",
          tips: [
            "Conduct regular spot checks to catch issues early",
            "Train staff on proper receiving and transfer procedures",
            "Use par levels and automatic reorder points",
            "Implement security measures for high-value items",
            "Track variance trends to identify recurring issues",
            "Reward accuracy and address problems consistently"
          ]
        }
      ]
    },
    "activity-log": {
      title: "Activity Logging & Audit Trail",
      description: "Complete history of all inventory movements",
      content: [
        {
          subtitle: "What is the Activity Log?",
          text: "The activity log is a complete, unalterable record of every inventory action in the system. It provides accountability, enables investigation, and supports compliance requirements."
        },
        {
          subtitle: "What Gets Logged",
          list: [
            "Receiving: Item, quantity, store, user, timestamp, notes",
            "Transfers: From/to stores, item, quantity, user, timestamp",
            "Spot Check Adjustments: Item, before/after quantities, variance",
            "Manual Adjustments: Any corrections with reason documented",
            "User Actions: Login, logout, permission changes",
            "System Events: Auto-sync, alerts triggered, reports generated"
          ]
        },
        {
          subtitle: "Using the Activity Log",
          steps: [
            "Navigate to Activity or History section",
            "Use filters to narrow down records (date, user, store, item, action type)",
            "Click on any entry to see full details",
            "Export filtered results for reporting",
            "Use for investigation when discrepancies are found"
          ]
        },
        {
          subtitle: "Activity Log for Investigations",
          list: [
            "Filter by item to see all movements of a specific product",
            "Filter by store to see all activity at a location",
            "Filter by user to review an individual's actions",
            "Filter by date/time to reconstruct what happened during a period",
            "Compare activity against variance reports to identify causes"
          ]
        },
        {
          subtitle: "Compliance & Auditing",
          text: "The activity log supports various compliance requirements:",
          list: [
            "Internal Audits: Provide complete transaction history on demand",
            "Regulatory Compliance: Demonstrate proper inventory controls",
            "Insurance Claims: Document inventory levels at specific points in time",
            "Financial Reporting: Support cost of goods sold calculations",
            "Investigation Support: Provide evidence for theft or fraud cases"
          ]
        }
      ]
    },
    alerts: {
      title: "Alerts & Notifications",
      description: "Stay informed about critical inventory events",
      content: [
        {
          subtitle: "Types of Alerts",
          list: [
            "Low Stock Alert: Item quantity falls below threshold",
            "High Variance Alert: Spot check reveals significant discrepancy",
            "Transfer Notification: Items moved to/from your stores",
            "Receiving Confirmation: New inventory recorded",
            "Expiration Warning: Items approaching expiry date",
            "Spot Check Due: Scheduled audit reminder"
          ]
        },
        {
          subtitle: "Low Stock Detection",
          text: "The system monitors inventory levels and alerts when items are running low:",
          list: [
            "Automatically calculates average quantity across stores",
            "Flags items below 50% of average as 'low stock'",
            "Displays count of low stock items per store on dashboard",
            "Click to see which specific items need attention"
          ]
        },
        {
          subtitle: "Alert Visibility",
          list: [
            "Dashboard badges show counts for each alert type",
            "Push notifications for critical alerts (if enabled)",
            "Email summaries for daily/weekly activity",
            "In-app notification center for all alerts"
          ]
        },
        {
          subtitle: "Taking Action on Alerts",
          tips: [
            "Review low stock alerts during morning prep",
            "Investigate variance alerts immediately",
            "Acknowledge alerts once addressed to clear the queue",
            "Set up automatic reorder if repeatedly seeing same alerts"
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
          text: "PIN Access allows staff to log into the Store Management system using a 4-digit PIN instead of full account credentials. This is perfect for shared devices at point-of-sale locations, warehouses, or mobile inventory terminals."
        },
        {
          subtitle: "Benefits of PIN Access",
          list: [
            "Fast login - just 4 digits vs. email/password",
            "Shared device friendly - multiple staff, one device",
            "Secure - each staff has unique PIN",
            "Accountable - all actions logged to specific PIN/user",
            "Limited scope - staff see only what they need",
            "Easy to change - rotate PINs without password resets"
          ]
        },
        {
          subtitle: "Setting Up Staff PINs (Admin Task)",
          steps: [
            "Go to Team Management in your workspace settings",
            "Find or invite the team member who needs PIN access",
            "Click 'Set PIN' or the key icon next to their name",
            "Enter a 4-digit PIN (avoid obvious codes like 1234, 0000)",
            "Confirm the PIN",
            "Share the PIN securely with the staff member (in person preferred)",
            "Staff can now access via /store-management-pin-access URL"
          ]
        },
        {
          subtitle: "Staff PIN Access Flow",
          steps: [
            "Staff navigates to the PIN Access page (/store-management-pin-access)",
            "Selects their workspace from the dropdown menu",
            "Enters their 4-digit PIN on the numeric keypad",
            "System verifies the PIN against workspace members",
            "On success: staff is logged in and sees available actions",
            "Staff chooses: Inventory (manage stock) or Activity Log (view history)",
            "All actions are logged under the staff member's name",
            "Staff clicks 'Logout' when done to end their session"
          ]
        },
        {
          subtitle: "What Staff Can Access",
          list: [
            "Inventory Management: View and update stock at assigned stores",
            "Activity Log: View recent inventory movements",
            "Transfers: Create transfers between stores (if permitted)",
            "Receiving: Record incoming inventory (if permitted)",
            "Spot Checks: Conduct physical counts (if permitted)"
          ],
          warnings: [
            "Staff cannot access workspace settings or user management",
            "Staff cannot see other workspaces or personal inventories",
            "Actions are limited by permissions set in Team Management"
          ]
        },
        {
          subtitle: "Security Best Practices",
          tips: [
            "Use unique PINs for each staff member (never share PINs)",
            "Change PINs regularly - monthly or after any staff changes",
            "Use random-looking PINs, avoid patterns (1234, 1111, birth years)",
            "Deactivate PINs immediately when staff leave",
            "Review PIN login activity in audit logs regularly",
            "Limit PIN access to staff who need it"
          ]
        },
        {
          subtitle: "Troubleshooting PIN Access",
          list: [
            "Invalid PIN: Verify PIN was entered correctly. Check with admin if forgotten.",
            "No Workspaces: Staff must be added to workspace first.",
            "Access Denied: Check that PIN is enabled and not deactivated.",
            "Wrong Workspace: Ensure selecting correct workspace for that PIN."
          ]
        }
      ]
    },
    team: {
      title: "Team & Permission Management",
      description: "Control who can do what in your workspace",
      content: [
        {
          subtitle: "Understanding Workspaces",
          text: "A workspace is a shared environment where a team collaborates on inventory management. Each workspace has its own stores, items, and inventory data, isolated from other workspaces and personal inventories."
        },
        {
          subtitle: "Workspace Roles",
          list: [
            "Owner - Full access to all features, settings, and member management. Can delete workspace.",
            "Admin - Can manage inventory, stores, items, and members. Cannot delete workspace.",
            "Member - Can perform day-to-day inventory operations (transfers, receiving, spot checks).",
            "Viewer - Read-only access to inventory data and reports. Cannot make changes."
          ]
        },
        {
          subtitle: "Permission Types (Granular Control)",
          list: [
            "can_receive - Allows recording incoming inventory from suppliers",
            "can_transfer - Allows moving inventory between stores",
            "can_spot_check - Allows conducting physical inventory counts",
            "can_manage_items - Allows creating, editing, or deleting items",
            "can_manage_stores - Allows creating, editing, or deleting stores",
            "can_view_reports - Allows accessing variance and activity reports",
            "can_export - Allows exporting data to PDF or Excel"
          ]
        },
        {
          subtitle: "Inviting Team Members",
          steps: [
            "Navigate to Team tab in Store Management workspace settings",
            "Click the 'Invite Member' button",
            "Enter the email address of the person to invite",
            "Select their role (Admin, Member, or Viewer)",
            "Configure specific permissions by toggling each capability",
            "Click 'Send Invitation'",
            "Invitee receives an email with a link to join the workspace",
            "Once they accept, they appear in your team list with assigned permissions"
          ]
        },
        {
          subtitle: "Managing Team Permissions",
          steps: [
            "Go to Team Management and find the team member",
            "Click the settings/gear icon next to their name",
            "Toggle individual permissions on or off as needed",
            "Change their role if responsibilities change",
            "Click 'Save' to apply changes",
            "Changes take effect immediately"
          ]
        },
        {
          subtitle: "Removing Team Members",
          list: [
            "Navigate to Team Management",
            "Find the member to remove",
            "Click the remove/trash icon",
            "Confirm the removal",
            "Member loses access immediately",
            "Their historical activity remains in logs for accountability"
          ],
          warnings: [
            "Removing a member does not delete their past actions from logs",
            "Consider deactivating instead of removing to preserve clear history",
            "Always revoke PIN access when removing members"
          ]
        },
        {
          subtitle: "Best Practices for Team Management",
          tips: [
            "Assign minimum necessary permissions (principle of least privilege)",
            "Review permissions regularly, especially after role changes",
            "Use descriptive role assignments for clarity",
            "Document who has what access for handoffs",
            "Have at least two admins to prevent lockout",
            "Train new members before granting full access"
          ]
        }
      ]
    },
    reports: {
      title: "Reports & Data Export",
      description: "Generate reports and export data",
      content: [
        {
          subtitle: "Available Reports",
          list: [
            "Inventory Summary: Current stock levels across all stores",
            "Transfer History: All movements between stores with details",
            "Receiving History: All incoming inventory records",
            "Spot Check Reports: Physical audit results and variances",
            "Variance Analysis: Discrepancies with trend analysis",
            "Activity Report: Complete audit log of all actions",
            "Low Stock Report: Items below threshold levels"
          ]
        },
        {
          subtitle: "Generating Reports",
          steps: [
            "Navigate to the relevant section (Transfers, Spot Checks, etc.)",
            "Apply filters for date range, store, item, or user",
            "Click the 'Export' or 'Download' button",
            "Select format: PDF for presentation, Excel for analysis",
            "Report generates and downloads to your device"
          ]
        },
        {
          subtitle: "PDF Reports",
          text: "PDF reports are formatted for printing and professional presentation. They include:",
          list: [
            "Company/workspace header with date and time",
            "Summary statistics and key metrics",
            "Detailed tables with all relevant data",
            "Charts and visualizations where applicable",
            "Signature lines for verification if needed"
          ]
        },
        {
          subtitle: "Excel/CSV Export",
          text: "Excel exports provide raw data for further analysis:",
          list: [
            "Full data export with all fields",
            "Sortable and filterable in Excel/Google Sheets",
            "Suitable for importing to accounting systems",
            "Can be used for custom reporting and charts",
            "Includes formulas for calculations where applicable"
          ]
        },
        {
          subtitle: "Report Scheduling (Advanced)",
          text: "For regular reporting needs, consider setting up automated workflows:",
          list: [
            "Daily low stock reports emailed each morning",
            "Weekly variance summaries for management review",
            "Monthly comprehensive inventory reports for accounting",
            "Custom alerts when specific thresholds are crossed"
          ]
        }
      ]
    },
    "best-practices": {
      title: "Best Practices & Tips",
      description: "Maximize the effectiveness of Store Management",
      content: [
        {
          subtitle: "Daily Operations",
          list: [
            "Morning: Review overnight alerts, check low stock, verify opening counts",
            "During Service: Record transfers as they happen, not at end of day",
            "End of Day: Quick spot check of high-value items, ensure all transfers logged",
            "Night Shift: Secure high-value items, leave clear notes for morning team"
          ]
        },
        {
          subtitle: "Weekly Routines",
          list: [
            "Conduct spot checks on high-value or high-movement items",
            "Review variance trends for the week",
            "Audit transfer logs for any discrepancies",
            "Hold brief team meeting on inventory status",
            "Plan for upcoming events or special needs"
          ]
        },
        {
          subtitle: "Monthly Practices",
          list: [
            "Full physical inventory count of all locations",
            "Comprehensive variance analysis and investigation",
            "Review and update par levels based on actual usage",
            "Assess team permissions and access",
            "Generate reports for management and accounting",
            "Archive old data and clean up inactive items"
          ]
        },
        {
          subtitle: "Accuracy Tips",
          tips: [
            "Always record transactions in real-time, not from memory later",
            "Double-check quantities before submitting",
            "Use barcode scanning where available for speed and accuracy",
            "When in doubt, do a quick physical count",
            "Note unusual circumstances in comments/notes fields",
            "Report system issues immediately so they can be fixed"
          ]
        },
        {
          subtitle: "Security Best Practices",
          list: [
            "Limit access to what each person needs for their role",
            "Change PINs regularly and when staff leave",
            "Review activity logs regularly for anomalies",
            "Store high-value items in controlled-access areas",
            "Use spot checks strategically, including unannounced ones",
            "Document all variance investigations thoroughly"
          ]
        },
        {
          subtitle: "Common Mistakes to Avoid",
          warnings: [
            "Batching transactions at end of day (do them in real-time)",
            "Ignoring small variances (they add up and hide bigger issues)",
            "Sharing PINs between staff (destroys accountability)",
            "Skipping spot checks when busy (that's when errors happen most)",
            "Not documenting waste and breakage (creates unexplained variance)",
            "Overcomplicating the system (keep it simple and consistent)"
          ]
        },
        {
          subtitle: "Getting Help",
          list: [
            "Training: Review this guide and the video walkthrough",
            "Support: Contact system administrator for technical issues",
            "Questions: Ask your manager or inventory lead",
            "Feedback: Suggest improvements to make the system work better for your team"
          ]
        }
      ]
    }
  };

  const currentContent = guideContent[activeSection] || guideContent.overview;

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
                  <CardDescription>13 detailed slides covering every feature step-by-step</CardDescription>
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
                  Training Modules ({features.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-1 pr-2">
                    {features.map((feature, idx) => (
                      <button
                        key={feature.id}
                        onClick={() => setActiveSection(feature.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                          activeSection === feature.id
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center text-white shrink-0 text-xs`}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium truncate">{feature.title}</span>
                        {activeSection === feature.id && (
                          <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
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
                    features.find(f => f.id === activeSection)?.color || "from-gray-500 to-gray-600"
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
                  <Accordion type="multiple" defaultValue={currentContent.content.map((_, i) => `item-${i}`)} className="space-y-4">
                    {currentContent.content.map((section, idx) => (
                      <AccordionItem 
                        key={idx} 
                        value={`item-${idx}`}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="hover:no-underline py-4">
                          <span className="text-base font-semibold text-left">{section.subtitle}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
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
                                  <span className="text-muted-foreground text-sm">{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {section.steps && (
                            <ol className="space-y-3">
                              {section.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <Badge variant="outline" className="shrink-0 w-6 h-6 rounded-full p-0 flex items-center justify-center bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                                    {i + 1}
                                  </Badge>
                                  <span className="text-muted-foreground pt-0.5 text-sm">{step}</span>
                                </li>
                              ))}
                            </ol>
                          )}

                          {section.tips && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                                <Lightbulb className="w-4 h-4" />
                                Pro Tips
                              </div>
                              <ul className="space-y-1.5">
                                {section.tips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="text-blue-500">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {section.warnings && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                Important Notes
                              </div>
                              <ul className="space-y-1.5">
                                {section.warnings.map((warning, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="text-amber-500">!</span>
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Reference Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                Quick Reference - Daily Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-background/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Opening
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Review overnight alerts</li>
                    <li>• Check low stock items</li>
                    <li>• Verify opening counts</li>
                    <li>• Log any receiving</li>
                  </ul>
                </div>
                <div className="bg-background/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="w-4 h-4 text-blue-500" />
                    During Service
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Record transfers immediately</li>
                    <li>• Log any receiving</li>
                    <li>• Note waste/breakage</li>
                    <li>• Check for alerts</li>
                  </ul>
                </div>
                <div className="bg-background/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Timer className="w-4 h-4 text-green-500" />
                    End of Day
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Quick high-value count</li>
                    <li>• Verify all transfers logged</li>
                    <li>• Secure storage areas</li>
                    <li>• Review daily activity</li>
                  </ul>
                </div>
                <div className="bg-background/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    Weekly
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Spot check high-value items</li>
                    <li>• Review variance trends</li>
                    <li>• Audit transfer logs</li>
                    <li>• Team inventory meeting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex justify-between items-center"
        >
          <Button variant="outline" onClick={() => navigate("/store-management")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Store Management
          </Button>
          <Button onClick={() => navigate("/store-management-pin-access")} className="gap-2">
            <Lock className="w-4 h-4" />
            Try PIN Access
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default StoreManagementTrainingGuide;
