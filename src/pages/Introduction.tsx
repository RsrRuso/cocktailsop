import { useState } from "react";
import { Download, Users, Zap, Shield, Globe, Heart, Music, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import jsPDF from "jspdf";
import { toast } from "sonner";

const Introduction = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Welcome to SPECVERSE", margin, yPosition);
      yPosition += 15;

      // Subtitle
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Capital & Career Ecosystem for Hospitality Professionals", margin, yPosition);
      yPosition += 20;

      // Vision & Mission
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Our Vision & Mission", margin, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      const visionText = "SPECVERSE is the first proof-of-work platform connecting verified hospitality professionals with investors, career opportunities, and industry recognition. We're building a revolutionary ecosystem where talent meets capital, skills earn recognition, and professionals grow together.";
      const visionLines = doc.splitTextToSize(visionText, contentWidth);
      doc.text(visionLines, margin, yPosition);
      yPosition += (visionLines.length * 7) + 10;

      // Inspiration
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("The Inspiration", margin, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      const inspText = "Born from the need to professionalize the hospitality industry, SPECVERSE bridges the gap between talented professionals and the resources they need to thrive. We believe in verified credentials, measurable achievements, and connecting passionate individuals with opportunities that match their expertise.";
      const inspLines = doc.splitTextToSize(inspText, contentWidth);
      doc.text(inspLines, margin, yPosition);
      yPosition += (inspLines.length * 7) + 10;

      // Key Features
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Features", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      const features = [
        { icon: "•", title: "Verified Professional Network:", desc: "Connect with verified bartenders, mixologists, venue owners, investors, and hospitality professionals." },
        { icon: "•", title: "Career Portfolio:", desc: "Showcase your experience, certifications, competitions, recognitions, and professional achievements." },
        { icon: "•", title: "Social Content Sharing:", desc: "Post photos, videos, stories, and reels showcasing your creations, events, and professional journey." },
        { icon: "•", title: "Music & Events:", desc: "Share music, create events, manage attendance, and discover industry competitions and networking opportunities." },
        { icon: "•", title: "Direct Messaging:", desc: "Private conversations with emoji reactions, media sharing, voice notes, and message management." },
        { icon: "•", title: "Regional Discovery:", desc: "Filter and discover content, professionals, and opportunities in your specific region via Thunder page." },
        { icon: "•", title: "Advanced Reports:", desc: "Sales reports, inventory valuation, variance analysis, pour cost reports, waste tracking, and compliance logs." },
        { icon: "•", title: "Mixing Calculators:", desc: "Batch calculator, ABV calculator, scaling tool, and dilution calculator for precise recipes." },
        { icon: "•", title: "Inventory Management:", desc: "Full inventory control, cost calculator, pour cost analysis, wastage tracker, stock audit, and yield calculator." },
        { icon: "•", title: "Business Tools:", desc: "Recipe vault, menu engineering, cocktail specs, sales analytics, and staff scheduling." },
        { icon: "•", title: "Investment Opportunities:", desc: "Connect with investors and access funding opportunities to grow your career or venue." },
        { icon: "•", title: "Proof-of-Work System:", desc: "Build credibility through verified achievements, badges, and measurable professional milestones." }
      ];

      features.forEach(feature => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(feature.icon + " " + feature.title, margin + 5, yPosition);
        yPosition += 6;
        
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(feature.desc, contentWidth - 10);
        doc.text(descLines, margin + 10, yPosition);
        yPosition += (descLines.length * 5) + 5;
      });

      // Who It's For
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Who Is SPECVERSE For?", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const audience = [
        "Bartenders & Mixologists - Build your portfolio and connect with venues",
        "Bar Managers & Owners - Access tools, talent, and investment opportunities",
        "Hospitality Professionals - Grow your career with verified credentials",
        "Investors - Discover and fund talented professionals and venues",
        "Event Organizers - Promote competitions and industry events",
        "Brand Ambassadors - Connect with venues and professionals",
        "Industry Suppliers - Network with potential clients",
        "Hospitality Students - Learn, network, and launch your career",
        "Venue Operators - Manage operations with professional tools"
      ];

      audience.forEach(role => {
        doc.text("• " + role, margin + 5, yPosition);
        yPosition += 7;
      });

      // Getting Started
      yPosition += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Getting Started", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const steps = [
        "1. Create Your Verified Profile: Set up your profile with experience, certifications, competitions, and achievements. Get venue verified.",
        "2. Build Your Portfolio: Add your work history, specialties, recognition, and measurable career metrics.",
        "3. Connect & Network: Follow industry professionals, venues, brands, and investors.",
        "4. Share Your Work: Post photos, videos, stories, and reels of your creations, events, and professional journey.",
        "5. Engage with Community: Like, comment, share, and repost content. Join conversations via direct messaging.",
        "6. Use Professional Tools: Access batch calculators, recipe vault, inventory management, cost analysis, and reporting tools.",
        "7. Discover Opportunities: Explore events, competitions, investment opportunities, and job openings in your region.",
        "8. Manage Your Business: Utilize sales reports, menu engineering, staff scheduling, and operational analytics.",
        "9. Track Your Growth: Monitor career metrics, achievements, and build proof-of-work credentials.",
        "10. Connect with Capital: Showcase your skills to attract investors and funding for your ventures."
      ];

      steps.forEach(step => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        const stepLines = doc.splitTextToSize(step, contentWidth);
        doc.text(stepLines, margin + 5, yPosition);
        yPosition += (stepLines.length * 6) + 4;
      });

      // Footer
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      yPosition += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Join SPECVERSE today and become part of the revolutionary", margin, yPosition);
      yPosition += 5;
      doc.text("Capital & Career Ecosystem for hospitality professionals!", margin, yPosition);
      
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.text("© 2025 SPECVERSE. All rights reserved.", margin, yPosition);

      // Save the PDF
      doc.save("SPECVERSE-Introduction.pdf");
      toast.success("Introduction guide downloaded successfully!");
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Welcome to SPECVERSE
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Capital & Career Ecosystem for Hospitality Professionals
          </p>
          <Button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            size="lg"
            className="glass-hover gap-2"
          >
            <Download className="w-5 h-5" />
            {isGenerating ? "Generating..." : "Download Introduction (PDF)"}
          </Button>
        </div>

        {/* What is SPECVERSE */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            What is SPECVERSE?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            SPECVERSE is the first proof-of-work platform connecting verified hospitality professionals with investors, 
            career opportunities, and industry recognition. We're revolutionizing how talent meets capital in hospitality—combining 
            social networking, professional tools, business management, and investment opportunities in one comprehensive ecosystem.
          </p>
        </Card>

        {/* Vision & Goals */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">Our Vision & Goals</h2>
          <div className="space-y-3">
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Vision:</strong> To create a global ecosystem where hospitality professionals 
              can build verified careers, access capital, and receive recognition for their skills and achievements.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Goal:</strong> Bridge the gap between talent and opportunity by providing 
              a platform where skills are verified, achievements are recognized, and professionals can connect with the resources 
              they need to grow—from investors to tools to networking opportunities.
            </p>
          </div>
        </Card>

        {/* The Inspiration */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">The Inspiration</h2>
          <p className="text-muted-foreground leading-relaxed">
            Born from witnessing the untapped potential in the hospitality industry, SPECVERSE emerged from a simple truth: 
            talented bartenders, mixologists, and hospitality professionals often lack access to capital, recognition systems, 
            and professional development tools. We saw an industry where skill and passion existed in abundance, but opportunities 
            for growth were scattered and inaccessible. SPECVERSE brings structure to chaos—creating a verified, measurable, 
            and connected ecosystem where hard work translates to tangible career advancement and financial opportunities.
          </p>
        </Card>

        {/* Key Features - Comprehensive */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Comprehensive Feature Set</h2>
          
          {/* Social & Network Features */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-primary">Social & Networking</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h4 className="font-semibold">Verified Professional Network</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect with verified bartenders, mixologists, venue owners, investors, and professionals worldwide.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <h4 className="font-semibold">Portfolio & Achievements</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Showcase experience, certifications, competitions, recognitions, and career metrics.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-pink-500" />
                  <h4 className="font-semibold">Posts, Stories & Reels</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share photos, videos, stories, and short-form reels of your creations and professional journey.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-500" />
                  <h4 className="font-semibold">Direct Messaging</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Private conversations with emoji reactions, voice notes, media sharing, and message management.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold">Music & Events</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share music via Spotify, create events, manage attendance, and discover competitions.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold">Regional Discovery (Thunder)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Filter and discover content, professionals, and opportunities by specific region.
                </p>
              </Card>
            </div>
          </div>

          {/* Professional Tools - Reports */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-primary">Advanced Reporting & Analytics</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold text-sm">Sales Reports</h4>
                <p className="text-xs text-muted-foreground">
                  Comprehensive sales analysis with revenue, margins, and category breakdowns (PDF export).
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold text-sm">Inventory Valuation</h4>
                <p className="text-xs text-muted-foreground">
                  Calculate total inventory value by category for financial reporting.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold text-sm">Variance Reports</h4>
                <p className="text-xs text-muted-foreground">
                  Expected vs actual usage analysis to identify waste, theft, and efficiency issues.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold text-sm">Pour Cost Reports</h4>
                <p className="text-xs text-muted-foreground">
                  Monitor pour cost percentages to improve margins and pricing strategies.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold text-sm">Waste Analysis</h4>
                <p className="text-xs text-muted-foreground">
                  Track wastage by category, reason, and cost impact to reduce losses.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold text-sm">Temperature Compliance</h4>
                <p className="text-xs text-muted-foreground">
                  Export temperature logs for HACCP compliance and health inspections.
                </p>
              </Card>
            </div>
          </div>

          {/* Mixing & Recipe Tools */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-primary">Mixing & Recipe Calculators</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Batch Calculator Pro</h4>
                <p className="text-sm text-muted-foreground">
                  Calculate precise batch quantities for any recipe. Perfect for scaling cocktails and production.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">ABV Calculator</h4>
                <p className="text-sm text-muted-foreground">
                  Determine final alcohol by volume for any cocktail or batch with ingredient ABVs and volumes.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Scaling Tool</h4>
                <p className="text-sm text-muted-foreground">
                  Scale recipes up or down instantly. Convert single serves to batch production with perfect ratios.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Recipe Vault</h4>
                <p className="text-sm text-muted-foreground">
                  Secure digital recipe book. Store specs, batch recipes, production notes with tags and categories.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Cocktail Specs</h4>
                <p className="text-sm text-muted-foreground">
                  Create and share standardized recipes with exact specs, techniques, glassware, and garnishes.
                </p>
              </Card>
            </div>
          </div>

          {/* Inventory & Cost Management */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-primary">Inventory & Cost Management</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Inventory Manager</h4>
                <p className="text-sm text-muted-foreground">
                  Full control system. Track stock levels, expiration dates, transfers between locations, and stores.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Cost Calculator</h4>
                <p className="text-sm text-muted-foreground">
                  Calculate exact recipe costs, suggested pricing, and profit margins with ingredient prices.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Pour Cost Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Track and analyze pour cost percentages for all drinks to optimize pricing and margins.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Wastage Tracker</h4>
                <p className="text-sm text-muted-foreground">
                  Log and analyze waste by category and reason. Identify patterns to reduce operational costs.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Stock Audit</h4>
                <p className="text-sm text-muted-foreground">
                  Compare expected vs actual stock. Identify discrepancies, calculate shrinkage, maintain records.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Yield Calculator</h4>
                <p className="text-sm text-muted-foreground">
                  Calculate usable yield after prep and waste. Determine true ingredient costs and percentages.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Temperature Log</h4>
                <p className="text-sm text-muted-foreground">
                  HACCP compliance. Log fridge/freezer temps, set alerts, maintain audit-ready records.
                </p>
              </Card>
            </div>
          </div>

          {/* Business Management */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-primary">Business Management Tools</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Menu Engineering</h4>
                <p className="text-sm text-muted-foreground">
                  Analyze menu items using menu matrix. Identify Stars, Plowhorses, Puzzles, and Dogs for data-driven decisions.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Sales Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  View top sellers, sales by category, time-based trends, and revenue analytics to inform menu choices.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Investment Opportunities</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with investors seeking to fund talented professionals and promising venues in hospitality.
                </p>
              </Card>

              <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
                <h4 className="font-semibold">Proof-of-Work System</h4>
                <p className="text-sm text-muted-foreground">
                  Build credibility through verified achievements, industry badges, and measurable professional milestones.
                </p>
              </Card>
            </div>
          </div>
        </div>

        {/* Who It's For */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">Who Is SPECVERSE For?</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Bartenders & Mixologists - Build portfolio and connect with venues",
              "Bar Managers & Owners - Access tools, talent, and investment",
              "Hospitality Professionals - Grow career with verified credentials",
              "Investors - Discover and fund talented professionals and venues",
              "Event Organizers - Promote competitions and industry events",
              "Brand Ambassadors - Connect with venues and professionals",
              "Industry Suppliers - Network with potential clients",
              "Hospitality Students - Learn, network, and launch career",
              "Venue Operators - Manage operations with professional tools"
            ].map((role, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span className="text-muted-foreground text-sm">{role}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Getting Started */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">Getting Started</h2>
          <ol className="space-y-3">
            {[
              { num: 1, text: "Create Your Verified Profile: Set up profile with experience, certifications, competitions, and achievements. Get venue verified." },
              { num: 2, text: "Build Your Portfolio: Add work history, specialties, recognition, and measurable career metrics." },
              { num: 3, text: "Connect & Network: Follow industry professionals, venues, brands, and investors." },
              { num: 4, text: "Share Your Work: Post photos, videos, stories, and reels of your creations and professional journey." },
              { num: 5, text: "Engage with Community: Like, comment, share, and repost. Join conversations via messaging." },
              { num: 6, text: "Use Professional Tools: Access calculators, recipe vault, inventory management, cost analysis, and reports." },
              { num: 7, text: "Discover Opportunities: Explore events, competitions, investment opportunities, and jobs in your region." },
              { num: 8, text: "Manage Your Business: Utilize sales reports, menu engineering, staff scheduling, and analytics." },
              { num: 9, text: "Track Your Growth: Monitor career metrics, achievements, and build proof-of-work credentials." },
              { num: 10, text: "Connect with Capital: Showcase skills to attract investors and funding for your ventures." }
            ].map((step) => (
              <li key={step.num} className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {step.num}
                </span>
                <span className="text-muted-foreground pt-1 text-sm">{step.text}</span>
              </li>
            ))}
          </ol>
        </Card>

        {/* Call to Action */}
        <Card className="glass p-8 text-center space-y-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10">
          <h2 className="text-2xl font-bold">Join SPECVERSE Today!</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Become part of the revolutionary Capital & Career Ecosystem for hospitality professionals. 
            Build your verified portfolio, access professional tools, connect with investors, and unlock opportunities 
            that match your skills and ambitions.
          </p>
          <Button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            size="lg"
            className="gap-2"
          >
            <Download className="w-5 h-5" />
            {isGenerating ? "Generating..." : "Download Full Guide"}
          </Button>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Introduction;
