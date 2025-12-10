import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Newspaper, TrendingUp, Lightbulb, Wine, RefreshCw, Calendar, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Article {
  title: string;
  category: string;
  summary: string;
  importance: "high" | "medium" | "low";
}

interface DrinkOfTheDay {
  name: string;
  description: string;
}

interface Digest {
  date: string;
  headline: string;
  summary: string;
  articles: Article[];
  trending_topics: string[];
  drink_of_the_day: DrinkOfTheDay;
  industry_tip: string;
  generated_at: string;
}

const categoryColors: Record<string, string> = {
  "Cocktails": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Spirits": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Wine": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "Restaurants": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Hotels": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Industry Trends": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Awards": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Openings": "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const importanceStyles: Record<string, string> = {
  high: "border-l-4 border-l-red-500",
  medium: "border-l-4 border-l-amber-500",
  low: "border-l-4 border-l-muted",
};

export default function IndustryDigest() {
  const navigate = useNavigate();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDigest = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Check localStorage for cached digest
      const cachedDigest = localStorage.getItem("industry_digest");
      const cachedTime = localStorage.getItem("industry_digest_time");
      
      if (!isRefresh && cachedDigest && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        // Use cache if less than 4 hours old
        if (cacheAge < 4 * 60 * 60 * 1000) {
          setDigest(JSON.parse(cachedDigest));
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("fetch-industry-news");

      if (error) throw error;

      if (data?.success && data?.digest) {
        setDigest(data.digest);
        // Cache the result
        localStorage.setItem("industry_digest", JSON.stringify(data.digest));
        localStorage.setItem("industry_digest_time", Date.now().toString());
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error fetching digest:", error);
      toast.error("Failed to load digest. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Industry Digest</h1>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Industry Digest</h1>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchDigest(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-4 space-y-4">
          {digest && (
            <>
              {/* Date Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{digest.date}</span>
              </motion.div>

              {/* Headline Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2">{digest.headline}</h2>
                        <p className="text-muted-foreground text-sm">{digest.summary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Trending Topics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-card/50 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      Trending Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {digest.trending_topics.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="bg-muted/50">
                          #{topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Drink of the Day */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Wine className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-400 uppercase tracking-wide">Drink of the Day</p>
                        <p className="font-semibold">{digest.drink_of_the_day.name}</p>
                        <p className="text-sm text-muted-foreground">{digest.drink_of_the_day.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Articles */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Today's Stories
                </h3>
                {digest.articles.map((article, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <Card className={`bg-card/50 backdrop-blur ${importanceStyles[article.importance]}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-semibold text-sm leading-tight">{article.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={`text-xs shrink-0 ${categoryColors[article.category] || 'bg-muted/50'}`}
                          >
                            {article.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{article.summary}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Industry Tip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Lightbulb className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Pro Tip</p>
                        <p className="text-sm">{digest.industry_tip}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                <Clock className="w-3 h-3" />
                <span>Generated {new Date(digest.generated_at).toLocaleTimeString()}</span>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}