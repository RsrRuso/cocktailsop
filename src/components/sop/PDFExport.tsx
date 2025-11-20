import { CocktailRecipe, TasteProfile, TextureProfile } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Color palette constants
const blackFrame: [number, number, number] = [0, 0, 0];

export const exportToPDF = (recipe: CocktailRecipe, doc?: jsPDF, startY?: number) => {
  const isNewDoc = !doc;
  if (!doc) {
    doc = new jsPDF();
  }
  
  // Modern color palette - sophisticated and clean
  const darkText: [number, number, number] = [30, 30, 35];
  const accentGold: [number, number, number] = [180, 140, 70];
  const accentDeep: [number, number, number] = [45, 55, 75];
  const lightGray: [number, number, number] = [245, 247, 250];
  const mediumGray: [number, number, number] = [200, 205, 210];
  const subtleText: [number, number, number] = [100, 105, 115];
  
  // Modern decorative line
  const drawAccentLine = (x: number, y: number, width: number, thickness = 0.5) => {
    doc.setDrawColor(blackFrame[0], blackFrame[1], blackFrame[2]);
    doc.setLineWidth(thickness);
    doc.line(x, y, x + width, y);
  };
  
  // Modern card-style block with better contrast and 3D depth
  const drawModernCard = (x: number, y: number, width: number, height: number, is3D = false) => {
    if (is3D) {
      // Deep 3D shadow for image
      doc.setFillColor(180, 185, 190);
      doc.roundedRect(x + 2, y + 2, width, height, 2, 2, 'F');
      doc.setFillColor(200, 205, 210);
      doc.roundedRect(x + 1, y + 1, width, height, 2, 2, 'F');
    } else {
      // Subtle shadow for depth
      doc.setFillColor(220, 222, 225);
      doc.roundedRect(x + 0.5, y + 0.5, width, height, 2, 2, 'F');
    }
    
    // Main card with better contrast
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Light border for separation
    doc.setDrawColor(230, 232, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');
  };
  
  
  let yPos = startY || 8;
  const pdfOpts = recipe.pdfOptions || {};
  
  // Modern header with gold accent - BIGGER
  const brandName = recipe.brandName || "COCKTAIL SOP";
  const showBrandName = pdfOpts.showBrandName !== false;
  
  doc.setFillColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setFillColor(blackFrame[0], blackFrame[1], blackFrame[2]);
  doc.rect(0, 26, 210, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  
  if (showBrandName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(brandName.toUpperCase(), 15, 11);
    
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    const titleText = recipe.drinkName.toUpperCase() || "UNTITLED COCKTAIL";
    doc.text(titleText, 15, 22);
  } else {
    // If brand name is hidden, center the drink name
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    const titleText = recipe.drinkName.toUpperCase() || "UNTITLED COCKTAIL";
    doc.text(titleText, 15, 17);
  }
  
  yPos = 32;
  
  // Calculate metrics
  const totalVolume = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0), 0
  );
  const pureAlcohol = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100), 0
  );
  const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);
  
  // Modern layout - full width sections
  const pageWidth = 210;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);
  
  // Harmonious side-by-side layout: Image + Metrics with better spacing
  const blockSpacing = 5;
  const sectionHeight = 60;
  const imageWidth = 68;
  const metricsWidth = contentWidth - imageWidth - blockSpacing;
  
  // Image block - same height as specifications with card background
  if (recipe.mainImage) {
    const imgX = margin;
    const imgY = yPos;
    const imgWidth = imageWidth;
    const imgHeight = sectionHeight;
    
    // Draw card background for image block - matching other blocks
    drawModernCard(imgX, imgY, imgWidth, imgHeight);
    
    // Calculate image size to fill the block with minimal padding
    const imgPadding = 0.5;
    const imgDisplaySize = Math.min(imgWidth, imgHeight) - (imgPadding * 2);
    const imgCenterX = imgX + (imgWidth - imgDisplaySize) / 2;
    const imgCenterY = imgY + (imgHeight - imgDisplaySize) / 2;
    
    try {
      let format: 'PNG' | 'JPEG' = 'JPEG';
      if (recipe.mainImage.startsWith('data:image/png')) {
        format = 'PNG';
      }
      
      // High-quality image rendering - centered in block
      doc.addImage(recipe.mainImage, format, imgCenterX, imgCenterY, imgDisplaySize, imgDisplaySize, undefined, 'NONE');
      
    } catch (e) {
      console.error('Failed to add image to PDF:', e);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      doc.text("Image unavailable", imgX + 20, imgY + 30);
    }
  }
  
  // Metrics block - balanced companion
  const metricsX = margin + imageWidth + blockSpacing;
  drawModernCard(metricsX, yPos, metricsWidth, sectionHeight);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("SPECIFICATIONS", metricsX + 5, yPos + 6);
  
  drawAccentLine(metricsX + 5, yPos + 8, 35, 0.6);
  
  // Elegant metric grid - 2 columns, 3 rows
  const specs = [
    { label: 'TECHNIQUE', value: recipe.technique || '-' },
    { label: 'GLASS', value: recipe.glass || '-' },
    { label: 'ICE', value: recipe.ice || '-' },
    { label: 'GARNISH', value: recipe.garnish || '-' },
    { label: 'VOLUME', value: totalVolume.toFixed(0) + 'ml' },
    { label: 'ABV', value: abvPercentage.toFixed(1) + '%' },
  ];
  
  const specsStartY = yPos + 14;
  const colWidth = (metricsWidth - 14) / 2;
  const rowHeight = 13;
  
  specs.forEach((spec, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = metricsX + 7 + (col * colWidth);
    const y = specsStartY + (row * rowHeight);
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
    doc.text(spec.label, x, y);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const maxWidth = colWidth - 4;
    
    // Allow full text wrapping for GARNISH, truncate others
    if (spec.label === 'GARNISH') {
      const wrappedText = doc.splitTextToSize(spec.value, maxWidth);
      doc.text(wrappedText.slice(0, 2), x, y + 4.5);
    } else {
      const valueText = spec.value.length > 15 ? spec.value.substring(0, 15) + '...' : spec.value;
      doc.text(valueText, x, y + 4.5);
    }
  });
  
  yPos += sectionHeight + blockSpacing;
  
  // Profiles section - side by side with better spacing
  const profileWidth = (contentWidth - blockSpacing) / 2;
  
  // Taste Profile
  drawModernCard(margin, yPos, profileWidth, 58);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("TASTE PROFILE", margin + 5, yPos + 7);
  
  drawRadarChart(doc, margin + (profileWidth / 2), yPos + 30, 20, recipe.tasteProfile, 'Taste');
  
  // Texture Profile
  drawModernCard(margin + profileWidth + blockSpacing, yPos, profileWidth, 58);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("TEXTURE PROFILE", margin + profileWidth + blockSpacing + 5, yPos + 7);
  
  drawRadarChart(doc, margin + profileWidth + blockSpacing + (profileWidth / 2), yPos + 30, 20, recipe.textureProfile, 'Texture');
  
  yPos += 58 + blockSpacing;
  
  // Recipe section - modern visual list with better content padding
  const recipeHeight = Math.min(recipe.ingredients.length * 7 + 22, 110);
  drawModernCard(margin, yPos, contentWidth, recipeHeight);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("RECIPE", margin + 5, yPos + 7);
  
  drawAccentLine(margin + 5, yPos + 10, 30, 0.8);
  
  const recipeStartY = yPos + 16;
  let ingredientY = recipeStartY;
  const ingredientLeftMargin = margin + 6;
  
  // Modern ingredient list with proper padding and text wrapping
  const maxNameWidth = 70;
  const maxMetaWidth = 75;
  
  recipe.ingredients.slice(0, 10).forEach((ing, index) => {
    if (ingredientY > yPos + recipeHeight - 10) return; // Stop if running out of space
    
    // Ingredient line with visual hierarchy
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const ingredientName = ing.name.toUpperCase();
    const nameLines = doc.splitTextToSize(ingredientName, maxNameWidth);
    doc.text(nameLines[0], ingredientLeftMargin, ingredientY);
    
    // Amount and unit on same line - handle optional amount
    if (pdfOpts.showAmount !== false) {
      const amountText = ing.amount ? 
        `${ing.amount}${pdfOpts.showUnit !== false ? ' ' + ing.unit : ''}` : 
        '—';
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(amountText, margin + 80, ingredientY);
    }
    
    // Type and ABV if enabled
    let metaText = '';
    if (pdfOpts.showType !== false && ing.type) {
      metaText += ing.type;
    }
    if (pdfOpts.showABV !== false && ing.abv) {
      metaText += (metaText ? ' • ' : '') + ing.abv + '%';
    }
    if (metaText) {
      doc.setFontSize(6);
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      const metaLines = doc.splitTextToSize(metaText, maxMetaWidth);
      doc.text(metaLines[0], margin + 120, ingredientY);
    }
    
    // Notes if enabled - with wrapping
    if (pdfOpts.showNotes !== false && ing.notes) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      const noteLines = doc.splitTextToSize(ing.notes, contentWidth - 16);
      doc.text(noteLines.slice(0, 1), ingredientLeftMargin, ingredientY + 3.5);
      ingredientY += 7;
    } else {
      ingredientY += 6;
    }
  });
  
  yPos += recipeHeight + blockSpacing;
  
  
  // Method & Notes section - side by side with better spacing
  const methodWidth = (contentWidth - blockSpacing) / 2;
  const methodNotesHeight = 55;
  
  // Method with better padding and text containment
  drawModernCard(margin, yPos, methodWidth, methodNotesHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("METHOD", margin + 7, yPos + 8);
  
  const methodLines = doc.splitTextToSize(recipe.methodSOP || 'No method specified', methodWidth - 14);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(methodLines.slice(0, 14), margin + 7, yPos + 14);
  
  // Service Notes with better padding and text containment
  drawModernCard(margin + methodWidth + blockSpacing, yPos, methodWidth, methodNotesHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("SERVICE NOTES", margin + methodWidth + blockSpacing + 7, yPos + 8);
  
  const serviceText = recipe.serviceNotes && recipe.serviceNotes.trim() 
    ? recipe.serviceNotes 
    : 'No service notes specified';
  const notesLines = doc.splitTextToSize(serviceText, methodWidth - 14);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(notesLines.slice(0, 14), margin + methodWidth + blockSpacing + 7, yPos + 14);
  
  yPos += methodNotesHeight + 4;
  
  // Footer with metrics and allergens - positioned at bottom with more space
  const footerY = 285;
  doc.setDrawColor(blackFrame[0], blackFrame[1], blackFrame[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  // Metrics badges in footer
  const metricsStartX = margin;
  const metricsY = footerY + 5;
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("RATIO", metricsStartX, metricsY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(recipe.ratio || '—', metricsStartX, metricsY + 5);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("pH", metricsStartX + 25, metricsY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(recipe.ph || '0', metricsStartX + 25, metricsY + 5);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("BRIX", metricsStartX + 40, metricsY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(recipe.brix || '0', metricsStartX + 40, metricsY + 5);
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("KCAL", metricsStartX + 60, metricsY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(estimatedCalories.toString(), metricsStartX + 60, metricsY + 5);
  
  // Allergens
  if (recipe.allergens && recipe.allergens.trim()) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
    doc.text("ALLERGENS:", metricsStartX + 85, metricsY);
    
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const allergenText = recipe.allergens.length > 55 ? recipe.allergens.substring(0, 55) + '...' : recipe.allergens;
    doc.text(allergenText, metricsStartX + 85, metricsY + 5);
  }
  
  // Save PDF only if it's a new document
  if (isNewDoc) {
    const fileName = `${recipe.drinkName.replace(/\s+/g, '_')}_SOP.pdf`;
    doc.save(fileName);
  }
  
  return doc;
};

// Modern minimalist radar chart
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
  
  // Minimal grid circles
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    doc.setDrawColor(230, 233, 238);
    doc.setLineWidth(0.2);
    doc.circle(centerX, centerY, r, 'S');
  }
  
  // Subtle axes
  doc.setDrawColor(230, 233, 238);
  doc.setLineWidth(0.15);
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    doc.line(centerX, centerY, x, y);
  }
  
  // Data polygon
  const points: [number, number][] = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = values[i];
    const r = (radius / 10) * value;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    points.push([x, y]);
  }
  
  // Black filled polygon
  if (points.length > 0) {
    doc.setDrawColor(blackFrame[0], blackFrame[1], blackFrame[2]);
    doc.setFillColor(blackFrame[0], blackFrame[1], blackFrame[2], 0.15);
    doc.setLineWidth(0.6);
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      'FD'
    );
  }
  
  // Black points
  points.forEach(([x, y]) => {
    doc.setFillColor(blackFrame[0], blackFrame[1], blackFrame[2]);
    doc.circle(x, y, 0.7, 'F');
  });
  
  // Clean labels
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 105, 115);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 3;
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
