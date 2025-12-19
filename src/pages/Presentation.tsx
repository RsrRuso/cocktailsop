import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronLeft, ChevronRight, Store, Package, BarChart3, CheckCircle, XCircle, Play, Pause, RotateCcw, Sparkles, Zap, Target, AlertTriangle, Lightbulb, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  duration?: number; // seconds
}

const Presentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const slideRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_DURATION = 8000; // 8 seconds per slide

  const slides: Slide[] = [
    // Opening slide
    {
      id: 0,
      title: "My Spaces",
      subtitle: "Work Together, Win Together",
      icon: <div className="text-6xl">🚪</div>,
      content: (
        <div className="text-center space-y-4">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-medium text-foreground"
          >
            Your team. Your data. All in one place.
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground"
          >
            Share stock, recipes, orders, and food safety logs with your whole team.
          </motion.p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            {[
              { icon: '🏪', label: 'Stores' },
              { icon: '🍸', label: 'Recipes' },
              { icon: '📦', label: 'Orders' },
              { icon: '📊', label: 'FIFO' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.8 + i * 0.15, type: "spring" }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {item.icon}
                </div>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
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
      icon: <Store className="w-10 h-10 text-emerald-500" />,
      content: (
        <div className="space-y-3">
          <Card className="p-3 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-xs">
              <XCircle className="w-3 h-3" /> Problems We Solve
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "Only one person has access",
                "Staff can't check stock",
                "Data lost when staff leaves",
                "No way to track changes",
                "Errors go unnoticed",
                "Manual spreadsheets",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-[9px] text-muted-foreground flex items-start gap-1"
                >
                  <span className="text-destructive">•</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-xs">
              <Lightbulb className="w-3 h-3" /> How We Fix It
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "Whole team gets access",
                "Set permissions per role",
                "Data stays with the business",
                "See who changed what",
                "Real-time sync across devices",
                "PIN security for safety",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-[9px] flex items-start gap-1"
                >
                  <span className="text-emerald-500">✓</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-xs">
              <Award className="w-3 h-3" /> Benefits You Get
            </h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                "👥 Team visibility",
                "🔐 Secure access",
                "⚡ Instant updates",
                "📱 Any device",
                "📊 Activity logs",
                "💾 No data loss",
                "🎯 Less errors",
                "⏰ Save time",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Badge variant="outline" className="text-[8px] py-0">{item}</Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    // Mixologist Groups
    {
      id: 2,
      title: "Mixologist Groups",
      subtitle: "Keep Your Recipes Safe",
      icon: <div className="text-4xl">🍸</div>,
      content: (
        <div className="space-y-3">
          <Card className="p-3 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-xs">
              <XCircle className="w-3 h-3" /> Problems We Solve
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "Recipes in people's heads",
                "Lost when staff leaves",
                "Batches inconsistent",
                "No production records",
                "Training takes forever",
                "Scaling errors cost money",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-[9px] text-muted-foreground flex items-start gap-1"
                >
                  <span className="text-destructive">•</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-xs">
              <Lightbulb className="w-3 h-3" /> How We Fix It
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "Central recipe library",
                "Recipes belong to venue",
                "Same result every time",
                "Log every batch made",
                "New staff follow steps",
                "Auto scale any amount",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-[9px] flex items-start gap-1"
                >
                  <span className="text-emerald-500">✓</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-xs">
              <Award className="w-3 h-3" /> Benefits You Get
            </h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                "📚 One library",
                "🔢 Auto scaling",
                "🏷️ QR labels",
                "📝 Batch logs",
                "👨‍🍳 Fast training",
                "🔒 Protected IP",
                "🎯 Consistent",
                "💰 Save money",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Badge variant="outline" className="text-[8px] py-0">{item}</Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    // Procurement
    {
      id: 3,
      title: "Procurement",
      subtitle: "Order Together, Save Together",
      icon: <Package className="w-10 h-10 text-violet-500" />,
      content: (
        <div className="space-y-3">
          <Card className="p-3 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-xs">
              <XCircle className="w-3 h-3" /> Problems We Solve
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "One person does ordering",
                "No one knows what's coming",
                "Orders get forgotten",
                "Receiving not tracked",
                "Costs spiral up",
                "Supplier info not shared",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-[9px] text-muted-foreground flex items-start gap-1"
                >
                  <span className="text-destructive">•</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-xs">
              <Lightbulb className="w-3 h-3" /> How We Fix It
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "Anyone can create orders",
                "See all incoming orders",
                "Approval workflow",
                "Scan items on arrival",
                "Track every dollar spent",
                "Shared supplier database",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-[9px] flex items-start gap-1"
                >
                  <span className="text-emerald-500">✓</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-xs">
              <Award className="w-3 h-3" /> Benefits You Get
            </h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                "👀 Full visibility",
                "📲 Scan receive",
                "✅ Approvals",
                "💰 Cost control",
                "🔄 Auto sync",
                "📋 Supplier list",
                "📊 Spend reports",
                "⏰ Save hours",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Badge variant="outline" className="text-[8px] py-0">{item}</Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    // FIFO
    {
      id: 4,
      title: "FIFO Workspaces",
      subtitle: "Never Miss an Expiry Date",
      icon: <BarChart3 className="w-10 h-10 text-rose-500" />,
      content: (
        <div className="space-y-3">
          <Card className="p-3 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2 text-xs">
              <XCircle className="w-3 h-3" /> Problems We Solve
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "Each shift does it different",
                "Expired food slips through",
                "No waste tracking",
                "Temp logs scattered",
                "Not ready for inspectors",
                "Money thrown away",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-[9px] text-muted-foreground flex items-start gap-1"
                >
                  <span className="text-destructive">•</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2 text-xs">
              <Lightbulb className="w-3 h-3" /> How We Fix It
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {[
                "One system all shifts",
                "Alerts before expiry",
                "Log and analyze waste",
                "Temp checks with time",
                "Instant compliance data",
                "See where waste happens",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-[9px] flex items-start gap-1"
                >
                  <span className="text-emerald-500">✓</span> {item}
                </motion.div>
              ))}
            </div>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/30">
            <h3 className="font-bold text-blue-500 flex items-center gap-2 text-xs">
              <Award className="w-3 h-3" /> Benefits You Get
            </h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                "🔔 Expiry alerts",
                "📊 Waste data",
                "🌡️ Temp logs",
                "✅ Audit ready",
                "👥 Team access",
                "📈 Cut waste",
                "💰 Save money",
                "🛡️ Stay safe",
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                >
                  <Badge variant="outline" className="text-[8px] py-0">{item}</Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      )
    },
    // Why Choose Us
    {
      id: 5,
      title: "Why Choose My Spaces?",
      subtitle: "Built for Real Teams",
      icon: <Target className="w-10 h-10 text-primary" />,
      content: (
        <div className="space-y-2">
          {[
            { icon: "🚀", title: "Set Up in Minutes", desc: "No complicated setup, start right away" },
            { icon: "💪", title: "Works for Any Team Size", desc: "From 2 to 200 people" },
            { icon: "📱", title: "Use on Any Device", desc: "Phone, tablet, or computer" },
            { icon: "🔐", title: "Your Data is Safe", desc: "Secure and encrypted" },
            { icon: "💾", title: "Nothing Gets Lost", desc: "Staff leaves, data stays" },
            { icon: "⚡", title: "See Changes Instantly", desc: "Real-time updates everywhere" },
            { icon: "🎯", title: "Easy to Learn", desc: "No training needed" },
            { icon: "💰", title: "Save Real Money", desc: "Less waste, better control" },
            { icon: "🤝", title: "Better Teamwork", desc: "Everyone on the same page" },
            { icon: "📞", title: "Help When You Need", desc: "Support team ready" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
            >
              <span className="text-lg">{item.icon}</span>
              <div className="flex-1">
                <div className="text-xs font-medium">{item.title}</div>
                <div className="text-[9px] text-muted-foreground">{item.desc}</div>
              </div>
              <CheckCircle className="w-4 h-4 text-primary" />
            </motion.div>
          ))}
        </div>
      )
    },
    // Final CTA
    {
      id: 6,
      title: "Get Started Today",
      subtitle: "Your Team Deserves Better Tools",
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🏪", name: "Stores", points: ["Share stock", "Team access", "Real-time"] },
              { icon: "🍸", name: "Recipes", points: ["Save recipes", "Auto scale", "QR labels"] },
              { icon: "📦", name: "Orders", points: ["Team orders", "Track costs", "Scan receive"] },
              { icon: "📊", name: "FIFO", points: ["Expiry alerts", "Waste logs", "Audit ready"] },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.15, type: "spring" }}
                className="p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <div className="text-2xl mb-1 text-center">{tool.icon}</div>
                <div className="text-sm font-medium text-center">{tool.name}</div>
                <div className="mt-1 space-y-0.5">
                  {tool.points.map((p, j) => (
                    <div key={j} className="text-[8px] text-muted-foreground text-center">✓ {p}</div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-3 bg-primary/5 border-primary/30">
              <div className="text-center space-y-1">
                <p className="text-sm font-bold">
                  Stop losing data. Stop wasting time.
                </p>
                <p className="text-xs text-muted-foreground">
                  Give your team the tools they deserve.
                </p>
              </div>
            </Card>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center"
          >
            <Badge className="text-sm px-6 py-2 bg-primary text-primary-foreground">
              <Zap className="w-4 h-4 mr-2" />
              Try My Spaces Free
            </Badge>
          </motion.div>
        </div>
      )
    },
  ];

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying) {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            return 0;
          }
          return prev + (100 / (SLIDE_DURATION / 100));
        });
      }, 100);

      intervalRef.current = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev >= slides.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          setProgress(0);
          return prev + 1;
        });
      }, SLIDE_DURATION);

      return () => {
        clearInterval(progressInterval);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isPlaying, slides.length]);

  const togglePlay = () => {
    if (currentSlide >= slides.length - 1) {
      setCurrentSlide(0);
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentSlide(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const generatePDF = async () => {
    if (!slideRef.current) return;
    
    setIsPlaying(false);
    setIsGenerating(true);
    toast.info('Generating PDF...');
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const originalSlide = currentSlide;
      
      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        await new Promise(resolve => setTimeout(resolve, 400));
        
        if (slideRef.current) {
          const dataUrl = await toPng(slideRef.current, {
            quality: 1,
            pixelRatio: 2,
          });
          
          const imgWidth = pageWidth - 20;
          const imgHeight = (slideRef.current.offsetHeight * imgWidth) / slideRef.current.offsetWidth;
          
          if (i > 0) pdf.addPage();
          
          pdf.setFillColor(42, 42, 42);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          
          pdf.setFontSize(10);
          pdf.setTextColor(150);
          pdf.text(`${i + 1} / ${slides.length}`, pageWidth / 2, 10, { align: 'center' });
          
          pdf.addImage(dataUrl, 'PNG', 10, 15, imgWidth, Math.min(imgHeight, pageHeight - 25));
        }
      }
      
      setCurrentSlide(originalSlide);
      pdf.save('MySpaces_Presentation.pdf');
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextSlide = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container max-w-lg mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Video Presentation</h1>
            <p className="text-xs text-muted-foreground">My Spaces Overview</p>
          </div>
          <Button 
            onClick={generatePDF}
            disabled={isGenerating}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" />
            {isGenerating ? '...' : 'PDF'}
          </Button>
        </div>

        {/* Video controls */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlay}
            className="flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={restart}
            className="flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <Progress value={isPlaying ? progress : 0} className="h-1.5" />
          </div>
          <span className="text-xs text-muted-foreground w-12 text-right">
            {currentSlide + 1}/{slides.length}
          </span>
        </div>

        {/* Slide indicators */}
        <div className="flex justify-center gap-1 mb-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIsPlaying(false);
                setProgress(0);
                setCurrentSlide(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide 
                  ? 'w-6 bg-primary' 
                  : i < currentSlide
                  ? 'w-1.5 bg-primary/50'
                  : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <Card ref={slideRef} className="p-4 min-h-[480px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Slide header */}
              <div className="text-center mb-4">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="flex justify-center mb-2"
                >
                  {slides[currentSlide].icon}
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-bold"
                >
                  {slides[currentSlide].title}
                </motion.h2>
                {slides[currentSlide].subtitle && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-muted-foreground"
                  >
                    {slides[currentSlide].subtitle}
                  </motion.p>
                )}
              </div>
              
              {/* Slide content */}
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4">
          <Button variant="outline" size="sm" onClick={prevSlide}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={nextSlide}>
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