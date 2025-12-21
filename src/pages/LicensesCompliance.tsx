import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, FileText, Calendar, AlertTriangle, CheckCircle, Clock, Upload, Download, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface License {
  id: string;
  license_name: string;
  license_type: string;
  issuing_authority: string | null;
  license_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  renewal_reminder_days: number | null;
  notes: string | null;
  document_url: string | null;
}

const LicensesCompliance = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [formData, setFormData] = useState({
    license_name: "",
    license_type: "liquor",
    issuing_authority: "",
    license_number: "",
    issue_date: "",
    expiry_date: "",
    status: "active",
    renewal_reminder_days: 30,
    notes: "",
  });

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("licenses_compliance")
        .select("*")
        .eq("user_id", user.id)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      return data as License[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("licenses_compliance").insert({
        ...data,
        user_id: user.id,
        renewal_reminder_days: data.renewal_reminder_days || 30,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("License added successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("licenses_compliance")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      setIsDialogOpen(false);
      setEditingLicense(null);
      resetForm();
      toast.success("License updated successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("licenses_compliance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      toast.success("License deleted successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      license_name: "",
      license_type: "liquor",
      issuing_authority: "",
      license_number: "",
      issue_date: "",
      expiry_date: "",
      status: "active",
      renewal_reminder_days: 30,
      notes: "",
    });
  };

  const handleEdit = (license: License) => {
    setEditingLicense(license);
    setFormData({
      license_name: license.license_name,
      license_type: license.license_type,
      issuing_authority: license.issuing_authority || "",
      license_number: license.license_number || "",
      issue_date: license.issue_date || "",
      expiry_date: license.expiry_date || "",
      status: license.status,
      renewal_reminder_days: license.renewal_reminder_days || 30,
      notes: license.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.license_name) {
      toast.error("License name is required");
      return;
    }
    if (editingLicense) {
      updateMutation.mutate({ ...formData, id: editingLicense.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusIcon = (license: License) => {
    if (!license.expiry_date) return <CheckCircle className="w-5 h-5 text-green-500" />;
    const daysUntilExpiry = Math.ceil((new Date(license.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (daysUntilExpiry <= (license.renewal_reminder_days || 30)) return <Clock className="w-5 h-5 text-amber-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusBadge = (license: License) => {
    if (!license.expiry_date) return <Badge className="bg-green-500/20 text-green-400">Active</Badge>;
    const daysUntilExpiry = Math.ceil((new Date(license.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return <Badge className="bg-red-500/20 text-red-400">Expired</Badge>;
    if (daysUntilExpiry <= (license.renewal_reminder_days || 30)) return <Badge className="bg-amber-500/20 text-amber-400">Expiring Soon</Badge>;
    return <Badge className="bg-green-500/20 text-green-400">Active</Badge>;
  };

  const licenseTypes = [
    { value: "liquor", label: "Liquor License" },
    { value: "food", label: "Food Service License" },
    { value: "health", label: "Health Permit" },
    { value: "fire", label: "Fire Safety Certificate" },
    { value: "music", label: "Music/Entertainment License" },
    { value: "business", label: "Business Registration" },
    { value: "signage", label: "Signage Permit" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Licenses & Compliance</h1>
            <p className="text-sm text-muted-foreground">Track permits, licenses, and renewals</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingLicense(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add License
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLicense ? "Edit License" : "Add New License"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>License Name *</Label>
                  <Input
                    value={formData.license_name}
                    onChange={(e) => setFormData({ ...formData, license_name: e.target.value })}
                    placeholder="e.g., Liquor License - Main Bar"
                  />
                </div>
                <div>
                  <Label>License Type</Label>
                  <Select value={formData.license_type} onValueChange={(value) => setFormData({ ...formData, license_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {licenseTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Issuing Authority</Label>
                    <Input
                      value={formData.issuing_authority}
                      onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                      placeholder="e.g., City Council"
                    />
                  </div>
                  <div>
                    <Label>License Number</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="e.g., LIC-12345"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="renewal">In Renewal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reminder (days before)</Label>
                    <Input
                      type="number"
                      value={formData.renewal_reminder_days}
                      onChange={(e) => setFormData({ ...formData, renewal_reminder_days: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingLicense ? "Update License" : "Add License"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold text-green-400">
                {licenses.filter(l => {
                  if (!l.expiry_date) return true;
                  const days = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return days > (l.renewal_reminder_days || 30);
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <Clock className="w-6 h-6 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold text-amber-400">
                {licenses.filter(l => {
                  if (!l.expiry_date) return false;
                  const days = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return days > 0 && days <= (l.renewal_reminder_days || 30);
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Expiring</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-3 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-red-500 mb-1" />
              <p className="text-2xl font-bold text-red-400">
                {licenses.filter(l => {
                  if (!l.expiry_date) return false;
                  const days = Math.ceil((new Date(l.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return days < 0;
                }).length}
              </p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>

        {/* Licenses List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : licenses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">No licenses added yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>Add Your First License</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {licenses.map((license) => (
              <Card key={license.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(license)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{license.license_name}</h3>
                          {getStatusBadge(license)}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{license.license_type.replace("_", " ")}</p>
                        {license.license_number && (
                          <p className="text-xs text-muted-foreground">#{license.license_number}</p>
                        )}
                        {license.expiry_date && (
                          <div className="flex items-center gap-1 mt-2 text-sm">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Expires: {new Date(license.expiry_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(license)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(license.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LicensesCompliance;
