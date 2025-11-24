import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ContentPerformanceAnalyticsProps {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
}

export const ContentPerformanceAnalytics = ({
  views,
  likes,
  comments,
  shares,
  saves = 0,
}: ContentPerformanceAnalyticsProps) => {
  const totalEngagement = likes + comments + shares + saves;
  const engagementRate = views > 0 ? (totalEngagement / views) * 100 : 0;

  const metrics = [
    { icon: Eye, label: 'Views', value: views, color: 'text-blue-500', percentage: 100 },
    { icon: Heart, label: 'Likes', value: likes, color: 'text-red-500', percentage: (likes / views) * 100 },
    { icon: MessageCircle, label: 'Comments', value: comments, color: 'text-green-500', percentage: (comments / views) * 100 },
    { icon: Share2, label: 'Shares', value: shares, color: 'text-purple-500', percentage: (shares / views) * 100 },
  ];

  const performance = engagementRate > 10 ? 'Excellent' : engagementRate > 5 ? 'Good' : engagementRate > 2 ? 'Average' : 'Low';
  const performanceColor = engagementRate > 10 ? 'text-green-500' : engagementRate > 5 ? 'text-blue-500' : engagementRate > 2 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card className="p-4 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-foreground">Performance Analytics</h3>
      </div>

      {/* Overall Performance */}
      <div className="mb-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Overall Performance</span>
          <span className={`text-lg font-bold ${performanceColor}`}>{performance}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-foreground">
            {engagementRate.toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">engagement rate</span>
        </div>
        <Progress value={Math.min(100, engagementRate * 5)} className="h-2" />
      </div>

      {/* Detailed Metrics */}
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors"
          >
            <div className={`p-2 rounded-lg bg-card ${metric.color}`}>
              <metric.icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{metric.label}</span>
                <span className="text-sm font-bold text-foreground">
                  {metric.value.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={metric.percentage} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">
                  {metric.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/50">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">AI Insight</p>
            <p className="text-xs text-muted-foreground">
              {engagementRate > 10
                ? 'Outstanding performance! Your content is resonating exceptionally well with your audience.'
                : engagementRate > 5
                ? 'Great job! Consider posting similar content during peak hours for even better results.'
                : engagementRate > 2
                ? 'Solid performance. Try using trending hashtags and engaging with comments to boost visibility.'
                : 'Focus on creating more engaging content. Use our hashtag suggestions and post during optimal times.'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
