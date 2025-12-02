import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GitBranch } from "lucide-react";

interface Condition {
  id: string;
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: string;
}

interface ConditionalLogicBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export const ConditionalLogicBuilder = ({ conditions, onChange }: ConditionalLogicBuilderProps) => {
  const addCondition = () => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      field: "",
      operator: "equals",
      value: "",
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    onChange(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Conditional Logic</h3>
        </div>
        <Button onClick={addCondition} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <Card className="p-6 text-center">
          <GitBranch className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No conditions set. Add conditions to create if-this-then-that rules.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <Card key={condition.id} className="p-4">
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted rounded">
                    AND
                  </span>
                )}
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Field"
                    value={condition.field}
                    onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                  />
                  <Select
                    value={condition.operator}
                    onValueChange={(v: any) => updateCondition(condition.id, { operator: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Not Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greater_than">Greater Than</SelectItem>
                      <SelectItem value="less_than">Less Than</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(condition.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};