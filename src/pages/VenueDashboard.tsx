import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenueVerificationWizard } from "@/components/venue/VenueVerificationWizard";
import { OutletManager } from "@/components/venue/OutletManager";
import { VenueAdminManager } from "@/components/venue/VenueAdminManager";
import { VenueClaimsInbox } from "@/components/venue/VenueClaimsInbox";
import { 
  ArrowLeft, Building2, CheckCircle2, Clock, XCircle, Settings,
  MapPin, Users, Globe, Phone, Instagram, Loader2
} from "lucide-react";
import { motion } from "framer-motion";

interface Venue {
  id: string;
  name: string;
  brand_name: string;
  business_type: string;
  region: string;
  city: string;
  country: string;
  address: string;
  website: string;
  instagram: string;
  phone: string;
  contact_email: string;
  description: string;
  logo_url: string;
  verification_status: string;
  verification_method: string;
  verified_at: string;
}

interface Outlet {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  is_headquarters: boolean;
}

const VenueDashboard = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (venueId) {
      fetchVenueData();
    }
  }, [venueId, user]);

  const fetchVenueData = async () => {
    setLoading(true);
    try {
      // Fetch venue details
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .single();

      if (venueError) throw venueError;
      setVenue(venueData);

      // Fetch outlets
      const { data: outletData } = await supabase
        .from("venue_outlets")
        .select("*")
        .eq("venue_id", venueId)
        .order("is_headquarters", { ascending: false });

      setOutlets(outletData || []);

      // Check if user is admin
      if (user) {
        const { data: adminData } = await supabase
          .from("venue_admins")
          .select("*")
          .eq("venue_id", venueId)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsAdmin(!!adminData);
      }
    } catch (error: any) {
      console.error("Error fetching venue:", error);
      toast({
        title: "Error",
        description: "Failed to load venue details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVerificationBadge = () => {
    switch (venue?.verification_status) {
      case "verified":
        return (
          <Badge className="bg-green-500/20 text-green-500 gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Unverified
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Venue not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{venue.brand_name || venue.name}</h1>
              <p className="text-sm text-muted-foreground">Venue Dashboard</p>
            </div>
          </div>
          {getVerificationBadge()}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Venue Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  {venue.logo_url ? (
                    <img
                      src={venue.logo_url}
                      alt={venue.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Building2 className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold">{venue.brand_name || venue.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline">{venue.business_type}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {venue.city}, {venue.region}
                    </span>
                  </div>
                  {venue.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {venue.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {venue.website && (
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3 h-3" />
                        Website
                      </a>
                    )}
                    {venue.instagram && (
                      <a
                        href={`https://instagram.com/${venue.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <Instagram className="w-3 h-3" />
                        {venue.instagram}
                      </a>
                    )}
                    {venue.phone && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {venue.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="claims">Claims</TabsTrigger>
            <TabsTrigger value="verification">Verify</TabsTrigger>
            <TabsTrigger value="outlets">Outlets</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{outlets.length}</div>
                  <p className="text-sm text-muted-foreground">Outlets</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground">Pending Claims</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground">Verified Staff</p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </CardContent>
              </Card>
            </div>

            {venue.verification_status !== "verified" && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Verification Required</p>
                    <p className="text-sm text-muted-foreground">
                      Verify your venue to start receiving employment claims
                    </p>
                  </div>
                  <Button onClick={() => setActiveTab("verification")}>
                    Verify Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims">
            <VenueClaimsInbox
              venueId={venue.id}
              isAdmin={isAdmin}
            />
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <VenueVerificationWizard
              venueId={venue.id}
              venueName={venue.brand_name || venue.name}
              contactEmail={venue.contact_email}
              phone={venue.phone}
              website={venue.website}
              instagram={venue.instagram}
              currentStatus={venue.verification_status}
              currentMethod={venue.verification_method}
              onVerificationComplete={fetchVenueData}
            />
          </TabsContent>

          {/* Outlets Tab */}
          <TabsContent value="outlets">
            <OutletManager
              venueId={venue.id}
              outlets={outlets}
              isAdmin={isAdmin}
              onUpdate={fetchVenueData}
            />
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins">
            <VenueAdminManager
              venueId={venue.id}
              isAdmin={isAdmin}
              onUpdate={fetchVenueData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VenueDashboard;
