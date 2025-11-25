import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface Pattern {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: number;
  priority: string;
  trend: string;
  related_keywords: string[];
}

export function MatrixPatternsTab() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  useEffect(() => {
    // Mock data for now - will be populated by real data
    setPatterns([
      {
        id: "1",
        title: "Users requesting faster loading times",
        description: "Multiple users have reported slow performance on mobile devices",
        category: "performance",
        frequency: 15,
        priority: "high",
        trend: "growing",
        related_keywords: ["speed", "performance", "mobile"]
      },
      {
        id: "2",
        title: "Dark mode improvements",
        description: "Users want better contrast and readability in dark mode",
        category: "ui",
        frequency: 8,
        priority: "medium",
        trend: "stable",
        related_keywords: ["dark mode", "ui", "accessibility"]
      }
    ]);
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "growing":
        return <TrendingUp className="w-4 h-4" />;
      case "declining":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        AI-detected patterns from user insights across the platform
      </p>

      {patterns.map((pattern, idx) => (
        <motion.div
          key={pattern.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                {pattern.title}
                <Badge variant={getPriorityColor(pattern.priority)} className="text-xs">
                  {pattern.priority}
                </Badge>
              </h3>
              <div className="flex items-center gap-1 text-muted-foreground">
                {getTrendIcon(pattern.trend)}
                <span className="text-xs">{pattern.trend}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {pattern.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {pattern.related_keywords.map((keyword) => (
                  <Badge key={keyword} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {pattern.frequency} insights
              </span>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
