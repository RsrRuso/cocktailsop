import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Download, RotateCcw, Sparkles } from "lucide-react";

const CocktailSOPPromoVideo = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const animationRef = useRef<number>();
  const frameRef = useRef(0);

  // Demo recipe data for the video
  const demoRecipe = {
    name: "Espresso Martini",
    glass: "Coupe",
    ice: "None (Shaken with ice)",
    technique: "Shake & Double Strain",
    garnish: "3 Coffee Beans",
    ingredients: [
      { name: "Vodka", amount: "50ml", abv: "40%" },
      { name: "Kahlúa", amount: "30ml", abv: "20%" },
      { name: "Fresh Espresso", amount: "30ml", abv: "0%" },
      { name: "Sugar Syrup", amount: "10ml", abv: "0%" },
    ],
    tasteProfile: { sweet: 6, bitter: 7, sour: 2 },
    metrics: { volume: "120ml", abv: "22.5%", kcal: "185" },
  };

  // Animation scenes
  const scenes = [
    { start: 0, end: 90, type: "intro" },
    { start: 90, end: 180, type: "editor" },
    { start: 180, end: 300, type: "ingredients" },
    { start: 300, end: 420, type: "profiles" },
    { start: 420, end: 540, type: "metrics" },
    { start: 540, end: 660, type: "pdf" },
    { start: 660, end: 780, type: "features" },
    { start: 780, end: 900, type: "outro" },
  ];

  const totalFrames = 900;

  const drawFrame = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Find current scene
    const currentScene = scenes.find(s => frame >= s.start && frame < s.end) || scenes[0];
    const sceneProgress = (frame - currentScene.start) / (currentScene.end - currentScene.start);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#0c0c0c");
    gradient.addColorStop(0.5, "#1a1a2e");
    gradient.addColorStop(1, "#0c0c0c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Animated particles
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(frame * 0.01 + i * 0.5) + 1) * w * 0.5;
      const y = ((frame * 0.5 + i * 50) % (h + 100)) - 50;
      const size = 2 + Math.sin(i) * 1.5;
      ctx.fillStyle = `rgba(212, 175, 55, ${0.15 + Math.sin(frame * 0.05 + i) * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw decorative lines
    ctx.strokeStyle = "rgba(212, 175, 55, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2 + i * 40 + Math.sin(frame * 0.02 + i) * 10);
      ctx.lineTo(w, h * 0.2 + i * 40 + Math.sin(frame * 0.02 + i + 1) * 10);
      ctx.stroke();
    }

    switch (currentScene.type) {
      case "intro":
        drawIntro(ctx, w, h, sceneProgress, frame);
        break;
      case "editor":
        drawEditor(ctx, w, h, sceneProgress, frame);
        break;
      case "ingredients":
        drawIngredients(ctx, w, h, sceneProgress, frame);
        break;
      case "profiles":
        drawProfiles(ctx, w, h, sceneProgress, frame);
        break;
      case "metrics":
        drawMetrics(ctx, w, h, sceneProgress, frame);
        break;
      case "pdf":
        drawPDF(ctx, w, h, sceneProgress, frame);
        break;
      case "features":
        drawFeatures(ctx, w, h, sceneProgress, frame);
        break;
      case "outro":
        drawOutro(ctx, w, h, sceneProgress, frame);
        break;
    }

    // Progress indicator
    const progressWidth = (frame / totalFrames) * w;
    ctx.fillStyle = "rgba(212, 175, 55, 0.3)";
    ctx.fillRect(0, h - 4, w, 4);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(0, h - 4, progressWidth, 4);
  }, []);

  const drawIntro = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    const opacity = Math.min(progress * 2, 1);
    
    // Logo/Icon animation
    ctx.save();
    ctx.translate(w / 2, h * 0.35);
    ctx.rotate(Math.sin(frame * 0.02) * 0.05);
    ctx.scale(0.5 + progress * 0.5, 0.5 + progress * 0.5);
    
    // Cocktail glass icon
    ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-60, -40);
    ctx.lineTo(60, -40);
    ctx.lineTo(0, 60);
    ctx.closePath();
    ctx.stroke();
    
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(0, 100);
    ctx.moveTo(-30, 100);
    ctx.lineTo(30, 100);
    ctx.stroke();
    
    ctx.restore();

    // Title
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = "bold 56px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COCKTAIL SOP", w / 2, h * 0.65);

    // Subtitle
    ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`;
    ctx.font = "24px 'Inter', sans-serif";
    ctx.fillText("Professional Recipe Documentation", w / 2, h * 0.72);

    // Tagline
    ctx.fillStyle = `rgba(180, 180, 180, ${Math.max(0, opacity - 0.3)})`;
    ctx.font = "18px 'Inter', sans-serif";
    ctx.fillText("Create • Document • Export", w / 2, h * 0.80);
  };

  const drawEditor = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    const slideIn = Math.min(progress * 2, 1);
    const offsetX = (1 - slideIn) * 100;

    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Step 1: Create Your Recipe", w / 2 - offsetX, h * 0.12);

    // Mock editor card
    const cardX = w * 0.1 - offsetX;
    const cardY = h * 0.18;
    const cardW = w * 0.8;
    const cardH = h * 0.7;

    // Card background
    ctx.fillStyle = "rgba(30, 30, 40, 0.9)";
    ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Form fields animation
    const fields = [
      { label: "Drink Name", value: demoRecipe.name },
      { label: "Glass Type", value: demoRecipe.glass },
      { label: "Ice", value: demoRecipe.ice },
      { label: "Technique", value: demoRecipe.technique },
      { label: "Garnish", value: demoRecipe.garnish },
    ];

    fields.forEach((field, i) => {
      const fieldProgress = Math.max(0, Math.min(1, (progress * 3) - i * 0.3));
      const fieldY = cardY + 50 + i * 80;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * fieldProgress})`;
      ctx.font = "14px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(field.label, cardX + 30, fieldY);

      // Input field
      ctx.fillStyle = `rgba(20, 20, 30, ${fieldProgress})`;
      ctx.beginPath();
      ctx.roundRect(cardX + 30, fieldY + 8, cardW - 60, 40, 8);
      ctx.fill();

      // Typing animation
      const typedLength = Math.floor(field.value.length * fieldProgress);
      ctx.fillStyle = `rgba(255, 255, 255, ${fieldProgress})`;
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillText(field.value.substring(0, typedLength), cardX + 45, fieldY + 35);

      // Cursor blink
      if (fieldProgress > 0.5 && fieldProgress < 1 && frame % 30 < 15) {
        const textWidth = ctx.measureText(field.value.substring(0, typedLength)).width;
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(cardX + 47 + textWidth, fieldY + 18, 2, 22);
      }
    });
  };

  const drawIngredients = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Step 2: Add Ingredients", w / 2, h * 0.1);

    // Ingredients table
    const tableX = w * 0.1;
    const tableY = h * 0.18;
    const tableW = w * 0.8;
    const rowH = 70;

    // Header
    ctx.fillStyle = "rgba(212, 175, 55, 0.2)";
    ctx.beginPath();
    ctx.roundRect(tableX, tableY, tableW, 50, [12, 12, 0, 0]);
    ctx.fill();

    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("INGREDIENT", tableX + 20, tableY + 32);
    ctx.fillText("AMOUNT", tableX + tableW * 0.55, tableY + 32);
    ctx.fillText("ABV", tableX + tableW * 0.8, tableY + 32);

    // Rows
    demoRecipe.ingredients.forEach((ing, i) => {
      const rowProgress = Math.max(0, Math.min(1, (progress * 2) - i * 0.25));
      const rowY = tableY + 50 + i * rowH;
      const slideIn = rowProgress;

      // Row background
      ctx.fillStyle = `rgba(30, 30, 40, ${0.8 * rowProgress})`;
      ctx.beginPath();
      ctx.roundRect(tableX + (1 - slideIn) * 50, rowY, tableW, rowH - 4, i === 3 ? [0, 0, 12, 12] : 0);
      ctx.fill();

      // Row content
      ctx.fillStyle = `rgba(255, 255, 255, ${rowProgress})`;
      ctx.font = "18px 'Inter', sans-serif";
      ctx.fillText(ing.name, tableX + 20 + (1 - slideIn) * 50, rowY + 40);
      
      ctx.fillStyle = `rgba(212, 175, 55, ${rowProgress})`;
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillText(ing.amount, tableX + tableW * 0.55 + (1 - slideIn) * 50, rowY + 40);
      
      ctx.fillStyle = `rgba(150, 150, 150, ${rowProgress})`;
      ctx.font = "16px 'Inter', sans-serif";
      ctx.fillText(ing.abv, tableX + tableW * 0.8 + (1 - slideIn) * 50, rowY + 40);
    });

    // Add button animation
    if (progress > 0.8) {
      const btnOpacity = (progress - 0.8) * 5;
      ctx.fillStyle = `rgba(212, 175, 55, ${0.2 * btnOpacity})`;
      ctx.strokeStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tableX + tableW / 2 - 80, tableY + 350, 160, 45, 8);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.font = "bold 16px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+ Add Ingredient", tableX + tableW / 2, tableY + 378);
    }
  };

  const drawProfiles = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Step 3: Define Taste Profile", w / 2, h * 0.1);

    // Radar chart visualization
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.25;

    // Draw grid circles
    for (let i = 1; i <= 5; i++) {
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.1 + i * 0.02})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Taste attributes
    const attributes = ["Sweet", "Bitter", "Sour", "Salty", "Umami"];
    const values = [6, 7, 2, 1, 2];

    // Draw axes and labels
    attributes.forEach((attr, i) => {
      const angle = (i * 2 * Math.PI) / attributes.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Labels
      const labelX = centerX + Math.cos(angle) * (radius + 30);
      const labelY = centerY + Math.sin(angle) * (radius + 30);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 16px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(attr, labelX, labelY);
    });

    // Draw data polygon with animation
    const animatedProgress = Math.min(progress * 1.5, 1);
    ctx.beginPath();
    attributes.forEach((_, i) => {
      const angle = (i * 2 * Math.PI) / attributes.length - Math.PI / 2;
      const value = (values[i] / 10) * radius * animatedProgress;
      const x = centerX + Math.cos(angle) * value;
      const y = centerY + Math.sin(angle) * value;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(212, 175, 55, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw data points
    attributes.forEach((_, i) => {
      const angle = (i * 2 * Math.PI) / attributes.length - Math.PI / 2;
      const value = (values[i] / 10) * radius * animatedProgress;
      const x = centerX + Math.cos(angle) * value;
      const y = centerY + Math.sin(angle) * value;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#d4af37";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const drawMetrics = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Auto-Calculated Metrics", w / 2, h * 0.12);

    const metrics = [
      { icon: "📏", label: "Total Volume", value: "120ml", color: "#4ECDC4" },
      { icon: "🍸", label: "ABV", value: "22.5%", color: "#FFE66D" },
      { icon: "🔥", label: "Calories", value: "185 kcal", color: "#FF6B6B" },
      { icon: "⚗️", label: "pH Level", value: "3.8", color: "#95E1D3" },
      { icon: "🍯", label: "Brix", value: "12°", color: "#F38181" },
    ];

    const cardW = 180;
    const cardH = 140;
    const startX = (w - (metrics.length * cardW + (metrics.length - 1) * 20)) / 2;

    metrics.forEach((metric, i) => {
      const cardProgress = Math.max(0, Math.min(1, (progress * 2) - i * 0.15));
      const scale = 0.8 + cardProgress * 0.2;
      const x = startX + i * (cardW + 20);
      const y = h * 0.35;

      ctx.save();
      ctx.translate(x + cardW / 2, y + cardH / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + cardW / 2), -(y + cardH / 2));

      // Card
      ctx.fillStyle = `rgba(30, 30, 40, ${cardProgress})`;
      ctx.strokeStyle = `${metric.color}40`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      // Glow effect
      const glowGradient = ctx.createRadialGradient(
        x + cardW / 2, y, 0,
        x + cardW / 2, y, cardH
      );
      glowGradient.addColorStop(0, `${metric.color}20`);
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Icon
      ctx.font = "36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(metric.icon, x + cardW / 2, y + 45);

      // Value with counting animation
      ctx.fillStyle = metric.color;
      ctx.font = "bold 24px 'Inter', sans-serif";
      ctx.fillText(metric.value, x + cardW / 2, y + 85);

      // Label
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillText(metric.label, x + cardW / 2, y + 115);

      ctx.restore();
    });

    // Subtitle
    ctx.fillStyle = "rgba(180, 180, 180, 0.8)";
    ctx.font = "18px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("All calculations happen automatically as you add ingredients", w / 2, h * 0.85);
  };

  const drawPDF = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Export to Professional PDF", w / 2, h * 0.08);

    // PDF mockup
    const pdfW = w * 0.35;
    const pdfH = h * 0.75;
    const pdfX = w / 2 - pdfW / 2;
    const pdfY = h * 0.15;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.roundRect(pdfX + 10, pdfY + 10, pdfW, pdfH, 8);
    ctx.fill();

    // PDF page
    const pageProgress = Math.min(progress * 1.5, 1);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(pdfX, pdfY, pdfW * pageProgress, pdfH, 8);
    ctx.fill();

    if (progress > 0.3) {
      // PDF header
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.roundRect(pdfX, pdfY, pdfW, 80, [8, 8, 0, 0]);
      ctx.fill();

      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 20px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(demoRecipe.name, pdfX + 20, pdfY + 35);

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText(`${demoRecipe.glass} • ${demoRecipe.technique}`, pdfX + 20, pdfY + 58);
    }

    if (progress > 0.5) {
      // Ingredients section
      ctx.fillStyle = "#333";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillText("INGREDIENTS", pdfX + 20, pdfY + 110);

      demoRecipe.ingredients.forEach((ing, i) => {
        ctx.fillStyle = "#444";
        ctx.font = "12px 'Inter', sans-serif";
        ctx.fillText(`• ${ing.name}`, pdfX + 25, pdfY + 135 + i * 22);
        ctx.fillStyle = "#666";
        ctx.textAlign = "right";
        ctx.fillText(ing.amount, pdfX + pdfW - 20, pdfY + 135 + i * 22);
        ctx.textAlign = "left";
      });
    }

    if (progress > 0.7) {
      // Metrics bar
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.roundRect(pdfX + 15, pdfY + 250, pdfW - 30, 60, 8);
      ctx.fill();

      const miniMetrics = [
        { label: "Vol", value: "120ml" },
        { label: "ABV", value: "22.5%" },
        { label: "Kcal", value: "185" },
      ];

      miniMetrics.forEach((m, i) => {
        const mx = pdfX + 35 + i * ((pdfW - 40) / 3);
        ctx.fillStyle = "#d4af37";
        ctx.font = "bold 16px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(m.value, mx, pdfY + 278);
        ctx.fillStyle = "#888";
        ctx.font = "10px 'Inter', sans-serif";
        ctx.fillText(m.label, mx, pdfY + 298);
      });
    }

    if (progress > 0.85) {
      // Mini radar chart
      const chartX = pdfX + pdfW / 2;
      const chartY = pdfY + 380;
      const chartR = 50;

      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(chartX, chartY, (chartR * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(212, 175, 55, 0.3)";
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const vals = [6, 7, 2, 1, 2];
      vals.forEach((v, i) => {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const r = (v / 10) * chartR;
        const px = chartX + Math.cos(angle) * r;
        const py = chartY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Download button animation
    if (progress > 0.9) {
      const btnOpacity = (progress - 0.9) * 10;
      const btnY = pdfY + pdfH + 30;
      
      ctx.fillStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 100, btnY, 200, 50, 25);
      ctx.fill();

      ctx.fillStyle = `rgba(0, 0, 0, ${btnOpacity})`;
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("📥 Download PDF", w / 2, btnY + 32);
    }
  };

  const drawFeatures = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Powerful Features", w / 2, h * 0.1);

    const features = [
      { icon: "📝", title: "Complete Recipe Builder", desc: "Name, glass, ice, technique, garnish" },
      { icon: "🧪", title: "Auto ABV Calculator", desc: "Precise alcohol calculations" },
      { icon: "🎨", title: "Taste & Texture Profiles", desc: "Visual radar charts" },
      { icon: "📊", title: "Smart Metrics", desc: "Volume, calories, pH, Brix" },
      { icon: "📄", title: "PDF Export", desc: "Professional documentation" },
      { icon: "📚", title: "Recipe Library", desc: "Save and organize recipes" },
    ];

    const cols = 2;
    const rows = 3;
    const cardW = w * 0.38;
    const cardH = 100;
    const gapX = 40;
    const gapY = 25;
    const startX = (w - (cols * cardW + gapX)) / 2;
    const startY = h * 0.18;

    features.forEach((feature, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cardProgress = Math.max(0, Math.min(1, (progress * 2.5) - i * 0.15));
      
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);

      // Card with slide-in
      const slideX = (1 - cardProgress) * (col === 0 ? -100 : 100);
      
      ctx.fillStyle = `rgba(30, 30, 40, ${cardProgress})`;
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.3 * cardProgress})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + slideX, y, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.font = "32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(feature.icon, x + 20 + slideX, y + 45);

      // Title
      ctx.fillStyle = `rgba(255, 255, 255, ${cardProgress})`;
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillText(feature.title, x + 70 + slideX, y + 40);

      // Description
      ctx.fillStyle = `rgba(150, 150, 150, ${cardProgress})`;
      ctx.font = "14px 'Inter', sans-serif";
      ctx.fillText(feature.desc, x + 70 + slideX, y + 65);
    });
  };

  const drawOutro = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    const opacity = Math.min(progress * 2, 1);

    // Pulsing glow
    const glowSize = 200 + Math.sin(frame * 0.05) * 30;
    const glow = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, glowSize);
    glow.addColorStop(0, `rgba(212, 175, 55, ${0.3 * opacity})`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Main CTA
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Start Creating", w / 2, h * 0.4);

    ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`;
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.fillText("Professional SOPs", w / 2, h * 0.5);

    // Button
    if (progress > 0.5) {
      const btnOpacity = (progress - 0.5) * 2;
      const btnY = h * 0.62;
      
      ctx.fillStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 120, btnY, 240, 60, 30);
      ctx.fill();

      ctx.fillStyle = `rgba(0, 0, 0, ${btnOpacity})`;
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.fillText("Try Cocktail SOP", w / 2, btnY + 38);
    }

    // Branding
    ctx.fillStyle = `rgba(100, 100, 100, ${opacity * 0.7})`;
    ctx.font = "16px 'Inter', sans-serif";
    ctx.fillText("Built with ❤️ for Bartenders & Mixologists", w / 2, h * 0.88);
  };

  const playPreview = useCallback(() => {
    if (isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    frameRef.current = 0;

    const animate = () => {
      if (frameRef.current >= totalFrames) {
        setIsPlaying(false);
        frameRef.current = 0;
        return;
      }
      
      drawFrame(frameRef.current);
      setProgress((frameRef.current / totalFrames) * 100);
      frameRef.current++;
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, [isPlaying, drawFrame]);

  const generateVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    setProgress(0);

    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setVideoBlob(blob);
        setIsGenerating(false);
        setProgress(100);
      };

      recorder.start();

      for (let frame = 0; frame < totalFrames; frame++) {
        drawFrame(frame);
        setProgress((frame / totalFrames) * 100);
        await new Promise((r) => setTimeout(r, 33));
      }

      recorder.stop();
    } catch (error) {
      console.error("Video generation error:", error);
      setIsGenerating(false);
    }
  };

  const downloadVideo = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cocktail-sop-promo.webm";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetVideo = () => {
    setVideoBlob(null);
    setProgress(0);
    frameRef.current = 0;
    if (canvasRef.current) {
      drawFrame(0);
    }
  };

  useEffect(() => {
    drawFrame(0);
  }, [drawFrame]);

  return (
    <Card className="p-6 bg-background/50 backdrop-blur border-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Cocktail SOP Promo Video</h3>
          </div>
          <span className="text-xs text-muted-foreground">30 seconds • 1080p</span>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="w-full h-full object-contain"
          />
        </div>

        {(isGenerating || progress > 0) && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {isGenerating ? `Generating... ${Math.round(progress)}%` : `${Math.round(progress)}% complete`}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={playPreview}
            disabled={isGenerating}
            className="flex-1"
          >
            {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isPlaying ? "Pause" : "Preview"}
          </Button>

          {!videoBlob ? (
            <Button
              onClick={generateVideo}
              disabled={isGenerating || isPlaying}
              className="flex-1"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Video"}
            </Button>
          ) : (
            <>
              <Button onClick={downloadVideo} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="ghost" onClick={resetVideo} size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CocktailSOPPromoVideo;
