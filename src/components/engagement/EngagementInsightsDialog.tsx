import { useState, useEffect } from 'react';
import { Brain, X, Video, Eye, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EngagementInsights } from './EngagementInsights';
import { SmartHashtagSuggestions } from './SmartHashtagSuggestions';
import { SmartAdSuggestions } from './SmartAdSuggestions';
import { OptimalPostingTime } from './OptimalPostingTime';
import { ContentPerformanceAnalytics } from './ContentPerformanceAnalytics';
import { TrendingContentAnalyzer } from './TrendingContentAnalyzer';
import { ViralPredictionEngine } from './ViralPredictionEngine';
import { ContentBoostSuggestions } from './ContentBoostSuggestions';
import { supabase } from '@/integrations/supabase/client';

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

interface ReelObservation {
  duration: string;
  visualStyle: string;
  contentTone: string;
  audienceAppeal: string;
  improvement: string;
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
  const [reelObservation, setReelObservation] = useState<ReelObservation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate AI observations for reels
  useEffect(() => {
    if (open && contentType === 'reel' && !reelObservation) {
      generateReelObservation();
    }
  }, [open, contentType, contentId]);

  const generateReelObservation = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('matrix-analyze-insight', {
        body: {
          content: `Analyze this reel content for engagement optimization. Caption: "${content}". 
          Current stats: ${engagement.views} views, ${engagement.likes} likes, ${engagement.comments} comments.
          Provide insights on: visual style appeal, content tone, audience targeting, and improvement suggestions.
          Return JSON with keys: visualStyle, contentTone, audienceAppeal, improvement, duration`
        }
      });

      if (data?.analysis) {
        const analysis = typeof data.analysis === 'string' ? JSON.parse(data.analysis) : data.analysis;
        setReelObservation({
          duration: analysis.duration || 'Short-form (<30s)',
          visualStyle: analysis.visualStyle || 'Dynamic, fast-paced transitions',
          contentTone: analysis.contentTone || 'Professional yet engaging',
          audienceAppeal: analysis.audienceAppeal || 'Broad industry appeal',
          improvement: analysis.improvement || 'Add trending audio for better reach'
        });
      } else {
        // Fallback based on engagement metrics
        const engagementRate = engagement.views > 0 ? (engagement.likes / engagement.views * 100) : 0;
        setReelObservation({
          duration: 'Short-form (<30s)',
          visualStyle: engagementRate > 5 ? 'High-quality visuals capturing attention' : 'Consider more dynamic transitions',
          contentTone: content.includes('#') ? 'Well-optimized with hashtags' : 'Add relevant hashtags for discovery',
          audienceAppeal: engagement.comments > 0 ? 'Creating conversation and engagement' : 'Try asking questions to boost comments',
          improvement: engagement.views < 100 ? 'Post during peak hours (6-9 PM)' : 'Content performing well, maintain consistency'
        });
      }
    } catch (err) {
      // Use smart fallback
      setReelObservation({
        duration: 'Short-form (<30s)',
        visualStyle: 'Professional presentation style',
        contentTone: 'Industry-focused content',
        audienceAppeal: 'Targeted professional audience',
        improvement: 'Add trending sounds and effects for more reach'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-4xl h-[85vh] translate-x-[-50%] translate-y-[-50%] bg-transparent border-0 shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Close button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full p-2 bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors">
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>

          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Brain className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">AI Engagement Intelligence</h2>
                  <p className="text-sm text-white/60 mt-1">
                    {contentType === 'reel' ? 'Reel-based AI observations' : 'Advanced insights powered by AI'}
                  </p>
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-3 sm:px-6 pt-2 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-4 h-auto bg-white/10 border-0 rounded-xl">
                  <TabsTrigger value="insights" className="text-xs sm:text-sm px-2 sm:px-3 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg">Insights</TabsTrigger>
                  <TabsTrigger value="boost" className="text-xs sm:text-sm px-2 sm:px-3 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg">Boost</TabsTrigger>
                  <TabsTrigger value="ads" className="text-xs sm:text-sm px-2 sm:px-3 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg">Ads</TabsTrigger>
                  <TabsTrigger value="trends" className="text-xs sm:text-sm px-2 sm:px-3 text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg">Trends</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-3 sm:p-6 space-y-4 pb-8">
                  <TabsContent value="insights" className="mt-0 space-y-4">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Reel-specific AI Observations */}
                      {contentType === 'reel' && (
                        <Card className="p-4 bg-black/40 backdrop-blur-md border-white/10">
                          <div className="flex items-center gap-2 mb-4">
                            <Video className="w-5 h-5 text-violet-400" />
                            <h3 className="font-semibold text-white">Reel AI Observations</h3>
                            <Badge variant="secondary" className="ml-auto bg-yellow-500/20 text-yellow-400 border-0">AI Analysis</Badge>
                          </div>
                          
                          {isAnalyzing ? (
                            <div className="flex items-center justify-center py-8 gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              <span className="text-sm text-white/60">Analyzing reel content...</span>
                            </div>
                          ) : reelObservation && (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                                <Eye className="w-4 h-4 text-blue-400 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-white/50 mb-1">Visual Style</p>
                                  <p className="text-sm text-white">{reelObservation.visualStyle}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                                <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-white/50 mb-1">Content Tone</p>
                                  <p className="text-sm text-white">{reelObservation.contentTone}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                                <Brain className="w-4 h-4 text-pink-400 mt-0.5" />
                                <div>
                                  <p className="text-xs font-medium text-white/50 mb-1">Audience Appeal</p>
                                  <p className="text-sm text-white">{reelObservation.audienceAppeal}</p>
                                </div>
                              </div>
                              
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs font-medium text-green-400 mb-1">💡 AI Improvement Tip</p>
                                <p className="text-sm text-white">{reelObservation.improvement}</p>
                              </div>
                            </div>
                          )}
                        </Card>
                      )}

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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
