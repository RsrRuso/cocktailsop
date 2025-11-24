import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Users, Zap, Target, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const TrendingContentAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('trending');

  const trendingTopics = [
    { topic: 'AI Technology', score: 95, growth: '+45%', posts: 12500, color: 'text-purple-500' },
    { topic: 'Fitness Trends', score: 88, growth: '+32%', posts: 8900, color: 'text-green-500' },
    { topic: 'Travel Vlogs', score: 92, growth: '+38%', posts: 15200, color: 'text-blue-500' },
    { topic: 'Food Recipes', score: 85, growth: '+28%', posts: 7600, color: 'text-orange-500' },
    { topic: 'Fashion Style', score: 79, growth: '+21%', posts: 9800, color: 'text-pink-500' },
  ];

  const competitorInsights = [
    { name: '@topinfluencer', followers: '2.5M', engagement: '8.5%', posts: 245, trend: 'up' },
    { name: '@trendsetter', followers: '1.8M', engagement: '12.3%', posts: 189, trend: 'up' },
    { name: '@contentking', followers: '3.2M', engagement: '6.8%', posts: 567, trend: 'down' },
  ];

  const audienceInsights = [
    { metric: 'Peak Activity', value: '7-9 PM', icon: Clock, color: 'text-blue-500' },
    { metric: 'Top Location', value: 'United States', icon: Target, color: 'text-green-500' },
    { metric: 'Avg. Age', value: '25-34 years', icon: Users, color: 'text-purple-500' },
    { metric: 'Engagement Rate', value: '9.2%', icon: Zap, color: 'text-yellow-500' },
  ];

  return (
    <Card className="p-4 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-violet-500" />
        <h3 className="font-semibold text-foreground">AI Content Intelligence</h3>
        <Badge variant="secondary" className="ml-auto">Real-time</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="trending" className="space-y-2">
          {trendingTopics.map((topic, index) => (
            <motion.div
              key={topic.topic}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-3 bg-card/30 hover:bg-card/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-4 h-4 ${topic.color}`} />
                    <span className="font-medium text-sm text-foreground">{topic.topic}</span>
                  </div>
                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                    {topic.growth}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {topic.posts.toLocaleString()} posts
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    Score: {topic.score}/100
                  </span>
                </div>
                <Progress value={topic.score} className="h-1" />
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="competitors" className="space-y-2">
          {competitorInsights.map((comp, index) => (
            <motion.div
              key={comp.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-3 bg-card/30 hover:bg-card/50 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-foreground">{comp.name}</span>
                  <Badge variant={comp.trend === 'up' ? 'default' : 'secondary'}>
                    {comp.trend === 'up' ? '↑' : '↓'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Followers</span>
                    <span className="font-semibold text-foreground">{comp.followers}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Engagement</span>
                    <span className="font-semibold text-green-500">{comp.engagement}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Posts</span>
                    <span className="font-semibold text-foreground">{comp.posts}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="audience" className="space-y-3">
          {audienceInsights.map((insight, index) => (
            <motion.div
              key={insight.metric}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-3 bg-card/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-background/50 ${insight.color}`}>
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{insight.metric}</div>
                    <div className="text-sm font-semibold text-foreground">{insight.value}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
