import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download, Play, Pause, RefreshCw, Sparkles,
  Video, CheckCircle2, Loader2, ChefHat, UtensilsCrossed,
  Bell, ShoppingCart, Package, Calculator, TrendingDown,
  Timer, Check, ArrowRight, Users, Wine
} from "lucide-react";
import { toast } from "sonner";

type SceneType = 
  | 'intro' 
  | 'pin-login'
  | 'waiter-order' 
  | 'kitchen-receive' 
  | 'kitchen-start' 
  | 'recipe-popup'
  | 'kitchen-ready' 
  | 'waiter-notify' 
  | 'qty-tracking' 
  | 'sales-deduction' 
  | 'variance-analysis'
  | 'calculation' 
  | 'outro';

interface SceneData {
  scene: SceneType;
  title: string;
  subtitle: string;
  duration: number;
}

const SCENES: SceneData[] = [
  { scene: 'intro', title: 'LAB OPS', subtitle: 'Complete Restaurant Management', duration: 2 },
  { scene: 'pin-login', title: 'Staff PIN Login', subtitle: 'Secure Access', duration: 3 },
  { scene: 'waiter-order', title: 'Waiter Takes Order', subtitle: 'Table 5 • 2 Guests', duration: 3 },
  { scene: 'kitchen-receive', title: 'Bar/Kitchen Receives Order', subtitle: 'New Order Alert!', duration: 2.5 },
  { scene: 'kitchen-start', title: 'Press START', subtitle: 'Begin Preparation', duration: 2 },
  { scene: 'recipe-popup', title: 'Recipe Opens', subtitle: 'Step-by-Step Instructions', duration: 3 },
  { scene: 'kitchen-ready', title: 'READY Status', subtitle: 'Order Complete', duration: 2 },
  { scene: 'waiter-notify', title: 'Waiter Notified', subtitle: 'Ready for Pickup!', duration: 2 },
  { scene: 'qty-tracking', title: 'Live Quantity Tracking', subtitle: 'Items Remaining', duration: 3 },
  { scene: 'sales-deduction', title: 'Sales Deduction', subtitle: 'Automatic Inventory Update', duration: 3 },
  { scene: 'variance-analysis', title: 'Variance Analysis', subtitle: 'Physical vs Virtual', duration: 3.5 },
  { scene: 'calculation', title: 'Smart Calculations', subtitle: 'Revenue • Cost • Profit', duration: 3 },
  { scene: 'outro', title: 'LAB OPS', subtitle: 'Powered by SpecVerse', duration: 2 },
];

const MENU_ITEMS = [
  { name: 'Truffle Pasta', qty: 2, price: 24.99, remaining: 15 },
  { name: 'Wagyu Burger', qty: 1, price: 32.99, remaining: 8 },
  { name: 'Margarita Cocktail', qty: 3, price: 14.99, remaining: 22, mlPerServe: 45 },
];

const RECIPE_STEPS = [
  { step: 1, text: 'Add 45ml Tequila', icon: '🍾' },
  { step: 2, text: 'Add 25ml Triple Sec', icon: '🧴' },
  { step: 3, text: 'Add 20ml Lime Juice', icon: '🍋' },
  { step: 4, text: 'Shake with ice', icon: '🧊' },
  { step: 5, text: 'Strain & serve', icon: '🍸' },
];

export function LabOpsPromoVideo() {
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
      'intro': ['#1a1a2e', '#16213e'],
      'pin-login': ['#1e3a5f', '#0d1b2a'],
      'waiter-order': ['#2d1b69', '#11998e'],
      'kitchen-receive': ['#c33764', '#1d2671'],
      'kitchen-start': ['#ff6b35', '#f7c59f'],
      'recipe-popup': ['#2d3436', '#636e72'],
      'kitchen-ready': ['#11998e', '#38ef7d'],
      'waiter-notify': ['#667eea', '#764ba2'],
      'qty-tracking': ['#0f0c29', '#302b63'],
      'sales-deduction': ['#141e30', '#243b55'],
      'variance-analysis': ['#1a1a2e', '#4a1942'],
      'calculation': ['#1f4037', '#99f2c8'],
      'outro': ['#1a1a2e', '#16213e'],
    };

    const [gradFrom, gradTo] = gradients[scene.scene];
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, gradFrom);
    gradient.addColorStop(1, gradTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Animated particles
    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(frame * 0.015 + i * 0.5) * 0.5 + 0.5) * width;
      const y = ((frame * 1.5 + i * 40) % (height + 80)) - 40;
      const size = 2 + Math.sin(i) * 1.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + Math.sin(frame * 0.08 + i) * 0.05})`;
      ctx.fill();
    }

    // Scene-specific rendering
    switch (scene.scene) {
      case 'intro':
        drawIntroScene(ctx, width, height, sceneProgress);
        break;
      case 'pin-login':
        drawPinLoginScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'waiter-order':
        drawWaiterOrderScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'kitchen-receive':
        drawKitchenReceiveScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'kitchen-start':
        drawKitchenStartScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'recipe-popup':
        drawRecipePopupScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'kitchen-ready':
        drawKitchenReadyScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'waiter-notify':
        drawWaiterNotifyScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'qty-tracking':
        drawQtyTrackingScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'sales-deduction':
        drawSalesDeductionScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'variance-analysis':
        drawVarianceAnalysisScene(ctx, width, height, sceneProgress, frame);
        break;
      case 'calculation':
        drawCalculationScene(ctx, width, height, sceneProgress, frame);
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.15})`;
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 48px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍽️', 0, 0);

    ctx.restore();

    // Main title
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 42px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('LAB OPS', w / 2, h * 0.58);

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
    ctx.font = '16px system-ui';
    ctx.fillText('Restaurant Management System', w / 2, h * 0.66);
  };

  const drawPinLoginScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Phone mockup
    const phoneWidth = 200;
    const phoneHeight = 380;
    const phoneX = (w - phoneWidth) / 2;
    const phoneY = 50;

    // Phone frame
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(phoneX, phoneY, phoneWidth, phoneHeight, 24);
    ctx.fill();

    // Screen
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(phoneX + 8, phoneY + 35, phoneWidth - 16, phoneHeight - 55, 16);
    ctx.fill();

    // Header
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(phoneX + 8, phoneY + 35, phoneWidth - 16, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🔐 Staff Login', phoneX + phoneWidth / 2, phoneY + 65);

    // Outlet selection
    const outletY = phoneY + 100;
    ctx.fillStyle = 'rgba(30, 58, 138, 0.5)';
    ctx.beginPath();
    ctx.roundRect(phoneX + 20, outletY, phoneWidth - 40, 35, 8);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Main Bar', phoneX + phoneWidth / 2, outletY + 22);

    // PIN display
    const pinY = phoneY + 160;
    const pinDigits = Math.min(4, Math.floor(progress * 5));
    
    for (let i = 0; i < 4; i++) {
      const dotX = phoneX + 45 + i * 35;
      ctx.fillStyle = i < pinDigits ? '#22c55e' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(dotX, pinY, 12, 0, Math.PI * 2);
      ctx.fill();

      if (i < pinDigits) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('●', dotX, pinY + 6);
      }
    }

    // Numeric keypad
    const keypadY = phoneY + 200;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
    
    keys.forEach((key, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const keyX = phoneX + 30 + col * 50;
      const keyY = keypadY + row * 45;

      const isPressed = progress > 0.2 && progress < 0.3 && i === 3; // Simulate pressing "4"
      const keyScale = isPressed ? 0.9 : 1;

      ctx.save();
      ctx.translate(keyX + 20, keyY + 17);
      ctx.scale(keyScale, keyScale);

      ctx.fillStyle = key === '✓' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(-20, -17, 40, 34, 8);
      ctx.fill();

      ctx.fillStyle = key === '✓' ? '#22c55e' : '#ffffff';
      ctx.font = key === '⌫' || key === '✓' ? '16px system-ui' : 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(key, 0, 0);

      ctx.restore();
    });

    // Success animation
    if (progress > 0.8) {
      const successOpacity = Math.min(1, (progress - 0.8) * 5);
      
      ctx.fillStyle = `rgba(34, 197, 94, ${successOpacity * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(phoneX + 8, phoneY + 35, phoneWidth - 16, phoneHeight - 55, 16);
      ctx.fill();

      ctx.fillStyle = `rgba(34, 197, 94, ${successOpacity})`;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Welcome, John!', phoneX + phoneWidth / 2, phoneY + phoneHeight / 2);
    }
  };

  const drawWaiterOrderScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Phone mockup
    const phoneWidth = 180;
    const phoneHeight = 340;
    const phoneX = (w - phoneWidth) / 2;
    const phoneY = 60;

    // Phone frame
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(phoneX, phoneY, phoneWidth, phoneHeight, 20);
    ctx.fill();

    // Screen
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(phoneX + 8, phoneY + 30, phoneWidth - 16, phoneHeight - 50, 12);
    ctx.fill();

    // Header
    ctx.fillStyle = '#334155';
    ctx.fillRect(phoneX + 8, phoneY + 30, phoneWidth - 16, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Table 5 • New Order', phoneX + phoneWidth / 2, phoneY + 55);

    // Order items appearing
    const items = ['Truffle Pasta x2', 'Wagyu Burger x1', 'Margarita x3'];
    items.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - i * 0.2) * 3));
      const itemY = phoneY + 90 + i * 50;

      ctx.fillStyle = `rgba(30, 41, 59, ${itemProgress})`;
      ctx.beginPath();
      ctx.roundRect(phoneX + 16, itemY, phoneWidth - 32, 40, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item, phoneX + 26, itemY + 25);

      // Checkmark animation
      if (progress > 0.4 + i * 0.15) {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(phoneX + phoneWidth - 30, itemY + 20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('✓', phoneX + phoneWidth - 30, itemY + 24);
      }
    });

    // Send button
    if (progress > 0.7) {
      const btnOpacity = Math.min(1, (progress - 0.7) * 5);
      const pulse = Math.sin(frame * 0.15) * 0.1 + 0.9;

      ctx.save();
      ctx.translate(phoneX + phoneWidth / 2, phoneY + phoneHeight - 55);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = `rgba(34, 197, 94, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(-60, -15, 120, 30, 15);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${btnOpacity})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('SEND TO KITCHEN →', 0, 4);

      ctx.restore();
    }
  };

  const drawKitchenReceiveScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // KDS Screen
    const screenWidth = 300;
    const screenHeight = 200;
    const screenX = (w - screenWidth) / 2;
    const screenY = 80;

    // Screen background
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenWidth, screenHeight, 12);
    ctx.fill();

    // Header
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(screenX, screenY, screenWidth, 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🍸 BAR KDS', screenX + screenWidth / 2, screenY + 23);

    // New order card sliding in
    const slideIn = Math.min(1, progress * 2);
    const cardX = screenX + 10 + (1 - slideIn) * 100;

    ctx.fillStyle = `rgba(251, 146, 60, ${slideIn * 0.3})`;
    ctx.beginPath();
    ctx.roundRect(cardX, screenY + 45, 140, 145, 8);
    ctx.fill();

    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Order details
    ctx.fillStyle = `rgba(255, 255, 255, ${slideIn})`;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('#1 Table 5', cardX + 10, screenY + 70);

    ctx.font = '10px system-ui';
    ctx.fillStyle = `rgba(251, 146, 60, ${slideIn})`;
    ctx.fillText('NEW ORDER', cardX + 10, screenY + 85);

    // Items with START buttons
    const orderItems = [
      { name: '3× Margarita', hasStart: true },
      { name: '2× Truffle Pasta', hasStart: true },
      { name: '1× Wagyu Burger', hasStart: true }
    ];
    
    orderItems.forEach((item, i) => {
      const itemY = screenY + 100 + i * 28;
      ctx.fillStyle = `rgba(255, 255, 255, ${slideIn * 0.9})`;
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, cardX + 10, itemY);

      // START button for each item
      if (item.hasStart && slideIn > 0.5) {
        const pulse = Math.sin(frame * 0.2 + i) * 0.1 + 0.9;
        ctx.save();
        ctx.translate(cardX + 115, itemY - 5);
        ctx.scale(pulse, pulse);
        
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.roundRect(-20, -8, 40, 16, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('START', 0, 3);
        ctx.restore();
      }
    });

    // Alert pulse
    const pulse = Math.sin(frame * 0.2) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(251, 146, 60, ${pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(screenX + screenWidth - 40, screenY + 20, 15 + pulse * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🔔', screenX + screenWidth - 40, screenY + 25);
  };

  const drawKitchenStartScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Central START button
    const btnScale = progress < 0.5 ? 1 + Math.sin(frame * 0.15) * 0.08 : 0.95;
    const isPressed = progress > 0.5;

    ctx.save();
    ctx.translate(w / 2, h * 0.4);
    ctx.scale(btnScale, btnScale);

    // Button glow
    const glowRadius = 80 + Math.sin(frame * 0.1) * 10;
    const glowGradient = ctx.createRadialGradient(0, 0, 40, 0, 0, glowRadius);
    glowGradient.addColorStop(0, isPressed ? 'rgba(34, 197, 94, 0.4)' : 'rgba(251, 146, 60, 0.4)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Button
    ctx.fillStyle = isPressed ? '#22c55e' : '#fb923c';
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPressed ? '✓' : 'START', 0, 0);

    ctx.restore();

    // Finger tap animation
    if (progress > 0.3 && progress < 0.6) {
      const fingerProgress = (progress - 0.3) / 0.3;
      const fingerY = h * 0.4 + 20 - fingerProgress * 30;
      ctx.font = '40px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('👆', w / 2, fingerY);
    }

    // Status text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(isPressed ? 'Opening Recipe...' : 'TAP TO START', w / 2, h * 0.6);

    // Item being prepared
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px system-ui';
    ctx.fillText('🍸 Margarita Cocktail', w / 2, h * 0.68);
  };

  const drawRecipePopupScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Recipe card
    const cardWidth = 280;
    const cardHeight = 350;
    const cardX = (w - cardWidth) / 2;
    const cardY = 50 + (1 - Math.min(1, progress * 3)) * 50;
    const cardOpacity = Math.min(1, progress * 3);

    // Card background
    ctx.fillStyle = `rgba(15, 23, 42, ${cardOpacity * 0.95})`;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 16);
    ctx.fill();

    // Header
    ctx.fillStyle = `rgba(234, 88, 12, ${cardOpacity})`;
    ctx.fillRect(cardX, cardY, cardWidth, 50);
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, 50, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${cardOpacity})`;
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🍸 Margarita Recipe', cardX + cardWidth / 2, cardY + 32);

    // Recipe steps
    RECIPE_STEPS.forEach((step, i) => {
      const stepProgress = Math.max(0, Math.min(1, (progress - 0.2 - i * 0.12) * 4));
      const stepY = cardY + 70 + i * 50;
      const isComplete = progress > 0.4 + i * 0.1;

      // Step background
      ctx.fillStyle = `rgba(30, 41, 59, ${stepProgress})`;
      ctx.beginPath();
      ctx.roundRect(cardX + 15, stepY, cardWidth - 30, 40, 8);
      ctx.fill();

      // Step number circle
      ctx.fillStyle = isComplete ? `rgba(34, 197, 94, ${stepProgress})` : `rgba(251, 146, 60, ${stepProgress})`;
      ctx.beginPath();
      ctx.arc(cardX + 35, stepY + 20, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${stepProgress})`;
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(isComplete ? '✓' : String(step.step), cardX + 35, stepY + 24);

      // Step text
      ctx.fillStyle = `rgba(255, 255, 255, ${stepProgress * 0.9})`;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${step.icon} ${step.text}`, cardX + 55, stepY + 25);
    });

    // Complete button
    if (progress > 0.7) {
      const btnOpacity = Math.min(1, (progress - 0.7) * 4);
      const pulse = Math.sin(frame * 0.15) * 0.05 + 0.95;

      ctx.save();
      ctx.translate(cardX + cardWidth / 2, cardY + cardHeight - 35);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = `rgba(34, 197, 94, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(-70, -15, 140, 30, 15);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${btnOpacity})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('✓ MARK COMPLETE', 0, 4);

      ctx.restore();
    }
  };

  const drawKitchenReadyScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Green success state
    const checkScale = Math.min(1, progress * 2);

    ctx.save();
    ctx.translate(w / 2, h * 0.38);
    ctx.scale(checkScale, checkScale);

    // Success circle
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();

    // Checkmark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 0, 0);

    ctx.restore();

    // READY badge
    const badgeOpacity = Math.min(1, (progress - 0.3) * 3);
    ctx.fillStyle = `rgba(34, 197, 94, ${badgeOpacity})`;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 50, h * 0.55, 100, 30, 15);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${badgeOpacity})`;
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('READY', w / 2, h * 0.55 + 20);

    // Order items completed
    if (progress > 0.4) {
      const itemsOpacity = Math.min(1, (progress - 0.4) * 3);
      const items = ['✓ Margarita x3', '✓ Truffle Pasta', '✓ Wagyu Burger'];
      items.forEach((item, i) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${itemsOpacity * 0.8})`;
        ctx.font = '13px system-ui';
        ctx.fillText(item, w / 2, h * 0.68 + i * 22);
      });
    }
  };

  const drawWaiterNotifyScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Notification bell
    const bellScale = 1 + Math.sin(frame * 0.3) * 0.1;

    ctx.save();
    ctx.translate(w / 2, h * 0.35);
    ctx.scale(bellScale, bellScale);

    ctx.font = '60px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔔', 0, 0);

    ctx.restore();

    // Notification popup
    const popupProgress = Math.min(1, progress * 2);
    const popupY = h * 0.52 + (1 - popupProgress) * 30;

    ctx.fillStyle = `rgba(34, 197, 94, ${popupProgress * 0.9})`;
    ctx.beginPath();
    ctx.roundRect(w / 2 - 100, popupY, 200, 70, 12);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${popupProgress})`;
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Order Ready!', w / 2, popupY + 25);

    ctx.font = '12px system-ui';
    ctx.fillText('Table 5 - Pickup Now', w / 2, popupY + 48);

    // Waiter icon
    ctx.font = '40px system-ui';
    ctx.fillText('👨‍🍳', w / 2 - 80, h * 0.75);
    ctx.fillText('→', w / 2, h * 0.75);
    ctx.fillText('🍽️', w / 2 + 80, h * 0.75);
  };

  const drawQtyTrackingScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Inventory cards
    const cardWidth = 140;
    const startX = (w - cardWidth * 2 - 20) / 2;
    const cardY = 80;

    MENU_ITEMS.slice(0, 2).forEach((item, i) => {
      const cardProgress = Math.max(0, Math.min(1, (progress - i * 0.15) * 2.5));
      const cardX = startX + i * (cardWidth + 20);

      // Card background
      ctx.fillStyle = `rgba(30, 41, 59, ${cardProgress})`;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, 160, 12);
      ctx.fill();

      // Item name
      ctx.fillStyle = `rgba(255, 255, 255, ${cardProgress})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, cardX + cardWidth / 2, cardY + 25);

      // Big quantity number
      const remainingAfterSale = item.remaining - item.qty;
      const currentQty = Math.round(item.remaining - (item.remaining - remainingAfterSale) * Math.min(1, progress * 1.5));

      ctx.font = 'bold 48px system-ui';
      ctx.fillStyle = currentQty < 10 ? `rgba(239, 68, 68, ${cardProgress})` : `rgba(34, 197, 94, ${cardProgress})`;
      ctx.fillText(String(currentQty), cardX + cardWidth / 2, cardY + 85);

      // "left" label
      ctx.font = '11px system-ui';
      ctx.fillStyle = `rgba(148, 163, 184, ${cardProgress})`;
      ctx.fillText('remaining', cardX + cardWidth / 2, cardY + 105);

      // Deduction indicator
      if (progress > 0.3) {
        const deductOpacity = Math.min(1, (progress - 0.3) * 3);
        ctx.fillStyle = `rgba(239, 68, 68, ${deductOpacity})`;
        ctx.font = 'bold 14px system-ui';
        ctx.fillText(`-${item.qty}`, cardX + cardWidth / 2, cardY + 140);
      }
    });

    // "Live Updates" badge
    const pulse = Math.sin(frame * 0.15) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(59, 130, 246, ${pulse})`;
    ctx.beginPath();
    ctx.arc(w / 2 - 50, h * 0.72, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Live Quantity Updates', w / 2, h * 0.72 + 5);
  };

  const drawSalesDeductionScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Sales record card
    const cardWidth = 280;
    const cardX = (w - cardWidth) / 2;
    const cardY = 70;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, 260, 12);
    ctx.fill();

    // Header
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(cardX, cardY, cardWidth, 40);
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, 40, [12, 12, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Sales Deduction', cardX + cardWidth / 2, cardY + 26);

    // Items with deductions
    MENU_ITEMS.forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - i * 0.12) * 3));
      const rowY = cardY + 60 + i * 60;

      // Item row
      ctx.fillStyle = `rgba(255, 255, 255, ${itemProgress})`;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, cardX + 15, rowY + 15);

      // Qty sold
      ctx.fillStyle = `rgba(239, 68, 68, ${itemProgress})`;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`-${item.qty} sold`, cardX + 15, rowY + 32);

      // ML calculation for drinks
      if (item.name.includes('Margarita') && (item as any).mlPerServe) {
        ctx.fillStyle = `rgba(148, 163, 184, ${itemProgress})`;
        ctx.font = '10px system-ui';
        ctx.fillText(`${item.qty * (item as any).mlPerServe}ml deducted`, cardX + 15, rowY + 46);
      }

      // Arrow and result
      if (itemProgress > 0.5) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(itemProgress - 0.5) * 2})`;
        ctx.font = '14px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText('→', cardX + cardWidth - 70, rowY + 25);

        ctx.fillStyle = `rgba(34, 197, 94, ${(itemProgress - 0.5) * 2})`;
        ctx.font = 'bold 16px system-ui';
        ctx.fillText(String(item.remaining - item.qty), cardX + cardWidth - 20, rowY + 25);
      }
    });
  };

  const drawVarianceAnalysisScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Variance Analysis card
    const cardWidth = 300;
    const cardX = (w - cardWidth) / 2;
    const cardY = 50;

    ctx.fillStyle = 'rgba(20, 20, 35, 0.95)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, 340, 16);
    ctx.fill();

    // Header
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(cardX, cardY, cardWidth, 45);
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, 45, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📈 Variance Analysis', cardX + cardWidth / 2, cardY + 28);

    // Summary boxes
    const summaryY = cardY + 60;
    const boxWidth = 85;
    
    const summaryData = [
      { label: 'Physical', value: '2,850ml', color: '#22c55e' },
      { label: 'Virtual', value: '2,700ml', color: '#3b82f6' },
      { label: 'Variance', value: '150ml', color: '#ef4444' },
    ];

    summaryData.forEach((data, i) => {
      const boxProgress = Math.max(0, Math.min(1, (progress - i * 0.1) * 3));
      const boxX = cardX + 15 + i * (boxWidth + 10);

      ctx.fillStyle = `rgba(30, 41, 59, ${boxProgress})`;
      ctx.beginPath();
      ctx.roundRect(boxX, summaryY, boxWidth, 55, 8);
      ctx.fill();

      ctx.fillStyle = `rgba(148, 163, 184, ${boxProgress})`;
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(data.label, boxX + boxWidth / 2, summaryY + 18);

      ctx.fillStyle = data.color;
      ctx.font = 'bold 14px system-ui';
      ctx.fillText(data.value, boxX + boxWidth / 2, summaryY + 40);
    });

    // Spirit breakdown
    const spirits = [
      { name: 'Tequila', physical: 950, virtual: 900, variance: 50 },
      { name: 'Triple Sec', physical: 475, virtual: 450, variance: 25 },
      { name: 'Vodka', physical: 800, virtual: 750, variance: 50 },
      { name: 'Rum', physical: 625, virtual: 600, variance: 25 },
    ];

    const spiritStartY = cardY + 130;
    
    spirits.forEach((spirit, i) => {
      const spiritProgress = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.1) * 3));
      const rowY = spiritStartY + i * 48;

      // Row background
      ctx.fillStyle = `rgba(30, 41, 59, ${spiritProgress})`;
      ctx.beginPath();
      ctx.roundRect(cardX + 15, rowY, cardWidth - 30, 40, 8);
      ctx.fill();

      // Spirit name
      ctx.fillStyle = `rgba(255, 255, 255, ${spiritProgress})`;
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(spirit.name, cardX + 25, rowY + 16);

      // Physical vs Virtual
      ctx.fillStyle = `rgba(34, 197, 94, ${spiritProgress})`;
      ctx.font = '10px system-ui';
      ctx.fillText(`P: ${spirit.physical}ml`, cardX + 25, rowY + 32);

      ctx.fillStyle = `rgba(59, 130, 246, ${spiritProgress})`;
      ctx.fillText(`V: ${spirit.virtual}ml`, cardX + 100, rowY + 32);

      // Variance indicator
      const variancePercent = ((spirit.variance / spirit.virtual) * 100).toFixed(1);
      const isHigh = parseFloat(variancePercent) > 5;
      
      ctx.fillStyle = isHigh ? `rgba(239, 68, 68, ${spiritProgress})` : `rgba(34, 197, 94, ${spiritProgress})`;
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${variancePercent}%`, cardX + cardWidth - 25, rowY + 25);

      // Status dot
      ctx.beginPath();
      ctx.arc(cardX + cardWidth - 55, rowY + 22, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Legend
    if (progress > 0.7) {
      const legendOpacity = Math.min(1, (progress - 0.7) * 4);
      const legendY = cardY + 325;

      ctx.fillStyle = `rgba(34, 197, 94, ${legendOpacity})`;
      ctx.beginPath();
      ctx.arc(cardX + 60, legendY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${legendOpacity * 0.7})`;
      ctx.font = '9px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText('Normal (<5%)', cardX + 70, legendY + 3);

      ctx.fillStyle = `rgba(239, 68, 68, ${legendOpacity})`;
      ctx.beginPath();
      ctx.arc(cardX + 170, legendY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${legendOpacity * 0.7})`;
      ctx.fillText('High (>5%)', cardX + 180, legendY + 3);
    }
  };

  const drawCalculationScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Calculator display
    const calcWidth = 260;
    const calcX = (w - calcWidth) / 2;
    const calcY = 60;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    ctx.roundRect(calcX, calcY, calcWidth, 280, 16);
    ctx.fill();

    // Revenue section
    const totalRevenue = MENU_ITEMS.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalCost = totalRevenue * 0.35;
    const profit = totalRevenue - totalCost;

    const sections = [
      { label: 'Revenue', value: `$${totalRevenue.toFixed(2)}`, color: '#22c55e', icon: '💰' },
      { label: 'Cost (35%)', value: `$${totalCost.toFixed(2)}`, color: '#f59e0b', icon: '📦' },
      { label: 'Profit', value: `$${profit.toFixed(2)}`, color: '#3b82f6', icon: '📈' },
    ];

    sections.forEach((section, i) => {
      const sectionProgress = Math.max(0, Math.min(1, (progress - i * 0.2) * 2.5));
      const rowY = calcY + 30 + i * 75;

      // Row background
      ctx.fillStyle = `rgba(255, 255, 255, ${sectionProgress * 0.05})`;
      ctx.beginPath();
      ctx.roundRect(calcX + 15, rowY, calcWidth - 30, 60, 8);
      ctx.fill();

      // Icon
      ctx.font = '24px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(section.icon, calcX + 25, rowY + 38);

      // Label
      ctx.fillStyle = `rgba(148, 163, 184, ${sectionProgress})`;
      ctx.font = '12px system-ui';
      ctx.fillText(section.label, calcX + 60, rowY + 25);

      // Value with count animation
      const displayValue = sectionProgress < 1 
        ? `$${(parseFloat(section.value.slice(1)) * sectionProgress).toFixed(2)}`
        : section.value;

      ctx.fillStyle = section.color;
      ctx.font = 'bold 20px system-ui';
      ctx.fillText(displayValue, calcX + 60, rowY + 48);
    });

    // Profit margin
    if (progress > 0.8) {
      const marginOpacity = Math.min(1, (progress - 0.8) * 5);
      const margin = ((profit / totalRevenue) * 100).toFixed(1);

      ctx.fillStyle = `rgba(34, 197, 94, ${marginOpacity})`;
      ctx.beginPath();
      ctx.roundRect(calcX + 40, calcY + 255, calcWidth - 80, 30, 15);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${marginOpacity})`;
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${margin}% Profit Margin`, calcX + calcWidth / 2, calcY + 274);
    }
  };

  const drawOutroScene = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) => {
    const opacity = Math.min(1, progress * 2);

    // Logo
    ctx.font = '60px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🍽️', w / 2, h * 0.35);

    // Title
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = 'bold 36px system-ui';
    ctx.fillText('LAB OPS', w / 2, h * 0.5);

    // Tagline
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
    ctx.font = '14px system-ui';
    ctx.fillText('Complete Restaurant Management', w / 2, h * 0.58);

    // CTA
    if (progress > 0.5) {
      const ctaOpacity = Math.min(1, (progress - 0.5) * 3);
      ctx.fillStyle = `rgba(59, 130, 246, ${ctaOpacity})`;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 70, h * 0.68, 140, 40, 20);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${ctaOpacity})`;
      ctx.font = 'bold 14px system-ui';
      ctx.fillText('Get Started →', w / 2, h * 0.68 + 26);
    }

    // Powered by
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
    ctx.font = '11px system-ui';
    ctx.fillText('Powered by SpecVerse', w / 2, h * 0.82);
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

      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
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
        toast.success("Promo video generated!");
      };

      mediaRecorder.start();

      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
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
        const { scene } = getSceneAtFrame(frameRef.current);
        setCurrentScene(scene.scene);
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
    a.download = 'lab-ops-promo.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Video downloaded!");
  };

  useEffect(() => {
    drawFrame(0);
  }, [drawFrame]);

  return (
    <Card className="overflow-hidden max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="w-4 h-4" />
          LAB OPS Promotional Video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas Preview */}
        <div className="relative rounded-lg overflow-hidden bg-muted">
          <canvas
            ref={canvasRef}
            width={360}
            height={640}
            className="w-full max-w-[360px] mx-auto"
            style={{ aspectRatio: '9/16' }}
          />

          {/* Play overlay */}
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

          {/* Playing indicator */}
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

        {/* Scene indicator */}
        <div className="flex flex-wrap gap-1 justify-center">
          {SCENES.map((scene, i) => (
            <Badge
              key={scene.scene}
              variant={currentScene === scene.scene ? "default" : "outline"}
              className="text-[10px] px-1.5 py-0"
            >
              {i + 1}
            </Badge>
          ))}
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
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>

          {videoBlob && (
            <Button variant="outline" onClick={downloadVideo}>
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>

        {videoBlob && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            Video ready for download!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
