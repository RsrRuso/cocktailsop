import { Rocket, Users, Hash, Clock, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ContentBoostSuggestionsProps {
  contentType: 'post' | 'reel' | 'story' | 'music_share' | 'event';
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export const ContentBoostSuggestions = ({
  contentType,
  engagement,
}: ContentBoostSuggestionsProps) => {
  const suggestions = [
    {
      icon: Hash,
      title: 'Add Trending Hashtags',
      description: 'Include 5-10 trending hashtags to increase discoverability',
      impact: 'High',
      color: 'text-purple-500',
      action: 'Add Hashtags',
    },
    {
      icon: MessageCircle,
      title: 'Engage with Comments',
      description: 'Reply to comments within first hour to boost algorithm ranking',
      impact: 'High',
      color: 'text-green-500',
      action: 'View Comments',
    },
    {
      icon: Users,
      title: 'Tag Relevant Accounts',
      description: 'Tag 2-3 relevant accounts or brands to expand reach',
      impact: 'Medium',
      color: 'text-blue-500',
      action: 'Add Tags',
    },
    {
      icon: Clock,
      title: 'Cross-Post at Peak Time',
      description: 'Repost during peak activity hours (7-9 PM)',
      impact: 'Medium',
      color: 'text-orange-500',
      action: 'Schedule',
    },
    {
      icon: Share2,
      title: 'Share to Stories',
      description: 'Reshare to your story for additional visibility',
      impact: 'Medium',
      color: 'text-pink-500',
      action: 'Share Now',
    },
    {
      icon: Sparkles,
      title: 'Pin to Profile',
      description: 'Pin this high-performing content to your profile',
      impact: 'Low',
      color: 'text-yellow-500',
      action: 'Pin Post',
    },
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'Low': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/50';
    }
  };

  return (
    <Card className="p-4 bg-black/40 backdrop-blur-md border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="w-5 h-5 text-cyan-500" />
        <h3 className="font-semibold text-white">Boost This Content</h3>
        <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary border-0">
          {suggestions.filter(s => s.impact === 'High').length} Priority Actions
        </Badge>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-3 bg-white/5 hover:bg-white/10 transition-all group border-white/10">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-black/40 ${suggestion.color} group-hover:scale-110 transition-transform`}>
                  <suggestion.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm text-white group-hover:text-primary transition-colors">
                      {suggestion.title}
                    </h4>
                    <Badge variant="outline" className={`text-xs shrink-0 ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/60 mb-2">
                    {suggestion.description}
                  </p>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-xs hover:bg-primary/10"
                  >
                    {suggestion.action}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10">
        <p className="text-xs text-white/60">
          💡 <span className="font-semibold text-white">Pro Tip:</span> Implement high-impact actions
          first for maximum visibility boost. Content with early engagement gets promoted by the algorithm.
        </p>
      </div>
    </Card>
  );
};
