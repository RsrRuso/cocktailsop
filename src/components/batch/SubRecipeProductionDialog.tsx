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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  
  const [expectedYield, setExpectedYield] = useState("");
  const [quantityMl, setQuantityMl] = useState("");
  const [expirationDays, setExpirationDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total ingredients amount (for display only)
  const totalIngredientsMl = useMemo(() => {
    if (!subRecipe?.ingredients) return 0;
    return subRecipe.ingredients.reduce((sum, ing) => {
      const amount = Number(ing.amount) || 0;
      return sum + amount;
    }, 0);
  }, [subRecipe]);

  // Calculate loss/gain based on actual yield vs manually entered expected yield
  const expectedYieldNum = parseFloat(expectedYield) || 0;
  const actualYieldNum = parseFloat(quantityMl) || 0;
  
  const lossAmount = useMemo(() => {
    if (actualYieldNum <= 0 || expectedYieldNum <= 0) return 0;
    return expectedYieldNum - actualYieldNum;
  }, [expectedYieldNum, actualYieldNum]);

  const hasLoss = lossAmount > 0;
  const hasGain = lossAmount < 0;

  useEffect(() => {
    if (open && subRecipe) {
      setExpectedYield("");
      setQuantityMl("");
      setExpirationDays(7);
      setNotes("");
    }
  }, [open, subRecipe]);

  const handleSubmit = async () => {
    if (!subRecipe || !quantityMl || isSubmitting) return;

    const quantity = parseFloat(quantityMl);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        setIsSubmitting(false);
        return;
      }

      // Get producer name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .maybeSingle();
      
      const producerName = profile?.full_name || profile?.username || user.email?.split('@')[0] || 'Unknown';

      const expirationDate = expirationDays > 0
        ? addDays(new Date(), expirationDays).toISOString()
        : null;

      // Create the production
      const { data: productionData, error: productionError } = await supabase
        .from('sub_recipe_productions')
        .insert({
          sub_recipe_id: subRecipe.id,
          quantity_produced_ml: quantity,
          produced_by_user_id: user.id,
          produced_by_name: producerName,
          production_date: new Date().toISOString(),
          expiration_date: expirationDate,
          notes: notes || null,
          group_id: groupId || null,
        })
        .select()
        .single();

      if (productionError) throw productionError;

      // If there was a loss, record it for EACH INGREDIENT proportionally
      if (hasLoss && lossAmount > 0 && subRecipe.ingredients.length > 0) {
        const lossRecords = subRecipe.ingredients.map((ing) => {
          const ingredientAmount = Number(ing.amount) || 0;
          const ratio = ingredientAmount / totalIngredientsMl;
          const ingredientLoss = lossAmount * ratio;
          
          return {
            production_id: null,
            sub_recipe_production_id: productionData.id,
            ingredient_name: ing.name,
            sub_recipe_name: subRecipe.name,
            loss_amount_ml: Math.round(ingredientLoss * 100) / 100, // Round to 2 decimals
            loss_reason: 'production_loss',
            expected_yield_ml: expectedYieldNum * ratio,
            actual_yield_ml: (expectedYieldNum * ratio) - ingredientLoss,
            recorded_by_user_id: user.id,
            recorded_by_name: producerName,
            notes: `Auto-calculated: ${(ratio * 100).toFixed(1)}% of ${lossAmount.toFixed(0)}ml total loss from ${subRecipe.name} production`,
          };
        });

        const { error: lossError } = await supabase
          .from('batch_production_losses')
          .insert(lossRecords);

        if (lossError) {
          console.error("Failed to record losses:", lossError);
          toast.warning("Production saved but loss tracking failed");
        } else {
          toast.success(`Production recorded with ${lossRecords.length} ingredient losses tracked`);
        }
      } else {
        toast.success("Production batch recorded!");
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sub-recipe-productions'] });
      queryClient.invalidateQueries({ queryKey: ['all-batch-production-losses'] });
      queryClient.invalidateQueries({ queryKey: ['batch-production-losses'] });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Production error:", error);
      toast.error("Failed to record production: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
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

          {/* Expected Yield Input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Expected Yield (ml) *</Label>
            <Input
              type="number"
              placeholder="Enter expected yield"
              value={expectedYield}
              onChange={(e) => setExpectedYield(e.target.value)}
              className="h-10 text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter what you expect to produce from this batch
            </p>
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
          {(hasLoss || hasGain) && actualYieldNum > 0 && expectedYieldNum > 0 && (
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
            disabled={!quantityMl || actualYieldNum <= 0 || !expectedYield || expectedYieldNum <= 0 || isSubmitting}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {isSubmitting ? "Recording..." : "Record Production"}
            {hasLoss && !isSubmitting && <span className="ml-1 text-xs opacity-80">+ Loss</span>}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
