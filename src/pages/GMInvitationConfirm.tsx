import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2, CheckCircle2, Clock, XCircle, Shield, Briefcase,
  DollarSign, Gift, FileText, Loader2, AlertTriangle,
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
  terms_version?: string;
  venue_name?: string;
  venue_city?: string;
  outlet_name?: string | null;
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
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token, user]);

  const fetchInvitation = async () => {
    try {
      // Use secure RPC function that validates access permissions
      const { data, error } = await supabase.rpc("get_gm_invitation_by_token", {
        p_token: token
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string;
        requires_auth?: boolean;
        id?: string;
        recipient_email?: string;
        recipient_name?: string;
        venue_id?: string;
        outlet_id?: string | null;
        position_title?: string;
        contract_terms?: any;
        salary_details?: any;
        benefits_package?: any;
        start_date?: string | null;
        probation_period_days?: number;
        status?: string;
        expires_at?: string;
        venue_name?: string;
        venue_city?: string;
        outlet_name?: string | null;
      };

      if (!result.success) {
        if (result.error === "Access denied") {
          setError("You don't have permission to view this invitation");
        } else {
          setError(result.error || "Invitation not found");
        }
        return;
      }

      // If requires auth, show limited info and prompt login
      if (result.requires_auth) {
        setRequiresAuth(true);
        // Set partial invitation data for display
        setInvitation({
          id: result.id || '',
          recipient_email: '',
          recipient_name: result.recipient_name || '',
          venue_id: '',
          outlet_id: null,
          position_title: result.position_title || '',
          contract_terms: {},
          salary_details: null,
          benefits_package: null,
          start_date: null,
          probation_period_days: 0,
          status: result.status || '',
          expires_at: result.expires_at || '',
          venue_name: result.venue_name,
        });
        setLoading(false);
        return;
      }

      // Check expiration
      if (result.expires_at && new Date(result.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      // Check if already responded
      if (result.status !== "pending") {
        setError(`This invitation has already been ${result.status}`);
        return;
      }

      // Parse JSON fields properly
      const parsedInvitation: GMInvitation = {
        id: result.id || '',
        recipient_email: result.recipient_email || '',
        recipient_name: result.recipient_name || '',
        venue_id: result.venue_id || '',
        outlet_id: result.outlet_id || null,
        position_title: result.position_title || '',
        contract_terms: typeof result.contract_terms === 'string' 
          ? JSON.parse(result.contract_terms) 
          : result.contract_terms || {},
        salary_details: typeof result.salary_details === 'string'
          ? JSON.parse(result.salary_details)
          : result.salary_details,
        benefits_package: Array.isArray(result.benefits_package) 
          ? result.benefits_package
          : null,
        start_date: result.start_date || null,
        probation_period_days: result.probation_period_days || 90,
        status: result.status || '',
        expires_at: result.expires_at || '',
        venue_name: result.venue_name,
        venue_city: result.venue_city,
        outlet_name: result.outlet_name,
      };

      setInvitation(parsedInvitation);
      setRequiresAuth(false);

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

  const venueName = invitation.venue_name;
  const venueCity = invitation.venue_city;
  const outletName = invitation.outlet_name;
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

  // Show limited view for unauthenticated users
  if (requiresAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-6">
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

          <Card className="border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <Building2 className="w-16 h-16 text-primary mx-auto" />
                <h2 className="text-xl font-bold">{venueName}</h2>
                <p className="text-muted-foreground">{invitation.position_title}</p>
              </div>
              
              <Separator />
              
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center space-y-3">
                <User className="w-8 h-8 text-blue-500 mx-auto" />
                <div>
                  <p className="font-medium">Sign in to view full details</p>
                  <p className="text-sm text-muted-foreground">
                    Please sign in with the email address this invitation was sent to
                  </p>
                </div>
                <Button 
                  onClick={() => navigate(`/auth?redirect=/gm-invitation/${token}`)}
                  className="gap-2"
                >
                  Sign In <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                  <Building2 className="w-10 h-10 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{venueName}</h2>
                  {outletName && <p className="text-muted-foreground">{outletName}</p>}
                  {venueCity && <p className="text-sm text-muted-foreground">{venueCity}</p>}
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
