import { CocktailRecipe, TasteProfile, TextureProfile } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (recipe: CocktailRecipe) => {
  const doc = new jsPDF();
  
  // Dark theme colors
  const darkBg: [number, number, number] = [45, 52, 64];
  const darkerBg: [number, number, number] = [30, 35, 45];
  const accentBlue: [number, number, number] = [52, 152, 219];
  const lightText: [number, number, number] = [236, 240, 241];
  const mediumText: [number, number, number] = [149, 165, 166];
  
  // Header block
  doc.setFillColor(darkerBg[0], darkerBg[1], darkerBg[2]);
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("COCKTAIL SOP", 15, 10);
  
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(recipe.drinkName.toUpperCase() || "UNTITLED", 15, 22);
  
  let yPos = 35;
  
  // Calculate metrics
  const totalVolume = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0), 0
  );
  const pureAlcohol = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100), 0
  );
  const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);
  
  // Identity block - compact
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(10, yPos - 5, 190, 8, 'F');
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Identity & Metrics", 15, yPos);
  yPos += 8;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  
  // Two-column layout for identity
  const leftCol = 15;
  const rightCol = 110;
  const lineHeight = 5;
  
  doc.setFont("helvetica", "bold");
  doc.text("Drink:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(recipe.drinkName || '-', leftCol + 20, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("Volume:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${totalVolume.toFixed(0)} ml`, rightCol + 20, yPos);
  yPos += lineHeight;
  
  doc.setFont("helvetica", "bold");
  doc.text("Glass:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(recipe.glass || '-', leftCol + 20, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("ABV:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${abvPercentage.toFixed(1)}%`, rightCol + 20, yPos);
  yPos += lineHeight;
  
  doc.setFont("helvetica", "bold");
  doc.text("Ice:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(recipe.ice || '-', leftCol + 20, yPos);
  
  doc.setFont("helvetica", "bold");
  doc.text("Calories:", rightCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${estimatedCalories} kcal`, rightCol + 20, yPos);
  yPos += lineHeight;
  
  doc.setFont("helvetica", "bold");
  doc.text("Technique:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(recipe.technique || '-', leftCol + 20, yPos);
  
  if (recipe.ph && parseFloat(recipe.ph) > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("pH:", rightCol, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(parseFloat(recipe.ph).toFixed(1), rightCol + 20, yPos);
  }
  yPos += lineHeight;
  
  doc.setFont("helvetica", "bold");
  doc.text("Garnish:", leftCol, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(recipe.garnish || '-', leftCol + 20, yPos);
  
  if (recipe.brix && parseFloat(recipe.brix) > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Brix:", rightCol, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(parseFloat(recipe.brix).toFixed(1), rightCol + 20, yPos);
  }
  yPos += 8;
  
  // Ingredients block
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(10, yPos - 5, 190, 8, 'F');
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Recipe", 15, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Ingredient', 'Amount', 'Type', 'ABV']],
    body: recipe.ingredients.map(ing => [
      ing.name || '-',
      `${ing.amount} ${ing.unit}`,
      ing.type || '-',
      ing.abv ? `${ing.abv}%` : '-'
    ]),
    theme: 'plain',
    headStyles: { 
      fillColor: darkerBg,
      textColor: lightText,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2
    },
    bodyStyles: {
      fillColor: darkBg,
      textColor: lightText,
      fontSize: 8,
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: darkerBg
    },
    margin: { left: 15, right: 15 }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 8;
  
  // Method block
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(10, yPos - 5, 190, 8, 'F');
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Method", 15, yPos);
  yPos += 6;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  const methodLines = doc.splitTextToSize(recipe.methodSOP || "No method provided", 180);
  doc.text(methodLines, 15, yPos);
  yPos += Math.min(methodLines.length * 4, 20) + 5;
  
  // Taste & Texture Radar Charts - side by side
  const tasteValues = Object.values(recipe.tasteProfile).filter(v => v > 0);
  const textureValues = Object.values(recipe.textureProfile).filter(v => v > 0);
  
  if (tasteValues.length > 0 || textureValues.length > 0) {
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(10, yPos - 5, 190, 8, 'F');
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Profiles", 15, yPos);
    yPos += 10;
    
    const chartSize = 35;
    const centerX1 = 45;
    const centerX2 = 140;
    const centerY = yPos + chartSize / 2;
    
    // Taste Radar
    if (tasteValues.length > 0) {
      drawRadarChart(doc, recipe.tasteProfile as unknown as Record<string, number>, centerX1, centerY, chartSize, accentBlue, lightText, mediumText, "Taste");
    }
    
    // Texture Radar  
    if (textureValues.length > 0) {
      const redAccent: [number, number, number] = [231, 76, 60];
      drawRadarChart(doc, recipe.textureProfile as unknown as Record<string, number>, centerX2, centerY, chartSize, redAccent, lightText, mediumText, "Texture");
    }
    
    yPos += chartSize + 5;
  }
  
  // Allergens warning
  if (recipe.allergens) {
    doc.setFillColor(52, 73, 94);
    doc.rect(10, yPos - 3, 190, 10, 'F');
    doc.setTextColor(231, 76, 60);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ ALLERGENS", 15, yPos + 2);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.setFontSize(8);
    doc.text(recipe.allergens, 15, yPos + 7);
  }
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(mediumText[0], mediumText[1], mediumText[2]);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated ${new Date().toLocaleDateString()} | ${recipe.drinkName}`,
    105, 290, { align: 'center' }
  );
  
  const fileName = `${recipe.drinkName.replace(/[^a-z0-9]/gi, '_')}_SOP.pdf`;
  doc.save(fileName);
};

function drawRadarChart(
  doc: jsPDF, 
  profile: Record<string, number>, 
  centerX: number, 
  centerY: number, 
  size: number,
  color: [number, number, number],
  lightText: [number, number, number],
  mediumText: [number, number, number],
  label: string
) {
  const entries = Object.entries(profile).filter(([_, v]) => v > 0);
  if (entries.length === 0) return;
  
  const radius = size / 2;
  const angleStep = (2 * Math.PI) / entries.length;
  
  // Draw circles (background grid)
  doc.setDrawColor(mediumText[0], mediumText[1], mediumText[2]);
  doc.setLineWidth(0.1);
  [0.5, 1].forEach(factor => {
    const r = radius * factor;
    doc.circle(centerX, centerY, r, 'S');
  });
  
  // Draw axes and labels
  entries.forEach(([key, _], i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    doc.setDrawColor(mediumText[0], mediumText[1], mediumText[2]);
    doc.line(centerX, centerY, x, y);
    
    // Label
    const labelX = centerX + (radius + 8) * Math.cos(angle);
    const labelY = centerY + (radius + 8) * Math.sin(angle);
    doc.setFontSize(7);
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    doc.setFont("helvetica", "normal");
    doc.text(key.charAt(0).toUpperCase() + key.slice(1), labelX, labelY, { align: 'center' });
  });
  
  // Draw data polygon
  doc.setFillColor(color[0], color[1], color[2]);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.5);
  
  const points = entries.map(([_, value], i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (value / 10) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  });
  
  // Draw polygon with opacity
  if (points.length > 0) {
    // Fill with transparency
    const ctx = (doc as any).context2d;
    ctx.globalAlpha = 0.3;
    doc.moveTo(points[0].x, points[0].y);
    points.forEach(p => doc.lineTo(p.x, p.y));
    doc.lineTo(points[0].x, points[0].y);
    doc.fill();
    
    ctx.globalAlpha = 1.0;
    doc.moveTo(points[0].x, points[0].y);
    points.forEach(p => doc.lineTo(p.x, p.y));
    doc.lineTo(points[0].x, points[0].y);
    doc.stroke();
  }
  
  // Chart label
  doc.setFontSize(9);
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  doc.setFont("helvetica", "bold");
  doc.text(label, centerX, centerY - radius - 5, { align: 'center' });
}
