import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Award, 
  Download, 
  Share2, 
  ChevronLeft,
  CheckCircle,
  Calendar,
  GraduationCap,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";

const CertificateView = () => {
  const { certificateId } = useParams();
  const navigate = useNavigate();

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['certificate', certificateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_certificates')
        .select(`
          *,
          exam_categories(*),
          exam_badge_levels(*),
          profiles:user_id(username, full_name, avatar_url)
        `)
        .eq('id', certificateId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!certificateId
  });

  const getBadgeGradient = (name: string) => {
    const gradients: Record<string, string> = {
      'Bronze': 'from-amber-600 via-amber-500 to-amber-700',
      'Silver': 'from-slate-400 via-slate-300 to-slate-500',
      'Gold': 'from-yellow-400 via-yellow-300 to-yellow-500',
      'Platinum': 'from-slate-300 via-white to-slate-400',
      'Diamond': 'from-cyan-400 via-blue-300 to-purple-400'
    };
    return gradients[name] || 'from-primary to-purple-500';
  };

  const handleDownload = async () => {
    const element = document.getElementById('certificate-card');
    if (!element) return;

    try {
      toast.info("Preparing certificate...");
      const dataUrl = await toPng(element, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `SpecVerse-Certificate-${certificate?.exam_categories?.name?.replace(/\s+/g, '-')}-${certificate?.certificate_number}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.error("Failed to download certificate");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Certificate Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This certificate may have been removed or doesn't exist.
          </p>
          <Button onClick={() => navigate('/exam-center')}>
            Back to Exam Center
          </Button>
        </Card>
      </div>
    );
  }

  const profile = certificate.profiles as any;
  const badgeLevel = certificate.exam_badge_levels;
  const category = certificate.exam_categories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm" className="bg-primary" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
          </div>
        </div>

        {/* Certificate Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          id="certificate-card"
          className="relative"
        >
          <Card className="overflow-hidden border-4 border-amber-500/30 shadow-2xl">
            {/* Decorative Corner Elements */}
            <div className="absolute top-4 left-4 w-16 h-16 border-l-4 border-t-4 border-amber-500/50" />
            <div className="absolute top-4 right-4 w-16 h-16 border-r-4 border-t-4 border-amber-500/50" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-l-4 border-b-4 border-amber-500/50" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-r-4 border-b-4 border-amber-500/50" />

            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>

            {/* Top Banner */}
            <div className={`relative bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} p-10 text-center`}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative">
                <Award className="h-20 w-20 mx-auto text-white mb-4 drop-shadow-lg" />
                <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-wide">
                  CERTIFICATE OF COMPLETION
                </h1>
                <p className="text-white/90 text-lg font-medium tracking-widest uppercase">
                  SpecVerse Professional Examination
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="relative p-10 space-y-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
              {/* Recipient */}
              <div className="text-center space-y-3">
                <p className="text-muted-foreground text-lg italic">This is to certify that</p>
                <h2 className="text-4xl font-serif font-bold text-primary tracking-wide">
                  {profile?.full_name || profile?.username || 'SpecVerse Professional'}
                </h2>
              </div>

              {/* Achievement */}
              <div className="text-center space-y-4">
                <p className="text-muted-foreground text-lg">
                  has successfully completed the professional examination in
                </p>
                <div className="inline-flex flex-col items-center gap-3">
                  <h3 className="text-3xl font-semibold text-foreground">{category?.name}</h3>
                  <Badge className={`bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} text-white text-xl py-2 px-6 shadow-lg`}>
                    {badgeLevel?.name} Level Achievement
                  </Badge>
                </div>
              </div>

              {/* Score */}
              <div className="flex justify-center">
                <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20">
                  <p className="text-6xl font-bold text-primary">{certificate.score}%</p>
                  <p className="text-sm text-muted-foreground mt-2 font-medium uppercase tracking-wide">Final Score</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Issued: {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground justify-end">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600">Digitally Verified</span>
                </div>
              </div>

              {/* Signature Section */}
              <div className="pt-8 border-t-2 border-dashed border-muted">
                <div className="flex justify-between items-end">
                  {/* SpecVerse Digital Signature */}
                  <div className="text-center flex-1">
                    <div className="mb-4">
                      {/* Digital Signature SVG */}
                      <svg viewBox="0 0 200 60" className="h-12 mx-auto text-primary">
                        <text x="10" y="40" fontFamily="cursive" fontSize="28" fill="currentColor" fontStyle="italic">
                          SpecVerse
                        </text>
                        <path d="M 10 48 Q 60 52 120 45 T 190 48" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <div className="w-40 mx-auto border-b-2 border-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">SpecVerse Platform</p>
                    <p className="text-xs text-muted-foreground">Digital Certification Authority</p>
                  </div>

                  {/* Verification Seal */}
                  <div className="text-center flex-1">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/40 mb-2">
                      <div className="text-center">
                        <CheckCircle className="h-8 w-8 text-primary mx-auto" />
                        <p className="text-[8px] font-bold text-primary mt-1">VERIFIED</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Official Seal</p>
                  </div>

                  {/* Examination Board */}
                  <div className="text-center flex-1">
                    <div className="mb-4">
                      <svg viewBox="0 0 200 60" className="h-12 mx-auto text-primary">
                        <text x="30" y="40" fontFamily="cursive" fontSize="24" fill="currentColor" fontStyle="italic">
                          Exam Board
                        </text>
                        <path d="M 20 48 Q 70 52 130 45 T 180 48" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <div className="w-40 mx-auto border-b-2 border-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">Examination Board</p>
                    <p className="text-xs text-muted-foreground">Professional Standards</p>
                  </div>
                </div>
              </div>

              {/* Certificate Number & Verification */}
              <div className="text-center pt-6 border-t">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono font-medium">
                    Certificate ID: {certificate.certificate_number}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  This certificate is digitally signed and can be verified at specverse.app/certificate/{certificateId}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => navigate('/exam-center')}>
            Back to Exam Center
          </Button>
          {profile?.username && (
            <Button className="bg-primary" onClick={() => navigate(`/profile/${profile.username}`)}>
              View Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateView;