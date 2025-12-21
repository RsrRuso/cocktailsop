import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGMInvitations, GMInvitation } from "@/hooks/useGMInvitations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send, Plus, Building2, Mail, User, Clock, CheckCircle2,
  XCircle, Eye, RotateCcw, Loader2, Crown, Sparkles, Copy
} from "lucide-react";

interface Venue {
  id: string;
  name: string;
  brand_name: string;
  city: string;
}

interface VenueOutlet {
  id: string;
  name: string;
  city: string;
}

const HRGMInvitations = () => {
  const { user } = useAuth();
  const { loading, invitations, fetchInvitations, createInvitation, cancelInvitation, resendInvitation } = useGMInvitations();
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [outlets, setOutlets] = useState<VenueOutlet[]>([]);
  const [isHR, setIsHR] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    recipient_name: "",
    recipient_email: "",
    venue_id: "",
    outlet_id: "",
    position_title: "General Manager",
    start_date: "",
    probation_period_days: 90,
    salary_base: "",
    salary_currency: "AED",
    hr_notes: "",
  });

  useEffect(() => {
    checkHRAccess();
  }, [user]);

  useEffect(() => {
    if (isHR) {
      fetchInvitations();
      fetchVenues();
    }
  }, [isHR]);

  useEffect(() => {
    if (formData.venue_id) {
      fetchOutlets(formData.venue_id);
    }
  }, [formData.venue_id]);

  const checkHRAccess = async () => {
    if (!user) {
      setCheckingAccess(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("hr_department_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsHR(!!data);
    } catch (err) {
      console.error("Error checking HR access:", err);
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchVenues = async () => {
    const { data } = await supabase
      .from("venues")
      .select("id, name, brand_name, city")
      .order("name");
    
    setVenues(data || []);
  };

  const fetchOutlets = async (venueId: string) => {
    const { data } = await supabase
      .from("venue_outlets")
      .select("id, name, city")
      .eq("venue_id", venueId)
      .order("name");
    
    setOutlets(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.recipient_name || !formData.recipient_email || !formData.venue_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      const invitation = await createInvitation({
        recipient_name: formData.recipient_name,
        recipient_email: formData.recipient_email,
        venue_id: formData.venue_id,
        outlet_id: formData.outlet_id || undefined,
        position_title: formData.position_title,
        start_date: formData.start_date || undefined,
        probation_period_days: formData.probation_period_days,
        salary_details: formData.salary_base ? {
          base_salary: formData.salary_base,
          currency: formData.salary_currency,
          payment_frequency: "per month",
        } : undefined,
        hr_notes: formData.hr_notes || undefined,
      });

      if (invitation) {
        setDialogOpen(false);
        setFormData({
          recipient_name: "",
          recipient_email: "",
          venue_id: "",
          outlet_id: "",
          position_title: "General Manager",
          start_date: "",
          probation_period_days: 90,
          salary_base: "",
          salary_currency: "AED",
          hr_notes: "",
        });
        fetchInvitations();
      }
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "accepted":
        return <Badge className="bg-emerald-500/20 text-emerald-500 gap-1"><CheckCircle2 className="w-3 h-3" />Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      case "expired":
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Expired</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-muted-foreground gap-1"><XCircle className="w-3 h-3" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const copyInvitationLink = (token: string) => {
    const link = `${window.location.origin}/gm-invitation/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied!");
  };

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isHR) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6 text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-muted-foreground">You must be an HR member to manage GM invitations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            GM Invitations
          </h2>
          <p className="text-muted-foreground">Send and manage General Manager position offers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600">
              <Plus className="w-4 h-4" />
              New Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Send GM Invitation
              </DialogTitle>
              <DialogDescription>
                Create and send a formal position offer to a prospective General Manager
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* Recipient Info */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Recipient Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Venue Selection */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Select Venue *</Label>
                  <Select
                    value={formData.venue_id}
                    onValueChange={(value) => setFormData({ ...formData, venue_id: value, outlet_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.brand_name || venue.name} - {venue.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {outlets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Outlet (Optional)</Label>
                    <Select
                      value={formData.outlet_id}
                      onValueChange={(value) => setFormData({ ...formData, outlet_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All outlets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All outlets</SelectItem>
                        {outlets.map((outlet) => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            {outlet.name} - {outlet.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Position Details */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Position Title</Label>
                  <Input
                    id="position"
                    value={formData.position_title}
                    onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probation">Probation (days)</Label>
                    <Input
                      id="probation"
                      type="number"
                      value={formData.probation_period_days}
                      onChange={(e) => setFormData({ ...formData, probation_period_days: parseInt(e.target.value) || 90 })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Compensation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Base Salary</Label>
                  <Input
                    id="salary"
                    placeholder="15,000"
                    value={formData.salary_base}
                    onChange={(e) => setFormData({ ...formData, salary_base: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={formData.salary_currency}
                    onValueChange={(value) => setFormData({ ...formData, salary_currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">HR Notes (internal)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any internal notes about this invitation..."
                  value={formData.hr_notes}
                  onChange={(e) => setFormData({ ...formData, hr_notes: e.target.value })}
                  rows={2}
                />
              </div>

              <Button 
                className="w-full gap-2" 
                onClick={handleSubmit}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Invitation
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{invitations.length}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-amber-500">
              {invitations.filter(i => i.status === 'pending').length}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-emerald-500">
              {invitations.filter(i => i.status === 'accepted').length}
            </p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-destructive">
              {invitations.filter(i => i.status === 'rejected').length}
            </p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No invitations sent yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{invitation.recipient_name}</p>
                          <p className="text-sm text-muted-foreground">{invitation.recipient_email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {invitation.venues?.brand_name || invitation.venues?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(invitation.status)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {invitation.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => copyInvitationLink(invitation.invitation_token)}
                        >
                          <Copy className="w-3 h-3" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => resendInvitation(invitation)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          onClick={() => cancelInvitation(invitation.id)}
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRGMInvitations;
