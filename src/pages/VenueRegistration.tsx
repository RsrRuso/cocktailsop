import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, Globe, Instagram, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const BUSINESS_TYPES = [
  "Bar", "Restaurant", "Hotel", "Club", "Lounge", "Cafe", 
  "Rooftop", "Speakeasy", "Brewery", "Distillery", "Other"
];

const REGIONS = [
  "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "RAK", "Fujairah",
  "London", "New York", "Singapore", "Hong Kong", "Sydney", "Other"
];

const VenueRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    brandName: "",
    name: "",
    businessType: "",
    region: "",
    city: "",
    country: "",
    address: "",
    website: "",
    instagram: "",
    phone: "",
    contactEmail: "",
    description: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.brandName || !formData.businessType || !formData.region) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register a venue",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // Extract email domain from contact email
      const emailDomain = formData.contactEmail 
        ? formData.contactEmail.split("@")[1] 
        : null;

      // Create the venue
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .insert({
          name: formData.name || formData.brandName,
          brand_name: formData.brandName,
          business_type: formData.businessType,
          type: formData.businessType.toLowerCase(),
          region: formData.region,
          city: formData.city || formData.region,
          country: formData.country || "UAE",
          address: formData.address,
          website: formData.website,
          instagram: formData.instagram,
          phone: formData.phone,
          contact_email: formData.contactEmail,
          email_domain: emailDomain,
          description: formData.description,
          owner_id: user.id,
          created_by: user.id,
          is_venue_account: true,
          verification_status: "unverified",
        })
        .select()
        .single();

      if (venueError) throw venueError;

      // Create the owner as primary admin
      const { error: adminError } = await supabase
        .from("venue_admins")
        .insert({
          venue_id: venue.id,
          user_id: user.id,
          role: "owner_admin",
          is_primary: true,
          accepted_at: new Date().toISOString(),
        });

      if (adminError) throw adminError;

      // Create headquarters outlet if address provided
      if (formData.address) {
        await supabase
          .from("venue_outlets")
          .insert({
            venue_id: venue.id,
            name: "Headquarters",
            address: formData.address,
            city: formData.city || formData.region,
            country: formData.country || "UAE",
            phone: formData.phone,
            email: formData.contactEmail,
            is_headquarters: true,
          });
      }

      toast({
        title: "Venue Created!",
        description: "Now let's verify your venue ownership",
      });

      navigate(`/venue-dashboard/${venue.id}`);
    } catch (error: any) {
      console.error("Error creating venue:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create venue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Register Venue</h1>
            <p className="text-sm text-muted-foreground">SpecVerse Business Account</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 2 && (
                <div
                  className={`w-12 h-0.5 ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {step === 1 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Venue Details
                </CardTitle>
                <CardDescription>
                  Basic information about your venue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name *</Label>
                  <Input
                    id="brandName"
                    placeholder="e.g., Attiko, Zuma, Buddha Bar"
                    value={formData.brandName}
                    onChange={(e) => handleInputChange("brandName", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Venue Name (if different)</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Attiko DIFC"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Type *</Label>
                    <Select
                      value={formData.businessType}
                      onValueChange={(v) => handleInputChange("businessType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Region *</Label>
                    <Select
                      value={formData.region}
                      onValueChange={(v) => handleInputChange("region", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="UAE"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                </div>

                <Button
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="w-full"
                >
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Contact & Online Presence
                </CardTitle>
                <CardDescription>
                  Help people find and contact your venue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.yourvenue.com"
                    value={formData.website}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    placeholder="@yourvenue"
                    value={formData.instagram}
                    onChange={(e) => handleInputChange("instagram", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 4 XXX XXXX"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Official Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="info@yourvenue.com"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use your venue's official email domain for easier verification
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">About the Venue</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your venue..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Venue"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default VenueRegistration;
