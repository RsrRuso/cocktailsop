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

  // Animation scenes - Extended PDF scene for fuller display
  const scenes = [
    { start: 0, end: 80, type: "intro" },
    { start: 80, end: 160, type: "editor" },
    { start: 160, end: 260, type: "ingredients" },
    { start: 260, end: 360, type: "profiles" },
    { start: 360, end: 460, type: "metrics" },
    { start: 460, end: 720, type: "pdf" },  // Extended PDF scene (260 frames instead of 120)
    { start: 720, end: 820, type: "features" },
    { start: 820, end: 900, type: "outro" },
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
    
    // Logo/Icon animation - moved higher for vertical
    ctx.save();
    ctx.translate(w / 2, h * 0.25);
    ctx.rotate(Math.sin(frame * 0.02) * 0.05);
    ctx.scale(0.5 + progress * 0.5, 0.5 + progress * 0.5);
    
    // Cocktail glass icon - larger for vertical
    ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-80, -50);
    ctx.lineTo(80, -50);
    ctx.lineTo(0, 80);
    ctx.closePath();
    ctx.stroke();
    
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(0, 140);
    ctx.moveTo(-40, 140);
    ctx.lineTo(40, 140);
    ctx.stroke();
    
    ctx.restore();

    // Title - larger for vertical format
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = "bold 72px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COCKTAIL", w / 2, h * 0.48);
    ctx.fillText("SOP", w / 2, h * 0.55);

    // Subtitle
    ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`;
    ctx.font = "36px 'Inter', sans-serif";
    ctx.fillText("Professional Recipe", w / 2, h * 0.65);
    ctx.fillText("Documentation", w / 2, h * 0.70);

    // Tagline
    ctx.fillStyle = `rgba(180, 180, 180, ${Math.max(0, opacity - 0.3)})`;
    ctx.font = "28px 'Inter', sans-serif";
    ctx.fillText("Create • Document • Export", w / 2, h * 0.82);
  };

  const drawEditor = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    const slideIn = Math.min(progress * 2, 1);
    const offsetY = (1 - slideIn) * 100;

    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Step 1", w / 2, h * 0.08 - offsetY);
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Create Your Recipe", w / 2, h * 0.12 - offsetY);

    // Mock editor card - taller for vertical
    const cardX = w * 0.08;
    const cardY = h * 0.16 - offsetY;
    const cardW = w * 0.84;
    const cardH = h * 0.72;

    // Card background
    ctx.fillStyle = "rgba(30, 30, 40, 0.9)";
    ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    // Form fields animation - more spacing for vertical
    const fields = [
      { label: "Drink Name", value: demoRecipe.name },
      { label: "Glass Type", value: demoRecipe.glass },
      { label: "Ice", value: demoRecipe.ice },
      { label: "Technique", value: demoRecipe.technique },
      { label: "Garnish", value: demoRecipe.garnish },
    ];

    fields.forEach((field, i) => {
      const fieldProgress = Math.max(0, Math.min(1, (progress * 3) - i * 0.3));
      const fieldY = cardY + 80 + i * 120;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * fieldProgress})`;
      ctx.font = "24px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(field.label, cardX + 40, fieldY);

      // Input field
      ctx.fillStyle = `rgba(20, 20, 30, ${fieldProgress})`;
      ctx.beginPath();
      ctx.roundRect(cardX + 40, fieldY + 15, cardW - 80, 60, 12);
      ctx.fill();

      // Typing animation
      const typedLength = Math.floor(field.value.length * fieldProgress);
      ctx.fillStyle = `rgba(255, 255, 255, ${fieldProgress})`;
      ctx.font = "28px 'Inter', sans-serif";
      ctx.fillText(field.value.substring(0, typedLength), cardX + 60, fieldY + 55);

      // Cursor blink
      if (fieldProgress > 0.5 && fieldProgress < 1 && frame % 30 < 15) {
        const textWidth = ctx.measureText(field.value.substring(0, typedLength)).width;
        ctx.fillStyle = "#d4af37";
        ctx.fillRect(cardX + 62 + textWidth, fieldY + 28, 3, 32);
      }
    });
  };

  const drawIngredients = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Step 2", w / 2, h * 0.06);
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Add Ingredients", w / 2, h * 0.10);

    // Ingredients table - vertical layout
    const tableX = w * 0.06;
    const tableY = h * 0.14;
    const tableW = w * 0.88;
    const rowH = 100;

    // Header
    ctx.fillStyle = "rgba(212, 175, 55, 0.2)";
    ctx.beginPath();
    ctx.roundRect(tableX, tableY, tableW, 70, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = "#d4af37";
    ctx.font = "bold 24px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("INGREDIENT", tableX + 30, tableY + 45);
    ctx.fillText("AMOUNT", tableX + tableW * 0.55, tableY + 45);
    ctx.fillText("ABV", tableX + tableW * 0.82, tableY + 45);

    // Rows
    demoRecipe.ingredients.forEach((ing, i) => {
      const rowProgress = Math.max(0, Math.min(1, (progress * 2) - i * 0.25));
      const rowY = tableY + 70 + i * rowH;
      const slideIn = rowProgress;

      // Row background
      ctx.fillStyle = `rgba(30, 30, 40, ${0.8 * rowProgress})`;
      ctx.beginPath();
      ctx.roundRect(tableX + (1 - slideIn) * 50, rowY, tableW, rowH - 6, i === 3 ? [0, 0, 16, 16] : 0);
      ctx.fill();

      // Row content
      ctx.fillStyle = `rgba(255, 255, 255, ${rowProgress})`;
      ctx.font = "28px 'Inter', sans-serif";
      ctx.fillText(ing.name, tableX + 30 + (1 - slideIn) * 50, rowY + 60);
      
      ctx.fillStyle = `rgba(212, 175, 55, ${rowProgress})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.fillText(ing.amount, tableX + tableW * 0.55 + (1 - slideIn) * 50, rowY + 60);
      
      ctx.fillStyle = `rgba(150, 150, 150, ${rowProgress})`;
      ctx.font = "24px 'Inter', sans-serif";
      ctx.fillText(ing.abv, tableX + tableW * 0.82 + (1 - slideIn) * 50, rowY + 60);
    });

    // Add button animation
    if (progress > 0.8) {
      const btnOpacity = (progress - 0.8) * 5;
      ctx.fillStyle = `rgba(212, 175, 55, ${0.2 * btnOpacity})`;
      ctx.strokeStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(tableX + tableW / 2 - 120, tableY + 500, 240, 70, 12);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("+ Add Ingredient", tableX + tableW / 2, tableY + 545);
    }
  };

  const drawProfiles = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Step 3", w / 2, h * 0.06);
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Define Taste Profile", w / 2, h * 0.10);

    // Radar chart visualization - centered in vertical space
    const centerX = w / 2;
    const centerY = h * 0.40;
    const radius = w * 0.35;

    // Draw grid circles
    for (let i = 1; i <= 5; i++) {
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.1 + i * 0.02})`;
      ctx.lineWidth = 2;
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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Labels - larger for vertical
      const labelX = centerX + Math.cos(angle) * (radius + 50);
      const labelY = centerY + Math.sin(angle) * (radius + 50);
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "bold 28px 'Inter', sans-serif";
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
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw data points
    attributes.forEach((_, i) => {
      const angle = (i * 2 * Math.PI) / attributes.length - Math.PI / 2;
      const value = (values[i] / 10) * radius * animatedProgress;
      const x = centerX + Math.cos(angle) * value;
      const y = centerY + Math.sin(angle) * value;

      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#d4af37";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Subtitle
    ctx.fillStyle = "rgba(180, 180, 180, 0.8)";
    ctx.font = "26px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Visual flavor balance", w / 2, h * 0.75);
    ctx.fillText("for training & consistency", w / 2, h * 0.79);
  };

  const drawMetrics = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Auto-Calculated", w / 2, h * 0.08);
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Metrics", w / 2, h * 0.12);

    const metrics = [
      { icon: "📏", label: "Total Volume", value: "120ml", color: "#4ECDC4" },
      { icon: "🍸", label: "ABV", value: "22.5%", color: "#FFE66D" },
      { icon: "🔥", label: "Calories", value: "185 kcal", color: "#FF6B6B" },
      { icon: "⚗️", label: "pH Level", value: "3.8", color: "#95E1D3" },
      { icon: "🍯", label: "Brix", value: "12°", color: "#F38181" },
    ];

    const cardW = w * 0.8;
    const cardH = 120;
    const startX = w * 0.1;
    const startY = h * 0.18;
    const gap = 20;

    metrics.forEach((metric, i) => {
      const cardProgress = Math.max(0, Math.min(1, (progress * 2) - i * 0.15));
      const scale = 0.8 + cardProgress * 0.2;
      const y = startY + i * (cardH + gap);

      ctx.save();
      ctx.translate(startX + cardW / 2, y + cardH / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(startX + cardW / 2), -(y + cardH / 2));

      // Card
      ctx.fillStyle = `rgba(30, 30, 40, ${cardProgress})`;
      ctx.strokeStyle = `${metric.color}40`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(startX, y, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Glow effect
      const glowGradient = ctx.createRadialGradient(
        startX, y + cardH / 2, 0,
        startX, y + cardH / 2, cardH
      );
      glowGradient.addColorStop(0, `${metric.color}20`);
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Icon
      ctx.font = "48px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(metric.icon, startX + 25, y + 75);

      // Label
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "22px 'Inter', sans-serif";
      ctx.fillText(metric.label, startX + 100, y + 50);

      // Value
      ctx.fillStyle = metric.color;
      ctx.font = "bold 36px 'Inter', sans-serif";
      ctx.fillText(metric.value, startX + 100, y + 90);

      ctx.restore();
    });
  };

  const drawPDF = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title with fade
    const titleOpacity = Math.min(progress * 3, 1);
    ctx.fillStyle = `rgba(212, 175, 55, ${0.9 * titleOpacity})`;
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Professional PDF", w / 2, h * 0.05);

    // PDF mockup - fuller document style
    const pdfW = w * 0.88;
    const pdfH = h * 0.82;
    const pdfX = w / 2 - pdfW / 2;
    const pdfY = h * 0.09;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(pdfX + 12, pdfY + 12, pdfW, pdfH, 20);
    ctx.fill();

    // PDF page - unfold animation
    const pageProgress = Math.min(progress * 2, 1);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(pdfX, pdfY, pdfW, pdfH * pageProgress, 20);
    ctx.fill();

    // PDF Header with brand styling
    if (progress > 0.08) {
      const headerOpacity = Math.min((progress - 0.08) * 8, 1);
      ctx.fillStyle = `rgba(26, 26, 46, ${headerOpacity})`;
      ctx.beginPath();
      ctx.roundRect(pdfX, pdfY, pdfW, 140, [20, 20, 0, 0]);
      ctx.fill();

      // Accent line
      ctx.fillStyle = `rgba(212, 175, 55, ${headerOpacity})`;
      ctx.fillRect(pdfX, pdfY + 140, pdfW, 4);

      ctx.fillStyle = `rgba(212, 175, 55, ${headerOpacity})`;
      ctx.font = "bold 42px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(demoRecipe.name, pdfX + 40, pdfY + 60);

      ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * headerOpacity})`;
      ctx.font = "24px 'Inter', sans-serif";
      ctx.fillText(`${demoRecipe.glass} • ${demoRecipe.technique}`, pdfX + 40, pdfY + 100);

      // Garnish badge
      ctx.fillStyle = `rgba(212, 175, 55, ${0.2 * headerOpacity})`;
      ctx.beginPath();
      ctx.roundRect(pdfX + pdfW - 200, pdfY + 30, 160, 40, 20);
      ctx.fill();
      ctx.fillStyle = `rgba(212, 175, 55, ${headerOpacity})`;
      ctx.font = "18px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(demoRecipe.garnish, pdfX + pdfW - 120, pdfY + 56);
    }

    // Ingredients section
    if (progress > 0.18) {
      const ingOpacity = Math.min((progress - 0.18) * 5, 1);
      ctx.fillStyle = `rgba(51, 51, 51, ${ingOpacity})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("INGREDIENTS", pdfX + 40, pdfY + 195);

      // Separator line
      ctx.fillStyle = `rgba(212, 175, 55, ${0.3 * ingOpacity})`;
      ctx.fillRect(pdfX + 40, pdfY + 205, pdfW - 80, 2);

      demoRecipe.ingredients.forEach((ing, i) => {
        const rowDelay = 0.22 + i * 0.03;
        const rowOpacity = Math.min((progress - rowDelay) * 8, 1);
        if (rowOpacity <= 0) return;

        const rowY = pdfY + 245 + i * 50;
        
        // Alternating row bg
        if (i % 2 === 0) {
          ctx.fillStyle = `rgba(248, 248, 248, ${rowOpacity})`;
          ctx.fillRect(pdfX + 30, rowY - 25, pdfW - 60, 45);
        }

        ctx.fillStyle = `rgba(68, 68, 68, ${rowOpacity})`;
        ctx.font = "24px 'Inter', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(ing.name, pdfX + 50, rowY);
        
        ctx.fillStyle = `rgba(212, 175, 55, ${rowOpacity})`;
        ctx.font = "bold 24px 'Inter', sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(ing.amount, pdfX + pdfW - 150, rowY);

        ctx.fillStyle = `rgba(136, 136, 136, ${rowOpacity})`;
        ctx.font = "20px 'Inter', sans-serif";
        ctx.fillText(ing.abv, pdfX + pdfW - 50, rowY);
      });
    }

    // Metrics section with cards
    if (progress > 0.38) {
      const metricsOpacity = Math.min((progress - 0.38) * 4, 1);
      
      ctx.fillStyle = `rgba(51, 51, 51, ${metricsOpacity})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("SPECIFICATIONS", pdfX + 40, pdfY + 480);

      // Metrics bar
      ctx.fillStyle = `rgba(245, 245, 245, ${metricsOpacity})`;
      ctx.beginPath();
      ctx.roundRect(pdfX + 30, pdfY + 500, pdfW - 60, 90, 16);
      ctx.fill();

      const metrics = [
        { label: "Volume", value: "120ml", icon: "📏" },
        { label: "ABV", value: "22.5%", icon: "🍸" },
        { label: "Calories", value: "185 kcal", icon: "🔥" },
      ];

      metrics.forEach((m, i) => {
        const mx = pdfX + 90 + i * ((pdfW - 120) / 3);
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(m.icon, mx - 40, pdfY + 555);
        
        ctx.fillStyle = `rgba(212, 175, 55, ${metricsOpacity})`;
        ctx.font = "bold 26px 'Inter', sans-serif";
        ctx.fillText(m.value, mx + 30, pdfY + 545);
        
        ctx.fillStyle = `rgba(136, 136, 136, ${metricsOpacity})`;
        ctx.font = "16px 'Inter', sans-serif";
        ctx.fillText(m.label, mx + 30, pdfY + 575);
      });
    }

    // Taste Profile radar chart
    if (progress > 0.50) {
      const chartOpacity = Math.min((progress - 0.50) * 3, 1);
      
      ctx.fillStyle = `rgba(51, 51, 51, ${chartOpacity})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("TASTE PROFILE", pdfX + 40, pdfY + 640);

      const chartX = pdfX + pdfW / 2;
      const chartY = pdfY + 780;
      const chartR = 100;

      // Grid circles
      ctx.strokeStyle = `rgba(221, 221, 221, ${chartOpacity})`;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(chartX, chartY, (chartR * i) / 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Axes
      const labels = ["Sweet", "Bitter", "Sour", "Salty", "Umami"];
      labels.forEach((label, i) => {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const x = chartX + Math.cos(angle) * chartR;
        const y = chartY + Math.sin(angle) * chartR;
        
        ctx.strokeStyle = `rgba(212, 175, 55, ${0.3 * chartOpacity})`;
        ctx.beginPath();
        ctx.moveTo(chartX, chartY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Labels
        const labelX = chartX + Math.cos(angle) * (chartR + 35);
        const labelY = chartY + Math.sin(angle) * (chartR + 35);
        ctx.fillStyle = `rgba(102, 102, 102, ${chartOpacity})`;
        ctx.font = "18px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, labelX, labelY + 5);
      });

      // Data polygon with animation
      const dataProgress = Math.min((progress - 0.55) * 3, 1);
      if (dataProgress > 0) {
        ctx.beginPath();
        const vals = [6, 7, 2, 1, 2];
        vals.forEach((v, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const r = (v / 10) * chartR * dataProgress;
          const px = chartX + Math.cos(angle) * r;
          const py = chartY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(212, 175, 55, ${0.35 * chartOpacity})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(212, 175, 55, ${chartOpacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Data points
        vals.forEach((v, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const r = (v / 10) * chartR * dataProgress;
          const px = chartX + Math.cos(angle) * r;
          const py = chartY + Math.sin(angle) * r;
          
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 175, 55, ${chartOpacity})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(255, 255, 255, ${chartOpacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
    }

    // Method section
    if (progress > 0.65) {
      const methodOpacity = Math.min((progress - 0.65) * 4, 1);
      
      ctx.fillStyle = `rgba(51, 51, 51, ${methodOpacity})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("METHOD", pdfX + 40, pdfY + 940);

      const steps = [
        "1. Add all ingredients to shaker",
        "2. Add ice and shake vigorously for 15 sec",
        "3. Double strain into chilled coupe",
        "4. Garnish with 3 coffee beans"
      ];

      steps.forEach((step, i) => {
        const stepOpacity = Math.min((progress - 0.68 - i * 0.02) * 6, 1);
        if (stepOpacity <= 0) return;
        
        ctx.fillStyle = `rgba(68, 68, 68, ${stepOpacity})`;
        ctx.font = "22px 'Inter', sans-serif";
        ctx.fillText(step, pdfX + 50, pdfY + 985 + i * 38);
      });
    }

    // Footer with additional metrics
    if (progress > 0.78) {
      const footerOpacity = Math.min((progress - 0.78) * 5, 1);
      
      ctx.fillStyle = `rgba(26, 26, 46, ${footerOpacity})`;
      ctx.beginPath();
      ctx.roundRect(pdfX, pdfY + pdfH - 80, pdfW, 80, [0, 0, 20, 20]);
      ctx.fill();

      ctx.fillStyle = `rgba(212, 175, 55, ${footerOpacity})`;
      ctx.font = "18px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("pH: 3.8  •  Brix: 12°  •  Ratio: 5:3:3:1  •  Allergens: None", w / 2, pdfY + pdfH - 35);
    }

    // Download success animation
    if (progress > 0.88) {
      const successOpacity = Math.min((progress - 0.88) * 8, 1);
      
      // Glow effect
      const glow = ctx.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, 300);
      glow.addColorStop(0, `rgba(212, 175, 55, ${0.15 * successOpacity})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Checkmark badge
      ctx.fillStyle = `rgba(212, 175, 55, ${successOpacity})`;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.94, 35, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `rgba(0, 0, 0, ${successOpacity})`;
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓", w / 2, h * 0.95 + 5);
    }
  };

  const drawFeatures = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    // Section title
    ctx.fillStyle = "rgba(212, 175, 55, 0.9)";
    ctx.font = "bold 48px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Powerful", w / 2, h * 0.06);
    ctx.font = "bold 36px 'Inter', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("Features", w / 2, h * 0.10);

    const features = [
      { icon: "📝", title: "Complete Recipe Builder", desc: "Name, glass, ice, technique, garnish" },
      { icon: "🧪", title: "Auto ABV Calculator", desc: "Precise alcohol calculations" },
      { icon: "🎨", title: "Taste & Texture Profiles", desc: "Visual radar charts" },
      { icon: "📊", title: "Smart Metrics", desc: "Volume, calories, pH, Brix" },
      { icon: "📄", title: "PDF Export", desc: "Professional documentation" },
      { icon: "📚", title: "Recipe Library", desc: "Save and organize recipes" },
    ];

    // Vertical layout for 9:16
    const cardW = w * 0.88;
    const cardH = 110;
    const gap = 15;
    const startX = w * 0.06;
    const startY = h * 0.14;

    features.forEach((feature, i) => {
      const cardProgress = Math.max(0, Math.min(1, (progress * 2.5) - i * 0.15));
      const y = startY + i * (cardH + gap);

      // Card with slide-in from alternating sides
      const slideX = (1 - cardProgress) * (i % 2 === 0 ? -80 : 80);
      
      ctx.fillStyle = `rgba(30, 30, 40, ${cardProgress})`;
      ctx.strokeStyle = `rgba(212, 175, 55, ${0.3 * cardProgress})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(startX + slideX, y, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.font = "48px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(feature.icon, startX + 25 + slideX, y + 70);

      // Title
      ctx.fillStyle = `rgba(255, 255, 255, ${cardProgress})`;
      ctx.font = "bold 28px 'Inter', sans-serif";
      ctx.fillText(feature.title, startX + 100 + slideX, y + 50);

      // Description
      ctx.fillStyle = `rgba(150, 150, 150, ${cardProgress})`;
      ctx.font = "22px 'Inter', sans-serif";
      ctx.fillText(feature.desc, startX + 100 + slideX, y + 85);
    });
  };

  const drawOutro = (ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, frame: number) => {
    const opacity = Math.min(progress * 2, 1);

    // Pulsing glow - larger for vertical
    const glowSize = 350 + Math.sin(frame * 0.05) * 50;
    const glow = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, glowSize);
    glow.addColorStop(0, `rgba(212, 175, 55, ${0.4 * opacity})`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Main CTA - stacked for vertical
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = "bold 64px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Start", w / 2, h * 0.32);
    ctx.fillText("Creating", w / 2, h * 0.40);

    ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`;
    ctx.font = "bold 56px 'Inter', sans-serif";
    ctx.fillText("Professional", w / 2, h * 0.52);
    ctx.fillText("SOPs", w / 2, h * 0.60);

    // Button - larger for vertical
    if (progress > 0.5) {
      const btnOpacity = (progress - 0.5) * 2;
      const btnY = h * 0.72;
      
      ctx.fillStyle = `rgba(212, 175, 55, ${btnOpacity})`;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 180, btnY, 360, 80, 40);
      ctx.fill();

      ctx.fillStyle = `rgba(0, 0, 0, ${btnOpacity})`;
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.fillText("Try Cocktail SOP", w / 2, btnY + 52);
    }

    // Branding
    ctx.fillStyle = `rgba(100, 100, 100, ${opacity * 0.7})`;
    ctx.font = "24px 'Inter', sans-serif";
    ctx.fillText("Built with ❤️ for", w / 2, h * 0.88);
    ctx.fillText("Bartenders & Mixologists", w / 2, h * 0.92);
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
            <h3 className="font-semibold">Cocktail SOP Promo Reel</h3>
          </div>
          <span className="text-xs text-muted-foreground">30 sec • 9:16 Reel</span>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black mx-auto" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
          <canvas
            ref={canvasRef}
            width={1080}
            height={1920}
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
