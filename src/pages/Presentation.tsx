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
    // Opening slide - Hook
    {
      id: 0,
      title: "My Spaces",
      subtitle: "The Collaboration Hub for Hospitality Teams",
      icon: <div className="text-6xl">🚪</div>,
      content: (
        <div className="text-center space-y-6">
          <p className="text-lg font-medium text-foreground">
            Stop working in silos. Start working together.
          </p>
          <p className="text-sm text-muted-foreground">
            One unified platform where teams share inventory, recipes, orders, and compliance data in real-time.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              { icon: '🏪', label: 'Stores' },
              { icon: '🍸', label: 'Recipes' },
              { icon: '📦', label: 'Orders' },
              { icon: '📊', label: 'FIFO' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    // Store Management - Value Proposition
    {
      id: 1,
      title: "Store Management",
      subtitle: "Shared Inventory Control",
      icon: <Store className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> The Problem
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              When one person owns the inventory data, the whole team is blind. Staff can't check stock, managers can't see what's happening, and when that person leaves—all the data goes with them.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> Our Solution
            </h3>
            <p className="mt-2 text-xs">
              <strong>Team-owned inventory.</strong> Everyone who needs access gets it—with the right permissions. Bartenders see bar stock, managers see costs, owners see everything. Real-time sync means no more "I didn't know we were out."
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { stat: "100%", label: "Team visibility" },
              { stat: "Zero", label: "Data loss risk" },
              { stat: "Real-time", label: "Stock updates" },
              { stat: "Role-based", label: "Access control" },
            ].map((item, i) => (
              <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary">{item.stat}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Mixologist Groups - Value Proposition
    {
      id: 2,
      title: "Mixologist Groups",
      subtitle: "Collaborative Recipe Development",
      icon: <div className="text-5xl">🍸</div>,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> The Problem
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Your best recipes live in someone's head—or worse, their personal notebook. When they leave, those recipes walk out the door. Batch scaling errors cost money, and there's no way to ensure consistency across locations.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> Our Solution
            </h3>
            <p className="mt-2 text-xs">
              <strong>One recipe library. One source of truth.</strong> Every batch recipe is stored, scaled, and shared with the team. Production runs are logged with QR codes. New staff get it right on day one. Your IP stays with you.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { stat: "Instant", label: "Recipe scaling" },
              { stat: "Tracked", label: "Production runs" },
              { stat: "QR", label: "Batch labels" },
              { stat: "Protected", label: "Recipe IP" },
            ].map((item, i) => (
              <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary">{item.stat}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Procurement - Value Proposition
    {
      id: 3,
      title: "Procurement",
      subtitle: "Team Purchasing & Receiving",
      icon: <Package className="w-12 h-12 text-violet-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> The Problem
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              One person handles all orders. Nobody else knows what's been ordered, what's arriving, or what's been received. Invoices pile up, costs spiral, and suppliers play favorites because there's no shared vendor management.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> Our Solution
            </h3>
            <p className="mt-2 text-xs">
              <strong>Transparent purchasing for the whole team.</strong> Anyone can create POs with approval workflows. Scan-based receiving updates inventory instantly. Cost tracking shows exactly where money goes. No more purchasing bottlenecks.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { stat: "Full", label: "Order visibility" },
              { stat: "Scan", label: "To receive" },
              { stat: "Auto", label: "Inventory sync" },
              { stat: "Clear", label: "Spend tracking" },
            ].map((item, i) => (
              <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary">{item.stat}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // FIFO - Value Proposition
    {
      id: 4,
      title: "FIFO Workspaces",
      subtitle: "Expiry & Compliance Tracking",
      icon: <BarChart3 className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> The Problem
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              FIFO tracking is a mess. Each shift does it differently (or not at all). Expired products slip through. Waste isn't measured. When the health inspector asks for records, it's a scramble to find anything.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> Our Solution
            </h3>
            <p className="mt-2 text-xs">
              <strong>One FIFO system for every shift.</strong> Expiration alerts go to everyone. Waste is logged and analyzed. Temperature checks are timestamped. When compliance matters, you have the data—automatically.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { stat: "Shared", label: "Expiry tracking" },
              { stat: "Smart", label: "Waste analytics" },
              { stat: "Logged", label: "Temp checks" },
              { stat: "Ready", label: "Compliance data" },
            ].map((item, i) => (
              <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-bold text-primary">{item.stat}</div>
                <div className="text-[10px] text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Why My Spaces - Selling point
    {
      id: 5,
      title: "Why My Spaces?",
      subtitle: "The Competitive Edge",
      icon: <Target className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              Every tool in My Spaces solves one core problem:
            </p>
            <p className="text-lg font-bold text-primary mt-2">
              "Silos kill efficiency."
            </p>
          </div>
          <div className="space-y-3">
            {[
              { title: "No More Knowledge Silos", desc: "When someone leaves, the data stays" },
              { title: "No More Bottlenecks", desc: "Everyone who needs access has it" },
              { title: "No More Guesswork", desc: "Real-time data, real-time decisions" },
              { title: "No More Compliance Panic", desc: "Automatic audit trails" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )
    },
    // Summary - Call to Action
    {
      id: 6,
      title: "Ready to Transform?",
      subtitle: "Start Collaborating Today",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Four powerful workspaces. One unified platform.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Store className="w-5 h-5" />, name: "Stores", color: "text-emerald-500" },
              { icon: <div className="text-lg">🍸</div>, name: "Recipes", color: "text-amber-500" },
              { icon: <Package className="w-5 h-5" />, name: "Orders", color: "text-violet-500" },
              { icon: <BarChart3 className="w-5 h-5" />, name: "FIFO", color: "text-rose-500" },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <div className={tool.color}>{tool.icon}</div>
                <span className="text-sm font-medium">{tool.name}</span>
              </motion.div>
            ))}
          </div>
          <Card className="p-4 bg-primary/5 border-primary/30 text-center">
            <p className="text-sm font-medium">
              Break down the silos. Empower your team.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              My Spaces — Where hospitality teams work better together.
            </p>
          </Card>
          <div className="flex justify-center">
            <Badge className="text-sm px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              Get Started Now
            </Badge>
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
