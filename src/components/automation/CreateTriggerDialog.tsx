import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhooks: any[];
  onSuccess: () => void;
}

export const CreateTriggerDialog = ({ open, onOpenChange, webhooks, onSuccess }: CreateTriggerDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "new_post",
    webhook_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('automation_triggers')
        .insert({
          ...formData,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Trigger created successfully",
      });

      setFormData({ name: "", description: "", trigger_type: "new_post", webhook_id: "" });
      onSuccess();
    } catch (error) {
      console.error('Error creating trigger:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trigger",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Automation Trigger</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trigger-name">Trigger Name</Label>
            <Input
              id="trigger-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="New Post Notification"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select 
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_post">New Post</SelectItem>
                <SelectItem value="new_follower">New Follower</SelectItem>
                <SelectItem value="new_message">New Message</SelectItem>
                <SelectItem value="new_event">New Event</SelectItem>
                <SelectItem value="new_music_share">New Music Share</SelectItem>
                <SelectItem value="schedule">Scheduled</SelectItem>
                <SelectItem value="custom">Custom Event</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook</Label>
            <Select 
              value={formData.webhook_id}
              onValueChange={(value) => setFormData({ ...formData, webhook_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a webhook" />
              </SelectTrigger>
              <SelectContent>
                {webhooks.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    {webhook.name} ({webhook.webhook_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger-description">Description (Optional)</Label>
            <Textarea
              id="trigger-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Send notification to Slack when I post"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || webhooks.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Trigger
            </Button>
          </div>

          {webhooks.length === 0 && (
            <p className="text-sm text-amber-500">
              ⚠️ Please create a webhook first before adding triggers
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};