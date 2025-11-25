import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface Feature {
  id: string;
  feature_title: string;
  feature_description: string;
  priority: string;
  priority_score: number;
  estimated_impact: string;
  implementation_complexity: string;
  reasoning: string;
  status: string;
}

export function MatrixRoadmapTab() {
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('matrix_roadmap_features')
        .select('*')
        .order('priority_score', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading features:', error);
        return;
      }
      
      if (data) setFeatures(data);
    } catch (err) {
      console.error('Exception loading features:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Rocket className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return "Proposed";
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        AI-generated feature roadmap based on community patterns and needs
      </p>

      {features.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No features generated yet. Admin can run feature generation from the Admin tab.</p>
        </Card>
      ) : (
        features.map((feature, idx) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    {feature.feature_title}
                    <Badge variant="outline" className="text-xs">
                      Priority: {feature.priority_score}/100
                    </Badge>
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon(feature.status)}
                    <span>{getStatusLabel(feature.status)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {feature.feature_description}
              </p>

              <div className="space-y-2 mb-3">
                <div className="text-sm">
                  <span className="font-medium">Reasoning:</span>{" "}
                  <span className="text-muted-foreground">{feature.reasoning}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  Complexity: {feature.implementation_complexity}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Impact: {feature.estimated_impact}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {feature.priority}
                </Badge>
              </div>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
