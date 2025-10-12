import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddCompetitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddCompetitionDialog = ({ open, onOpenChange, onSuccess }: AddCompetitionDialogProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    organizer: "",
    competition_date: "",
    result: "participated",
    description: "",
    certificate_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from("competitions").insert({
        user_id: user.id,
        ...formData,
      });

      if (error) throw error;

      toast.success("Competition added successfully!");
      setFormData({
        title: "",
        organizer: "",
        competition_date: "",
        result: "participated",
        description: "",
        certificate_url: "",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to add competition");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Competition</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Competition Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., World Bartender Championship"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizer">Organizer</Label>
            <Input
              id="organizer"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              placeholder="e.g., International Bartenders Association"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="competition_date">Date *</Label>
            <Input
              id="competition_date"
              type="date"
              value={formData.competition_date}
              onChange={(e) => setFormData({ ...formData, competition_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="result">Result *</Label>
            <Select
              value={formData.result}
              onValueChange={(value) => setFormData({ ...formData, result: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="participated">Participated</SelectItem>
                <SelectItem value="won">Won</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your achievement or experience..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate_url">Certificate URL</Label>
            <Input
              id="certificate_url"
              type="url"
              value={formData.certificate_url}
              onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Competition
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
