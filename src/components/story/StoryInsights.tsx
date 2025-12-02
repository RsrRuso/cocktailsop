import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Heart, MessageCircle, Share2, TrendingUp, Users, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StoryInsightsProps {
  storyId: string;
}

export const StoryInsights = ({ storyId }: StoryInsightsProps) => {
  const [metrics, setMetrics] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    engagement_rate: 0,
    completion_rate: 0,
  });

  const [demographics, setDemographics] = useState({
    peak_time: "9:00 PM",
    top_location: "Loading...",
    avg_watch_time: "85%",
  });

  useEffect(() => {
    fetchStoryMetrics();
  }, [storyId]);

  const fetchStoryMetrics = async () => {
    try {
      const { data: story } = await supabase
        .from("stories")
        .select("view_count, like_count, comment_count")
        .eq("id", storyId)
        .single();

      if (story) {
        const engagement = story.view_count > 0 
          ? ((story.like_count + story.comment_count) / story.view_count) * 100
          : 0;

        setMetrics({
          views: story.view_count || 0,
          likes: story.like_count || 0,
          comments: story.comment_count || 0,
          shares: 0,
          engagement_rate: Math.round(engagement),
          completion_rate: 78, // Mock for now
        });
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Live Performance
          </CardTitle>
          <CardDescription>Real-time story analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Views</span>
              </div>
              <div className="text-2xl font-bold">{metrics.views}</div>
            </div>

            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Likes</span>
              </div>
              <div className="text-2xl font-bold">{metrics.likes}</div>
            </div>

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Comments</span>
              </div>
              <div className="text-2xl font-bold">{metrics.comments}</div>
            </div>

            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Shares</span>
              </div>
              <div className="text-2xl font-bold">{metrics.shares}</div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Engagement Rate
                </span>
                <span className="font-bold">{metrics.engagement_rate}%</span>
              </div>
              <Progress value={metrics.engagement_rate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Completion Rate
                </span>
                <span className="font-bold">{metrics.completion_rate}%</span>
              </div>
              <Progress value={metrics.completion_rate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audience Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Peak Time</span>
            <Badge variant="secondary">{demographics.peak_time}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Avg Watch Time</span>
            <Badge variant="secondary">{demographics.avg_watch_time}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Top Location</span>
            <Badge variant="secondary">{demographics.top_location}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
