import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, Plus, Trash2, ExternalLink } from "lucide-react";
import { LOSS_REASONS } from "@/hooks/useBatchProductionLosses";
import { Link } from "react-router-dom";

interface LossEntry {
  id: string;
  ingredient_name: string;
  loss_amount_ml: string;
  loss_reason: string;
  notes: string;
}

interface BatchLossInputProps {
  ingredients: { name: string }[];
  lossEntries: LossEntry[];
  onLossEntriesChange: (entries: LossEntry[]) => void;
}

export function BatchLossInput({ 
  ingredients, 
  lossEntries, 
  onLossEntriesChange 
}: BatchLossInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addLossEntry = () => {
    const newEntry: LossEntry = {
      id: Date.now().toString(),
      ingredient_name: ingredients[0]?.name || "",
      loss_amount_ml: "",
      loss_reason: "spillage",
      notes: "",
    };
    onLossEntriesChange([...lossEntries, newEntry]);
    setIsOpen(true);
  };

  const updateLossEntry = (id: string, field: keyof LossEntry, value: string) => {
    onLossEntriesChange(
      lossEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeLossEntry = (id: string) => {
    onLossEntriesChange(lossEntries.filter((entry) => entry.id !== id));
  };

  const totalLoss = lossEntries.reduce(
    (sum, entry) => sum + (parseFloat(entry.loss_amount_ml) || 0),
    0
  );

  const validIngredients = ingredients.filter((i) => i.name.trim());

  return (
    <div className="space-y-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span>Record Loss/Spillage</span>
            {lossEntries.length > 0 && (
              <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                {lossEntries.length} entries • -{totalLoss.toFixed(0)} ml
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <Link 
            to="/loss-discrepancies" 
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            View All <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <CollapsibleContent className="mt-3 space-y-3">
          {lossEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Loss #{index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => removeLossEntry(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ingredient</Label>
                  <Select
                    value={entry.ingredient_name}
                    onValueChange={(v) => updateLossEntry(entry.id, "ingredient_name", v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      {validIngredients.map((ing) => (
                        <SelectItem key={ing.name} value={ing.name}>
                          {ing.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Loss Amount (ml)</Label>
                  <Input
                    type="number"
                    value={entry.loss_amount_ml}
                    onChange={(e) =>
                      updateLossEntry(entry.id, "loss_amount_ml", e.target.value)
                    }
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <Select
                  value={entry.loss_reason}
                  onValueChange={(v) => updateLossEntry(entry.id, "loss_reason", v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes (Optional)</Label>
                <Textarea
                  value={entry.notes}
                  onChange={(e) => updateLossEntry(entry.id, "notes", e.target.value)}
                  placeholder="Additional details..."
                  className="text-sm h-16 resize-none"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLossEntry}
            className="w-full border-dashed border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
            disabled={validIngredients.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Loss Entry
          </Button>

          {lossEntries.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Losses will be recorded and tracked in the{" "}
              <Link to="/loss-discrepancies" className="text-primary hover:underline">
                Loss Discrepancies
              </Link>{" "}
              page for inventory balancing.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
