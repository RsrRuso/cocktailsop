import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, XCircle, Clock, User, Briefcase, Calendar,
  FileText, Image, ExternalLink, Loader2, Inbox, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Claim {
  id: string;
  user_id: string;
  position: string;
  department: string | null;
  employment_type: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  reference_name: string | null;
  reference_contact: string | null;
  status: string;
  claim_status: string | null;
  proof_documents: string[] | null;
  created_at: string;
  rejection_reason: string | null;
  outlet_id: string | null;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
  venue_outlets?: {
    name: string;
  };
}

interface ClaimProof {
  id: string;
  file_url: string;
  file_name: string;
  proof_type: string;
}

interface VenueClaimsInboxProps {
  venueId: string;
  isAdmin: boolean;
}

export const VenueClaimsInbox = ({ venueId, isAdmin }: VenueClaimsInboxProps) => {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimProofs, setClaimProofs] = useState<ClaimProof[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClaims();
  }, [venueId]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      // First fetch claims
      const { data: claimsData, error: claimsError } = await supabase
        .from("employment_verifications")
        .select(`
          *,
          venue_outlets:outlet_id (name)
        `)
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false });

      if (claimsError) throw claimsError;

      // Fetch profiles separately
      const userIds = [...new Set((claimsData || []).map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);

      // Merge profiles with claims
      const claimsWithProfiles = (claimsData || []).map(claim => ({
        ...claim,
        profiles: profilesData?.find(p => p.id === claim.user_id) || null
      }));

      setClaims(claimsWithProfiles as Claim[]);
    } catch (error: any) {
      console.error("Error fetching claims:", error);
      toast({
        title: "Error",
        description: "Failed to load claims",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimProofs = async (claimId: string) => {
    const { data } = await supabase
      .from("employment_claim_proofs")
      .select("*")
      .eq("claim_id", claimId);
    
    setClaimProofs(data || []);
  };

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    fetchClaimProofs(claim.id);
  };

  const handleApproveClaim = async () => {
    if (!selectedClaim) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("employment_verifications")
        .update({
          status: "verified",
          claim_status: "approved",
          verified_at: new Date().toISOString(),
        })
        .eq("id", selectedClaim.id);

      if (error) throw error;

      toast({
        title: "Claim Approved",
        description: `${selectedClaim.profiles?.full_name || "User"}'s employment has been verified`,
      });

      setSelectedClaim(null);
      fetchClaims();
    } catch (error: any) {
      console.error("Approve error:", error);
      toast({
        title: "Error",
        description: "Failed to approve claim",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClaim = async () => {
    if (!selectedClaim) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("employment_verifications")
        .update({
          status: "rejected",
          claim_status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedClaim.id);

      if (error) throw error;

      toast({
        title: "Claim Rejected",
        description: "The employment claim has been rejected",
      });

      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedClaim(null);
      fetchClaims();
    } catch (error: any) {
      console.error("Reject error:", error);
      toast({
        title: "Error",
        description: "Failed to reject claim",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "pending" && claim.status === "pending") ||
      (activeTab === "verified" && claim.status === "verified") ||
      (activeTab === "rejected" && claim.status === "rejected");

    const matchesSearch = !searchQuery || 
      claim.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.position?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const pendingCount = claims.filter(c => c.status === "pending").length;
  const verifiedCount = claims.filter(c => c.status === "verified").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-primary" />
                Employment Claims
              </CardTitle>
              <CardDescription>
                Review and verify staff employment claims
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-amber-500">
                  {pendingCount} Pending
                </Badge>
              )}
              <Badge variant="outline" className="text-green-500">
                {verifiedCount} Verified
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredClaims.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No claims found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filteredClaims.map((claim) => (
                      <motion.div
                        key={claim.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <button
                          onClick={() => handleViewClaim(claim)}
                          className="w-full p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={claim.profiles?.avatar_url} />
                              <AvatarFallback>
                                <User className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{claim.profiles?.full_name || "Unknown User"}</p>
                                {getStatusBadge(claim.status)}
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {claim.position}
                                {claim.venue_outlets?.name && ` • ${claim.venue_outlets.name}`}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(claim.start_date), "MMM yyyy")}
                                {claim.is_current ? " - Present" : claim.end_date ? ` - ${format(new Date(claim.end_date), "MMM yyyy")}` : ""}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(claim.created_at), "MMM d")}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
          {selectedClaim && (
            <>
              <DialogHeader>
                <DialogTitle>Employment Claim Details</DialogTitle>
                <DialogDescription>
                  Review the claim and proof documents
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* User Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedClaim.profiles?.avatar_url} />
                    <AvatarFallback>
                      <User className="w-7 h-7" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{selectedClaim.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">@{selectedClaim.profiles?.username}</p>
                  </div>
                </div>

                {/* Employment Details */}
                <div className="space-y-3">
                  <h4 className="font-medium">Employment Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Position</p>
                      <p className="font-medium">{selectedClaim.position}</p>
                    </div>
                    {selectedClaim.department && (
                      <div>
                        <p className="text-muted-foreground">Department</p>
                        <p className="font-medium capitalize">{selectedClaim.department}</p>
                      </div>
                    )}
                    {selectedClaim.employment_type && (
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{selectedClaim.employment_type}</p>
                      </div>
                    )}
                    {selectedClaim.venue_outlets?.name && (
                      <div>
                        <p className="text-muted-foreground">Outlet</p>
                        <p className="font-medium">{selectedClaim.venue_outlets.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Start Date</p>
                      <p className="font-medium">{format(new Date(selectedClaim.start_date), "MMMM d, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {selectedClaim.is_current ? "Currently Working" : selectedClaim.end_date ? format(new Date(selectedClaim.end_date), "MMMM d, yyyy") : "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reference */}
                {(selectedClaim.reference_name || selectedClaim.reference_contact) && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Reference</h4>
                    <div className="text-sm p-3 rounded-lg bg-secondary/30">
                      {selectedClaim.reference_name && <p><strong>Name:</strong> {selectedClaim.reference_name}</p>}
                      {selectedClaim.reference_contact && <p><strong>Contact:</strong> {selectedClaim.reference_contact}</p>}
                    </div>
                  </div>
                )}

                {/* Proof Documents */}
                {claimProofs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Proof Documents ({claimProofs.length})</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {claimProofs.map((proof) => (
                          <a
                            key={proof.id}
                            href={proof.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                          >
                            {proof.proof_type === "photo" ? (
                              <Image className="w-5 h-5 text-primary" />
                            ) : (
                              <FileText className="w-5 h-5 text-primary" />
                            )}
                            <span className="flex-1 truncate text-sm">{proof.file_name}</span>
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Rejection Reason (if rejected) */}
                {selectedClaim.status === "rejected" && selectedClaim.rejection_reason && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm font-medium text-red-500">Rejection Reason:</p>
                    <p className="text-sm mt-1">{selectedClaim.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Actions for Pending Claims */}
              {selectedClaim.status === "pending" && isAdmin && (
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApproveClaim}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Approve Claim
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Employment Claim</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this claim
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="e.g., No record of this employment, incorrect dates, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectClaim}
              disabled={!rejectionReason.trim() || processing}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
