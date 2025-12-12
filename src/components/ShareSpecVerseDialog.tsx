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
  solution: string;
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
    problem: 'The hospitality industry is fragmented. Bartenders, managers, and venues struggle with scattered tools, lack professional networking, have no centralized career development, and miss investment opportunities. Finding quality education, connecting with industry peers globally, and building a verified professional presence is nearly impossible.',
    solution: 'SpecVerse is the world\'s first all-in-one hospitality ecosystem. We unite professional networking, verified credentials, career tools, venue management systems, recipe databases, team collaboration, investor connections, and social features in one powerful platform. Build your reputation, grow your career, manage your venue, and connect with thousands of hospitality professionals worldwide.',
    benefits: ['Connect with 10,000+ verified hospitality professionals globally', 'Access 50+ free professional calculators, recipe tools & analytics', 'Build your verified career portfolio with digital certificates', 'Discover investment opportunities & business partnerships'],
    icon: <Sparkles className="w-6 h-6" />,
    path: '/',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    emoji: '🍸'
  },
  {
    id: 'matrix-ai',
    name: 'Matrix AI',
    tagline: 'Your AI Hospitality Mentor',
    problem: 'Hospitality professionals often work alone without access to mentorship. Getting expert advice on cocktail recipes, service techniques, wine pairings, career decisions, or troubleshooting problems requires expensive consultants or waiting for busy colleagues. This knowledge gap slows career growth and limits creativity.',
    solution: 'Matrix AI is your 24/7 AI mentor trained specifically for hospitality. Ask any question about cocktails, spirits, wine, service techniques, career advice, menu engineering, or industry trends. Get instant expert-level answers, recipe suggestions, technique explanations, and personalized career guidance. Voice-enabled for hands-free use during service.',
    benefits: ['Get expert answers instantly, anytime, anywhere', 'Voice-enabled assistant for hands-free operation', 'Trained on hospitality-specific knowledge base', 'Personalized career coaching & skill development'],
    icon: <Brain className="w-6 h-6" />,
    path: '/matrix-ai',
    gradient: 'from-violet-600 to-purple-600',
    emoji: '🤖'
  },
  {
    id: 'music-box',
    name: 'Music Box',
    tagline: 'Curate Your Venue Sound',
    problem: 'Creating the perfect atmosphere for your bar or restaurant takes hours of playlist curation. Finding the right music, organizing tracks, sharing with your team, and keeping the vibe fresh is time-consuming. Meanwhile, great audio from viral reels goes unused and trending hospitality tracks are hard to discover.',
    solution: 'Music Box is your complete venue audio management system. Upload and organize your music library, auto-extract audio from popular reels, access a curated library of trending hospitality tracks, and share playlists with your entire team instantly. Create the perfect atmosphere with professionally curated sound.',
    benefits: ['Build and share venue playlists in minutes', 'Auto-extract music from any video or reel', 'Access trending hospitality music library', 'Team-wide playlist sharing & collaboration'],
    icon: <Music className="w-6 h-6" />,
    path: '/music-box',
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🎵'
  },
  {
    id: 'batch-calculator',
    name: 'Batch Calculator',
    tagline: 'Scale Recipes Perfectly',
    problem: 'Manual batch calculations waste valuable prep time and lead to costly errors. Scaling cocktail recipes from single serves to 50-liter batches requires tedious math. Sharing recipes with team members means writing specs repeatedly. Production tracking is scattered across notebooks and spreadsheets.',
    solution: 'Batch Calculator instantly scales any cocktail recipe to any batch size with perfect precision. Generate QR codes to share recipes with your team - one scan shows the full spec. Track production history, log who made what and when, and maintain complete batch documentation for inventory and quality control.',
    benefits: ['One-click scaling from 1 serve to 1000 liters', 'QR code recipe sharing - instant team access', 'Complete production history & team attribution', 'Perfect precision eliminates costly batch errors'],
    icon: <Calculator className="w-6 h-6" />,
    path: '/batch-calculator',
    gradient: 'from-amber-500 to-orange-500',
    emoji: '🧮'
  },
  {
    id: 'menu-engineering',
    name: 'Menu Engineering',
    tagline: 'Maximize Menu Profits',
    problem: 'Most venues have no idea which menu items actually make money. Popular items might have terrible margins while profitable items go unnoticed. Without proper analysis, you\'re leaving thousands in profit on the table. Recipe costing is tedious and ingredient cross-utilization opportunities are missed.',
    solution: 'Menu Engineering Pro uses BCG matrix analysis to categorize every item as Stars, Dogs, Puzzles, or Plowhorses. AI suggests optimal pricing, identifies ingredient cross-utilization opportunities, calculates exact food costs, and reveals which items to promote, reprice, or remove. Data-driven menu optimization that maximizes profit.',
    benefits: ['Identify your most profitable menu items instantly', 'AI-powered pricing recommendations', 'Ingredient cross-utilization analysis', 'Increase profit margins by 15-30%'],
    icon: <ChefHat className="w-6 h-6" />,
    path: '/menu-engineering-pro',
    gradient: 'from-emerald-500 to-teal-500',
    emoji: '📊'
  },
  {
    id: 'cocktail-sop',
    name: 'Cocktail SOP',
    tagline: 'Professional Recipe Specs',
    problem: 'Inconsistent drinks damage your brand and frustrate guests. Staff make recipes differently, training new hires is slow, and there\'s no standardized documentation. Calculating exact costs per drink, tracking taste profiles, and creating professional spec sheets takes hours of manual work.',
    solution: 'Cocktail SOP creates standardized, professional recipe specifications. Document exact measurements, techniques, garnishes, and costs. Map taste profiles for each drink. Generate beautiful PDF spec sheets for training and operations. Ensure every drink is made perfectly, every time, by every bartender.',
    benefits: ['Consistent drink quality across all staff', 'Exact cost-per-drink calculations', 'Professional PDF spec sheets for training', 'Taste profile mapping & documentation'],
    icon: <FlaskConical className="w-6 h-6" />,
    path: '/cocktail-sop',
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🍹'
  },
  {
    id: 'lab-ops',
    name: 'LAB Ops',
    tagline: 'Complete Venue Management',
    problem: 'Traditional POS and venue management software costs thousands per year. Small bars and restaurants can\'t afford proper systems for ordering, kitchen displays, staff scheduling, inventory management, and analytics. This forces manual processes, errors, and inefficiency.',
    solution: 'LAB Ops is a complete, FREE venue management system. Mobile POS for ordering, Kitchen and Bar display systems, staff scheduling with shift management, inventory tracking, real-time analytics, and comprehensive reporting. Enterprise-level capabilities without the enterprise price tag.',
    benefits: ['Complete mobile POS ordering system', 'Kitchen & Bar display systems (KDS/BDS)', 'Staff scheduling & shift management', 'Real-time analytics & comprehensive reports'],
    icon: <BarChart3 className="w-6 h-6" />,
    path: '/lab-ops',
    gradient: 'from-indigo-500 to-blue-500',
    emoji: '📈'
  },
  {
    id: 'live-map',
    name: 'Live Map',
    tagline: 'Discover & Connect',
    problem: 'Finding award-winning venues, discovering industry events, and connecting with local hospitality professionals is difficult. Award information is scattered across different guides. There\'s no easy way to see which bars near you have Michelin stars, World\'s 50 Best recognition, or other prestigious awards.',
    solution: 'Live Map is an interactive discovery platform showing nearby and city-wide venues with their awards and ratings. Filter by Michelin stars, World\'s 50 Best, regional awards, and more. Connect with hospitality professionals in your area. Discover industry events, job opportunities, and networking meetups.',
    benefits: ['Discover Michelin, World\'s 50 Best & award venues', 'Filter venues by specific awards & ratings', 'Connect with local hospitality professionals', 'Find industry events & networking opportunities'],
    icon: <Map className="w-6 h-6" />,
    path: '/live-map',
    gradient: 'from-green-500 to-emerald-500',
    emoji: '🗺️'
  },
  {
    id: 'shop',
    name: 'Shop',
    tagline: 'Premium Bar Products',
    problem: 'Finding quality bar equipment and hospitality products is frustrating. Generic marketplaces don\'t understand industry-specific needs. Product quality varies wildly, and there\'s no curation for professional standards. Digital products like templates, courses, and resources are scattered across the web.',
    solution: 'SpecVerse Shop is a curated marketplace specifically for hospitality professionals. Premium bar tools, glassware, uniforms, and equipment from trusted sellers. Digital products including training courses, templates, and resources. Every product is vetted for professional quality and industry relevance.',
    benefits: ['Curated premium quality products only', 'Industry-specific tools & equipment', 'Digital courses, templates & resources', 'Trusted sellers with professional standards'],
    icon: <ShoppingBag className="w-6 h-6" />,
    path: '/shop',
    gradient: 'from-rose-500 to-pink-500',
    emoji: '🛍️'
  },
  {
    id: 'exam-center',
    name: 'Exam Center',
    tagline: 'Get Certified',
    problem: 'Proving your skills and advancing your career in hospitality is challenging. Traditional certifications are expensive and time-consuming. There\'s no way to demonstrate specific expertise in cocktails, spirits, wine, or service to potential employers. Career advancement often stalls without recognized credentials.',
    solution: 'Exam Center offers AI-generated examinations on cocktails, spirits, wine, bar operations, service techniques, and more. Each exam is dynamically generated for uniqueness. Earn digital certificates and badges to showcase your expertise. Build a verified credential portfolio that proves your professional capabilities to employers worldwide.',
    benefits: ['Industry-recognized digital certifications', 'AI-generated unique exams every time', 'Digital badges for your profile & portfolio', 'Prove expertise to employers worldwide'],
    icon: <GraduationCap className="w-6 h-6" />,
    path: '/exam-center',
    gradient: 'from-yellow-500 to-amber-500',
    emoji: '🎓'
  },
  {
    id: 'industry-digest',
    name: 'Industry Digest',
    tagline: 'Stay Informed Daily',
    problem: 'Staying updated on hospitality industry news is overwhelming. Important trends, award announcements, venue openings, and career opportunities are scattered across dozens of publications. Regional news is hard to filter. Missing key industry developments can hurt your career and business decisions.',
    solution: 'Industry Digest curates daily hospitality news from global publications. Filter by region - Middle East, Europe, Americas, Asia Pacific. Stay informed on Michelin announcements, World\'s 50 Best updates, industry trends, career opportunities, and business insights. Never miss important industry news again.',
    benefits: ['Daily curated global hospitality news', 'Regional filtering for relevant content', 'Award announcements & industry updates', 'Trend insights for career & business decisions'],
    icon: <Newspaper className="w-6 h-6" />,
    path: '/industry-digest',
    gradient: 'from-slate-500 to-zinc-500',
    emoji: '📰'
  },
  {
    id: 'team',
    name: 'Team Dashboard',
    tagline: 'Manage Your Crew',
    problem: 'Team management in hospitality is chaotic. Scheduling happens via group chats and spreadsheets. Task assignment lacks accountability. Performance tracking is subjective. Time-off requests get lost. Shift swaps cause confusion. There\'s no centralized system for team coordination and communication.',
    solution: 'Team Dashboard provides complete crew management. Visual scheduling with drag-and-drop shifts. Task assignment with deadlines and accountability. Performance tracking and feedback. Time-off request handling. Shift swap management. All team coordination in one unified platform designed specifically for hospitality operations.',
    benefits: ['Visual drag-and-drop staff scheduling', 'Task management with accountability tracking', 'Performance reviews & feedback system', 'Time-off & shift swap management'],
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

    // Dark elegant background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#0f0f23');
    bgGrad.addColorStop(0.5, '#1a1a2e');
    bgGrad.addColorStop(1, '#0f0f23');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative glow orbs
    const gradientColors = getGradientColors(tool.gradient);
    
    const glow1 = ctx.createRadialGradient(200, 300, 0, 200, 300, 400);
    glow1.addColorStop(0, gradientColors.start + '40');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 600, 700);

    const glow2 = ctx.createRadialGradient(880, 1600, 0, 880, 1600, 400);
    glow2.addColorStop(0, gradientColors.end + '30');
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(480, 1200, 600, 720);

    // SpecVerse Logo Header with visible sparkle icon
    const headerY = 50;
    
    // Draw sparkle/star icons around SpecVerse text
    const drawSparkle = (x: number, y: number, size: number, color: string) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      // 4-point star sparkle
      const outer = size;
      const inner = size * 0.3;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) - Math.PI / 2;
        const nextAngle = angle + Math.PI / 4;
        ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
        ctx.lineTo(x + Math.cos(nextAngle) * inner, y + Math.sin(nextAngle) * inner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    
    // Gradient for sparkles
    drawSparkle(300, headerY + 30, 20, gradientColors.start);
    drawSparkle(780, headerY + 30, 20, gradientColors.end);
    drawSparkle(260, headerY + 60, 12, gradientColors.mid);
    drawSparkle(820, headerY + 60, 12, gradientColors.mid);
    
    // SpecVerse brand text - using billabong style italic like platform
    ctx.font = 'italic 600 56px "Billabong", "Dancing Script", "Pacifico", cursive, Georgia';
    const brandGrad = ctx.createLinearGradient(350, headerY, 730, headerY + 60);
    brandGrad.addColorStop(0, '#ffffff');
    brandGrad.addColorStop(0.5, gradientColors.start);
    brandGrad.addColorStop(1, gradientColors.end);
    ctx.fillStyle = brandGrad;
    ctx.textAlign = 'center';
    ctx.fillText('SpecVerse', 540, headerY + 55);
    
    // Add glow effect behind text
    ctx.shadowColor = gradientColors.start;
    ctx.shadowBlur = 30;
    ctx.fillText('SpecVerse', 540, headerY + 55);
    ctx.shadowBlur = 0;
    
    // Tagline under brand
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('THE HOSPITALITY PLATFORM', 540, headerY + 90);

    // Glass card container
    const cardX = 60;
    const cardY = 160;
    const cardW = 960;
    const cardH = 1520;
    
    // Card shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 20;
    
    // Glass background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 40);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Card border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 40);
    ctx.stroke();

    // Tool icon gradient badge
    const badgeY = cardY + 70;
    const badgeGrad = ctx.createLinearGradient(440, badgeY - 50, 640, badgeY + 50);
    badgeGrad.addColorStop(0, gradientColors.start);
    badgeGrad.addColorStop(1, gradientColors.end);
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.arc(540, badgeY, 55, 0, Math.PI * 2);
    ctx.fill();
    
    // Emoji in badge
    ctx.font = '52px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tool.emoji, 540, badgeY);

    // Tool name with gradient
    ctx.font = 'bold 58px system-ui, -apple-system, sans-serif';
    const titleGrad = ctx.createLinearGradient(300, badgeY + 90, 780, badgeY + 90);
    titleGrad.addColorStop(0, gradientColors.start);
    titleGrad.addColorStop(0.5, '#a855f7');
    titleGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = titleGrad;
    ctx.textBaseline = 'top';
    ctx.fillText(tool.name, 540, badgeY + 70);

    // Tagline
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(tool.tagline, 540, badgeY + 140);

    // Helper function for text wrapping
    const wrapText = (text: string, x: number, y: number, maxW: number, lineHeight: number, align: CanvasTextAlign = 'center') => {
      ctx.textAlign = align;
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      
      words.forEach(word => {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxW) {
          ctx.fillText(line.trim(), x, currentY);
          line = word + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line.trim(), x, currentY);
      return currentY + lineHeight;
    };

    // PROBLEM SECTION
    const problemY = badgeY + 200;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.beginPath();
    ctx.roundRect(cardX + 25, problemY - 15, cardW - 50, 180, 16);
    ctx.fill();
    
    // Problem border
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX + 25, problemY - 15, cardW - 50, 180, 16);
    ctx.stroke();
    
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('❌ THE PROBLEM', 540, problemY + 15);
    
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    wrapText(tool.problem, 540, problemY + 50, cardW - 100, 28);

    // SOLUTION SECTION
    const solutionY = problemY + 210;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    ctx.beginPath();
    ctx.roundRect(cardX + 25, solutionY - 15, cardW - 50, 220, 16);
    ctx.fill();
    
    // Solution border
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX + 25, solutionY - 15, cardW - 50, 220, 16);
    ctx.stroke();
    
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText('✅ THE SOLUTION', 540, solutionY + 15);
    
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    wrapText(tool.solution, 540, solutionY + 50, cardW - 100, 28);

    // BENEFITS SECTION
    const benefitsY = solutionY + 250;
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = gradientColors.start;
    ctx.textAlign = 'center';
    ctx.fillText('✨ KEY BENEFITS', 540, benefitsY);

    // Benefits list
    ctx.textAlign = 'left';
    
    tool.benefits.forEach((benefit, i) => {
      const yPos = benefitsY + 45 + (i * 52);
      
      // Benefit background
      const benefitGrad = ctx.createLinearGradient(cardX + 35, yPos, cardX + cardW - 70, yPos);
      benefitGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
      benefitGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = benefitGrad;
      ctx.beginPath();
      ctx.roundRect(cardX + 35, yPos - 18, cardW - 70, 46, 10);
      ctx.fill();
      
      // Check icon with gradient color
      ctx.fillStyle = gradientColors.start;
      ctx.font = 'bold 24px system-ui';
      ctx.fillText('✓', cardX + 55, yPos + 10);
      
      // Benefit text
      ctx.fillStyle = '#ffffff';
      ctx.font = '23px system-ui, -apple-system, sans-serif';
      ctx.fillText(benefit, cardX + 90, yPos + 10);
    });

    // QR Code section
    const qrY = cardY + cardH - 180;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(toolUrl, {
        width: 160,
        margin: 1,
        color: {
          dark: '#ffffff',
          light: '#00000000'
        }
      });
      
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });
      
      const qrSize = 110;
      
      // QR background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(540 - qrSize/2 - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
      ctx.fill();
      
      ctx.drawImage(qrImg, 540 - qrSize/2, qrY, qrSize, qrSize);
      
      // Scan text
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('SCAN TO TRY FREE', 540, qrY + qrSize + 35);
    } catch (err) {
      console.log('QR generation failed:', err);
    }

    // URL button outside card
    const urlBoxY = cardY + cardH + 35;
    
    // URL background pill with gradient
    const urlGrad = ctx.createLinearGradient(140, urlBoxY, 940, urlBoxY);
    urlGrad.addColorStop(0, gradientColors.start);
    urlGrad.addColorStop(1, gradientColors.end);
    ctx.fillStyle = urlGrad;
    ctx.beginPath();
    ctx.roundRect(140, urlBoxY - 28, 800, 56, 28);
    ctx.fill();
    
    // URL text
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`🔗 ${toolUrl.replace('https://', '')}`, 540, urlBoxY + 6);

    // Call to action
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Add link sticker ☝️ to make it clickable!', 540, urlBoxY + 48);


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
    const toolUrl = `${appUrl}${selectedTool.path}`;
    
    try {
      const storyBlob = await generateToolStoryImage(selectedTool);
      const fileName = `specverse-${selectedTool.id}-promo.png`;
      const storyFile = new File([storyBlob], fileName, { type: 'image/png' });

      // Copy URL to clipboard
      try {
        await navigator.clipboard.writeText(toolUrl);
      } catch {
        // Continue anyway
      }

      if (download) {
        // Download the image
        const url = URL.createObjectURL(storyBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Image downloaded!', { duration: 3000 });
        setIsGenerating(false);
        return;
      }

      // Try Web Share API with files first (best mobile experience)
      if (navigator.share && navigator.canShare?.({ files: [storyFile] })) {
        try {
          await navigator.share({
            files: [storyFile],
            title: `${selectedTool.name} - SpecVerse`,
          });
          toast.success('Shared! Add link sticker in Instagram', {
            duration: 5000,
            description: toolUrl
          });
          onOpenChange(false);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            setIsGenerating(false);
            return;
          }
        }
      }

      // Try copying image to clipboard for paste in Instagram
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': storyBlob
          })
        ]);
        
        // Open Instagram Stories directly
        const instagramUrl = 'instagram://story-camera';
        window.location.href = instagramUrl;
        
        toast.success('Image copied! Paste in Instagram Stories', {
          duration: 5000,
          description: 'Long-press to paste the image'
        });
        
        // Fallback: if Instagram doesn't open, try web
        setTimeout(() => {
          window.open('https://instagram.com/stories/create', '_blank');
        }, 2000);
        
        onOpenChange(false);
        return;
      } catch {
        // Clipboard image write not supported
      }

      // Final fallback: Open Instagram web
      window.open('https://instagram.com', '_blank');
      toast.info('Open Instagram Stories and upload the image', {
        duration: 5000,
      });
      
      // Also download as backup
      const url = URL.createObjectURL(storyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
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
      <DialogContent className="p-0 max-w-sm max-h-[80vh] overflow-hidden border border-white/10 bg-[#1a1a2e]">
        <DialogHeader className="p-3 pb-0">
          <DialogTitle className="flex items-center gap-2 text-foreground text-sm">
            {view === 'share' && (
              <Button variant="ghost" size="icon" className="h-6 w-6 mr-1" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <Share2 className="w-4 h-4" />
            {view === 'select' ? 'Share SpecVerse' : selectedTool?.name}
          </DialogTitle>
        </DialogHeader>

        {view === 'select' ? (
          <ScrollArea className="h-[60vh] px-3 pb-3">
            <div className="space-y-1.5">
              {SHAREABLE_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleSelectTool(tool)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r ${tool.gradient} text-white hover:opacity-90 transition-opacity text-left`}
                >
                  <div className="p-1.5 bg-white/20 rounded-md">
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tool.name}</p>
                    <p className="text-xs text-white/70 truncate">{tool.tagline}</p>
                  </div>
                  <span className="text-lg">{tool.emoji}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : selectedTool && (
          <ScrollArea className="h-[65vh] px-3 pb-3">
            {/* Preview card with gradient */}
            <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedTool.gradient} text-white`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{selectedTool.emoji}</span>
                <div>
                  <h3 className="font-bold text-sm">{selectedTool.name}</h3>
                  <p className="text-[10px] text-white/70">{selectedTool.tagline}</p>
                </div>
              </div>
              
              <div className="bg-black/30 rounded-md p-2 mb-2">
                <p className="text-[11px] leading-relaxed">❌ {selectedTool.problem}</p>
              </div>
              
              <div className="bg-black/30 rounded-md p-2 mb-2">
                <p className="text-[11px] leading-relaxed">✅ {selectedTool.solution}</p>
              </div>
              
              <div className="space-y-0.5">
                {selectedTool.benefits.map((b, i) => (
                  <p key={i} className="text-[10px] text-white/90">✓ {b}</p>
                ))}
              </div>
            </div>

            {/* Share buttons */}
            <Button
              onClick={() => handleShareTool(false)}
              disabled={isGenerating}
              className={`w-full h-10 mt-3 bg-gradient-to-r ${selectedTool.gradient} hover:opacity-90 text-white font-medium`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Instagram className="w-4 h-4 mr-2" />
                  Share to Instagram Story
                </>
              )}
            </Button>

            <Button
              onClick={() => handleShareTool(true)}
              disabled={isGenerating}
              variant="outline"
              className="w-full h-9"
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              Download Story Image
            </Button>

            {/* Compact link copy */}
            <div className="flex gap-1.5">
              <Input 
                value={`${appUrl}${selectedTool.path}`} 
                readOnly 
                className="flex-1 h-8 text-xs" 
              />
              <Button onClick={handleCopyLink} variant="outline" size="icon" className="h-8 w-8">
                {copied ? <Link className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Story includes QR code linking to {selectedTool.name}
            </p>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareSpecVerseDialog;
