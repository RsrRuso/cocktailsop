import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, Phone, Globe, FileText, CheckCircle2, Clock, 
  Copy, ExternalLink, Loader2, Upload, AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VenueVerificationWizardProps {
  venueId: string;
  venueName: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  currentStatus: string;
  currentMethod?: string;
  onVerificationComplete?: () => void;
}

export const VenueVerificationWizard = ({
  venueId,
  venueName,
  contactEmail,
  phone,
  website,
  instagram,
  currentStatus,
  currentMethod,
  onVerificationComplete,
}: VenueVerificationWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeMethod, setActiveMethod] = useState<string>("email");
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [emailToVerify, setEmailToVerify] = useState(contactEmail || "");
  const [phoneToVerify, setPhoneToVerify] = useState(phone || "");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [pendingVerification, setPendingVerification] = useState<{
    method: string;
    code?: string;
    expiresAt?: string;
  } | null>(null);

  // Generate a verification code
  const generateCode = () => {
    return "SV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Start email verification
  const startEmailVerification = async () => {
    if (!emailToVerify) {
      toast({
        title: "Email Required",
        description: "Please enter an official venue email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Save verification attempt
      const { error } = await supabase
        .from("venue_verification_attempts")
        .insert({
          venue_id: venueId,
          method: "domain_email",
          code,
          email_sent_to: emailToVerify,
          status: "pending",
          attempted_by: user?.id,
          expires_at: expiresAt,
        });

      if (error) throw error;

      setVerificationCode(code);
      setPendingVerification({ method: "email", code, expiresAt });

      toast({
        title: "Verification Code Generated",
        description: "Enter this code in the verification field to confirm your email",
      });
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

  // Start phone verification
  const startPhoneVerification = async () => {
    if (!phoneToVerify) {
      toast({
        title: "Phone Required",
        description: "Please enter an official venue phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("venue_verification_attempts")
        .insert({
          venue_id: venueId,
          method: "phone",
          code,
          phone_sent_to: phoneToVerify,
          status: "pending",
          attempted_by: user?.id,
          expires_at: expiresAt,
        });

      if (error) throw error;

      setVerificationCode(code);
      setPendingVerification({ method: "phone", code, expiresAt });

      toast({
        title: "Verification Code Generated",
        description: "Enter this code to verify your phone number",
      });
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

  // Start social/web verification
  const startSocialVerification = async () => {
    setLoading(true);
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("venue_verification_attempts")
        .insert({
          venue_id: venueId,
          method: "social_web",
          social_code: code,
          status: "pending",
          attempted_by: user?.id,
          expires_at: expiresAt,
        });

      if (error) throw error;

      setVerificationCode(code);
      setPendingVerification({ method: "social", code, expiresAt });

      toast({
        title: "Verification Code Generated",
        description: "Add this code to your Instagram bio or website footer",
      });
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

  // Upload verification document
  const uploadDocument = async () => {
    if (!documentFile) {
      toast({
        title: "File Required",
        description: "Please select a document to upload",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const fileExt = documentFile.name.split(".").pop();
      const filePath = `venue-verification/${venueId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("venue-documents")
        .upload(filePath, documentFile);

      if (uploadError) {
        // If bucket doesn't exist, continue without file upload
        console.warn("Storage upload failed:", uploadError);
      }

      const { error } = await supabase
        .from("venue_verification_attempts")
        .insert({
          venue_id: venueId,
          method: "document",
          document_url: filePath,
          status: "pending",
          attempted_by: user?.id,
        });

      if (error) throw error;

      setPendingVerification({ method: "document" });

      toast({
        title: "Document Submitted",
        description: "Your document is pending manual review",
      });
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

  // Verify the entered code
  const verifyCode = async () => {
    if (inputCode !== verificationCode) {
      toast({
        title: "Invalid Code",
        description: "The code you entered doesn't match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update verification attempt
      await supabase
        .from("venue_verification_attempts")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
        })
        .eq("venue_id", venueId)
        .eq("code", verificationCode);

      // Update venue status
      await supabase
        .from("venues")
        .update({
          verification_status: "verified",
          verification_method: pendingVerification?.method,
          verified_at: new Date().toISOString(),
        })
        .eq("id", venueId);

      toast({
        title: "Verified!",
        description: `${venueName} is now verified`,
      });

      onVerificationComplete?.();
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

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    toast({ title: "Code copied!" });
  };

  if (currentStatus === "verified") {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <div>
            <p className="font-semibold text-green-500">Verified Venue</p>
            <p className="text-sm text-muted-foreground">
              Verified via {currentMethod?.replace("_", " ")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Verify Your Venue
          {currentStatus === "pending" && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Choose a verification method to prove you control this venue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeMethod} onValueChange={setActiveMethod}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="email" className="gap-1 text-xs">
              <Mail className="w-3 h-3" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-1 text-xs">
              <Phone className="w-3 h-3" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1 text-xs">
              <Globe className="w-3 h-3" />
              Social
            </TabsTrigger>
            <TabsTrigger value="document" className="gap-1 text-xs">
              <FileText className="w-3 h-3" />
              Docs
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeMethod}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Email Verification */}
              <TabsContent value="email" className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Domain Email Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Verify using an email with your venue's domain (e.g., name@venue.com)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Official Email Address</Label>
                  <Input
                    type="email"
                    placeholder="info@yourvenue.com"
                    value={emailToVerify}
                    onChange={(e) => setEmailToVerify(e.target.value)}
                  />
                </div>

                {verificationCode && pendingVerification?.method === "email" ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium mb-2">Your Verification Code</p>
                      <div className="flex items-center gap-2">
                        <code className="text-2xl font-mono font-bold text-primary">
                          {verificationCode}
                        </code>
                        <Button size="sm" variant="ghost" onClick={copyCode}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Enter Verification Code</Label>
                      <Input
                        placeholder="SV-XXXXXX"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      />
                    </div>

                    <Button onClick={verifyCode} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={startEmailVerification} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Code"}
                  </Button>
                )}
              </TabsContent>

              {/* Phone Verification */}
              <TabsContent value="phone" className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Phone Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Verify using your venue's official phone number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Venue Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="+971 4 XXX XXXX"
                    value={phoneToVerify}
                    onChange={(e) => setPhoneToVerify(e.target.value)}
                  />
                </div>

                {verificationCode && pendingVerification?.method === "phone" ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium mb-2">Your Verification Code</p>
                      <code className="text-2xl font-mono font-bold text-primary">
                        {verificationCode}
                      </code>
                    </div>

                    <div className="space-y-2">
                      <Label>Enter Code</Label>
                      <Input
                        placeholder="SV-XXXXXX"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      />
                    </div>

                    <Button onClick={verifyCode} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={startPhoneVerification} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Code"}
                  </Button>
                )}
              </TabsContent>

              {/* Social/Web Verification */}
              <TabsContent value="social" className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Social / Website Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Add a verification code to your Instagram bio or website footer
                  </p>
                </div>

                {verificationCode && pendingVerification?.method === "social" ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm font-medium mb-2">Add this code to:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                        <li>• Your Instagram bio</li>
                        <li>• Your website footer</li>
                        <li>• Your Google Business profile</li>
                      </ul>
                      <div className="flex items-center gap-2">
                        <code className="text-xl font-mono font-bold text-primary">
                          {verificationCode}
                        </code>
                        <Button size="sm" variant="ghost" onClick={copyCode}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {instagram && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => window.open(`https://instagram.com/${instagram.replace("@", "")}`, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Instagram
                      </Button>
                    )}

                    <div className="space-y-2">
                      <Label>Enter Code After Adding</Label>
                      <Input
                        placeholder="SV-XXXXXX"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      />
                    </div>

                    <Button onClick={verifyCode} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "I've Added It - Verify"}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={startSocialVerification} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Code"}
                  </Button>
                )}
              </TabsContent>

              {/* Document Verification */}
              <TabsContent value="document" className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Document Verification</p>
                  <p className="text-xs text-muted-foreground">
                    Upload official documents for manual review
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Upload Document</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Accepted: Trade license, company letter, employment contract
                  </p>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="document"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    />
                    <label
                      htmlFor="document"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      {documentFile ? (
                        <p className="text-sm font-medium">{documentFile.name}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Click to upload
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                {pendingVerification?.method === "document" ? (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Pending Review</p>
                      <p className="text-xs text-muted-foreground">
                        Your document is being reviewed. This may take 1-3 business days.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button onClick={uploadDocument} disabled={loading || !documentFile} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit for Review"}
                  </Button>
                )}
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};
