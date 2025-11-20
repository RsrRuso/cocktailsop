import { CocktailRecipe } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (recipe: CocktailRecipe) => {
  const doc = new jsPDF();
  
  // Modern header design
  doc.setFillColor(45, 55, 72);
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("COCKTAIL SOP", 15, 12);
  
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(recipe.drinkName.toUpperCase() || "UNTITLED", 15, 25);
  
  let yPos = 45;
  
  // Calculate metrics
  const totalVolume = recipe.ingredients.reduce(
    (sum, ing) => sum + (parseFloat(ing.amount) || 0),
    0
  );
  const pureAlcohol = recipe.ingredients.reduce(
    (sum, ing) =>
      sum + (parseFloat(ing.amount) || 0) * ((parseFloat(ing.abv) || 0) / 100),
    0
  );
  const abvPercentage = totalVolume > 0 ? (pureAlcohol / totalVolume) * 100 : 0;
  const estimatedCalories = Math.round(pureAlcohol * 7 + totalVolume * 0.5);
  
  // Identity & Metrics
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Identity & Metrics", 15, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Property', 'Value']],
    body: [
      ['Drink Name', recipe.drinkName || '-'],
      ['Technique', recipe.technique || '-'],
      ['Glass', recipe.glass || '-'],
      ['Ice', recipe.ice || '-'],
      ['Garnish', recipe.garnish || '-'],
      ['Total Volume', `${totalVolume.toFixed(0)} ml`],
      ['ABV', `${abvPercentage.toFixed(1)}%`],
      ['Calories', `${estimatedCalories} kcal`],
      ...(recipe.ratio ? [['Ratio', recipe.ratio]] : []),
      ...(recipe.ph && parseFloat(recipe.ph) > 0 ? [['pH', parseFloat(recipe.ph).toFixed(1)]] : []),
      ...(recipe.brix && parseFloat(recipe.brix) > 0 ? [['Brix', parseFloat(recipe.brix).toFixed(1)]] : []),
    ],
    theme: 'striped',
    headStyles: { 
      fillColor: [59, 130, 246],
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 130 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // Method Section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text("Method (SOP)", 15, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const methodLines = doc.splitTextToSize(recipe.methodSOP || "No method provided", 180);
  doc.text(methodLines, 15, yPos);
  yPos += methodLines.length * 5 + 10;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  // Service Notes
  if (recipe.serviceNotes) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("Service Notes", 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const notesLines = doc.splitTextToSize(recipe.serviceNotes, 180);
    doc.text(notesLines, 15, yPos);
    yPos += notesLines.length * 5 + 10;
  }
  
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }
  
  // Taste Profile
  if (Object.values(recipe.tasteProfile).some(v => v > 0)) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("Taste Profile", 15, yPos);
    yPos += 8;
    
    Object.entries(recipe.tasteProfile).filter(([_, val]) => val > 0).forEach(([key, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(key.charAt(0).toUpperCase() + key.slice(1), 20, yPos);
      
      doc.setFillColor(200, 200, 200);
      doc.rect(60, yPos - 3, 100, 5, 'F');
      doc.setFillColor(59, 130, 246);
      doc.rect(60, yPos - 3, (value / 10) * 100, 5, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${value}/10`, 165, yPos);
      
      yPos += 8;
    });
    yPos += 5;
  }
  
  // Texture Profile
  if (Object.values(recipe.textureProfile).some(v => v > 0)) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246);
    doc.text("Texture Profile", 15, yPos);
    yPos += 8;
    
    Object.entries(recipe.textureProfile).filter(([_, val]) => val > 0).forEach(([key, value]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(key.charAt(0).toUpperCase() + key.slice(1), 20, yPos);
      
      doc.setFillColor(200, 200, 200);
      doc.rect(60, yPos - 3, 100, 5, 'F');
      doc.setFillColor(236, 72, 153);
      doc.rect(60, yPos - 3, (value / 10) * 100, 5, 'F');
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`${value}/10`, 165, yPos);
      
      yPos += 8;
    });
    yPos += 5;
  }
  
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // Recipe ingredients
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text("Recipe", 15, yPos);
  yPos += 7;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Ingredient', 'Amount', 'Type', 'ABV', 'Notes']],
    body: recipe.ingredients.map(ing => [
      ing.name || '-',
      `${ing.amount} ${ing.unit}`,
      ing.type || '-',
      ing.abv ? `${ing.abv}%` : '-',
      ing.notes || '-'
    ]),
    theme: 'striped',
    headStyles: { 
      fillColor: [59, 130, 246],
      fontSize: 9,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 60, fontSize: 8 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Allergens
  if (recipe.allergens) {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(254, 226, 226);
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setTextColor(220, 38, 38);
    doc.text("⚠ ALLERGENS", 20, yPos);
    yPos += 2;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(127, 29, 29);
    doc.text(recipe.allergens, 20, yPos + 5);
  }
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleDateString()}`,
      105,
      290,
      { align: 'center' }
    );
  }
  
  const fileName = `${recipe.drinkName.replace(/[^a-z0-9]/gi, '_')}_SOP.pdf`;
  doc.save(fileName);
};
