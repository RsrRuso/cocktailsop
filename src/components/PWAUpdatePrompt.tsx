import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

function PWAUpdatePromptInner() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW Registered:', swUrl);
      // Check for updates every 4 hours (reduced from 1 hour to save resources)
      if (registration && !intervalRef.current) {
        intervalRef.current = setInterval(() => {
          // Only check when tab is visible
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        }, 4 * 60 * 60 * 1000); // 4 hours
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast.info('Update Available', {
        description: 'A new version is available. Reload to update.',
        duration: Infinity,
        action: {
          label: (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload
            </div>
          ),
          onClick: () => {
            updateServiceWorker(true);
            setNeedRefresh(false);
          },
        },
        onDismiss: () => setNeedRefresh(false),
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

export function PWAUpdatePrompt() {
  // Avoid SW registration in dev/preview AND Lovable preview domains to prevent cached chunks
  // from hiding the latest updates during development.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLovablePreview = host.endsWith(".lovable.app") || host.endsWith(".lovable.dev");

  if (!import.meta.env.PROD || isLovablePreview) return null;
  return <PWAUpdatePromptInner />;
}

