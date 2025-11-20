import { CocktailRecipe } from "@/types/cocktail-recipe";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = (recipe: CocktailRecipe) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("COCKTAIL SOP", 15, 15);
  
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text(recipe.drinkName.toUpperCase() || "UNTITLED", 15, 25);
  
  let yPos = 35;
  
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
  
  // Identity & Metrics Table
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
      ['Ratio', recipe.ratio || '-'],
      ['pH', recipe.ph || '-'],
      ['Brix', recipe.brix || '-'],
      ['Kcal', estimatedCalories.toString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 130 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Method Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Method (SOP)", 15, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  const methodLines = doc.splitTextToSize(recipe.methodSOP || "No method provided", 180);
  doc.text(methodLines, 15, yPos);
  yPos += methodLines.length * 5 + 10;
  
  // Service Notes
  if (recipe.serviceNotes) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Service Notes", 15, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    const notesLines = doc.splitTextToSize(recipe.serviceNotes, 180);
    doc.text(notesLines, 15, yPos);
    yPos += notesLines.length * 5 + 10;
  }
  
  // Check if new page needed
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  // Taste Profile
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Taste Profile", 15, yPos);
  yPos += 7;
  
  const tasteData = [
    ['Sweet', recipe.tasteProfile.sweet],
    ['Sour', recipe.tasteProfile.sour],
    ['Salty', recipe.tasteProfile.salty],
    ['Umami', recipe.tasteProfile.umami],
    ['Bitter', recipe.tasteProfile.bitter],
  ];
  
  autoTable(doc, {
    startY: yPos,
    body: tasteData,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 20 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Texture Profile
  if (Object.values(recipe.textureProfile).some(v => v > 0)) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Texture Profile", 15, yPos);
    yPos += 7;
    
    const textureData = [
      ['Body', recipe.textureProfile.body],
      ['Foam', recipe.textureProfile.foam],
      ['Bubbles', recipe.textureProfile.bubbles],
      ['Oiliness', recipe.textureProfile.oiliness],
      ['Creaminess', recipe.textureProfile.creaminess],
      ['Astringency', recipe.textureProfile.astringency],
    ];
    
    autoTable(doc, {
      startY: yPos,
      body: textureData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 20 }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Check if new page needed
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // Recipe Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Recipe", 15, yPos);
  yPos += 7;
  
  const recipeTableData = recipe.ingredients.map(ing => [
    ing.name || '-',
    ing.amount || '-',
    ing.unit || '-',
    ing.type || '-',
    ing.abv || '-',
    ing.notes || '-'
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Ingredient', 'Amount', 'Unit', 'Type', '%ABV', 'Notes']],
    body: recipeTableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20 },
      2: { cellWidth: 15 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 60 }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Allergens
  if (recipe.allergens) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Allergens", 15, yPos);
    yPos += 7;
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(recipe.allergens, 15, yPos);
  }
  
  // Save PDF
  const fileName = `${recipe.drinkName.replace(/[^a-z0-9]/gi, '_')}_SOP.pdf`;
  doc.save(fileName);
};
