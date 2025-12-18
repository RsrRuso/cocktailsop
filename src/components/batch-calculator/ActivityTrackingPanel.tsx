import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBatchActivityStats } from "@/hooks/useBatchActivityTracker";
import { 
  Clock, 
  Timer, 
  Activity, 
  Zap, 
  TrendingUp, 
  Calendar,
  ChefHat,
  FlaskConical,
  Target,
  Award,
  RefreshCw,
  Trash2,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ActivityTrackingPanelProps {
  groupId?: string | null;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const StatCard = memo(({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = "blue"
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: string;
}) => {
  const colorClasses: Record<string, string> = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    pink: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400",
    cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]} border p-4`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
        </div>
        <Icon className="w-5 h-5 opacity-60" />
      </div>
    </motion.div>
  );
});

StatCard.displayName = "StatCard";

const ActivityItem = memo(({ activity, profiles }: { activity: any; profiles: Record<string, string> }) => {
  const metadata = activity.metadata || {};
  // Use produced_by_name from metadata if available (from batch_productions), otherwise lookup profile
  const username = metadata.produced_by_name || profiles[activity.user_id] || 'Team member';

  const getActivityInfo = () => {
    switch (activity.action_type) {
      case 'recipe_complete':
        return {
          icon: ChefHat,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          text: `${username} created recipe "${metadata.recipe_name || 'Unknown'}"`,
          duration: activity.duration_seconds
        };
      case 'batch_submit':
        return {
          icon: FlaskConical,
          color: 'text-blue-400',
          bg: 'bg-blue-500/20',
          text: `${username} submitted batch "${metadata.batch_name || 'Unknown'}"`,
          duration: activity.duration_seconds,
          extra: metadata.target_serves ? `${metadata.target_serves} serves, ${metadata.target_liters || 0}L` : null
        };
      case 'qr_scan':
        return {
          icon: Target,
          color: 'text-purple-400',
          bg: 'bg-purple-500/20',
          text: `${username} scanned QR code`,
          duration: null
        };
      case 'print_action':
        return {
          icon: Award,
          color: 'text-amber-400',
          bg: 'bg-amber-500/20',
          text: `${username} printed ${metadata.type || 'document'}`,
          duration: null
        };
      case 'batch_delete':
        return {
          icon: Trash2,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          text: `${username} deleted batch "${metadata.batch_name || 'Unknown'}"`,
          duration: null,
          extra: metadata.recipe_name ? `Recipe: ${metadata.recipe_name}` : null
        };
      case 'recipe_edit':
        return {
          icon: Edit,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/20',
          text: `${username} edited recipe "${metadata.recipe_name || 'Unknown'}"`,
          duration: null
        };
      case 'recipe_delete':
        return {
          icon: Trash2,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          text: `${username} deleted recipe "${metadata.recipe_name || 'Unknown'}"`,
          duration: null
        };
      default:
        return {
          icon: Activity,
          color: 'text-muted-foreground',
          bg: 'bg-muted/20',
          text: `${username} performed ${activity.action_type}`,
          duration: activity.duration_seconds
        };
    }
  };

  const info = getActivityInfo();
  const Icon = info.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
    >
      <div className={`p-2 rounded-lg ${info.bg}`}>
        <Icon className={`w-4 h-4 ${info.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{info.text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </span>
          {info.duration && info.duration > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatDuration(info.duration)}
              </span>
            </>
          )}
          {info.extra && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-blue-400">{info.extra}</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ActivityItem.displayName = "ActivityItem";

export const ActivityTrackingPanel = memo(({ groupId }: ActivityTrackingPanelProps) => {
  const { stats, recentActivity, isLoading, refetch } = useBatchActivityStats(groupId);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  // Fetch usernames for activity
  useEffect(() => {
    const fetchProfiles = async () => {
      const userIds = [...new Set(recentActivity.map(a => a.user_id))];
      if (userIds.length === 0) return;

      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(p => { map[p.id] = p.username || 'Unknown'; });
        setProfiles(map);
      }
    };

    fetchProfiles();
  }, [recentActivity]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Activity Tracking</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="h-8 px-2"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={Clock}
          label="Total Time"
          value={formatDuration(stats?.totalTimeSpent || 0)}
          subValue="Time spent in batch calculator"
          color="blue"
        />
        <StatCard
          icon={Timer}
          label="Avg Batch Time"
          value={formatDuration(stats?.avgBatchSubmissionTime || 0)}
          subValue="From input to submission"
          color="amber"
        />
        <StatCard
          icon={ChefHat}
          label="Recipes Created"
          value={stats?.totalRecipesCreated || 0}
          subValue={`Avg ${formatDuration(stats?.avgRecipeCreationTime || 0)} per recipe`}
          color="green"
        />
        <StatCard
          icon={FlaskConical}
          label="Batches Submitted"
          value={stats?.totalBatchesSubmitted || 0}
          subValue={`${stats?.sessionsCount || 0} sessions`}
          color="purple"
        />
        <StatCard
          icon={Zap}
          label="Fastest Batch"
          value={formatDuration(stats?.fastestBatchTime || 0)}
          subValue="Best mixing time"
          color="cyan"
        />
        <StatCard
          icon={TrendingUp}
          label="Slowest Batch"
          value={formatDuration(stats?.slowestBatchTime || 0)}
          subValue="Most complex batch"
          color="pink"
        />
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
        </div>

        <AnimatePresence mode="popLayout">
          {recentActivity.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
              {recentActivity.map((activity, index) => (
                <ActivityItem 
                  key={activity.id} 
                  activity={activity} 
                  profiles={profiles}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No activity recorded yet</p>
              <p className="text-xs mt-1">Start creating recipes and batches to track your progress</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

ActivityTrackingPanel.displayName = "ActivityTrackingPanel";
