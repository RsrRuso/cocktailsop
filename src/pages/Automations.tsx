import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Zap, Workflow, Activity, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateWebhookDialog } from "@/components/automation/CreateWebhookDialog";
import { CreateTriggerDialog } from "@/components/automation/CreateTriggerDialog";
import { WebhooksList } from "@/components/automation/WebhooksList";
import { TriggersList } from "@/components/automation/TriggersList";
import { AutomationLogs } from "@/components/automation/AutomationLogs";
import { AutomationGettingStarted } from "@/components/automation/AutomationGettingStarted";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Automations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createWebhookOpen, setCreateWebhookOpen] = useState(false);
  const [createTriggerOpen, setCreateTriggerOpen] = useState(false);

  // Fetch webhooks
  const { data: webhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ['automation-webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_webhooks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch triggers
  const { data: triggers, refetch: refetchTriggers } = useQuery({
    queryKey: ['automation-triggers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_triggers')
        .select('*, automation_webhooks(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent logs
  const { data: logs } = useQuery({
    queryKey: ['automation-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const handleWebhookCreated = () => {
    refetchWebhooks();
    setCreateWebhookOpen(false);
    toast({
      title: "Success",
      description: "Webhook created successfully",
    });
  };

  const handleTriggerCreated = () => {
    refetchTriggers();
    setCreateTriggerOpen(false);
    toast({
      title: "Success",
      description: "Trigger created successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto px-4 pt-20 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              Automation Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect and automate your workflows
            </p>
          </div>
        </div>

        {/* Getting Started Guide - Show when no webhooks */}
        {(!webhooks || webhooks.length === 0) && (
          <div className="mb-6">
            <AutomationGettingStarted onCreateWebhook={() => setCreateWebhookOpen(true)} />
          </div>
        )}

        {/* Integration Cards */}
        {webhooks && webhooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Zapier</h3>
                <p className="text-sm text-muted-foreground">5000+ Apps</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect to Gmail, Slack, Notion, and thousands more
            </p>
          </Card>

          <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Workflow className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Make</h3>
                <p className="text-sm text-muted-foreground">1000+ Apps</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Visual automation platform for complex workflows
            </p>
          </Card>

          <Card className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">n8n</h3>
                <p className="text-sm text-muted-foreground">Fair-code</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Self-hosted workflow automation alternative
            </p>
          </Card>
        </div>
        )}

        {/* Main Content */}
        {webhooks && webhooks.length > 0 && (
        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="webhooks">
              <Zap className="w-4 h-4 mr-2" />
              Webhooks ({webhooks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="triggers">
              <Workflow className="w-4 h-4 mr-2" />
              Triggers ({triggers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Activity className="w-4 h-4 mr-2" />
              Logs ({logs?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Manage your webhook endpoints for external integrations
              </p>
              <Button onClick={() => setCreateWebhookOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Webhook
              </Button>
            </div>
            <WebhooksList 
              webhooks={webhooks || []} 
              onUpdate={refetchWebhooks}
            />
          </TabsContent>

          <TabsContent value="triggers" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Configure which events trigger your automations
              </p>
              <Button onClick={() => setCreateTriggerOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Trigger
              </Button>
            </div>
            <TriggersList 
              triggers={triggers || []} 
              onUpdate={refetchTriggers}
            />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View execution history and debug automation issues
            </p>
            <AutomationLogs logs={logs || []} />
          </TabsContent>
        </Tabs>
        )}
      </div>

      <CreateWebhookDialog 
        open={createWebhookOpen}
        onOpenChange={setCreateWebhookOpen}
        onSuccess={handleWebhookCreated}
      />

      <CreateTriggerDialog
        open={createTriggerOpen}
        onOpenChange={setCreateTriggerOpen}
        webhooks={webhooks || []}
        onSuccess={handleTriggerCreated}
      />

      <BottomNav />
    </div>
  );
};

export default Automations;