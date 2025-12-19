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
      subtitle: "Work Together, Win Together",
      icon: <div className="text-6xl">🚪</div>,
      content: (
        <div className="text-center space-y-6">
          <p className="text-lg font-medium text-foreground">
            Your team. Your data. All in one place.
          </p>
          <p className="text-sm text-muted-foreground">
            Share stock, recipes, orders, and food safety logs with your whole team — no more spreadsheets, no more confusion.
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
    // Store Management
    {
      id: 1,
      title: "Store Management",
      subtitle: "Everyone Sees the Stock",
      icon: <Store className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> Without This
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Only one person knows what's in stock. Nobody else can check. When they're busy or leave, you're stuck.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> With My Spaces
            </h3>
            <p className="mt-2 text-xs">
              <strong>Everyone on the team can see stock levels.</strong> Give each person the right access — bartenders see bar items, managers see costs. Updates happen live.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "👥", label: "Whole team can see" },
              { icon: "🔐", label: "Safe with PIN codes" },
              { icon: "⚡", label: "Updates instantly" },
              { icon: "📱", label: "Works on any phone" },
              { icon: "📊", label: "Track who did what" },
              { icon: "💾", label: "Data never lost" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Mixologist Groups
    {
      id: 2,
      title: "Mixologist Groups",
      subtitle: "Keep Your Recipes Safe",
      icon: <div className="text-5xl">🍸</div>,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> Without This
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Recipes are in people's heads or personal notes. Staff leaves = recipes gone. Batches come out different every time.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> With My Spaces
            </h3>
            <p className="mt-2 text-xs">
              <strong>All recipes in one shared library.</strong> Scale any recipe to any batch size with one tap. Print QR labels for each batch. New staff can follow the recipe perfectly.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "📚", label: "One recipe library" },
              { icon: "🔢", label: "Auto batch scaling" },
              { icon: "🏷️", label: "QR code labels" },
              { icon: "📝", label: "Log every batch" },
              { icon: "👨‍🍳", label: "Train new staff fast" },
              { icon: "🔒", label: "Recipes stay yours" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Procurement
    {
      id: 3,
      title: "Procurement",
      subtitle: "Order Together, Save Together",
      icon: <Package className="w-12 h-12 text-violet-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> Without This
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              One person does all the ordering. Nobody knows what's coming or when. Orders get missed. Money gets wasted.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> With My Spaces
            </h3>
            <p className="mt-2 text-xs">
              <strong>Everyone can see orders and create them.</strong> Scan items when they arrive — stock updates automatically. Know exactly what you're spending on what.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "👀", label: "See all orders" },
              { icon: "📲", label: "Scan to receive" },
              { icon: "✅", label: "Approval workflow" },
              { icon: "💰", label: "Track spending" },
              { icon: "🔄", label: "Auto stock update" },
              { icon: "📋", label: "Shared supplier list" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // FIFO
    {
      id: 4,
      title: "FIFO Workspaces",
      subtitle: "Never Miss an Expiry Date",
      icon: <BarChart3 className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-4">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" /> Without This
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Every shift tracks things differently. Expired food slips through. No records when inspectors come. Waste adds up.
            </p>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> With My Spaces
            </h3>
            <p className="mt-2 text-xs">
              <strong>One system for all shifts.</strong> Get alerts before things expire. Log waste and see where money is lost. Ready for any inspection.
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🔔", label: "Expiry alerts" },
              { icon: "📊", label: "Waste reports" },
              { icon: "🌡️", label: "Temp logging" },
              { icon: "✅", label: "Inspection ready" },
              { icon: "👥", label: "Team wide access" },
              { icon: "📈", label: "Reduce waste" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    // Why Choose Us - More reasons
    {
      id: 5,
      title: "Why Choose My Spaces?",
      subtitle: "Built for Real Teams",
      icon: <Target className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-3">
          {[
            { icon: "🚀", title: "Easy to Start", desc: "Set up in minutes, not days" },
            { icon: "💪", title: "Built for Teams", desc: "From 2 people to 200 people" },
            { icon: "📱", title: "Works Anywhere", desc: "Phone, tablet, or computer" },
            { icon: "🔐", title: "Safe & Secure", desc: "Your data is protected" },
            { icon: "💾", title: "Nothing Gets Lost", desc: "Staff leaves, data stays" },
            { icon: "⚡", title: "Real-Time Updates", desc: "Everyone sees changes instantly" },
            { icon: "🎯", title: "Simple to Use", desc: "No training needed" },
            { icon: "💰", title: "Save Money", desc: "Less waste, better control" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-medium">{item.title}</div>
                <div className="text-[10px] text-muted-foreground">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )
    },
    // Summary - Call to Action
    {
      id: 6,
      title: "Get Started Today",
      subtitle: "Your Team Deserves Better Tools",
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "🏪", name: "Stores", desc: "Share inventory" },
              { icon: "🍸", name: "Recipes", desc: "Save your recipes" },
              { icon: "📦", name: "Orders", desc: "Order together" },
              { icon: "📊", name: "FIFO", desc: "Track expiry" },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center"
              >
                <div className="text-2xl mb-1">{tool.icon}</div>
                <div className="text-sm font-medium">{tool.name}</div>
                <div className="text-[10px] text-muted-foreground">{tool.desc}</div>
              </motion.div>
            ))}
          </div>
          <Card className="p-4 bg-primary/5 border-primary/30">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Stop losing data. Stop wasting time.
              </p>
              <p className="text-xs text-muted-foreground">
                Give your team the tools they deserve.
              </p>
            </div>
          </Card>
          <div className="flex justify-center">
            <Badge className="text-sm px-4 py-2 bg-primary text-primary-foreground">
              <Zap className="w-4 h-4 mr-2" />
              Try My Spaces Free
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
