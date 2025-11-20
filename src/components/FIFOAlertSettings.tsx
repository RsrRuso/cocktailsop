import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, Mail, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AlertSettings {
  id?: string;
  days_before_expiry: number;
  alert_recipients: string[];
  enabled: boolean;
}

interface WorkspaceMember {
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export const FIFOAlertSettings = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    days_before_expiry: 30,
    alert_recipients: [],
    enabled: true,
  });
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchSettings();
      fetchMembers();
    }
  }, [currentWorkspace]);

  const fetchSettings = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('fifo_alert_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          days_before_expiry: data.days_before_expiry,
          alert_recipients: data.alert_recipients || [],
          enabled: data.enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id, profiles!inner(full_name, email)')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;
      
      const formattedMembers = (data || []).map((item: any) => ({
        user_id: item.user_id,
        profiles: {
          full_name: item.profiles.full_name || '',
          email: item.profiles.email || '',
        },
      }));
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !currentWorkspace) return;

    setLoading(true);
    try {
      const payload = {
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        days_before_expiry: settings.days_before_expiry,
        alert_recipients: settings.alert_recipients,
        enabled: settings.enabled,
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        const { error } = await supabase
          .from('fifo_alert_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('fifo_alert_settings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setSettings({ ...settings, id: data.id });
      }

      toast({
        title: 'Settings saved',
        description: 'FIFO alert settings updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-fifo-alerts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Test alert sent',
          description: result.message || 'Check your email for the test alert',
        });
      } else {
        throw new Error(result.error || 'Failed to send test alert');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    setSettings(prev => ({
      ...prev,
      alert_recipients: prev.alert_recipients.includes(userId)
        ? prev.alert_recipients.filter(id => id !== userId)
        : [...prev.alert_recipients, userId],
    }));
  };

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Select a workspace to configure FIFO alerts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          FIFO Alert Settings
        </CardTitle>
        <CardDescription>
          Configure expiration alerts for your inventory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive daily email alerts for expiring items
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, enabled: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="days">Days Before Expiry</Label>
          <Input
            id="days"
            type="number"
            min="1"
            max="365"
            value={settings.days_before_expiry}
            onChange={(e) =>
              setSettings({
                ...settings,
                days_before_expiry: parseInt(e.target.value) || 30,
              })
            }
          />
          <p className="text-sm text-muted-foreground">
            Get alerts for items expiring within this many days
          </p>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Alert Recipients
          </Label>
          <p className="text-sm text-muted-foreground">
            Select workspace members who should receive alerts (leave empty for all managers)
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {member.profiles.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.profiles.email}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.alert_recipients.includes(member.user_id)}
                  onCheckedChange={() => toggleRecipient(member.user_id)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <Button
            onClick={handleTestAlert}
            disabled={testing}
            variant="outline"
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Alert
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
