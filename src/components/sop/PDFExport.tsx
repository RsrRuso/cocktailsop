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
  
  // Modern header with gold accent
  doc.setFillColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.rect(0, 0, 210, 18, 'F');
  
  doc.setFillColor(accentGold[0], accentGold[1], accentGold[2]);
  doc.rect(0, 16, 210, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("ATTIKO", 15, 8);
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titleText = recipe.drinkName.toUpperCase() || "UNTITLED COCKTAIL";
  doc.text(titleText, 15, 15);
  
  yPos = 22;
  
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
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Specs section - modern badges layout
  drawModernCard(margin, yPos, contentWidth, 32, true);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("SPECIFICATIONS", margin + 5, yPos + 6);
  
  const specsY = yPos + 12;
  const badgeWidth = 28;
  const badgeHeight = 16;
  const badgeSpacing = 30;
  
  // Draw spec badges
  const specs = [
    { label: 'TECHNIQUE', value: recipe.technique || '-' },
    { label: 'GLASS', value: recipe.glass || '-' },
    { label: 'ICE', value: recipe.ice || '-' },
    { label: 'GARNISH', value: recipe.garnish || '-' },
    { label: 'VOLUME', value: totalVolume.toFixed(0) + 'ml' },
    { label: 'ABV', value: abvPercentage.toFixed(1) + '%' },
  ];
  
  specs.forEach((spec, i) => {
    const col = i % 6;
    const x = margin + 5 + (col * badgeSpacing);
    const y = specsY;
    
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
    doc.text(spec.label, x, y);
    
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const valueText = spec.value.length > 12 ? spec.value.substring(0, 12) + '...' : spec.value;
    doc.text(valueText, x, y + 5);
  });
  
  yPos += 36;
  
  // Profiles section - side by side
  const profileWidth = (contentWidth - 4) / 2;
  
  // Taste Profile
  drawModernCard(margin, yPos, profileWidth, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("TASTE PROFILE", margin + 4, yPos + 6);
  
  drawRadarChart(doc, margin + (profileWidth / 2), yPos + 24, 18, recipe.tasteProfile, 'Taste');
  
  // Texture Profile
  drawModernCard(margin + profileWidth + 4, yPos, profileWidth, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("TEXTURE PROFILE", margin + profileWidth + 8, yPos + 6);
  
  drawRadarChart(doc, margin + profileWidth + 4 + (profileWidth / 2), yPos + 24, 18, recipe.textureProfile, 'Texture');
  
  yPos += 46;
  
  // Recipe section - modern visual list
  drawModernCard(margin, yPos, contentWidth, 85, true);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("RECIPE", margin + 5, yPos + 6);
  
  drawAccentLine(margin + 5, yPos + 8, 30, 0.8);
  
  const recipeStartY = yPos + 12;
  let ingredientY = recipeStartY;
  const pdfOpts = recipe.pdfOptions || {};
  
  // Modern ingredient list (no table)
  recipe.ingredients.slice(0, 10).forEach((ing, index) => {
    if (ingredientY > 260) return; // Stop if running out of space
    
    // Ingredient line with visual hierarchy
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(ing.name.toUpperCase(), margin + 7, ingredientY);
    
    // Amount and unit on same line
    const amountText = `${ing.amount}${pdfOpts.showUnit !== false ? ' ' + ing.unit : ''}`;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(accentGold[0], accentGold[1], accentGold[2]);
    doc.text(amountText, margin + 75, ingredientY);
    
    // Type and ABV if enabled
    let metaText = '';
    if (pdfOpts.showType !== false && ing.type) {
      metaText += ing.type;
    }
    if (pdfOpts.showABV !== false && ing.abv) {
      metaText += (metaText ? ' • ' : '') + ing.abv + '%';
    }
    if (metaText) {
      doc.setFontSize(5.5);
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      doc.text(metaText, margin + 110, ingredientY);
    }
    
    // Notes if enabled
    if (pdfOpts.showNotes !== false && ing.notes) {
      doc.setFontSize(5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
      const noteText = ing.notes.length > 45 ? ing.notes.substring(0, 45) + '...' : ing.notes;
      doc.text(noteText, margin + 7, ingredientY + 3);
      ingredientY += 7;
    } else {
      ingredientY += 6;
    }
    
    // Subtle divider
    if (index < recipe.ingredients.length - 1 && ingredientY < 260) {
      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.setLineWidth(0.1);
      doc.line(margin + 7, ingredientY - 1, margin + contentWidth - 7, ingredientY - 1);
    }
  });
  
  yPos += 89;
  
  
  // Method & Notes section - side by side
  const methodWidth = (contentWidth - 4) / 2;
  
  // Method
  drawModernCard(margin, yPos, methodWidth, 40);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
  doc.text("METHOD", margin + 4, yPos + 6);
  
  const methodLines = doc.splitTextToSize(recipe.methodSOP || 'No method specified', methodWidth - 10);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(methodLines.slice(0, 12), margin + 4, yPos + 11);
  
  // Service Notes
  if (recipe.serviceNotes && recipe.serviceNotes.trim()) {
    drawModernCard(margin + methodWidth + 4, yPos, methodWidth, 40);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(accentDeep[0], accentDeep[1], accentDeep[2]);
    doc.text("SERVICE NOTES", margin + methodWidth + 8, yPos + 6);
    
    const notesLines = doc.splitTextToSize(recipe.serviceNotes, methodWidth - 10);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.text(notesLines.slice(0, 12), margin + methodWidth + 8, yPos + 11);
  }
  
  yPos += 44;
  
  // Footer with metrics and allergens
  const footerY = 280;
  doc.setDrawColor(accentGold[0], accentGold[1], accentGold[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  // Metrics badges in footer
  const metricsStartX = margin;
  const metricsY = footerY + 5;
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("RATIO", metricsStartX, metricsY);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(recipe.ratio || '—', metricsStartX, metricsY + 4);
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("pH", metricsStartX + 25, metricsY);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(recipe.ph || '0', metricsStartX + 25, metricsY + 4);
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("BRIX", metricsStartX + 40, metricsY);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(recipe.brix || '0', metricsStartX + 40, metricsY + 4);
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
  doc.text("KCAL", metricsStartX + 60, metricsY);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(estimatedCalories.toString(), metricsStartX + 60, metricsY + 4);
  
  // Allergens
  if (recipe.allergens && recipe.allergens.trim()) {
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(subtleText[0], subtleText[1], subtleText[2]);
    doc.text("ALLERGENS:", metricsStartX + 85, metricsY);
    
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const allergenText = recipe.allergens.length > 50 ? recipe.allergens.substring(0, 50) + '...' : recipe.allergens;
    doc.text(allergenText, metricsStartX + 85, metricsY + 4);
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
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 105, 115);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 5;
    const x = centerX + labelRadius * Math.cos(angle);
    const y = centerY + labelRadius * Math.sin(angle);
    
    const label = labels[i].toUpperCase();
    const textWidth = doc.getTextWidth(label);
    
    let xOffset = -textWidth / 2;
    let yOffset = 1.3;
    
    if (angle > -Math.PI / 4 && angle < Math.PI / 4) xOffset = 1;
    else if (angle > (3 * Math.PI) / 4 || angle < -(3 * Math.PI) / 4) xOffset = -textWidth - 1;
    
    doc.text(label, x + xOffset, y + yOffset);
  }
};
