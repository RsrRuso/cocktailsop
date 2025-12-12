import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Download, Loader2, Share2, Copy, Link, ChevronLeft, Brain, Music, Calculator, ChefHat, FlaskConical, Users, BarChart3, Map, ShoppingBag, GraduationCap, Newspaper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import QRCode from "qrcode";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShareSpecVerseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareableTool {
  id: string;
  name: string;
  tagline: string;
  problem: string;
  benefits: string[];
  icon: React.ReactNode;
  path: string;
  gradient: string;
  emoji: string;
}

const SHAREABLE_TOOLS: ShareableTool[] = [
  {
    id: 'landing',
    name: 'SpecVerse',
    tagline: 'The Future of Hospitality',
    problem: 'Scattered tools & no industry community',
    benefits: ['All-in-one platform', 'Connect with pros globally', 'Free professional tools'],
    icon: <Sparkles className="w-6 h-6" />,
    path: '/',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    emoji: '🍸'
  },
  {
    id: 'matrix-ai',
    name: 'Matrix AI',
    tagline: 'Your AI Hospitality Mentor',
    problem: 'Need expert advice instantly?',
    benefits: ['24/7 industry expertise', 'Recipe suggestions', 'Career guidance', 'Voice assistant'],
    icon: <Brain className="w-6 h-6" />,
    path: '/matrix-ai',
    gradient: 'from-violet-600 to-purple-600',
    emoji: '🤖'
  },
  {
    id: 'music-box',
    name: 'Music Box',
    tagline: 'Curate Your Venue Sound',
    problem: 'Struggling with venue playlists?',
    benefits: ['Upload & share tracks', 'Auto-extract from reels', 'Trending music library'],
    icon: <Music className="w-6 h-6" />,
    path: '/music-box',
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🎵'
  },
  {
    id: 'batch-calculator',
    name: 'Batch Calculator',
    tagline: 'Scale Recipes Perfectly',
    problem: 'Scaling cocktails is time-consuming?',
    benefits: ['Instant batch scaling', 'QR code sharing', 'Team collaboration', 'Production tracking'],
    icon: <Calculator className="w-6 h-6" />,
    path: '/batch-calculator',
    gradient: 'from-amber-500 to-orange-500',
    emoji: '🧮'
  },
  {
    id: 'menu-engineering',
    name: 'Menu Engineering',
    tagline: 'Maximize Menu Profits',
    problem: 'Which menu items are losing money?',
    benefits: ['BCG matrix analysis', 'Cost optimization', 'AI pricing suggestions', 'Ingredient tracking'],
    icon: <ChefHat className="w-6 h-6" />,
    path: '/menu-engineering-pro',
    gradient: 'from-emerald-500 to-teal-500',
    emoji: '📊'
  },
  {
    id: 'cocktail-sop',
    name: 'Cocktail SOP',
    tagline: 'Professional Recipe Specs',
    problem: 'Inconsistent drink quality?',
    benefits: ['Standardized recipes', 'Cost per drink', 'Taste profiles', 'PDF export'],
    icon: <FlaskConical className="w-6 h-6" />,
    path: '/cocktail-sop',
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🍹'
  },
  {
    id: 'lab-ops',
    name: 'LAB Ops',
    tagline: 'Complete Venue Management',
    problem: 'Need a full POS & management system?',
    benefits: ['Mobile ordering', 'Kitchen display', 'Staff scheduling', 'Analytics dashboard'],
    icon: <BarChart3 className="w-6 h-6" />,
    path: '/lab-ops',
    gradient: 'from-indigo-500 to-blue-500',
    emoji: '📈'
  },
  {
    id: 'live-map',
    name: 'Live Map',
    tagline: 'Discover & Connect',
    problem: 'Finding award-winning venues?',
    benefits: ['Nearby venues map', 'Michelin & awards filter', 'Connect with bartenders', 'Industry events'],
    icon: <Map className="w-6 h-6" />,
    path: '/live-map',
    gradient: 'from-green-500 to-emerald-500',
    emoji: '🗺️'
  },
  {
    id: 'shop',
    name: 'Shop',
    tagline: 'Premium Bar Products',
    problem: 'Need quality bar equipment?',
    benefits: ['Curated products', 'Industry discounts', 'Digital & physical items'],
    icon: <ShoppingBag className="w-6 h-6" />,
    path: '/shop',
    gradient: 'from-rose-500 to-pink-500',
    emoji: '🛍️'
  },
  {
    id: 'exam-center',
    name: 'Exam Center',
    tagline: 'Get Certified',
    problem: 'Want to prove your skills?',
    benefits: ['Industry certifications', 'AI-generated exams', 'Digital badges', 'Career advancement'],
    icon: <GraduationCap className="w-6 h-6" />,
    path: '/exam-center',
    gradient: 'from-yellow-500 to-amber-500',
    emoji: '🎓'
  },
  {
    id: 'industry-digest',
    name: 'Industry Digest',
    tagline: 'Stay Informed Daily',
    problem: 'Missing industry news?',
    benefits: ['Global hospitality news', 'Regional filtering', 'Award announcements', 'Trend insights'],
    icon: <Newspaper className="w-6 h-6" />,
    path: '/industry-digest',
    gradient: 'from-slate-500 to-zinc-500',
    emoji: '📰'
  },
  {
    id: 'team',
    name: 'Team Dashboard',
    tagline: 'Manage Your Crew',
    problem: 'Team coordination chaos?',
    benefits: ['Staff scheduling', 'Task management', 'Performance tracking', 'Time-off requests'],
    icon: <Users className="w-6 h-6" />,
    path: '/team-dashboard',
    gradient: 'from-cyan-500 to-blue-500',
    emoji: '👥'
  }
];

const ShareSpecVerseDialog = ({ open, onOpenChange }: ShareSpecVerseDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ShareableTool | null>(null);
  const [view, setView] = useState<'select' | 'share'>('select');
  const appUrl = window.location.origin;

  const handleCopyLink = () => {
    const url = selectedTool ? `${appUrl}${selectedTool.path}` : appUrl;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateToolStoryImage = async (tool: ShareableTool): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;
    const toolUrl = `${appUrl}${tool.path}`;

    // Transparent background for sticker effect
    ctx.clearRect(0, 0, 1080, 1920);

    // STICKER DESIGN - Centered sticker shape
    const stickerCenterX = 540;
    const stickerCenterY = 960;
    const stickerWidth = 900;
    const stickerHeight = 1100;

    // Sticker shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 15;

    // Sticker background - rounded rectangle with slight rotation for dynamic feel
    ctx.translate(stickerCenterX, stickerCenterY);
    ctx.rotate(-0.02); // Slight tilt
    
    const gradientColors = getGradientColors(tool.gradient);
    const stickerGrad = ctx.createLinearGradient(-stickerWidth/2, -stickerHeight/2, stickerWidth/2, stickerHeight/2);
    stickerGrad.addColorStop(0, gradientColors.start);
    stickerGrad.addColorStop(0.5, gradientColors.mid);
    stickerGrad.addColorStop(1, gradientColors.end);
    
    ctx.fillStyle = stickerGrad;
    ctx.beginPath();
    ctx.roundRect(-stickerWidth/2, -stickerHeight/2, stickerWidth, stickerHeight, 60);
    ctx.fill();
    ctx.restore();

    // Inner white border for sticker effect
    ctx.save();
    ctx.translate(stickerCenterX, stickerCenterY);
    ctx.rotate(-0.02);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(-stickerWidth/2 + 20, -stickerHeight/2 + 20, stickerWidth - 40, stickerHeight - 40, 50);
    ctx.stroke();
    ctx.restore();

    // Shine effect on top
    ctx.save();
    ctx.translate(stickerCenterX, stickerCenterY);
    ctx.rotate(-0.02);
    const shineGrad = ctx.createLinearGradient(0, -stickerHeight/2, 0, -stickerHeight/4);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.roundRect(-stickerWidth/2, -stickerHeight/2, stickerWidth, stickerHeight/3, [60, 60, 0, 0]);
    ctx.fill();
    ctx.restore();

    // Content on sticker
    ctx.save();
    ctx.translate(stickerCenterX, stickerCenterY);
    ctx.rotate(-0.02);

    // Large emoji at top
    ctx.font = '140px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tool.emoji, 0, -380);

    // Tool name - bold badge style
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.fillText(tool.name, 0, -250);

    // Tagline
    ctx.font = '38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 5;
    ctx.fillText(tool.tagline, 0, -180);

    // Problem statement box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(-380, -130, 760, 70, 15);
    ctx.fill();
    
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`❓ ${tool.problem}`, 0, -85);

    // Benefits section
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('✨ BENEFITS', 0, -20);

    // Benefits list
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    tool.benefits.forEach((benefit, i) => {
      ctx.fillText(`✓  ${benefit}`, -340, 40 + (i * 55));
    });

    ctx.textAlign = 'center';

    // "SpecVerse" branding
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Part of SpecVerse Platform', 0, 280);

    // QR Code section
    ctx.restore();
    
    try {
      const qrDataUrl = await QRCode.toDataURL(toolUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#ffffff',
          light: 'transparent'
        }
      });
      
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });
      
      // QR positioned inside sticker
      ctx.save();
      ctx.translate(stickerCenterX, stickerCenterY);
      ctx.rotate(-0.02);
      
      const qrSize = 160;
      
      // QR background circle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 320, qrSize/2 + 20, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.drawImage(qrImg, -qrSize/2, 320 - qrSize/2, qrSize, qrSize);
      
      // "SCAN ME" text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillText('SCAN ME', 0, 440);
      
      ctx.restore();
    } catch (err) {
      console.log('QR generation failed:', err);
    }

    // URL badge at bottom of sticker
    ctx.save();
    ctx.translate(stickerCenterX, stickerCenterY + 480);
    ctx.rotate(-0.02);
    
    // URL pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    const urlText = toolUrl.replace('https://', '');
    ctx.font = '26px system-ui, -apple-system, sans-serif';
    const urlWidth = ctx.measureText(urlText).width + 40;
    ctx.beginPath();
    ctx.roundRect(-urlWidth/2, -20, urlWidth, 40, 20);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(urlText, 0, 0);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
  };

  const getGradientColors = (gradient: string) => {
    const colorMap: Record<string, { start: string; mid: string; end: string }> = {
      'from-purple-500 via-pink-500 to-orange-500': { start: '#8b5cf6', mid: '#ec4899', end: '#f97316' },
      'from-violet-600 to-purple-600': { start: '#7c3aed', mid: '#9333ea', end: '#7c3aed' },
      'from-pink-500 to-rose-500': { start: '#ec4899', mid: '#f43f5e', end: '#be185d' },
      'from-amber-500 to-orange-500': { start: '#f59e0b', mid: '#ea580c', end: '#c2410c' },
      'from-emerald-500 to-teal-500': { start: '#10b981', mid: '#14b8a6', end: '#0d9488' },
      'from-blue-500 to-cyan-500': { start: '#3b82f6', mid: '#06b6d4', end: '#0891b2' },
      'from-indigo-500 to-blue-500': { start: '#6366f1', mid: '#3b82f6', end: '#2563eb' },
      'from-green-500 to-emerald-500': { start: '#22c55e', mid: '#10b981', end: '#059669' },
      'from-rose-500 to-pink-500': { start: '#f43f5e', mid: '#ec4899', end: '#db2777' },
      'from-yellow-500 to-amber-500': { start: '#eab308', mid: '#f59e0b', end: '#d97706' },
      'from-slate-500 to-zinc-500': { start: '#64748b', mid: '#71717a', end: '#52525b' },
      'from-cyan-500 to-blue-500': { start: '#06b6d4', mid: '#3b82f6', end: '#2563eb' },
    };
    return colorMap[gradient] || { start: '#8b5cf6', mid: '#ec4899', end: '#f97316' };
  };

  const handleShareTool = async (download = false) => {
    if (!selectedTool) return;
    
    setIsGenerating(true);
    
    try {
      const storyBlob = await generateToolStoryImage(selectedTool);
      const fileName = `specverse-${selectedTool.id}-promo.png`;
      const storyFile = new File([storyBlob], fileName, { type: 'image/png' });
      const toolUrl = `${appUrl}${selectedTool.path}`;

      if (!download && navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        try {
          await navigator.share({
            files: [storyFile],
            title: `${selectedTool.name} - SpecVerse`,
            url: toolUrl,
          });
          toast.success('Add a link sticker with the copied URL!');
          onOpenChange(false);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // Fallback: Download
      const url = URL.createObjectURL(storyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      navigator.clipboard.writeText(toolUrl);
      toast.success('Image downloaded & link copied!');
    } catch (err) {
      console.error('Share failed:', err);
      toast.error('Failed to generate story');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTool = (tool: ShareableTool) => {
    setSelectedTool(tool);
    setView('share');
  };

  const handleBack = () => {
    setView('select');
    setSelectedTool(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) {
        setView('select');
        setSelectedTool(null);
      }
    }}>
      <DialogContent className="glass max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === 'share' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={handleBack}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Share2 className="w-5 h-5" />
            {view === 'select' ? 'Share SpecVerse' : `Share ${selectedTool?.name}`}
          </DialogTitle>
        </DialogHeader>

        {view === 'select' ? (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Select a tool to create a shareable story sticker with direct link:
              </p>
              
              {SHAREABLE_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleSelectTool(tool)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${tool.gradient} text-white hover:opacity-90 transition-opacity text-left`}
                >
                  <div className="p-2 bg-white/20 rounded-lg">
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{tool.name}</p>
                    <p className="text-sm text-white/80 truncate">{tool.tagline}</p>
                  </div>
                  <span className="text-2xl">{tool.emoji}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : selectedTool && (
          <div className="space-y-4">
            {/* Preview card */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedTool.gradient} text-white`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{selectedTool.emoji}</span>
                <div>
                  <h3 className="font-bold text-lg">{selectedTool.name}</h3>
                  <p className="text-xs text-white/80">{selectedTool.tagline}</p>
                </div>
              </div>
              <p className="text-sm font-medium mb-2">❓ {selectedTool.problem}</p>
              <div className="space-y-1">
                {selectedTool.benefits.map((b, i) => (
                  <p key={i} className="text-xs text-white/90">✓ {b}</p>
                ))}
              </div>
            </div>

            {/* Share to Instagram Story */}
            <Button
              onClick={() => handleShareTool(false)}
              disabled={isGenerating}
              className={`w-full h-14 bg-gradient-to-r ${selectedTool.gradient} hover:opacity-90 text-white font-medium`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Story...
                </>
              ) : (
                <>
                  <Instagram className="w-5 h-5 mr-2" />
                  Share to Instagram Story
                </>
              )}
            </Button>

            {/* Download */}
            <Button
              onClick={() => handleShareTool(true)}
              disabled={isGenerating}
              variant="outline"
              className="w-full h-12"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Story Image
            </Button>

            {/* Copy Link */}
            <div className="flex gap-2">
              <Input 
                value={`${appUrl}${selectedTool.path}`} 
                readOnly 
                className="flex-1 text-sm" 
              />
              <Button onClick={handleCopyLink} variant="outline" size="icon">
                {copied ? <Link className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Story image includes QR code linking directly to {selectedTool.name}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareSpecVerseDialog;
