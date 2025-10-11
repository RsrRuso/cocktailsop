import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Activity, TrendingUp } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

const BotManager = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingBots, setCreatingBots] = useState(false);
  const [generatingActivity, setGeneratingActivity] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
    fetchBots();
    fetchActivityLogs();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roles || roles.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "Admin privileges required",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchBots = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_bot', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bots:', error);
      return;
    }

    setBots(data || []);
  };

  const fetchActivityLogs = async () => {
    const { data, error } = await supabase
      .from('bot_activity_log')
      .select(`
        *,
        profiles:bot_id (username, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activity logs:', error);
      return;
    }

    setActivityLogs(data || []);
  };

  const handleCreateBots = async () => {
    setCreatingBots(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('bot-activity', {
        body: { action: 'create_bots' },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Created ${response.data.bots.length} bots`,
      });

      fetchBots();
    } catch (error) {
      console.error('Error creating bots:', error);
      toast({
        title: "Error",
        description: "Failed to create bots",
        variant: "destructive",
      });
    } finally {
      setCreatingBots(false);
    }
  };

  const handleGenerateActivity = async () => {
    setGeneratingActivity(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('bot-activity', {
        body: { action: 'generate_activity' },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Generated ${response.data.activities.length} activities`,
      });

      fetchActivityLogs();
    } catch (error) {
      console.error('Error generating activity:', error);
      toast({
        title: "Error",
        description: "Failed to generate activity",
        variant: "destructive",
      });
    } finally {
      setGeneratingActivity(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 pt-20 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Bot Manager</h1>

        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bot Creation
              </CardTitle>
              <CardDescription>
                Create bot accounts to simulate platform activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateBots}
                disabled={creatingBots || bots.length >= 5}
                className="w-full"
              >
                {creatingBots ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Bots...
                  </>
                ) : (
                  'Create Bot Accounts'
                )}
              </Button>
              {bots.length >= 5 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Maximum bots already created
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Generate Activity
              </CardTitle>
              <CardDescription>
                Make bots interact with content (likes, comments, follows)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerateActivity}
                disabled={generatingActivity || bots.length === 0}
                variant="secondary"
                className="w-full"
              >
                {generatingActivity ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Activity...
                  </>
                ) : (
                  'Generate Bot Activity'
                )}
              </Button>
              {bots.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Create bots first to generate activity
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Bots:</span>
                  <span className="font-semibold">{bots.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Activities:</span>
                  <span className="font-semibold">{activityLogs.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bot Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {bots.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No bots created yet
              </p>
            ) : (
              <div className="space-y-2">
                {bots.map((bot) => (
                  <div
                    key={bot.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{bot.full_name}</p>
                      <p className="text-sm text-muted-foreground">@{bot.username}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {bot.professional_title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No activity yet
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 text-sm border-b last:border-0"
                  >
                    <span className="font-medium">
                      @{log.profiles?.username}
                    </span>
                    <span className="text-muted-foreground">
                      {log.activity_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default BotManager;
