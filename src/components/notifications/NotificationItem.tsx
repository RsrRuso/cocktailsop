import { memo } from "react";
import { motion } from "framer-motion";
import { 
  Bell, Heart, MessageCircle, UserPlus, Eye, Send, UserMinus, 
  Image, Video, Music, MessageSquare, UserCheck, Calendar, 
  CalendarCheck, Settings, Package, FlaskConical, ClipboardList, 
  Trash2, Users, Award, ShoppingCart, FileText, Briefcase
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  post_id?: string;
  reel_id?: string;
  story_id?: string;
  music_share_id?: string;
  event_id?: string;
  reference_user_id?: string;
}

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  index: number;
}

// Work-related notification types and their tool mapping
const WORK_NOTIFICATION_TOOLS: Record<string, { tool: string; color: string }> = {
  // FIFO/Workspace
  access_request: { tool: "FIFO Workspace", color: "bg-orange-500/20 text-orange-400" },
  access_granted: { tool: "Workspace", color: "bg-emerald-500/20 text-emerald-400" },
  access_denied: { tool: "Workspace", color: "bg-red-500/20 text-red-400" },
  
  // Inventory
  stock_alert: { tool: "Inventory", color: "bg-red-500/20 text-red-400" },
  fifo_alert: { tool: "FIFO Manager", color: "bg-amber-500/20 text-amber-400" },
  inventory_transfer: { tool: "Inventory", color: "bg-blue-500/20 text-blue-400" },
  inventory_receiving: { tool: "Inventory", color: "bg-green-500/20 text-green-400" },
  spot_check: { tool: "Inventory", color: "bg-purple-500/20 text-purple-400" },
  
  // Batch Calculator
  batch_submission: { tool: "Batch Calculator", color: "bg-blue-500/20 text-blue-400" },
  batch_edit: { tool: "Batch Calculator", color: "bg-yellow-500/20 text-yellow-400" },
  batch_delete: { tool: "Batch Calculator", color: "bg-red-500/20 text-red-400" },
  recipe_created: { tool: "Batch Calculator", color: "bg-green-500/20 text-green-400" },
  member_added: { tool: "Groups", color: "bg-cyan-500/20 text-cyan-400" },
  
  // Procurement - actual database types
  purchase_order: { tool: "Purchase Orders", color: "bg-blue-500/20 text-blue-400" },
  receiving: { tool: "Receiving", color: "bg-green-500/20 text-green-400" },
  po_created: { tool: "Purchase Orders", color: "bg-blue-500/20 text-blue-400" },
  po_received: { tool: "Receiving", color: "bg-green-500/20 text-green-400" },
  
  // Other work
  internal_email: { tool: "Email", color: "bg-indigo-500/20 text-indigo-400" },
};

export const isWorkNotification = (type: string): boolean => {
  return type in WORK_NOTIFICATION_TOOLS;
};

const getNotificationConfig = (type: string) => {
  const configs: Record<string, { icon: any; bg: string; color: string }> = {
    like: { icon: Heart, bg: "bg-red-500/20", color: "text-red-500" },
    comment: { icon: MessageCircle, bg: "bg-blue-500/20", color: "text-blue-500" },
    follow: { icon: UserPlus, bg: "bg-emerald-500/20", color: "text-emerald-500" },
    unfollow: { icon: UserMinus, bg: "bg-orange-500/20", color: "text-orange-500" },
    profile_view: { icon: Eye, bg: "bg-purple-500/20", color: "text-purple-500" },
    message: { icon: Send, bg: "bg-cyan-500/20", color: "text-cyan-500" },
    new_post: { icon: Image, bg: "bg-blue-400/20", color: "text-blue-400" },
    new_reel: { icon: Video, bg: "bg-pink-500/20", color: "text-pink-500" },
    new_music: { icon: Music, bg: "bg-green-400/20", color: "text-green-400" },
    new_story: { icon: MessageSquare, bg: "bg-yellow-500/20", color: "text-yellow-500" },
    new_event: { icon: Calendar, bg: "bg-purple-500/20", color: "text-purple-500" },
    event_attendance: { icon: CalendarCheck, bg: "bg-indigo-500/20", color: "text-indigo-500" },
    new_user: { icon: UserCheck, bg: "bg-emerald-500/20", color: "text-emerald-500" },
    access_request: { icon: Settings, bg: "bg-orange-500/20", color: "text-orange-500" },
    access_granted: { icon: UserCheck, bg: "bg-emerald-500/20", color: "text-emerald-500" },
    access_denied: { icon: UserMinus, bg: "bg-red-500/20", color: "text-red-500" },
    stock_alert: { icon: Package, bg: "bg-red-500/20", color: "text-red-500" },
    fifo_alert: { icon: Package, bg: "bg-amber-500/20", color: "text-amber-500" },
    inventory_transfer: { icon: Package, bg: "bg-blue-500/20", color: "text-blue-500" },
    inventory_receiving: { icon: Package, bg: "bg-green-500/20", color: "text-green-500" },
    spot_check: { icon: ClipboardList, bg: "bg-purple-500/20", color: "text-purple-500" },
    batch_submission: { icon: FlaskConical, bg: "bg-blue-500/20", color: "text-blue-500" },
    batch_edit: { icon: ClipboardList, bg: "bg-yellow-500/20", color: "text-yellow-500" },
    batch_delete: { icon: Trash2, bg: "bg-red-500/20", color: "text-red-500" },
    recipe_created: { icon: ClipboardList, bg: "bg-green-500/20", color: "text-green-500" },
    member_added: { icon: Users, bg: "bg-cyan-500/20", color: "text-cyan-500" },
    certificate_earned: { icon: Award, bg: "bg-amber-500/20", color: "text-amber-500" },
    // Procurement - both legacy and actual types
    po_created: { icon: ShoppingCart, bg: "bg-blue-500/20", color: "text-blue-500" },
    po_received: { icon: FileText, bg: "bg-green-500/20", color: "text-green-500" },
    purchase_order: { icon: ShoppingCart, bg: "bg-blue-500/20", color: "text-blue-500" },
    receiving: { icon: FileText, bg: "bg-green-500/20", color: "text-green-500" },
    internal_email: { icon: Send, bg: "bg-indigo-500/20", color: "text-indigo-500" },
    default: { icon: Bell, bg: "bg-primary/20", color: "text-primary" },
  };

  return configs[type] || configs.default;
};

export const NotificationItem = memo(({ notification, onClick, index }: NotificationItemProps) => {
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;
  const isWork = isWorkNotification(notification.type);
  const workInfo = isWork ? WORK_NOTIFICATION_TOOLS[notification.type] : null;
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      onClick={() => onClick(notification)}
      className={`
        group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer
        transition-all duration-300 ease-out
        ${notification.read 
          ? "bg-card/30 hover:bg-card/50" 
          : "bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 shadow-sm shadow-primary/10"
        }
        backdrop-blur-sm border border-transparent
        hover:border-border/50 hover:shadow-lg hover:shadow-black/5
        active:scale-[0.98]
      `}
    >
      {/* Icon Container */}
      <div className={`
        relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center
        ${config.bg} transition-transform duration-300 group-hover:scale-110
      `}>
        <Icon className={`w-5 h-5 ${config.color}`} fill={notification.type === 'like' ? 'currentColor' : 'none'} />
        
        {/* Unread indicator */}
        {!notification.read && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Tool Badge for Work Notifications */}
        {isWork && workInfo && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${workInfo.color}`}>
              <Briefcase className="w-2.5 h-2.5" />
              {workInfo.tool}
            </span>
          </div>
        )}
        
        <p className={`text-sm leading-snug line-clamp-2 ${!notification.read ? "font-medium" : "text-foreground/90"}`}>
          {notification.content}
        </p>
        <p className="text-xs text-muted-foreground">
          {timeAgo}
        </p>
      </div>

      {/* Arrow indicator on hover */}
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
});

NotificationItem.displayName = "NotificationItem";
