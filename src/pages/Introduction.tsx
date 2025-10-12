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
      doc.text("Welcome to Thunder Social", margin, yPosition);
      yPosition += 15;

      // Subtitle
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("A Professional Social Network for the Hospitality Industry", margin, yPosition);
      yPosition += 20;

      // Introduction
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("What is Thunder?", margin, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      const introText = "Thunder is a specialized social media platform designed exclusively for hospitality professionals, bartenders, and industry enthusiasts. Connect with peers, share your craft, discover opportunities, and grow your career in the vibrant world of hospitality.";
      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, margin, yPosition);
      yPosition += (introLines.length * 7) + 10;

      // Key Features
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Features", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      const features = [
        { icon: "•", title: "Professional Networking:", desc: "Connect with bartenders, mixologists, venue owners, and hospitality professionals worldwide." },
        { icon: "•", title: "Share Your Craft:", desc: "Post photos, videos, and stories showcasing your creations, events, and professional journey." },
        { icon: "•", title: "Thunder Reels:", desc: "Short-form video content to showcase cocktail making, flair techniques, and behind-the-scenes moments." },
        { icon: "•", title: "Music Integration:", desc: "Share and discover music that sets the perfect atmosphere for your venue or event." },
        { icon: "•", title: "Events & Competitions:", desc: "Stay updated on industry events, competitions, and networking opportunities in your region." },
        { icon: "•", title: "Direct Messaging:", desc: "Private conversations with emoji reactions, media sharing, and message management." },
        { icon: "•", title: "Regional Filtering:", desc: "Discover content and connect with professionals in your specific region." },
        { icon: "•", title: "Professional Tools:", desc: "Access calculators, recipe vaults, inventory management, and operational tools designed for hospitality." }
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
      doc.text("Who Is Thunder For?", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const audience = [
        "Bartenders & Mixologists",
        "Bar Managers & Owners",
        "Hospitality Professionals",
        "Event Organizers",
        "Brand Ambassadors",
        "Industry Suppliers",
        "Hospitality Students"
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
        "1. Create Your Profile: Set up your professional profile with your experience, specialties, and achievements.",
        "2. Connect & Follow: Find and follow industry professionals, venues, and brands you admire.",
        "3. Share Your Work: Post photos and videos of your creations, events, and daily professional life.",
        "4. Engage: Like, comment, and share content that inspires you.",
        "5. Explore Tools: Access professional calculators and management tools to enhance your work.",
        "6. Stay Updated: Keep track of events, competitions, and opportunities in your region."
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
      doc.text("Join Thunder today and become part of the world's fastest-growing", margin, yPosition);
      yPosition += 5;
      doc.text("hospitality social network!", margin, yPosition);
      
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.text("© 2025 Thunder Social. All rights reserved.", margin, yPosition);

      // Save the PDF
      doc.save("Thunder-Social-Introduction.pdf");
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
            Welcome to Thunder Social
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A Professional Social Network for the Hospitality Industry
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

        {/* What is Thunder */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            What is Thunder?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Thunder is a specialized social media platform designed exclusively for hospitality professionals, 
            bartenders, and industry enthusiasts. Connect with peers, share your craft, discover opportunities, 
            and grow your career in the vibrant world of hospitality.
          </p>
        </Card>

        {/* Key Features */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Key Features</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">Professional Networking</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect with bartenders, mixologists, venue owners, and hospitality professionals worldwide.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold">Share Your Craft</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Post photos, videos, and stories showcasing your creations, events, and professional journey.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-pink-500" />
                <h3 className="font-semibold">Thunder Reels</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Short-form video content to showcase cocktail making, flair techniques, and behind-the-scenes moments.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Music Integration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Share and discover music that sets the perfect atmosphere for your venue or event.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Events & Competitions</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Stay updated on industry events, competitions, and networking opportunities in your region.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-500" />
                <h3 className="font-semibold">Direct Messaging</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Private conversations with emoji reactions, media sharing, and message management.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold">Regional Filtering</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Discover content and connect with professionals in your specific region.
              </p>
            </Card>

            <Card className="glass p-5 space-y-2 hover:glass-hover transition-all">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold">Professional Tools</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Access calculators, recipe vaults, inventory management, and operational tools.
              </p>
            </Card>
          </div>
        </div>

        {/* Who It's For */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">Who Is Thunder For?</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              "Bartenders & Mixologists",
              "Bar Managers & Owners",
              "Hospitality Professionals",
              "Event Organizers",
              "Brand Ambassadors",
              "Industry Suppliers",
              "Hospitality Students"
            ].map((role, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">{role}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Getting Started */}
        <Card className="glass p-6 space-y-4">
          <h2 className="text-2xl font-bold">Getting Started</h2>
          <ol className="space-y-3">
            {[
              { num: 1, text: "Create Your Profile: Set up your professional profile with your experience, specialties, and achievements." },
              { num: 2, text: "Connect & Follow: Find and follow industry professionals, venues, and brands you admire." },
              { num: 3, text: "Share Your Work: Post photos and videos of your creations, events, and daily professional life." },
              { num: 4, text: "Engage: Like, comment, and share content that inspires you." },
              { num: 5, text: "Explore Tools: Access professional calculators and management tools to enhance your work." },
              { num: 6, text: "Stay Updated: Keep track of events, competitions, and opportunities in your region." }
            ].map((step) => (
              <li key={step.num} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {step.num}
                </span>
                <span className="text-muted-foreground pt-1">{step.text}</span>
              </li>
            ))}
          </ol>
        </Card>

        {/* Call to Action */}
        <Card className="glass p-8 text-center space-y-4 bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10">
          <h2 className="text-2xl font-bold">Join Thunder Today!</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Become part of the world's fastest-growing hospitality social network. 
            Connect, create, and thrive in your hospitality career.
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
