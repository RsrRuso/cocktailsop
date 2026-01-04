import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Download, Loader2, Share2, Copy, Link, ChevronLeft, Brain, Music, Calculator, ChefHat, FlaskConical, Users, BarChart3, Map, ShoppingBag, GraduationCap, Newspaper, Sparkles, Crown, FileText, Lightbulb, Zap, Wrench } from "lucide-react";
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
    tagline: 'The All-in-One Hospitality Ecosystem',
    problem: 'The hospitality industry remains dangerously fragmented. Bartenders juggle 10+ apps for recipes, scheduling, and networking. Managers waste hours on spreadsheets while missing critical insights. Venues lack affordable professional tools. Career advancement stalls without verified credentials. Finding mentorship, quality education, and investment opportunities feels impossible. The industry deserves better.',
    solution: 'SpecVerse is the world\'s first unified hospitality super-app. We combine professional networking, AI mentorship, venue management, recipe databases, team collaboration, certification programs, investor connections, and Instagram-style social features in one powerful platform. Build your verified career portfolio, manage your venue with enterprise-grade free tools, connect with 10,000+ professionals worldwide, and unlock opportunities you never knew existed.',
    benefits: ['Replace 10+ apps with one unified platform', 'Access 50+ FREE professional tools worth $5000+/year', 'Build a verified digital career portfolio with certificates', 'Connect with investors, mentors & global opportunities'],
    icon: <Sparkles className="w-6 h-6" />,
    path: '/',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    emoji: '🍸'
  },
  {
    id: 'matrix-ai',
    name: 'Matrix AI',
    tagline: 'Your 24/7 AI Hospitality Mentor',
    problem: 'Most hospitality professionals work without mentorship. Getting expert advice on cocktail chemistry, wine pairings, career moves, or troubleshooting problems means expensive consultants or waiting days for busy colleagues. Knowledge gaps slow career growth, limit creativity, and cost money in mistakes. Voice-free solutions don\'t work during busy service.',
    solution: 'Matrix AI is your personal AI mentor trained exclusively on hospitality knowledge. Ask anything about cocktails, spirits, wine, techniques, career advice, menu engineering, or trends. Get instant expert-level answers with voice-enabled hands-free operation. Personalized coaching that learns your style, tracks your growth, and recommends skills to develop. Available 24/7, never judges, always helpful.',
    benefits: ['Instant expert answers anytime, anywhere', 'Voice-enabled for hands-free service use', 'Personalized career coaching & skill tracking', 'Trained on 50,000+ hospitality knowledge points'],
    icon: <Brain className="w-6 h-6" />,
    path: '/matrix-ai',
    gradient: 'from-violet-600 to-purple-600',
    emoji: '🤖'
  },
  {
    id: 'music-box',
    name: 'Music Box',
    tagline: 'Professional Venue Audio Management',
    problem: 'Creating the perfect atmosphere takes hours of playlist curation. Great audio from viral reels goes unused. Team members can\'t access venue playlists. Trending hospitality tracks are scattered across platforms. Copyright issues create legal risks. No professional system exists for venue audio management.',
    solution: 'Music Box is your complete venue audio command center. Upload and organize your entire music library. Auto-extract audio from any video or reel. Access a curated library of trending hospitality tracks. Share playlists with your entire team instantly. Discover what top venues worldwide are playing. Professional audio management built for hospitality.',
    benefits: ['Build shareable venue playlists in minutes', 'Auto-extract audio from any video source', 'Access curated trending hospitality tracks', 'Team-wide playlist sharing & collaboration'],
    icon: <Music className="w-6 h-6" />,
    path: '/music-box',
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🎵'
  },
  {
    id: 'batch-calculator',
    name: 'Batch Calculator',
    tagline: 'Perfect Scaling, Zero Errors',
    problem: 'Manual batch calculations waste prep time and create costly errors. Scaling cocktail recipes from 1 serve to 500 liters requires tedious math. Sharing specs means rewriting recipes. Production tracking is scattered across notebooks. There\'s no attribution for who made what batch. Inventory impact is invisible.',
    solution: 'Batch Calculator instantly scales any recipe with perfect precision. One-click scaling from single serves to industrial batches. Share recipes with teams who see the full spec instantly. Track complete production history with team attribution. Auto-sync with inventory to deduct used ingredients. QR codes link batches to their source recipes.',
    benefits: ['One-click scaling from 1 serve to 1000 liters', 'Team recipe sharing with full specifications', 'Complete production history & attribution', 'Auto inventory sync eliminates stock errors'],
    icon: <Calculator className="w-6 h-6" />,
    path: '/batch-calculator',
    gradient: 'from-amber-500 to-orange-500',
    emoji: '🧮'
  },
  {
    id: 'menu-engineering',
    name: 'Menu Engineering Pro',
    tagline: 'Data-Driven Menu Optimization',
    problem: 'Most venues have no idea which items actually make money. Popular items might have terrible margins. Profitable items go unnoticed and unpromoted. Recipe costing takes hours. Ingredient cross-utilization opportunities are missed. You\'re leaving thousands in profit on the table without knowing it.',
    solution: 'Menu Engineering Pro uses BCG matrix analysis to categorize every item as Stars, Dogs, Puzzles, or Plowhorses. AI suggests optimal pricing based on psychology and competition. Identifies ingredient cross-utilization opportunities. Calculates exact food costs automatically. Reveals which items to promote, reprice, or remove. Turn data into profit.',
    benefits: ['Identify your most profitable items instantly', 'AI-powered pricing recommendations', 'Ingredient cross-utilization analysis', 'Increase profit margins by 15-30%'],
    icon: <ChefHat className="w-6 h-6" />,
    path: '/menu-engineering-pro',
    gradient: 'from-emerald-500 to-teal-500',
    emoji: '📊'
  },
  {
    id: 'cocktail-sop',
    name: 'Cocktail SOP',
    tagline: 'Standardized Excellence',
    problem: 'Inconsistent drinks damage your brand. Staff make recipes differently. Training new hires takes weeks. There\'s no standardized documentation. Calculating exact costs is manual. Taste profiles aren\'t mapped. Creating professional spec sheets takes hours. Quality varies by who\'s behind the bar.',
    solution: 'Cocktail SOP creates standardized, professional recipe specifications. Document exact measurements, techniques, garnishes, and costs. Map taste profiles with sweetness, sourness, bitterness levels. Calculate precise cost-per-drink. Generate beautiful PDF spec sheets for training. Ensure every drink is made perfectly, every time, by every bartender.',
    benefits: ['Consistent quality across all staff', 'Exact cost-per-drink calculations', 'Professional PDF specs for training', 'Complete taste profile documentation'],
    icon: <FlaskConical className="w-6 h-6" />,
    path: '/cocktail-sop',
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🍹'
  },
  {
    id: 'lab-ops',
    name: 'LAB Ops',
    tagline: 'Complete FREE Venue Management',
    problem: 'Traditional POS and venue management software costs $2000-10,000 per year. Small bars can\'t afford proper systems. Ordering, kitchen displays, scheduling, inventory, and analytics require multiple expensive subscriptions. This forces manual processes, errors, and inefficiency. Enterprise tools shouldn\'t require enterprise budgets.',
    solution: 'LAB Ops is a complete, totally FREE venue management system. Mobile POS for tableside ordering. Kitchen & Bar display systems for seamless service. Staff scheduling with shift management. Real-time inventory tracking. Comprehensive analytics and reporting. Enterprise capabilities without the enterprise price tag.',
    benefits: ['Complete mobile POS ordering system', 'Kitchen & Bar display systems (KDS/BDS)', 'Staff scheduling & shift management', 'Real-time analytics - ALL 100% FREE'],
    icon: <BarChart3 className="w-6 h-6" />,
    path: '/lab-ops',
    gradient: 'from-indigo-500 to-blue-500',
    emoji: '📈'
  },
  {
    id: 'wasabi',
    name: 'Community',
    tagline: 'Team Messaging That Works',
    problem: 'Restaurant teams use WhatsApp, creating chaos. Personal and work messages mix. Staff changes break group continuity. No message search or organization. Voice notes get lost. Shift handovers are verbal and forgotten. There\'s no professional team communication system built for hospitality.',
    solution: 'Community is team messaging designed for hospitality. Create team channels for FOH, BOH, and management. Voice notes, media sharing, and reactions built-in. Pin important messages. Archive old chats. Read receipts show who\'s seen updates. Search past conversations. Separate work from personal WhatsApp completely.',
    benefits: ['Dedicated work messaging channels', 'Voice notes, media & reactions', 'Message pinning & archive system', 'Complete conversation search'],
    icon: <Users className="w-6 h-6" />,
    path: '/community',
    gradient: 'from-green-500 to-emerald-500',
    emoji: '💬'
  },
  {
    id: 'live-map',
    name: 'Live Map',
    tagline: 'Discover Award-Winning Venues',
    problem: 'Finding award-winning venues is difficult. Award information is scattered across Michelin, World\'s 50 Best, Tales of the Cocktail, and regional guides. No easy way to see which bars near you have recognition. Connecting with local professionals is hit-or-miss. Industry events are hard to discover.',
    solution: 'Live Map is an interactive discovery platform showing venues with their awards and ratings. Filter by Michelin stars, World\'s 50 Best, regional awards, and more. Connect with hospitality professionals in your area. Discover industry events, job opportunities, and networking meetups on an intuitive map interface.',
    benefits: ['Filter by Michelin, World\'s 50 Best & awards', 'Discover venues by recognition level', 'Connect with local professionals', 'Find events & networking opportunities'],
    icon: <Map className="w-6 h-6" />,
    path: '/live-map',
    gradient: 'from-green-500 to-emerald-500',
    emoji: '🗺️'
  },
  {
    id: 'shop',
    name: 'Shop',
    tagline: 'Curated Professional Products',
    problem: 'Finding quality bar equipment is frustrating. Amazon doesn\'t understand professional needs. Quality varies wildly. There\'s no curation for professional standards. Digital products like courses, templates, and SOPs are scattered everywhere. No marketplace understands hospitality professionals.',
    solution: 'SpecVerse Shop is a curated marketplace specifically for hospitality. Premium bar tools, glassware, uniforms, and equipment from trusted sellers. Digital products including training courses, SOP templates, and resources. Every product vetted for professional quality. Built by hospitality people for hospitality people.',
    benefits: ['Curated premium quality products only', 'Industry-specific professional tools', 'Digital courses, templates & SOPs', 'Trusted sellers, verified quality'],
    icon: <ShoppingBag className="w-6 h-6" />,
    path: '/shop',
    gradient: 'from-rose-500 to-pink-500',
    emoji: '🛍️'
  },
  {
    id: 'exam-center',
    name: 'Exam Center',
    tagline: 'Prove Your Expertise',
    problem: 'Proving skills in hospitality is challenging. Traditional certifications cost hundreds and take months. There\'s no way to demonstrate specific expertise to employers. Resumes list jobs but not skills. Career advancement stalls without credentials. No standardized verification exists.',
    solution: 'Exam Center offers AI-generated examinations on cocktails, spirits, wine, service, and operations. Each exam is dynamically unique. Earn digital certificates and badges for your profile. Build a verified credential portfolio that proves your professional capabilities to employers worldwide. Free to start, valuable forever.',
    benefits: ['Industry-recognized digital certificates', 'AI-generated unique exams every time', 'Digital badges for profile & LinkedIn', 'Prove expertise to employers globally'],
    icon: <GraduationCap className="w-6 h-6" />,
    path: '/exam-center',
    gradient: 'from-yellow-500 to-amber-500',
    emoji: '🎓'
  },
  {
    id: 'industry-digest',
    name: 'Industry Digest',
    tagline: 'Stay Informed, Stay Ahead',
    problem: 'Staying updated on hospitality news is overwhelming. Trends, awards, openings, and opportunities are scattered across dozens of publications. Regional news is hard to filter. Missing key developments hurts your career and business decisions. Information overload leads to missing what matters.',
    solution: 'Industry Digest curates daily hospitality news from global publications. Filter by region - Middle East, Europe, Americas, Asia Pacific. Stay informed on Michelin announcements, World\'s 50 Best updates, trends, and opportunities. AI-powered relevance scoring shows you what matters most. Never miss important industry news again.',
    benefits: ['Daily curated global hospitality news', 'Regional filtering for relevance', 'Award & trend announcements', 'AI-powered importance scoring'],
    icon: <Newspaper className="w-6 h-6" />,
    path: '/industry-digest',
    gradient: 'from-slate-500 to-zinc-500',
    emoji: '📰'
  },
  {
    id: 'team',
    name: 'Team Dashboard',
    tagline: 'Modern Crew Management',
    problem: 'Team management in hospitality is chaos. Scheduling via group chats and spreadsheets. Task assignment lacks accountability. Performance tracking is subjective. Time-off requests get lost. Shift swaps cause confusion. No centralized system exists for hospitality team coordination.',
    solution: 'Team Dashboard provides complete crew management. Visual drag-and-drop scheduling. Task assignment with deadlines and accountability. Performance tracking and feedback. Time-off request handling. Shift swap management. All team coordination in one platform designed specifically for fast-paced hospitality operations.',
    benefits: ['Visual drag-and-drop scheduling', 'Task management with accountability', 'Performance reviews & feedback', 'Time-off & shift swap system'],
    icon: <Users className="w-6 h-6" />,
    path: '/team-dashboard',
    gradient: 'from-cyan-500 to-blue-500',
    emoji: '👥'
  },
  {
    id: 'gm-command',
    name: 'GM Command',
    tagline: 'Executive Intelligence Suite',
    problem: 'General Managers spend hours compiling reports, chasing approvals, and tracking metrics manually. Critical data is scattered across POS, spreadsheets, and paper. Strategic decisions are delayed by data collection. No unified view of venue health exists. Leadership runs on intuition instead of insights.',
    solution: 'GM Command Intelligence Suite delivers one-click leadership intelligence. Real-time financial dashboards, staff performance rankings, inventory variance alerts, automated meeting packets, universal approval workflows, AI predictions, and risk radar. Everything a GM needs to run a venue like a Fortune 500 company.',
    benefits: ['One-click executive meeting packets', 'Real-time financial dashboards', 'AI-powered predictions & risk alerts', 'Universal approval workflow engine'],
    icon: <Crown className="w-6 h-6" />,
    path: '/gm-command',
    gradient: 'from-amber-600 to-yellow-500',
    emoji: '👑'
  },
  {
    id: 'purchase-orders',
    name: 'Purchase Orders',
    tagline: 'AI-Powered Procurement',
    problem: 'Tracking purchase orders is a nightmare. Paper invoices pile up. Receiving documents get lost. Variance between ordered and received goes unnoticed. No visibility into spending patterns. Manual data entry wastes hours. Duplicate items create inventory chaos.',
    solution: 'Purchase Orders uses AI to parse invoices and POs instantly. Track ordered vs received with automatic variance analysis. Master item deduplication prevents duplicates. Aggregated reporting shows spending patterns. Workspace collaboration enables team-wide procurement visibility. Turn paper chaos into digital control.',
    benefits: ['AI-powered document scanning & parsing', 'Automatic variance analysis', 'Master items deduplication', 'Spending pattern analytics'],
    icon: <FileText className="w-6 h-6" />,
    path: '/purchase-orders',
    gradient: 'from-blue-600 to-indigo-500',
    emoji: '📋'
  },
  {
    id: 'business-hub',
    name: 'Business Hub',
    tagline: 'Pitch, Fund, Connect',
    problem: 'Hospitality entrepreneurs struggle to find investors. Great ideas stay hidden. Investors can\'t discover hospitality startups. No platform exists for hospitality business matchmaking. Finding co-founders, partners, and mentors in the industry is nearly impossible.',
    solution: 'Business Hub connects hospitality entrepreneurs with investors and partners. Pitch your business ideas to verified investors. Discover hospitality investment opportunities. Find co-founders with complementary skills. Connect with industry mentors. A dedicated marketplace for hospitality business growth.',
    benefits: ['Pitch to verified investors & partners', 'Discover investment opportunities', 'Find co-founders & collaborators', 'Connect with industry mentors'],
    icon: <Lightbulb className="w-6 h-6" />,
    path: '/business-hub',
    gradient: 'from-purple-600 to-violet-500',
    emoji: '💡'
  },
  {
    id: 'automations',
    name: 'Automations',
    tagline: 'Work Smarter, Not Harder',
    problem: 'Repetitive tasks drain productivity. Manual data entry, report generation, and notifications take hours weekly. Integrating systems requires technical expertise. Small venues can\'t afford custom automation. Staff time is wasted on tasks robots should do.',
    solution: 'Automations enables no-code workflow automation. Create triggers, connect webhooks, schedule tasks, and build workflows without coding. Automate inventory alerts, report generation, notifications, and integrations. Enterprise automation power accessible to every venue regardless of budget.',
    benefits: ['No-code workflow builder', 'Webhook integrations & triggers', 'Scheduled recurring automations', 'Custom notification workflows'],
    icon: <Zap className="w-6 h-6" />,
    path: '/automations',
    gradient: 'from-orange-500 to-red-500',
    emoji: '⚡'
  },
  {
    id: 'crm',
    name: 'CRM',
    tagline: 'Relationship Intelligence',
    problem: 'Customer relationships are managed in scattered notes. Lead tracking is inconsistent. Deal pipelines lack visibility. Follow-ups are missed. No centralized system exists for hospitality business development with suppliers, partners, and key accounts.',
    solution: 'CRM provides complete contact and deal management. Track leads from first contact to closed deals. Monitor pipelines visually. Schedule activities and reminders. Log every interaction. Purpose-built for hospitality with supplier, partner, and customer relationship tools.',
    benefits: ['Complete contact & lead management', 'Visual deal pipeline tracking', 'Activity scheduling & reminders', 'Full interaction history'],
    icon: <Users className="w-6 h-6" />,
    path: '/crm',
    gradient: 'from-teal-500 to-cyan-500',
    emoji: '🤝'
  },
  {
    id: 'reel-editor',
    name: 'Reel Editor Pro',
    tagline: 'Professional Video Creation',
    problem: 'Creating professional drink content requires expensive software. CapCut and Adobe are complex. Adding music, text, and effects takes hours. No editor understands hospitality content needs. Teams can\'t collaborate on video creation.',
    solution: 'Reel Editor Pro is built for hospitality content creation. Trim, filter, and enhance videos. Add text overlays, stickers, and music. Apply professional effects. Export in Instagram-ready formats. Studio workflow for team collaboration and approval processes.',
    benefits: ['Professional editing without complexity', 'Built-in music & sticker library', 'Team collaboration & approvals', 'Instagram-optimized export'],
    icon: <Music className="w-6 h-6" />,
    path: '/reel-editor-pro',
    gradient: 'from-pink-500 to-purple-500',
    emoji: '🎬'
  },
  {
    id: 'ops-tools',
    name: 'Ops Tools',
    tagline: '50+ Professional Calculators',
    problem: 'Hospitality operations require specialized calculators. ABV, scaling, yield, cost analysis - each requires separate apps or spreadsheets. No unified professional toolkit exists. Calculations are error-prone. Results can\'t be saved or shared.',
    solution: 'Ops Tools is a comprehensive suite of 50+ professional tools. ABV calculators, scaling tools, yield calculators, pour cost analysis, variance reports, temperature logs, and more. Save calculations, share results, and maintain records. Built specifically for hospitality operations.',
    benefits: ['50+ professional operational tools', 'ABV, scaling, yield calculators', 'Pour cost & variance analysis', 'Save & share all calculations'],
    icon: <Wrench className="w-6 h-6" />,
    path: '/ops-tools',
    gradient: 'from-gray-600 to-slate-500',
    emoji: '🔧'
  },
  {
    id: 'recipe-vault',
    name: 'Recipe Vault',
    tagline: 'Your Personal Recipe Library',
    problem: 'Personal recipes are scattered in notebooks, phones, and memory. There\'s no organized digital library. Recipes get lost when phones change. Sharing with colleagues means rewriting specs. No backup exists for your professional knowledge.',
    solution: 'Recipe Vault is your secure personal recipe library. Store unlimited cocktail recipes with ingredients and instructions. Organize by category, spirit, or style. Share individual recipes or entire collections. Cloud-synced so your knowledge is never lost. Your professional library, anywhere.',
    benefits: ['Unlimited recipe storage', 'Organize by category & spirit', 'Share recipes instantly', 'Cloud-synced & never lost'],
    icon: <FlaskConical className="w-6 h-6" />,
    path: '/recipe-vault',
    gradient: 'from-amber-500 to-yellow-500',
    emoji: '📖'
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

    // Load SV logo
    const svLogo = new Image();
    svLogo.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      svLogo.onload = () => resolve();
      svLogo.onerror = () => resolve();
      svLogo.src = '/sv-logo.png';
    });

    const gradientColors = getGradientColors(tool.gradient);

    // Rich gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0f0f1a');
    bgGrad.addColorStop(0.3, '#1a1a2e');
    bgGrad.addColorStop(0.7, '#16162a');
    bgGrad.addColorStop(1, '#0d0d18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Colorful glow at top
    const topGlow = ctx.createRadialGradient(540, 0, 0, 540, 0, 800);
    topGlow.addColorStop(0, gradientColors.start + '40');
    topGlow.addColorStop(0.5, gradientColors.end + '20');
    topGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, 1080, 800);

    // Subtle glow at bottom
    const bottomGlow = ctx.createRadialGradient(540, 1920, 0, 540, 1920, 600);
    bottomGlow.addColorStop(0, gradientColors.end + '30');
    bottomGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = bottomGlow;
    ctx.fillRect(0, 1400, 1080, 520);

    // Draw SV Logo at top center
    const logoSize = 100;
    const logoX = (1080 - logoSize) / 2;
    const logoY = 70;
    
    if (svLogo.complete && svLogo.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, 18);
      ctx.clip();
      ctx.drawImage(svLogo, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    // SpecVerse text - Grand Hotel font (matches platform branding)
    const headerY = logoY + logoSize + 15;
    ctx.font = '52px "Grand Hotel", cursive';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('SpecVerse', 540, headerY + 15);
    
    // Tagline
    ctx.font = '22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('THE HOSPITALITY PLATFORM', 540, headerY + 50);

    // Main glass card container
    const cardX = 45;
    const cardY = headerY + 85;
    const cardW = 990;
    const cardH = 1540;
    
    // Card background with gradient overlay
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, 'rgba(40, 40, 55, 0.95)');
    cardGrad.addColorStop(1, 'rgba(30, 30, 45, 0.95)');
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    
    // Card border with gradient glow
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, gradientColors.start + '50');
    borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    borderGrad.addColorStop(1, gradientColors.end + '50');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    // Tool name with gradient
    const toolNameY = cardY + 60;
    ctx.font = 'bold 62px system-ui, -apple-system, sans-serif';
    const titleGrad = ctx.createLinearGradient(250, toolNameY, 830, toolNameY);
    titleGrad.addColorStop(0, gradientColors.start);
    titleGrad.addColorStop(1, gradientColors.end);
    ctx.fillStyle = titleGrad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(tool.name, 540, toolNameY);

    // Tool tagline
    ctx.font = '30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(tool.tagline, 540, toolNameY + 75);

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
    const problemY = toolNameY + 150;
    const sectionPadding = 25;
    const problemHeight = 220;
    
    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cardX + sectionPadding, problemY, cardW - sectionPadding * 2, problemHeight, 18);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX + sectionPadding, problemY, cardW - sectionPadding * 2, problemHeight, 18);
    ctx.stroke();
    
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('❌ THE PROBLEM', 540, problemY + 38);
    
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    wrapText(tool.problem, 540, problemY + 75, cardW - 120, 30);

    // SOLUTION SECTION
    const solutionY = problemY + problemHeight + 20;
    const solutionHeight = 250;
    
    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cardX + sectionPadding, solutionY, cardW - sectionPadding * 2, solutionHeight, 18);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX + sectionPadding, solutionY, cardW - sectionPadding * 2, solutionHeight, 18);
    ctx.stroke();
    
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'center';
    ctx.fillText('✅ THE SOLUTION', 540, solutionY + 38);
    
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    wrapText(tool.solution, 540, solutionY + 75, cardW - 120, 30);

    // BENEFITS SECTION
    const benefitsY = solutionY + solutionHeight + 30;
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    const benefitsTitleGrad = ctx.createLinearGradient(400, benefitsY, 680, benefitsY);
    benefitsTitleGrad.addColorStop(0, '#fbbf24');
    benefitsTitleGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = benefitsTitleGrad;
    ctx.textAlign = 'center';
    ctx.fillText('✨ KEY BENEFITS', 540, benefitsY);

    // Benefits list
    ctx.textAlign = 'left';
    
    tool.benefits.forEach((benefit, i) => {
      const yPos = benefitsY + 50 + (i * 55);
      
      // Benefit background with subtle gradient
      const benefitGrad = ctx.createLinearGradient(cardX + sectionPadding, yPos - 15, cardX + cardW - sectionPadding, yPos - 15);
      benefitGrad.addColorStop(0, 'rgba(34, 197, 94, 0.1)');
      benefitGrad.addColorStop(1, 'rgba(20, 20, 30, 0.8)');
      ctx.fillStyle = benefitGrad;
      ctx.beginPath();
      ctx.roundRect(cardX + sectionPadding, yPos - 15, cardW - sectionPadding * 2, 48, 10);
      ctx.fill();
      
      // Green check icon
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 26px system-ui';
      ctx.fillText('✓', cardX + 48, yPos + 12);
      
      // Benefit text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.fillText(benefit, cardX + 88, yPos + 12);
    });

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
            {/* Header with tool info */}
            <div className={`p-4 rounded-xl bg-gradient-to-br ${selectedTool.gradient} text-white mb-3`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  {selectedTool.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{selectedTool.name}</h3>
                  <p className="text-xs text-white/80">{selectedTool.tagline}</p>
                </div>
                <span className="text-2xl">{selectedTool.emoji}</span>
              </div>
            </div>

            {/* THE PROBLEM Section */}
            <div className="bg-gradient-to-br from-red-950/40 to-red-900/20 border border-red-500/30 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-400 text-lg">❌</span>
                </div>
                <h4 className="font-bold text-red-400 text-sm uppercase tracking-wide">The Problem</h4>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{selectedTool.problem}</p>
            </div>

            {/* THE SOLUTION Section */}
            <div className="bg-gradient-to-br from-green-950/40 to-green-900/20 border border-green-500/30 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-lg">✅</span>
                </div>
                <h4 className="font-bold text-green-400 text-sm uppercase tracking-wide">Our Solution</h4>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{selectedTool.solution}</p>
            </div>

            {/* KEY BENEFITS Section */}
            <div className="bg-gradient-to-br from-amber-950/40 to-yellow-900/20 border border-amber-500/30 rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-amber-400 text-lg">✨</span>
                </div>
                <h4 className="font-bold text-amber-400 text-sm uppercase tracking-wide">Key Benefits</h4>
              </div>
              <div className="space-y-2.5">
                {selectedTool.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-black/20 rounded-lg p-2.5">
                    <div className="w-5 h-5 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-400 text-xs font-bold">✓</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{benefit}</p>
                  </div>
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
