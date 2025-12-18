import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle, Target, Award, Star, Briefcase, Loader2 } from "lucide-react";
import { getBadgeColor, getProfessionalBadge, calculateNetworkReach, calculateProfessionalScore } from "@/lib/profileUtils";
import { useCareerMetrics } from "@/hooks/useCareerMetrics";

// Lazy load dialogs and heavy components
const BadgeInfoDialog = lazy(() => import("@/components/BadgeInfoDialog"));
const CareerMetricsDialog = lazy(() => import("@/components/CareerMetricsDialog"));
const AddCertificationDialog = lazy(() => import("@/components/AddCertificationDialog").then(m => ({ default: m.AddCertificationDialog })));
const AddRecognitionDialog = lazy(() => import("@/components/AddRecognitionDialog").then(m => ({ default: m.AddRecognitionDialog })));
const ExperienceTimeline = lazy(() => import("@/components/ExperienceTimeline").then(m => ({ default: m.ExperienceTimeline })));
const VenueVerification = lazy(() => import("@/components/VenueVerification").then(m => ({ default: m.VenueVerification })));

interface ProfileGrowthTabProps {
  userId: string;
  profile: any;
  userRoles: { isFounder: boolean; isVerified: boolean };
}

const ProfileGrowthTab = ({ userId, profile, userRoles }: ProfileGrowthTabProps) => {
  const navigate = useNavigate();
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [showAddCertification, setShowAddCertification] = useState(false);
  const [showAddRecognition, setShowAddRecognition] = useState(false);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [examCertificates, setExamCertificates] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { metrics: liveCareerMetrics, refetch: refetchCareerMetrics } = useCareerMetrics(userId);

  const fetchData = useCallback(async () => {
    const [expRes, certRes, postsRes, reelsRes, storiesRes] = await Promise.all([
      supabase.from('work_experiences').select('*').eq('user_id', userId).order('start_date', { ascending: false }),
      supabase.from('exam_certificates').select('*, exam_categories(name), exam_badge_levels(name)').eq('user_id', userId).order('issued_at', { ascending: false }),
      supabase.from('posts').select('id, like_count').eq('user_id', userId),
      supabase.from('reels').select('id, like_count, view_count').eq('user_id', userId),
      supabase.from('stories').select('id').eq('user_id', userId).gt('expires_at', new Date().toISOString())
    ]);
    
    setExperiences(expRes.data || []);
    setExamCertificates(certRes.data || []);
    setPosts(postsRes.data || []);
    setReels(reelsRes.data || []);
    setStories(storiesRes.data || []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const badge = profile.professional_title ? getProfessionalBadge(profile.professional_title) : null;
  const BadgeIcon = badge?.icon;

  return (
    <div className="space-y-4">
      {/* Professional Growth Guidelines */}
      <div className="glass rounded-xl p-4 space-y-4 border border-border/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="font-bold text-lg">Professional Growth Guidelines</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Verify Your Work Experience</p>
              <p className="text-xs text-muted-foreground">Add venues where you've worked to build credibility</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Build Your Network</p>
              <p className="text-xs text-muted-foreground">Connect with industry professionals</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Award className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Showcase Your Skills</p>
              <p className="text-xs text-muted-foreground">Share posts and reels demonstrating expertise</p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Badge */}
      {badge && BadgeIcon && (
        <div className="glass rounded-xl p-4 space-y-6 border border-border/50">
          <div>
            <h3 className="font-bold text-2xl mb-2">Professional Badge</h3>
            <p className="text-sm text-muted-foreground">Your badge evolves with verified experience</p>
          </div>

          <div className="relative rounded-3xl p-8 bg-gradient-to-br from-green-600 via-emerald-500 to-green-400 overflow-hidden"
               style={{ boxShadow: '0 20px 60px rgba(34, 197, 94, 0.4)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            
            <div className="flex flex-col items-center relative">
              <div className="w-32 h-32 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center mb-4">
                <BadgeIcon className="w-16 h-16 text-white drop-shadow-lg" strokeWidth={1.5} />
              </div>
              
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"
                   style={{ boxShadow: '0 10px 25px rgba(34, 197, 94, 0.5)' }}>
                <span className="text-3xl font-bold text-white">{badge.score}</span>
              </div>
              
              <h4 className="text-2xl font-bold text-white mt-4 capitalize">
                {profile.professional_title?.replace(/_/g, " ")}
              </h4>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Career Metrics</h4>
            <div className="space-y-3">
              <div 
                className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setBadgeDialogOpen(true)}
              >
                <span className="text-sm text-muted-foreground">Badge Status</span>
                <Badge className={`bg-gradient-to-r ${getBadgeColor(profile.badge_level)} border-0 text-white capitalize`}>
                  {profile.badge_level}
                </Badge>
              </div>
              <div 
                className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setMetricsDialogOpen(true)}
              >
                <span className="text-sm text-muted-foreground">Network Reach</span>
                <span className="text-sm font-semibold">{calculateNetworkReach(profile, posts, reels).toLocaleString()}</span>
              </div>
              <div 
                className="flex justify-between items-center glass rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setMetricsDialogOpen(true)}
              >
                <span className="text-sm text-muted-foreground">Professional Score</span>
                <span className="text-sm font-semibold text-primary">{calculateProfessionalScore(profile, userRoles, posts, reels, stories)}/100</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Career KPIs */}
      <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-lg">Career Development Score</h4>
          <Button variant="ghost" size="sm" onClick={() => setMetricsDialogOpen(true)} className="text-xs">
            View Details
          </Button>
        </div>
        
        <div className="text-center p-4 glass rounded-lg border border-border/50">
          <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
            {liveCareerMetrics.score}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {liveCareerMetrics.regionalRank} {profile.region && profile.region !== 'All' ? `in ${profile.region}` : 'globally'}
          </div>
          <Badge className={`${liveCareerMetrics.badge.color} text-sm px-3 py-1`}>
            {liveCareerMetrics.badge.level} - {liveCareerMetrics.badge.description}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Working Places</span>
            </div>
            <div className="text-2xl font-bold">{liveCareerMetrics.workingPlaces}</div>
          </div>
          <div className="glass rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Years Experience</span>
            </div>
            <div className="text-2xl font-bold">{liveCareerMetrics.totalYears}</div>
          </div>
          <div className="glass rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Projects</span>
            </div>
            <div className="text-2xl font-bold">{liveCareerMetrics.projectsCompleted}</div>
          </div>
          <div className="glass rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-pink-500" />
              <span className="text-xs text-muted-foreground">Recognitions</span>
            </div>
            <div className="text-2xl font-bold">{liveCareerMetrics.recognitions}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setShowAddCertification(true)}>
            <Award className="w-4 h-4 mr-2" />
            Add Certification/Diploma
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowAddRecognition(true)}>
            <Star className="w-4 h-4 mr-2" />
            Add Recognition
          </Button>
        </div>
      </div>

      {/* Exam Certificates */}
      {examCertificates.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Exam Certificates
            </h4>
            <Button variant="ghost" size="sm" onClick={() => navigate('/exam-center')} className="text-xs">
              Take Exam
            </Button>
          </div>
          <div className="space-y-2">
            {examCertificates.map((cert: any) => {
              const badgeColor = {
                'Bronze': 'bg-amber-700 text-white',
                'Silver': 'bg-slate-400 text-white',
                'Gold': 'bg-yellow-500 text-black',
                'Platinum': 'bg-gradient-to-r from-slate-300 to-slate-500 text-white',
                'Diamond': 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white'
              }[cert.exam_badge_levels?.name] || 'bg-muted';
              
              return (
                <div 
                  key={cert.id}
                  className="flex items-center gap-3 p-3 rounded-lg glass border border-border/50 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/certificate/${cert.id}`)}
                >
                  <div className={`p-2 rounded-full shrink-0 ${badgeColor}`}>
                    <Award className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{cert.exam_categories?.name}</span>
                      <Badge className={`text-[10px] ${badgeColor}`}>{cert.exam_badge_levels?.name}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Score: {cert.score}% • {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Work Experience Timeline */}
      <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Work Experience & Projects
        </h4>
        <Suspense fallback={<div className="py-4 text-center text-muted-foreground text-sm">Loading...</div>}>
          <ExperienceTimeline
            experiences={experiences}
            userId={userId}
            onUpdate={fetchData}
            isOwnProfile={true}
          />
        </Suspense>
      </div>

      {/* Venue Verification */}
      <div className="glass rounded-xl p-4 space-y-4 border border-border/50">
        <Suspense fallback={<div className="py-4 text-center text-muted-foreground text-sm">Loading...</div>}>
          <VenueVerification userId={userId} />
        </Suspense>
      </div>

      {/* Dialogs */}
      <Suspense fallback={null}>
        {badgeDialogOpen && (
          <BadgeInfoDialog
            open={badgeDialogOpen}
            onOpenChange={setBadgeDialogOpen}
            isFounder={userRoles.isFounder}
            isVerified={userRoles.isVerified}
            badgeLevel={profile.badge_level}
            username={profile.username}
            isOwnProfile={true}
          />
        )}
        {metricsDialogOpen && (
          <CareerMetricsDialog
            open={metricsDialogOpen}
            onOpenChange={setMetricsDialogOpen}
            metrics={liveCareerMetrics}
          />
        )}
        {showAddCertification && (
          <AddCertificationDialog
            open={showAddCertification}
            onOpenChange={setShowAddCertification}
            userId={userId}
            onSuccess={() => {
              fetchData();
              refetchCareerMetrics();
            }}
          />
        )}
        {showAddRecognition && (
          <AddRecognitionDialog
            open={showAddRecognition}
            onOpenChange={setShowAddRecognition}
            userId={userId}
            onSuccess={() => {
              fetchData();
              refetchCareerMetrics();
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default ProfileGrowthTab;
