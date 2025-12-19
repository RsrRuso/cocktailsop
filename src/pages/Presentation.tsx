import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronLeft, ChevronRight, Store, Utensils, Package, BarChart3, CheckCircle, XCircle, ArrowRight, Calculator, Thermometer, ClipboardCheck, FileText, Boxes, TrendingUp, Users, Calendar, MessageSquare, Receipt, Truck, AlertTriangle, Sparkles, Zap, Target, Award, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
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
  const slideRef = useRef<HTMLDivElement>(null);

  const slides: Slide[] = [
    {
      id: 0,
      title: "My Spaces",
      subtitle: "Collaborative Workspaces",
      icon: <div className="text-6xl">🚪</div>,
      content: (
        <div className="text-center space-y-6">
          <p className="text-xl text-muted-foreground">
            Unified access to all your collaborative spaces
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {['🏪', '🍸', '📦', '📊'].map((icon, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl"
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
      title: "Space Doors Overview",
      subtitle: "How It Works",
      icon: <Users className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Space Doors gives you instant access to all your collaborative spaces in one unified interface with real-time presence indicators.
          </p>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { icon: "🏪", name: "Stores" },
              { icon: "🍸", name: "Groups" },
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
              Tap to open • Long press to edit • See who is online in real-time
            </p>
          </Card>
        </div>
      )
    },
    {
      id: 2,
      title: "Store Management",
      subtitle: "Workspaces",
      icon: <Store className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Personal inventory mixed with team inventory</li>
              <li>• No way to share stores with team members</li>
              <li>• Single user access creates bottlenecks</li>
              <li>• No role-based permissions for different staff</li>
              <li>• Data silos when managers change</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Collaborative workspaces where teams share stores, inventory, and data with role-based access control and PIN security. Invite team members, assign roles, and maintain complete activity logs for accountability.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Shared Stores", "Role Access", "PIN Security", "Activity Logs", "Team Invites", "Real-time Sync"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 3,
      title: "Mixologist Groups",
      subtitle: "Recipe Collaboration",
      icon: <div className="text-5xl">🍸</div>,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Batch recipes scattered across individuals</li>
              <li>• No way to share recipes with the team</li>
              <li>• Production tracking is fragmented</li>
              <li>• Knowledge silos when staff leaves</li>
              <li>• Inconsistent batches across locations</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Dedicated spaces for bar teams to share batch recipes, track production runs, and collaborate on cocktail development. All recipes are centralized, version-controlled, and accessible to authorized team members.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Shared Recipes", "Production Log", "QR Labels", "Version Control", "Team Access", "Batch History"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 4,
      title: "Procurement",
      subtitle: "Workspaces",
      icon: <Package className="w-12 h-12 text-violet-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• Purchase orders managed by single person</li>
              <li>• No visibility into ordering status</li>
              <li>• Receiving not tracked systematically</li>
              <li>• Supplier relationships not shared</li>
              <li>• Spend data locked in individual accounts</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Shared purchasing management for supplier orders, receiving workflows, and automatic inventory sync. Multiple team members can create POs, receive deliveries, and track spending with full visibility across the organization.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Shared POs", "Scan Receiving", "Cost Tracking", "Approvals", "Supplier List", "Spend Reports"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 5,
      title: "FIFO Workspaces",
      subtitle: "Expiry & Waste Tracking",
      icon: <BarChart3 className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <XCircle className="w-4 h-4" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• FIFO tracking individual to each user</li>
              <li>• No shared expiration monitoring</li>
              <li>• Wastage data not aggregated</li>
              <li>• Temperature logs scattered</li>
              <li>• Compliance gaps across shifts</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" /> Solution
            </h3>
            <p className="mt-2 text-xs">
              Team-based first-in-first-out inventory tracking with shared expiration monitoring and waste analysis. All team members contribute to FIFO logs, see expiring items, and record waste with unified reporting.
            </p>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-sm">
              <Award className="w-4 h-4" /> Benefits
            </h3>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {["Shared FIFO", "Expiry Alerts", "Waste Tracking", "Team Logs", "Compliance", "Analytics"].map((b, i) => (
                <Badge key={i} variant="outline" className="text-[10px] justify-center">{b}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    {
      id: 6,
      title: "UI Interactions",
      subtitle: "How to Navigate",
      icon: <div className="text-5xl">👆</div>,
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            {[
              { action: "Tap", result: "Opens space detail sheet" },
              { action: "Long Press", result: "Enters edit mode (shows X to hide)" },
              { action: "Tap X", result: "Hides space from view" },
              { action: "Swipe", result: "Scroll through spaces" },
              { action: "Restore", result: "Brings back hidden spaces" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Badge className="w-24 justify-center">{item.action}</Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "Summary",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            My Spaces brings all collaboration together
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Store className="w-4 h-4" />, name: "Store Management" },
              { icon: <div className="text-sm">🍸</div>, name: "Mixologist Groups" },
              { icon: <Package className="w-4 h-4" />, name: "Procurement" },
              { icon: <BarChart3 className="w-4 h-4" />, name: "FIFO Workspaces" },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-primary/10"
              >
                <div className="text-primary">{tool.icon}</div>
                <span className="text-xs font-medium">{tool.name}</span>
              </motion.div>
            ))}
          </div>
          <div className="grid gap-2 mt-4">
            {[
              "Unified Access - All spaces in one interface",
              "Real-Time Presence - See who is online",
              "Role-Based Security - Right access for each member",
              "Seamless Navigation - One tap to any workspace",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
              >
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
  ];

  const generatePDF = async () => {
    if (!slideRef.current) return;
    
    setIsGenerating(true);
    toast.info('Generating PDF with all slides... This may take a moment.');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const originalSlide = currentSlide;
      
      // Capture each slide as an image
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        
        // Wait for slide to render
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (slideRef.current) {
          const dataUrl = await toPng(slideRef.current, {
            quality: 1,
            pixelRatio: 2,
          });
          
          // Calculate dimensions to fit A4
          const imgWidth = pageWidth - 20;
          const imgHeight = (slideRef.current.offsetHeight * imgWidth) / slideRef.current.offsetWidth;
          
          if (i > 0) {
            pdf.addPage();
          }
          
          // Fill page with dark grey background
          pdf.setFillColor(42, 42, 42);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          
          // Add slide number
          pdf.setFontSize(10);
          pdf.setTextColor(150);
          pdf.text(`Slide ${i + 1} of ${slides.length}`, pageWidth / 2, 10, { align: 'center' });
          
          // Add the image
          pdf.addImage(dataUrl, 'PNG', 10, 15, imgWidth, Math.min(imgHeight, pageHeight - 25));
        }
      }
      
      // Restore original slide
      setCurrentSlide(originalSlide);
      
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
        <Card ref={slideRef} className="p-6 min-h-[500px]">
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
