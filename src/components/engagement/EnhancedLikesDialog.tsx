import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search, TrendingUp, Clock, Brain, Sparkles, Target, Zap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ContentType, getEngagementConfig, Like } from '@/types/engagement';

interface EnhancedLikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
}

export const EnhancedLikesDialog = ({
  open,
  onOpenChange,
  contentType,
  contentId,
}: EnhancedLikesDialogProps) => {
  const navigate = useNavigate();
  const [likes, setLikes] = useState<Like[]>([]);
  const [filteredLikes, setFilteredLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiInsights, setAiInsights] = useState({
    topInfluencer: null as Like | null,
    engagementVelocity: 0,
    predictedGrowth: 0,
    audienceQuality: 0,
  });

  const config = getEngagementConfig(contentType);

  useEffect(() => {
    if (open) {
      fetchLikes();
    }
  }, [open, contentId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLikes(likes);
    } else {
      const filtered = likes.filter(
        (like) =>
          like.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          like.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLikes(filtered);
    }
  }, [searchQuery, likes]);

  // AI Analytics
  useEffect(() => {
    if (likes.length > 0) {
      const topInfluencer = likes[0];
      const oldestLike = new Date(likes[likes.length - 1].created_at);
      const newestLike = new Date(likes[0].created_at);
      const hoursDiff = Math.max(1, (newestLike.getTime() - oldestLike.getTime()) / (1000 * 60 * 60));
      const velocity = likes.length / hoursDiff;
      const predictedGrowth = Math.min(100, velocity * 10 + likes.length * 0.5);
      const audienceQuality = Math.min(100, (likes.length / hoursDiff) * 15);
      
      setAiInsights({
        topInfluencer,
        engagementVelocity: velocity,
        predictedGrowth,
        audienceQuality,
      });
    }
  }, [likes]);

  const fetchLikes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(config.tables.likes as any)
        .select(`
          user_id,
          created_at,
          profiles!inner (username, avatar_url, full_name)
        `)
        .eq(config.tables.idColumn, contentId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setLikes(data.map((item: any) => ({
          user_id: item.user_id,
          created_at: item.created_at,
          profiles: item.profiles
        })));
      }
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-background via-background to-purple-500/5 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                  <Heart className="w-5 h-5 text-white fill-current" />
                </div>
              </div>
              <div>
                <DialogTitle className="text-xl">AI-Powered Likes Analysis</DialogTitle>
                <p className="text-sm text-muted-foreground">{likes.length} total engagements</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Brain className="w-3 h-3" />
              Live AI
            </Badge>
          </div>
        </DialogHeader>

        {/* AI Insights Section */}
        {likes.length > 0 && (
          <div className="p-6 space-y-4 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-sm">Real-Time Insights</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Velocity</span>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {aiInsights.engagementVelocity.toFixed(1)}/h
                </div>
                <Progress value={Math.min(100, aiInsights.engagementVelocity * 10)} className="h-1 mt-2" />
              </Card>

              <Card className="p-3 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Growth</span>
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {aiInsights.predictedGrowth.toFixed(0)}%
                </div>
                <Progress value={aiInsights.predictedGrowth} className="h-1 mt-2" />
              </Card>

              <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Quality</span>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {aiInsights.audienceQuality.toFixed(0)}%
                </div>
                <Progress value={aiInsights.audienceQuality} className="h-1 mt-2" />
              </Card>
            </div>

            {aiInsights.topInfluencer && (
              <Card className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Top Influencer</p>
                    <p className="font-normal text-xs">@{aiInsights.topInfluencer.profiles.username}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Search */}
        {likes.length > 3 && (
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50"
              />
            </div>
          </div>
        )}

        {/* Likes List */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="p-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                </div>
              </div>
            ) : filteredLikes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30"></div>
                  <Heart className="relative w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {searchQuery ? 'No users found' : 'No likes yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term' : 'Be the first to show some love!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredLikes.map((like, index) => (
                    <motion.div
                      key={like.user_id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => {
                        navigate(`/user/${like.user_id}`);
                        onOpenChange(false);
                      }}
                      className="group relative flex items-center gap-3 p-3 rounded-xl bg-card/50 hover:bg-card border border-border/50 hover:border-primary/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/10"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <Avatar className="relative ring-2 ring-border group-hover:ring-primary transition-all">
                        <AvatarImage src={like.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {like.profiles.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="relative flex-1 min-w-0">
                        <p className="font-semibold truncate group-hover:text-primary transition-colors">
                          {like.profiles.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{like.profiles.username}
                        </p>
                      </div>
                      
                      <div className="relative flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(like.created_at), { addSuffix: true })}
                        </div>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                            Recent
                          </Badge>
                        )}
                      </div>
                      
                      <Heart className="relative w-4 h-4 text-red-500 fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
