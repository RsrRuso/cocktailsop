import { CocktailRecipe, TasteProfile, TextureProfile } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (recipe: CocktailRecipe) => {
  const doc = new jsPDF();
  
  // Clean professional colors
  const textColor: [number, number, number] = [0, 0, 0];
  const headerColor: [number, number, number] = [100, 100, 100];
  const borderColor: [number, number, number] = [200, 200, 200];
  
  let yPos = 15;
  
  // Header
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("ATTIKO — COCKTAIL SOP", 15, yPos);
  
  yPos += 15;
  
  // Drink name title
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  const titleText = recipe.drinkName.toUpperCase() || "UNTITLED";
  doc.text(titleText, 15, yPos);
  
  yPos += 15;
  
  // Calculate metrics
  const totalVolume = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0), 0
  );
  const pureAlcohol = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100), 0
  );
  const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);
  
  // Identity & Metrics table
  autoTable(doc, {
    startY: yPos,
    head: [['Identity', 'Metrics']],
    body: [
      ['Drink Name', recipe.drinkName || '-'],
      ['Technique', recipe.technique || '-'],
      ['Glass', recipe.glass || '-'],
      ['Ice', recipe.ice || '-'],
      ['Garnish', recipe.garnish || '-'],
      ['Total (ml)', totalVolume.toFixed(0)],
      ['ABV (%)', abvPercentage.toFixed(1)],
      ['Ratio', recipe.ratio || '—'],
      ['pH', recipe.ph || '0'],
      ['Brix', recipe.brix || '0'],
      ['Kcal', estimatedCalories.toString()],
    ],
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: textColor,
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: textColor,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { fontStyle: 'normal', cellWidth: 40 },
      1: { fontStyle: 'normal', cellWidth: 'auto' },
    },
    margin: { left: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Method (SOP)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text("Method (SOP)", 15, yPos);
  yPos += 7;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const methodLines = doc.splitTextToSize(recipe.methodSOP || 'No method specified', 180);
  doc.text(methodLines, 15, yPos);
  yPos += methodLines.length * 5 + 10;
  
  // Service Notes
  if (recipe.serviceNotes) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Service Notes", 15, yPos);
    yPos += 7;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(recipe.serviceNotes, 180);
    doc.text(notesLines, 15, yPos);
    yPos += notesLines.length * 5 + 10;
  }
  
  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  // Texture Radar section title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Texture Radar", 15, yPos);
  yPos += 10;
  
  // Draw texture radar chart
  drawRadarChart(doc, 105, yPos + 30, 35, recipe.textureProfile, 'Texture');
  
  // Texture profile table next to chart
  const textureData = [
    ['BODY', recipe.textureProfile.body.toString()],
    ['FOAM', recipe.textureProfile.foam.toString()],
    ['BUBBLES', recipe.textureProfile.bubbles.toString()],
    ['OILINESS', recipe.textureProfile.oiliness.toString()],
    ['CREAMINESS', recipe.textureProfile.creaminess.toString()],
    ['ASTRINGENCY', recipe.textureProfile.astringency.toString()],
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: textureData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: textColor,
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'center', cellWidth: 15 },
    },
    margin: { left: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Taste Profile section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Taste Profile", 15, yPos);
  yPos += 10;
  
  // Draw taste radar chart
  drawRadarChart(doc, 105, yPos + 30, 35, recipe.tasteProfile, 'Taste');
  
  // Taste profile table next to chart
  const tasteData = [
    ['SWEET', recipe.tasteProfile.sweet.toString()],
    ['SOUR', recipe.tasteProfile.sour.toString()],
    ['BITTER', recipe.tasteProfile.bitter.toString()],
    ['SALTY', recipe.tasteProfile.salty.toString()],
    ['UMAMI', recipe.tasteProfile.umami.toString()],
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: tasteData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: textColor,
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'center', cellWidth: 15 },
    },
    margin: { left: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Recipe table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Recipe", 15, yPos);
  yPos += 7;
  
  const recipeData = recipe.ingredients.map(ing => [
    ing.name.toUpperCase(),
    ing.amount,
    ing.unit,
    ing.type.toUpperCase(),
    ing.abv || '',
    ing.notes || '',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['INGREDIENT', 'AMOUNT', 'UNIT', 'TYPE', '%ABV', 'NOTES']],
    body: recipeData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: textColor,
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: textColor,
      fontStyle: 'bold',
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Allergens
  if (recipe.allergens) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Allergens", 15, yPos);
    yPos += 7;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(recipe.allergens, 15, yPos);
  }
  
  // Save PDF
  const fileName = `${recipe.drinkName.replace(/\s+/g, '_')}_SOP.pdf`;
  doc.save(fileName);
};

// Helper function to draw radar chart
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
    : ['Body', 'Foam', 'Bubbles', 'Oiliness', 'Creaminess', 'Astringency'];
  
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
  
  // Draw concentric circles (grid)
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.1);
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    doc.circle(centerX, centerY, r, 'S');
  }
  
  // Draw axes
  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    doc.line(centerX, centerY, x, y);
  }
  
  // Draw data polygon
  doc.setDrawColor(52, 152, 219);
  doc.setFillColor(52, 152, 219, 0.2);
  doc.setLineWidth(0.5);
  
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = values[i];
    const r = (radius / 10) * value;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Draw polygon
  if (points.length > 0) {
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      'FD'
    );
  }
  
  // Draw points
  doc.setFillColor(52, 152, 219);
  points.forEach(([x, y]) => {
    doc.circle(x, y, 1, 'F');
  });
  
  // Draw labels
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 8;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    
    const label = labels[i].toUpperCase();
    const textWidth = doc.getTextWidth(label);
    
    let xOffset = -textWidth / 2;
    let yOffset = 2;
    
    if (angle > -Math.PI / 4 && angle < Math.PI / 4) xOffset = 2;
    else if (angle > (3 * Math.PI) / 4 || angle < -(3 * Math.PI) / 4) xOffset = -textWidth - 2;
    
    doc.text(label, x + xOffset, y + yOffset);
  }
};
