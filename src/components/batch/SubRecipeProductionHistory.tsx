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
      
      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Sub-Recipe Production Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.text(recipeName, pageWidth / 2, 30, { align: "center" });
      
      // Production Details
      doc.setFontSize(12);
      let y = 50;
      
      doc.setFont("helvetica", "bold");
      doc.text("Production Details", 20, y);
      y += 10;
      
      doc.setFont("helvetica", "normal");
      doc.text(`Quantity Produced: ${Number(production.quantity_produced_ml).toFixed(0)} ml`, 20, y);
      y += 7;
      doc.text(`Production Date: ${format(new Date(production.production_date), 'PPP')}`, 20, y);
      y += 7;
      doc.text(`Produced By: ${production.produced_by_name || 'Unknown'}`, 20, y);
      y += 7;
      if (production.expiration_date) {
        doc.text(`Expiration Date: ${format(new Date(production.expiration_date), 'PPP')}`, 20, y);
        y += 7;
      }
      
      // Ingredients Used
      if (ingredients.length > 0) {
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Ingredients Used", 20, y);
        y += 10;
        
        doc.setFont("helvetica", "normal");
        ingredients.forEach((ing) => {
          doc.text(`• ${ing.name}: ${ing.amount} ${ing.unit}`, 25, y);
          y += 7;
        });
        
        // Total ingredients
        const totalIngredients = ingredients.reduce((sum, ing) => sum + Number(ing.amount), 0);
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.text(`Total Ingredients: ${totalIngredients.toFixed(0)} ml`, 20, y);
        
        // Loss calculation
        const loss = totalIngredients - Number(production.quantity_produced_ml);
        y += 7;
        if (loss > 0) {
          doc.setTextColor(220, 53, 69); // red
          doc.text(`Production Loss: ${loss.toFixed(0)} ml (${((loss / totalIngredients) * 100).toFixed(1)}%)`, 20, y);
        } else if (loss < 0) {
          doc.setTextColor(40, 167, 69); // green
          doc.text(`Over-production: ${Math.abs(loss).toFixed(0)} ml`, 20, y);
        }
        doc.setTextColor(0, 0, 0);
      }
      
      // Notes
      if (production.notes) {
        y += 15;
        doc.setFont("helvetica", "bold");
        doc.text("Notes", 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(production.notes, pageWidth - 40);
        doc.text(splitNotes, 20, y);
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${format(new Date(), 'PPP pp')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      
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
      
      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Sub-Recipe Production Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(16);
      doc.text(recipeName, pageWidth / 2, 30, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Batches: ${productions.length}`, pageWidth / 2, 38, { align: "center" });
      
      // Summary
      const totalProduced = productions.reduce((sum, p) => sum + Number(p.quantity_produced_ml), 0);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Produced: ${totalProduced.toFixed(0)} ml`, pageWidth / 2, 46, { align: "center" });
      
      let y = 60;
      
      // Production List
      doc.setFontSize(14);
      doc.text("Production History", 20, y);
      y += 10;
      
      doc.setFontSize(10);
      productions.forEach((production, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(`Batch #${index + 1}`, 20, y);
        y += 6;
        
        doc.setFont("helvetica", "normal");
        doc.text(`Quantity: ${Number(production.quantity_produced_ml).toFixed(0)} ml`, 25, y);
        y += 5;
        doc.text(`Date: ${format(new Date(production.production_date), 'PPP')}`, 25, y);
        y += 5;
        doc.text(`By: ${production.produced_by_name || 'Unknown'}`, 25, y);
        y += 5;
        if (production.expiration_date) {
          doc.text(`Expires: ${format(new Date(production.expiration_date), 'PPP')}`, 25, y);
          y += 5;
        }
        if (production.notes) {
          doc.text(`Notes: ${production.notes}`, 25, y);
          y += 5;
        }
        y += 5;
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${format(new Date(), 'PPP pp')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      
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