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
  description: string;
  icon: React.ReactNode;
  path: string;
  gradient: string;
  emoji: string;
}

const SHAREABLE_TOOLS: ShareableTool[] = [
  {
    id: 'landing',
    name: 'SpecVerse',
    description: 'The Future of Hospitality',
    icon: <Sparkles className="w-6 h-6" />,
    path: '/',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    emoji: '🍸'
  },
  {
    id: 'matrix-ai',
    name: 'Matrix AI',
    description: 'AI-powered hospitality intelligence',
    icon: <Brain className="w-6 h-6" />,
    path: '/matrix-ai',
    gradient: 'from-violet-600 to-purple-600',
    emoji: '🤖'
  },
  {
    id: 'music-box',
    name: 'Music Box',
    description: 'Curate & share music for your venue',
    icon: <Music className="w-6 h-6" />,
    path: '/music-box',
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🎵'
  },
  {
    id: 'batch-calculator',
    name: 'Batch Calculator',
    description: 'Scale cocktail recipes with precision',
    icon: <Calculator className="w-6 h-6" />,
    path: '/batch-calculator',
    gradient: 'from-amber-500 to-orange-500',
    emoji: '🧮'
  },
  {
    id: 'menu-engineering',
    name: 'Menu Engineering Pro',
    description: 'Optimize your menu profitability',
    icon: <ChefHat className="w-6 h-6" />,
    path: '/menu-engineering-pro',
    gradient: 'from-emerald-500 to-teal-500',
    emoji: '📊'
  },
  {
    id: 'cocktail-sop',
    name: 'Cocktail SOP',
    description: 'Professional recipe documentation',
    icon: <FlaskConical className="w-6 h-6" />,
    path: '/cocktail-sop',
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🍹'
  },
  {
    id: 'lab-ops',
    name: 'LAB Ops',
    description: 'Restaurant & bar management suite',
    icon: <BarChart3 className="w-6 h-6" />,
    path: '/lab-ops',
    gradient: 'from-indigo-500 to-blue-500',
    emoji: '📈'
  },
  {
    id: 'live-map',
    name: 'Live Map',
    description: 'Discover venues & connect with pros',
    icon: <Map className="w-6 h-6" />,
    path: '/live-map',
    gradient: 'from-green-500 to-emerald-500',
    emoji: '🗺️'
  },
  {
    id: 'shop',
    name: 'Shop',
    description: 'Premium hospitality products',
    icon: <ShoppingBag className="w-6 h-6" />,
    path: '/shop',
    gradient: 'from-rose-500 to-pink-500',
    emoji: '🛍️'
  },
  {
    id: 'exam-center',
    name: 'Exam Center',
    description: 'Professional certifications',
    icon: <GraduationCap className="w-6 h-6" />,
    path: '/exam-center',
    gradient: 'from-yellow-500 to-amber-500',
    emoji: '🎓'
  },
  {
    id: 'industry-digest',
    name: 'Industry Digest',
    description: 'Daily hospitality news & insights',
    icon: <Newspaper className="w-6 h-6" />,
    path: '/industry-digest',
    gradient: 'from-slate-500 to-zinc-500',
    emoji: '📰'
  },
  {
    id: 'team',
    name: 'Team Dashboard',
    description: 'Manage your hospitality team',
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

    // Dynamic gradient based on tool
    const gradientColors = getGradientColors(tool.gradient);
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, gradientColors.start);
    gradient.addColorStop(0.5, gradientColors.mid);
    gradient.addColorStop(1, gradientColors.end);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Add decorative glows
    const glow1 = ctx.createRadialGradient(200, 400, 0, 200, 400, 400);
    glow1.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 600, 800);

    const glow2 = ctx.createRadialGradient(900, 1500, 0, 900, 1500, 400);
    glow2.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(500, 1100, 580, 820);

    // Tool emoji large
    ctx.font = '200px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(tool.emoji, 540, 650);

    // Tool name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 90px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.fillText(tool.name, 540, 850);

    // Tool description
    ctx.font = '44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fillText(tool.description, 540, 940);

    // "Part of SpecVerse" branding
    ctx.font = 'italic 36px Georgia, serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Part of SpecVerse', 540, 1050);

    // Generate QR code for specific tool
    const toolUrl = `${appUrl}${tool.path}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(toolUrl, {
        width: 220,
        margin: 2,
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
      
      const qrSize = 200;
      const qrX = (1080 - qrSize) / 2;
      const qrY = 1400;
      
      // QR background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(qrX - 25, qrY - 25, qrSize + 50, qrSize + 50, 24);
      ctx.fill();
      
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      
      // Scan text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText('Scan to Try', 540, qrY + qrSize + 60);
    } catch (err) {
      console.log('QR generation failed:', err);
    }

    // URL at bottom
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(toolUrl.replace('https://', ''), 540, 1850);

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
                    <p className="text-sm text-white/80 truncate">{tool.description}</p>
                  </div>
                  <span className="text-2xl">{tool.emoji}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : selectedTool && (
          <div className="space-y-4">
            {/* Preview card */}
            <div className={`p-6 rounded-2xl bg-gradient-to-br ${selectedTool.gradient} text-white text-center`}>
              <span className="text-5xl">{selectedTool.emoji}</span>
              <h3 className="font-bold text-xl mt-3">{selectedTool.name}</h3>
              <p className="text-sm text-white/80 mt-1">{selectedTool.description}</p>
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
