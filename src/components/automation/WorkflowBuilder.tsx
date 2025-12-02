import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Zap, GitBranch, Clock, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition" | "delay";
  config: any;
  position: { x: number; y: number };
}

interface WorkflowBuilderProps {
  workflow?: any;
  onSave: (workflow: any) => void;
}

export const WorkflowBuilder = ({ workflow, onSave }: WorkflowBuilderProps) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || []);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const addNode = (type: WorkflowNode["type"]) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      config: {},
      position: { x: 100, y: nodes.length * 120 + 50 },
    };
    setNodes([...nodes, newNode]);
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  const getNodeIcon = (type: WorkflowNode["type"]) => {
    switch (type) {
      case "trigger": return <Zap className="w-5 h-5" />;
      case "action": return <Plus className="w-5 h-5" />;
      case "condition": return <GitBranch className="w-5 h-5" />;
      case "delay": return <Clock className="w-5 h-5" />;
    }
  };

  const getNodeColor = (type: WorkflowNode["type"]) => {
    switch (type) {
      case "trigger": return "from-orange-500 to-orange-600";
      case "action": return "from-blue-500 to-blue-600";
      case "condition": return "from-purple-500 to-purple-600";
      case "delay": return "from-green-500 to-green-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Button onClick={() => addNode("trigger")} variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Add Trigger
          </Button>
          <Button onClick={() => addNode("action")} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Action
          </Button>
          <Button onClick={() => addNode("condition")} variant="outline" size="sm">
            <GitBranch className="w-4 h-4 mr-2" />
            Add Condition
          </Button>
          <Button onClick={() => addNode("delay")} variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Add Delay
          </Button>
        </div>
      </Card>

      {/* Canvas */}
      <Card className="p-6 min-h-[500px] bg-muted/30 relative overflow-auto">
        <div className="relative">
          {nodes.map((node, index) => (
            <div key={node.id} className="mb-4 relative">
              <Card
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-lg",
                  selectedNode === node.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedNode(node.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white",
                      getNodeColor(node.type)
                    )}>
                      {getNodeIcon(node.type)}
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{node.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {node.type === "trigger" && "When this happens..."}
                        {node.type === "action" && "Do this..."}
                        {node.type === "condition" && "If this is true..."}
                        {node.type === "delay" && "Wait for..."}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNode(node.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
              
              {/* Connection line */}
              {index < nodes.length - 1 && (
                <div className="w-0.5 h-4 bg-border ml-5 my-2" />
              )}
            </div>
          ))}

          {nodes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Filter className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add triggers, actions, conditions, and delays to create powerful automation workflows
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      {nodes.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => onSave({ nodes })}>
            Save Workflow
          </Button>
        </div>
      )}
    </div>
  );
};