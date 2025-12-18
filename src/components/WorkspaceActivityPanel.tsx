import { memo, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  Timer, 
  Activity, 
  ChefHat,
  FlaskConical,
  Target,
  Award,
  RefreshCw,
  Trash2,
  Edit,
  Calendar,
  Package,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface WorkspaceActivityPanelProps {
  workspaceId: string;
  workspaceType: 'workspace' | 'group' | 'team' | 'procurement' | 'fifo';
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const ActivityItem = memo(({ activity, profiles }: { activity: any; profiles: Record<string, string> }) => {
  const metadata = activity.metadata || {};
  const username = metadata.produced_by_name || profiles[activity.user_id] || 'Team member';

  const getActivityInfo = () => {
    switch (activity.action_type) {
      case 'recipe_complete':
        return {
          icon: ChefHat,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          text: `${username} created recipe "${metadata.recipe_name || 'Unknown'}"`,
        };
      case 'batch_submit':
        return {
          icon: FlaskConical,
          color: 'text-blue-400',
          bg: 'bg-blue-500/20',
          text: `${username} submitted batch "${metadata.batch_name || 'Unknown'}"`,
          extra: metadata.target_serves ? `${metadata.target_serves} serves` : null
        };
      case 'qr_scan':
        return {
          icon: Target,
          color: 'text-purple-400',
          bg: 'bg-purple-500/20',
          text: `${username} scanned QR code`,
        };
      case 'print_action':
        return {
          icon: Award,
          color: 'text-amber-400',
          bg: 'bg-amber-500/20',
          text: `${username} printed ${metadata.type || 'document'}`,
        };
      case 'batch_delete':
        return {
          icon: Trash2,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          text: `${username} deleted batch`,
        };
      case 'recipe_edit':
        return {
          icon: Edit,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/20',
          text: `${username} edited recipe`,
        };
      case 'inventory_update':
        return {
          icon: Package,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/20',
          text: `${username} updated inventory`,
        };
      case 'task_complete':
        return {
          icon: FileText,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/20',
          text: `${username} completed task`,
        };
      default:
        return {
          icon: Activity,
          color: 'text-muted-foreground',
          bg: 'bg-muted/20',
          text: `${username} performed action`,
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
      <div className={`p-2 rounded-lg ${info.bg} flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${info.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm line-clamp-2">{info.text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </span>
          {activity.duration_seconds > 0 && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatDuration(activity.duration_seconds)}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ActivityItem.displayName = "ActivityItem";

export const WorkspaceActivityPanel = memo(({ workspaceId, workspaceType }: WorkspaceActivityPanelProps) => {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalBatches: 0, totalRecipes: 0, totalTime: 0 });

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    try {
      let activities: any[] = [];
      
      // Fetch based on workspace type
      if (workspaceType === 'group') {
        // Mixologist group - use batch_calculator_activity
        const { data } = await supabase
          .from('batch_calculator_activity')
          .select('*')
          .eq('group_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        activities = data || [];

        // Also get batch productions for this group
        const { data: productions } = await supabase
          .from('batch_productions')
          .select('*')
          .eq('group_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Convert productions to activity format
        if (productions) {
          const productionActivities = productions.map(p => ({
            id: p.id,
            action_type: 'batch_submit',
            user_id: p.produced_by_user_id || p.user_id,
            created_at: p.created_at,
            metadata: {
              batch_name: p.batch_name,
              target_serves: p.target_serves,
              produced_by_name: p.produced_by_name
            }
          }));
          activities = [...activities, ...productionActivities];
        }

        // Get recipes count for this specific group only
        const { count: recipesCount } = await supabase
          .from('batch_recipes')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', workspaceId);

        const { count: batchesCount } = await supabase
          .from('batch_productions')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', workspaceId);

        setStats({
          totalRecipes: recipesCount || 0,
          totalBatches: batchesCount || 0,
          totalTime: activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0)
        });
      } else if (workspaceType === 'fifo') {
        // FIFO workspace - use fifo_activity_log
        const { data } = await supabase
          .from('fifo_activity_log')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (data) {
          activities = data.map(a => ({
            id: a.id,
            action_type: a.action_type,
            user_id: a.user_id,
            created_at: a.created_at,
            metadata: {
              details: a.details,
              quantity_before: a.quantity_before,
              quantity_after: a.quantity_after
            }
          }));
        }

        setStats({ totalBatches: 0, totalRecipes: 0, totalTime: 0 });
      } else if (workspaceType === 'workspace') {
        // Store management workspace - use inventory_activity_log
        const { data } = await supabase
          .from('inventory_activity_log')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (data) {
          activities = data.map(a => ({
            id: a.id,
            action_type: a.action_type,
            user_id: a.user_id,
            created_at: a.created_at,
            metadata: {
              details: a.details,
              quantity_before: a.quantity_before,
              quantity_after: a.quantity_after
            }
          }));
        }

        setStats({ totalBatches: 0, totalRecipes: 0, totalTime: 0 });
      } else {
        // For team, procurement - no dedicated activity table yet
        setStats({ totalBatches: 0, totalRecipes: 0, totalTime: 0 });
      }

      // Sort by date and deduplicate
      const sorted = activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      setRecentActivity(sorted);

      // Fetch profiles for user IDs
      const userIds = [...new Set(sorted.map(a => a.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', userIds);

        if (profilesData) {
          const map: Record<string, string> = {};
          profilesData.forEach(p => { map[p.id] = p.full_name || p.username || 'Unknown'; });
          setProfiles(map);
        }
      }
    } catch (error) {
      console.error('Error fetching workspace activity:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, workspaceType]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      {(stats.totalBatches > 0 || stats.totalRecipes > 0) && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <FlaskConical className="w-4 h-4 mx-auto mb-1 text-blue-400" />
            <p className="text-lg font-bold">{stats.totalBatches}</p>
            <p className="text-[10px] text-muted-foreground">Batches</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <ChefHat className="w-4 h-4 mx-auto mb-1 text-green-400" />
            <p className="text-lg font-bold">{stats.totalRecipes}</p>
            <p className="text-[10px] text-muted-foreground">Recipes</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <p className="text-lg font-bold">{formatDuration(stats.totalTime)}</p>
            <p className="text-[10px] text-muted-foreground">Time</p>
          </div>
        </div>
      )}

      {/* Activity Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Recent Activity</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchActivity} className="h-7 px-2">
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Activity List */}
      <AnimatePresence mode="popLayout">
        {recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map((activity) => (
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
            <p className="text-xs mt-1">Activity will appear here as team members work</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

WorkspaceActivityPanel.displayName = "WorkspaceActivityPanel";