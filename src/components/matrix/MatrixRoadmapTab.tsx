import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, CheckCircle2, Clock } from "lucide-react";
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
    // Mock data for now - will be populated by real data
    setFeatures([
      {
        id: "1",
        feature_title: "Advanced Search & Filtering",
        feature_description: "Implement powerful search with filters for posts, reels, and users",
        priority: "high",
        priority_score: 85,
        estimated_impact: "high",
        implementation_complexity: "high",
        reasoning: "Users can find content and people more efficiently",
        status: "proposed"
      },
      {
        id: "2",
        feature_title: "Performance Optimization",
        feature_description: "Optimize loading times and reduce bundle size",
        priority: "critical",
        priority_score: 92,
        estimated_impact: "high",
        implementation_complexity: "medium",
        reasoning: "Faster, smoother experience across all devices",
        status: "in_progress"
      }
    ]);
  }, []);

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

      {features.map((feature, idx) => (
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
      ))}
    </div>
  );
}
