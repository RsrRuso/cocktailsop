import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('SW Registered:', swUrl);
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

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
