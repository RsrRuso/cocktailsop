import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Smartphone, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NotificationPermissionPromptProps {
  onPermissionGranted?: () => void;
  onDismiss?: () => void;
}

const DISMISSED_KEY = 'notification_prompt_dismissed';
const DISMISSED_UNTIL_KEY = 'notification_prompt_dismissed_until';

export const NotificationPermissionPrompt = ({
  onPermissionGranted,
  onDismiss
}: NotificationPermissionPromptProps) => {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) return;
    
    // Already granted
    if (Notification.permission === 'granted') return;
    
    // Already denied - respect user choice
    if (Notification.permission === 'denied') return;
    
    // Check if user dismissed temporarily
    const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;
    
    // Check if permanently dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed === 'true') return;
    
    // Show prompt after a short delay
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onPermissionGranted?.();
        // Show a test notification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification('Notifications Enabled! 🎉', {
            body: 'You\'ll now receive updates from SV',
            icon: '/icon-192.png',
            badge: '/icon-192.png'
          });
        } else {
          new Notification('Notifications Enabled! 🎉', {
            body: 'You\'ll now receive updates from SV',
            icon: '/icon-192.png'
          });
        }
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
    setVisible(false);
    setRequesting(false);
  };

  const handleDismissTemporary = () => {
    // Dismiss for 24 hours
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    setVisible(false);
    onDismiss?.();
  };

  const handleDismissPermanent = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-3xl p-5 shadow-2xl shadow-primary/10">
          {/* Close button */}
          <button
            onClick={handleDismissTemporary}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Icon and content */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Bell className="w-7 h-7 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-bold text-lg mb-1">Stay in the loop</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get instant updates for likes, comments, messages, and more
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Alerts</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Push</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/30">
              <Volume2 className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Sound</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissPermanent}
              className="flex-1 h-11 rounded-xl text-muted-foreground"
            >
              <BellOff className="w-4 h-4 mr-2" />
              Not now
            </Button>
            <Button
              onClick={handleRequestPermission}
              disabled={requesting}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {requesting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Enabling...
                </span>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPermissionPrompt;
