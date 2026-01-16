import React, { useState } from "react";
import { format, isPast, differenceInDays, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Trash2, Clock, User, Calendar, AlertTriangle, Edit2, Download, FileText } from "lucide-react";
import { SubRecipeProduction } from "@/hooks/useSubRecipeProductions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface SubRecipeProductionHistoryProps {
  productions: SubRecipeProduction[];
  recipeName: string;
  ingredients?: { name: string; amount: number; unit: string }[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: { quantity_produced_ml: number; expiration_date?: string; notes?: string }) => void;
}

export const SubRecipeProductionHistory = ({
  productions,
  recipeName,
  ingredients = [],
  onDelete,
  onUpdate,
}: SubRecipeProductionHistoryProps) => {
  const [editingProduction, setEditingProduction] = useState<SubRecipeProduction | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editExpirationDays, setEditExpirationDays] = useState(7);
  const [editNotes, setEditNotes] = useState("");

  if (!productions || productions.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No production batches recorded yet
      </div>
    );
  }

  const getExpirationBadge = (expDate?: string) => {
    if (!expDate) return null;
    
    const exp = new Date(expDate);
    const now = new Date();
    const daysUntil = differenceInDays(exp, now);
    
    if (isPast(exp)) {
      return (
        <Badge variant="destructive" className="text-[10px] gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    
    if (daysUntil <= 3) {
      return (
        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] gap-1">
          <Clock className="h-3 w-3" />
          {daysUntil === 0 ? 'Today' : `${daysUntil}d left`}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        <Clock className="h-3 w-3" />
        {daysUntil}d left
      </Badge>
    );
  };

  const handleOpenEdit = (production: SubRecipeProduction) => {
    setEditingProduction(production);
    setEditQuantity(String(production.quantity_produced_ml));
    if (production.expiration_date) {
      const daysUntil = differenceInDays(new Date(production.expiration_date), new Date());
      setEditExpirationDays(Math.max(0, daysUntil));
    } else {
      setEditExpirationDays(0);
    }
    setEditNotes(production.notes || "");
  };

  const handleSaveEdit = () => {
    if (!editingProduction || !onUpdate) return;
    
    const quantity = parseFloat(editQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    onUpdate(editingProduction.id, {
      quantity_produced_ml: quantity,
      expiration_date: editExpirationDays > 0 ? addDays(new Date(), editExpirationDays).toISOString() : undefined,
      notes: editNotes || undefined,
    });
    
    setEditingProduction(null);
  };

  const downloadProductionPDF = (production: SubRecipeProduction) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors
      const primaryColor = [212, 175, 55] as [number, number, number]; // Gold
      const darkColor = [30, 30, 30] as [number, number, number];
      const grayColor = [100, 100, 100] as [number, number, number];
      const lightGray = [245, 245, 245] as [number, number, number];
      const successColor = [34, 197, 94] as [number, number, number];
      const dangerColor = [239, 68, 68] as [number, number, number];
      
      // Header Background
      doc.setFillColor(...darkColor);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Gold accent line
      doc.setFillColor(...primaryColor);
      doc.rect(0, 45, pageWidth, 3, 'F');
      
      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PRODUCTION REPORT", pageWidth / 2, 22, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...primaryColor);
      doc.text(recipeName.toUpperCase(), pageWidth / 2, 35, { align: "center" });
      
      // Production Summary Card
      let y = 60;
      
      // Card background
      doc.setFillColor(...lightGray);
      doc.roundedRect(15, y - 5, pageWidth - 30, 50, 3, 3, 'F');
      
      // Card border
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, y - 5, pageWidth - 30, 50, 3, 3, 'S');
      
      doc.setTextColor(...darkColor);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("PRODUCTION DETAILS", 25, y + 5);
      
      // Details in two columns
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...grayColor);
      
      y += 15;
      doc.text("Quantity Produced:", 25, y);
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "bold");
      doc.text(`${Number(production.quantity_produced_ml).toFixed(0)} ml`, 75, y);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);
      doc.text("Producer:", 120, y);
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "bold");
      doc.text(production.produced_by_name || 'Unknown', 150, y);
      
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayColor);
      doc.text("Production Date:", 25, y);
      doc.setTextColor(...darkColor);
      doc.setFont("helvetica", "bold");
      doc.text(format(new Date(production.production_date), 'MMMM do, yyyy'), 75, y);
      
      if (production.expiration_date) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...grayColor);
        doc.text("Expires:", 120, y);
        doc.setTextColor(...darkColor);
        doc.setFont("helvetica", "bold");
        doc.text(format(new Date(production.expiration_date), 'MMMM do, yyyy'), 150, y);
      }
      
      // Ingredients Table
      if (ingredients.length > 0) {
        y = 125;
        
        // Section title
        doc.setFillColor(...primaryColor);
        doc.rect(15, y - 5, 4, 15, 'F');
        doc.setTextColor(...darkColor);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("INGREDIENTS USED", 25, y + 5);
        
        y += 20;
        
        // Table header
        doc.setFillColor(...darkColor);
        doc.rect(15, y - 5, pageWidth - 30, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("INGREDIENT", 20, y + 2);
        doc.text("AMOUNT", pageWidth - 50, y + 2, { align: "right" });
        
        y += 12;
        
        // Table rows
        doc.setTextColor(...darkColor);
        doc.setFont("helvetica", "normal");
        
        ingredients.forEach((ing, idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, y - 4, pageWidth - 30, 8, 'F');
          }
          doc.text(`${ing.name}`, 20, y + 1);
          doc.text(`${ing.amount} ${ing.unit}`, pageWidth - 50, y + 1, { align: "right" });
          y += 8;
        });
        
        // Total row
        const totalIngredients = ingredients.reduce((sum, ing) => sum + Number(ing.amount), 0);
        doc.setFillColor(...primaryColor);
        doc.rect(15, y, pageWidth - 30, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL", 20, y + 6);
        doc.text(`${totalIngredients.toFixed(0)} ml`, pageWidth - 50, y + 6, { align: "right" });
        
        // Loss/Gain indicator
        const loss = totalIngredients - Number(production.quantity_produced_ml);
        y += 18;
        
        if (loss !== 0) {
          const isLoss = loss > 0;
          doc.setFillColor(isLoss ? 254 : 240, isLoss ? 242 : 253, isLoss ? 242 : 244);
          doc.roundedRect(15, y, pageWidth - 30, 20, 3, 3, 'F');
          
          doc.setDrawColor(...(isLoss ? dangerColor : successColor));
          doc.setLineWidth(0.5);
          doc.roundedRect(15, y, pageWidth - 30, 20, 3, 3, 'S');
          
          doc.setTextColor(...(isLoss ? dangerColor : successColor));
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          
          const lossText = isLoss 
            ? `⚠ PRODUCTION LOSS: ${loss.toFixed(0)} ml (${((loss / totalIngredients) * 100).toFixed(1)}%)`
            : `✓ OVER-PRODUCTION: +${Math.abs(loss).toFixed(0)} ml`;
          doc.text(lossText, pageWidth / 2, y + 12, { align: "center" });
        }
      }
      
      // Notes section
      if (production.notes) {
        y = y + 35;
        doc.setFillColor(...primaryColor);
        doc.rect(15, y - 5, 4, 15, 'F');
        doc.setTextColor(...darkColor);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("NOTES", 25, y + 5);
        
        y += 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...grayColor);
        const splitNotes = doc.splitTextToSize(production.notes, pageWidth - 40);
        doc.text(splitNotes, 20, y);
      }
      
      // Footer
      doc.setFillColor(...darkColor);
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${format(new Date(), 'MMMM do, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      
      doc.setTextColor(...primaryColor);
      doc.text("SpecVerse", pageWidth - 20, pageHeight - 10, { align: "right" });
      
      doc.save(`${recipeName.replace(/\s+/g, '_')}_Production_${format(new Date(production.production_date), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const downloadAllProductionsPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Colors
      const primaryColor = [212, 175, 55] as [number, number, number]; // Gold
      const darkColor = [30, 30, 30] as [number, number, number];
      const grayColor = [100, 100, 100] as [number, number, number];
      const lightGray = [245, 245, 245] as [number, number, number];
      
      // Header Background
      doc.setFillColor(...darkColor);
      doc.rect(0, 0, pageWidth, 55, 'F');
      
      // Gold accent line
      doc.setFillColor(...primaryColor);
      doc.rect(0, 55, pageWidth, 3, 'F');
      
      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("FULL PRODUCTION REPORT", pageWidth / 2, 22, { align: "center" });
      
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.text(recipeName.toUpperCase(), pageWidth / 2, 35, { align: "center" });
      
      // Summary stats
      const totalProduced = productions.reduce((sum, p) => sum + Number(p.quantity_produced_ml), 0);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.setFont("helvetica", "normal");
      doc.text(`${productions.length} Batches  •  ${totalProduced.toFixed(0)} ml Total`, pageWidth / 2, 47, { align: "center" });
      
      let y = 70;
      
      // Table header
      doc.setFillColor(...darkColor);
      doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("#", 20, y + 3);
      doc.text("DATE", 35, y + 3);
      doc.text("QUANTITY", 85, y + 3);
      doc.text("PRODUCER", 120, y + 3);
      doc.text("EXPIRES", 165, y + 3);
      
      y += 14;
      
      // Table rows
      productions.forEach((production, index) => {
        if (y > pageHeight - 40) {
          // Add footer before new page
          doc.setFillColor(...darkColor);
          doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
          doc.setFontSize(8);
          doc.setTextColor(...primaryColor);
          doc.text("SpecVerse", pageWidth - 20, pageHeight - 6, { align: "right" });
          
          doc.addPage();
          y = 25;
          
          // Repeat table header on new page
          doc.setFillColor(...darkColor);
          doc.rect(15, y - 5, pageWidth - 30, 12, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("#", 20, y + 3);
          doc.text("DATE", 35, y + 3);
          doc.text("QUANTITY", 85, y + 3);
          doc.text("PRODUCER", 120, y + 3);
          doc.text("EXPIRES", 165, y + 3);
          y += 14;
        }
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(...lightGray);
          doc.rect(15, y - 4, pageWidth - 30, 10, 'F');
        }
        
        doc.setTextColor(...darkColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        
        doc.text(`${index + 1}`, 20, y + 2);
        doc.text(format(new Date(production.production_date), 'MMM dd, yyyy'), 35, y + 2);
        doc.setFont("helvetica", "bold");
        doc.text(`${Number(production.quantity_produced_ml).toFixed(0)} ml`, 85, y + 2);
        doc.setFont("helvetica", "normal");
        doc.text(production.produced_by_name || 'Unknown', 120, y + 2);
        doc.text(production.expiration_date ? format(new Date(production.expiration_date), 'MMM dd') : '-', 165, y + 2);
        
        y += 10;
      });
      
      // Summary box at bottom
      y += 10;
      doc.setFillColor(...primaryColor);
      doc.roundedRect(15, y, pageWidth - 30, 25, 3, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL PRODUCTION", 25, y + 10);
      doc.setFontSize(16);
      doc.text(`${totalProduced.toFixed(0)} ml`, pageWidth - 25, y + 16, { align: "right" });
      
      // Footer
      doc.setFillColor(...darkColor);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${format(new Date(), 'MMMM do, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, pageHeight - 6, { align: "center" });
      
      doc.setTextColor(...primaryColor);
      doc.text("SpecVerse", pageWidth - 20, pageHeight - 6, { align: "right" });
      
      doc.save(`${recipeName.replace(/\s+/g, '_')}_All_Productions_Report.pdf`);
      toast.success("Full report downloaded!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const expirationPresets = [
    { label: '1d', days: 1 },
    { label: '3d', days: 3 },
    { label: '7d', days: 7 },
    { label: '14d', days: 14 },
    { label: '30d', days: 30 },
  ];

  return (
    <div className="space-y-3">
      {/* Download All Button */}
      {productions.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={downloadAllProductionsPDF}
        >
          <FileText className="h-4 w-4" />
          Download Full Report ({productions.length} batches)
        </Button>
      )}

      {productions.map((production) => (
        <div
          key={production.id}
          className="bg-muted/30 rounded-lg p-3 space-y-2"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-primary">
                +{Number(production.quantity_produced_ml).toFixed(0)}ml
              </span>
              {getExpirationBadge(production.expiration_date)}
            </div>
            
            <div className="flex items-center gap-1">
              {/* Download PDF */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => downloadProductionPDF(production)}
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              
              {/* Edit */}
              {onUpdate && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => handleOpenEdit(production)}
                >
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              
              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Production Batch?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {Number(production.quantity_produced_ml).toFixed(0)}ml from your total stock.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(production.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Details Row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {production.produced_by_name || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(production.production_date), 'MMM d, yyyy')}
            </span>
            {production.expiration_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Exp: {format(new Date(production.expiration_date), 'MMM d')}
              </span>
            )}
          </div>

          {/* Notes */}
          {production.notes && (
            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {production.notes}
            </p>
          )}
        </div>
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editingProduction} onOpenChange={(open) => !open && setEditingProduction(null)}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Production Batch</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantity Produced (ml)</Label>
              <Input
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
              <Label>Shelf Life</Label>
              <div className="flex gap-1.5 flex-wrap">
                {expirationPresets.map((preset) => (
                  <Button
                    key={preset.days}
                    type="button"
                    variant={editExpirationDays === preset.days ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setEditExpirationDays(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={editExpirationDays === 0 ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setEditExpirationDays(0)}
                >
                  No Exp
                </Button>
              </div>
              <Slider
                value={[editExpirationDays]}
                onValueChange={(value) => setEditExpirationDays(value[0])}
                max={60}
                min={0}
                step={1}
              />
              {editExpirationDays > 0 && (
                <p className="text-xs text-muted-foreground">
                  Expires: {format(addDays(new Date(), editExpirationDays), 'PPP')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Production notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduction(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};