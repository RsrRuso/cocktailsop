import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddRecognitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export const AddRecognitionDialog = ({ open, onOpenChange, userId, onSuccess }: AddRecognitionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    issuer: "",
    issue_date: "",
    description: "",
    recognition_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        user_id: userId,
        issue_date: formData.issue_date ? `${formData.issue_date}-01` : null,
      };

      const { error } = await supabase
        .from("recognitions")
        .insert(data);
      
      if (error) throw error;
      toast.success("Recognition added successfully");

      onSuccess();
      onOpenChange(false);
      setFormData({
        title: "",
        issuer: "",
        issue_date: "",
        description: "",
        recognition_url: "",
      });
    } catch (error) {
      console.error("Error saving recognition:", error);
      toast.error("Failed to save recognition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass">
        <DialogHeader>
          <DialogTitle>Add Recognition</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Employee of the Year, Industry Award"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuer">Issuer *</Label>
            <Input
              id="issuer"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              required
              placeholder="e.g., Company Name, Industry Association"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_date">Issue Date *</Label>
            <Input
              id="issue_date"
              type="month"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recognition_url">Recognition URL</Label>
            <Input
              id="recognition_url"
              type="url"
              value={formData.recognition_url}
              onChange={(e) => setFormData({ ...formData, recognition_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe this recognition..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
