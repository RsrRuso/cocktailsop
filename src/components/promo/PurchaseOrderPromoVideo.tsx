import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download, Play, Pause, RefreshCw, Sparkles,
  Video, CheckCircle2, Loader2, FileText, Users,
  Package, Calculator, TrendingUp, AlertTriangle,
  Check, ArrowRight, Truck, ClipboardCheck, BarChart3
} from "lucide-react";
import { toast } from "sonner";

type SceneType = 
  | 'intro' 
  | 'pin-access'
  | 'file-upload'
  | 'file-parsing'
  | 'team-workspace'
  | 'create-order' 
  | 'order-sent'
  | 'receive-delivery' 
  | 'receive-upload'
  | 'check-items'
  | 'discrepancy-found' 
  | 'excluded-items' 
  | 'total-adjusted'
  | 'order-tracking' 
  | 'spending-overview'
  | 'forecast-usage'
  | 'outro';

interface SceneData {
  scene: SceneType;
  title: string;
  subtitle: string;
  duration: number;
}

const SCENES: SceneData[] = [
  { scene: 'intro', title: 'Purchase Orders', subtitle: 'Complete Procurement Management', duration: 2 },
  { scene: 'pin-access', title: 'PIN Login', subtitle: 'Secure Access via My Space', duration: 3 },
  { scene: 'file-upload', title: 'Upload Documents', subtitle: 'PDF, Image or Excel', duration: 3 },
  { scene: 'file-parsing', title: 'Auto-Parsed', subtitle: 'System Extracts Items', duration: 3 },
  { scene: 'team-workspace', title: 'Team Workspace', subtitle: 'Everyone Works Together', duration: 3 },
  { scene: 'create-order', title: 'Create Purchase Order', subtitle: 'Select Items & Quantities', duration: 3 },
  { scene: 'order-sent', title: 'Order Sent to Vendor', subtitle: 'Tracking Enabled', duration: 2 },
  { scene: 'receive-delivery', title: 'Receive Delivery', subtitle: 'Delivery Arrived', duration: 2.5 },
  { scene: 'receive-upload', title: 'Upload Delivery Note', subtitle: 'PDF/Image Auto-Checked', duration: 3 },
  { scene: 'check-items', title: 'Check Each Item', subtitle: 'Quantity & Quality Check', duration: 2.5 },
  { scene: 'discrepancy-found', title: 'Discrepancy Found!', subtitle: 'Missing or Damaged Items', duration: 3 },
  { scene: 'excluded-items', title: 'Excluded Items', subtitle: 'Marked in Red & Deducted', duration: 3.5 },
  { scene: 'total-adjusted', title: 'Total Adjusted', subtitle: 'Invoice Amount Updated', duration: 2.5 },
  { scene: 'order-tracking', title: 'Order Status', subtitle: 'Track All Orders', duration: 2.5 },
  { scene: 'spending-overview', title: 'Total Spent', subtitle: 'Budget Overview', duration: 3 },
  { scene: 'forecast-usage', title: 'Usage Forecast', subtitle: 'Predict Item Needs', duration: 3.5 },
  { scene: 'outro', title: 'Purchase Orders', subtitle: 'Powered by SpecVerse', duration: 2 },
];

const ORDER_ITEMS = [
  { name: 'Vodka Premium 1L', ordered: 12, received: 12, price: 45.99, status: 'ok' },
  { name: 'Gin London Dry 750ml', ordered: 8, received: 6, price: 38.50, status: 'short' },
  { name: 'Triple Sec 700ml', ordered: 6, received: 6, price: 22.00, status: 'ok' },
  { name: 'Fresh Limes 5kg', ordered: 4, received: 2, price: 18.00, status: 'damaged' },
  { name: 'Tequila Blanco 1L', ordered: 10, received: 10, price: 52.00, status: 'ok' },
];

const TEAM_MEMBERS = [
  { name: 'Sarah M.', role: 'Manager', avatar: '👩‍💼', online: true },
  { name: 'John D.', role: 'Bartender', avatar: '👨‍🍳', online: true },
  { name: 'Emily R.', role: 'Purchasing', avatar: '👩‍💻', online: true },
  { name: 'Mike T.', role: 'Stock', avatar: '👷', online: false },
];

const FORECAST_DATA = [
  { item: 'Vodka Premium', current: 24, weekly: 18, forecast: '1.3 weeks' },
  { item: 'Gin London', current: 12, weekly: 8, forecast: '1.5 weeks' },
  { item: 'Triple Sec', current: 8, weekly: 6, forecast: '1.3 weeks' },
  { item: 'Limes', current: 15, weekly: 20, forecast: '5 days' },
];

export function PurchaseOrderPromoVideo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneType>('intro');
  const animationRef = useRef<number>();
  const frameRef = useRef(0);

  const totalDuration = SCENES.reduce((acc, s) => acc + s.duration, 0);
  const fps = 30;
  const totalFrames = totalDuration * fps;

  const getSceneAtFrame = (frame: number): { scene: SceneData; sceneProgress: number } => {
    const time = frame / fps;
    let elapsed = 0;
    for (const scene of SCENES) {
      if (time < elapsed + scene.duration) {
        return { scene, sceneProgress: (time - elapsed) / scene.duration };
      }
      elapsed += scene.duration;
    }
    return { scene: SCENES[SCENES.length - 1], sceneProgress: 1 };
  };

  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { scene, sceneProgress } = getSceneAtFrame(frame);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Dynamic background based on scene
    const gradients: Record<SceneType, [string, string]> = {
      'intro': ['#1a1a2e', '#0f3460'],
      'pin-access': ['#1e1e3f', '#2d1b69'],
      'file-upload': ['#1a2f4e', '#0f2847'],
      'file-parsing': ['#0d2818', '#1a4731'],
      'team-workspace': ['#16213e', '#1a1a4e'],
      'create-order': ['#1e3a5f', '#0d1b2a'],
      'order-sent': ['#134e5e', '#71b280'],
      'receive-delivery': ['#2d3436', '#000000'],
      'receive-upload': ['#1a2f4e', '#0f2847'],
      'check-items': ['#232526', '#414345'],
      'discrepancy-found': ['#3d0c02', '#6b1c1c'],
      'excluded-items': ['#4a0e0e', '#1a1a2e'],
      'total-adjusted': ['#1a472a', '#2d5016'],
      'order-tracking': ['#0f0c29', '#302b63'],
      'spending-overview': ['#141e30', '#243b55'],
      'forecast-usage': ['#1f4037', '#99f2c8'],
      'outro': ['#1a1a2e', '#0f3460'],
    };

    const [gradFrom, gradTo] = gradients[scene.scene];
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, gradFrom);
    gradient.addColorStop(1, gradTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles
    for (let i = 0; i < 12; i++) {
      const x = (Math.sin(frame * 0.015 + i * 0.5) * 0.5 + 0.5) * width;
      const y = ((frame * 1.2 + i * 35) % (height + 80)) - 40;
      const size = 2 + Math.sin(i) * 1.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + Math.sin(frame * 0.08 + i) * 0.04})`;
      ctx.fill();
    }

    // Scene-specific rendering
    switch (scene.scene) {
      case 'intro':
        drawIntroScene(ctx, width, height, sceneProgress);
        break;
      case 'pin-access':
        drawPinAccessScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'file-upload':
        drawFileUploadScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'file-parsing':
        drawFileParsingScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'team-workspace':
        drawTeamWorkspaceScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'create-order':
        drawCreateOrderScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'order-sent':
        drawOrderSentScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'receive-delivery':
        drawReceiveDeliveryScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'receive-upload':
        drawReceiveUploadScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'check-items':
        drawCheckItemsScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'discrepancy-found':
        drawDiscrepancyScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'excluded-items':
        drawExcludedItemsScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'total-adjusted':
        drawTotalAdjustedScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'order-tracking':
        drawOrderTrackingScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'spending-overview':
        drawSpendingOverviewScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'forecast-usage':
        drawForecastScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'outro':
        drawOutroScene(ctx, width, height, sceneProgress);
        break;
    }

    // Scene title overlay
    const titleOpacity = Math.min(1, sceneProgress * 4) * Math.min(1, (1 - sceneProgress) * 4 + 0.3);
    ctx.fillStyle = `rgba(255, 255, 255, ${titleOpacity})`;
    ctx.font = 'bold 20px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(scene.title, width / 2, height - 70);

    ctx.fillStyle = `rgba(255, 255, 255, ${titleOpacity * 0.7})`;
    ctx.font = '14px system-ui';
    ctx.fillText(scene.subtitle, width / 2, height - 48);

    // Progress indicator
    const progressWidth = width - 40;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(20, height - 20, progressWidth, 4);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.fillRect(20, height - 20, progressWidth * (frame / totalFrames), 4);
  }, [totalFrames]);

  const drawIntroScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) => {
    const scale = 0.8 + progress * 0.2;
    const opacity = Math.min(1, progress * 3);

    ctx.save();
    ctx.translate(w / 2, h * 0.4);
    ctx.scale(scale, scale);

    // Logo circle
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.2})`;
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, 0);

    ctx.restore();

    // Main title
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 38px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Purchase Orders', w / 2, h * 0.58);

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
    ctx.font = '16px system-ui';
    ctx.fillText('Complete Procurement Management', w / 2, h * 0.66);
  };

  const drawPinAccessScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // My Space header
    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.beginPath();
    ctx.roundRect(30, 40, w - 60, 45, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('👤 My Space → Purchase Orders', w / 2, 68);

    // PIN input box
    const boxOpacity = Math.min(1, progress * 3);
    ctx.fillStyle = `rgba(15, 23, 42, ${boxOpacity * 0.95})`;
    ctx.beginPath();
    ctx.roundRect(40, 110, w - 80, 200, 16);
    ctx.fill();

    ctx.fillStyle = `rgba(99, 102, 241, ${boxOpacity})`;
    ctx.font = '36px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🔐', w / 2, 160);

    ctx.fillStyle = `rgba(255, 255, 255, ${boxOpacity})`;
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('Enter PIN', w / 2, 195);

    ctx.fillStyle = `rgba(255, 255, 255, ${boxOpacity * 0.6})`;
    ctx.font = '11px system-ui';
    ctx.fillText('Secure access to Purchase Orders', w / 2, 218);

    // PIN dots appearing
    const dotCount = Math.min(4, Math.floor(progress * 6));
    for (let i = 0; i < 4; i++) {
      const dotX = w / 2 - 45 + i * 30;
      const dotY = 250;
      
      ctx.fillStyle = i < dotCount ? `rgba(99, 102, 241, ${boxOpacity})` : `rgba(255, 255, 255, ${boxOpacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Success animation
    if (progress > 0.8) {
      const successOpacity = Math.min(1, (progress - 0.8) * 5);
      const pulse = Math.sin(frame * 0.2) * 0.1 + 0.9;

      ctx.save();
      ctx.translate(w / 2, 330);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = `rgba(34, 197, 94, ${successOpacity})`;
      ctx.beginPath();
      ctx.roundRect(-60, -15, 120, 30, 15);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${successOpacity})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Access Granted', 0, 4);

      ctx.restore();
    }
  };

  const drawFileUploadScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Upload area
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(30, 50, w - 60, 320, 16);
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(30, 50, w - 60, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📤 Upload Purchase Order', w / 2, 78);

    // Upload dropzone
    const dropOpacity = Math.min(1, progress * 2);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = `rgba(59, 130, 246, ${dropOpacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(50, 115, w - 100, 120, 12);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(255, 255, 255, ${dropOpacity})`;
    ctx.font = '40px system-ui';
    ctx.fillText('📁', w / 2, 160);

    ctx.fillStyle = `rgba(255, 255, 255, ${dropOpacity * 0.8})`;
    ctx.font = '12px system-ui';
    ctx.fillText('Drop files here or tap to upload', w / 2, 200);

    // File types
    const fileTypes = [
      { icon: '📄', label: 'PDF', color: '#ef4444' },
      { icon: '🖼️', label: 'Image', color: '#22c55e' },
      { icon: '📊', label: 'Excel', color: '#3b82f6' },
    ];

    fileTypes.forEach((type, i) => {
      const typeProgress = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.15) * 4));
      const typeX = w / 2 - 90 + i * 90;
      const typeY = 275;

      ctx.fillStyle = `rgba(30, 41, 59, ${typeProgress})`;
      ctx.beginPath();
      ctx.roundRect(typeX - 30, typeY - 20, 60, 55, 8);
      ctx.fill();

      ctx.strokeStyle = type.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 255, 255, ${typeProgress})`;
      ctx.font = '22px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(type.icon, typeX, typeY + 5);

      ctx.fillStyle = type.color;
      ctx.font = 'bold 9px system-ui';
      ctx.fillText(type.label, typeX, typeY + 28);
    });

    // Uploading animation
    if (progress > 0.7) {
      const uploadOpacity = Math.min(1, (progress - 0.7) * 4);
      const uploadProgress = Math.min(1, (progress - 0.7) * 3);

      ctx.fillStyle = `rgba(59, 130, 246, ${uploadOpacity * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(50, 350, w - 100, 25, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(59, 130, 246, ${uploadOpacity})`;
      ctx.beginPath();
      ctx.roundRect(50, 350, (w - 100) * uploadProgress, 25, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${uploadOpacity})`;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Uploading... ${Math.floor(uploadProgress * 100)}%`, w / 2, 367);
    }
  };

  const drawFileParsingScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Parsing header
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(30, 50, w - 60, 340, 16);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(30, 50, w - 60, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Auto-Parsing Document', w / 2, 78);

    // Document preview (left side)
    const docOpacity = Math.min(1, progress * 3);
    ctx.fillStyle = `rgba(30, 41, 59, ${docOpacity})`;
    ctx.beginPath();
    ctx.roundRect(40, 110, 100, 130, 8);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${docOpacity})`;
    ctx.font = '40px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📄', 90, 165);

    ctx.fillStyle = `rgba(255, 255, 255, ${docOpacity * 0.6})`;
    ctx.font = '8px system-ui';
    ctx.fillText('invoice.pdf', 90, 225);

    // Arrow animation
    if (progress > 0.2) {
      const arrowOpacity = Math.min(1, (progress - 0.2) * 4);
      const arrowX = 160 + Math.sin(frame * 0.1) * 5;

      ctx.fillStyle = `rgba(59, 130, 246, ${arrowOpacity})`;
      ctx.font = '24px system-ui';
      ctx.fillText('→', arrowX, 175);
    }

    // Extracted items (right side)
    const items = ['Vodka Premium 1L', 'Gin London 750ml', 'Triple Sec 700ml', 'Tequila Blanco 1L'];
    items.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.12) * 4));
      const itemY = 115 + i * 32;

      ctx.fillStyle = `rgba(34, 197, 94, ${itemProgress * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(190, itemY, w - 230, 28, 6);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`✓ ${item}`, 200, itemY + 18);
    });

    // Parsing complete
    if (progress > 0.8) {
      const completeOpacity = Math.min(1, (progress - 0.8) * 5);

      ctx.fillStyle = `rgba(34, 197, 94, ${completeOpacity * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(40, 270, w - 80, 60, 12);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${completeOpacity})`;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✅ 4 items extracted', w / 2, 295);

      ctx.fillStyle = `rgba(255, 255, 255, ${completeOpacity * 0.7})`;
      ctx.font = '11px system-ui';
      ctx.fillText('Ready for processing', w / 2, 315);
    }

    // Scanning animation
    const scanY = 110 + (progress * 130) % 130;
    ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(frame * 0.2) * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(45, scanY);
    ctx.lineTo(135, scanY);
    ctx.stroke();
  };

  const drawReceiveUploadScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Header
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(30, 50, w - 60, 340, 16);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(30, 50, w - 60, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📥 Upload Delivery Note', w / 2, 78);

    // Original order (left)
    const leftOpacity = Math.min(1, progress * 3);
    ctx.fillStyle = `rgba(30, 41, 59, ${leftOpacity})`;
    ctx.beginPath();
    ctx.roundRect(40, 110, 110, 140, 8);
    ctx.fill();

    ctx.fillStyle = `rgba(59, 130, 246, ${leftOpacity})`;
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📋 Order', 95, 135);

    const orderItems = ['12× Vodka', '8× Gin', '6× Triple Sec'];
    orderItems.forEach((item, i) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${leftOpacity * 0.8})`;
      ctx.font = '9px system-ui';
      ctx.fillText(item, 95, 160 + i * 18);
    });

    // Delivery note (right)
    const rightOpacity = Math.max(0, Math.min(1, (progress - 0.2) * 3));
    ctx.fillStyle = `rgba(30, 41, 59, ${rightOpacity})`;
    ctx.beginPath();
    ctx.roundRect(w - 150, 110, 110, 140, 8);
    ctx.fill();

    ctx.fillStyle = `rgba(245, 158, 11, ${rightOpacity})`;
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📄 Delivery', w - 95, 135);

    const deliveryItems = ['12× Vodka', '6× Gin ⚠️', '6× Triple Sec'];
    deliveryItems.forEach((item, i) => {
      const isWarning = item.includes('⚠️');
      ctx.fillStyle = isWarning ? `rgba(239, 68, 68, ${rightOpacity})` : `rgba(255, 255, 255, ${rightOpacity * 0.8})`;
      ctx.font = '9px system-ui';
      ctx.fillText(item, w - 95, 160 + i * 18);
    });

    // Compare arrow
    if (progress > 0.4) {
      const arrowOpacity = Math.min(1, (progress - 0.4) * 3);
      const arrowY = 180 + Math.sin(frame * 0.15) * 5;

      ctx.fillStyle = `rgba(99, 102, 241, ${arrowOpacity})`;
      ctx.font = '24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⟷', w / 2, arrowY);
    }

    // Auto-comparison result
    if (progress > 0.6) {
      const resultOpacity = Math.min(1, (progress - 0.6) * 3);

      ctx.fillStyle = `rgba(239, 68, 68, ${resultOpacity * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(40, 270, w - 80, 70, 12);
      ctx.fill();

      ctx.strokeStyle = `rgba(239, 68, 68, ${resultOpacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 255, 255, ${resultOpacity})`;
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ Discrepancy Detected', w / 2, 295);

      ctx.fillStyle = `rgba(239, 68, 68, ${resultOpacity})`;
      ctx.font = '11px system-ui';
      ctx.fillText('Gin: ordered 8, received 6', w / 2, 320);
    }
  };

  const drawTeamWorkspaceScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Workspace header
    ctx.fillStyle = 'rgba(30, 64, 175, 0.3)';
    ctx.beginPath();
    ctx.roundRect(30, 40, w - 60, 50, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('👥 Common Team Workspace', w / 2, 72);

    // Team members appearing
    TEAM_MEMBERS.forEach((member, i) => {
      const memberProgress = Math.max(0, Math.min(1, (progress - i * 0.15) * 3));
      const memberX = 50 + i * 80;
      const memberY = 130;

      // Avatar circle
      ctx.save();
      ctx.globalAlpha = memberProgress;
      
      ctx.fillStyle = member.online ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 100, 100, 0.2)';
      ctx.beginPath();
      ctx.arc(memberX, memberY, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(member.avatar, memberX, memberY);

      // Online indicator
      if (member.online) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(memberX + 20, memberY - 20, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px system-ui';
      ctx.fillText(member.name, memberX, memberY + 42);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '8px system-ui';
      ctx.fillText(member.role, memberX, memberY + 54);

      ctx.restore();
    });

    // Shared activity feed
    if (progress > 0.5) {
      const feedOpacity = Math.min(1, (progress - 0.5) * 3);
      const feedY = 210;

      ctx.fillStyle = `rgba(15, 23, 42, ${feedOpacity * 0.8})`;
      ctx.beginPath();
      ctx.roundRect(30, feedY, w - 60, 180, 12);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${feedOpacity})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('📋 Team Activity', 45, feedY + 25);

      const activities = [
        { user: 'Sarah M.', action: 'created PO #1234', time: '2 min ago', icon: '📝' },
        { user: 'John D.', action: 'received delivery', time: '15 min ago', icon: '📦' },
        { user: 'Emily R.', action: 'approved invoice', time: '1 hour ago', icon: '✅' },
      ];

      activities.forEach((act, i) => {
        const actY = feedY + 50 + i * 45;
        const actOpacity = Math.max(0, Math.min(1, (progress - 0.6 - i * 0.1) * 4));

        ctx.fillStyle = `rgba(255, 255, 255, ${actOpacity * 0.1})`;
        ctx.beginPath();
        ctx.roundRect(40, actY, w - 80, 38, 8);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${actOpacity})`;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`${act.icon} ${act.user} ${act.action}`, 52, actY + 16);
        ctx.fillStyle = `rgba(255, 255, 255, ${actOpacity * 0.5})`;
        ctx.font = '9px system-ui';
        ctx.fillText(act.time, 52, actY + 30);
      });
    }
  };

  const drawCreateOrderScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Order form
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(25, 40, w - 50, 350, 12);
    ctx.fill();

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(25, 40, w - 50, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📦 New Purchase Order', w / 2, 70);

    // Vendor selection
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.roundRect(40, 100, w - 80, 35, 8);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('🏢 Vendor: Premium Spirits Co.', 55, 123);

    // Items list
    const items = ['Vodka Premium 1L × 12', 'Gin London 750ml × 8', 'Triple Sec 700ml × 6'];
    items.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - i * 0.15) * 3));
      const itemY = 150 + i * 45;

      ctx.fillStyle = `rgba(30, 41, 59, ${itemProgress})`;
      ctx.beginPath();
      ctx.roundRect(40, itemY, w - 80, 38, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item, 55, itemY + 24);

      // Price
      const prices = ['$551.88', '$308.00', '$132.00'];
      ctx.fillStyle = `rgba(34, 197, 94, ${itemProgress})`;
      ctx.textAlign = 'right';
      ctx.fillText(prices[i], w - 55, itemY + 24);
    });

    // Total
    if (progress > 0.6) {
      const totalOpacity = Math.min(1, (progress - 0.6) * 4);
      ctx.fillStyle = `rgba(255, 255, 255, ${totalOpacity})`;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('Total: $991.88', w - 55, 320);
    }

    // Send button
    if (progress > 0.8) {
      const btnOpacity = Math.min(1, (progress - 0.8) * 5);
      const pulse = Math.sin(frame * 0.15) * 0.1 + 0.9;

      ctx.save();
      ctx.translate(w / 2, 365);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = `rgba(34, 197, 94, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(-70, -15, 140, 30, 15);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${btnOpacity})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('SEND ORDER →', 0, 4);

      ctx.restore();
    }
  };

  const drawOrderSentScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Success animation
    const scale = 0.5 + progress * 0.5;
    const opacity = Math.min(1, progress * 3);

    ctx.save();
    ctx.translate(w / 2, h * 0.35);
    ctx.scale(scale, scale);

    // Check circle
    ctx.fillStyle = `rgba(34, 197, 94, ${opacity * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 40px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 0, 0);

    ctx.restore();

    // Order details
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Order Sent!', w / 2, h * 0.55);

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
    ctx.font = '12px system-ui';
    ctx.fillText('PO #1234 • Premium Spirits Co.', w / 2, h * 0.62);

    // Tracking info
    if (progress > 0.5) {
      const trackOpacity = Math.min(1, (progress - 0.5) * 3);

      ctx.fillStyle = `rgba(59, 130, 246, ${trackOpacity * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(50, h * 0.7, w - 100, 60, 12);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${trackOpacity})`;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('📍 Expected Delivery: Tomorrow 10:00 AM', w / 2, h * 0.7 + 25);
      ctx.fillText('🔔 You will be notified when delivered', w / 2, h * 0.7 + 45);
    }
  };

  const drawReceiveDeliveryScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Delivery truck animation
    const truckX = -100 + progress * (w / 2 + 50);

    ctx.save();
    ctx.translate(Math.min(truckX, w / 2 - 50), h * 0.25);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-40, -20, 80, 40);
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(40, -15, 30, 30);
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(-25, 25, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(25, 25, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Delivery notification
    if (progress > 0.4) {
      const notifyOpacity = Math.min(1, (progress - 0.4) * 3);

      ctx.fillStyle = `rgba(34, 197, 94, ${notifyOpacity * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(40, h * 0.45, w - 80, 50, 12);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${notifyOpacity})`;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🚚 Delivery Arrived!', w / 2, h * 0.45 + 22);
      ctx.font = '11px system-ui';
      ctx.fillText('PO #1234 • 5 items to verify', w / 2, h * 0.45 + 40);
    }

    // Scan button
    if (progress > 0.7) {
      const btnOpacity = Math.min(1, (progress - 0.7) * 4);
      const pulse = Math.sin(frame * 0.2) * 0.1 + 0.9;

      ctx.save();
      ctx.translate(w / 2, h * 0.7);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = `rgba(59, 130, 246, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(-70, -20, 140, 40, 12);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${btnOpacity})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('📱 Start Receiving', 0, 5);

      ctx.restore();
    }
  };

  const drawCheckItemsScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Checklist
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(25, 40, w - 50, 350, 12);
    ctx.fill();

    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(25, 40, w - 50, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('☑️ Verify Received Items', w / 2, 66);

    // Items being checked
    ORDER_ITEMS.slice(0, 3).forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - i * 0.25) * 3));
      const itemY = 100 + i * 80;

      ctx.fillStyle = `rgba(30, 41, 59, ${itemProgress})`;
      ctx.beginPath();
      ctx.roundRect(35, itemY, w - 70, 70, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, 50, itemY + 20);

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress * 0.7})`;
      ctx.font = '10px system-ui';
      ctx.fillText(`Ordered: ${item.ordered}`, 50, itemY + 38);

      // Check animation
      if (progress > 0.3 + i * 0.2) {
        const checkOpacity = Math.min(1, (progress - 0.3 - i * 0.2) * 5);

        ctx.fillStyle = `rgba(34, 197, 94, ${checkOpacity})`;
        ctx.beginPath();
        ctx.arc(w - 65, itemY + 35, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${checkOpacity})`;
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('✓', w - 65, itemY + 40);

        ctx.fillStyle = `rgba(34, 197, 94, ${checkOpacity})`;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`Received: ${item.received}`, 50, itemY + 55);
      }
    });
  };

  const drawDiscrepancyScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Alert animation
    const pulse = Math.sin(frame * 0.3) * 0.15 + 0.85;

    ctx.save();
    ctx.translate(w / 2, h * 0.25);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.font = '40px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️', 0, 0);

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Discrepancy Found!', w / 2, h * 0.42);

    // Problem items
    const problems = [
      { item: 'Gin London 750ml', issue: '2 units missing', ordered: 8, received: 6 },
      { item: 'Fresh Limes 5kg', issue: '2 boxes damaged', ordered: 4, received: 2 },
    ];

    problems.forEach((prob, i) => {
      const probProgress = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.2) * 3));
      const probY = h * 0.5 + i * 75;

      ctx.fillStyle = `rgba(239, 68, 68, ${probProgress * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(35, probY, w - 70, 65, 10);
      ctx.fill();

      ctx.strokeStyle = `rgba(239, 68, 68, ${probProgress})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 255, 255, ${probProgress})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(prob.item, 50, probY + 22);

      ctx.fillStyle = `rgba(239, 68, 68, ${probProgress})`;
      ctx.font = '11px system-ui';
      ctx.fillText(`❌ ${prob.issue}`, 50, probY + 42);

      ctx.fillStyle = `rgba(255, 255, 255, ${probProgress * 0.6})`;
      ctx.font = '10px system-ui';
      ctx.fillText(`Ordered: ${prob.ordered} → Received: ${prob.received}`, 50, probY + 56);
    });
  };

  const drawExcludedItemsScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Invoice view
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(20, 30, w - 40, 380, 12);
    ctx.fill();

    ctx.fillStyle = '#1e40af';
    ctx.fillRect(20, 30, w - 40, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📄 Invoice Items', w / 2, 56);

    // Items with excluded ones in red
    ORDER_ITEMS.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - i * 0.1) * 4));
      const itemY = 85 + i * 55;
      const isExcluded = item.status !== 'ok';

      // Red background for excluded items
      if (isExcluded) {
        ctx.fillStyle = `rgba(239, 68, 68, ${itemProgress * 0.25})`;
      } else {
        ctx.fillStyle = `rgba(30, 41, 59, ${itemProgress})`;
      }
      ctx.beginPath();
      ctx.roundRect(30, itemY, w - 60, 48, 8);
      ctx.fill();

      if (isExcluded) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${itemProgress})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Item name - red if excluded
      ctx.fillStyle = isExcluded ? `rgba(239, 68, 68, ${itemProgress})` : `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = isExcluded ? 'bold 10px system-ui' : '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, 42, itemY + 18);

      // Quantity info
      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress * 0.7})`;
      ctx.font = '9px system-ui';
      ctx.fillText(`${item.received}/${item.ordered} received`, 42, itemY + 34);

      // Price or EXCLUDED badge
      if (isExcluded) {
        ctx.fillStyle = `rgba(239, 68, 68, ${itemProgress})`;
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('EXCLUDED', w - 45, itemY + 18);

        // Strikethrough price
        ctx.fillStyle = `rgba(239, 68, 68, ${itemProgress * 0.7})`;
        ctx.font = '9px system-ui';
        const priceText = `$${(item.price * item.ordered).toFixed(2)}`;
        ctx.fillText(priceText, w - 45, itemY + 34);

        // Draw strikethrough line
        const textWidth = ctx.measureText(priceText).width;
        ctx.strokeStyle = `rgba(239, 68, 68, ${itemProgress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w - 45 - textWidth, itemY + 31);
        ctx.lineTo(w - 45, itemY + 31);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(34, 197, 94, ${itemProgress})`;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`$${(item.price * item.received).toFixed(2)}`, w - 45, itemY + 26);
      }
    });

    // Legend
    if (progress > 0.8) {
      const legendOpacity = Math.min(1, (progress - 0.8) * 5);

      ctx.fillStyle = `rgba(239, 68, 68, ${legendOpacity})`;
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🔴 Red items = Excluded & Deducted from total', w / 2, h - 95);
    }
  };

  const drawTotalAdjustedScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Original total
    const originalTotal = ORDER_ITEMS.reduce((sum, item) => sum + item.price * item.ordered, 0);
    const excludedAmount = ORDER_ITEMS.filter(i => i.status !== 'ok').reduce((sum, item) => sum + item.price * (item.ordered - item.received), 0);
    const newTotal = originalTotal - excludedAmount;

    // Animation
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Original Invoice Total:', w / 2, h * 0.25);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '24px system-ui';
    // Strikethrough effect
    ctx.fillText(`$${originalTotal.toFixed(2)}`, w / 2, h * 0.33);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 60, h * 0.33 - 5);
    ctx.lineTo(w / 2 + 60, h * 0.33 - 5);
    ctx.stroke();

    // Deduction
    if (progress > 0.3) {
      const deductOpacity = Math.min(1, (progress - 0.3) * 3);

      ctx.fillStyle = `rgba(239, 68, 68, ${deductOpacity})`;
      ctx.font = '14px system-ui';
      ctx.fillText('Excluded Items:', w / 2, h * 0.45);

      ctx.font = 'bold 20px system-ui';
      ctx.fillText(`-$${excludedAmount.toFixed(2)}`, w / 2, h * 0.52);
    }

    // New total with animation
    if (progress > 0.6) {
      const newOpacity = Math.min(1, (progress - 0.6) * 3);
      const scale = 1 + Math.sin(frame * 0.1) * 0.05;

      ctx.save();
      ctx.translate(w / 2, h * 0.7);
      ctx.scale(scale, scale);

      ctx.fillStyle = `rgba(34, 197, 94, ${newOpacity * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(-100, -35, 200, 70, 16);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${newOpacity})`;
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Adjusted Total:', 0, -10);

      ctx.fillStyle = `rgba(34, 197, 94, ${newOpacity})`;
      ctx.font = 'bold 28px system-ui';
      ctx.fillText(`$${newTotal.toFixed(2)}`, 0, 22);

      ctx.restore();
    }
  };

  const drawOrderTrackingScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Orders list
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(20, 40, w - 40, 350, 12);
    ctx.fill();

    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(20, 40, w - 40, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📋 All Orders', w / 2, 66);

    const orders = [
      { id: '#1234', vendor: 'Premium Spirits', status: 'Received', amount: '$883.38', color: '#22c55e' },
      { id: '#1235', vendor: 'Fresh Produce Ltd', status: 'In Transit', amount: '$245.00', color: '#f59e0b' },
      { id: '#1236', vendor: 'Bar Supplies Co', status: 'Processing', amount: '$567.50', color: '#3b82f6' },
      { id: '#1237', vendor: 'Wine Importers', status: 'Pending', amount: '$1,200.00', color: '#6b7280' },
    ];

    orders.forEach((order, i) => {
      const orderProgress = Math.max(0, Math.min(1, (progress - i * 0.15) * 3));
      const orderY = 95 + i * 70;

      ctx.fillStyle = `rgba(30, 41, 59, ${orderProgress})`;
      ctx.beginPath();
      ctx.roundRect(30, orderY, w - 60, 60, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${orderProgress})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(order.id, 42, orderY + 18);

      ctx.fillStyle = `rgba(255, 255, 255, ${orderProgress * 0.7})`;
      ctx.font = '10px system-ui';
      ctx.fillText(order.vendor, 42, orderY + 35);

      // Status badge
      ctx.fillStyle = order.color;
      ctx.beginPath();
      ctx.roundRect(42, orderY + 42, 70, 14, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px system-ui';
      ctx.fillText(order.status, 50, orderY + 52);

      // Amount
      ctx.fillStyle = `rgba(255, 255, 255, ${orderProgress})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(order.amount, w - 42, orderY + 35);
    });
  };

  const drawSpendingOverviewScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('💰 Spending Overview', w / 2, 60);

    // Total spent card
    const totalSpent = 4523.88;
    const budget = 5000;
    const percentage = (totalSpent / budget) * 100;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.roundRect(30, 90, w - 60, 100, 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Total Spent This Month', w / 2, 115);

    const animatedAmount = totalSpent * Math.min(1, progress * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 32px system-ui';
    ctx.fillText(`$${animatedAmount.toFixed(2)}`, w / 2, 155);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px system-ui';
    ctx.fillText(`${percentage.toFixed(0)}% of $${budget} budget`, w / 2, 178);

    // Progress bar
    if (progress > 0.4) {
      const barProgress = Math.min(1, (progress - 0.4) * 2);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(50, 200, w - 100, 12, 6);
      ctx.fill();

      ctx.fillStyle = percentage > 80 ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.roundRect(50, 200, (w - 100) * (percentage / 100) * barProgress, 12, 6);
      ctx.fill();
    }

    // Category breakdown
    if (progress > 0.6) {
      const catOpacity = Math.min(1, (progress - 0.6) * 3);
      const categories = [
        { name: 'Spirits', amount: 2150, color: '#3b82f6' },
        { name: 'Produce', amount: 850, color: '#22c55e' },
        { name: 'Supplies', amount: 980, color: '#f59e0b' },
        { name: 'Other', amount: 543, color: '#8b5cf6' },
      ];

      ctx.fillStyle = `rgba(255, 255, 255, ${catOpacity})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('By Category', w / 2, 245);

      categories.forEach((cat, i) => {
        const catY = 265 + i * 35;

        ctx.fillStyle = `rgba(30, 41, 59, ${catOpacity})`;
        ctx.beginPath();
        ctx.roundRect(40, catY, w - 80, 28, 6);
        ctx.fill();

        ctx.fillStyle = cat.color;
        ctx.beginPath();
        ctx.arc(55, catY + 14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${catOpacity})`;
        ctx.font = '10px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(cat.name, 70, catY + 18);

        ctx.textAlign = 'right';
        ctx.fillText(`$${cat.amount.toFixed(2)}`, w - 55, catY + 18);
      });
    }
  };

  const drawForecastScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Usage Forecast', w / 2, 55);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px system-ui';
    ctx.fillText('Based on historical consumption', w / 2, 75);

    // Forecast cards
    FORECAST_DATA.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - i * 0.12) * 3));
      const itemY = 95 + i * 85;

      ctx.fillStyle = `rgba(30, 41, 59, ${itemProgress})`;
      ctx.beginPath();
      ctx.roundRect(25, itemY, w - 50, 75, 10);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.item, 40, itemY + 20);

      // Stock bar
      const barWidth = w - 100;
      const stockPercentage = (item.current / (item.weekly * 2)) * 100;

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress * 0.2})`;
      ctx.beginPath();
      ctx.roundRect(40, itemY + 32, barWidth, 10, 5);
      ctx.fill();

      const barColor = stockPercentage < 50 ? '#ef4444' : stockPercentage < 75 ? '#f59e0b' : '#22c55e';
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(40, itemY + 32, barWidth * (stockPercentage / 100) * itemProgress, 10, 5);
      ctx.fill();

      // Stats
      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress * 0.8})`;
      ctx.font = '9px system-ui';
      ctx.fillText(`Current: ${item.current} | Weekly use: ${item.weekly}`, 40, itemY + 58);

      // Forecast badge
      const forecastColor = item.forecast.includes('days') ? '#ef4444' : '#22c55e';
      ctx.fillStyle = forecastColor;
      ctx.beginPath();
      ctx.roundRect(w - 95, itemY + 48, 60, 18, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(item.forecast, w - 65, itemY + 60);
    });

    // Reorder suggestion
    if (progress > 0.8) {
      const suggestOpacity = Math.min(1, (progress - 0.8) * 5);
      const pulse = Math.sin(frame * 0.15) * 0.1 + 0.9;

      ctx.save();
      ctx.translate(w / 2, h - 95);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = `rgba(239, 68, 68, ${suggestOpacity * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(-110, -18, 220, 36, 10);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${suggestOpacity})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ Limes running low - Reorder?', 0, 5);

      ctx.restore();
    }
  };

  const drawOutroScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) => {
    const scale = 0.8 + progress * 0.2;
    const opacity = Math.min(1, progress * 3);

    ctx.save();
    ctx.translate(w / 2, h * 0.4);
    ctx.scale(scale, scale);

    ctx.fillStyle = `rgba(59, 130, 246, ${opacity * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', 0, 0);

    ctx.restore();

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 36px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Purchase Orders', w / 2, h * 0.58);

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
    ctx.font = '14px system-ui';
    ctx.fillText('Powered by SpecVerse', w / 2, h * 0.66);
  };

  const playPreview = () => {
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current!);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    frameRef.current = 0;

    const animate = () => {
      drawFrame(frameRef.current);
      setProgress((frameRef.current / totalFrames) * 100);

      const { scene } = getSceneAtFrame(frameRef.current);
      setCurrentScene(scene.scene);

      frameRef.current++;

      if (frameRef.current < totalFrames) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        frameRef.current = 0;
      }
    };

    animate();
  };

  const generateVideo = async () => {
    if (!canvasRef.current) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const canvas = canvasRef.current;
      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setIsGenerating(false);
        toast.success('Video generated successfully!');
      };

      mediaRecorder.start();

      for (let frame = 0; frame <= totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }

      mediaRecorder.stop();
    } catch (error) {
      console.error('Error generating video:', error);
      toast.error('Failed to generate video');
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) return;

    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-order-promo.webm';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Video downloaded!');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-500" />
          Purchase Order Promo Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas Preview */}
        <div className="relative bg-black rounded-xl overflow-hidden">
          <canvas
            ref={canvasRef}
            width={360}
            height={480}
            className="w-full aspect-[3/4]"
          />

          {/* Scene indicator */}
          <AnimatePresence>
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-3 left-3"
            >
              <Badge variant="secondary" className="bg-black/50 text-white">
                {SCENES.find(s => s.scene === currentScene)?.title}
              </Badge>
            </motion.div>
          </AnimatePresence>

          {/* Play overlay */}
          {!isPlaying && !isGenerating && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30 hover:bg-black/20 transition-colors"
              onClick={playPreview}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {(isGenerating || isPlaying) && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {isGenerating ? 'Generating video...' : 'Playing preview...'} {progress.toFixed(0)}%
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={playPreview}
            disabled={isGenerating}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Preview
              </>
            )}
          </Button>

          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600"
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
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Download */}
        {videoBlob && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              variant="outline"
              className="w-full border-green-500/50 text-green-500 hover:bg-green-500/10"
              onClick={downloadVideo}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Video
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
