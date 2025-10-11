import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationSettings = () => {
  const [open, setOpen] = useState(false);
  const { permissionGranted, requestPermission } = usePushNotifications();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(permissionGranted);
  }, [permissionGranted]);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestPermission();
      setEnabled(granted);
    } else {
      setEnabled(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Push Notifications</DialogTitle>
          <DialogDescription>
            Receive notifications directly on your device for messages and updates
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="push-notifications" className="text-base">
                Enable Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified instantly with high quality sound alerts
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>
        {enabled && (
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Notifications Active</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive push notifications for new messages and updates
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
