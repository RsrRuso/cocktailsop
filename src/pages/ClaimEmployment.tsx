import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, Building2, Search, Upload, CheckCircle2, Clock, 
  MapPin, Briefcase, Calendar, FileText, Loader2, X, Image
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Venue {
  id: string;
  name: string;
  brand_name: string;
  city: string;
  region: string;
  country: string;
  verification_status: string;
  logo_url: string;
}

interface Outlet {
  id: string;
  name: string;
  city: string;
  address: string;
}

const ClaimEmployment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  
  // Form state
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(true);
  const [referenceName, setReferenceName] = useState("");
  const [referenceContact, setReferenceContact] = useState("");
  const [proofFiles, setProofFiles] = useState<{ url: string; name: string; type: string }[]>([]);

  // Check if navigated with venue ID
  useEffect(() => {
    const venueId = searchParams.get("venue");
    if (venueId) {
      fetchVenueById(venueId);
    }
  }, [searchParams]);

  const fetchVenueById = async (venueId: string) => {
    const { data, error } = await supabase
      .from("venues")
      .select("id, name, brand_name, city, region, country, verification_status, logo_url")
      .eq("id", venueId)
      .single();

    if (data && !error) {
      setSelectedVenue(data);
      fetchOutlets(data.id);
      setStep(2);
    }
  };

  const searchVenues = async () => {
    if (searchQuery.length < 2) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, brand_name, city, region, country, verification_status, logo_url")
        .or(`name.ilike.%${searchQuery}%,brand_name.ilike.%${searchQuery}%`)
        .eq("verification_status", "verified")
        .limit(10);

      if (error) throw error;
      setVenues(data || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: "Failed to search venues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOutlets = async (venueId: string) => {
    const { data } = await supabase
      .from("venue_outlets")
      .select("id, name, city, address")
      .eq("venue_id", venueId);
    
    setOutlets(data || []);
  };

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
    fetchOutlets(venue.id);
    setStep(2);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    setUploadingProof(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("employment-proofs")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("employment-proofs")
          .getPublicUrl(fileName);

        setProofFiles(prev => [...prev, {
          url: publicUrl,
          name: file.name,
          type: file.type.startsWith("image/") ? "photo" : "document"
        }]);
      }

      toast({
        title: "Uploaded",
        description: "Proof document uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const removeProofFile = (index: number) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !selectedVenue) return;

    if (!position || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in position and start date",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create employment verification claim
      const { data: claim, error: claimError } = await supabase
        .from("employment_verifications")
        .insert({
          user_id: user.id,
          venue_id: selectedVenue.id,
          outlet_id: selectedOutlet || null,
          position,
          department: department || null,
          employment_type: employmentType || null,
          start_date: startDate,
          end_date: isCurrent ? null : endDate || null,
          is_current: isCurrent,
          reference_name: referenceName || null,
          reference_contact: referenceContact || null,
          status: "pending",
          claim_status: "pending",
          proof_documents: proofFiles.map(f => f.url),
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // Insert proof documents
      if (proofFiles.length > 0 && claim) {
        const proofInserts = proofFiles.map(file => ({
          claim_id: claim.id,
          file_url: file.url,
          file_name: file.name,
          proof_type: file.type,
        }));

        await supabase
          .from("employment_claim_proofs")
          .insert(proofInserts);
      }

      toast({
        title: "Claim Submitted",
        description: "Your employment claim has been sent for verification",
      });

      navigate("/profile");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Please sign in to claim employment</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Claim Employment</h1>
              <p className="text-sm text-muted-foreground">Verify your work history</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/employment-help")}>
            Help
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Step 1: Search Venue */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Find Your Venue
                  </CardTitle>
                  <CardDescription>
                    Search for the venue where you work or worked
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by venue name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchVenues()}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={searchVenues} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                    </Button>
                  </div>

                  {venues.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Select a venue:</Label>
                      {venues.map((venue) => (
                        <button
                          key={venue.id}
                          onClick={() => handleVenueSelect(venue)}
                          className="w-full p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-4 text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {venue.logo_url ? (
                              <img src={venue.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Building2 className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{venue.brand_name || venue.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {venue.city}, {venue.country}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 2 && venues.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No verified venues found</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Employment Details */}
          {step === 2 && selectedVenue && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Selected Venue */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {selectedVenue.logo_url ? (
                      <img src={selectedVenue.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-7 h-7 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{selectedVenue.brand_name || selectedVenue.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedVenue.city}, {selectedVenue.country}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedVenue(null); setStep(1); }}>
                    Change
                  </Button>
                </CardContent>
              </Card>

              {/* Employment Form */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Employment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {outlets.length > 0 && (
                    <div className="space-y-2">
                      <Label>Outlet/Location (Optional)</Label>
                      <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outlet" />
                        </SelectTrigger>
                        <SelectContent>
                          {outlets.map((outlet) => (
                            <SelectItem key={outlet.id} value={outlet.id}>
                              {outlet.name} - {outlet.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Position / Job Title *</Label>
                    <Input
                      placeholder="e.g., Head Bartender, Server, Manager"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar</SelectItem>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="floor">Floor Service</SelectItem>
                          <SelectItem value="management">Management</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Type</Label>
                      <Select value={employmentType} onValueChange={setEmploymentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={isCurrent}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isCurrent"
                      checked={isCurrent}
                      onCheckedChange={(checked) => setIsCurrent(checked === true)}
                    />
                    <Label htmlFor="isCurrent" className="cursor-pointer">
                      I currently work here
                    </Label>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <Label className="text-muted-foreground">Reference (Optional)</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Input
                        placeholder="Reference Name"
                        value={referenceName}
                        onChange={(e) => setReferenceName(e.target.value)}
                      />
                      <Input
                        placeholder="Contact (email/phone)"
                        value={referenceContact}
                        onChange={(e) => setReferenceContact(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!position || !startDate}>
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Upload Proof */}
          {step === 3 && selectedVenue && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Upload Proof Documents
                  </CardTitle>
                  <CardDescription>
                    Add photos or documents to verify your employment (optional but speeds up approval)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="proof-upload"
                      accept="image/*,.pdf,.doc,.docx"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      {uploadingProof ? (
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                      ) : (
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                      )}
                      <p className="mt-2 font-medium">Click to upload</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        ID badge, contract, pay stub, uniform photo, etc.
                      </p>
                    </label>
                  </div>

                  {proofFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Uploaded Files:</Label>
                      {proofFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                        >
                          {file.type === "photo" ? (
                            <Image className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                          <span className="flex-1 truncate text-sm">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeProofFile(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-secondary/30 space-y-2">
                    <p className="font-medium">Claim Summary</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Venue:</strong> {selectedVenue.brand_name || selectedVenue.name}</p>
                      <p><strong>Position:</strong> {position}</p>
                      <p><strong>Started:</strong> {new Date(startDate).toLocaleDateString()}</p>
                      {isCurrent ? (
                        <Badge variant="outline" className="mt-2">Currently Employed</Badge>
                      ) : endDate ? (
                        <p><strong>Ended:</strong> {new Date(endDate).toLocaleDateString()}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Submit Claim
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClaimEmployment;
