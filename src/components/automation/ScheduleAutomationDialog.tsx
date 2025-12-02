import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar } from "lucide-react";

interface ScheduleAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerId: string;
  onSuccess: () => void;
}

export const ScheduleAutomationDialog = ({ open, onOpenChange, triggerId, onSuccess }: ScheduleAutomationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<"hourly" | "daily" | "weekly" | "monthly" | "custom">("daily");
  const [customCron, setCustomCron] = useState("");
  const [time, setTime] = useState("09:00");

  const getCronExpression = () => {
    if (frequency === "custom") return customCron;

    const [hour, minute] = time.split(":");
    
    switch (frequency) {
      case "hourly": return `0 * * * *`;
      case "daily": return `${minute} ${hour} * * *`;
      case "weekly": return `${minute} ${hour} * * 1`;
      case "monthly": return `${minute} ${hour} 1 * *`;
      default: return customCron;
    }
  };

  const handleSchedule = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('automation_triggers')
        .update({
          schedule_cron: getCronExpression(),
          schedule_enabled: true,
        })
        .eq('id', triggerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation scheduled successfully",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule Automation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Every Day</SelectItem>
                <SelectItem value="weekly">Every Week</SelectItem>
                <SelectItem value="monthly">Every Month</SelectItem>
                <SelectItem value="custom">Custom (Cron)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency !== "custom" && frequency !== "hourly" && (
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {frequency === "custom" && (
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <Input
                placeholder="0 9 * * 1"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format: minute hour day month weekday
              </p>
            </div>
          )}

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Schedule Preview:</p>
            <p className="text-muted-foreground">
              {frequency === "hourly" && "Runs every hour"}
              {frequency === "daily" && `Runs daily at ${time}`}
              {frequency === "weekly" && `Runs every Monday at ${time}`}
              {frequency === "monthly" && `Runs on the 1st of each month at ${time}`}
              {frequency === "custom" && `Custom: ${customCron || "Not set"}`}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={loading} className="flex-1">
              {loading ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};