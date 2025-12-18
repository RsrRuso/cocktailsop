import { useState, useEffect } from 'react';
import { TrendingUp, ChevronDown, Eye, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfessionalDashboardProps {
  userId: string;
}

type TimePeriod = '7' | '14' | '21' | '30';

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 2 weeks' },
  { value: '21', label: 'Last 3 weeks' },
  { value: '30', label: 'Last 30 days' },
];

export const ProfessionalDashboard = ({ userId }: ProfessionalDashboardProps) => {
  const [period, setPeriod] = useState<TimePeriod>('30');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    views: 0,
    likes: 0,
    comments: 0,
    growth: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));
      const dateFilter = daysAgo.toISOString();

      try {
        // Fetch posts stats
        const { data: posts } = await supabase
          .from('posts')
          .select('view_count, like_count, comment_count, created_at')
          .eq('user_id', userId)
          .gte('created_at', dateFilter);

        // Fetch reels stats
        const { data: reels } = await supabase
          .from('reels')
          .select('view_count, like_count, comment_count, created_at')
          .eq('user_id', userId)
          .gte('created_at', dateFilter);

        // Calculate totals
        const postStats = posts?.reduce(
          (acc, post) => ({
            views: acc.views + (post.view_count || 0),
            likes: acc.likes + (post.like_count || 0),
            comments: acc.comments + (post.comment_count || 0),
          }),
          { views: 0, likes: 0, comments: 0 }
        ) || { views: 0, likes: 0, comments: 0 };

        const reelStats = reels?.reduce(
          (acc, reel) => ({
            views: acc.views + (reel.view_count || 0),
            likes: acc.likes + (reel.like_count || 0),
            comments: acc.comments + (reel.comment_count || 0),
          }),
          { views: 0, likes: 0, comments: 0 }
        ) || { views: 0, likes: 0, comments: 0 };

        const totalViews = postStats.views + reelStats.views;
        const totalLikes = postStats.likes + reelStats.likes;
        const totalComments = postStats.comments + reelStats.comments;

        // Calculate growth (compare to previous period)
        const previousStart = new Date(daysAgo);
        previousStart.setDate(previousStart.getDate() - parseInt(period));
        
        const { data: prevPosts } = await supabase
          .from('posts')
          .select('view_count')
          .eq('user_id', userId)
          .gte('created_at', previousStart.toISOString())
          .lt('created_at', dateFilter);

        const { data: prevReels } = await supabase
          .from('reels')
          .select('view_count')
          .eq('user_id', userId)
          .gte('created_at', previousStart.toISOString())
          .lt('created_at', dateFilter);

        const prevViews = 
          (prevPosts?.reduce((acc, p) => acc + (p.view_count || 0), 0) || 0) +
          (prevReels?.reduce((acc, r) => acc + (r.view_count || 0), 0) || 0);

        const growth = prevViews > 0 
          ? Math.round(((totalViews - prevViews) / prevViews) * 100) 
          : totalViews > 0 ? 100 : 0;

        setStats({
          views: totalViews,
          likes: totalLikes,
          comments: totalComments,
          growth,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [userId, period]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const selectedPeriod = TIME_PERIODS.find(p => p.value === period);

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-3">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm">Professional dashboard</p>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {selectedPeriod?.label}
            <ChevronDown className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TIME_PERIODS.map((p) => (
              <DropdownMenuItem
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={period === p.value ? 'bg-primary/10 text-primary' : ''}
              >
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats row */}
      {isLoading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      ) : (
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-bold">{formatNumber(stats.views)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">views</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Heart className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-bold">{formatNumber(stats.likes)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">likes</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-bold">{formatNumber(stats.comments)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">comments</p>
          </div>
        </div>
      )}

      {/* Growth indicator */}
      {!isLoading && (
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingUp className={`w-3.5 h-3.5 ${stats.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
          <span className={stats.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}>
            {stats.growth >= 0 ? '+' : ''}{stats.growth}%
          </span>
          <span className="text-muted-foreground">vs previous {selectedPeriod?.label.toLowerCase()}</span>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;
