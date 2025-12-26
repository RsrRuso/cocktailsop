import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";

export interface PrepStep {
  id: string;
  step_number: number;
  description: string;
}

interface PrepStepsEditorProps {
  steps: PrepStep[];
  onStepsChange: (steps: PrepStep[]) => void;
  className?: string;
}

export const PrepStepsEditor: React.FC<PrepStepsEditorProps> = ({
  steps,
  onStepsChange,
  className = "",
}) => {
  const addStep = () => {
    const newStep: PrepStep = {
      id: Date.now().toString(),
      step_number: steps.length + 1,
      description: "",
    };
    onStepsChange([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    const filtered = steps.filter((s) => s.id !== id);
    // Re-number steps
    const renumbered = filtered.map((s, idx) => ({
      ...s,
      step_number: idx + 1,
    }));
    onStepsChange(renumbered);
  };

  const updateStep = (id: string, description: string) => {
    onStepsChange(
      steps.map((s) => (s.id === id ? { ...s, description } : s))
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Preparation Steps</Label>
        <Button variant="outline" size="sm" onClick={addStep}>
          <Plus className="h-3 w-3 mr-1" />
          Add Step
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          No preparation steps added. Click "Add Step" to begin.
        </p>
      )}

      {steps.map((step, index) => (
        <div
          key={step.id}
          className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg"
        >
          <div className="flex items-center gap-1 shrink-0 pt-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {step.step_number}
            </span>
          </div>
          <div className="flex-1">
            <Textarea
              placeholder={`Describe step ${step.step_number}...`}
              value={step.description}
              onChange={(e) => updateStep(step.id, e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => removeStep(step.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
};

interface PrepStepsDisplayProps {
  steps: PrepStep[];
  ratio?: number;
  className?: string;
}

export const PrepStepsDisplay: React.FC<PrepStepsDisplayProps> = ({
  steps,
  ratio = 1,
  className = "",
}) => {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">
        Preparation Steps ({steps.length}):
      </span>
      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex gap-2 items-start text-xs sm:text-sm"
          >
            <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              {step.step_number}
            </span>
            <p className="text-muted-foreground flex-1">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
