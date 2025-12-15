import { motion } from "framer-motion";
import { Bell } from "lucide-react";

export const EmptyNotifications = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        className="relative mb-6"
      >
        {/* Outer glow ring */}
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-xl animate-pulse" />
        
        {/* Icon container */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-card to-card/50 flex items-center justify-center border border-border/50 shadow-xl">
          <Bell className="w-10 h-10 text-muted-foreground" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <h3 className="text-lg font-semibold text-foreground">No notifications yet</h3>
        <p className="text-sm text-muted-foreground max-w-[250px]">
          When you get notifications, they'll show up here
        </p>
      </motion.div>
    </motion.div>
  );
};
