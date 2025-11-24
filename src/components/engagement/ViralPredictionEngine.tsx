import { Sparkles, TrendingUp, Target, Zap, Award, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ViralPredictionEngineProps {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timePosted: string;
}

export const ViralPredictionEngine = ({
  likes,
  comments,
  shares,
  views,
  timePosted,
}: ViralPredictionEngineProps) => {
  // Calculate viral probability
  const engagementScore = (likes + comments * 2 + shares * 3) / Math.max(views, 1);
  const timeAlive = Date.now() - new Date(timePosted).getTime();
  const hoursAlive = Math.max(1, timeAlive / (1000 * 60 * 60));
  const velocity = (likes + comments * 2 + shares * 3) / hoursAlive;
  
  const viralProbability = Math.min(95, Math.round(
    (engagementScore * 100 * 0.4) +
    (velocity * 5 * 0.3) +
    (shares > 0 ? 20 : 0) +
    (comments > views * 0.05 ? 15 : 0)
  ));

  const prediction24h = {
    views: Math.round(views * (1 + velocity * 0.5)),
    likes: Math.round(likes * (1 + velocity * 0.4)),
    shares: Math.round(shares * (1 + velocity * 0.6)),
  };

  const factors = [
    {
      icon: TrendingUp,
      label: 'Growth Velocity',
      score: Math.min(100, Math.round(velocity * 10)),
      color: 'text-green-500',
    },
    {
      icon: Users,
      label: 'Engagement Rate',
      score: Math.min(100, Math.round(engagementScore * 100 * 10)),
      color: 'text-blue-500',
    },
    {
      icon: Zap,
      label: 'Share Momentum',
      score: shares > 0 ? Math.min(100, shares * 10) : 0,
      color: 'text-purple-500',
    },
    {
      icon: Target,
      label: 'Discussion Level',
      score: Math.min(100, Math.round((comments / Math.max(views, 1)) * 1000)),
      color: 'text-orange-500',
    },
  ];

  const getViralStatus = () => {
    if (viralProbability >= 80) return { label: 'Going Viral! 🚀', color: 'text-pink-500' };
    if (viralProbability >= 60) return { label: 'High Potential', color: 'text-purple-500' };
    if (viralProbability >= 40) return { label: 'Moderate Chance', color: 'text-blue-500' };
    return { label: 'Building Momentum', color: 'text-yellow-500' };
  };

  const status = getViralStatus();

  return (
    <Card className="p-4 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
        <h3 className="font-semibold text-foreground">Viral Prediction Engine</h3>
        <Badge variant="secondary" className="ml-auto">AI-Powered</Badge>
      </div>

      {/* Viral Probability */}
      <div className="mb-6 p-4 rounded-lg bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Viral Probability</span>
          <span className={`text-lg font-bold ${status.color}`}>{status.label}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            {viralProbability}%
          </span>
        </div>
        <Progress value={viralProbability} className="h-2" />
      </div>

      {/* Viral Factors */}
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Viral Factors</h4>
        {factors.map((factor, index) => (
          <motion.div
            key={factor.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
          >
            <div className={`p-2 rounded-lg bg-card ${factor.color}`}>
              <factor.icon className="w-3 h-3" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{factor.label}</span>
                <span className="text-xs font-bold text-foreground">{factor.score}</span>
              </div>
              <Progress value={factor.score} className="h-1" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* 24h Predictions */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-yellow-500" />
          <h4 className="text-sm font-semibold text-foreground">24h Predictions</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Views</div>
            <div className="text-lg font-bold text-foreground">
              {prediction24h.views.toLocaleString()}
            </div>
            <div className="text-xs text-green-500">
              +{Math.round(((prediction24h.views - views) / Math.max(views, 1)) * 100)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Likes</div>
            <div className="text-lg font-bold text-foreground">
              {prediction24h.likes.toLocaleString()}
            </div>
            <div className="text-xs text-green-500">
              +{Math.round(((prediction24h.likes - likes) / Math.max(likes, 1)) * 100)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Shares</div>
            <div className="text-lg font-bold text-foreground">
              {prediction24h.shares.toLocaleString()}
            </div>
            <div className="text-xs text-green-500">
              +{Math.round(((prediction24h.shares - shares) / Math.max(shares, 1)) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
