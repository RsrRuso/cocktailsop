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
  FileText,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  Bell,
  ScanLine,
  Store,
  ClipboardCheck,
  Upload,
  Download,
  Plus,
  Minus,
  RefreshCcw,
  FileSpreadsheet
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

  // Helper to safely extract details string - improved to handle nested objects
  const getDetailsString = (details: any): string => {
    if (!details) return '';
    if (typeof details === 'string') {
      // Check if it's a JSON string and try to parse it
      if (details.startsWith('{') || details.startsWith('[')) {
        try {
          const parsed = JSON.parse(details);
          return extractReadableInfo(parsed);
        } catch {
          return details;
        }
      }
      return details;
    }
    if (typeof details === 'object') {
      return extractReadableInfo(details);
    }
    return String(details);
  };

  // Extract meaningful info from object
  const extractReadableInfo = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    
    // Priority order for meaningful fields
    const meaningfulFields = [
      'item_name', 'name', 'product_name', 'description',
      'store_name', 'batch_name', 'recipe_name', 'title',
      'from_store', 'to_store', 'quantity', 'category'
    ];
    
    for (const field of meaningfulFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return obj[field];
      }
    }
    
    // If nothing found, try to build a description
    const parts: string[] = [];
    const name = obj.item_name || obj.name;
    const qty = obj.quantity ?? obj.received_quantity ?? obj.transfer_quantity;
    if (name) parts.push(name);
    if (qty !== undefined && qty !== null && qty !== '') parts.push(`qty: ${qty}`);
    if (obj.from_store && obj.to_store) parts.push(`${obj.from_store} → ${obj.to_store}`);
    
    return parts.length > 0 ? parts.join(' ') : '';
  };

  const getActivityInfo = () => {
    const detailsObj: any = metadata.details;
    const details = getDetailsString(detailsObj);
    const itemName = (typeof detailsObj === 'object' && detailsObj?.item_name) ? detailsObj.item_name : details;
    const receivedQty = typeof detailsObj === 'object' ? (detailsObj?.received_quantity ?? detailsObj?.quantity) : undefined;
    const transferQty = typeof detailsObj === 'object' ? (detailsObj?.transfer_quantity ?? detailsObj?.quantity) : undefined;

    const qtyBefore = metadata.quantity_before;
    const qtyAfter = metadata.quantity_after;
    const qtyChange = qtyBefore !== undefined && qtyAfter !== undefined 
      ? `(${qtyBefore} → ${qtyAfter})` 
      : '';

    switch (activity.action_type) {
      // Batch Calculator actions
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

      // FIFO & Inventory actions
      case 'receiving':
      case 'item_received':
      case 'stock_in':
      case 'received':
        return {
          icon: PackagePlus,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          text: `${username} received ${receivedQty != null ? `${receivedQty}× ` : ''}${itemName || 'item'} ${qtyChange}`.trim(),
        };
      case 'transfer':
      case 'item_transfer':
      case 'stock_transfer':
      case 'transferred':
        return {
          icon: ArrowRightLeft,
          color: 'text-blue-400',
          bg: 'bg-blue-500/20',
          text: `${username} transferred ${transferQty != null ? `${transferQty}× ` : ''}${itemName || details || 'item'} ${qtyChange}`.trim(),
        };
      case 'stock_out':
      case 'item_sold':
      case 'sold':
        return {
          icon: PackageMinus,
          color: 'text-orange-400',
          bg: 'bg-orange-500/20',
          text: `${username} sold/removed stock ${details} ${qtyChange}`.trim(),
        };
      case 'expiry_alert':
      case 'alert':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          text: `${username} flagged expiry alert ${details}`.trim(),
        };
      case 'low_stock_alert':
        return {
          icon: Bell,
          color: 'text-amber-400',
          bg: 'bg-amber-500/20',
          text: `${username} flagged low stock ${details}`.trim(),
        };
      case 'scan':
      case 'barcode_scan':
        return {
          icon: ScanLine,
          color: 'text-purple-400',
          bg: 'bg-purple-500/20',
          text: `${username} scanned item ${details}`.trim(),
        };
      case 'store_created':
      case 'add_store':
        return {
          icon: Store,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/20',
          text: `${username} added store ${details}`.trim(),
        };
      case 'inventory_update':
      case 'stock_update':
        return {
          icon: Package,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/20',
          text: `${username} updated inventory ${details} ${qtyChange}`.trim(),
        };
      case 'item_added':
      case 'add_item':
        return {
          icon: Plus,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          text: `${username} added item ${details}`.trim(),
        };
      case 'item_deleted':
      case 'delete_item':
        return {
          icon: Trash2,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          text: `${username} deleted item ${details}`.trim(),
        };
      case 'item_edited':
      case 'edit_item':
        return {
          icon: Edit,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/20',
          text: `${username} edited item ${details}`.trim(),
        };
      case 'excel_upload':
      case 'bulk_import':
        return {
          icon: Upload,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/20',
          text: `${username} imported data via Excel ${details}`.trim(),
        };
      case 'export':
      case 'pdf_export':
        return {
          icon: Download,
          color: 'text-violet-400',
          bg: 'bg-violet-500/20',
          text: `${username} exported report ${details}`.trim(),
        };
      case 'audit':
      case 'stock_check':
        return {
          icon: ClipboardCheck,
          color: 'text-teal-400',
          bg: 'bg-teal-500/20',
          text: `${username} completed stock audit ${details}`.trim(),
        };
      case 'task_complete':
        return {
          icon: FileText,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/20',
          text: `${username} completed task ${details}`.trim(),
        };
      case 'imported':
      case 'data_import':
      case 'po_import':
        return {
          icon: FileSpreadsheet,
          color: 'text-sky-400',
          bg: 'bg-sky-500/20',
          text: `${username} imported data ${details}`.trim(),
        };
      case 'synced':
      case 'sync':
      case 'data_sync':
      case 'po_sync':
        return {
          icon: RefreshCcw,
          color: 'text-lime-400',
          bg: 'bg-lime-500/20',
          text: `${username} synced data ${details}`.trim(),
        };
      default:
        return {
          icon: Activity,
          color: 'text-muted-foreground',
          bg: 'bg-muted/20',
          text: `${username} ${activity.action_type?.replace(/_/g, ' ') || 'performed action'} ${details}`.trim(),
        };
    }
  };

  const info = getActivityInfo();
  const Icon = info.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 py-2"
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
        // Mixologist group - fetch meaningful activities only
        const { data } = await supabase
          .from('batch_calculator_activity')
          .select('*')
          .eq('group_id', workspaceId)
          .in('action_type', ['recipe_complete', 'batch_submit', 'recipe_edit', 'recipe_delete', 'qr_scan', 'print_action'])
          .order('created_at', { ascending: false })
          .limit(20);
        
        // Filter out generic page_enter/tab_change activities and transform
        activities = (data || []).map(a => ({
          ...a,
          metadata: a.metadata || {}
        }));

        // Get batch productions for this group
        const { data: productions } = await supabase
          .from('batch_productions')
          .select('*')
          .eq('group_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(15);

        // Convert productions to activity format
        if (productions) {
          const productionActivities = productions.map(p => ({
            id: p.id,
            action_type: 'batch_submit',
            user_id: p.produced_by_user_id || p.user_id,
            created_at: p.created_at,
            duration_seconds: 0,
            metadata: {
              batch_name: p.batch_name,
              target_serves: p.target_serves,
              target_liters: p.target_liters,
              produced_by_name: p.produced_by_name
            }
          }));
          activities = [...activities, ...productionActivities];
        }

        // Get recipes with user info for created/updated activities
        const { data: recipes } = await supabase
          .from('batch_recipes')
          .select('id, recipe_name, user_id, created_at, updated_at')
          .eq('group_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(15);

        if (recipes) {
          // Get profile names for recipe creators
          const recipeUserIds = [...new Set(recipes.map(r => r.user_id).filter(Boolean))];
          let recipeProfiles: Record<string, string> = {};
          
          if (recipeUserIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, username, full_name')
              .in('id', recipeUserIds);
            
            if (profilesData) {
              profilesData.forEach(p => { recipeProfiles[p.id] = p.full_name || p.username || 'Unknown'; });
            }
          }

          const recipeActivities = recipes.map(r => ({
            id: `recipe-${r.id}`,
            action_type: 'recipe_complete',
            user_id: r.user_id,
            created_at: r.created_at,
            duration_seconds: 0,
            metadata: {
              recipe_name: r.recipe_name,
              produced_by_name: recipeProfiles[r.user_id]
            }
          }));
          activities = [...activities, ...recipeActivities];
        }

        // Get stats
        const { count: recipesCount } = await supabase
          .from('batch_recipes')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', workspaceId);

        const { count: batchesCount } = await supabase
          .from('batch_productions')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', workspaceId);

        // Calculate total time spent from activity durations
        const { data: timeData } = await supabase
          .from('batch_calculator_activity')
          .select('duration_seconds')
          .eq('group_id', workspaceId);

        const totalTime = (timeData || []).reduce((sum, a) => sum + (a.duration_seconds || 0), 0);

        setStats({
          totalRecipes: recipesCount || 0,
          totalBatches: batchesCount || 0,
          totalTime
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

        if (data && data.length > 0) {
          // Get all unique item_ids from the details to fetch item names
          const itemIds = [...new Set(
            data
              .map(a => (a.details as any)?.item_id)
              .filter(Boolean)
          )];
          
          let itemNames: Record<string, string> = {};
          if (itemIds.length > 0) {
            const { data: items } = await (supabase as any)
              .from('items')
              .select('id, name')
              .in('id', itemIds);
            
            if (items) {
              items.forEach((i: any) => { itemNames[i.id] = i.name; });
            }
          }

          activities = data.map(a => {
            const details = a.details as any;
            const qty = details?.quantity ?? details?.received_quantity ?? details?.transfer_quantity ?? null;

            // Add item_name + quantity to details if we have it
            const enrichedDetails = {
              ...details,
              item_name: details?.item_name || itemNames[details?.item_id] || null,
              quantity: qty
            };
            
            return {
              id: a.id,
              action_type: a.action_type,
              user_id: a.user_id,
              created_at: a.created_at,
              metadata: {
                details: enrichedDetails,
                quantity_before: a.quantity_before,
                quantity_after: a.quantity_after
              }
            };
          });
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
          <div className="p-3 text-center">
            <FlaskConical className="w-4 h-4 mx-auto mb-1 text-blue-400" />
            <p className="text-lg font-bold">{stats.totalBatches}</p>
            <p className="text-[10px] text-muted-foreground">Batches</p>
          </div>
          <div className="p-3 text-center">
            <ChefHat className="w-4 h-4 mx-auto mb-1 text-green-400" />
            <p className="text-lg font-bold">{stats.totalRecipes}</p>
            <p className="text-[10px] text-muted-foreground">Recipes</p>
          </div>
          <div className="p-3 text-center">
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