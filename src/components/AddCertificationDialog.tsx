import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddCertificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export const AddCertificationDialog = ({ open, onOpenChange, userId, onSuccess }: AddCertificationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "certificate",
    title: "",
    issuing_organization: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        user_id: userId,
        issue_date: formData.issue_date ? `${formData.issue_date}-01` : null,
        expiry_date: formData.expiry_date ? `${formData.expiry_date}-01` : null,
      };

      const { error } = await supabase
        .from("certifications")
        .insert(data);
      
      if (error) throw error;
      toast.success(`${formData.type === 'diploma' ? 'Diploma' : 'Certificate'} added successfully`);

      onSuccess();
      onOpenChange(false);
      setFormData({
        type: "certificate",
        title: "",
        issuing_organization: "",
        issue_date: "",
        expiry_date: "",
        credential_id: "",
        credential_url: "",
        description: "",
      });
    } catch (error) {
      console.error("Error saving certification:", error);
      toast.error("Failed to save certification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass">
        <DialogHeader>
          <DialogTitle>Add Certification</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diploma">Diploma</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Bachelor of Science, AWS Certified Solutions Architect"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuing_organization">Issuing Organization *</Label>
            <Input
              id="issuing_organization"
              value={formData.issuing_organization}
              onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
              required
              placeholder="e.g., University Name, AWS"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="month"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential_id">Credential ID</Label>
            <Input
              id="credential_id"
              value={formData.credential_id}
              onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
              placeholder="Certificate/Diploma ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential_url">Credential URL</Label>
            <Input
              id="credential_url"
              type="url"
              value={formData.credential_url}
              onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
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
