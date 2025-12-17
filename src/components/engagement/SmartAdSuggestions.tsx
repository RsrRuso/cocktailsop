import { useState } from 'react';
import { Megaphone, Target, DollarSign, TrendingUp, Zap, Users, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';

interface SmartAdSuggestionsProps {
  contentId: string;
  currentReach: number;
  engagementRate: number;
}

export const SmartAdSuggestions = ({
  currentReach,
  engagementRate,
}: SmartAdSuggestionsProps) => {
  const [budget, setBudget] = useState([50]);

  // Calculate ad predictions
  const predictedReach = Math.round(currentReach * (1 + budget[0] * 0.5));
  const predictedEngagement = Math.round(predictedReach * (engagementRate / 100));
  const costPerEngagement = budget[0] / predictedEngagement;
  const roi = ((predictedEngagement * 0.5 - budget[0]) / budget[0]) * 100;

  const adStrategies = [
    {
      icon: Target,
      title: 'Lookalike Audience',
      description: 'Target users similar to your followers',
      potential: 85,
      cost: 'Low',
      color: 'text-blue-500',
    },
    {
      icon: TrendingUp,
      title: 'Trending Topics',
      description: 'Boost during peak engagement times',
      potential: 92,
      cost: 'Medium',
      color: 'text-purple-500',
    },
    {
      icon: Users,
      title: 'Influencer Collaboration',
      description: 'Partner with micro-influencers',
      potential: 78,
      cost: 'High',
      color: 'text-pink-500',
    },
    {
      icon: Zap,
      title: 'Viral Boost',
      description: 'AI-powered viral amplification',
      potential: 95,
      cost: 'Premium',
      color: 'text-yellow-500',
    },
  ];

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-md border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold text-white">Smart Ad Suggestions</h3>
        <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary border-0">AI-Powered</Badge>
      </div>

      {/* Budget Simulator */}
      <div className="mb-6 p-4 rounded-lg bg-white/5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-white">Ad Budget</label>
          <span className="text-lg font-bold text-primary">${budget[0]}</span>
        </div>
        <Slider
          value={budget}
          onValueChange={setBudget}
          min={10}
          max={500}
          step={10}
          className="mb-4"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-white/60">Est. Reach</span>
            </div>
            <div className="text-xl font-bold text-white">
              {predictedReach.toLocaleString()}
            </div>
            <Progress value={75} className="h-1 mt-2" />
          </div>

          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-white/60">Est. ROI</span>
            </div>
            <div className="text-xl font-bold text-green-500">
              {roi.toFixed(0)}%
            </div>
            <Progress value={Math.min(100, roi)} className="h-1 mt-2" />
          </div>

          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-white/60">Engagements</span>
            </div>
            <div className="text-xl font-bold text-white">
              {predictedEngagement.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-white/60">Cost/Engage</span>
            </div>
            <div className="text-xl font-bold text-white">
              ${costPerEngagement.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Ad Strategies */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white mb-3">Recommended Strategies</h4>
        {adStrategies.map((strategy, index) => (
          <motion.div
            key={strategy.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-3 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group border-white/10">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-black/40 ${strategy.color}`}>
                  <strategy.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-sm text-white group-hover:text-primary transition-colors">
                      {strategy.title}
                    </h5>
                    <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                      {strategy.cost}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/60 mb-2">
                    {strategy.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Progress value={strategy.potential} className="h-1 flex-1" />
                    <span className="text-xs font-semibold text-white">
                      {strategy.potential}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Button className="w-full mt-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
        <Calendar className="w-4 h-4 mr-2" />
        Schedule Campaign
      </Button>
    </Card>
  );
};
