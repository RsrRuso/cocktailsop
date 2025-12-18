import { useState, useEffect } from 'react';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProfessionalDashboardProps {
  userId: string;
}

type TimePeriod = '7' | '14' | '21' | '30';

const PERIOD_LABELS: Record<TimePeriod, string> = {
  '7': '7 days',
  '14': '2 weeks',
  '21': '3 weeks',
  '30': '30 days',
};

export const ProfessionalDashboard = ({ userId }: ProfessionalDashboardProps) => {
  const [period, setPeriod] = useState<TimePeriod>('30');
  const [views, setViews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchViews = async () => {
      setIsLoading(true);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      try {
        const [{ data: posts }, { data: reels }] = await Promise.all([
          supabase
            .from('posts')
            .select('view_count')
            .eq('user_id', userId)
            .gte('created_at', daysAgo.toISOString()),
          supabase
            .from('reels')
            .select('view_count')
            .eq('user_id', userId)
            .gte('created_at', daysAgo.toISOString()),
        ]);

        const total =
          (posts?.reduce((acc, p) => acc + (p.view_count || 0), 0) || 0) +
          (reels?.reduce((acc, r) => acc + (r.view_count || 0), 0) || 0);

        setViews(total);
      } catch (error) {
        console.error('Error fetching views:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViews();
  }, [userId, period]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const cyclePeriod = () => {
    const periods: TimePeriod[] = ['7', '14', '21', '30'];
    const currentIndex = periods.indexOf(period);
    const nextIndex = (currentIndex + 1) % periods.length;
    setPeriod(periods[nextIndex]);
  };

  return (
    <button
      onClick={cyclePeriod}
      className="w-full bg-muted/40 rounded-xl px-4 py-3 flex items-center justify-between text-left hover:bg-muted/60 transition-colors"
    >
      <div>
        <p className="font-semibold text-sm">Professional dashboard</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs text-muted-foreground">
            {isLoading ? '...' : formatNumber(views)} views in the last {PERIOD_LABELS[period]}.
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
};

export default ProfessionalDashboard;
