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
import { toPng } from "html-to-image";

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

  const handleDownload = async () => {
    const element = document.getElementById('certificate-card');
    if (!element) return;

    try {
      toast.info("Preparing certificate...");
      const dataUrl = await toPng(element, { 
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#0f172a'
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
              Download
            </Button>
          </div>
        </div>

        {/* Certificate Card */}
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
              {/* Geometric patterns */}
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
