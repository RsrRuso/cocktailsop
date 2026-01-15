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
import { Slider } from "@/components/ui/slider";
import { Plus, Calendar, FlaskConical, Clock } from "lucide-react";
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
  const [expirationDays, setExpirationDays] = useState(7);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && subRecipe) {
      setQuantityMl(subRecipe.total_yield_ml.toString());
      setExpirationDays(7);
      setNotes("");
    }
  }, [open, subRecipe]);

  const handleSubmit = () => {
    if (!subRecipe || !quantityMl) return;

    const quantity = parseFloat(quantityMl);
    if (isNaN(quantity) || quantity <= 0) {
      return;
    }

    const expirationDate = expirationDays > 0
      ? addDays(new Date(), expirationDays).toISOString()
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

  const expirationPresets = [
    { label: '1d', days: 1 },
    { label: '3d', days: 3 },
    { label: '7d', days: 7 },
    { label: '14d', days: 14 },
    { label: '30d', days: 30 },
  ];

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

          {/* Expiration Days with Slider */}
          <div className="space-y-3">
            <Label className="text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Shelf Life
            </Label>
            
            {/* Quick Select Buttons */}
            <div className="flex gap-1.5 flex-wrap">
              {expirationPresets.map((preset) => (
                <Button
                  key={preset.days}
                  type="button"
                  variant={expirationDays === preset.days ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setExpirationDays(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant={expirationDays === 0 ? "default" : "outline"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setExpirationDays(0)}
              >
                No Exp
              </Button>
            </div>

            {/* Slider for Fine-tuning */}
            <div className="px-1">
              <Slider
                value={[expirationDays]}
                onValueChange={(value) => setExpirationDays(value[0])}
                max={60}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>No expiry</span>
                <span>60 days</span>
              </div>
            </div>

            {/* Expiration Preview */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {expirationDays > 0 ? (
                <span className="text-sm">
                  Expires: <span className="font-medium">{format(addDays(new Date(), expirationDays), 'PPP')}</span>
                  <span className="text-muted-foreground ml-1">({expirationDays} days)</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">No expiration set</span>
              )}
            </div>
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