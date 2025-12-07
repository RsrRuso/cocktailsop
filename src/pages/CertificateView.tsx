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
  User,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html-to-image";

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
    return gradients[level] || 'from-primary to-purple-500';
  };

  const handleDownload = async () => {
    const element = document.getElementById('certificate-card');
    if (!element) return;

    try {
      const dataUrl = await html2canvas.toPng(element, { quality: 1 });
      const link = document.createElement('a');
      link.download = `certificate-${certificate?.certificate_number}.png`;
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
          text: `I earned a ${certificate?.exam_badge_levels?.level_name} badge in ${certificate?.exam_categories?.name}!`,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Certificate Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          id="certificate-card"
        >
          <Card className="overflow-hidden">
            {/* Top Banner */}
            <div className={`bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} p-8 text-center`}>
              <Award className="h-16 w-16 mx-auto text-white mb-4 drop-shadow-lg" />
              <h1 className="text-3xl font-bold text-white mb-2">
                Certificate of Achievement
              </h1>
              <p className="text-white/80">SpecVerse Examination System</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
              {/* Recipient */}
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">This is to certify that</p>
                <h2 className="text-3xl font-serif font-bold text-primary">
                  {profile?.full_name || profile?.username || 'SpecVerse User'}
                </h2>
              </div>

              {/* Achievement */}
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  has successfully completed the examination in
                </p>
                <div className="inline-flex flex-col items-center gap-2">
                  <h3 className="text-2xl font-semibold">{category?.name}</h3>
                  <Badge className={`bg-gradient-to-r ${getBadgeGradient(badgeLevel?.name || '')} text-white text-lg py-1 px-4`}>
                    {badgeLevel?.name} Level
                  </Badge>
                </div>
              </div>

              {/* Score */}
              <div className="flex justify-center">
                <div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/20">
                  <p className="text-5xl font-bold text-primary">{certificate.score}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Final Score</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Issued: {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground justify-end">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Verified</span>
                </div>
              </div>

              {/* Certificate Number */}
              <div className="text-center pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Certificate ID: {certificate.certificate_number}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verify at: specverse.app/verify/{certificate.certificate_number}
                </p>
              </div>

              {/* Decorative Elements */}
              <div className="flex justify-center gap-8 pt-4">
                <div className="text-center">
                  <div className="w-24 border-b-2 border-primary mb-2" />
                  <p className="text-xs text-muted-foreground">SpecVerse</p>
                </div>
                <div className="text-center">
                  <div className="w-24 border-b-2 border-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Examination Board</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate('/exam-center')}>
            Back to Exam Center
          </Button>
          <Button onClick={() => navigate(`/profile/${profile?.username}`)}>
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateView;
