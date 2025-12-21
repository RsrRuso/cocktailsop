import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, Clock, XCircle, Plus, ChevronRight } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  brand_name: string;
  business_type: string;
  city: string;
  region: string;
  verification_status: string;
  logo_url: string;
}

export const MyVenuesCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyVenues();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyVenues = async () => {
    try {
      // Get venues where user is an admin
      const { data: adminData } = await supabase
        .from("venue_admins")
        .select("venue_id")
        .eq("user_id", user?.id);

      if (!adminData || adminData.length === 0) {
        setVenues([]);
        setLoading(false);
        return;
      }

      const venueIds = adminData.map((a) => a.venue_id);

      const { data: venuesData } = await supabase
        .from("venues")
        .select("id, name, brand_name, business_type, city, region, verification_status, logo_url")
        .in("id", venueIds);

      setVenues(venuesData || []);
    } catch (error) {
      console.error("Error fetching venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500/20 text-green-500 text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="text-xs gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs gap-1">
            <XCircle className="w-3 h-3" />
            Unverified
          </Badge>
        );
    }
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">My Venues</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/venue-register")}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {venues.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No venues yet</p>
            <Button
              variant="link"
              onClick={() => navigate("/venue-register")}
              className="text-primary"
            >
              Register your venue
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {venues.map((venue) => (
              <button
                key={venue.id}
                onClick={() => navigate(`/venue-dashboard/${venue.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {venue.logo_url ? (
                    <img
                      src={venue.logo_url}
                      alt={venue.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {venue.brand_name || venue.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {venue.city}, {venue.region}
                  </p>
                </div>
                {getStatusBadge(venue.verification_status)}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
