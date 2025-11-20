import { CocktailRecipe, TasteProfile, TextureProfile } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (recipe: CocktailRecipe) => {
  const doc = new jsPDF();
  
  // Dark theme colors with high contrast
  const darkBg: [number, number, number] = [45, 52, 64];
  const darkerBg: [number, number, number] = [30, 35, 45];
  const accentBlue: [number, number, number] = [52, 152, 219];
  const lightText: [number, number, number] = [236, 240, 241];
  const mediumText: [number, number, number] = [189, 195, 199];
  const borderColor: [number, number, number] = [108, 117, 125];
  
  // 3D shadow offsets for depth
  const shadowOffset = 1.5;
  
  // Helper to draw 3D block with shadow
  const draw3DBlock = (x: number, y: number, width: number, height: number, fillColor: [number, number, number]) => {
    // Shadow
    doc.setFillColor(20, 25, 35);
    doc.rect(x + shadowOffset, y + shadowOffset, width, height, 'F');
    
    // Main block
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.rect(x, y, width, height, 'F');
    
    // Border for depth
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.rect(x, y, width, height, 'S');
  };
  
  // Header block with 3D effect
  doc.setFillColor(20, 25, 35);
  doc.rect(shadowOffset, shadowOffset, 210, 28, 'F');
  doc.setFillColor(darkerBg[0], darkerBg[1], darkerBg[2]);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(0, 0, 210, 28, 'S');
  
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
  
  // Identity block with 3D effect
  draw3DBlock(10, yPos - 5, 190, 8, darkBg);
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
  
  // Ingredients section with 3D effect
  draw3DBlock(10, yPos - 5, 190, 8, darkBg);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Ingredients", 15, yPos);
  yPos += 8;
  
  const tableData = recipe.ingredients.map(ing => [
    ing.name,
    `${ing.amount} ${ing.unit}`,
    `${ing.abv}%`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Ingredient', 'Amount', 'ABV']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: lightText,
      lineColor: borderColor,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: darkerBg,
      textColor: mediumText,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fillColor: darkBg,
    },
    alternateRowStyles: {
      fillColor: [40, 47, 59],
    },
    margin: { left: 10, right: 10 },
    tableWidth: 190,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 8;
  
  // Method section with 3D effect
  draw3DBlock(10, yPos - 5, 190, 8, darkBg);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Method", 15, yPos);
  yPos += 8;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightText[0], lightText[1], lightText[2]);
  
  const methodLines = doc.splitTextToSize(recipe.methodSOP || 'No method specified', 180);
  const methodHeight = methodLines.length * 4;
  
  draw3DBlock(10, yPos - 3, 190, methodHeight + 4, [40, 47, 59]);
  doc.text(methodLines, 15, yPos);
  yPos += methodHeight + 10;
  
  // Profile charts side by side with 3D radar charts
  const chartWidth = 90;
  const chartHeight = 45;
  const chartCenterX1 = 55;
  const chartCenterX2 = 155;
  const chartCenterY = yPos + 25;
  const chartRadius = 18;
  
  // Taste Profile 3D Radar
  draw3DBlock(10, yPos - 5, chartWidth, 8, darkBg);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Taste Profile", 15, yPos);
  
  draw3DBlock(10, yPos + 3, chartWidth, chartHeight - 8, [40, 47, 59]);
  
  const taste: TasteProfile = recipe.tasteProfile;
  
  draw3DRadarChart(
    doc,
    chartCenterX1,
    chartCenterY,
    chartRadius,
    taste as unknown as Record<string, number>,
    ['Sweet', 'Sour', 'Bitter', 'Salty', 'Umami'],
    accentBlue,
    lightText,
    mediumText
  );
  
  // Texture Profile 3D Radar
  draw3DBlock(110, yPos - 5, chartWidth, 8, darkBg);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Texture Profile", 115, yPos);
  
  draw3DBlock(110, yPos + 3, chartWidth, chartHeight - 8, [40, 47, 59]);
  
  const texture: TextureProfile = recipe.textureProfile;
  
  draw3DRadarChart(
    doc,
    chartCenterX2,
    chartCenterY,
    chartRadius,
    texture as unknown as Record<string, number>,
    ['Body', 'Foam', 'Bubbles', 'Oily', 'Creamy', 'Astringent'],
    accentBlue,
    lightText,
    mediumText
  );
  
  yPos += chartHeight + 8;
  
  // Allergens section with 3D effect
  if (recipe.allergens && recipe.allergens.trim().length > 0) {
    draw3DBlock(10, yPos - 5, 190, 8, [220, 53, 69]);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ ALLERGEN WARNING", 15, yPos);
    yPos += 8;
    
    draw3DBlock(10, yPos - 3, 190, 12, [40, 47, 59]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(lightText[0], lightText[1], lightText[2]);
    const allergenText = `Contains: ${recipe.allergens}`;
    doc.text(allergenText, 15, yPos + 3);
  }
  
  doc.save(`${recipe.drinkName || 'cocktail'}_sop.pdf`);
};

// Advanced 3D radar chart with depth and gradient effect
const draw3DRadarChart = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  radius: number,
  data: Record<string, number>,
  labels: string[],
  fillColor: [number, number, number],
  textColor: [number, number, number],
  axisColor: [number, number, number]
) => {
  const values = Object.values(data);
  const numAxes = values.length;
  const angleStep = (2 * Math.PI) / numAxes;
  
  // Draw concentric circles for grid with 3D depth
  const levels = 5;
  doc.setDrawColor(axisColor[0], axisColor[1], axisColor[2]);
  doc.setLineWidth(0.15);
  
  for (let i = 1; i <= levels; i++) {
    const r = (radius / levels) * i;
    // Shadow circle
    doc.setDrawColor(20, 25, 35);
    doc.circle(centerX + 0.5, centerY + 0.5, r);
    // Main circle
    doc.setDrawColor(axisColor[0], axisColor[1], axisColor[2]);
    doc.circle(centerX, centerY, r);
  }
  
  // Draw axes with 3D depth
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    // Shadow line
    doc.setDrawColor(20, 25, 35);
    doc.line(centerX + 0.5, centerY + 0.5, x + 0.5, y + 0.5);
    // Main line
    doc.setDrawColor(axisColor[0], axisColor[1], axisColor[2]);
    doc.line(centerX, centerY, x, y);
  }
  
  // Draw data polygon with 3D shadow
  const points: [number, number][] = [];
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = Math.min(Math.max(values[i], 0), 5) / 5;
    const r = radius * value;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Shadow polygon
  doc.setFillColor(20, 25, 35);
  doc.setDrawColor(20, 25, 35);
  doc.setLineWidth(1);
  if (points.length > 0) {
    doc.moveTo(points[0][0] + 1, points[0][1] + 1);
    for (let i = 1; i < points.length; i++) {
      doc.lineTo(points[i][0] + 1, points[i][1] + 1);
    }
    doc.lineTo(points[0][0] + 1, points[0][1] + 1);
    doc.fill();
  }
  
  // Main data polygon with gradient effect (simulated)
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
  doc.setDrawColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setLineWidth(1.5);
  
  if (points.length > 0) {
    doc.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      doc.lineTo(points[i][0], points[i][1]);
    }
    doc.lineTo(points[0][0], points[0][1]);
    doc.fillStroke();
  }
  
  // Reset opacity
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  
  // Draw data points with 3D effect
  doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
  doc.setLineWidth(0.5);
  for (const [x, y] of points) {
    // Shadow
    doc.setFillColor(20, 25, 35);
    doc.circle(x + 0.5, y + 0.5, 1.2, 'F');
    // Main point
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    doc.circle(x, y, 1.2, 'FD');
  }
  
  // Draw labels with better positioning
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 6;
    let x = centerX + labelRadius * Math.cos(angle);
    let y = centerY + labelRadius * Math.sin(angle);
    
    const label = labels[i];
    const textWidth = doc.getTextWidth(label);
    
    // Adjust x position based on angle
    if (Math.abs(Math.cos(angle)) > 0.5) {
      x = Math.cos(angle) > 0 ? x : x - textWidth;
    } else {
      x = x - textWidth / 2;
    }
    
    doc.text(label, x, y);
  }
};
