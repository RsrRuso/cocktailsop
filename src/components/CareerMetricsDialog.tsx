import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Briefcase, Calendar, FolderGit2, Award, Star, Medal } from "lucide-react";
import { CareerMetrics } from "@/lib/careerMetrics";

interface CareerMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: CareerMetrics;
}

export const CareerMetricsDialog = ({ open, onOpenChange, metrics }: CareerMetricsDialogProps) => {
  const metricsData = [
    { icon: Briefcase, label: "Working Places", value: metrics.workingPlaces, color: "text-blue-500" },
    { icon: Calendar, label: "Years Experience", value: metrics.totalYears, color: "text-green-500" },
    { icon: FolderGit2, label: "Projects Completed", value: metrics.projectsCompleted, color: "text-purple-500" },
    { icon: Award, label: "Diplomas", value: metrics.diplomas, color: "text-yellow-500" },
    { icon: Medal, label: "Certificates", value: metrics.certificates, color: "text-orange-500" },
    { icon: Star, label: "Network Recognitions", value: metrics.recognitions, color: "text-pink-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Career Metrics
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pb-4">
          {/* Score and Badge */}
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {metrics.score}
              </div>
              <div className="text-sm text-muted-foreground">Career Development Score</div>
              <div className="text-xs text-primary font-medium">{metrics.regionalRank}</div>
            </div>
            
            <Progress value={metrics.score} className="h-3" />
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Badge className={`${metrics.badge.color} text-lg px-4 py-2`}>
                  {metrics.badge.level}
                </Badge>
                <span className="text-sm text-muted-foreground">- {metrics.badge.description}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Scores are calculated relative to other professionals in your region. Keep growing to reach the top!
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            {metricsData.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="glass p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                  </div>
                  <div className="text-3xl font-bold">{metric.value}</div>
                </div>
              );
            })}
          </div>

          {/* Scoring System Info */}
          <div className="glass p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">How is the score calculated?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Working Places: 5 points each (max 25)</li>
              <li>• Years of Experience: 2 points per year (max 20)</li>
              <li>• Projects: 3 points each (max 15)</li>
              <li>• Diplomas: 10 points each (max 20)</li>
              <li>• Certificates: 5 points each (max 10)</li>
              <li>• Recognitions: 10 points each (max 10)</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CareerMetricsDialog;
