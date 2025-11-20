import { CocktailRecipe, TasteProfile, TextureProfile } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    doc.setDrawColor(accentGold[0], accentGold[1], accentGold[2]);
    doc.setLineWidth(thickness);
    doc.line(x, y, x + width, y);
  };
  
  // Modern card-style block
  const drawModernCard = (x: number, y: number, width: number, height: number, withAccent = false) => {
    // Subtle shadow
    doc.setFillColor(235, 237, 240);
    doc.roundedRect(x + 0.8, y + 0.8, width, height, 1.5, 1.5, 'F');
    
    // Main card
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, 'F');
    
    if (withAccent) {
      // Gold accent bar on left
      doc.setFillColor(accentGold[0], accentGold[1], accentGold[2]);
      doc.roundedRect(x, y, 2, height, 1.5, 1.5, 'F');
    }
  };
  
  
  let yPos = startY || 8;
  const pdfOpts = recipe.pdfOptions || {};
  
  // Modern header with gold accent - BIGGER
  const brandName = recipe.brandName || "COCKTAIL SOP";
  const showBrandName = pdfOpts.showBrandName !== false;
  
  doc.setFillColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setFillColor(accentGold[0], accentGold[1], accentGold[2]);
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
  
  // Harmonious side-by-side layout: Image + Metrics
  const sectionHeight = 60;
  const imageWidth = 68;
  const metricsWidth = contentWidth - imageWidth - 4;
  
  // Image block - elegant square aspect
  if (recipe.mainImage) {
    drawModernCard(margin, yPos, imageWidth, sectionHeight, true);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
    doc.text("COCKTAIL", margin + 4, yPos + 6);
    
    const imgPadding = 4;
    const imgSize = imageWidth - (imgPadding * 2);
    const imgX = margin + imgPadding;
    const imgY = yPos + 9;
    
    try {
      let format: 'PNG' | 'JPEG' = 'JPEG';
      if (recipe.mainImage.startsWith('data:image/png')) {
        format = 'PNG';
      }
      
      // High-quality image rendering
      doc.addImage(recipe.mainImage, format, imgX, imgY, imgSize, imgSize, undefined, 'FAST');
      
      // Subtle gold frame
      doc.setDrawColor(accentGold[0], accentGold[1], accentGold[2]);
      doc.setLineWidth(0.4);
      doc.rect(imgX, imgY, imgSize, imgSize);
    } catch (e) {
      console.error('Failed to add image to PDF:', e);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      doc.text("Image unavailable", imgX + 8, imgY + 25);
    }
  }
  
  // Metrics block - balanced companion
  const metricsX = margin + imageWidth + 4;
  drawModernCard(metricsX, yPos, metricsWidth, sectionHeight);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("SPECIFICATIONS", metricsX + 4, yPos + 6);
  
  drawAccentLine(metricsX + 4, yPos + 8, 35, 0.6);
  
  // Elegant metric grid - 2 columns, 3 rows
  const specs = [
    { label: 'TECHNIQUE', value: recipe.technique || '-' },
    { label: 'GLASS', value: recipe.glass || '-' },
    { label: 'ICE', value: recipe.ice || '-' },
    { label: 'GARNISH', value: recipe.garnish || '-' },
    { label: 'VOLUME', value: totalVolume.toFixed(0) + 'ml' },
    { label: 'ABV', value: abvPercentage.toFixed(1) + '%' },
  ];
  
  const specsStartY = yPos + 13;
  const colWidth = (metricsWidth - 8) / 2;
  const rowHeight = 14;
  
  specs.forEach((spec, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = metricsX + 4 + (col * colWidth);
    const y = specsStartY + (row * rowHeight);
    
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
    doc.text(spec.label, x, y);
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const valueText = spec.value.length > 18 ? spec.value.substring(0, 18) + '...' : spec.value;
    doc.text(valueText, x, y + 5);
  });
  
  yPos += sectionHeight + 5;
  
  // Profiles section - side by side - BIGGER
  const profileWidth = (contentWidth - 3) / 2;
  
  // Taste Profile
  drawModernCard(margin, yPos, profileWidth, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("TASTE PROFILE", margin + 4, yPos + 7);
  
  drawRadarChart(doc, margin + (profileWidth / 2), yPos + 28, 20, recipe.tasteProfile, 'Taste');
  
  // Texture Profile
  drawModernCard(margin + profileWidth + 3, yPos, profileWidth, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("TEXTURE PROFILE", margin + profileWidth + 7, yPos + 7);
  
  drawRadarChart(doc, margin + profileWidth + 3 + (profileWidth / 2), yPos + 28, 20, recipe.textureProfile, 'Texture');
  
  yPos += 56;
  
  // Recipe section - modern visual list - BIGGER HEIGHT
  const recipeHeight = Math.min(recipe.ingredients.length * 7 + 22, 110);
  drawModernCard(margin, yPos, contentWidth, recipeHeight, true);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("RECIPE", margin + 5, yPos + 7);
  
  drawAccentLine(margin + 5, yPos + 10, 30, 0.8);
  
  const recipeStartY = yPos + 16;
  let ingredientY = recipeStartY;
  
  // Modern ingredient list (no table)
  recipe.ingredients.slice(0, 12).forEach((ing, index) => {
    if (ingredientY > yPos + recipeHeight - 6) return; // Stop if running out of space
    
    // Ingredient line with visual hierarchy
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(ing.name.toUpperCase(), margin + 7, ingredientY);
    
    // Amount and unit on same line - handle optional amount
    if (pdfOpts.showAmount !== false) {
      const amountText = ing.amount ? 
        `${ing.amount}${pdfOpts.showUnit !== false ? ' ' + ing.unit : ''}` : 
        '—';
      doc.setFont("helvetica", "normal");
      doc.setTextColor(accentGold[0], accentGold[1], accentGold[2]);
      doc.text(amountText, margin + 85, ingredientY);
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
      doc.setFontSize(6.5);
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      doc.text(metaText, margin + 120, ingredientY);
    }
    
    // Notes if enabled
    if (pdfOpts.showNotes !== false && ing.notes) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      const noteText = ing.notes.length > 50 ? ing.notes.substring(0, 50) + '...' : ing.notes;
      doc.text(noteText, margin + 7, ingredientY + 3.5);
      ingredientY += 7.5;
    } else {
      ingredientY += 6.5;
    }
    
    // Subtle divider
    if (index < recipe.ingredients.length - 1 && ingredientY < yPos + recipeHeight - 6) {
      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.setLineWidth(0.1);
      doc.line(margin + 7, ingredientY - 1.5, margin + contentWidth - 7, ingredientY - 1.5);
    }
  });
  
  yPos += recipeHeight + 5;
  
  
  // Method & Notes section - side by side - BIGGER HEIGHT
  const methodWidth = (contentWidth - 3) / 2;
  const methodNotesHeight = 55;
  
  // Method
  drawModernCard(margin, yPos, methodWidth, methodNotesHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("METHOD", margin + 4, yPos + 7);
  
  const methodLines = doc.splitTextToSize(recipe.methodSOP || 'No method specified', methodWidth - 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(methodLines.slice(0, 16), margin + 4, yPos + 13);
  
  // Service Notes - always show
  drawModernCard(margin + methodWidth + 3, yPos, methodWidth, methodNotesHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("SERVICE NOTES", margin + methodWidth + 7, yPos + 7);
  
  const serviceText = recipe.serviceNotes && recipe.serviceNotes.trim() 
    ? recipe.serviceNotes 
    : 'No service notes specified';
  const notesLines = doc.splitTextToSize(serviceText, methodWidth - 10);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(notesLines.slice(0, 16), margin + methodWidth + 7, yPos + 13);
  
  yPos += methodNotesHeight + 4;
  
  // Footer with metrics and allergens - positioned at bottom with more space
  const footerY = 285;
  doc.setDrawColor(accentGold[0], accentGold[1], accentGold[2]);
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
  
  // Gold filled polygon
  if (points.length > 0) {
    doc.setDrawColor(180, 140, 70);
    doc.setFillColor(180, 140, 70, 0.15);
    doc.setLineWidth(0.6);
    doc.lines(
      points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      'FD'
    );
  }
  
  // Gold points
  points.forEach(([x, y]) => {
    doc.setFillColor(180, 140, 70);
    doc.circle(x, y, 0.7, 'F');
  });
  
  // Clean labels
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 105, 115);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 6;
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
