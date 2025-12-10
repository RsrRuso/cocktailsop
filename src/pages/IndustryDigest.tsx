import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Newspaper, TrendingUp, RefreshCw, Calendar, Sparkles, Clock, ExternalLink, Globe, Award, Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REGIONS = [
  { value: "global", label: "🌍 Global" },
  { value: "middle-east", label: "🏜️ Middle East" },
  { value: "europe", label: "🇪🇺 Europe" },
  { value: "north-america", label: "🇺🇸 North America" },
  { value: "asia-pacific", label: "🌏 Asia Pacific" },
];

interface Article {
  title: string;
  category: string;
  summary: string;
  importance: "high" | "medium" | "low";
  link?: string;
  source?: string;
  pubDate?: string;
}

interface Organization {
  name: string;
  category: string;
  region: string;
}

interface Digest {
  date: string;
  headline: string;
  summary: string;
  articles: Article[];
  award_articles?: Article[];
  organizations?: Organization[];
  trending_topics: string[];
  region?: string;
  generated_at: string;
  is_real_news?: boolean;
}

const categoryColors: Record<string, string> = {
  "Cocktails": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Spirits": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Wine": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "Restaurants": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Hotels": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Hospitality": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Industry Trends": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Awards": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Michelin": "bg-red-500/20 text-red-400 border-red-500/30",
  "F&B": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Food & Wine": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Openings": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
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
  const [selectedRegion, setSelectedRegion] = useState("global");

  const fetchDigest = async (isRefresh = false, region = selectedRegion) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const cacheKey = `industry_digest_${region}`;
      const cachedDigest = localStorage.getItem(cacheKey);
      const cachedTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (!isRefresh && cachedDigest && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        if (cacheAge < 2 * 60 * 60 * 1000) {
          setDigest(JSON.parse(cachedDigest));
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("fetch-industry-news", {
        body: { region }
      });

      if (error) throw error;

      if (data?.success && data?.digest) {
        setDigest(data.digest);
        localStorage.setItem(cacheKey, JSON.stringify(data.digest));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        if (isRefresh) {
          toast.success("News refreshed with latest stories");
        }
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
    // Always fetch fresh when region changes (force refresh)
    fetchDigest(true, selectedRegion);
  }, [selectedRegion]);

  const handleRegionChange = (region: string) => {
    setLoading(true);
    setDigest(null); // Clear current data to show loading
    setSelectedRegion(region);
  };

  const formatPubDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffHours < 48) return "Yesterday";
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return "";
    }
  };

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
          <div className="flex items-center gap-2">
            <Select value={selectedRegion} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => fetchDigest(true, selectedRegion)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{digest.date}</span>
                </div>
                {digest.is_real_news && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <Globe className="w-3 h-3 mr-1" />
                    Live News
                  </Badge>
                )}
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

              {/* Hospitality Organizations */}
              {digest.organizations && digest.organizations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                >
                  <Card className="bg-gradient-to-br from-amber-500/10 via-card/50 to-card/50 backdrop-blur border-amber-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Recognized Organizations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {digest.organizations.map((org, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            {org.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Awards & Michelin Section */}
              {digest.award_articles && digest.award_articles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-3"
                >
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Awards & Michelin
                  </h3>
                  {digest.award_articles.map((article, i) => (
                    <motion.div
                      key={`award-${i}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <Card 
                        className="bg-gradient-to-r from-yellow-500/10 to-card/50 backdrop-blur border-l-4 border-l-yellow-500 cursor-pointer hover:bg-card/70 transition-colors"
                        onClick={() => article.link && window.open(article.link, '_blank')}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-semibold text-sm leading-tight flex-1">{article.title}</h4>
                            {article.link && (
                              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{article.summary}</p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${categoryColors[article.category] || 'bg-yellow-500/20 text-yellow-400'}`}
                              >
                                {article.category}
                              </Badge>
                              {article.source && (
                                <span className="text-xs text-muted-foreground">
                                  {article.source}
                                </span>
                              )}
                            </div>
                            {article.pubDate && (
                              <span className="text-xs text-muted-foreground">
                                {formatPubDate(article.pubDate)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Articles */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Latest Stories
                </h3>
                {digest.articles.map((article, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                  >
                    <Card 
                      className={`bg-card/50 backdrop-blur ${importanceStyles[article.importance]} cursor-pointer hover:bg-card/70 transition-colors`}
                      onClick={() => article.link && window.open(article.link, '_blank')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-semibold text-sm leading-tight flex-1">{article.title}</h4>
                          {article.link && (
                            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{article.summary}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${categoryColors[article.category] || 'bg-muted/50'}`}
                            >
                              {article.category}
                            </Badge>
                            {article.source && (
                              <span className="text-xs text-muted-foreground">
                                {article.source}
                              </span>
                            )}
                          </div>
                          {article.pubDate && (
                            <span className="text-xs text-muted-foreground">
                              {formatPubDate(article.pubDate)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Footer */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                <Clock className="w-3 h-3" />
                <span>Updated {new Date(digest.generated_at).toLocaleTimeString()}</span>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
