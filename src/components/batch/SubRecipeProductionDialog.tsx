import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, FlaskConical } from "lucide-react";
import { format, addDays } from "date-fns";
import { SubRecipe } from "@/hooks/useSubRecipes";
import { useSubRecipeProductions } from "@/hooks/useSubRecipeProductions";

interface SubRecipeProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subRecipe: SubRecipe | null;
  groupId?: string | null;
}

export const SubRecipeProductionDialog = ({
  open,
  onOpenChange,
  subRecipe,
  groupId,
}: SubRecipeProductionDialogProps) => {
  const { createProduction } = useSubRecipeProductions();
  
  const [quantityMl, setQuantityMl] = useState("");
  const [expirationDays, setExpirationDays] = useState("7");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && subRecipe) {
      setQuantityMl(subRecipe.total_yield_ml.toString());
      setExpirationDays("7");
      setNotes("");
    }
  }, [open, subRecipe]);

  const handleSubmit = () => {
    if (!subRecipe || !quantityMl) return;

    const quantity = parseFloat(quantityMl);
    if (isNaN(quantity) || quantity <= 0) {
      return;
    }

    const expirationDate = expirationDays 
      ? addDays(new Date(), parseInt(expirationDays)).toISOString()
      : undefined;

    createProduction({
      sub_recipe_id: subRecipe.id,
      quantity_produced_ml: quantity,
      production_date: new Date().toISOString(),
      expiration_date: expirationDate,
      notes: notes || undefined,
      group_id: groupId || undefined,
    });

    onOpenChange(false);
  };

  if (!subRecipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Record Production
          </DialogTitle>
          <DialogDescription className="text-sm">
            Add a new batch of <span className="font-medium">{subRecipe.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quantity Produced */}
          <div className="space-y-1.5">
            <Label className="text-sm">Quantity Produced (ml) *</Label>
            <Input
              type="number"
              placeholder="e.g., 1000"
              value={quantityMl}
              onChange={(e) => setQuantityMl(e.target.value)}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Recipe yields {subRecipe.total_yield_ml}ml per batch
            </p>
          </div>

          {/* Expiration Days */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Expires In (days)
            </Label>
            <Input
              type="number"
              placeholder="e.g., 7"
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
              className="h-10"
            />
            {expirationDays && parseInt(expirationDays) > 0 && (
              <p className="text-xs text-muted-foreground">
                Expires on {format(addDays(new Date(), parseInt(expirationDays)), 'PPP')}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm">Notes (optional)</Label>
            <Textarea
              placeholder="Any notes about this batch..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            className="w-full sm:w-auto order-1 sm:order-2"
            disabled={!quantityMl || parseFloat(quantityMl) <= 0}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Record Production
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
