import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Play, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TriggersListProps {
  triggers: any[];
  onUpdate: () => void;
}

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  new_post: "New Post",
  new_follower: "New Follower",
  new_message: "New Message",
  new_event: "New Event",
  new_music_share: "New Music Share",
  schedule: "Scheduled",
  custom: "Custom Event",
};

export const TriggersList = ({ triggers, onUpdate }: TriggersListProps) => {
  const { toast } = useToast();

  const toggleTrigger = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('automation_triggers')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update trigger",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Trigger ${!currentState ? 'enabled' : 'disabled'}`,
      });
      onUpdate();
    }
  };

  const deleteTrigger = async (id: string) => {
    const { error } = await supabase
      .from('automation_triggers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete trigger",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Trigger deleted",
      });
      onUpdate();
    }
  };

  const testTrigger = async (trigger: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('trigger-automation', {
        body: {
          triggerId: trigger.id,
          payload: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;

      toast({
        title: data.success ? "Success" : "Failed",
        description: data.success ? "Test automation triggered successfully" : "Automation test failed",
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing trigger:', error);
      toast({
        title: "Error",
        description: "Failed to test trigger",
        variant: "destructive",
      });
    }
  };

  if (triggers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Workflow className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No triggers configured</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add triggers to automate actions when events occur
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {triggers.map((trigger) => (
        <Card key={trigger.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{trigger.name}</h3>
                <Badge variant={trigger.is_active ? "default" : "secondary"}>
                  {trigger.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">
                  {TRIGGER_TYPE_LABELS[trigger.trigger_type] || trigger.trigger_type}
                </Badge>
              </div>
              
              {trigger.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {trigger.description}
                </p>
              )}

              {trigger.automation_webhooks && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Webhook:</span>
                  <Badge variant="secondary">
                    {trigger.automation_webhooks.name}
                  </Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testTrigger(trigger)}
                title="Test trigger"
              >
                <Play className="w-4 h-4" />
              </Button>
              <Switch
                checked={trigger.is_active}
                onCheckedChange={() => toggleTrigger(trigger.id, trigger.is_active)}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteTrigger(trigger.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};