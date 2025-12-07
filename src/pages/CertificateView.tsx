import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Download, 
  Share2, 
  ChevronLeft,
  CheckCircle,
  Calendar,
  GraduationCap,
  Shield,
  Sparkles,
  Star
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const CertificateView = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const { data: certificate, isLoading, error } = useQuery({
    queryKey: ['certificate', certificateId],
    queryFn: async () => {
      const { data: cert, error: certError } = await supabase
        .from('exam_certificates')
        .select(`
          *,
          exam_categories(*),
          exam_badge_levels(*)
        `)
        .eq('id', certificateId)
        .single();
      
      if (certError) {
        console.error('Certificate fetch error:', certError);
        throw certError;
      }
      
      let profile = null;
      if (cert?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url')
          .eq('id', cert.user_id)
          .single();
        profile = profileData;
      }
      
      return { ...cert, profiles: profile };
    },
    enabled: !!certificateId,
    retry: 1
  });

  const getBadgeGradient = (name: string) => {
    const gradients: Record<string, string> = {
      'Bronze': 'from-amber-700 via-amber-500 to-amber-800',
      'Silver': 'from-slate-400 via-slate-200 to-slate-500',
      'Gold': 'from-yellow-500 via-yellow-300 to-amber-500',
      'Platinum': 'from-slate-300 via-white to-slate-400',
      'Diamond': 'from-cyan-400 via-blue-300 to-purple-500'
    };
    return gradients[name] || 'from-primary to-purple-500';
  };

  const getBadgeAccent = (name: string) => {
    const accents: Record<string, string> = {
      'Bronze': 'border-amber-500 shadow-amber-500/30',
      'Silver': 'border-slate-300 shadow-slate-400/30',
      'Gold': 'border-yellow-400 shadow-yellow-400/40',
      'Platinum': 'border-slate-200 shadow-white/30',
      'Diamond': 'border-cyan-400 shadow-cyan-400/40'
    };
    return accents[name] || 'border-primary shadow-primary/30';
  };

  const getBadgeColors = (name: string) => {
    const colors: Record<string, { primary: number[], secondary: number[] }> = {
      'Bronze': { primary: [180, 83, 9], secondary: [245, 158, 11] },
      'Silver': { primary: [148, 163, 184], secondary: [226, 232, 240] },
      'Gold': { primary: [234, 179, 8], secondary: [253, 224, 71] },
      'Platinum': { primary: [203, 213, 225], secondary: [241, 245, 249] },
      'Diamond': { primary: [34, 211, 238], secondary: [168, 85, 247] }
    };
    return colors[name] || { primary: [59, 130, 246], secondary: [168, 85, 247] };
  };

  const generatePDF = () => {
    if (!certificate) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const profile = certificate.profiles as any;
    const badgeLevel = certificate.exam_badge_levels;
    const category = certificate.exam_categories;
    const badgeColors = getBadgeColors(badgeLevel?.name || '');

    // Dark premium background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Subtle pattern overlay
    doc.setFillColor(30, 41, 59);
    for (let x = 0; x < pageWidth; x += 8) {
      for (let y = 0; y < pageHeight; y += 8) {
        doc.circle(x, y, 0.3, 'F');
      }
    }

    // Gradient border frame
    doc.setDrawColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.setLineWidth(3);
    doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 4, 4);
    
    // Inner decorative frame
    doc.setDrawColor(badgeColors.secondary[0], badgeColors.secondary[1], badgeColors.secondary[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3);

    // Corner flourishes
    const drawCornerFlourish = (x: number, y: number, rotation: number) => {
      doc.setDrawColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
      doc.setLineWidth(1);
      const size = 15;
      
      doc.saveGraphicsState();
      if (rotation === 0) {
        doc.line(x, y + size, x, y);
        doc.line(x, y, x + size, y);
      } else if (rotation === 90) {
        doc.line(x - size, y, x, y);
        doc.line(x, y, x, y + size);
      } else if (rotation === 180) {
        doc.line(x, y - size, x, y);
        doc.line(x, y, x - size, y);
      } else if (rotation === 270) {
        doc.line(x + size, y, x, y);
        doc.line(x, y, x, y - size);
      }
      doc.restoreGraphicsState();
    };

    drawCornerFlourish(18, 18, 0);
    drawCornerFlourish(pageWidth - 18, 18, 90);
    drawCornerFlourish(pageWidth - 18, pageHeight - 18, 180);
    drawCornerFlourish(18, pageHeight - 18, 270);

    // Top ribbon with gradient effect
    doc.setFillColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.roundedRect(pageWidth / 2 - 80, 15, 160, 28, 2, 2, 'F');

    // Certificate title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('CERTIFICATE OF EXCELLENCE', pageWidth / 2, 32, { align: 'center' });

    // SpecVerse branding
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text('SPECVERSE PROFESSIONAL CERTIFICATION', pageWidth / 2, 39, { align: 'center' });

    // Award icon placeholder (decorative circle)
    doc.setFillColor(badgeColors.secondary[0], badgeColors.secondary[1], badgeColors.secondary[2]);
    doc.circle(pageWidth / 2, 58, 8, 'F');
    doc.setFillColor(15, 23, 42);
    doc.circle(pageWidth / 2, 58, 6, 'F');
    doc.setTextColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('★', pageWidth / 2, 60, { align: 'center' });

    // "This is to certify that"
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(148, 163, 184);
    doc.text('This is to certify that', pageWidth / 2, 75, { align: 'center' });

    // Recipient name - large and prominent
    const recipientName = profile?.full_name || profile?.username || 'SpecVerse Professional';
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text(recipientName, pageWidth / 2, 90, { align: 'center' });

    // Decorative line under name
    doc.setDrawColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.setLineWidth(0.8);
    const nameWidth = doc.getTextWidth(recipientName);
    doc.line(pageWidth / 2 - nameWidth / 2 - 10, 94, pageWidth / 2 + nameWidth / 2 + 10, 94);

    // Achievement description
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184);
    doc.text('has successfully demonstrated outstanding proficiency in', pageWidth / 2, 105, { align: 'center' });

    // Category name
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(category?.name || 'Professional Excellence', pageWidth / 2, 118, { align: 'center' });

    // Badge level with decorative box
    const badgeName = `${badgeLevel?.name || 'Professional'} Achievement`;
    doc.setFillColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    const badgeWidth = 70;
    doc.roundedRect(pageWidth / 2 - badgeWidth / 2, 124, badgeWidth, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeName.toUpperCase(), pageWidth / 2, 131, { align: 'center' });

    // Score display - elegant circle
    doc.setFillColor(30, 41, 59);
    doc.circle(pageWidth / 2, 152, 15, 'F');
    doc.setDrawColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.setLineWidth(2);
    doc.circle(pageWidth / 2, 152, 15, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`${certificate.score}%`, pageWidth / 2, 154, { align: 'center' });
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('SCORE', pageWidth / 2, 160, { align: 'center' });

    // Date issued
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Issued: ${issuedDate}`, pageWidth / 2, 175, { align: 'center' });

    // Signature section
    const signatureY = 188;
    const leftSigX = 60;
    const centerX = pageWidth / 2;
    const rightSigX = pageWidth - 60;

    // Left signature - SpecVerse
    doc.setDrawColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.setLineWidth(0.3);
    
    // Digital signature style curve
    doc.setFont('times', 'italic');
    doc.setFontSize(18);
    doc.setTextColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.text('SV', leftSigX, signatureY - 2, { align: 'center' });
    
    // Signature flourish
    doc.setLineWidth(0.5);
    doc.line(leftSigX - 25, signatureY + 2, leftSigX + 25, signatureY + 2);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('SpecVerse', leftSigX, signatureY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('Platform Authority', leftSigX, signatureY + 12, { align: 'center' });

    // Center seal
    doc.setFillColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.circle(centerX, signatureY, 12, 'S');
    doc.setLineWidth(0.3);
    doc.circle(centerX, signatureY, 10, 'S');
    
    doc.setFillColor(16, 185, 129);
    doc.circle(centerX, signatureY - 2, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(16, 185, 129);
    doc.text('CERTIFIED', centerX, signatureY + 5, { align: 'center' });

    // Right signature - Exam Board
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(badgeColors.primary[0], badgeColors.primary[1], badgeColors.primary[2]);
    doc.text('Exam Board', rightSigX, signatureY - 2, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(rightSigX - 25, signatureY + 2, rightSigX + 25, signatureY + 2);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Examination Board', rightSigX, signatureY + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('Standards Authority', rightSigX, signatureY + 12, { align: 'center' });

    // Certificate ID at bottom
    doc.setFillColor(30, 41, 59);
    const idBoxWidth = 90;
    doc.roundedRect(pageWidth / 2 - idBoxWidth / 2, pageHeight - 22, idBoxWidth, 8, 1, 1, 'F');
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(certificate.certificate_number || 'SV-CERT-XXXX', pageWidth / 2, pageHeight - 17, { align: 'center' });

    // Verification text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    doc.text('This certificate is digitally signed and verified. Validate at specverse.app/verify', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Download the PDF
    const fileName = `SpecVerse-Certificate-${category?.name?.replace(/\s+/g, '-')}-${certificate.certificate_number}.pdf`;
    doc.save(fileName);
    toast.success("Certificate downloaded as PDF!");
  };

  const handleDownload = () => {
    try {
      toast.info("Generating PDF certificate...");
      generatePDF();
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate certificate");
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/certificate/${certificateId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SpecVerse Certificate - ${certificate?.exam_categories?.name}`,
          text: `I earned a ${certificate?.exam_badge_levels?.name} badge in ${certificate?.exam_categories?.name}!`,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <GraduationCap className="h-16 w-16 mx-auto text-primary animate-pulse" />
            <Sparkles className="h-6 w-6 absolute -top-1 -right-1 text-yellow-400 animate-bounce" />
          </div>
          <p className="text-slate-400 font-medium">Loading your certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="p-10 text-center max-w-md bg-slate-900/50 rounded-2xl border border-slate-800">
          <Award className="h-16 w-16 mx-auto text-slate-600 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Certificate Not Found</h2>
          <p className="text-slate-400 mb-6">
            This certificate may have been removed or doesn't exist.
          </p>
          <Button onClick={() => navigate('/exam-center')} className="bg-primary hover:bg-primary/90">
            Back to Exam Center
          </Button>
        </div>
      </div>
    );
  }

  const profile = certificate.profiles as any;
  const badgeLevel = certificate.exam_badge_levels;
  const category = certificate.exam_categories;

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-slate-300 hover:text-white hover:bg-white/10" 
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25" 
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Certificate Card Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          id="certificate-card"
          className="relative"
        >
          <div className={`relative overflow-hidden rounded-3xl border-2 ${getBadgeAccent(badgeLevel?.name || '')} shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}>
            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-[0.03]">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 25px 25px, white 1px, transparent 1px)`,
                  backgroundSize: '50px 50px'
                }} />
              </div>
              
              {/* Corner flourishes */}
              <svg className="absolute top-0 left-0 w-32 h-32 text-primary/20" viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
              </svg>
              <svg className="absolute top-0 right-0 w-32 h-32 text-primary/20 rotate-90" viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
              </svg>
              <svg className="absolute bottom-0 left-0 w-32 h-32 text-primary/20 -rotate-90" viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
              </svg>
              <svg className="absolute bottom-0 right-0 w-32 h-32 text-primary/20 rotate-180" viewBox="0 0 100 100">
                <path d="M0,50 Q0,0 50,0 L50,10 Q10,10 10,50 Z" fill="currentColor" />
              </svg>
            </div>

            {/* Top Ribbon Banner */}
            <div className={`relative bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} py-8 px-6`}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMEwzMCAyMEwyMCA0MEwxMCAyMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-20" />
              <div className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 border-2 border-white/30 shadow-xl">
                  <Award className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wider uppercase font-serif drop-shadow-lg">
                  Certificate of Excellence
                </h1>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Star className="h-4 w-4 text-white/80 fill-white/80" />
                  <p className="text-white/90 text-sm tracking-[0.3em] uppercase font-medium">
                    SpecVerse Professional Certification
                  </p>
                  <Star className="h-4 w-4 text-white/80 fill-white/80" />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative p-8 md:p-12 space-y-10">
              {/* Recipient Section */}
              <div className="text-center space-y-4">
                <p className="text-slate-400 text-lg italic font-light">This is to certify that</p>
                <div className="relative inline-block">
                  <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent font-serif tracking-wide">
                    {profile?.full_name || profile?.username || 'SpecVerse Professional'}
                  </h2>
                  <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                </div>
              </div>

              {/* Achievement Section */}
              <div className="text-center space-y-6">
                <p className="text-slate-400 text-lg">
                  has successfully demonstrated outstanding proficiency in
                </p>
                <div className="space-y-4">
                  <h3 className="text-2xl md:text-3xl font-semibold text-white">
                    {category?.name}
                  </h3>
                  <Badge className={`bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} text-white text-lg py-2.5 px-8 shadow-xl border-0 font-semibold tracking-wide`}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {badgeLevel?.name} Achievement
                  </Badge>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} rounded-full blur-2xl opacity-30`} />
                  <div className="relative text-center p-8 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                    <div className="w-32 h-32 flex flex-col items-center justify-center">
                      <p className="text-5xl font-bold text-white">{certificate.score}%</p>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">Score</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-slate-300">
                    {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Digitally Verified</span>
                </div>
              </div>

              {/* Signature Section */}
              <div className="pt-8 border-t border-slate-700/50">
                <div className="grid grid-cols-3 gap-4 items-end">
                  {/* SpecVerse Signature */}
                  <div className="text-center">
                    <div className="mb-3">
                      <svg viewBox="0 0 120 50" className="h-10 mx-auto">
                        <defs>
                          <linearGradient id="sig1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                        <text x="5" y="32" fontFamily="Georgia, serif" fontSize="20" fill="url(#sig1)" fontStyle="italic" fontWeight="bold">
                          SV
                        </text>
                        <path d="M 5 40 Q 40 44 80 38 T 115 40" stroke="url(#sig1)" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <div className="w-24 mx-auto border-b border-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-white">SpecVerse</p>
                    <p className="text-[10px] text-slate-500">Platform Authority</p>
                  </div>

                  {/* Verification Seal */}
                  <div className="text-center">
                    <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${getBadgeGradient(badgeLevel?.name || '')} p-0.5 shadow-2xl`}>
                      <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-emerald-400" />
                        <p className="text-[8px] font-bold text-emerald-400 mt-1 tracking-wider">CERTIFIED</p>
                      </div>
                    </div>
                  </div>

                  {/* Exam Board Signature */}
                  <div className="text-center">
                    <div className="mb-3">
                      <svg viewBox="0 0 120 50" className="h-10 mx-auto">
                        <text x="5" y="32" fontFamily="Georgia, serif" fontSize="16" fill="url(#sig1)" fontStyle="italic">
                          Exam Board
                        </text>
                        <path d="M 5 40 Q 40 44 80 38 T 115 40" stroke="url(#sig1)" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <div className="w-24 mx-auto border-b border-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-white">Examination Board</p>
                    <p className="text-[10px] text-slate-500">Standards Authority</p>
                  </div>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="text-center pt-6">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono text-slate-300 font-medium">
                    {certificate.certificate_number}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-3 max-w-md mx-auto">
                  This certificate is digitally signed and blockchain-verified. 
                  Validate at specverse.app/certificate/{certificateId?.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-4 pt-4"
        >
          <Button 
            variant="outline" 
            className="bg-white/5 border-white/20 text-white hover:bg-white/10" 
            onClick={() => navigate('/exam-center')}
          >
            Back to Exam Center
          </Button>
          {profile?.username && (
            <Button 
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90" 
              onClick={() => navigate(`/profile/${profile.username}`)}
            >
              View Profile
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CertificateView;
