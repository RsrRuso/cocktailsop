import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, Users, Award } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CareerMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricType: "network" | "professional" | null;
  currentValue: number;
}

const CareerMetricsDialog = ({ open, onOpenChange, metricType, currentValue }: CareerMetricsDialogProps) => {
  const getMetricInfo = () => {
    if (metricType === "network") {
      return {
        title: "Network Reach",
        icon: Users,
        description: "Your total professional influence and audience across the platform",
        calculation: [
          { label: "Follower Reach", formula: "Followers × 1.5", description: "Your direct audience - most valuable" },
          { label: "Following Reach", formula: "Following × 0.5", description: "Your networking connections" },
          { label: "Post Engagement", formula: "Total Likes + Comments × 0.3", description: "Content engagement bonus (max 500)" },
          { label: "Reel Views", formula: "Total Views × 0.1", description: "Video content reach (max 300)" },
        ],
        tips: [
          "Grow your follower base for the biggest impact",
          "Post engaging content to boost engagement bonuses",
          "Create reels to increase your view count",
          "Network with industry professionals",
        ]
      };
    } else {
      return {
        title: "Professional Score",
        icon: Award,
        description: "A comprehensive measure of your professional status and achievements",
        calculation: [
          { label: "Base Score", formula: "Professional Title × 60%", description: "Based on your selected role" },
          { label: "Status Bonuses", formula: "Founder +10, Verified +8", description: "Special status recognition" },
          { label: "Badge Level", formula: "Bronze: 0, Silver: +5, Gold: +10, Platinum: +15", description: "Achievement level bonus" },
          { label: "Engagement Quality", formula: "Avg Post Engagement × 0.5", description: "Content quality indicator (max 10)" },
          { label: "Activity Bonus", formula: "Posts +3, Reels +3", description: "Platform activity reward" },
        ],
        tips: [
          "Verify your work experience to increase status",
          "Level up your badge through consistent activity",
          "Create high-quality engaging content",
          "Stay active with diverse content types",
        ]
      };
    }
  };

  const info = getMetricInfo();
  const Icon = info.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Icon className="w-6 h-6 text-primary" />
            {info.title}
          </DialogTitle>
          <DialogDescription>
            {info.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Current Score */}
            <div className="glass rounded-xl p-6 border border-border/50 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Your Current {info.title}</p>
                <p className="text-5xl font-bold text-primary">{currentValue.toLocaleString()}</p>
              </div>
            </div>

            {/* How It's Calculated */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                How It's Calculated
              </h3>
              <div className="space-y-3">
                {info.calculation.map((item, index) => (
                  <div key={index} className="glass rounded-lg p-4 border border-border/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.label}</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{item.formula}</code>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips to Improve */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                How to Improve
              </h3>
              <div className="space-y-2">
                {info.tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-2 glass rounded-lg p-3 border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CareerMetricsDialog;
