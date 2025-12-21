import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import {
  Download, Play, Pause, Loader2, Sparkles, Video, CheckCircle2,
  ArrowLeft, Gift, Shield, Users, Briefcase, TrendingUp, Star,
  Brain, Music, Calculator, ChefHat, FlaskConical, BarChart3, Map,
  ShoppingBag, GraduationCap, Newspaper, Crown, FileText, Lightbulb,
  Zap, Wrench, Check, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PromoTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  benefits: string[];
  gradient: string;
  emoji: string;
  category: 'platform' | 'tool';
}

const PROMO_TEMPLATES: PromoTemplate[] = [
  // Platform promos
  {
    id: 'main-platform',
    name: 'SpecVerse',
    tagline: '100% FREE • No Hidden Fees',
    description: 'The world\'s first unified hospitality super-app. Join 2,400+ verified professionals.',
    benefits: ['All Features FREE', '20+ Pro Tools', 'Verified Network', 'Career Growth'],
    gradient: 'from-primary via-blue-500 to-purple-600',
    emoji: '🍸',
    category: 'platform'
  },
  {
    id: 'free-forever',
    name: 'Join FREE',
    tagline: 'No Credit Card Required',
    description: 'Everything you need for your hospitality career. Completely free, forever.',
    benefits: ['Zero Cost', 'No Subscription', 'No Tricks', 'Free Forever'],
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    emoji: '🎁',
    category: 'platform'
  },
  {
    id: 'get-verified',
    name: 'Get Verified',
    tagline: 'Stand Out From The Crowd',
    description: 'Prove your skills. Get the badge employers trust. Build your verified portfolio.',
    benefits: ['Verified Badge', 'Trusted Profile', 'Career Boost', 'Industry Recognition'],
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    emoji: '✅',
    category: 'platform'
  },
  // Tool promos
  {
    id: 'matrix-ai',
    name: 'Matrix AI',
    tagline: 'Your 24/7 AI Mentor',
    description: 'Get instant expert answers on cocktails, spirits, wine & career advice.',
    benefits: ['24/7 Expert Help', 'Voice Enabled', 'Career Coaching', 'Free to Use'],
    gradient: 'from-violet-600 to-purple-600',
    emoji: '🤖',
    category: 'tool'
  },
  {
    id: 'batch-calculator',
    name: 'Batch Calculator',
    tagline: 'Perfect Scaling, Zero Errors',
    description: 'Scale any recipe from 1 serve to 1000 liters with one click.',
    benefits: ['One-Click Scale', 'Team Sharing', 'Production Logs', 'Inventory Sync'],
    gradient: 'from-amber-500 to-orange-500',
    emoji: '🧮',
    category: 'tool'
  },
  {
    id: 'lab-ops',
    name: 'LAB Ops',
    tagline: 'FREE Venue Management',
    description: 'Complete POS, scheduling, inventory & analytics. 100% free, forever.',
    benefits: ['Mobile POS', 'KDS/BDS Systems', 'Staff Scheduling', 'All FREE'],
    gradient: 'from-indigo-500 to-blue-500',
    emoji: '📈',
    category: 'tool'
  },
  {
    id: 'cocktail-sop',
    name: 'Cocktail SOP',
    tagline: 'Standardized Excellence',
    description: 'Professional recipe specs with costs, taste profiles & training PDFs.',
    benefits: ['Exact Costs', 'Taste Profiles', 'PDF Export', 'Team Training'],
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🍹',
    category: 'tool'
  },
  {
    id: 'exam-center',
    name: 'Exam Center',
    tagline: 'Prove Your Expertise',
    description: 'Earn verified certificates and digital badges. Show employers you\'re the best.',
    benefits: ['Digital Certs', 'Profile Badges', 'AI Exams', 'Career Proof'],
    gradient: 'from-yellow-500 to-amber-500',
    emoji: '🎓',
    category: 'tool'
  },
  {
    id: 'music-box',
    name: 'Music Box',
    tagline: 'Pro Audio Management',
    description: 'Upload music, extract audio from videos, share playlists with your team.',
    benefits: ['Upload Library', 'Extract Audio', 'Team Sharing', 'Trending Tracks'],
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🎵',
    category: 'tool'
  },
  {
    id: 'reel-editor',
    name: 'Reel Editor Pro',
    tagline: 'Pro Video Creation',
    description: 'Create stunning drink content with filters, music & text. Export for Instagram.',
    benefits: ['Easy Editing', 'Music Library', 'Pro Filters', 'IG Ready'],
    gradient: 'from-pink-500 to-purple-500',
    emoji: '🎬',
    category: 'tool'
  },
  {
    id: 'live-map',
    name: 'Live Map',
    tagline: 'Discover Award Venues',
    description: 'Find Michelin stars, World\'s 50 Best bars & connect with local pros.',
    benefits: ['Award Venues', 'Local Pros', 'Job Listings', 'Network'],
    gradient: 'from-green-500 to-emerald-500',
    emoji: '🗺️',
    category: 'tool'
  },
];

const PromoAds = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromoTemplate>(PROMO_TEMPLATES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const animationRef = useRef<number>();
  const frameRef = useRef(0);
  const totalFrames = 180; // 6 seconds at 30fps

  // Parse gradient colors
  const getGradientColors = (gradient: string) => {
    const colors: { [key: string]: string } = {
      'primary': '#3b82f6',
      'blue-500': '#3b82f6',
      'blue-600': '#2563eb',
      'purple-500': '#a855f7',
      'purple-600': '#9333ea',
      'violet-600': '#7c3aed',
      'green-500': '#22c55e',
      'emerald-500': '#10b981',
      'teal-500': '#14b8a6',
      'amber-500': '#f59e0b',
      'orange-500': '#f97316',
      'red-500': '#ef4444',
      'pink-500': '#ec4899',
      'rose-500': '#f43f5e',
      'cyan-500': '#06b6d4',
      'indigo-500': '#6366f1',
      'yellow-500': '#eab308',
    };
    
    const parts = gradient.split(' ');
    const fromColor = parts.find(p => p.startsWith('from-'))?.replace('from-', '') || 'primary';
    const toColor = parts.find(p => p.startsWith('to-'))?.replace('to-', '') || 'blue-600';
    
    return {
      from: colors[fromColor] || '#3b82f6',
      to: colors[toColor] || '#2563eb'
    };
  };

  const drawFrame = (frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const progress = frame / totalFrames;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get gradient colors
    const colors = getGradientColors(selectedTemplate.gradient);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.from);
    gradient.addColorStop(1, colors.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles/orbs
    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(frame * 0.015 + i * 0.7) * 0.4 + 0.5) * width;
      const y = ((frame * 1.5 + i * 45) % (height + 120)) - 60;
      const size = 20 + Math.sin(i * 0.5) * 15;
      
      const orbGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      orbGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      orbGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.fill();
    }

    // === CONTENT SECTIONS ===
    
    // Section 1: Emoji & Logo (0-25%)
    if (progress < 0.25) {
      const sectionProgress = progress / 0.25;
      const scale = 0.5 + sectionProgress * 0.5;
      const opacity = sectionProgress;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(width / 2, height * 0.4);
      ctx.scale(scale, scale);
      
      // Emoji
      ctx.font = '80px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedTemplate.emoji, 0, -60);
      
      // Name
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px system-ui';
      ctx.fillText(selectedTemplate.name, 0, 30);
      
      ctx.restore();
    }
    
    // Section 2: Tagline (15-45%)
    else if (progress < 0.45) {
      const sectionProgress = (progress - 0.15) / 0.3;
      const slideIn = Math.min(1, sectionProgress * 2);
      const opacity = Math.min(1, sectionProgress * 3);
      
      ctx.save();
      ctx.globalAlpha = opacity;
      
      // Emoji stays
      ctx.font = '60px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(selectedTemplate.emoji, width / 2, height * 0.25);
      
      // Name
      ctx.fillStyle = 'white';
      ctx.font = 'bold 42px system-ui';
      ctx.fillText(selectedTemplate.name, width / 2, height * 0.38);
      
      // Tagline slides in
      const taglineX = width * (1.5 - slideIn * 0.5);
      ctx.font = 'bold 28px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillText(selectedTemplate.tagline, taglineX, height * 0.5);
      
      ctx.restore();
    }
    
    // Section 3: Description (35-65%)
    else if (progress < 0.65) {
      const sectionProgress = (progress - 0.35) / 0.3;
      const opacity = Math.min(1, sectionProgress * 2);
      
      ctx.save();
      ctx.globalAlpha = opacity;
      
      // Emoji
      ctx.font = '50px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(selectedTemplate.emoji, width / 2, height * 0.18);
      
      // Name
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px system-ui';
      ctx.fillText(selectedTemplate.name, width / 2, height * 0.28);
      
      // Tagline
      ctx.font = 'bold 24px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(selectedTemplate.tagline, width / 2, height * 0.38);
      
      // Description - word wrap
      ctx.font = '18px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const words = selectedTemplate.description.split(' ');
      let line = '';
      let y = height * 0.52;
      const maxWidth = width * 0.85;
      
      words.forEach(word => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line.trim(), width / 2, y);
          line = word + ' ';
          y += 26;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line.trim(), width / 2, y);
      
      ctx.restore();
    }
    
    // Section 4: Benefits (55-85%)
    else if (progress < 0.85) {
      const sectionProgress = (progress - 0.55) / 0.3;
      
      ctx.save();
      
      // Header
      ctx.font = '50px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(selectedTemplate.emoji, width / 2, height * 0.12);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px system-ui';
      ctx.fillText(selectedTemplate.name, width / 2, height * 0.22);
      
      // Benefits with staggered animation
      selectedTemplate.benefits.forEach((benefit, index) => {
        const benefitProgress = Math.max(0, (sectionProgress - index * 0.15) * 3);
        const opacity = Math.min(1, benefitProgress);
        const slideX = (1 - benefitProgress) * 60;
        
        ctx.globalAlpha = opacity;
        
        // Benefit box
        const boxY = height * 0.35 + index * 70;
        const boxWidth = width * 0.85;
        const boxX = width * 0.075 + slideX;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, 55, 12);
        ctx.fill();
        
        // Checkmark
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('✓', boxX + 20, boxY + 35);
        
        // Benefit text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px system-ui';
        ctx.fillText(benefit, boxX + 55, boxY + 36);
      });
      
      ctx.restore();
    }
    
    // Section 5: CTA (75-100%)
    else {
      const sectionProgress = (progress - 0.75) / 0.25;
      const pulseScale = 1 + Math.sin(frame * 0.15) * 0.03;
      
      ctx.save();
      
      // Emoji
      ctx.font = '60px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(selectedTemplate.emoji, width / 2, height * 0.2);
      
      // Name
      ctx.fillStyle = 'white';
      ctx.font = 'bold 40px system-ui';
      ctx.fillText(selectedTemplate.name, width / 2, height * 0.32);
      
      // FREE badge
      ctx.globalAlpha = Math.min(1, sectionProgress * 2);
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 28px system-ui';
      ctx.fillText('100% FREE', width / 2, height * 0.44);
      
      // CTA Button
      ctx.globalAlpha = Math.min(1, sectionProgress * 2);
      ctx.translate(width / 2, height * 0.6);
      ctx.scale(pulseScale, pulseScale);
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.roundRect(-120, -30, 240, 60, 30);
      ctx.fill();
      
      ctx.fillStyle = colors.from;
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Join Now FREE →', 0, 0);
      
      ctx.restore();
      
      // Bottom branding
      ctx.globalAlpha = Math.min(1, sectionProgress * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('specverse.app', width / 2, height * 0.85);
      ctx.fillText('No Credit Card • No Hidden Fees', width / 2, height * 0.9);
    }
  };

  const generateVideo = async () => {
    setIsGenerating(true);
    setProgress(0);
    setVideoBlob(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setIsGenerating(false);
      return;
    }

    try {
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        throw new Error('Video recording not supported');
      }

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000
      });

      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setIsGenerating(false);
        setProgress(100);
        toast.success("Promo video ready!", { description: "Click download to save" });
      };

      mediaRecorder.start();

      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise(resolve => setTimeout(resolve, 33));
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error("Failed to generate video");
      setIsGenerating(false);
    }
  };

  const playPreview = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    setIsPlaying(true);
    frameRef.current = 0;

    const animate = () => {
      if (frameRef.current < totalFrames) {
        drawFrame(frameRef.current);
        frameRef.current++;
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        frameRef.current = 0;
      }
    };

    animate();
  };

  const downloadVideo = () => {
    if (!videoBlob) return;

    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate.id}-promo-ad.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Video downloaded!");
  };

  useEffect(() => {
    drawFrame(0);
    setVideoBlob(null);
  }, [selectedTemplate]);

  const platformTemplates = PROMO_TEMPLATES.filter(t => t.category === 'platform');
  const toolTemplates = PROMO_TEMPLATES.filter(t => t.category === 'tool');

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav isVisible={true} />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              Promo Ads Studio
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate promotional videos for ads & social media
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left - Template Selection */}
          <div className="space-y-4">
            <Tabs defaultValue="platform" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="platform" className="flex-1">Platform Promos</TabsTrigger>
                <TabsTrigger value="tools" className="flex-1">Tool Promos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="platform" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {platformTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedTemplate.id === template.id 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center text-2xl`}>
                            {template.emoji}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.tagline}</p>
                          </div>
                          <ChevronRight className={`w-5 h-5 ${selectedTemplate.id === template.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="tools" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {toolTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedTemplate.id === template.id 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center text-2xl`}>
                            {template.emoji}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.tagline}</p>
                          </div>
                          <ChevronRight className={`w-5 h-5 ${selectedTemplate.id === template.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right - Preview & Generate */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Video Preview
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    9:16 Portrait
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Canvas Preview */}
                <div className="relative rounded-xl overflow-hidden bg-muted mx-auto" style={{ maxWidth: '300px' }}>
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={640}
                    className="w-full"
                    style={{ aspectRatio: '9/16' }}
                  />
                  
                  {!isGenerating && !isPlaying && (
                    <button
                      onClick={playPreview}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </button>
                  )}

                  {isPlaying && (
                    <button
                      onClick={playPreview}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 rounded text-white text-xs flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        Playing
                      </div>
                    </button>
                  )}
                </div>

                {/* Progress */}
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Generating video...</span>
                      <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={generateVideo}
                    disabled={isGenerating || isPlaying}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        Generate Video
                      </>
                    )}
                  </Button>
                  
                  {videoBlob && (
                    <Button variant="outline" onClick={downloadVideo} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  )}
                </div>

                {videoBlob && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    Video ready! Use for Instagram, TikTok, Facebook ads
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Pro Tips
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Videos are 9:16 format, perfect for Reels/TikTok</li>
                  <li>• Download as WebM, convert to MP4 for ads</li>
                  <li>• Add your own music in your editing app</li>
                  <li>• Use platform promos for broad reach</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PromoAds;
