import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface Pattern {
  id: string;
  pattern_name: string;
  pattern_description: string;
  category: string;
  occurrence_count: number;
  trend_direction: string;
  confidence_score: number;
  status: string;
}

export function MatrixPatternsTab() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  useEffect(() => {
    // Mock data for now - will be populated by real data
    setPatterns([
      {
        id: "1",
        pattern_name: "Users requesting faster loading times",
        pattern_description: "Multiple users have reported slow performance on mobile devices",
        category: "performance",
        occurrence_count: 15,
        trend_direction: "growing",
        confidence_score: 0.85,
        status: "detected"
      },
      {
        id: "2",
        pattern_name: "Dark mode improvements",
        pattern_description: "Users want better contrast and readability in dark mode",
        category: "ui",
        occurrence_count: 8,
        trend_direction: "stable",
        confidence_score: 0.72,
        status: "detected"
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

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "outline";
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
                {pattern.pattern_name}
                <Badge variant={getConfidenceColor(pattern.confidence_score)} className="text-xs">
                  {Math.round(pattern.confidence_score * 100)}% confidence
                </Badge>
              </h3>
              <div className="flex items-center gap-1 text-muted-foreground">
                {getTrendIcon(pattern.trend_direction)}
                <span className="text-xs">{pattern.trend_direction}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {pattern.pattern_description}
            </p>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {pattern.category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {pattern.occurrence_count} occurrences
              </span>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
