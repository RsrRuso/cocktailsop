import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, ExternalLink, Copy, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WebhooksListProps {
  webhooks: any[];
  onUpdate: () => void;
}

export const WebhooksList = ({ webhooks, onUpdate }: WebhooksListProps) => {
  const { toast } = useToast();

  const toggleWebhook = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('automation_webhooks')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Webhook ${!currentState ? 'enabled' : 'disabled'}`,
      });
      onUpdate();
    }
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await supabase
      .from('automation_webhooks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Webhook deleted",
      });
      onUpdate();
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  if (webhooks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No webhooks yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first webhook to start automating
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {webhooks.map((webhook) => (
        <Card key={webhook.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{webhook.name}</h3>
                <Badge variant={webhook.is_active ? "default" : "secondary"}>
                  {webhook.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline">{webhook.webhook_type}</Badge>
              </div>
              
              {webhook.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {webhook.description}
                </p>
              )}

              <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                <code className="text-xs flex-1 truncate">{webhook.webhook_url}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyUrl(webhook.webhook_url)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(webhook.webhook_url, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>Triggered: {webhook.trigger_count || 0} times</span>
                {webhook.last_triggered_at && (
                  <span>Last: {new Date(webhook.last_triggered_at).toLocaleString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Switch
                checked={webhook.is_active}
                onCheckedChange={() => toggleWebhook(webhook.id, webhook.is_active)}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteWebhook(webhook.id)}
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