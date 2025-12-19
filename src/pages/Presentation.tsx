import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronLeft, ChevronRight, Store, Utensils, Package, BarChart3, CheckCircle, XCircle, ArrowRight, Calculator, Thermometer, ClipboardCheck, FileText, Boxes, TrendingUp, Users, Calendar, MessageSquare, Receipt, Truck, AlertTriangle, Sparkles, Zap, Target, Award, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

const Presentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const slides: Slide[] = [
    {
      id: 0,
      title: "Tools Overview",
      subtitle: "Your Complete Toolkit",
      icon: <div className="text-6xl">🛠️</div>,
      content: (
        <div className="text-center space-y-6">
          <p className="text-xl text-muted-foreground">
            Powerful tools designed for hospitality professionals
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {['📊', '🧮', '🌡️', '📋', '📦', '💰', '🍸', '📈'].map((icon, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl"
              >
                {icon}
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "My Spaces",
      subtitle: "Quick Introduction",
      icon: <div className="text-5xl">🚪</div>,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Space Doors gives you instant access to all your collaborative spaces - workspaces, groups, and teams - in one unified interface with real-time presence indicators.
          </p>
          <div className="grid grid-cols-5 gap-2 mt-4">
            {[
              { icon: "🏪", name: "Stores" },
              { icon: "🍸", name: "Groups" },
              { icon: "👥", name: "Teams" },
              { icon: "📦", name: "Orders" },
              { icon: "📊", name: "FIFO" },
            ].map((type, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {type.icon}
                </div>
                <span className="text-[10px] text-muted-foreground">{type.name}</span>
              </div>
            ))}
          </div>
          <Card className="p-3 bg-primary/5 border-primary/20 mt-4">
            <p className="text-xs text-center text-muted-foreground">
              Tap to open • Long press to edit • See who's online in real-time
            </p>
          </Card>
        </div>
      )
    },
    {
      id: 2,
      title: "Batch Calculator",
      icon: <Calculator className="w-12 h-12 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Manual scaling of cocktail recipes is error-prone</li>
              <li>• Converting single serve to batch requires complex math</li>
              <li>• Inconsistent batches lead to flavor inconsistency</li>
              <li>• No way to save and share scaled recipes</li>
              <li>• Time wasted recalculating every prep session</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Intelligent batch scaling tool that automatically converts single-serve recipes to any batch size. Input your base recipe, select target serves or liters, and get precise measurements instantly. Save recipes for future use and share with your team.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Precision Scaling", "Time Savings", "Consistency", "Recipe Library", "Team Sharing", "QR Labels"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 3,
      title: "Temperature Monitoring",
      icon: <Thermometer className="w-12 h-12 text-red-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Paper logs are easy to falsify or forget</li>
              <li>• No alerts for out-of-range temperatures</li>
              <li>• Compliance audits require digging through records</li>
              <li>• Equipment failures go unnoticed until spoilage</li>
              <li>• Multiple fridges/freezers hard to track</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Digital temperature logging system for all refrigeration equipment. Log readings with timestamps, set target temperatures, receive deviation alerts, and generate compliance reports. Track multiple units across locations with a single dashboard.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["HACCP Compliant", "Instant Alerts", "Audit Ready", "Multi-Unit", "History Logs", "Trend Analysis"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 4,
      title: "Prep Checklists",
      icon: <ClipboardCheck className="w-12 h-12 text-green-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Prep tasks forgotten during busy shifts</li>
              <li>• No accountability for who completed what</li>
              <li>• New staff don't know the prep routine</li>
              <li>• Opening/closing procedures inconsistent</li>
              <li>• Manager has no visibility into prep status</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Customizable digital checklists for opening, closing, and prep routines. Assign tasks to team members, track completion times, and ensure nothing is missed. Create templates for different shifts and stations with photo verification options.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Accountability", "Consistency", "Training Tool", "Time Stamps", "Photo Proof", "Templates"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 5,
      title: "Cocktail SOP Builder",
      icon: <FileText className="w-12 h-12 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Recipes only exist in bartenders' heads</li>
              <li>• Drinks taste different depending on who makes them</li>
              <li>• No costing or profit margin visibility</li>
              <li>• Training new staff is time-consuming</li>
              <li>• Menu changes cause confusion</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Professional cocktail documentation with precise measurements, techniques, glassware, garnishes, and photos. Auto-calculate costs, ABV, and nutrition. Version control lets you track recipe evolution and A/B test variations.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Cost Analysis", "Consistency", "Training", "Versioning", "ABV Calc", "Photo SOPs"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 6,
      title: "Inventory Management",
      icon: <Boxes className="w-12 h-12 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Counting stock is tedious and inaccurate</li>
              <li>• No visibility into what's running low</li>
              <li>• Variance between actual and theoretical unknown</li>
              <li>• Dead stock ties up capital</li>
              <li>• Theft and over-pouring undetected</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Comprehensive stock tracking with barcode scanning, par levels, and automated reorder suggestions. Count inventory by weight or units, track variance, and identify shrinkage patterns. Multi-location support with transfer tracking.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Par Levels", "Variance Track", "Barcode Scan", "Multi-Store", "Reorder Alerts", "Cost Control"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 7,
      title: "FIFO & Expiry Tracking",
      icon: <AlertTriangle className="w-12 h-12 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Products expire before being used</li>
              <li>• FIFO rotation is not followed properly</li>
              <li>• Wastage costs unknown and uncontrolled</li>
              <li>• Health inspector concerns about date management</li>
              <li>• No systematic approach to shelf life</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              First-In-First-Out inventory system with expiration date tracking. Color-coded alerts for approaching dates, automatic rotation reminders, and waste logging. Generate reports on waste patterns to identify problem categories.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Expiry Alerts", "Waste Reduction", "Compliance", "Date Labels", "Rotation Guide", "Waste Reports"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 8,
      title: "Purchase Orders",
      icon: <Receipt className="w-12 h-12 text-teal-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Orders placed via text/phone with no record</li>
              <li>• No approval workflow for large purchases</li>
              <li>• Deliveries not checked against orders</li>
              <li>• Spend tracking across vendors is manual</li>
              <li>• Invoice reconciliation is a nightmare</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Digital purchase order system with supplier catalogs, approval workflows, and receiving verification. Create POs from par level suggestions, track order status, and match deliveries to orders. Complete spend analytics by category and vendor.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Order History", "Approvals", "Receiving", "Vendor Track", "Spend Reports", "Auto-PO"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 9,
      title: "Cost Analysis",
      icon: <TrendingUp className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• True pour cost unknown for most drinks</li>
              <li>• Menu pricing based on guesswork</li>
              <li>• Ingredient price changes not reflected</li>
              <li>• Profit margins vary wildly across menu</li>
              <li>• No visibility into cost trends over time</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Real-time cost calculation engine that tracks ingredient prices, calculates pour costs, and suggests optimal pricing. Update costs automatically when purchase prices change. Compare theoretical vs actual usage to identify variance.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Pour Cost", "Margin Calc", "Price Updates", "Menu Analysis", "Trend Reports", "Profit Insights"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 10,
      title: "Team Scheduling",
      icon: <Calendar className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Schedule changes communicated via group chat</li>
              <li>• Staff availability tracked on paper or memory</li>
              <li>• Shift swaps cause confusion</li>
              <li>• Overtime not tracked properly</li>
              <li>• No visibility into labor costs per shift</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Team calendar with shift scheduling, availability management, and swap requests. Staff get push notifications for schedule updates. Managers see labor cost projections and can optimize coverage based on forecasted demand.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Shift Plans", "Availability", "Swap Requests", "Labor Cost", "Notifications", "Time Track"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 11,
      title: "Team Chat",
      icon: <MessageSquare className="w-12 h-12 text-pink-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Work communication mixed with personal chats</li>
              <li>• Important updates get lost in group messages</li>
              <li>• No searchable history of decisions</li>
              <li>• File sharing scattered across platforms</li>
              <li>• New hires can't access past discussions</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Built-in team messaging with channels for different topics (announcements, shift trades, general). Share files, photos, and voice notes. Pin important messages, mention team members, and search message history.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Channels", "File Share", "Search", "Mentions", "Pin Messages", "History"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 12,
      title: "Supplier Management",
      icon: <Truck className="w-12 h-12 text-slate-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Vendor contacts in personal phones</li>
              <li>• Price lists outdated or missing</li>
              <li>• No comparison between suppliers</li>
              <li>• Delivery performance not tracked</li>
              <li>• Contract terms forgotten or lost</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Centralized supplier database with contacts, price lists, delivery schedules, and performance ratings. Compare prices across vendors, track delivery reliability, and store contract documents. Set up preferred supplier lists by category.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Contact Hub", "Price Lists", "Compare", "Ratings", "Contracts", "Preferred"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 13,
      title: "Summary",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            A complete toolkit for modern hospitality operations
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Calculator className="w-4 h-4" />, name: "Batch Calculator" },
              { icon: <Thermometer className="w-4 h-4" />, name: "Temp Monitoring" },
              { icon: <ClipboardCheck className="w-4 h-4" />, name: "Prep Checklists" },
              { icon: <FileText className="w-4 h-4" />, name: "Cocktail SOPs" },
              { icon: <Boxes className="w-4 h-4" />, name: "Inventory" },
              { icon: <AlertTriangle className="w-4 h-4" />, name: "FIFO Tracking" },
              { icon: <Receipt className="w-4 h-4" />, name: "Purchase Orders" },
              { icon: <TrendingUp className="w-4 h-4" />, name: "Cost Analysis" },
              { icon: <Calendar className="w-4 h-4" />, name: "Scheduling" },
              { icon: <MessageSquare className="w-4 h-4" />, name: "Team Chat" },
              { icon: <Truck className="w-4 h-4" />, name: "Suppliers" },
              { icon: <Users className="w-4 h-4" />, name: "My Spaces" },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-primary/10"
              >
                <div className="text-primary">{tool.icon}</div>
                <span className="text-xs font-medium">{tool.name}</span>
              </motion.div>
            ))}
          </div>
          <Card className="p-3 bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30 mt-4">
            <p className="text-xs text-center font-medium">
              🚀 All tools work together seamlessly to streamline your operations
            </p>
          </Card>
        </div>
      )
    },
  ];

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      
      // Title page
      pdf.setFontSize(32);
      pdf.setTextColor(99, 102, 241);
      pdf.text('Tools Overview', pageWidth / 2, 60, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setTextColor(100);
      pdf.text('Your Complete Toolkit', pageWidth / 2, 75, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setTextColor(150);
      pdf.text('Hospitality Operations Guide', pageWidth / 2, 90, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text('December 2024', pageWidth / 2, pageHeight - 30, { align: 'center' });

      // Content pages
      const sections = [
        {
          title: 'Batch Calculator',
          problem: [
            'Manual scaling of cocktail recipes is error-prone',
            'Converting single serve to batch requires complex math',
            'Inconsistent batches lead to flavor inconsistency',
            'No way to save and share scaled recipes',
            'Time wasted recalculating every prep session'
          ],
          solution: 'Intelligent batch scaling tool that automatically converts single-serve recipes to any batch size. Input your base recipe, select target serves or liters, and get precise measurements instantly.',
          benefits: ['Precision Scaling', 'Time Savings', 'Consistency', 'Recipe Library', 'Team Sharing', 'QR Labels']
        },
        {
          title: 'Temperature Monitoring',
          problem: [
            'Paper logs are easy to falsify or forget',
            'No alerts for out-of-range temperatures',
            'Compliance audits require digging through records',
            'Equipment failures go unnoticed until spoilage',
            'Multiple fridges/freezers hard to track'
          ],
          solution: 'Digital temperature logging system for all refrigeration equipment. Log readings with timestamps, set target temperatures, receive deviation alerts, and generate compliance reports.',
          benefits: ['HACCP Compliant', 'Instant Alerts', 'Audit Ready', 'Multi-Unit', 'History Logs', 'Trend Analysis']
        },
        {
          title: 'Prep Checklists',
          problem: [
            'Prep tasks forgotten during busy shifts',
            'No accountability for who completed what',
            'New staff don\'t know the prep routine',
            'Opening/closing procedures inconsistent',
            'Manager has no visibility into prep status'
          ],
          solution: 'Customizable digital checklists for opening, closing, and prep routines. Assign tasks to team members, track completion times, and ensure nothing is missed.',
          benefits: ['Accountability', 'Consistency', 'Training Tool', 'Time Stamps', 'Photo Proof', 'Templates']
        },
        {
          title: 'Cocktail SOP Builder',
          problem: [
            'Recipes only exist in bartenders\' heads',
            'Drinks taste different depending on who makes them',
            'No costing or profit margin visibility',
            'Training new staff is time-consuming',
            'Menu changes cause confusion'
          ],
          solution: 'Professional cocktail documentation with precise measurements, techniques, glassware, garnishes, and photos. Auto-calculate costs, ABV, and nutrition.',
          benefits: ['Cost Analysis', 'Consistency', 'Training', 'Versioning', 'ABV Calc', 'Photo SOPs']
        },
        {
          title: 'Inventory Management',
          problem: [
            'Counting stock is tedious and inaccurate',
            'No visibility into what\'s running low',
            'Variance between actual and theoretical unknown',
            'Dead stock ties up capital',
            'Theft and over-pouring undetected'
          ],
          solution: 'Comprehensive stock tracking with barcode scanning, par levels, and automated reorder suggestions. Count inventory by weight or units, track variance.',
          benefits: ['Par Levels', 'Variance Track', 'Barcode Scan', 'Multi-Store', 'Reorder Alerts', 'Cost Control']
        },
        {
          title: 'FIFO & Expiry Tracking',
          problem: [
            'Products expire before being used',
            'FIFO rotation is not followed properly',
            'Wastage costs unknown and uncontrolled',
            'Health inspector concerns about date management',
            'No systematic approach to shelf life'
          ],
          solution: 'First-In-First-Out inventory system with expiration date tracking. Color-coded alerts for approaching dates, automatic rotation reminders, and waste logging.',
          benefits: ['Expiry Alerts', 'Waste Reduction', 'Compliance', 'Date Labels', 'Rotation Guide', 'Waste Reports']
        },
        {
          title: 'Purchase Orders',
          problem: [
            'Orders placed via text/phone with no record',
            'No approval workflow for large purchases',
            'Deliveries not checked against orders',
            'Spend tracking across vendors is manual',
            'Invoice reconciliation is a nightmare'
          ],
          solution: 'Digital purchase order system with supplier catalogs, approval workflows, and receiving verification. Create POs from par level suggestions.',
          benefits: ['Order History', 'Approvals', 'Receiving', 'Vendor Track', 'Spend Reports', 'Auto-PO']
        },
        {
          title: 'Cost Analysis',
          problem: [
            'True pour cost unknown for most drinks',
            'Menu pricing based on guesswork',
            'Ingredient price changes not reflected',
            'Profit margins vary wildly across menu',
            'No visibility into cost trends over time'
          ],
          solution: 'Real-time cost calculation engine that tracks ingredient prices, calculates pour costs, and suggests optimal pricing.',
          benefits: ['Pour Cost', 'Margin Calc', 'Price Updates', 'Menu Analysis', 'Trend Reports', 'Profit Insights']
        },
        {
          title: 'Team Scheduling',
          problem: [
            'Schedule changes communicated via group chat',
            'Staff availability tracked on paper or memory',
            'Shift swaps cause confusion',
            'Overtime not tracked properly',
            'No visibility into labor costs per shift'
          ],
          solution: 'Team calendar with shift scheduling, availability management, and swap requests. Staff get push notifications for schedule updates.',
          benefits: ['Shift Plans', 'Availability', 'Swap Requests', 'Labor Cost', 'Notifications', 'Time Track']
        },
        {
          title: 'Team Chat',
          problem: [
            'Work communication mixed with personal chats',
            'Important updates get lost in group messages',
            'No searchable history of decisions',
            'File sharing scattered across platforms',
            'New hires can\'t access past discussions'
          ],
          solution: 'Built-in team messaging with channels for different topics. Share files, photos, and voice notes. Pin important messages and search history.',
          benefits: ['Channels', 'File Share', 'Search', 'Mentions', 'Pin Messages', 'History']
        },
        {
          title: 'Supplier Management',
          problem: [
            'Vendor contacts in personal phones',
            'Price lists outdated or missing',
            'No comparison between suppliers',
            'Delivery performance not tracked',
            'Contract terms forgotten or lost'
          ],
          solution: 'Centralized supplier database with contacts, price lists, delivery schedules, and performance ratings. Compare prices across vendors.',
          benefits: ['Contact Hub', 'Price Lists', 'Compare', 'Ratings', 'Contracts', 'Preferred']
        }
      ];

      sections.forEach((section, index) => {
        pdf.addPage();
        let yPos = margin;
        
        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(99, 102, 241);
        pdf.text(section.title, margin, yPos);
        yPos += 15;
        
        // Problem section
        pdf.setFontSize(12);
        pdf.setTextColor(220, 38, 38);
        pdf.text('❌ Problem', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setTextColor(80);
        section.problem.forEach(item => {
          const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - (margin * 2));
          pdf.text(lines, margin, yPos);
          yPos += lines.length * 5;
        });
        yPos += 8;
        
        // Solution section
        pdf.setFontSize(12);
        pdf.setTextColor(34, 197, 94);
        pdf.text('✅ Solution', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setTextColor(80);
        const solutionLines = pdf.splitTextToSize(section.solution, pageWidth - (margin * 2));
        pdf.text(solutionLines, margin, yPos);
        yPos += solutionLines.length * 5 + 8;
        
        // Benefits section
        pdf.setFontSize(12);
        pdf.setTextColor(59, 130, 246);
        pdf.text('🏆 Benefits', margin, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setTextColor(80);
        pdf.text(section.benefits.join(' • '), margin, yPos);
      });

      // Summary page
      pdf.addPage();
      pdf.setFontSize(24);
      pdf.setTextColor(99, 102, 241);
      pdf.text('Complete Toolkit Summary', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      let summaryY = 50;
      
      const allTools = [
        'Batch Calculator - Precision recipe scaling',
        'Temperature Monitoring - HACCP compliance',
        'Prep Checklists - Consistent operations',
        'Cocktail SOP Builder - Recipe documentation',
        'Inventory Management - Stock control',
        'FIFO Tracking - Waste reduction',
        'Purchase Orders - Procurement workflow',
        'Cost Analysis - Profit optimization',
        'Team Scheduling - Labor management',
        'Team Chat - Communication hub',
        'Supplier Management - Vendor database',
        'My Spaces - Collaboration hub'
      ];
      
      allTools.forEach(tool => {
        pdf.text(`✓ ${tool}`, margin, summaryY);
        summaryY += 8;
      });
      
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text('All tools work together seamlessly to streamline your operations', pageWidth / 2, pageHeight - 30, { align: 'center' });

      pdf.save('Tools_Overview_Presentation.pdf');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Resources</h1>
            <p className="text-sm text-muted-foreground">Tools Overview Presentation</p>
          </div>
          <Button 
            onClick={generatePDF}
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'PDF'}
          </Button>
        </div>

        {/* Slide indicator */}
        <div className="flex justify-center gap-1 mb-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide 
                  ? 'w-6 bg-primary' 
                  : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <Card className="p-6 min-h-[500px]">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Slide header */}
            <div className="text-center mb-6">
              {slides[currentSlide].icon && (
                <div className="flex justify-center mb-4">
                  {slides[currentSlide].icon}
                </div>
              )}
              <h2 className="text-xl font-bold">{slides[currentSlide].title}</h2>
              {slides[currentSlide].subtitle && (
                <p className="text-sm text-muted-foreground">{slides[currentSlide].subtitle}</p>
              )}
            </div>
            
            {/* Slide content */}
            {slides[currentSlide].content}
          </motion.div>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={prevSlide} size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button variant="ghost" onClick={nextSlide} size="sm">
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Presentation;
