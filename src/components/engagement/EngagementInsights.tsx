import { TrendingUp, Users, Clock, Target, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface EngagementInsightsProps {
  contentId: string;
  contentType: 'post' | 'reel' | 'story' | 'music_share' | 'event';
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: string;
}

export const EngagementInsights = ({
  likes,
  comments,
  shares,
  views,
  createdAt,
}: EngagementInsightsProps) => {
  // Calculate engagement metrics
  const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
  const viralScore = Math.min(100, (likes * 0.5 + comments * 2 + shares * 3) / 10);
  const timeAlive = Date.now() - new Date(createdAt).getTime();
  const hoursAlive = Math.floor(timeAlive / (1000 * 60 * 60));
  const engagementVelocity = hoursAlive > 0 ? (likes + comments * 2 + shares * 3) / hoursAlive : 0;

  // Predict performance
  const predictedLikes = Math.round(likes * (1 + engagementVelocity * 0.1));
  const predictedReach = Math.round(views * (1 + viralScore * 0.05));

  const insights = [
    {
      icon: TrendingUp,
      label: 'Engagement Rate',
      value: `${engagementRate.toFixed(1)}%`,
      progress: engagementRate,
      color: 'text-green-500',
    },
    {
      icon: Zap,
      label: 'Viral Score',
      value: `${viralScore.toFixed(0)}/100`,
      progress: viralScore,
      color: 'text-purple-500',
    },
    {
      icon: Users,
      label: 'Predicted Reach',
      value: predictedReach.toLocaleString(),
      progress: (predictedReach / views) * 50,
      color: 'text-blue-500',
    },
    {
      icon: Award,
      label: 'Predicted Likes',
      value: predictedLikes.toLocaleString(),
      progress: (predictedLikes / likes) * 50,
      color: 'text-pink-500',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground/80">Smart Insights</h3>
      <div className="grid grid-cols-2 gap-3">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-3 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <insight.icon className={`w-4 h-4 ${insight.color}`} />
                <span className="text-xs text-muted-foreground">{insight.label}</span>
              </div>
              <div className="text-lg font-bold text-foreground mb-2">{insight.value}</div>
              <Progress value={insight.progress} className="h-1" />
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
