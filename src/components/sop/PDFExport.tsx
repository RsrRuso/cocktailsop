import { CocktailRecipe, TasteProfile, TextureProfile } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (recipe: CocktailRecipe, doc?: jsPDF, startY?: number) => {
  const isNewDoc = !doc;
  if (!doc) {
    doc = new jsPDF();
  }
  
  // Enhanced 3D effect colors with gradients
  const textColor: [number, number, number] = [20, 20, 20];
  const headerColor: [number, number, number] = [52, 73, 94];
  const accentColor: [number, number, number] = [41, 128, 185];
  const borderColor: [number, number, number] = [127, 140, 141];
  const shadowColor: [number, number, number] = [189, 195, 199];
  const blockBg: [number, number, number] = [236, 240, 241];
  const shadowOffset = 1.5;
  
  // Enhanced 3D block with gradient effect
  const draw3DBlock = (x: number, y: number, width: number, height: number, accent = false) => {
    // Multi-layer shadow for depth
    doc.setFillColor(shadowColor[0] - 30, shadowColor[1] - 30, shadowColor[2] - 30);
    doc.rect(x + shadowOffset * 2, y + shadowOffset * 2, width, height, 'F');
    
    doc.setFillColor(shadowColor[0], shadowColor[1], shadowColor[2]);
    doc.rect(x + shadowOffset, y + shadowOffset, width, height, 'F');
    
    // Main block with optional accent
    if (accent) {
      doc.setFillColor(accentColor[0] + 40, accentColor[1] + 40, accentColor[2] + 40);
    } else {
      doc.setFillColor(blockBg[0], blockBg[1], blockBg[2]);
    }
    doc.rect(x, y, width, height, 'F');
    
    // Highlight for 3D effect
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(x, y, x + width, y);
    doc.line(x, y, x, y + height);
    
    // Border
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.4);
    doc.rect(x, y, width, height, 'S');
  };
  
  let yPos = startY || 12;
  
  // Compact header with accent bar
  draw3DBlock(13, yPos - 2, 184, 8, true);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("ATTIKO — COCKTAIL SOP", 15, yPos + 3);
  
  yPos += 10;
  
  // Drink name title - more compact
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleText = recipe.drinkName.toUpperCase() || "UNTITLED";
  doc.text(titleText, 15, yPos);
  
  yPos += 8;
  
  // Calculate metrics
  const totalVolume = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0), 0
  );
  const pureAlcohol = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100), 0
  );
  const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);
  
  // Two-column layout: Left column for details, Right column for profiles
  const leftColX = 13;
  const leftColWidth = 90;
  const rightColX = 107;
  const rightColWidth = 90;
  
  // Left Column - Identity & Metrics in compact 3D block
  draw3DBlock(leftColX, yPos, leftColWidth, 52);
  
  autoTable(doc, {
    startY: yPos + 1 as any,
    head: [['Identity', 'Value']],
    body: [
      ['Technique', recipe.technique || '-'],
      ['Glass', recipe.glass || '-'],
      ['Ice', recipe.ice || '-'],
      ['Garnish', recipe.garnish || '-'],
      ['Volume', totalVolume.toFixed(0) + ' ml'],
      ['ABV', abvPercentage.toFixed(1) + '%'],
      ['Ratio', recipe.ratio || '—'],
      ['pH', recipe.ph || '0'],
      ['Brix', recipe.brix || '0'],
      ['Kcal', estimatedCalories.toString()],
    ],
    theme: 'plain',
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      textColor: textColor,
      lineColor: [0, 0, 0, 0],
      lineWidth: 0,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: headerColor,
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30, fontSize: 6 },
      1: { fontStyle: 'normal', cellWidth: 'auto', fontSize: 6 },
    },
    margin: { left: leftColX + 2, right: 0 },
  } as any);
  
  const detailEndY = yPos + 52;
  
  // Right Column - Texture Profile with 3D radar
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.text("TEXTURE PROFILE", rightColX + 2, yPos + 4);
  
  drawRadarChart(doc, rightColX + 45, yPos + 25, 22, recipe.textureProfile, 'Texture');
  
  const textureY = yPos + 52;
  
  // Taste Profile below texture with 3D radar
  doc.setFontSize(8);
  doc.text("TASTE PROFILE", rightColX + 2, textureY + 4);
  
  drawRadarChart(doc, rightColX + 45, textureY + 25, 22, recipe.tasteProfile, 'Taste');
  
  yPos = detailEndY + 4;
  
  // Method (SOP) - Compact
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.text("METHOD (SOP)", leftColX + 2, yPos);
  yPos += 3;
  
  const methodLines = doc.splitTextToSize(recipe.methodSOP || 'No method specified', leftColWidth - 6);
  const methodHeight = Math.min(methodLines.length * 3 + 6, 30);
  draw3DBlock(leftColX, yPos, leftColWidth, methodHeight);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(methodLines.slice(0, 10), leftColX + 2, yPos + 3);
  yPos += methodHeight + 3;
  
  // Service Notes - Compact
  if (recipe.serviceNotes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.text("SERVICE NOTES", leftColX + 2, yPos);
    yPos += 3;
    
    const notesLines = doc.splitTextToSize(recipe.serviceNotes, leftColWidth - 6);
    const notesHeight = Math.min(notesLines.length * 3 + 6, 30);
    draw3DBlock(leftColX, yPos, leftColWidth, notesHeight);
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(notesLines.slice(0, 10), leftColX + 2, yPos + 3);
    yPos += notesHeight + 3;
  }
  
  yPos = Math.max(yPos, textureY + 52 + 4);
  
  // Recipe table - Full width, compact
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.text("RECIPE", leftColX + 2, yPos);
  yPos += 3;
  
  const recipeData = recipe.ingredients.slice(0, 8).map(ing => [
    ing.name.toUpperCase(),
    ing.amount,
    ing.unit,
    ing.type.toUpperCase(),
    ing.abv || '',
  ]);
  
  draw3DBlock(leftColX, yPos, 184, 35);
  
  autoTable(doc, {
    startY: yPos + 1 as any,
    head: [['INGREDIENT', 'AMT', 'UNIT', 'TYPE', 'ABV%']],
    body: recipeData,
    theme: 'plain',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      textColor: textColor,
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: blockBg,
      textColor: headerColor,
      fontStyle: 'bold',
      fontSize: 6,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40 },
      4: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: leftColX + 2, right: 15 },
  });
  
  yPos += 37;
  
  // Allergens - compact
  if (recipe.allergens) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.text("ALLERGENS:", leftColX + 2, yPos);
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const allergenText = doc.splitTextToSize(recipe.allergens, 160);
    doc.text(allergenText[0] || '', leftColX + 25, yPos);
  }
  
  // Save PDF only if it's a new document
  if (isNewDoc) {
    const fileName = `${recipe.drinkName.replace(/\s+/g, '_')}_SOP.pdf`;
    doc.save(fileName);
  }
  
  return doc;
};

// Enhanced 3D radar chart
const drawRadarChart = (
  doc: jsPDF,
  centerX: number,
  centerY: number,
  radius: number,
  profile: TasteProfile | TextureProfile,
  type: 'Taste' | 'Texture'
) => {
  const labels = type === 'Taste' 
    ? ['Sweet', 'Sour', 'Bitter', 'Salty', 'Umami']
    : ['Body', 'Foam', 'Bubbles', 'Oil', 'Cream', 'Astrin'];
  
  const values = type === 'Taste'
    ? [
        (profile as TasteProfile).sweet,
        (profile as TasteProfile).sour,
        (profile as TasteProfile).bitter,
        (profile as TasteProfile).salty,
        (profile as TasteProfile).umami,
      ]
    : [
        (profile as TextureProfile).body,
        (profile as TextureProfile).foam,
        (profile as TextureProfile).bubbles,
        (profile as TextureProfile).oiliness,
        (profile as TextureProfile).creaminess,
        (profile as TextureProfile).astringency,
      ];
  
  const numPoints = labels.length;
  const angleStep = (2 * Math.PI) / numPoints;
  
  // 3D shadow layer
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    doc.circle(centerX + 0.5, centerY + 0.5, r, 'S');
  }
  
  // Grid circles with gradient effect
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    const grayVal = 240 - i * 10;
    doc.setDrawColor(grayVal, grayVal, grayVal);
    doc.setLineWidth(0.2);
    doc.circle(centerX, centerY, r, 'S');
  }
  
  // Axes with subtle styling
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.15);
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    doc.line(centerX, centerY, x, y);
  }
  
  // 3D data polygon with shadow
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = values[i];
    const r = (radius / 10) * value;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Shadow polygon
  if (points.length > 0) {
    doc.setDrawColor(100, 100, 100);
    doc.setFillColor(100, 100, 100, 0.1);
    doc.setLineWidth(0.3);
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0] + 0.5, p[1] - points[i][1] + 0.5]),
      points[0][0] + 0.5,
      points[0][1] + 0.5,
      [1, 1],
      'FD'
    );
  }
  
  // Main polygon with gradient effect
  if (points.length > 0) {
    doc.setDrawColor(41, 128, 185);
    doc.setFillColor(52, 152, 219, 0.3);
    doc.setLineWidth(0.5);
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      'FD'
    );
  }
  
  // 3D points
  points.forEach(([x, y]) => {
    doc.setFillColor(100, 100, 100);
    doc.circle(x + 0.3, y + 0.3, 0.8, 'F');
    doc.setFillColor(52, 152, 219);
    doc.circle(x, y, 0.8, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(x - 0.2, y - 0.2, 0.3, 'F');
  });
  
  // Compact labels
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 5;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    
    const label = labels[i].toUpperCase();
    const textWidth = doc.getTextWidth(label);
    
    let xOffset = -textWidth / 2;
    let yOffset = 1.5;
    
    if (angle > -Math.PI / 4 && angle < Math.PI / 4) xOffset = 1;
    else if (angle > (3 * Math.PI) / 4 || angle < -(3 * Math.PI) / 4) xOffset = -textWidth - 1;
    
    doc.text(label, x + xOffset, y + yOffset);
  }
};
