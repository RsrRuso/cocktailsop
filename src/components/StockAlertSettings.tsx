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
import { Bell, Loader2, Mail, Users, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AlertSettings {
  id?: string;
  minimum_quantity_threshold: number;
  alert_recipients: string[];
  enabled: boolean;
  alert_time?: string;
}

interface WorkspaceMember {
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export const StockAlertSettings = () => {
  const { user, profile } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<AlertSettings>({
    minimum_quantity_threshold: 10,
    alert_recipients: [],
    enabled: true,
    alert_time: '09:00',
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
        .from('stock_alert_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          id: data.id,
          minimum_quantity_threshold: data.minimum_quantity_threshold,
          alert_recipients: data.alert_recipients || [],
          enabled: data.enabled,
          alert_time: data.alert_time || '09:00',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspace || !user) return;

    try {
      const { data: memberRows, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', currentWorkspace.id);

      if (membersError) throw membersError;

      const userIds = new Set<string>();

      (memberRows || []).forEach((row: any) => {
        if (row.user_id) userIds.add(row.user_id);
      });

      if (currentWorkspace.owner_id) {
        userIds.add(currentWorkspace.owner_id);
      }

      userIds.add(user.id);

      const idArray = Array.from(userIds);

      if (idArray.length === 0) {
        setMembers([]);
        toast({
          title: 'No recipients found',
          description: 'Add members to this workspace to select them as recipients.',
        });
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', idArray);

      if (profilesError) throw profilesError;

      const allMembers: WorkspaceMember[] = (profilesData || []).map((p: any) => ({
        user_id: p.id,
        profiles: {
          full_name: p.full_name || (p.id === user.id ? 'You' : 'Team Member'),
          email: p.email || (p.id === user.id ? user.email || '' : ''),
        },
      }));

      setMembers(allMembers);

      if (allMembers.length === 0) {
        toast({
          title: 'No recipients found',
          description: 'Add members to this workspace to select them as recipients.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error loading members',
        description: error?.message || 'Failed to load workspace members',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!user || !currentWorkspace) return;

    setLoading(true);
    try {
      const payload = {
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        minimum_quantity_threshold: settings.minimum_quantity_threshold,
        alert_recipients: settings.alert_recipients,
        enabled: settings.enabled,
        alert_time: settings.alert_time || '09:00',
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        const { error } = await supabase
          .from('stock_alert_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('stock_alert_settings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setSettings({ ...settings, id: data.id });
      }

      toast({
        title: 'Settings saved',
        description: 'Stock alert settings updated successfully',
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
    if (!currentWorkspace) {
      toast({
        title: 'Select a workspace',
        description: 'Please choose a workspace before sending a test alert.',
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-stock-alerts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            test: true,
          }),
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Alert Settings
          </CardTitle>
          <CardDescription>
            Configure low stock alerts for your inventory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 bg-accent/5 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <Label className="text-sm font-medium">Current Workspace:</Label>
            </div>
            <Select
              value={currentWorkspace?.id || 'personal'}
              onValueChange={(value) => switchWorkspace(value === 'personal' ? '' : value)}
            >
              <SelectTrigger className="w-[300px] bg-background border-border">
                <SelectValue placeholder="Select workspace..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="personal">
                  Personal Inventory
                </SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem 
                    key={workspace.id} 
                    value={workspace.id}
                  >
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <p className="text-muted-foreground text-center py-4">
            Select a workspace above to configure stock alerts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Stock Alert Settings
        </CardTitle>
        <CardDescription>
          Configure low stock alerts for your inventory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4 p-4 bg-accent/5 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <Label className="text-sm font-medium">Current Workspace:</Label>
          </div>
          <Select
            value={currentWorkspace?.id || 'personal'}
            onValueChange={(value) => switchWorkspace(value === 'personal' ? '' : value)}
          >
            <SelectTrigger className="w-[300px] bg-background border-border">
              <SelectValue placeholder="Select workspace..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              <SelectItem value="personal">
                Personal Inventory
              </SelectItem>
              {workspaces.map((workspace) => (
                <SelectItem 
                  key={workspace.id} 
                  value={workspace.id}
                >
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Receive daily email alerts for low stock items
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
          <Label htmlFor="threshold">Minimum Quantity Threshold</Label>
          <Input
            id="threshold"
            type="number"
            min="1"
            max="100"
            value={settings.minimum_quantity_threshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                minimum_quantity_threshold: parseInt(e.target.value) || 10,
              })
            }
            disabled={!settings.enabled}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Get alerts when item quantity falls to {settings.minimum_quantity_threshold} or below
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Daily Alert Time</Label>
          <Input
            id="time"
            type="time"
            value={settings.alert_time || '09:00'}
            onChange={(e) => setSettings({ ...settings, alert_time: e.target.value })}
            disabled={!settings.enabled}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Time of day to send daily alerts (in your local timezone)
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Alert Recipients ({settings.alert_recipients.length} selected)
            </Label>
            {settings.alert_recipients.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettings({ ...settings, alert_recipients: [] })}
                disabled={!settings.enabled}
              >
                Clear All
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Select workspace members who will receive low stock alert emails
          </p>
          
          {members.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground italic border rounded-md p-4 bg-muted/20">
                No workspace members found.
              </p>
              <p className="text-xs text-muted-foreground">
                Invite members to your workspace to send them alert emails.
              </p>
              <p className="text-xs text-primary/80">
                Current workspace: <span className="font-semibold">{currentWorkspace.name}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto border rounded-md p-3 bg-accent/5">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between py-2 hover:bg-accent/50 rounded px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold border-2 border-primary/20">
                      {member.profiles.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.profiles.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.profiles.email}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.alert_recipients.includes(member.user_id)}
                    onCheckedChange={() => toggleRecipient(member.user_id)}
                    disabled={!settings.enabled}
                  />
                </div>
              ))}
            </div>
          )}
          
          {settings.alert_recipients.length > 0 && (
            <div className="mt-2 p-3 bg-primary/5 rounded-md border">
              <p className="text-xs font-medium mb-1">Selected recipients will receive:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Daily email alerts at {settings.alert_time || '09:00'}</li>
                <li>Details of items with quantity ≤ {settings.minimum_quantity_threshold}</li>
                <li>Sorted by lowest quantities first</li>
              </ul>
            </div>
          )}
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
