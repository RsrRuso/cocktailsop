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
    <Card className="p-4 bg-black/40 backdrop-blur-md border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-white">Performance Analytics</h3>
      </div>

      {/* Overall Performance */}
      <div className="mb-4 p-4 rounded-lg bg-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/60">Overall Performance</span>
          <span className={`text-lg font-bold ${performanceColor}`}>{performance}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-white">
            {engagementRate.toFixed(1)}%
          </span>
          <span className="text-sm text-white/60">engagement rate</span>
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
            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className={`p-2 rounded-lg bg-card ${metric.color}`}>
              <metric.icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{metric.label}</span>
                <span className="text-sm font-bold text-white">
                  {metric.value.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={metric.percentage} className="h-1 flex-1" />
                <span className="text-xs text-white/60">
                  {metric.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Insights */}
      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-white mb-1">AI Insight</p>
            <p className="text-xs text-white/60">
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
