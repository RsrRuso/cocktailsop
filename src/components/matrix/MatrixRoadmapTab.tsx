import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface Feature {
  id: string;
  title: string;
  description: string;
  category: string;
  priority_score: number;
  effort_estimate: string;
  impact_estimate: string;
  user_value: string;
  status: string;
}

export function MatrixRoadmapTab() {
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    // Mock data for now - will be populated by real data
    setFeatures([
      {
        id: "1",
        title: "Advanced Search & Filtering",
        description: "Implement powerful search with filters for posts, reels, and users",
        category: "feature",
        priority_score: 85,
        effort_estimate: "high",
        impact_estimate: "high",
        user_value: "Users can find content and people more efficiently",
        status: "proposed"
      },
      {
        id: "2",
        title: "Performance Optimization",
        description: "Optimize loading times and reduce bundle size",
        category: "performance",
        priority_score: 92,
        effort_estimate: "medium",
        impact_estimate: "high",
        user_value: "Faster, smoother experience across all devices",
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
                  {feature.title}
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
              {feature.description}
            </p>

            <div className="space-y-2 mb-3">
              <div className="text-sm">
                <span className="font-medium">User Value:</span>{" "}
                <span className="text-muted-foreground">{feature.user_value}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                Effort: {feature.effort_estimate}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Impact: {feature.impact_estimate}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {feature.category}
              </Badge>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
