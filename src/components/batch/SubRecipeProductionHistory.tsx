import React from "react";
import { format, isPast, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, User, Calendar, AlertTriangle } from "lucide-react";
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

interface SubRecipeProductionHistoryProps {
  productions: SubRecipeProduction[];
  onDelete: (id: string) => void;
}

export const SubRecipeProductionHistory = ({
  productions,
  onDelete,
}: SubRecipeProductionHistoryProps) => {
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

  return (
    <div className="space-y-2">
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
    </div>
  );
};
