import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Building2, CheckCircle2, Clock, XCircle, Shield, Briefcase,
  DollarSign, Gift, Calendar, FileText, Loader2, AlertTriangle,
  ArrowRight, Crown, Sparkles, User
} from "lucide-react";

interface GMInvitation {
  id: string;
  recipient_email: string;
  recipient_name: string;
  venue_id: string;
  outlet_id: string | null;
  position_title: string;
  contract_terms: {
    responsibilities?: string[];
    reporting_to?: string;
    working_hours?: string;
    probation_period?: string;
    notice_period?: string;
  };
  salary_details: {
    base_salary?: string;
    currency?: string;
    payment_frequency?: string;
  } | null;
  benefits_package: string[] | null;
  start_date: string | null;
  probation_period_days: number;
  status: string;
  expires_at: string;
  terms_version: string;
  venues?: {
    name: string;
    brand_name: string;
    logo_url: string | null;
    city: string;
    region: string;
  };
  venue_outlets?: {
    name: string;
  } | null;
}

const GMInvitationConfirm = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [invitation, setInvitation] = useState<GMInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policiesAccepted, setPoliciesAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("gm_invitations")
        .select(`
          *,
          venues (name, brand_name, logo_url, city, region),
          venue_outlets (name)
        `)
        .eq("invitation_token", token)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Invitation not found");
        return;
      }

      // Check expiration
      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      // Check if already responded
      if (data.status !== "pending") {
        setError(`This invitation has already been ${data.status}`);
        return;
      }

      // Parse JSON fields properly
      const parsedInvitation: GMInvitation = {
        ...data,
        contract_terms: typeof data.contract_terms === 'string' 
          ? JSON.parse(data.contract_terms) 
          : data.contract_terms || {},
        salary_details: typeof data.salary_details === 'string'
          ? JSON.parse(data.salary_details as string)
          : data.salary_details as any,
        benefits_package: Array.isArray(data.benefits_package) 
          ? (data.benefits_package as string[])
          : null
      };

      setInvitation(parsedInvitation);

      // Mark as viewed
      await supabase
        .from("gm_invitations")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", data.id);

    } catch (err: any) {
      console.error("Error fetching invitation:", err);
      setError("Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      toast.error("Please sign in to accept this invitation");
      navigate(`/auth?redirect=/gm-invitation/${token}`);
      return;
    }

    if (!termsAccepted || !policiesAccepted) {
      toast.error("Please accept the terms and policies to continue");
      return;
    }

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_gm_invitation", {
        p_invitation_token: token,
        p_digital_signature: `${user.email} - ${new Date().toISOString()}`,
        p_device_info: navigator.userAgent,
      });

      if (error) throw error;

      const result = data as { success: boolean; venue_id?: string; error?: string; message?: string };

      if (!result.success) {
        throw new Error(result.error || "Failed to accept invitation");
      }

      toast.success("Welcome aboard! Redirecting to your dashboard...");
      
      // Navigate to the unified GM dashboard
      setTimeout(() => {
        navigate(`/gm-dashboard/${result.venue_id}`);
      }, 1500);

    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      const { data, error } = await supabase.rpc("reject_gm_invitation", {
        p_invitation_token: token,
        p_reason: "Declined by recipient",
      });

      if (error) throw error;

      toast.success("Invitation declined");
      navigate("/home");

    } catch (err: any) {
      console.error("Error rejecting invitation:", err);
      toast.error("Failed to decline invitation");
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Invitation Unavailable</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/home")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const venue = invitation.venues;
  const outlet = invitation.venue_outlets;
  const daysUntilExpiry = Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const responsibilities = invitation.contract_terms?.responsibilities || [
    "Overall venue operations management",
    "Staff supervision and scheduling",
    "Financial performance oversight",
    "Quality control and compliance",
    "Customer satisfaction management"
  ];

  const benefits = invitation.benefits_package || [
    "Competitive salary package",
    "Performance bonuses",
    "Professional development",
    "Health insurance"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white gap-1">
            <Sparkles className="w-3 h-3" />
            GM Position Offer
          </Badge>
          <h1 className="text-3xl font-bold">You're Invited!</h1>
        </motion.div>

        {/* Venue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 p-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-background flex items-center justify-center shrink-0 border">
                  {venue?.logo_url ? (
                    <img src={venue.logo_url} alt={venue.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{venue?.brand_name || venue?.name}</h2>
                  {outlet && <p className="text-muted-foreground">{outlet.name}</p>}
                  <p className="text-sm text-muted-foreground">{venue?.city}, {venue?.region}</p>
                </div>
                <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500">
                  <Crown className="w-3 h-3" />
                  {invitation.position_title}
                </Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Expiry Warning */}
        {daysUntilExpiry <= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <p className="text-sm">
                  This invitation expires in <strong>{daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</strong>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Contract Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Contract Details
              </CardTitle>
              <CardDescription>Review your position offer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Position</p>
                  <p className="font-semibold mt-1">{invitation.position_title}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Reports To</p>
                  <p className="font-semibold mt-1">{invitation.contract_terms?.reporting_to || 'HR Department'}</p>
                </div>
                {invitation.start_date && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</p>
                    <p className="font-semibold mt-1">{new Date(invitation.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Probation</p>
                  <p className="font-semibold mt-1">{invitation.probation_period_days} days</p>
                </div>
              </div>

              <Separator />

              {/* Responsibilities */}
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Key Responsibilities
                </h4>
                <ul className="space-y-2">
                  {responsibilities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Compensation */}
              {invitation.salary_details && (
                <>
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Compensation
                    </h4>
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-2xl font-bold text-emerald-600">
                        {invitation.salary_details.currency || 'AED'} {invitation.salary_details.base_salary}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invitation.salary_details.payment_frequency || 'per month'}
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Benefits */}
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-primary" />
                  Benefits Package
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Terms */}
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  Terms & Conditions
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Working Hours: {invitation.contract_terms?.working_hours || 'As per venue requirements'}</li>
                  <li>• Notice Period: {invitation.contract_terms?.notice_period || '30 days during probation, 60 days thereafter'}</li>
                  <li>• Terms Version: {invitation.terms_version}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Acceptance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-primary/20">
            <CardContent className="pt-6 space-y-4">
              {!user && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="font-medium">Sign in required</p>
                    <p className="text-sm text-muted-foreground">You'll need to sign in to accept this invitation</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                  />
                  <label htmlFor="terms" className="text-sm cursor-pointer">
                    I have read and agree to the terms and conditions outlined in this contract
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="policies"
                    checked={policiesAccepted}
                    onCheckedChange={(checked) => setPoliciesAccepted(!!checked)}
                  />
                  <label htmlFor="policies" className="text-sm cursor-pointer">
                    I agree to abide by all company policies and procedures as a General Manager
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={rejecting || accepting}
                >
                  {rejecting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Decline
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600"
                  onClick={handleAccept}
                  disabled={!termsAccepted || !policiesAccepted || accepting || rejecting}
                >
                  {accepting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Accept & Join
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default GMInvitationConfirm;
