import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { Plus, Calendar, FlaskConical, Clock, AlertTriangle, Beaker, TrendingDown, ExternalLink } from "lucide-react";
import { format, addDays } from "date-fns";
import { SubRecipe } from "@/hooks/useSubRecipes";
import { useSubRecipeProductions } from "@/hooks/useSubRecipeProductions";
import { useBatchProductionLosses } from "@/hooks/useBatchProductionLosses";
import { cn } from "@/lib/utils";

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
  const { recordLoss } = useBatchProductionLosses();
  
  const [quantityMl, setQuantityMl] = useState("");
  const [expirationDays, setExpirationDays] = useState(7);
  const [notes, setNotes] = useState("");

  // Calculate total ingredients amount
  const totalIngredientsMl = useMemo(() => {
    if (!subRecipe?.ingredients) return 0;
    return subRecipe.ingredients.reduce((sum, ing) => {
      // Convert to ml if needed (assume ml for now)
      const amount = Number(ing.amount) || 0;
      return sum + amount;
    }, 0);
  }, [subRecipe]);

  // Expected yield = total ingredients (what goes in should come out)
  const expectedYield = totalIngredientsMl;

  // Calculate loss/gain based on actual yield vs total ingredients
  const lossAmount = useMemo(() => {
    const actualYield = parseFloat(quantityMl) || 0;
    if (actualYield <= 0 || totalIngredientsMl <= 0) return 0;
    // Loss = Total Ingredients - Actual Yield
    // If positive = loss, if negative = gain (over-produced)
    return totalIngredientsMl - actualYield;
  }, [quantityMl, totalIngredientsMl]);

  const hasLoss = lossAmount > 0;
  const hasGain = lossAmount < 0;

  useEffect(() => {
    if (open && subRecipe) {
      // Clear quantity so user must enter actual yield
      setQuantityMl("");
      setExpirationDays(7);
      setNotes("");
    }
  }, [open, subRecipe]);

  const handleSubmit = async () => {
    if (!subRecipe || !quantityMl) return;

    const quantity = parseFloat(quantityMl);
    if (isNaN(quantity) || quantity <= 0) {
      return;
    }

    const expirationDate = expirationDays > 0
      ? addDays(new Date(), expirationDays).toISOString()
      : undefined;

    // First create the production
    createProduction(
      {
        sub_recipe_id: subRecipe.id,
        quantity_produced_ml: quantity,
        production_date: new Date().toISOString(),
        expiration_date: expirationDate,
        notes: notes || undefined,
        group_id: groupId || undefined,
      },
      {
        onSuccess: (data) => {
          // If there was a loss, record it automatically
          if (hasLoss && lossAmount > 0) {
            recordLoss({
              production_id: null as any, // Not a batch production
              sub_recipe_production_id: data.id,
              ingredient_name: subRecipe.name,
              sub_recipe_name: subRecipe.name,
              loss_amount_ml: lossAmount,
              loss_reason: 'production_loss',
              expected_yield_ml: expectedYield,
              actual_yield_ml: quantity,
              notes: `Auto-recorded: Expected ${expectedYield}ml, produced ${quantity}ml. Difference: ${lossAmount}ml loss.`,
            });
          }
        }
      }
    );

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
      <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
          {/* Ingredients Summary */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Beaker className="h-4 w-4 text-primary" />
              Ingredients Used
            </div>
            <div className="space-y-1 text-sm">
              {subRecipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex justify-between text-muted-foreground">
                  <span>{ing.name}</span>
                  <span className="font-mono">{ing.amount} {ing.unit}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-1 mt-1 font-medium">
                <span>Total Ingredients</span>
                <span className="text-primary font-mono">{totalIngredientsMl.toFixed(0)} ml</span>
              </div>
            </div>
          </div>

          {/* Expected Yield Display */}
          <div className="flex justify-between items-center p-2 bg-card border rounded-lg">
            <span className="text-sm text-muted-foreground">Expected Yield</span>
            <span className="font-medium text-primary">{expectedYield} ml</span>
          </div>

          {/* Actual Yield Input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Actual Yield (ml) *</Label>
            <Input
              type="number"
              placeholder="e.g., 1000"
              value={quantityMl}
              onChange={(e) => setQuantityMl(e.target.value)}
              className="h-10 text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter the actual amount produced after all processing
            </p>
          </div>

          {/* Loss/Gain Indicator */}
          {(hasLoss || hasGain) && parseFloat(quantityMl) > 0 && (
            <div className={cn(
              "p-3 rounded-lg flex items-center gap-3",
              hasLoss ? "bg-destructive/10 border border-destructive/30" : "bg-green-500/10 border border-green-500/30"
            )}>
              {hasLoss ? (
                <>
                  <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-destructive">
                      {lossAmount.toFixed(1)} ml Loss
                    </div>
                    <Link 
                      to="/loss-discrepancies" 
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View Loss Tracking <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-green-500">
                      {Math.abs(lossAmount).toFixed(1)} ml Over-produced
                    </div>
                    <p className="text-xs text-muted-foreground">
                      More yield than expected recipe output
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

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
            {hasLoss && <span className="ml-1 text-xs opacity-80">+ Loss</span>}
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
