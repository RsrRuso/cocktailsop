import { useState } from "react";
import { Brain, TrendingUp, Hash, Music, Sparkles, Eye, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SmartStoryFeaturesProps {
  storyId?: string;
  mediaUrl?: string;
  onApplySuggestion?: (type: string, data: any) => void;
}

export const SmartStoryFeatures = ({
  storyId,
  mediaUrl,
  onApplySuggestion,
}: SmartStoryFeaturesProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  const analyzeStory = async () => {
    if (!storyId && !mediaUrl) {
      toast.error("No story content to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-story-analyzer", {
        body: { storyId, mediaUrl },
      });

      if (error) throw error;

      setInsights(data);
      toast.success("Story analyzed with AI! 🧠");
    } catch (error) {
      console.error("Error analyzing story:", error);
      toast.error("Failed to analyze story");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateCaption = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-caption-generator", {
        body: { mediaUrl, context: "story" },
      });

      if (error) throw error;

      onApplySuggestion?.("caption", data.caption);
      toast.success("Caption generated! ✨");
    } catch (error) {
      console.error("Error generating caption:", error);
      toast.error("Failed to generate caption");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestHashtags = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-hashtag-suggester", {
        body: { mediaUrl, storyId },
      });

      if (error) throw error;

      onApplySuggestion?.("hashtags", data.hashtags);
      toast.success(`${data.hashtags.length} hashtags suggested! #️⃣`);
    } catch (error) {
      console.error("Error suggesting hashtags:", error);
      toast.error("Failed to suggest hashtags");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestMusic = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-music-matcher", {
        body: { mediaUrl, mood: insights?.mood },
      });

      if (error) throw error;

      onApplySuggestion?.("music", data.track);
      toast.success("Perfect music matched! 🎵");
    } catch (error) {
      console.error("Error suggesting music:", error);
      toast.error("Failed to suggest music");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Story Intelligence
          </CardTitle>
          <CardDescription>
            Advanced AI-powered tools to make your story stand out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={analyzeStory}
              disabled={isAnalyzing}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analyzing..." : "Analyze Story"}
            </Button>

            <Button
              onClick={generateCaption}
              disabled={isAnalyzing}
              variant="outline"
              className="w-full"
            >
              <Brain className="w-4 h-4 mr-2" />
              Smart Caption
            </Button>

            <Button
              onClick={suggestHashtags}
              disabled={isAnalyzing}
              variant="outline"
              className="w-full"
            >
              <Hash className="w-4 h-4 mr-2" />
              Trending Tags
            </Button>

            <Button
              onClick={suggestMusic}
              disabled={isAnalyzing}
              variant="outline"
              className="w-full"
            >
              <Music className="w-4 h-4 mr-2" />
              Match Music
            </Button>
          </div>
        </CardContent>
      </Card>

      {insights && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4" />
                Engagement Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Viral Potential</span>
                  <span className="font-semibold">{insights.viralScore}%</span>
                </div>
                <Progress value={insights.viralScore} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Eye className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                  <div className="text-xs text-muted-foreground">Est. Views</div>
                  <div className="font-bold">{insights.estimatedViews}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Users className="w-4 h-4 mx-auto mb-1 text-green-500" />
                  <div className="text-xs text-muted-foreground">Reach</div>
                  <div className="font-bold">{insights.estimatedReach}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded-lg">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                  <div className="text-xs text-muted-foreground">Best Time</div>
                  <div className="font-bold text-xs">{insights.bestPostTime}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">Mood: {insights.mood}</Badge>
                <Badge variant="secondary">Style: {insights.style}</Badge>
                <Badge variant="secondary">Quality: {insights.quality}</Badge>
              </div>

              {insights.suggestions && (
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">AI Suggestions:</div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {insights.suggestions.map((suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
