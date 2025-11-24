import { useState } from 'react';
import { Brain, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { EngagementInsights } from './EngagementInsights';
import { SmartHashtagSuggestions } from './SmartHashtagSuggestions';
import { SmartAdSuggestions } from './SmartAdSuggestions';
import { OptimalPostingTime } from './OptimalPostingTime';
import { ContentPerformanceAnalytics } from './ContentPerformanceAnalytics';
import { TrendingContentAnalyzer } from './TrendingContentAnalyzer';
import { ViralPredictionEngine } from './ViralPredictionEngine';
import { ContentBoostSuggestions } from './ContentBoostSuggestions';

interface EngagementInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: 'post' | 'reel' | 'story' | 'music_share' | 'event';
  content: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  createdAt: string;
}

export const EngagementInsightsDialog = ({
  open,
  onOpenChange,
  contentId,
  contentType,
  content,
  engagement,
  createdAt,
}: EngagementInsightsDialogProps) => {
  const [activeTab, setActiveTab] = useState('insights');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">AI Engagement Intelligence</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Advanced insights powered by AI
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="boost">Boost</TabsTrigger>
              <TabsTrigger value="ads">Ads</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              <TabsContent value="insights" className="mt-0 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <ViralPredictionEngine
                    likes={engagement.likes}
                    comments={engagement.comments}
                    shares={engagement.shares}
                    views={engagement.views}
                    timePosted={createdAt}
                  />
                  
                  <EngagementInsights
                    contentId={contentId}
                    contentType={contentType}
                    likes={engagement.likes}
                    comments={engagement.comments}
                    shares={engagement.shares}
                    views={engagement.views}
                    createdAt={createdAt}
                  />

                  <ContentPerformanceAnalytics
                    views={engagement.views}
                    likes={engagement.likes}
                    comments={engagement.comments}
                    shares={engagement.shares}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="boost" className="mt-0 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <ContentBoostSuggestions
                    contentType={contentType}
                    engagement={{
                      likes: engagement.likes,
                      comments: engagement.comments,
                      shares: engagement.shares,
                    }}
                  />

                  <SmartHashtagSuggestions content={content} />

                  <OptimalPostingTime />
                </motion.div>
              </TabsContent>

              <TabsContent value="ads" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <SmartAdSuggestions
                    contentId={contentId}
                    currentReach={engagement.views}
                    engagementRate={(engagement.likes + engagement.comments + engagement.shares) / Math.max(engagement.views, 1) * 100}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="trends" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <TrendingContentAnalyzer />
                </motion.div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
