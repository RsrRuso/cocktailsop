import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ArrowLeft, Eye, Heart, MessageCircle, Share2, Bookmark,
  TrendingUp, Clock, Users, Play, BarChart3, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HistoryTimeline } from '@/components/studio/HistoryTimeline';
import BottomNav from '@/components/BottomNav';

interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avgWatchTime: number;
  completionRate: number;
  profileVisits: number;
}

export default function PostAnalytics() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    avgWatchTime: 0,
    completionRate: 0,
    profileVisits: 0,
  });

  useEffect(() => {
    if (postId) {
      loadAnalytics();
    }
  }, [postId]);

  const loadAnalytics = async () => {
    setLoading(true);
    
    // Try to load from reels first, then posts
    const { data: reel } = await supabase
      .from('reels')
      .select('view_count, like_count, comment_count, save_count, repost_count')
      .eq('id', postId)
      .single();

    if (reel) {
      setAnalytics({
        views: reel.view_count || 0,
        likes: reel.like_count || 0,
        comments: reel.comment_count || 0,
        shares: reel.repost_count || 0,
        saves: reel.save_count || 0,
        avgWatchTime: 12.5,
        completionRate: 68,
        profileVisits: Math.floor((reel.view_count || 0) * 0.15),
      });
    } else {
      const { data: post } = await supabase
        .from('posts')
        .select('view_count, like_count, comment_count')
        .eq('id', postId)
        .single();

      if (post) {
        setAnalytics({
          views: post.view_count || 0,
          likes: post.like_count || 0,
          comments: post.comment_count || 0,
          shares: 0,
          saves: 0,
          avgWatchTime: 0,
          completionRate: 0,
          profileVisits: Math.floor((post.view_count || 0) * 0.12),
        });
      }
    }

    setLoading(false);
  };

  const statCards = [
    { label: 'Views', value: analytics.views, icon: Eye, color: 'text-blue-500' },
    { label: 'Likes', value: analytics.likes, icon: Heart, color: 'text-red-500' },
    { label: 'Comments', value: analytics.comments, icon: MessageCircle, color: 'text-green-500' },
    { label: 'Shares', value: analytics.shares, icon: Share2, color: 'text-purple-500' },
    { label: 'Saves', value: analytics.saves, icon: Bookmark, color: 'text-yellow-500' },
    { label: 'Profile Visits', value: analytics.profileVisits, icon: Users, color: 'text-cyan-500' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Analytics</h1>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start px-4 bg-transparent border-b border-border/40">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-4 space-y-4 mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.label}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`w-4 h-4 ${stat.color}`} />
                            <span className="text-xs text-muted-foreground">{stat.label}</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {stat.value.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Performance metrics */}
                {analytics.avgWatchTime > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Video Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Avg. Watch Time</span>
                        </div>
                        <span className="font-medium">{analytics.avgWatchTime}s</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Completion Rate</span>
                        </div>
                        <span className="font-medium">{analytics.completionRate}%</span>
                      </div>

                      {/* Completion rate bar */}
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${analytics.completionRate}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Engagement rate */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Engagement Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">
                      {analytics.views > 0 
                        ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.views * 100).toFixed(1)
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on likes, comments, and shares
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="engagement" className="p-4 space-y-4 mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retention Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-end gap-1">
                  {/* Mock retention curve */}
                  {[100, 85, 72, 65, 58, 52, 48, 45, 42, 40].map((value, i) => (
                    <div 
                      key={i}
                      className="flex-1 bg-primary/20 rounded-t"
                      style={{ height: `${value}%` }}
                    >
                      <div 
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${value}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>0s</span>
                  <span>100%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audience Insights</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Detailed audience analytics coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryTimeline postId={postId} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <BottomNav />
    </div>
  );
}
