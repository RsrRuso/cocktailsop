import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ChevronLeft, ChevronRight, Presentation as PresentationIcon, Users, Store, Utensils, Package, BarChart3, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
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
      title: "Space Doors",
      subtitle: "Workspaces & Groups",
      icon: <div className="text-6xl">🚪</div>,
      content: (
        <div className="text-center space-y-6">
          <p className="text-xl text-muted-foreground">
            A unified system for team collaboration
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {['🏪', '🍸', '👥', '📦', '📊'].map((icon, i) => (
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
      title: "My Spaces Overview",
      icon: <PresentationIcon className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-6">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Users belong to multiple workspaces, groups, and teams</li>
              <li>• No central view of all memberships</li>
              <li>• No visibility into who's online or active</li>
              <li>• Difficult to manage which spaces are visible</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Solution
            </h3>
            <p className="mt-2 text-sm">
              <strong>Space Doors</strong> - Instagram-style circular doors showing all collaborative spaces with real-time presence indicators.
            </p>
          </Card>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-primary/10">
              <div className="font-bold">Instant Overview</div>
              <div className="text-muted-foreground">All spaces at a glance</div>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <div className="font-bold">Real-Time</div>
              <div className="text-muted-foreground">See who's online</div>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <div className="font-bold">One Tap</div>
              <div className="text-muted-foreground">Quick access</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Store Management Workspaces",
      icon: <Store className="w-12 h-12 text-emerald-500" />,
      content: (
        <div className="space-y-6">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Personal inventory mixed with team inventory</li>
              <li>• No way to share stores with team members</li>
              <li>• Single user access creates bottlenecks</li>
              <li>• No role-based permissions</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Solution
            </h3>
            <p className="mt-2 text-sm">
              Collaborative spaces where teams share stores, inventory, and data with role-based access control and PIN security.
            </p>
          </Card>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">🏪 Shared Stores</Badge>
            <Badge variant="outline">🔐 PIN Access</Badge>
            <Badge variant="outline">📊 Activity Logs</Badge>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Mixologist Groups",
      icon: <div className="text-5xl">🍸</div>,
      content: (
        <div className="space-y-6">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Batch recipes scattered across individuals</li>
              <li>• No way to share recipes with team</li>
              <li>• Production tracking fragmented</li>
              <li>• Knowledge silos when staff leaves</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Solution
            </h3>
            <p className="mt-2 text-sm">
              Dedicated spaces for bar teams to share batch recipes, track production, and collaborate on cocktail development.
            </p>
          </Card>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline">📖 Shared Recipes</Badge>
            <Badge variant="outline">🏭 Production Tracking</Badge>
            <Badge variant="outline">📱 QR Production</Badge>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Teams",
      icon: <Users className="w-12 h-12 text-blue-500" />,
      content: (
        <div className="space-y-6">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Tasks managed individually</li>
              <li>• No shared calendar or scheduling</li>
              <li>• Communication scattered</li>
              <li>• Project files in multiple places</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Solution
            </h3>
            <p className="mt-2 text-sm">
              Collaborative project management with shared tasks, calendar, chat channels, and document storage.
            </p>
          </Card>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline">✅ Shared Tasks</Badge>
            <Badge variant="outline">📅 Team Calendar</Badge>
            <Badge variant="outline">💬 Chat Channels</Badge>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Procurement Workspaces",
      icon: <Package className="w-12 h-12 text-violet-500" />,
      content: (
        <div className="space-y-6">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Purchase orders managed by single person</li>
              <li>• No visibility into ordering status</li>
              <li>• Receiving not tracked systematically</li>
              <li>• Supplier relationships not shared</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Solution
            </h3>
            <p className="mt-2 text-sm">
              Shared purchasing management for supplier orders, receiving workflows, and automatic inventory sync.
            </p>
          </Card>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline">📋 Shared POs</Badge>
            <Badge variant="outline">📦 Scan Receiving</Badge>
            <Badge variant="outline">💰 Cost Tracking</Badge>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "FIFO Workspaces",
      icon: <BarChart3 className="w-12 h-12 text-rose-500" />,
      content: (
        <div className="space-y-6">
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <h3 className="font-bold text-destructive flex items-center gap-2">
              <XCircle className="w-5 h-5" /> Problem
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• FIFO tracking individual to each user</li>
              <li>• No shared expiration monitoring</li>
              <li>• Wastage data not aggregated</li>
              <li>• Temperature logs scattered</li>
            </ul>
          </Card>
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <h3 className="font-bold text-emerald-500 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Solution
            </h3>
            <p className="mt-2 text-sm">
              Team-based first-in-first-out inventory tracking with shared expiration monitoring and waste analysis.
            </p>
          </Card>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline">📊 Shared FIFO</Badge>
            <Badge variant="outline">⏰ Expiry Alerts</Badge>
            <Badge variant="outline">🗑️ Waste Tracking</Badge>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "UI Interaction Guide",
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
      id: 8,
      title: "Space Types Reference",
      content: (
        <div className="space-y-3">
          {[
            { icon: "🏪", name: "Store Management", color: "bg-emerald-500/20 text-emerald-500" },
            { icon: "🍸", name: "Mixologist Group", color: "bg-amber-500/20 text-amber-500" },
            { icon: "👥", name: "Team", color: "bg-blue-500/20 text-blue-500" },
            { icon: "📦", name: "Procurement", color: "bg-violet-500/20 text-violet-500" },
            { icon: "📊", name: "FIFO", color: "bg-rose-500/20 text-rose-500" },
          ].map((type, i) => (
            <motion.div
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
            >
              <div className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center text-2xl`}>
                {type.icon}
              </div>
              <span className="font-medium">{type.name}</span>
            </motion.div>
          ))}
        </div>
      )
    },
    {
      id: 9,
      title: "Summary",
      icon: <CheckCircle className="w-12 h-12 text-primary" />,
      content: (
        <div className="space-y-6">
          <p className="text-center text-muted-foreground">
            Space Doors transforms how teams collaborate
          </p>
          <div className="grid gap-3">
            {[
              "Unified Access - All spaces in one interface",
              "Real-Time Awareness - See who's online",
              "Role-Based Security - Right access for each member",
              "Seamless Navigation - One tap to any workspace",
              "Flexible Organization - Hide, restore, customize",
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/10"
              >
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{item}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Teams work faster, stay aligned, and maintain visibility.
          </p>
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
      pdf.text('Space Doors', pageWidth / 2, 60, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setTextColor(100);
      pdf.text('Workspaces & Groups', pageWidth / 2, 75, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setTextColor(150);
      pdf.text('Team Presentation Guide', pageWidth / 2, 90, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text('December 2024', pageWidth / 2, pageHeight - 30, { align: 'center' });

      // Content pages
      const sections = [
        {
          title: 'My Spaces Overview',
          problem: [
            'Users belong to multiple workspaces, groups, and teams',
            'No central view of all memberships',
            'No visibility into who\'s online or active',
            'Difficult to manage which spaces are visible'
          ],
          solution: 'Space Doors - Instagram-style circular doors showing all collaborative spaces with real-time presence indicators.',
          benefits: ['Instant Overview', 'Real-Time Presence', 'One Tap Access']
        },
        {
          title: 'Store Management Workspaces',
          problem: [
            'Personal inventory mixed with team inventory',
            'No way to share stores with team members',
            'Single user access creates bottlenecks',
            'No role-based permissions'
          ],
          solution: 'Collaborative spaces where teams share stores, inventory, and data with role-based access control and PIN security.',
          benefits: ['Shared Stores', 'PIN Access', 'Activity Logs']
        },
        {
          title: 'Mixologist Groups',
          problem: [
            'Batch recipes scattered across individuals',
            'No way to share recipes with team',
            'Production tracking fragmented',
            'Knowledge silos when staff leaves'
          ],
          solution: 'Dedicated spaces for bar teams to share batch recipes, track production, and collaborate on cocktail development.',
          benefits: ['Shared Recipes', 'Production Tracking', 'QR Production']
        },
        {
          title: 'Teams',
          problem: [
            'Tasks managed individually',
            'No shared calendar or scheduling',
            'Communication scattered',
            'Project files in multiple places'
          ],
          solution: 'Collaborative project management with shared tasks, calendar, chat channels, and document storage.',
          benefits: ['Shared Tasks', 'Team Calendar', 'Chat Channels']
        },
        {
          title: 'Procurement Workspaces',
          problem: [
            'Purchase orders managed by single person',
            'No visibility into ordering status',
            'Receiving not tracked systematically',
            'Supplier relationships not shared'
          ],
          solution: 'Shared purchasing management for supplier orders, receiving workflows, and automatic inventory sync.',
          benefits: ['Shared POs', 'Scan Receiving', 'Cost Tracking']
        },
        {
          title: 'FIFO Workspaces',
          problem: [
            'FIFO tracking individual to each user',
            'No shared expiration monitoring',
            'Wastage data not aggregated',
            'Temperature logs scattered'
          ],
          solution: 'Team-based first-in-first-out inventory tracking with shared expiration monitoring and waste analysis.',
          benefits: ['Shared FIFO', 'Expiry Alerts', 'Waste Tracking']
        }
      ];

      sections.forEach((section, index) => {
        pdf.addPage();
        let y = margin;

        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(99, 102, 241);
        pdf.text(section.title, margin, y);
        y += 15;

        // Problem
        pdf.setFontSize(14);
        pdf.setTextColor(220, 38, 38);
        pdf.text('Problem', margin, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(80);
        section.problem.forEach(item => {
          pdf.text(`• ${item}`, margin + 5, y);
          y += 6;
        });
        y += 8;

        // Solution
        pdf.setFontSize(14);
        pdf.setTextColor(34, 197, 94);
        pdf.text('Solution', margin, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(80);
        const solutionLines = pdf.splitTextToSize(section.solution, pageWidth - margin * 2);
        pdf.text(solutionLines, margin + 5, y);
        y += solutionLines.length * 5 + 10;

        // Benefits
        pdf.setFontSize(14);
        pdf.setTextColor(99, 102, 241);
        pdf.text('Benefits', margin, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(80);
        pdf.text(section.benefits.join('  •  '), margin + 5, y);
      });

      // Summary page
      pdf.addPage();
      pdf.setFontSize(20);
      pdf.setTextColor(99, 102, 241);
      pdf.text('Summary', margin, margin);

      const summaryItems = [
        'Unified Access - All spaces in one interface',
        'Real-Time Awareness - See who\'s online',
        'Role-Based Security - Right access for each member',
        'Seamless Navigation - One tap to any workspace',
        'Flexible Organization - Hide, restore, customize'
      ];

      pdf.setFontSize(11);
      pdf.setTextColor(80);
      let summaryY = margin + 20;
      summaryItems.forEach(item => {
        pdf.text(`✓ ${item}`, margin, summaryY);
        summaryY += 10;
      });

      pdf.save('Space_Doors_Presentation.pdf');
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PresentationIcon className="w-6 h-6 text-primary" />
            Presentation
          </h1>
          <Button onClick={generatePDF} disabled={isGenerating} className="gap-2">
            <Download className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>

        {/* Slide Counter */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Slide Content */}
        <Card className="p-6 min-h-[60vh] flex flex-col">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            <div className="text-center mb-6">
              {slides[currentSlide].icon && (
                <div className="flex justify-center mb-4">
                  {slides[currentSlide].icon}
                </div>
              )}
              <h2 className="text-2xl font-bold">{slides[currentSlide].title}</h2>
              {slides[currentSlide].subtitle && (
                <p className="text-muted-foreground mt-1">{slides[currentSlide].subtitle}</p>
              )}
            </div>
            
            <div className="mt-6">
              {slides[currentSlide].content}
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={prevSlide} disabled={currentSlide === 0}>
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button variant="ghost" onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Presentation;
